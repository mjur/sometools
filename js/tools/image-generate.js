import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, qs } from '/js/ui.js';

const promptInput = qs('#prompt');
const generateBtn = qs('#generate');
const abortBtn = qs('#abort');
const loadModelBtn = qs('#load-model');
const unloadModelBtn = qs('#unload-model');
const downloadBtn = qs('#download');
const clearOutputBtn = qs('#clear-output');
const modelSelect = qs('#model-select');
const seedInput = qs('#seed');
const seedGroup = qs('#seed-group');
const output = qs('#output');
const modelStatus = qs('#model-status');
const progressContainer = qs('#progress-container');
const progressBar = qs('#progress-bar');
const progressText = qs('#progress-text');
const webgpuCheck = qs('#webgpu-check');
const libraryError = qs('#library-error');
const autoLoadCheck = qs('#auto-load');
const purgeCacheBtn = qs('#purge-cache');
const purgeAllCacheBtn = qs('#purge-all-cache');

let client = null;
let currentModel = null;
let currentAbort = null;
let currentImageBlob = null;
let isGenerating = false;

// Load web-txt2img library
async function loadLibrary() {
  if (window.Txt2ImgWorkerClient || window.WebTxt2ImgClient) {
    return window.Txt2ImgWorkerClient || window.WebTxt2ImgClient;
  }
  
  try {
    toast('Loading web-txt2img library...', 'info');
    
    // PRIORITIZE BUNDLED VERSION - it has workers properly configured
    // CDN versions fail due to CORS when creating workers
    try {
      console.log('Trying to load web-txt2img from bundle...');
      await import('/js/tools/bundled/web-txt2img-bundle.js');
      // The bundle sets the class on window, not as an export
      const Txt2ImgWorkerClient = window.Txt2ImgWorkerClient || window.WebTxt2ImgClient;
      
      if (Txt2ImgWorkerClient && typeof Txt2ImgWorkerClient === 'function') {
        window._webTxt2ImgFromBundle = true; // Mark that we loaded from bundle
        console.log('web-txt2img loaded successfully from bundle');
        toast('Library loaded from bundle', 'success');
        return Txt2ImgWorkerClient;
      } else {
        console.error('Txt2ImgWorkerClient not found on window after bundle load');
      }
    } catch (e) {
      console.error('Bundled web-txt2img not available:', e);
      console.error('Bundle load error details:', e.message, e.stack);
    }
    
    // CDN sources will fail due to Worker CORS issues, but try anyway for fallback
    // Note: Workers from CDN won't work due to CORS restrictions
    const cdnSources = [
      {
        url: 'https://esm.sh/web-txt2img@latest',
        name: 'esm.sh'
      },
      {
        url: 'https://cdn.jsdelivr.net/npm/web-txt2img@latest/dist/index.js',
        name: 'jsdelivr'
      },
      {
        url: 'https://unpkg.com/web-txt2img@latest/dist/index.js',
        name: 'unpkg'
      }
    ];
    
    let lastError = null;
    
    for (const source of cdnSources) {
      try {
        console.log(`Trying to load web-txt2img from: ${source.name}`);
        const module = await import(/* @vite-ignore */ source.url);
        
        const Txt2ImgWorkerClient = module.Txt2ImgWorkerClient || 
                                    module.default?.Txt2ImgWorkerClient || 
                                    module.default;
        
        if (Txt2ImgWorkerClient && typeof Txt2ImgWorkerClient === 'function') {
          window.Txt2ImgWorkerClient = Txt2ImgWorkerClient;
          window.WebTxt2ImgClient = Txt2ImgWorkerClient; // Alias for compatibility
          console.log(`web-txt2img loaded successfully from ${source.name}`);
          toast('Library loaded successfully (CDN - workers may not work)', 'info');
          return Txt2ImgWorkerClient;
        }
        
        lastError = new Error(`Txt2ImgWorkerClient not found in module from ${source.name}`);
      } catch (importError) {
        console.warn(`Failed to load from ${source.name}:`, importError);
        lastError = importError;
        continue;
      }
    }
    
    throw new Error(`Failed to load web-txt2img library. Please run: npm install web-txt2img && npm run build`);
  } catch (error) {
    console.error('Failed to load web-txt2img:', error);
    libraryError.style.display = 'block';
    throw error;
  }
}

