const scriptRel = 'modulepreload';const assetsURL = function(dep) { return "/"+dep };const seen = {};const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (true && deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};

function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
class Txt2ImgWorkerClient {
    constructor(worker) {
        this.pending = new Map();
        this.lastGenerateId = null;
        this.worker = worker;
        this.worker.addEventListener('message', (ev) => this.onMessage(ev));
    }
    static createDefault() {
        // Use the canonical Vite-friendly pattern so the worker is bundled in builds.
        // Publish-safe: point to .js; dev uses a shim at src/worker/host.js
        const w = new Worker(new URL(/* @vite-ignore */ "/assets/host-DT1risQB.js", import.meta.url), { type: 'module' });
        return new Txt2ImgWorkerClient(w);
    }
    onMessage(ev) {
        const msg = ev.data;
        if (!msg || typeof msg !== 'object')
            return;
        if (msg.type === 'state') {
            // No-op; apps can subscribe on worker directly if needed
            return;
        }
        const id = msg.id;
        const pend = id ? this.pending.get(id) : undefined;
        if (!pend)
            return;
        switch (msg.type) {
            case 'accepted': {
                // ignore; promise resolves on final result
                break;
            }
            case 'progress': {
                pend.onProgress?.(msg.event);
                break;
            }
            case 'result': {
                this.pending.delete(id);
                pend.resolve(msg);
                break;
            }
        }
    }
    send(req, onProgress) {
        return new Promise((resolve, reject) => {
            console.log('[Client] Sending message to worker:', req);
            this.pending.set(req.id, { resolve, reject, onProgress });
            if (!this.worker) {
                console.error('[Client] Worker is null! Cannot send message.');
                reject(new Error('Worker is not initialized'));
                return;
            }
            try {
                this.worker.postMessage(req);
                console.log('[Client] Message posted to worker, waiting for response...');
            } catch (error) {
                console.error('[Client] Failed to post message to worker:', error);
                reject(error);
            }
        });
    }
    async detect() {
        const res = await this.send({ id: uid(), kind: 'detect' });
        return res.data;
    }
    async listModels() {
        const res = await this.send({ id: uid(), kind: 'listModels' });
        return res.data;
    }
    async listBackends() {
        const res = await this.send({ id: uid(), kind: 'listBackends' });
        return res.data;
    }
    async load(model, options, onProgress) {
        const res = await this.send({ id: uid(), kind: 'load', model, options }, onProgress);
        return res.data ?? res; // return LoadResult in data, or whole msg if shaped differently
    }
    async unload(model) {
        await this.send({ id: uid(), kind: 'unload', model });
    }
    async purge(model) {
        await this.send({ id: uid(), kind: 'purge', model });
    }
    async purgeAll() {
        await this.send({ id: uid(), kind: 'purgeAll' });
    }
    generate(params, onProgress, opts) {
        const id = uid();
        this.lastGenerateId = id;
        const promise = this.send({ id, kind: 'generate', params, ...(opts ?? {}) }, onProgress);
        const abort = async () => {
            await this.send({ id: uid(), kind: 'abort' });
        };
        return { id, promise, abort };
    }
    terminate() {
        this.worker.terminate();
        this.pending.clear();
    }
}
function createTxt2ImgWorker() {
    // Publish-safe: point to .js; dev uses a shim at src/worker/host.js
    return new Worker(new URL(/* @vite-ignore */ "/assets/host-DT1risQB.js", import.meta.url), { type: 'module' });
}

// Expose the client class globally (using WebTxt2ImgClient as alias for compatibility)
window.WebTxt2ImgClient = Txt2ImgWorkerClient;
window.Txt2ImgWorkerClient = Txt2ImgWorkerClient;
window.createTxt2ImgWorker = createTxt2ImgWorker;

// Pre-import transformers.js so it's available for the worker
// The worker will try to import it, and having it pre-loaded helps
try {
  // Try to import transformers.js and make it available globally
  // This helps the worker find it when it tries to import
  __vitePreload(() => import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.x/dist/transformers.min.js'),true?[]:void 0).then(transformers => {
    // Make it available globally for the worker
    window.transformers = transformers;
    window.AutoTokenizer = transformers.AutoTokenizer;
    window.env = transformers.env;
    console.log('Transformers.js pre-loaded for worker');
  }).catch(err => {
    console.warn('Could not pre-load Transformers.js:', err);
  });
} catch (err) {
  console.warn('Could not pre-load Transformers.js:', err);
}
