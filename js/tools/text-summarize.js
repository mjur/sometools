import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';

// WebLLM will be loaded dynamically
let CreateMLCEngine = null;
let webllmApi = null;
let currentEngine = null;
let isModelLoading = false;

// Check WebGPU support
function checkWebGPUSupport() {
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    return true;
  }
  return false;
}

const modelSelect = qs('#model-select');
const downloadModelBtn = qs('#download-model');
const checkModelBtn = qs('#check-model');
const clearModelBtn = qs('#clear-model');
const modelStatus = qs('#model-status');
const modelList = qs('#model-list');
const dropZone = qs('#drop-zone');
const fileInput = qs('#file-input');
const inputText = qs('#input-text');
const summarizeBtn = qs('#summarize');
const clearBtn = qs('#clear');
const summaryTextarea = qs('#summary');
const copySummaryBtn = qs('#copy-summary');
const downloadSummaryBtn = qs('#download-summary');

// Load state
const storageKey = 'text-summarize-state';
const state = loadStateWithStorage(storageKey);
if (state?.inputText) inputText.value = state.inputText;
if (state?.model) modelSelect.value = state.model;
if (state?.summary) summaryTextarea.value = state.summary;

// Load WebLLM library
async function loadWebLLM() {
  if (CreateMLCEngine) return CreateMLCEngine;
  
  try {
    toast('Loading WebLLM library...', 'info');
    
    if (typeof window !== 'undefined' && window.CreateMLCEngine) {
      CreateMLCEngine = window.CreateMLCEngine;
      webllmApi = window.webllm || webllmApi;
      toast('WebLLM library loaded', 'success');
      return CreateMLCEngine;
    }

    // Try bundled module explicitly, in case it wasn't imported yet
    try {
      const bundledModule = await import('/js/tools/bundled/webllm-bundle.js');
      CreateMLCEngine = bundledModule.CreateMLCEngine || window.CreateMLCEngine;
      webllmApi = window.webllm || bundledModule.webllm || webllmApi;
      if (CreateMLCEngine && typeof CreateMLCEngine === 'function') {
        toast('WebLLM library loaded', 'success');
        return CreateMLCEngine;
      }
    } catch (e) {
      console.log('Bundled WebLLM not available for text summarizer:', e);
    }
    
    // Fallback: Try CDN sources (may not work due to WebLLM's complexity)
    const cdnSources = [
      {
        url: 'https://esm.run/@mlc-ai/web-llm',
        name: 'esm.run'
      }
    ];
    
    let lastError = null;
    
    for (const source of cdnSources) {
      try {
        console.log(`Trying to load WebLLM from: ${source.name}`);
        const module = await import(/* @vite-ignore */ source.url);
        
        CreateMLCEngine = module.CreateMLCEngine || module.default?.CreateMLCEngine || module.default;
        
        if (CreateMLCEngine && typeof CreateMLCEngine === 'function') {
          console.log('WebLLM CreateMLCEngine loaded successfully from', source.name);
          toast('WebLLM library loaded', 'success');
          return CreateMLCEngine;
        }
        
        console.warn('WebLLM loaded but Engine class not found. Module keys:', Object.keys(module));
        lastError = new Error(`Engine class not found in module from ${source.name}`);
      } catch (importError) {
        console.warn(`Failed to load from ${source.name}:`, importError);
        lastError = importError;
        continue;
      }
    }
    
    // If all sources failed, provide helpful error
    throw new Error(`WebLLM library not found. Please build the bundled version by running: npm install && npm run build. 
    
WebLLM requires bundling and cannot be loaded directly from CDN. 
See README.md for build instructions.`);
    
  } catch (e) {
    toast(`Failed to load WebLLM: ${e.message.split('\n')[0]}`, 'error');
    console.error('WebLLM load error:', e);
    throw e;
  }
}