// Initialize client
async function initClient() {
  if (client) return client;
  
  try {
    const Txt2ImgWorkerClient = await loadLibrary();
    
    // Intercept WebAssembly.instantiateStreaming to redirect WASM file requests
    // ONNX Runtime uses this instead of fetch for WASM loading
    const originalInstantiateStreaming = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming = function(source, importObject) {
      // source can be a Response or a Promise<Response>
      const handleResponse = (response) => {
        const url = response.url || '';
        console.log('WebAssembly.instantiateStreaming called', {
          url: url,
          type: response.type,
          status: response.status,
          headers: Object.fromEntries(response.headers?.entries() || [])
        });
        
        // Check Content-Type header to detect WASM files
        const contentType = response.headers?.get('content-type') || '';
        const isWasm = url.includes('.wasm') || contentType.includes('application/wasm') || contentType.includes('application/octet-stream');
        
        // If it's a WASM file request that needs redirection
        if (isWasm && !url.includes('/js/tools/bundled/assets/')) {
          // Extract filename
          let fileName = url.split('/').pop();
          if (fileName.includes('?')) {
            fileName = fileName.split('?')[0];
          }
          
          // Known WASM files
          const knownWasmFiles = [
            'ort-wasm-simd-threaded.asyncify-BJtBjfiH.wasm',
            'ort-wasm-simd-threaded.jsep-BGTZ4Y7F.wasm'
          ];
          
          // Check if this is an ONNX Runtime WASM file
          if (fileName.includes('ort-wasm') || fileName.includes('ort') || 
              knownWasmFiles.some(f => fileName.includes(f.split('-')[2]?.split('.')[0]))) {
            // Try to match with known files
            let fixedUrl = null;
            for (const knownFile of knownWasmFiles) {
              if (fileName.includes(knownFile.split('-')[2]?.split('.')[0]) || 
                  knownFile.includes(fileName.split('-')[0])) {
                fixedUrl = `/js/tools/bundled/assets/${knownFile}`;
                break;
              }
            }
            
            if (!fixedUrl) {
              fixedUrl = `/js/tools/bundled/assets/${fileName}`;
            }
            
            console.log('Intercepting WASM instantiateStreaming, redirecting:', url, '->', fixedUrl);
            return fetch(fixedUrl).then(newResponse => {
              if (!newResponse.ok) {
                console.warn('WASM fetch returned non-OK status:', newResponse.status);
                // Try fallback
                const fallbackUrl = fixedUrl.includes('asyncify') 
                  ? '/js/tools/bundled/assets/ort-wasm-simd-threaded.jsep-BGTZ4Y7F.wasm'
                  : '/js/tools/bundled/assets/ort-wasm-simd-threaded.asyncify-BJtBjfiH.wasm';
                console.log('Trying fallback WASM:', fallbackUrl);
                return fetch(fallbackUrl);
              }
              return newResponse;
            }).then(newResponse => {
              return originalInstantiateStreaming(newResponse, importObject);
            });
          }
        }
        
        // For non-WASM or already correct paths, use original
        return originalInstantiateStreaming(response, importObject);
      };
      
      // Handle both Response and Promise<Response>
      if (source instanceof Promise) {
        return source.then(handleResponse);
      } else {
        return handleResponse(source);
      }
    };
    
    // Also intercept fetch to redirect WASM file requests to bundled assets
    // ONNX Runtime might use fetch in some cases
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
      
      // Log all fetch requests to help debug WASM loading issues
      if (url.includes('.wasm') || url.includes('ort') || url.includes('onnx')) {
        console.log('Fetch request:', url, 'Method:', init?.method || 'GET');
      }
      
      // If it's trying to load a WASM file, check if we need to redirect it
      if (url.includes('.wasm')) {
        // If it's already pointing to bundled assets, let it through
        if (url.includes('/js/tools/bundled/assets/')) {
          console.log('WASM fetch already pointing to bundled assets:', url);
          return originalFetch(input, init);
        }
        
        // Extract filename from URL (handle various path formats)
        let fileName = url.split('/').pop();
        if (fileName.includes('?')) {
          fileName = fileName.split('?')[0]; // Remove query params
        }
        
        // List of known WASM files in bundled assets
        const knownWasmFiles = [
          'ort-wasm-simd-threaded.asyncify-BJtBjfiH.wasm',
          'ort-wasm-simd-threaded.jsep-BGTZ4Y7F.wasm'
        ];
        
        // Check if this is an ONNX Runtime WASM file
        if (fileName.includes('ort-wasm') || fileName.includes('ort.webgpu') || fileName.includes('ort_') || 
            knownWasmFiles.some(f => fileName.includes(f.split('-')[0]))) {
          // Try to match with known files first
          let fixedUrl = null;
          for (const knownFile of knownWasmFiles) {
            if (fileName.includes(knownFile.split('-')[2]?.split('.')[0]) || 
                knownFile.includes(fileName.split('-')[0])) {
              fixedUrl = `/js/tools/bundled/assets/${knownFile}`;
              break;
            }
          }
          
          // If no match, try with the extracted filename
          if (!fixedUrl) {
            fixedUrl = `/js/tools/bundled/assets/${fileName}`;
          }
          
          console.log('Intercepting WASM fetch, redirecting:', url, '->', fixedUrl);
          const fetchPromise = originalFetch(fixedUrl, init);
          
          // Check if the response is OK, if not try fallback
          return fetchPromise.then(response => {
            if (!response.ok) {
              console.warn('WASM fetch returned non-OK status:', response.status, 'for', fixedUrl);
              // Try the other known WASM file as fallback
              let fallbackUrl = null;
              if (fixedUrl.includes('asyncify')) {
                fallbackUrl = '/js/tools/bundled/assets/ort-wasm-simd-threaded.jsep-BGTZ4Y7F.wasm';
              } else if (fixedUrl.includes('jsep')) {
                fallbackUrl = '/js/tools/bundled/assets/ort-wasm-simd-threaded.asyncify-BJtBjfiH.wasm';
              }
              if (fallbackUrl) {
                console.log('Trying fallback WASM file:', fallbackUrl);
                return originalFetch(fallbackUrl, init);
              }
            }
            return response;
          }).catch(err => {
            console.error('Failed to fetch WASM from fixed URL:', fixedUrl, err);
            // Try the other known WASM file as fallback
            let fallbackUrl = null;
            if (fixedUrl.includes('asyncify')) {
              fallbackUrl = '/js/tools/bundled/assets/ort-wasm-simd-threaded.jsep-BGTZ4Y7F.wasm';
            } else if (fixedUrl.includes('jsep')) {
              fallbackUrl = '/js/tools/bundled/assets/ort-wasm-simd-threaded.asyncify-BJtBjfiH.wasm';
            }
            if (fallbackUrl) {
              console.log('Trying fallback WASM file after error:', fallbackUrl);
              return originalFetch(fallbackUrl, init);
            }
            throw err;
          });
        }
        
        // If it's trying to load from /assets/ (bundle's relative path), fix it
        if (url.includes('/assets/')) {
          fileName = url.split('/assets/').pop();
          if (fileName.includes('?')) {
            fileName = fileName.split('?')[0];
          }
          const fixedUrl = `/js/tools/bundled/assets/${fileName}`;
          console.log('Intercepting WASM fetch (/assets/), redirecting:', url, '->', fixedUrl);
          return originalFetch(fixedUrl, init);
        }
      }
      
      return originalFetch(input, init);
    };
    
    // Always intercept Worker constructor to fix paths
    // This handles both CDN (CORS issues) and bundled (path issues) scenarios
    window.OriginalWorker = window.Worker;
    window.Worker = function(scriptURL, options) {
      const url = String(scriptURL);
      console.log('Worker constructor called with URL:', url);
      
      let workerUrl = scriptURL;
      
      // If it's trying to load from a CDN, redirect to bundled assets
      if (url.includes('esm.sh') || url.includes('cdn.jsdelivr.net') || url.includes('unpkg.com')) {
        // Use the wrapper that loads transformers first
        workerUrl = '/js/tools/bundled/assets/host-wrapper.js';
        console.log('Intercepting CDN worker, redirecting to wrapper:', workerUrl);
      }
      // If it's trying to load from /assets/ (bundle's relative path), fix it
      else if (url.includes('/assets/') && !url.includes('/js/tools/bundled/assets/')) {
        const fileName = url.split('/assets/').pop();
        // If it's the host worker, use the wrapper instead
        if (fileName.includes('host')) {
          workerUrl = '/js/tools/bundled/assets/host-wrapper.js';
          console.log('Using wrapper for host worker:', workerUrl);
        } else {
          workerUrl = `/js/tools/bundled/assets/${fileName}`;
          console.log('Fixing bundled worker path:', url, '->', workerUrl);
        }
      }
      
      // Create worker with proper module type
      try {
        return new window.OriginalWorker(workerUrl, { ...options, type: 'module' });
      } catch (e) {
        console.error('Failed to create worker:', e);
        throw e;
      }
    };
    
    // Initialize the client using the worker-based API
    // Txt2ImgWorkerClient.createDefault() creates a worker automatically
    try {
      client = Txt2ImgWorkerClient.createDefault();
    } catch (workerError) {
      // If worker creation fails, restore original Worker and show error
      if (window.OriginalWorker) {
        window.Worker = window.OriginalWorker;
      }
      if (workerError.message && workerError.message.includes('Worker')) {
        throw new Error('Worker creation failed. Please run: npm run build to use the bundled version');
      }
      throw workerError;
    }
    
    // Keep Worker interceptor active for the lifetime of the client
    // (Don't restore it, as workers may be created later)
    
    // Check WebGPU support
    const caps = await client.detect();
    if (!caps.webgpu) {
      webgpuCheck.style.display = 'block';
      generateBtn.disabled = true;
      loadModelBtn.disabled = true;
      toast('WebGPU is not supported in this browser', 'error');
      modelStatus.textContent = 'WebGPU not supported';
      return null;
    }
    
    modelStatus.textContent = 'Ready - WebGPU detected';
    return client;
  } catch (error) {
    console.error('Failed to initialize client:', error);
    // Restore original Worker on error
    if (window.OriginalWorker) {
      window.Worker = window.OriginalWorker;
    }
    const errorMsg = error.message || 'Unknown error';
    toast(`Failed to initialize: ${errorMsg}`, 'error');
    modelStatus.textContent = `Error: ${errorMsg}`;
    
    // Show helpful message if library loading failed
    if (errorMsg.includes('npm install') || errorMsg.includes('Worker') || errorMsg.includes('build')) {
      modelStatus.innerHTML = `Error: ${errorMsg}<br><small>Please run: <code>npm install web-txt2img && npm run build</code> to use the bundled version</small>`;
    }
    
    return null;
  }
}

