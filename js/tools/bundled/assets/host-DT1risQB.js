async function detectCapabilities$1() {
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
    let shaderF16 = false;
    if (hasWebGPU) {
        try {
            const adapter = await navigator.gpu.requestAdapter?.();
            shaderF16 = !!adapter?.features?.has?.('shader-f16');
        }
        catch {
            shaderF16 = false;
        }
    }
    const wasm = true;
    return { webgpu: hasWebGPU, shaderF16, wasm };
}
function listBackends$1() {
    return ['webgpu', 'wasm'];
}

const CACHE_NAME = 'web-txt2img-v1';
// Simple in-memory URL tracker per model for purge; re-created on reload.
const urlTracker = new Map();
function noteModelUrl(modelId, url) {
    if (!urlTracker.has(modelId))
        urlTracker.set(modelId, new Set());
    urlTracker.get(modelId).add(url);
}
async function fetchArrayBufferWithCacheProgress(url, modelId, onProgress, expectedTotalBytes) {
    const req = new Request(url);
    if (typeof caches !== 'undefined') {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) {
            const buf = await cached.arrayBuffer();
            onProgress?.(buf.byteLength, buf.byteLength);
            if (modelId)
                noteModelUrl(modelId, req.url);
            return buf;
        }
        const res = await fetch(req);
        if (!res.ok || !res.body) {
            // Simulate coarse progress when streaming is unavailable
            const total = Number(res.headers.get('content-length') ?? expectedTotalBytes ?? 0) || undefined;
            let timer;
            let fakeLoaded = 0;
            if (total) {
                const start = performance.now();
                const etaMs = Math.max(5000, Math.min(20000, total / (256 * 1024) * 1000)); // 256KB/s to 20s cap
                timer = setInterval(() => {
                    const elapsed = performance.now() - start;
                    const est = Math.min(total * 0.95, (elapsed / etaMs) * total);
                    if (est > fakeLoaded) {
                        fakeLoaded = est;
                        onProgress?.(fakeLoaded, total);
                    }
                }, 200);
            }
            const buf = await res.arrayBuffer();
            if (timer)
                clearInterval(timer);
            onProgress?.(total ?? buf.byteLength, total ?? buf.byteLength);
            return buf;
        }
        const total = Number(res.headers.get('content-length') ?? '0') || undefined;
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (value) {
                chunks.push(value);
                received += value.byteLength;
                onProgress?.(received, total);
            }
        }
        const merged = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
        }
        const respToCache = new Response(merged, { headers: res.headers });
        try {
            await cache.put(req, respToCache);
        }
        catch { }
        if (modelId)
            noteModelUrl(modelId, req.url);
        return merged.buffer;
    }
    else {
        const res = await fetch(req);
        const total = Number(res.headers.get('content-length') ?? expectedTotalBytes ?? 0) || undefined;
        // Simulate coarse progress without Cache Storage
        let timer;
        if (total) {
            const start = performance.now();
            const etaMs = Math.max(5000, Math.min(20000, total / (256 * 1024) * 1000));
            timer = setInterval(() => {
                const elapsed = performance.now() - start;
                const est = Math.min(total * 0.95, (elapsed / etaMs) * total);
                onProgress?.(est, total);
            }, 200);
        }
        const buf = await res.arrayBuffer();
        if (timer)
            clearInterval(timer);
        onProgress?.(total ?? buf.byteLength, total ?? buf.byteLength);
        return buf;
    }
}
async function purgeModelCache$1(modelId) {
    if (typeof caches === 'undefined')
        return;
    const cache = await caches.open(CACHE_NAME);
    const urls = Array.from(urlTracker.get(modelId) ?? []);
    await Promise.all(urls.map((u) => cache.delete(u)));
    urlTracker.delete(modelId);
}
async function purgeAllCaches$1() {
    if (typeof caches === 'undefined')
        return;
    await caches.delete(CACHE_NAME);
    urlTracker.clear();
}

