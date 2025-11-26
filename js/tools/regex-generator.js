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
const descriptionInput = qs('#description');
const generateBtn = qs('#generate');
const clearBtn = qs('#clear');
const outputTextarea = qs('#output');
const explanationPre = qs('#explanation');
const copyRegexBtn = qs('#copy-regex');
const testRegexBtn = qs('#test-regex');

// Load state
const storageKey = 'regex-generator-state';
const state = loadStateWithStorage(storageKey);
if (state?.description) descriptionInput.value = state.description;
if (state?.model) modelSelect.value = state.model;
if (state?.output) outputTextarea.value = state.output;
if (state?.explanation) explanationPre.textContent = state.explanation;

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
      console.log('Bundled WebLLM not available for regex generator:', e);
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
    <ul class="text-sm" style="margin: 0; padding-left: 1.25rem;">
      ${items}
    </ul>
  `;
}

// Check if model is cached
async function checkModelStatus() {
  const modelName = modelSelect.value;
  try {
    modelStatus.textContent = 'Checking model status...';
    modelStatus.style.color = 'var(--muted)';

    // Update webllmApi from window if available
    if (typeof window !== 'undefined' && window.webllm) {
      webllmApi = window.webllm;
    }

    if (!webllmApi || typeof webllmApi.hasModelInCache !== 'function') {
      modelStatus.textContent = 'WebLLM cache API not available yet. Make sure the WebLLM bundle is loaded.';
      modelStatus.style.color = 'var(--error)';
      await listCachedModels();
      return false;
    }

    let cached = false;
    try {
      cached = await webllmApi.hasModelInCache(modelName);
    } catch (e) {
      // Ignore IndexedDB errors - database might not be initialized
      if (e.name === 'NotFoundError' || e.message?.includes('object stores')) {
        cached = false;
      } else {
        throw e;
      }
    }
    
    if (cached) {
      modelStatus.textContent = `✓ Model "${modelName}" is cached and ready`;
      modelStatus.style.color = 'var(--ok)';
    } else {
      modelStatus.textContent = `✗ Model "${modelName}" is not cached. Click "Download & Cache Model" to download it.`;
      modelStatus.style.color = 'var(--error)';
    }
    await listCachedModels();
    return cached;
  } catch (e) {
    modelStatus.textContent = `Error checking model status: ${e.message}`;
    modelStatus.style.color = 'var(--error)';
    return false;
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
    // WebLLM API: CreateMLCEngine(model, config)
    // Wrap in try-catch to catch errors immediately
    let engine;
    try {
      engine = await createEngine(
        modelName,
        {
          initProgressCallback: (report) => {
            // Don't update progress if an error has occurred
            if (hasError) {
              // Error already set, don't overwrite it
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
          // Try to use WebGPU, but allow fallback to CPU/WASM if needed
          gpuDevice: null, // Let WebLLM auto-detect
          // Note: WebLLM will try WebGPU first, then fall back to CPU if WebGPU is not available
        }
      );
    } catch (engineError) {
      // Catch errors during engine creation immediately
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
    // Mark that an error occurred (in case progress callback is still running)
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
      errorText += '\n6. Try disabling hardware acceleration and re-enabling it in browser settings';
    } else if (errorMsg.includes('quota') || errorMsg.includes('storage') || errorMsg.includes('space')) {
      errorText += '\n\n⚠️ Your browser cache may be full. Try increasing your browser cache size (see instructions above).';
    } else if (errorMsg.includes('model record') || errorMsg.includes('appConfig')) {
      errorText += '\n\n⚠️ Model ID not found. Please select a different model from the dropdown.';
    }
    
    // Set error message and prevent it from being overwritten
    // Use a small delay to ensure progress callback doesn't overwrite it
    setTimeout(() => {
      if (hasError) {
        modelStatus.textContent = errorText;
        modelStatus.style.color = 'var(--error)';
        modelStatus.style.whiteSpace = 'pre-wrap'; // Allow multi-line error messages
      }
    }, 100);
    
    // Also set immediately
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
  // Use a shared flag that progress callback can check
  let hasError = false;
  let errorMessage = null;
  
  // Helper function to set error and prevent progress updates
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
    
    // Wrap in try-catch to catch errors immediately
    let engine;
    try {
      engine = await createEngine(
        modelName,
        {
          initProgressCallback: (report) => {
            // Don't update progress if an error has occurred
            if (hasError) {
              // Error already set, don't overwrite it
              return;
            }
            
            const progress = report.progress || 0;
            const text = report.text || '';
            if (progress < 1) {
              const percentage = (progress * 100).toFixed(1);
              modelStatus.textContent = `Loading: ${percentage}% - ${text}`;
            }
          },
          // Try to use WebGPU, but allow fallback to CPU/WASM if needed
          gpuDevice: null, // Let WebLLM auto-detect
        }
      );
    } catch (engineError) {
      // Catch errors during engine creation immediately
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
    // Mark that an error occurred (in case progress callback is still running)
    setError(e.message || 'Unknown error');
    
    const errorMsg = errorMessage || e.message || 'Unknown error';
    toast(`Failed to load model: ${errorMsg}`, 'error');
    
    let errorText = `✗ Error loading model: ${errorMsg}`;
    
    // Provide helpful messages for common errors
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
    
    // Set error message and prevent it from being overwritten
    // Use a small delay to ensure progress callback doesn't overwrite it
    setTimeout(() => {
      if (hasError) {
        modelStatus.textContent = errorText;
        modelStatus.style.color = 'var(--error)';
        modelStatus.style.whiteSpace = 'pre-wrap'; // Allow multi-line error messages
      }
    }, 100);
    
    // Also set immediately
    modelStatus.textContent = errorText;
    modelStatus.style.color = 'var(--error)';
    modelStatus.style.whiteSpace = 'pre-wrap';
    
    throw e;
  }
}

// Generate regex from description
async function generateRegex() {
  const description = descriptionInput.value.trim();
  
  if (!description) {
    toast('Please enter a description', 'error');
    return;
  }
  
  try {
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    outputTextarea.value = '';
    explanationPre.textContent = 'Generating regex...';
    
    // Initialize engine if needed
    let engine = currentEngine;
    if (!engine) {
      engine = await initializeEngine();
    }
    
    // Create prompt for regex generation
    const prompt = `You are a regex expert. Generate a JavaScript regular expression pattern based on this description: "${description}"