// Update progress UI
function setProgress(progress = {}) {
  if (!progress.message && !progress.pct) {
    progressContainer.style.display = 'none';
    return;
  }
  
  progressContainer.style.display = 'block';
  
  const pct = progress.pct != null ? `${Math.round(progress.pct)}%` : '';
  let size = '';
  if (progress.bytesDownloaded != null && progress.totalBytesExpected != null) {
    const downloadedMB = (progress.bytesDownloaded / 1024 / 1024).toFixed(1);
    const totalMB = (progress.totalBytesExpected / 1024 / 1024).toFixed(1);
    size = ` ${downloadedMB}/${totalMB} MB`;
  }
  
  progressText.textContent = `${progress.message || ''} ${pct}${size}`.trim();
  
  if (progress.pct != null) {
    progressBar.value = progress.pct;
    progressBar.removeAttribute('indeterminate');
  } else {
    progressBar.setAttribute('indeterminate', '');
  }
}

// Load model
async function loadModel() {
  if (!client) {
    client = await initClient();
    if (!client) return;
  }
  
  const modelId = modelSelect.value;
  
  try {
    loadModelBtn.disabled = true;
    modelStatus.textContent = 'Loading model...';
    setProgress({ message: 'Loading model...', pct: 0 });
    
    // Check if model is already loaded
    const models = await client.listModels();
    const model = models.find(m => m.id === modelId);
    
    if (model) {
      const sizeInfo = model.sizeGBApprox 
        ? ` (~${model.sizeGBApprox} GB)`
        : model.sizeBytesApprox
        ? ` (~${(model.sizeBytesApprox / 1024 / 1024).toFixed(1)} MB)`
        : '';
      modelStatus.textContent = `Loading ${modelId}${sizeInfo}...`;
    }
    
    // For models that need Transformers.js (sd-turbo and janus-pro-1b), ensure it's available
    // The worker needs access to it, so we need to make it globally available
    // Note: Workers run in separate contexts, so we can't directly share window variables
    // The worker will try to dynamically import it, but we can preload it to help
    if ((modelId === 'janus-pro-1b' || modelId === 'sd-turbo')) {
      // The worker will handle loading Transformers.js via dynamic import
      // We just need to ensure the CDN is accessible
      // The bundled worker code will try to import '@huggingface/transformers' 
      // which should resolve to the CDN version
      console.log('Model requires Transformers.js - worker will load it dynamically');
    }
    
    // Try WebGPU first, fallback to WASM if WebGPU fails
    // Note: WebGPU requires .mjs wrapper files which may not be available in the bundle
    let result;
    // Configure WASM paths - ONNX Runtime looks for specific file names
    // Since the worker is at /js/tools/bundled/assets/host-O6WzXidB.js
    // and WASM files are in the same directory, we can use relative paths
    // or absolute paths. Let's try both directory path and file mappings.
    const wasmPathsConfig = '/js/tools/bundled/assets/';
    
    // Configure ONNX Runtime environment to find .mjs wrapper files
    // These are needed for WebGPU and WASM backends
    if (window.ort && window.ort.env) {
      // Set the base path for ONNX Runtime to find .mjs files
      // The .mjs files use import.meta.url to resolve WASM files
      window.ort.env.wasm.wasmPaths = wasmPathsConfig;
      console.log('Configured ONNX Runtime wasmPaths:', wasmPathsConfig);
    }
    
    try {
      result = await client.load(
        modelId,
        {
          backendPreference: ['webgpu'],
          // Configure ONNX Runtime to use bundled WASM files
          // Use directory path - ONNX Runtime will look for files in this directory
          wasmPaths: wasmPathsConfig
        },
        (progress) => {
          setProgress({
            message: progress.phase || 'Loading...',
            pct: progress.pct,
            bytesDownloaded: progress.bytesDownloaded,
            totalBytesExpected: progress.totalBytesExpected
          });
        }
      );
      
      // If WebGPU fails due to .mjs import issues, try WASM backend
      const actualResult = result.data || result;
      if (!actualResult.ok) {
        const errorMsg = actualResult.message || actualResult.reason || '';
        if (errorMsg.includes('mjs') || errorMsg.includes('Failed to fetch dynamically imported module') || 
            errorMsg.includes('no available backend')) {
          console.warn('WebGPU failed, falling back to WASM backend. Error:', errorMsg);
          result = await client.load(
          modelId,
          {
            backendPreference: ['wasm'],
            wasmPaths: wasmPathsConfig
          },
          (progress) => {
            setProgress({
              message: progress.phase || 'Loading...',
              pct: progress.pct,
              bytesDownloaded: progress.bytesDownloaded,
              totalBytesExpected: progress.totalBytesExpected
            });
          }
        );
      }
    }
    } catch (error) {
      // If WebGPU fails, try WASM as fallback
      if (error.message?.includes('mjs') || error.message?.includes('Failed to fetch dynamically imported module')) {
        console.warn('WebGPU failed, falling back to WASM backend');
        result = await client.load(
          modelId,
          {
            backendPreference: ['wasm'],
            wasmPaths: wasmPathsConfig
          },
          (progress) => {
            setProgress({
              message: progress.phase || 'Loading...',
              pct: progress.pct,
              bytesDownloaded: progress.bytesDownloaded,
              totalBytesExpected: progress.totalBytesExpected
            });
          }
        );
      } else {
        throw error;
      }
    }
    
    // The result might be wrapped in a data property from the worker
    const actualResult = result.data || result;
    
    if (actualResult.ok) {
      currentModel = modelId;
      modelStatus.textContent = `Model loaded: ${modelId}${actualResult.backendUsed ? ` (${actualResult.backendUsed})` : ''}`;
      if (actualResult.bytesDownloaded) {
        modelStatus.textContent += ` - ${(actualResult.bytesDownloaded / 1024 / 1024).toFixed(1)} MB downloaded`;
      }
      generateBtn.disabled = false;
      unloadModelBtn.disabled = false;
      setProgress();
      toast('Model loaded successfully', 'success');
      
      // Update seed input visibility
      if (modelId === 'sd-turbo') {
        seedGroup.style.display = 'flex';
      } else {
        seedGroup.style.display = 'none';
      }
    } else {
      throw new Error(actualResult.reason || actualResult.message || 'Failed to load model');
    }
  } catch (error) {
    console.error('Model load error:', error);
    modelStatus.textContent = `Error: ${error.message}`;
    setProgress();
    toast(`Failed to load model: ${error.message}`, 'error');
  } finally {
    loadModelBtn.disabled = false;
  }
}