// Minimal adapter scaffold. Actual ONNX pipeline is TBD.
class SDTurboAdapter {
    constructor() {
        this.id = 'sd-turbo';
        this.loaded = false;
        this.backendUsed = null;
        this.ort = null;
        this.sessions = {};
        this.tokenizerFn = null;
        this.tokenizerProvider = null;
        this.modelBase = 'https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/main';
    }
    checkSupport(c) {
        const backends = [];
        if (c.webgpu)
            backends.push('webgpu');
        // WASM is assumed available
        backends.push('wasm');
        return backends;
    }
    async load(options) {
        const preferred = options.backendPreference;
        const supported = ['webgpu', 'wasm'];
        let chosen = preferred.find((b) => supported.includes(b));
        if (!chosen)
            return { ok: false, reason: 'backend_unavailable', message: 'No viable backend for SD-Turbo' };
        // Resolve model base URL override
        if (options.modelBaseUrl)
            this.modelBase = options.modelBaseUrl;
        if (options.tokenizerProvider)
            this.tokenizerProvider = options.tokenizerProvider;
        // Resolve ORT runtime: injected → dynamic import → global
        try {
            let ort = options.ort ?? null;
            if (!ort) {
                let ortMod = null;
                if (chosen === 'webgpu') {
                    ortMod = await import('./ort.webgpu.bundle.min-DniE1hjr.js').catch(() => null);
                }
                else {
                    // WASM uses the default entry
                    ortMod = await import('./ort.bundle.min-DUwjeQs2.js').catch(() => null);
                }
                ort = ortMod && (ortMod.default ?? ortMod);
            }
            if (!ort) {
                const gOrt = globalThis.ort; // fallback if app added <script>
                if (gOrt)
                    ort = gOrt;
            }
            if (!ort) {
                return { ok: false, reason: 'internal_error', message: 'onnxruntime-web not available. Install as a dependency or inject via loadModel({ ort }).' };
            }
            this.ort = ort;
        }
        catch (e) {
            return { ok: false, reason: 'internal_error', message: `Failed to load onnxruntime-web: ${e instanceof Error ? e.message : String(e)}` };
        }
        // Placeholder for downloading model assets using Cache Storage
        try {
            options.onProgress?.({ phase: 'loading', message: 'Preparing SD-Turbo model...' });
            this.backendUsed = chosen;
            const ort = this.ort;
            const opt = {
                executionProviders: [chosen],
                enableMemPattern: false,
                enableCpuMemArena: false,
                extra: {
                    session: {
                        disable_prepacking: '1',
                        use_device_allocator_for_initializers: '1',
                        use_ort_model_bytes_directly: '1',
                        use_ort_model_bytes_for_initializers: '1',
                    },
                },
            };
            if (chosen === 'webgpu') {
                opt.preferredOutputLocation = { last_hidden_state: 'gpu-buffer' };
            }
            // Configure WASM env if provided, regardless of EP; ORT may still load WASM helpers
            try {
                if (options.wasmPaths)
                    ort.env.wasm.wasmPaths = options.wasmPaths;
                if (typeof options.wasmNumThreads === 'number')
                    ort.env.wasm.numThreads = options.wasmNumThreads;
                if (typeof options.wasmSimd === 'boolean')
                    ort.env.wasm.simd = options.wasmSimd;
            }
            catch { }
            const models = {
                unet: {
                    url: 'unet/model.onnx', sizeMB: 640,
                    opt: { freeDimensionOverrides: { batch_size: 1, num_channels: 4, height: 64, width: 64, sequence_length: 77 } },
                },
                text_encoder: {
                    url: 'text_encoder/model.onnx', sizeMB: 1700,
                    opt: { freeDimensionOverrides: { batch_size: 1 } },
                },
                vae_decoder: {
                    url: 'vae_decoder/model.onnx', sizeMB: 95,
                    opt: { freeDimensionOverrides: { batch_size: 1, num_channels_latent: 4, height_latent: 64, width_latent: 64 } },
                },
            };
            // compute base URL
            const base = this.modelBase;
            // Fetch and create sessions with progress
            let bytesDownloaded = 0;
            // Use approximate grand total injected from registry (single source of truth)
            const fallbackTotal = Object.values(models).reduce((acc, m) => acc + m.sizeMB * 1024 * 1024, 0);
            const GRAND_APPROX = (typeof options.approxTotalBytes === 'number' ? options.approxTotalBytes : fallbackTotal);
            options.onProgress?.({
                phase: 'loading',
                message: `starting downloads (~${Math.round(GRAND_APPROX / 1024 / 1024)}MB total)...`,
                bytesDownloaded: 0,
                totalBytesExpected: GRAND_APPROX,
                pct: 0,
                accuracy: 'exact',
            });
            for (const key of Object.keys(models)) {
                const model = models[key];
                options.onProgress?.({ phase: 'loading', message: `downloading ${model.url}...`, bytesDownloaded });
                const expectedTotal = model.sizeMB * 1024 * 1024;
                const buf = await fetchArrayBufferWithCacheProgress(`${base}/${model.url}`, this.id, (loaded, total) => {
                    const pct = Math.min(100, Math.round(((bytesDownloaded + loaded) / GRAND_APPROX) * 100));
                    options.onProgress?.({
                        phase: 'loading',
                        message: `downloading ${model.url}...`,
                        pct,
                        bytesDownloaded: bytesDownloaded + loaded,
                        totalBytesExpected: GRAND_APPROX,
                        asset: model.url,
                        accuracy: 'exact',
                    });
                }, expectedTotal);
                bytesDownloaded += buf.byteLength;
                const start = performance.now();
                const sess = await ort.InferenceSession.create(buf, { ...opt, ...model.opt });
                const ms = performance.now() - start;
                options.onProgress?.({
                    phase: 'loading',
                    message: `${model.url} ready in ${ms.toFixed(1)}ms`,
                    bytesDownloaded,
                    totalBytesExpected: GRAND_APPROX,
                    asset: model.url,
                    accuracy: 'exact',
                });
                this.sessions[key] = sess;
            }
            this.loaded = true;
            return { ok: true, backendUsed: chosen, bytesDownloaded };
        }
        catch (e) {
            console.error('[sd-turbo] load error', e);
            return { ok: false, reason: 'internal_error', message: e instanceof Error ? e.message : String(e) };
        }
    }
    isLoaded() {
        return this.loaded;
    }
    async generate(params) {
        if (!this.loaded)
            return { ok: false, reason: 'model_not_loaded', message: 'Call loadModel() first' };
        const { prompt, width = 512, height = 512, signal, onProgress, seed, num_inference_steps = 1 } = params;
        if (!prompt || !prompt.trim())
            return { ok: false, reason: 'unsupported_option', message: 'Prompt is required' };
        if (width !== 512 || height !== 512) {
            return { ok: false, reason: 'unsupported_option', message: 'Only 512x512 is supported in v1' };
        }
        const start = performance.now();
        const ort = this.ort;
        try {
            // Tokenizer (injected or dynamic)
            onProgress?.({ phase: 'tokenizing', pct: 5 });
            if (!this.tokenizerFn) {
                if (this.tokenizerProvider)
                    this.tokenizerFn = await this.tokenizerProvider();
                else
                    this.tokenizerFn = await getTokenizer();
            }
            if (signal?.aborted) {
                onProgress?.({ phase: 'complete', aborted: true, pct: 0 });
                return { ok: false, reason: 'cancelled' };
            }
            const tok = this.tokenizerFn;
            const { input_ids } = await tok(prompt, { padding: true, max_length: 77, truncation: true, return_tensor: false });
            // Text encoder
            onProgress?.({ phase: 'encoding', pct: 15 });
            const ids = Int32Array.from(input_ids);
            let encOut;
            try {
                encOut = await this.sessions.text_encoder.run({ input_ids: new ort.Tensor('int32', ids, [1, ids.length]) });
            }
            catch (e) {
                throw new Error(`text_encoder.run failed: ${e instanceof Error ? e.message : String(e)}`);
            }
            const last_hidden_state = encOut.last_hidden_state ?? encOut;
            if (signal?.aborted) {
                onProgress?.({ phase: 'complete', aborted: true, pct: 0 });
                return { ok: false, reason: 'cancelled' };
            }
            // Latents
            const latent_shape = [1, 4, 64, 64];
            const vae_scaling_factor = 0.18215;
            let latent = new ort.Tensor(randn_latents(latent_shape, 14.6146, seed), latent_shape);
            
            // Generate timestep schedule
            const timesteps = generateTimesteps(num_inference_steps);
            const sigmas = timestepsToSigmas(timesteps);
            
            // Denoising loop
            for (let i = 0; i < num_inference_steps; i++) {
                const step_pct = 20 + Math.floor((i / num_inference_steps) * 70);
                onProgress?.({ phase: 'denoising', pct: step_pct, message: `Step ${i + 1}/${num_inference_steps}` });
                
                if (signal?.aborted) {
                    onProgress?.({ phase: 'complete', aborted: true, pct: 0 });
                    return { ok: false, reason: 'cancelled' };
                }
                
                const sigma = sigmas[i];
                const latent_model_input = scale_model_inputs(ort, latent, sigma);
                const tstep = [BigInt(timesteps[i])];
                
                const feed = {
                    sample: latent_model_input,
                    timestep: new ort.Tensor('int64', tstep, [1]),
                    encoder_hidden_states: last_hidden_state,
                };
                
                let out_sample;
                try {
                    out_sample = await this.sessions.unet.run(feed);
                    out_sample = out_sample.out_sample ?? out_sample;
                }
                catch (e) {
                    throw new Error(`unet.run failed at step ${i}: ${e instanceof Error ? e.message : String(e)}`);
                }
                
                // Scheduler step
                const sigma_next = i < num_inference_steps - 1 ? sigmas[i + 1] : 0;
                latent = schedulerStep(ort, out_sample, latent, sigma, sigma_next);
            }
            
            if (typeof last_hidden_state.dispose === 'function')
                last_hidden_state.dispose();
            
            // Apply VAE scaling for all cases
            const scaled_data = new Float32Array(latent.data.length);
            for (let i = 0; i < latent.data.length; i++) {
                scaled_data[i] = latent.data[i] / vae_scaling_factor;
            }
            const final_latent = new ort.Tensor(scaled_data, latent.dims);
            
            // VAE decode
            onProgress?.({ phase: 'decoding', pct: 95 });
            if (signal?.aborted) {
                onProgress?.({ phase: 'complete', aborted: true, pct: 0 });
                return { ok: false, reason: 'cancelled' };
            }
            let vaeOut;
            try {
                vaeOut = await this.sessions.vae_decoder.run({ latent_sample: final_latent });
            }
            catch (e) {
                throw new Error(`vae_decoder.run failed: ${e instanceof Error ? e.message : String(e)}`);
            }
            const sample = vaeOut.sample ?? vaeOut;
            if (signal?.aborted) {
                onProgress?.({ phase: 'complete', aborted: true, pct: 0 });
                return { ok: false, reason: 'cancelled' };
            }
            const blob = await tensorToPngBlob(sample);
            const timeMs = performance.now() - start;
            onProgress?.({ phase: 'complete', pct: 100, timeMs });
            return { ok: true, blob, timeMs };
        }
        catch (e) {
            console.error('[sd-turbo] generate error', e);
            return { ok: false, reason: 'internal_error', message: e instanceof Error ? e.message : String(e) };
        }
    }
    async unload() {
        try {
            // Dispose ORT sessions if available and clear references
            try {
                this.sessions.unet?.release?.();
            }
            catch { }
            try {
                this.sessions.text_encoder?.release?.();
            }
            catch { }
            try {
                this.sessions.vae_decoder?.release?.();
            }
            catch { }
        }
        finally {
            this.sessions = {};
            this.ort = null;
            this.loaded = false;
            this.backendUsed = null;
        }
    }
    async purgeCache() {
        await purgeModelCache$1(this.id);
    }
}
// Helpers
function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}
function randn_latents(shape, noise_sigma, seed) {
    const rand = seed !== undefined ? mulberry32(seed) : Math.random;
    function randn() {
        const u = rand();
        const v = rand();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    let size = 1;
    for (const s of shape)
        size *= s;
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++)
        data[i] = randn() * noise_sigma;
    return data;
}
function scale_model_inputs(ort, t, sigma) {
    const d_i = t.data;
    const d_o = new Float32Array(d_i.length);
    const divi = Math.sqrt(sigma * sigma + 1);
    for (let i = 0; i < d_i.length; i++)
        d_o[i] = d_i[i] / divi;
    return new ort.Tensor(d_o, t.dims);
}
// Generate timestep schedule (evenly spaced, excluding 0)
function generateTimesteps(num_steps) {
    if (num_steps === 1) return [999];
    const timesteps = [];
    // Generate steps that DON'T include 0 (we denoise TO 0, not FROM 0)
    for (let i = 0; i < num_steps; i++) {
        const t = Math.round(999 * (1 - i / num_steps));
        timesteps.push(Math.max(1, t)); // Keep at least 1 to avoid sigma=0
    }
    return timesteps;
}
// Convert timesteps to sigmas
function timestepsToSigmas(timesteps) {
    // Simplified sigma schedule for SD-Turbo
    // Original sigma at t=999 is ~14.6146, at t=0 is 0
    return timesteps.map(t => 14.6146 * (t / 999));
}
// Euler scheduler step for multi-step generation
function schedulerStep(ort, model_output, sample, sigma, sigma_next) {
    const d_o = new Float32Array(model_output.data.length);
    for (let i = 0; i < model_output.data.length; i++) {
        const pred_original_sample = sample.data[i] - sigma * model_output.data[i];
        const derivative = (sample.data[i] - pred_original_sample) / sigma;
        const dt = sigma_next - sigma;
        d_o[i] = sample.data[i] + derivative * dt;
    }
    return new ort.Tensor(d_o, sample.dims);
}
async function tensorToPngBlob(t) {
    // t: [1, 3, H, W]
    const [n, c, h, w] = t.dims;
    const data = t.data;
    const out = new Uint8ClampedArray(w * h * 4);
    let idx = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const r = data[0 * h * w + y * w + x];
            const g = data[1 * h * w + y * w + x];
            const b = data[2 * h * w + y * w + x];
            const clamp = (v) => {
                let x = v / 2 + 0.5;
                if (x < 0)
                    x = 0;
                if (x > 1)
                    x = 1;
                return Math.round(x * 255);
            };
            out[idx++] = clamp(r);
            out[idx++] = clamp(g);
            out[idx++] = clamp(b);
            out[idx++] = 255;
        }
    }
    const imageData = new ImageData(out, w, h);
    const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
    const canvas = hasOffscreen ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Canvas 2D context unavailable');
    ctx.putImageData(imageData, 0, 0);
    const hasHTMLCanvas = typeof globalThis.HTMLCanvasElement !== 'undefined';
    if (hasHTMLCanvas && canvas instanceof globalThis.HTMLCanvasElement) {
        return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
    }
    return await canvas.convertToBlob({ type: 'image/png' });
}
let _tokInstance = null;
async function getTokenizer() {
    if (_tokInstance)
        return (text, opts) => _tokInstance(text, opts);
    // Prefer a global AutoTokenizer (if host app preloaded it), else dynamic import.
    const g = globalThis;
    if (g.AutoTokenizer && typeof g.AutoTokenizer.from_pretrained === 'function') {
        // Defensive: ensure proper configuration for global transformers.js
        if (g.env) {
            g.env.allowLocalModels = false;
            g.env.allowRemoteModels = true;
            g.env.remoteHost = 'https://huggingface.co/';
            g.env.remotePathTemplate = '{model}/resolve/{revision}/';
        }
        _tokInstance = await g.AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch16');
        _tokInstance.pad_token_id = 0;
        return (text, opts) => _tokInstance(text, opts);
    }
    let AutoTokenizerMod = null;
    let env = null;
    try {
        const mod = await import('./transformers_web-txt2img-DfMzI7I0.js');
        AutoTokenizerMod = mod.AutoTokenizer;
        env = mod.env;
    }
    catch {
        try {
            const spec = '@huggingface/transformers';
            const mod2 = await import(/* @vite-ignore */ spec);
            AutoTokenizerMod = mod2.AutoTokenizer;
            env = mod2.env;
        }
        catch {
            throw new Error('Failed to load a tokenizer. Install @xenova/transformers or provide tokenizerProvider in loadModel options.');
        }
    }
    // Defensive: configure env if available from dynamic import
    if (env) {
        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        env.remoteHost = 'https://huggingface.co/';
        env.remotePathTemplate = '{model}/resolve/{revision}/';
    }
    // Load tokenizer with explicit options to force remote loading
    _tokInstance = await AutoTokenizerMod.from_pretrained('Xenova/clip-vit-base-patch16', {
        local_files_only: false,
        revision: 'main'
    });
    _tokInstance.pad_token_id = 0;
    return (text, opts) => _tokInstance(text, opts);
}