async function listCachedModels() {
  if (!modelList) return;
  
  // Update webllmApi from window if available
  if (typeof window !== 'undefined' && window.webllm) {
    webllmApi = window.webllm;
  }
  
  if (!webllmApi || typeof webllmApi.hasModelInCache !== 'function') {
    modelList.innerHTML = '<p class="text-sm text-muted" style="margin: 0;">Cache API not available yet. Download a model first.</p>';
    return;
  }

  const options = Array.from(modelSelect?.options || []).map(o => o.value);
  const cached = [];

  for (const id of options) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const ok = await webllmApi.hasModelInCache(id);
      if (ok) cached.push(id);
    } catch {
      // Ignore all errors - database might not be initialized, model doesn't exist, etc.
      // This prevents NotFoundError from breaking the UI
    }
  }

  if (cached.length === 0) {
    modelList.innerHTML = '<p class="text-sm text-muted" style="margin: 0;">No cached models found.</p>';
    return;
  }

  const items = cached.map(key => {
    const isSelected = key === modelSelect.value;
    return `<li${isSelected ? ' style="font-weight: 600;"' : ''}>${key}</li>`;
  }).join('');

  modelList.innerHTML = `
    <p class="text-sm text-muted" style="margin: 0 0 0.25rem 0;">Cached models:</p>
    <ul style="margin: 0; padding-left: 1.25rem; list-style: disc;">${items}</ul>
  `;
}

// Check if model is cached
async function checkModel() {
  const modelName = modelSelect.value;
  
  // Update webllmApi from window if available
  if (typeof window !== 'undefined' && window.webllm) {
    webllmApi = window.webllm;
  }
  
  if (!webllmApi || typeof webllmApi.hasModelInCache !== 'function') {
    modelStatus.textContent = 'Cache API not available. Please download a model first.';
    modelStatus.style.color = 'var(--muted)';
    return;
  }
  
  try {
    modelStatus.textContent = 'Checking cache...';
    modelStatus.style.color = 'var(--muted)';
    
    const isCached = await webllmApi.hasModelInCache(modelName);
    
    if (isCached) {
      modelStatus.textContent = `✓ Model "${modelName}" is cached and ready to use.`;
      modelStatus.style.color = 'var(--ok)';
      listCachedModels().catch(console.error);
    } else {
      modelStatus.textContent = `✗ Model "${modelName}" is not cached. Click "Download & Cache Model" to download it.`;
      modelStatus.style.color = 'var(--muted)';
    }
  } catch (error) {
    modelStatus.textContent = `Error checking cache: ${error.message}`;
    modelStatus.style.color = 'var(--error)';
    console.error('Cache check error:', error);
  }
}

// Clear model from cache
async function clearModel() {
  const modelName = modelSelect.value;
  
  // Update webllmApi from window if available
  if (typeof window !== 'undefined' && window.webllm) {
    webllmApi = window.webllm;
  }
  
  if (!webllmApi || typeof webllmApi.deleteModelAllInfo !== 'function') {
    toast('Cache API not available', 'error');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete "${modelName}" from cache? This will free up storage space but you'll need to download it again to use it.`)) {
    return;
  }
  
  try {
    clearModelBtn.disabled = true;
    clearModelBtn.textContent = 'Clearing...';
    modelStatus.textContent = `Clearing model "${modelName}" from cache...`;
    modelStatus.style.color = 'var(--muted)';
    
    await webllmApi.deleteModelAllInfo(modelName);
    
    // Clear current engine if it's the one being deleted
    if (currentEngine) {
      currentEngine = null;
    }
    
    toast('Model cleared from cache', 'success');
    modelStatus.textContent = `✓ Model "${modelName}" cleared from cache.`;
    modelStatus.style.color = 'var(--ok)';
    listCachedModels().catch(console.error);
  } catch (error) {
    toast(`Failed to clear model: ${error.message}`, 'error');
    modelStatus.textContent = `✗ Error clearing model: ${error.message}`;
    modelStatus.style.color = 'var(--error)';
    console.error('Clear model error:', error);
  } finally {
    clearModelBtn.disabled = false;
    clearModelBtn.textContent = 'Clear Selected Model';
  }
}