// Unload model
async function unloadModel() {
  if (!client || !currentModel) return;
  
  try {
    unloadModelBtn.disabled = true;
    modelStatus.textContent = 'Unloading model...';
    
    await client.unload();
    currentModel = null;
    modelStatus.textContent = 'No model loaded';
    generateBtn.disabled = true;
    unloadModelBtn.disabled = true;
    
    toast('Model unloaded', 'success');
  } catch (error) {
    console.error('Unload error:', error);
    toast(`Failed to unload: ${error.message}`, 'error');
  } finally {
    unloadModelBtn.disabled = false;
  }
}

// Generate image
async function generateImage() {
  if (!client || !currentModel) {
    toast('Please load a model first', 'error');
    return;
  }
  
  const prompt = promptInput.value.trim();
  if (!prompt) {
    toast('Please enter a prompt', 'error');
    return;
  }
  
  if (isGenerating) {
    toast('Generation already in progress', 'info');
    return;
  }
  
  try {
    isGenerating = true;
    generateBtn.disabled = true;
    abortBtn.disabled = false;
    downloadBtn.disabled = true;
    output.innerHTML = '<p class="text-muted">Generating image...</p>';
    
    const params = {
      prompt,
      model: currentModel
    };
    
    // Add seed for SD-Turbo
    if (currentModel === 'sd-turbo' && seedInput.value) {
      const seed = parseInt(seedInput.value, 10);
      if (!isNaN(seed)) {
        params.seed = seed;
      }
    }
    
    const { promise, abort } = client.generate(
      params,
      (progress) => {
        setProgress({
          message: `Generating: ${progress.phase || 'processing'}`,
          pct: progress.pct
        });
      },
      {
        busyPolicy: 'queue',
        debounceMs: 200
      }
    );
    
    currentAbort = abort;
    
    const result = await promise;
    
    // The result might be wrapped in a data property from the worker
    const actualResult = result.data || result;
    
    if (actualResult.ok && actualResult.blob) {
      currentImageBlob = actualResult.blob;
      const url = URL.createObjectURL(actualResult.blob);
      output.innerHTML = `<img src="${url}" alt="Generated image" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px;">`;
      downloadBtn.disabled = false;
      toast('Image generated successfully', 'success');
      
      // Save state
      saveStateWithStorage({
        prompt,
        model: currentModel,
        seed: seedInput.value || null
      }, 'image-generate-state');
    } else {
      throw new Error(actualResult.reason || actualResult.message || 'Generation failed');
    }
  } catch (error) {
    if (error.name === 'AbortError' || error.message.includes('abort')) {
      output.innerHTML = '<p class="text-muted">Generation cancelled</p>';
      toast('Generation cancelled', 'info');
    } else {
      console.error('Generation error:', error);
      output.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
      toast(`Generation failed: ${error.message}`, 'error');
    }
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    abortBtn.disabled = true;
    currentAbort = null;
    setProgress();
  }
}