class JanusProAdapter {
    constructor() {
        this.id = 'janus-pro-1b';
        this.loaded = false;
        this.backendUsed = null;
        // Cached handles to reuse between calls
        this.hf = null;
        this.processor = null;
        this.model = null;
    }
    checkSupport(c) {
        return c.webgpu ? ['webgpu'] : [];
    }
    async load(options) {
        const preferred = options.backendPreference;
        if (!preferred.includes('webgpu')) {
            return { ok: false, reason: 'backend_unavailable', message: 'Janus requires WebGPU' };
        }
        // Dynamic import of Transformers.js (optional peer). Error clearly if missing.
        let hf = null;
        // First try a normal bare-specifier import (works when installed and bundled by Vite)
        try {
            hf = await import('./transformers_web-txt2img-R1QVQ2mR.js').catch(() => null);
        }
        catch { }
        // Try to resolve via bundler if available (Vite: import.meta.resolve)
        if (!hf) {
            try {
                const anyMeta = import.meta;
                const resolved = anyMeta && typeof anyMeta.resolve === 'function'
                    ? anyMeta.resolve('@huggingface/transformers')
                    : null;
                if (resolved) {
                    hf = await import(/* @vite-ignore */ resolved).catch(() => null);
                }
            }
            catch { }
        }
        // Fallback to a global (if the app loaded Transformers.js via a <script> tag)
        if (!hf) {
            const g = globalThis;
            hf = g.transformers || g.HFTransformers || g.HuggingFaceTransformers || null;
        }
        if (!hf) {
            return { ok: false, reason: 'internal_error', message: 'Missing @huggingface/transformers. Install it (npm i @huggingface/transformers) or include it via a <script> to expose global "transformers".' };
        }
        // WebGPU adapter + shader-f16 capability check (for dtype selection)
        let fp16_supported = false;
        try {
            const adapter = await navigator.gpu?.requestAdapter?.();
            fp16_supported = !!adapter?.features?.has?.('shader-f16');
        }
        catch { }
        const model_id = 'onnx-community/Janus-Pro-1B-ONNX';
        // Approximate expected total injected from registry (single source of truth).
        const TOTAL_BYTES_APPROX = typeof options.approxTotalBytes === 'number' ? options.approxTotalBytes : undefined;
        options.onProgress?.({
            phase: 'loading',
            message: 'Loading Janus-Pro-1B (starting downloads)…',
            bytesDownloaded: 0,
            totalBytesExpected: TOTAL_BYTES_APPROX,
            pct: typeof TOTAL_BYTES_APPROX === 'number' ? 0 : undefined,
            accuracy: 'approximate',
        });
        try {
            // Aggregate bytes across multiple underlying downloads from Transformers.js
            const seen = new Map();
            let lastBytes = 0;
            const progress_callback = (x) => {
                try {
                    const name = (x?.file || x?.name || x?.url || 'asset');
                    const loaded = typeof x?.loaded === 'number' ? x.loaded : (typeof x?.progress === 'number' && typeof x?.total === 'number' ? Math.floor(x.progress * x.total) : undefined);
                    if (typeof loaded === 'number' && isFinite(loaded) && loaded >= 0) {
                        const prev = seen.get(name) ?? 0;
                        // Monotonic per-asset
                        const next = Math.max(prev, loaded);
                        seen.set(name, next);
                    }
                    const sum = Array.from(seen.values()).reduce((a, b) => a + b, 0);
                    if (sum > lastBytes)
                        lastBytes = sum;
                    const pct = typeof TOTAL_BYTES_APPROX === 'number'
                        ? Math.max(0, Math.min(100, Math.round((lastBytes / TOTAL_BYTES_APPROX) * 100)))
                        : undefined;
                    options.onProgress?.({
                        phase: 'loading',
                        message: x?.status ?? 'loading…',
                        bytesDownloaded: lastBytes,
                        totalBytesExpected: TOTAL_BYTES_APPROX,
                        pct,
                        asset: typeof name === 'string' ? name : undefined,
                        accuracy: typeof x?.loaded === 'number' ? 'exact' : 'approximate',
                    });
                }
                catch {
                    options.onProgress?.({ phase: 'loading', message: x?.status ?? 'loading…' });
                }
            };
            const processorP = hf.AutoProcessor.from_pretrained(model_id, { progress_callback });
            const dtype = fp16_supported
                ? { prepare_inputs_embeds: 'q4', language_model: 'q4f16', lm_head: 'fp16', gen_head: 'fp16', gen_img_embeds: 'fp16', image_decode: 'fp32' }
                : { prepare_inputs_embeds: 'fp32', language_model: 'q4', lm_head: 'fp32', gen_head: 'fp32', gen_img_embeds: 'fp32', image_decode: 'fp32' };
            const device = {
                // TODO: use 'webgpu' when upstream bug fixed; match example using wasm for this small stage
                prepare_inputs_embeds: 'wasm',
                language_model: 'webgpu',
                lm_head: 'webgpu',
                gen_head: 'webgpu',
                gen_img_embeds: 'webgpu',
                image_decode: 'webgpu',
            };
            options.onProgress?.({ phase: 'loading', message: 'Loading Janus-Pro-1B model…' });
            const modelP = hf.MultiModalityCausalLM.from_pretrained(model_id, { dtype, device, progress_callback });
            const [processor, model] = await Promise.all([processorP, modelP]);
            // Ensure a final 100% event for UIs even if callbacks were cached/quick
            if (typeof TOTAL_BYTES_APPROX === 'number') {
                lastBytes = Math.max(lastBytes, TOTAL_BYTES_APPROX);
            }
            options.onProgress?.({
                phase: 'loading',
                message: 'Janus-Pro-1B ready',
                bytesDownloaded: typeof TOTAL_BYTES_APPROX === 'number' ? TOTAL_BYTES_APPROX : lastBytes,
                totalBytesExpected: TOTAL_BYTES_APPROX,
                pct: 100,
                accuracy: 'approximate',
            });
            this.hf = hf;
            this.processor = processor;
            this.model = model;
            this.backendUsed = 'webgpu';
            this.loaded = true;
            return { ok: true, backendUsed: 'webgpu', bytesDownloaded: lastBytes || undefined };
        }
        catch (e) {
            return { ok: false, reason: 'internal_error', message: e instanceof Error ? e.message : String(e) };
        }
    }
    isLoaded() {
        return this.loaded;
    }
    async generate(params) {
        if (!this.loaded || !this.processor || !this.model) {
            return { ok: false, reason: 'model_not_loaded', message: 'Call loadModel() first' };
        }
        const { prompt, signal, onProgress } = params;
        if (!prompt || !prompt.trim())
            return { ok: false, reason: 'unsupported_option', message: 'Prompt is required' };
        if (signal?.aborted)
            return { ok: false, reason: 'cancelled' };
        const start = performance.now();
        try {
            // Build conversation with text_to_image template
            const conversation = [
                { role: '<|User|>', content: prompt.trim() },
            ];
            const inputs = await this.processor(conversation, { chat_template: 'text_to_image' });
            // Progress streamer — mirrors example semantics
            const num_image_tokens = this.processor.num_image_tokens;
            const thatOnProgress = onProgress;
            const StreamerBase = this.hf.BaseStreamer;
            class ProgressStreamer extends StreamerBase {
                constructor(total, on_progress) { super(); this.total = total; this.on_progress = on_progress; this.count = null; this.start_time = null; }
                put(_value) {
                    // Best-effort mid-run abort: throw sentinel to unwind generate_images
                    if (signal?.aborted) {
                        throw new Error('JANUS_STOP');
                    }
                    if (this.count === null) {
                        this.count = 0;
                        this.start_time = performance.now();
                        return;
                    }
                    const progress = (++this.count) / this.total;
                    this.on_progress({ count: this.count, total: this.total, progress, time: performance.now() - (this.start_time ?? performance.now()) });
                }
                end() { }
            }
            const streamer = new ProgressStreamer(num_image_tokens, (out) => {
                thatOnProgress?.({ phase: 'image_tokens', ...out });
            });
            // Note: No supported interruption API for image generation; we check abort before starting.
            const outputs = await this.model.generate_images({
                ...inputs,
                min_new_tokens: num_image_tokens,
                max_new_tokens: num_image_tokens,
                do_sample: true,
                streamer,
            });
            const blob = await outputs[0].toBlob();
            const timeMs = performance.now() - start;
            onProgress?.({ phase: 'complete', pct: 100, timeMs });
            return { ok: true, blob, timeMs };
        }
        catch (e) {
            if (e instanceof Error && e.message === 'JANUS_STOP') {
                onProgress?.({ phase: 'complete', aborted: true, pct: 0 });
                return { ok: false, reason: 'cancelled' };
            }
            return { ok: false, reason: 'internal_error', message: e instanceof Error ? e.message : String(e) };
        }
    }
    async unload() {
        // Drop references to allow GC of GPU buffers
        this.loaded = false;
        this.backendUsed = null;
        this.model = null;
        this.processor = null;
        this.hf = null;
    }
    async purgeCache() {
        await purgeModelCache$1(this.id);
    }
}