// Initialize and download model
async function downloadModel() {
  if (isModelLoading) {
    toast('Model is already loading. Please wait...', 'info');
    return;
  }
  
  const modelName = modelSelect.value;
  // Use a shared flag that progress callback can check
  let hasError = false;
  let errorMessage = null;
  
  // Helper function to set error and prevent progress updates
  const setError = (msg) => {
    hasError = true;
    errorMessage = msg;
  };
  
  try {
    isModelLoading = true;
    downloadModelBtn.disabled = true;
    downloadModelBtn.textContent = 'Downloading...';
    modelStatus.textContent = `Downloading model "${modelName}"... This may take several minutes.`;
    modelStatus.style.color = 'var(--muted)';
    
    // Load WebLLM if not already loaded
    const createEngine = await loadWebLLM();
    
    if (!createEngine || typeof createEngine !== 'function') {
      throw new Error('WebLLM CreateMLCEngine is not available. Please refresh the page.');
    }
    
    toast(`Starting download of ${modelName}...`, 'info');
    
    // Initialize engine with the selected model
    // Wrap in try-catch to catch errors immediately
    let engine;
    try {
      engine = await createEngine(
        modelName,
        {
          initProgressCallback: (report) => {
            // Don't update progress if an error has occurred
            if (hasError) {
              return;
            }
            
            const progress = report.progress || 0;
            const text = report.text || '';
            const percentage = (progress * 100).toFixed(1);
            modelStatus.textContent = `Downloading: ${percentage}% - ${text}`;
            
            if (progress === 1) {
              modelStatus.textContent = `✓ Model "${modelName}" downloaded and cached successfully!`;
              modelStatus.style.color = 'var(--ok)';
            }
          },
          gpuDevice: null, // Let WebLLM auto-detect
        }
      );
    } catch (engineError) {
      setError(engineError.message);
      throw engineError;
    }
    
    currentEngine = engine;
    isModelLoading = false;
    downloadModelBtn.disabled = false;
    downloadModelBtn.textContent = 'Download & Cache Model';
    
    toast('Model downloaded and cached successfully!', 'success');
    modelStatus.textContent = `✓ Model "${modelName}" is ready to use`;
    modelStatus.style.color = 'var(--ok)';
    listCachedModels().catch(console.error);
    
  } catch (e) {
    setError(e.message || 'Unknown error');
    
    isModelLoading = false;
    downloadModelBtn.disabled = false;
    downloadModelBtn.textContent = 'Download & Cache Model';
    
    const errorMsg = errorMessage || e.message || 'Unknown error';
    toast(`Failed to download model: ${errorMsg}`, 'error');
    
    let errorText = `✗ Error: ${errorMsg}`;
    
    // Provide helpful messages for common errors
    if (errorMsg.includes('GPU') || errorMsg.includes('WebGPU') || errorMsg.includes('compatible GPU')) {
      errorText += '\n\n⚠️ WebGPU is required but not available.';
      errorText += '\n\nSolutions:';
      errorText += '\n1. Use Chrome 113+, Edge 113+, or Safari 18+';
      errorText += '\n2. Enable WebGPU in Chrome: chrome://flags/#enable-unsafe-webgpu';
      errorText += '\n3. Check GPU support at: https://webgpureport.org/';
      errorText += '\n4. WebLLM requires a GPU (dedicated or integrated) for model execution';
    } else if (errorMsg.includes('ShaderModule') || errorMsg.includes('shader') || errorMsg.includes('compute stage') || errorMsg.includes('Invalid ShaderModule')) {
      errorText += '\n\n⚠️ WebGPU shader compilation error. This usually indicates a GPU compatibility issue.';
      errorText += '\n\nSolutions:';
      errorText += '\n1. Update your GPU drivers to the latest version';
      errorText += '\n2. Try a different browser (Chrome/Edge recommended)';
      errorText += '\n3. Try a smaller model (e.g., Qwen2.5-0.5B-Instruct)';
      errorText += '\n4. Check if your GPU is compatible at: https://webgpureport.org/';
      errorText += '\n5. Some integrated GPUs may not support all WebGPU features';
    } else if (errorMsg.includes('quota') || errorMsg.includes('storage') || errorMsg.includes('space')) {
      errorText += '\n\n⚠️ Your browser cache may be full. Try increasing your browser cache size (see instructions above).';
    } else if (errorMsg.includes('model record') || errorMsg.includes('appConfig')) {
      errorText += '\n\n⚠️ Model ID not found. Please select a different model from the dropdown.';
    }
    
    setTimeout(() => {
      if (hasError) {
        modelStatus.textContent = errorText;
        modelStatus.style.color = 'var(--error)';
        modelStatus.style.whiteSpace = 'pre-wrap';
      }
    }, 100);
    
    modelStatus.textContent = errorText;
    modelStatus.style.color = 'var(--error)';
    modelStatus.style.whiteSpace = 'pre-wrap';
    
    console.error('Model download error:', e);
  }
}