// Abort generation
async function abortGeneration() {
  if (currentAbort) {
    try {
      await currentAbort();
      toast('Generation aborted', 'info');
    } catch (error) {
      console.error('Abort error:', error);
    }
  }
}

// Download image
function downloadImage() {
  if (!currentImageBlob) {
    toast('No image to download', 'error');
    return;
  }
  
  const url = URL.createObjectURL(currentImageBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `generated-image-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('Image downloaded', 'success');
}

// Clear output
function clearOutput() {
  if (currentImageBlob) {
    URL.revokeObjectURL(URL.createObjectURL(currentImageBlob));
    currentImageBlob = null;
  }
  output.innerHTML = '<p class="text-muted">Generated image will appear here</p>';
  downloadBtn.disabled = true;
}

// Purge cache
async function purgeCache() {
  if (!client || !currentModel) {
    toast('No model loaded', 'error');
    return;
  }
  
  try {
    await client.purge(currentModel);
    toast('Model cache purged', 'success');
  } catch (error) {
    console.error('Purge error:', error);
    toast(`Failed to purge cache: ${error.message}`, 'error');
  }
}

// Purge all caches
async function purgeAllCaches() {
  if (!client) {
    toast('Client not initialized', 'error');
    return;
  }
  
  try {
    await client.purgeAll();
    toast('All caches purged', 'success');
  } catch (error) {
    console.error('Purge all error:', error);
    toast(`Failed to purge caches: ${error.message}`, 'error');
  }
}

// Event handlers
on(generateBtn, 'click', generateImage);
on(abortBtn, 'click', abortGeneration);
on(loadModelBtn, 'click', loadModel);
on(unloadModelBtn, 'click', unloadModel);
on(downloadBtn, 'click', downloadImage);
on(clearOutputBtn, 'click', clearOutput);
on(purgeCacheBtn, 'click', purgeCache);
on(purgeAllCacheBtn, 'click', purgeAllCaches);

// Model change handler
on(modelSelect, 'change', () => {
  if (currentModel && currentModel !== modelSelect.value) {
    modelStatus.textContent = 'Model changed. Please unload current model first.';
  }
  if (modelSelect.value === 'sd-turbo') {
    seedGroup.style.display = 'flex';
  } else {
    seedGroup.style.display = 'none';
  }
});

// Keyboard shortcut
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!generateBtn.disabled) {
      generateImage();
    }
  }
});

// Load state
const storageKey = 'image-generate-state';
const state = loadStateWithStorage(storageKey);
if (state?.prompt) {
  promptInput.value = state.prompt;
  if (state.model) modelSelect.value = state.model;
  if (state.seed) seedInput.value = state.seed;
}

// Initialize on load
(async () => {
  try {
    await initClient();
    
    // Auto-load if enabled
    if (autoLoadCheck.checked && modelSelect.value) {
      await loadModel();
    }
  } catch (error) {
    console.error('Initialization error:', error);
    modelStatus.textContent = `Error: ${error.message}`;
  }
})();

// Load from URL
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.prompt) {
    promptInput.value = urlState.prompt;
    if (urlState.model) modelSelect.value = urlState.model;
    if (urlState.seed) seedInput.value = urlState.seed;
  }
}