const REGISTRY = [
    {
        id: 'sd-turbo',
        displayName: 'SD-Turbo (ONNX Runtime Web)',
        task: 'text-to-image',
        supportedBackends: ['webgpu', 'wasm'],
        notes: 'Image size 512×512; seed supported.',
        sizeBytesApprox: 2398 * 1024 * 1024,
        sizeGBApprox: 2.34,
        sizeNotes: 'UNet ~640MB, text_encoder ~1700MB, vae_decoder ~95MB',
        createAdapter: () => new SDTurboAdapter(),
    },
    {
        id: 'janus-pro-1b',
        displayName: 'Janus-Pro-1B (Transformers.js)',
        task: 'text-to-image',
        supportedBackends: ['webgpu'],
        notes: 'Seed unsupported.',
        sizeBytesApprox: 2305 * 1024 * 1024,
        sizeGBApprox: 2.25,
        sizeNotes: 'Mixed-precision ONNX; varies slightly by device/dtype',
        createAdapter: () => new JanusProAdapter(),
    },
];
function listSupportedModels$1() {
    return REGISTRY.map(({ createAdapter, ...info }) => info);
}
function getModelInfo(id) {
    const found = REGISTRY.find((m) => m.id === id);
    if (!found)
        throw new Error(`Unknown model id: ${id}`);
    const { createAdapter, ...info } = found;
    return info;
}
function getRegistryEntry(id) {
    const found = REGISTRY.find((m) => m.id === id);
    if (!found)
        throw new Error(`Unknown model id: ${id}`);
    return found;
}
function defaultBackendPreferenceFor(id) {
    switch (id) {
        case 'sd-turbo':
            return ['webgpu', 'wasm'];
        case 'janus-pro-1b':
            return ['webgpu'];
    }
}