// Initialize engine (load from cache or download)
async function initializeEngine() {
  if (currentEngine) {
    return currentEngine;
  }
  
  const modelName = modelSelect.value;
  let hasError = false;
  let errorMessage = null;
  
  const setError = (msg) => {
    hasError = true;
    errorMessage = msg;
  };
  
  try {
    const createEngine = await loadWebLLM();
    
    if (!createEngine || typeof createEngine !== 'function') {
      throw new Error('WebLLM CreateMLCEngine is not available. Please refresh the page.');
    }
    
    toast('Loading model from cache...', 'info');
    
    let engine;
    try {
      engine = await createEngine(
        modelName,
        {
          initProgressCallback: (report) => {
            if (hasError) return;
            
            const progress = report.progress || 0;
            const text = report.text || '';
            if (progress < 1) {
              const percentage = (progress * 100).toFixed(1);
              modelStatus.textContent = `Loading: ${percentage}% - ${text}`;
            }
          },
          gpuDevice: null,
        }
      );
    } catch (engineError) {
      setError(engineError.message);
      throw engineError;
    }
    currentEngine = engine;
    
    toast('Model loaded successfully!', 'success');
    modelStatus.textContent = `✓ Model "${modelName}" is ready`;
    modelStatus.style.color = 'var(--ok)';
    listCachedModels().catch(console.error);
    
    return engine;
  } catch (e) {
    setError(e.message || 'Unknown error');
    
    const errorMsg = errorMessage || e.message || 'Unknown error';
    toast(`Failed to load model: ${errorMsg}`, 'error');
    
    let errorText = `✗ Error loading model: ${errorMsg}`;
    
    if (errorMsg.includes('ShaderModule') || errorMsg.includes('shader') || errorMsg.includes('compute stage') || errorMsg.includes('Invalid ShaderModule')) {
      errorText += '\n\n⚠️ WebGPU shader compilation error. This usually indicates a GPU compatibility issue.';
      errorText += '\n\nSolutions:';
      errorText += '\n1. Update your GPU drivers to the latest version';
      errorText += '\n2. Try a different browser (Chrome/Edge recommended)';
      errorText += '\n3. Try a smaller model (e.g., Qwen2.5-0.5B-Instruct)';
      errorText += '\n4. Check if your GPU is compatible at: https://webgpureport.org/';
      errorText += '\n5. Some integrated GPUs may not support all WebGPU features';
    } else if (errorMsg.includes('not found') || errorMsg.includes('cache')) {
      errorText += '\n\nClick "Download & Cache Model" to download it.';
    } else if (errorMsg.includes('GPU') || errorMsg.includes('WebGPU') || errorMsg.includes('compatible GPU')) {
      errorText += '\n\n⚠️ WebGPU is required but not available. Check browser compatibility and GPU support.';
    }
    
    setTimeout(() => {
      if (hasError) {
        modelStatus.textContent = errorText;
        modelStatus.style.color = 'var(--error)';
        modelStatus.style.whiteSpace = 'pre-wrap';
      }
    }, 100);
    
    modelStatus.textContent = errorText;
    modelStatus.style.color = 'var(--error)';
    modelStatus.style.whiteSpace = 'pre-wrap';
    
    throw e;
  }
}