Requirements:
1. Return ONLY the regex pattern (no code blocks, no explanations, just the pattern)
2. The pattern should be valid JavaScript regex
3. Do not include forward slashes or flags
4. Escape special characters properly
5. After the pattern, on a new line, provide a brief explanation of what the regex does

Example format:
\\d{3}-\\d{2}-\\d{4}
Matches three digits, a hyphen, two digits, a hyphen, and four digits (like a SSN format).`;

    // Generate response using WebLLM API
    // WebLLM API: engine.chat() or engine.generate()
    let generatedText = '';
    
    try {
      // Try OpenAI-compatible API first
      if (engine.chat && engine.chat.completions && engine.chat.completions.create) {
        const response = await engine.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates JavaScript regular expressions from natural language descriptions. Always return the regex pattern first, then an explanation on a new line.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
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
          max_tokens: 200
        });
      }
      // Fallback: use chat method directly
      else if (engine.chat) {
        const response = await engine.chat({
          messages: [
            { role: 'system', content: 'You are a helpful assistant that generates JavaScript regular expressions from natural language descriptions. Always return the regex pattern first, then an explanation on a new line.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 200
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
      console.error('Generation API error:', apiError);
      throw new Error(`Failed to generate regex: ${apiError.message}`);
    }
    
    // Extract regex and explanation
    const lines = generatedText.split('\n');
    let regex = '';
    let explanation = '';
    
    // First line is usually the regex
    regex = lines[0].trim();
    
    // Remove markdown code blocks if present
    regex = regex.replace(/^```(?:regex|javascript|js)?\s*/i, '').replace(/```\s*$/, '').trim();
    regex = regex.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
    
    // Rest is explanation
    explanation = lines.slice(1).join('\n').trim();
    if (!explanation) {
      explanation = 'Generated regex pattern. Test it to see what it matches.';
    }
    
    outputTextarea.value = regex;
    explanationPre.textContent = explanation;
    
    // Save state
    saveStateWithStorage({
      description,
      model: modelSelect.value,
      output: regex,
      explanation
    }, storageKey);
    
    toast('Regex generated successfully!', 'success');
    
  } catch (e) {
    const errorMsg = e.message || 'Unknown error';
    toast(`Failed to generate regex: ${errorMsg}`, 'error');
    explanationPre.textContent = `Error: ${errorMsg}`;
    console.error('Generation error:', e);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Regex';
  }
}

// Clear selected model
async function clearSelectedModel() {
  const modelName = modelSelect.value;
  try {
    // Update webllmApi from window if available
    if (typeof window !== 'undefined' && window.webllm) {
      webllmApi = window.webllm;
    }
    
    if (!webllmApi || typeof webllmApi.deleteModelAllInfoInCache !== 'function') {
      toast('WebLLM cache API not available to clear a single model.', 'error');
      return;
    }

    await webllmApi.deleteModelAllInfoInCache(modelName);
    toast(`Cleared cache for model "${modelName}"`, 'success');
    if (currentEngine) {
      currentEngine = null;
    }
    modelStatus.textContent = `✗ Model "${modelName}" is not cached.`;
    modelStatus.style.color = 'var(--error)';
    listCachedModels().catch(console.error);
  } catch (e) {
    console.error('Clear selected model error:', e);
    toast(`Failed to clear model cache: ${e.message}`, 'error');
  }
}

// Event listeners
on(downloadModelBtn, 'click', downloadModel);
on(checkModelBtn, 'click', checkModelStatus);
on(clearModelBtn, 'click', clearSelectedModel);
on(generateBtn, 'click', generateRegex);
on(clearBtn, 'click', () => {
  descriptionInput.value = '';
  outputTextarea.value = '';
  explanationPre.textContent = 'Explanation will appear here...';
  descriptionInput.focus();
});

on(copyRegexBtn, 'click', () => {
  if (outputTextarea.value) {
    copy(outputTextarea.value);
    toast('Regex copied to clipboard', 'success');
  } else {
    toast('No regex to copy', 'error');
  }
});

on(testRegexBtn, 'click', () => {
  if (outputTextarea.value) {
    const regex = encodeURIComponent(outputTextarea.value);
    window.open(`/regex/tester?pattern=${regex}`, '_blank');
  } else {
    toast('No regex to test', 'error');
  }
});

on(modelSelect, 'change', () => {
  // Reset engine when model changes
  currentEngine = null;
  modelStatus.textContent = 'Model changed. Click "Check Model Status" or "Download & Cache Model".';
  modelStatus.style.color = 'var(--muted)';
  
  // Save state
  saveStateWithStorage({
    description: descriptionInput.value,
    model: modelSelect.value,
    output: outputTextarea.value,
    explanation: explanationPre.textContent
  }, storageKey);
});

// On load: check WebGPU only (don't check model status automatically)
if (!checkWebGPUSupport()) {
  const warningMsg = '⚠️ WebGPU is not available in your browser. WebLLM requires WebGPU to run models. Use Chrome 113+, Edge 113+, or Safari 18+ with WebGPU enabled.';
  if (modelStatus) {
    modelStatus.textContent = warningMsg;
    modelStatus.style.color = 'var(--error)';
  }
  console.warn(warningMsg);
} else {
  // Don't call checkModelStatus on page load - let user click the button
  // This avoids IndexedDB errors if database isn't initialized yet
  if (modelStatus) {
    modelStatus.textContent = 'Click "Check Model Status" to see if a model is cached.';
    modelStatus.style.color = 'var(--muted)';
  }
}