// Adapter instances
const adapters = new Map();
let cachedCapabilities = null;
async function detectCapabilities() {
    if (!cachedCapabilities)
        cachedCapabilities = await detectCapabilities$1();
    return cachedCapabilities;
}
function listBackends() {
    return listBackends$1();
}
function listSupportedModels() {
    return listSupportedModels$1();
}
function adapterFor(id) {
    let a = adapters.get(id);
    if (!a) {
        a = getRegistryEntry(id).createAdapter();
        adapters.set(id, a);
    }
    return a;
}
async function loadModel(id, options = {}) {
    const caps = await detectCapabilities();
    const a = adapterFor(id);
    const supported = a.checkSupport(caps);
    if (supported.length === 0) {
        return { ok: false, reason: id === 'janus-pro-1b' ? 'webgpu_unsupported' : 'backend_unavailable', message: 'No supported backend detected' };
    }
    const backendPreference = options.backendPreference ?? defaultBackendPreferenceFor(id);
    const chosen = backendPreference.find((b) => supported.includes(b));
    if (!chosen)
        return { ok: false, reason: 'backend_unavailable', message: 'No backend available matching preference' };
    // Inject approx size from registry as the single source of truth
    const info = getModelInfo(id);
    const approxTotalBytes = typeof options.approxTotalBytes === 'number' ? options.approxTotalBytes : info.sizeBytesApprox;
    return a.load({ ...options, backendPreference, approxTotalBytes });
}
async function unloadModel(id) {
    await adapterFor(id).unload();
}
async function purgeModelCache(id) {
    await adapterFor(id).purgeCache();
}
async function purgeAllCaches() {
    await purgeAllCaches$1();
}
async function generateImage(params) {
    const a = adapterFor(params.model);
    if (!a.isLoaded())
        return { ok: false, reason: 'model_not_loaded', message: 'Call loadModel() first' };
    const { model, ...rest } = params;
    return a.generate(rest);
}