// Summarize text
async function summarizeText() {
  const text = inputText.value.trim();
  
  if (!text) {
    toast('Please enter text to summarize', 'error');
    return;
  }
  
  try {
    summarizeBtn.disabled = true;
    summarizeBtn.textContent = 'Summarizing...';
    summaryTextarea.value = '';
    
    // Initialize engine if needed
    let engine = currentEngine;
    if (!engine) {
      engine = await initializeEngine();
    }
    
    // Create prompt for summarization
    const prompt = `Please provide a concise summary of the following text. Focus on the main points and key information:

${text}

Summary:`;

    // Generate response using WebLLM API
    let generatedText = '';
    
    try {
      // Try OpenAI-compatible API first
      if (engine.chat && engine.chat.completions && engine.chat.completions.create) {
        const response = await engine.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that provides concise summaries of text. Focus on the main points and key information.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        });
        
        if (response && typeof response === 'object' && 'choices' in response) {
          generatedText = response.choices[0].message.content.trim();
        } else if (typeof response === 'string') {
          generatedText = response.trim();
        }
      } 
      // Fallback: use generate method
      else if (engine.generate) {
        generatedText = await engine.generate(prompt, {
          temperature: 0.3,
          max_tokens: 500
        });
      }
      // Fallback: use chat method directly
      else if (engine.chat) {
        const response = await engine.chat({
          messages: [
            { role: 'system', content: 'You are a helpful assistant that provides concise summaries of text. Focus on the main points and key information.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        });
        
        if (typeof response === 'string') {
          generatedText = response;
        } else if (response && response.content) {
          generatedText = response.content;
        }
      } else {
        throw new Error('WebLLM engine does not support chat or generate methods');
      }
      
      generatedText = generatedText.trim();
    } catch (apiError) {
      console.error('Summarization API error:', apiError);
      throw new Error(`Failed to summarize text: ${apiError.message}`);
    }
    
    summaryTextarea.value = generatedText;
    
    // Save state
    saveStateWithStorage(storageKey, {
      inputText: text,
      model: modelSelect.value,
      summary: generatedText
    });
    
    toast('Summary generated successfully!', 'success');
  } catch (e) {
    const errorMsg = e.message || 'Unknown error';
    toast(`Failed to summarize: ${errorMsg}`, 'error');
    summaryTextarea.value = `Error: ${errorMsg}`;
    console.error('Summarization error:', e);
  } finally {
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = 'Summarize';
  }
}

// Clear inputs
function clearInputs() {
  inputText.value = '';
  summaryTextarea.value = '';
  if (fileInput) fileInput.value = '';
  saveStateWithStorage(storageKey, {
    inputText: '',
    model: modelSelect.value,
    summary: ''
  });
  toast('Cleared', 'info');
}

// Read file as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Handle file selection
async function handleFile(file) {
  if (!file.type.startsWith('text/') && !file.name.match(/\.(txt|md|markdown|json|xml|html|css|js|ts|jsx|tsx)$/i)) {
    toast('Please select a text file', 'error');
    return;
  }
  
  try {
    const text = await readFileAsText(file);
    inputText.value = text;
    toast(`File "${file.name}" loaded`, 'success');
    
    // Save state
    saveStateWithStorage(storageKey, {
      inputText: text,
      model: modelSelect.value,
      summary: summaryTextarea.value
    });
  } catch (error) {
    toast(`Failed to load file: ${error.message}`, 'error');
  }
}

// Download summary as file
function downloadSummary() {
  const summary = summaryTextarea.value.trim();
  
  if (!summary) {
    toast('No summary to download', 'error');
    return;
  }
  
  const blob = new Blob([summary], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'summary.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('Summary downloaded', 'success');
}

// Event listeners
on(downloadModelBtn, 'click', downloadModel);
on(checkModelBtn, 'click', checkModel);
on(clearModelBtn, 'click', clearModel);
on(summarizeBtn, 'click', summarizeText);
on(clearBtn, 'click', clearInputs);
on(copySummaryBtn, 'click', () => {
  copy(summaryTextarea.value, 'Summary copied to clipboard');
});
on(downloadSummaryBtn, 'click', downloadSummary);

// File input handlers
if (dropZone && fileInput) {
  on(dropZone, 'click', () => {
    fileInput.click();
  });
  
  on(dropZone, 'dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary)';
    dropZone.style.backgroundColor = 'var(--bg)';
  });
  
  on(dropZone, 'dragleave', () => {
    dropZone.style.borderColor = 'var(--border)';
    dropZone.style.backgroundColor = 'var(--bg-elev)';
  });
  
  on(dropZone, 'drop', async (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
    dropZone.style.backgroundColor = 'var(--bg-elev)';
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  });
  
  on(fileInput, 'change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFile(file);
    }
  });
}

// Auto-save input text
on(inputText, 'input', () => {
  saveStateWithStorage(storageKey, {
    inputText: inputText.value,
    model: modelSelect.value,
    summary: summaryTextarea.value
  });
});

// Check cached models on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      listCachedModels().catch(console.error);
      checkModel().catch(console.error);
    }, 500);
  });
}