// Worker host for web-txt2img — single-flight with single-slot queue
/// <reference lib="WebWorker" />
let currentJob = null;
let pendingJob = null;
let aborting = false;
const ABORT_TIMEOUT_MS = 8000;
let abortTimer = null;
let debounceTimer = null;
let loadedModel = null;
let loadInFlight = false;
function post(msg) {
    self.postMessage(msg);
}
function setState(state) {
    post({ type: 'state', value: state });
}
function normPct(e) {
    if (typeof e?.pct === 'number')
        return e.pct;
    if (typeof e?.progress === 'number')
        return Math.round(e.progress * 100);
    return undefined;
}
async function runJob(job) {
    setState('running');
    const startParams = job.params;
    const res = await generateImage({
        ...startParams,
        signal: job.controller.signal,
        onProgress: (event) => {
            post({ id: job.id, type: 'progress', event: { ...event, pct: normPct(event) } });
        },
    });
    // current job ended
    if (!currentJob || currentJob.id !== job.id) {
        // stale; likely superseded; nothing else to do
        return;
    }
    currentJob = null;
    if (aborting) {
        aborting = false;
        if (abortTimer) {
            clearTimeout(abortTimer);
            abortTimer = null;
        }
    }
    if (res.ok) {
        post({ id: job.id, type: 'result', ok: true, blob: res.blob, timeMs: res.timeMs });
    }
    else {
        post({ id: job.id, type: 'result', ok: false, reason: res.reason, message: res.message });
    }
    // Maybe start the next pending job
    maybeStartNext();
}
function maybeStartNext() {
    if (currentJob)
        return; // still running
    if (!pendingJob) {
        setState('idle');
        return;
    }
    setState('queued');
    const now = Date.now();
    const wait = Math.max(0, (pendingJob.debounceUntil ?? 0) - now);
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    if (wait > 0) {
        debounceTimer = setTimeout(() => {
            startPending();
        }, wait);
    }
    else {
        startPending();
    }
}
function startPending() {
    if (!pendingJob || currentJob)
        return;
    const toStart = pendingJob;
    pendingJob = null;
    const controller = new AbortController();
    currentJob = { id: toStart.id, controller, params: toStart.params };
    runJob(currentJob);
}
function supersedePending(newJob) {
    if (pendingJob) {
        // notify superseded
        post({ id: pendingJob.id, type: 'result', ok: false, reason: 'superseded' });
    }
    pendingJob = newJob;
    setState('queued');
}
function handleAbortTimeout() {
    abortTimer = setTimeout(() => {
        // Abort not honored quickly; emit hint and fall back to queue-after-completion
        if (currentJob) {
            post({ id: currentJob.id, type: 'progress', event: { phase: 'aborting_timeout', pct: normPct({}) } });
        }
        aborting = false; // we are no longer actively aborting
    }, ABORT_TIMEOUT_MS);
}
function onMessage(ev) {
    const msg = ev.data;
    if (!msg || typeof msg !== 'object' || !('kind' in msg))
        return;
    switch (msg.kind) {
        case 'detect': {
            detectCapabilities()
                .then((v) => post({ id: msg.id, type: 'result', ok: true, data: v }))
                .catch((e) => post({ id: msg.id, type: 'result', ok: false, reason: 'internal_error', message: String(e) }));
            break;
        }
        case 'listModels': {
            try {
                post({ id: msg.id, type: 'result', ok: true, data: listSupportedModels() });
            }
            catch (e) {
                post({ id: msg.id, type: 'result', ok: false, reason: 'internal_error', message: String(e) });
            }
            break;
        }
        case 'listBackends': {
            try {
                post({ id: msg.id, type: 'result', ok: true, data: listBackends() });
            }
            catch (e) {
                post({ id: msg.id, type: 'result', ok: false, reason: 'internal_error', message: String(e) });
            }
            break;
        }
        case 'load': {
            if (loadedModel || loadInFlight) {
                const reason = 'busy';
                const message = loadedModel ? `Model "${loadedModel}" already loaded. Unload before loading another.` : 'Another load is in progress.';
                post({ id: msg.id, type: 'result', ok: false, reason, message });
                break;
            }
            loadInFlight = true;
            loadModel(msg.model, {
                ...msg.options,
                onProgress: (p) => post({ id: msg.id, type: 'progress', event: { ...p, pct: typeof p.pct === 'number' ? p.pct : undefined } }),
            })
                .then((r) => {
                if (r.ok) {
                    post({ id: msg.id, type: 'result', ok: true, data: r });
                    loadedModel = msg.model;
                }
                else {
                    const rr = r;
                    post({ id: msg.id, type: 'result', ok: false, reason: rr.reason ?? 'internal_error', message: rr.message });
                }
            })
                .catch((e) => post({ id: msg.id, type: 'result', ok: false, reason: 'internal_error', message: String(e) }))
                .finally(() => { loadInFlight = false; });
            break;
        }
        case 'unload': {
            const target = (msg.model ?? loadedModel) ?? null;
            if (!target) {
                post({ id: msg.id, type: 'result', ok: false, reason: 'model_not_loaded', message: 'No model loaded to unload.' });
                break;
            }
            if (loadedModel && loadedModel !== target) {
                post({ id: msg.id, type: 'result', ok: false, reason: 'model_not_loaded', message: `Loaded model is "${loadedModel}"; requested unload "${target}".` });
                break;
            }
            unloadModel(target)
                .then(() => {
                if (loadedModel === target)
                    loadedModel = null;
                post({ id: msg.id, type: 'result', ok: true });
            })
                .catch((e) => post({ id: msg.id, type: 'result', ok: false, reason: 'internal_error', message: String(e) }));
            break;
        }
        case 'purge': {
            const target = (msg.model ?? loadedModel) ?? null;
            if (!target) {
                post({ id: msg.id, type: 'result', ok: false, reason: 'model_not_loaded', message: 'No model specified and none loaded; cannot purge.' });
                break;
            }
            purgeModelCache(target)
                .then(() => post({ id: msg.id, type: 'result', ok: true }))
                .catch((e) => post({ id: msg.id, type: 'result', ok: false, reason: 'internal_error', message: String(e) }));
            break;
        }
        case 'purgeAll': {
            purgeAllCaches()
                .then(() => post({ id: msg.id, type: 'result', ok: true }))
                .catch((e) => post({ id: msg.id, type: 'result', ok: false, reason: 'internal_error', message: String(e) }));
            break;
        }
        case 'generate': {
            const policy = msg.busyPolicy ?? 'queue';
            const replaceQueued = msg.replaceQueued ?? true;
            const debounceMs = Math.max(0, msg.debounceMs ?? 0);
            // Resolve model: use explicit param, else currently loaded.
            const reqModel = msg.params.model;
            const resolvedModel = (reqModel ?? loadedModel) ?? null;
            if (!resolvedModel) {
                post({ id: msg.id, type: 'result', ok: false, reason: 'model_not_loaded', message: 'No model loaded; specify a model or call load() first.' });
                break;
            }
            if (!loadedModel) {
                post({ id: msg.id, type: 'result', ok: false, reason: 'model_not_loaded', message: 'No model loaded; call load() first.' });
                break;
            }
            if (loadedModel !== resolvedModel) {
                post({ id: msg.id, type: 'result', ok: false, reason: 'model_not_loaded', message: `Loaded model is "${loadedModel}"; requested generate for "${resolvedModel}".` });
                break;
            }
            const resolvedParams = { ...msg.params, model: resolvedModel };
            // If idle, start immediately
            if (!currentJob) {
                const controller = new AbortController();
                currentJob = { id: msg.id, controller, params: resolvedParams };
                runJob(currentJob);
                break;
            }
            // Busy path
            if (policy === 'reject') {
                post({ id: msg.id, type: 'result', ok: false, reason: 'busy' });
                break;
            }
            if (policy === 'abort_and_queue') {
                const pj = { id: msg.id, params: resolvedParams };
                if (replaceQueued)
                    supersedePending(pj);
                else if (!pendingJob)
                    pendingJob = pj;
                else {
                    post({ id: msg.id, type: 'result', ok: false, reason: 'busy' });
                    break;
                }
                if (debounceMs > 0) {
                    const now = Date.now();
                    if (pendingJob)
                        pendingJob.debounceUntil = now + debounceMs;
                }
                // Abort current
                if (!aborting && currentJob) {
                    aborting = true;
                    setState('aborting');
                    currentJob.controller.abort();
                    if (abortTimer) {
                        clearTimeout(abortTimer);
                        abortTimer = null;
                    }
                    handleAbortTimeout();
                }
                post({ id: msg.id, type: 'accepted' });
                break;
            }
            // Default: 'queue'
            if (pendingJob) {
                if (replaceQueued) {
                    supersedePending({ id: msg.id, params: resolvedParams, debounceUntil: debounceMs ? Date.now() + debounceMs : undefined });
                    post({ id: msg.id, type: 'accepted' });
                }
                else {
                    post({ id: msg.id, type: 'result', ok: false, reason: 'busy' });
                }
            }
            else {
                pendingJob = { id: msg.id, params: resolvedParams, debounceUntil: debounceMs ? Date.now() + debounceMs : undefined };
                post({ id: msg.id, type: 'accepted' });
            }
            setState('queued');
            break;
        }
        case 'abort': {
            if (currentJob) {
                if (!aborting) {
                    aborting = true;
                    setState('aborting');
                    currentJob.controller.abort();
                    if (abortTimer) {
                        clearTimeout(abortTimer);
                        abortTimer = null;
                    }
                    handleAbortTimeout();
                }
                post({ id: msg.id, type: 'accepted' });
            }
            else {
                // No-op
                post({ id: msg.id, type: 'result', ok: true });
            }
            break;
        }
    }
}
self.addEventListener('message', onMessage);
setState('idle');
