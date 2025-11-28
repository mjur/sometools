import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, qs } from '/js/ui.js';

// WebLLM will be loaded dynamically
let CreateMLCEngine = null;
let currentEngine = null;
let isModelLoading = false;
let originalText = '';
let checkedText = '';
let errors = [];
let fixedText = '';

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
const textInput = qs('#text-input');
const fileInput = qs('#file-input');
const fileUploadArea = qs('#file-upload-area');
const fileInfo = qs('#file-info');
const checkBtn = qs('#check');
const clearBtn = qs('#clear');
const output = qs('#output');
const fixIssuesBtn = qs('#fix-issues');
const downloadBtn = qs('#download');
const errorsSummary = qs('#errors-summary');

// Load state
const storageKey = 'grammar-check-state';
const state = loadStateWithStorage(storageKey);
if (state?.text) textInput.value = state.text;
if (state?.model) modelSelect.value = state.model;

// Load WebLLM library (same as regex generator)
async function loadWebLLM() {
  if (CreateMLCEngine) return CreateMLCEngine;
  
  try {
    toast('Loading WebLLM library...', 'info');
    
    if (typeof window !== 'undefined' && window.CreateMLCEngine) {
      CreateMLCEngine = window.CreateMLCEngine;
      toast('WebLLM library loaded', 'success');
      return CreateMLCEngine;
    }

    try {
      const bundledModule = await import('/js/tools/bundled/webllm-bundle.js');
      CreateMLCEngine = bundledModule.CreateMLCEngine || window.CreateMLCEngine;
      if (CreateMLCEngine && typeof CreateMLCEngine === 'function') {
        toast('WebLLM library loaded', 'success');
        return CreateMLCEngine;
      }
    } catch (e) {
      console.log('Bundled WebLLM not available:', e);
    }
    
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
        
        lastError = new Error(`Engine class not found in module from ${source.name}`);
      } catch (importError) {
        console.warn(`Failed to load from ${source.name}:`, importError);
        lastError = importError;
        continue;
      }
    }
    
    throw new Error(`WebLLM library not found. Please build the bundled version by running: npm install && npm run build.`);
  } catch (error) {
    console.error('Failed to load WebLLM:', error);
    toast(`Failed to load WebLLM: ${error.message}`, 'error');
    throw error;
  }
}

// List cached models (same as regex generator)
let webllmApi = null;

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
      const ok = await webllmApi.hasModelInCache(id);
      if (ok) cached.push(id);
    } catch {
      // Ignore all errors - database might not be initialized, model doesn't exist, etc.
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

// Download and cache model
async function downloadModel() {
  if (isModelLoading) {
    toast('Model is already loading', 'info');
    return;
  }
  
  if (!checkWebGPUSupport()) {
    toast('WebGPU is not supported in your browser. Please use Chrome 113+, Edge 113+, or Safari 18+', 'error');
    return;
  }
  
  const modelName = modelSelect.value;
  let hasError = false;
  let errorMessage = null;
  
  const setError = (msg) => {
    hasError = true;
    errorMessage = msg;
  };
  
  try {
    isModelLoading = true;
    downloadModelBtn.disabled = true;
    downloadModelBtn.textContent = 'Downloading...';
    modelStatus.textContent = 'Initializing download...';
    modelStatus.style.color = 'var(--muted)';
    
    const createEngine = await loadWebLLM();
    
    if (!createEngine || typeof createEngine !== 'function') {
      throw new Error('WebLLM CreateMLCEngine is not available. Please refresh the page.');
    }
    
    let engine;
    try {
      engine = await createEngine(
        modelName,
        {
          initProgressCallback: (report) => {
            if (hasError) return;
            
            const progress = report.progress || 0;
            const text = report.text || '';
            const percentage = (progress * 100).toFixed(1);
            modelStatus.textContent = `Downloading: ${percentage}% - ${text}`;
            
            if (progress === 1) {
              modelStatus.textContent = `✓ Model "${modelName}" downloaded and cached successfully!`;
              modelStatus.style.color = 'var(--ok)';
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
    isModelLoading = false;
    downloadModelBtn.disabled = false;
    downloadModelBtn.textContent = 'Download & Cache Model';
    
    toast('Model downloaded and cached successfully!', 'success');
    modelStatus.textContent = `✓ Model "${modelName}" is ready to use`;
    modelStatus.style.color = 'var(--ok)';
    listCachedModels().catch(console.error);
    
  } catch (e) {
    hasError = true;
    isModelLoading = false;
    downloadModelBtn.disabled = false;
    downloadModelBtn.textContent = 'Download & Cache Model';
    
    const errorMsg = e.message || 'Unknown error';
    modelStatus.textContent = `✗ Error: ${errorMsg}`;
    modelStatus.style.color = 'var(--error)';
    modelStatus.style.whiteSpace = 'pre-wrap';
    
    toast(`Failed to download model: ${errorMsg}`, 'error');
    console.error('Model download error:', e);
  }
}

// Initialize engine
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
    hasError = true;
    const errorMsg = e.message || 'Unknown error';
    modelStatus.textContent = `✗ Error: ${errorMsg}`;
    modelStatus.style.color = 'var(--error)';
    modelStatus.style.whiteSpace = 'pre-wrap';
    
    toast(`Failed to load model: ${errorMsg}`, 'error');
    console.error('Model initialization error:', e);
    
    throw e;
  }
}

// Check grammar and spelling
async function checkGrammar() {
  const text = textInput.value.trim();
  
  if (!text) {
    toast('Please enter text to check', 'error');
    return;
  }
  
  try {
    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking...';
    output.innerHTML = '<p class="placeholder" style="color: var(--muted);">Checking grammar and spelling...</p>';
    errorsSummary.textContent = '';
    fixIssuesBtn.disabled = true;
    downloadBtn.disabled = true;
    errors = [];
    originalText = text;
    
    let engine = currentEngine;
    if (!engine) {
      engine = await initializeEngine();
    }
    
    const prompt = `You are a grammar and spelling checker. Analyze the following text and identify all errors. For each error, provide:
1. The exact text that contains the error
2. The type of error (spelling, grammar, punctuation, etc.)
3. A brief explanation
4. The suggested correction

Format your response as JSON array of objects, where each object has:
- "text": the exact text with the error
- "type": error type (e.g., "spelling", "grammar", "punctuation")
- "explanation": brief explanation
- "correction": the corrected text

Text to check:
${text}

Return ONLY the JSON array, no other text.`;

    let response = '';
    
    try {
      if (engine.chat && engine.chat.completions && engine.chat.completions.create) {
        const result = await engine.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a grammar and spelling checker. Return only valid JSON arrays with error objects.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });
        
        if (result && typeof result === 'object' && 'choices' in result) {
          response = result.choices[0].message.content.trim();
        } else if (typeof result === 'string') {
          response = result.trim();
        }
      } else if (engine.generate) {
        response = await engine.generate(prompt, {
          temperature: 0.1,
          max_tokens: 2000
        });
      } else if (engine.chat) {
        const result = await engine.chat({
          messages: [
            { role: 'system', content: 'You are a grammar and spelling checker. Return only valid JSON arrays with error objects.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });
        
        if (typeof result === 'string') {
          response = result;
        } else if (result && result.content) {
          response = result.content;
        }
      } else {
        throw new Error('WebLLM engine does not support chat or generate methods');
      }
      
      response = response.trim();
      
      // Try to extract JSON from response
      let jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        response = jsonMatch[0];
      }
      
      // Remove markdown code blocks if present
      response = response.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      
      errors = JSON.parse(response);
      
      if (!Array.isArray(errors)) {
        errors = [];
      }
      
    } catch (apiError) {
      console.error('API error:', apiError);
      // Fallback: try to parse errors from natural language response
      errors = parseErrorsFromText(response, text);
    }
    
    // Highlight errors in text
    displayHighlightedText(text, errors);
    
    // Show errors summary
    if (errors.length > 0) {
      const spellingCount = errors.filter(e => e.type === 'spelling').length;
      const grammarCount = errors.filter(e => e.type === 'grammar').length;
      const otherCount = errors.length - spellingCount - grammarCount;
      
      errorsSummary.innerHTML = `
        <strong>Found ${errors.length} error(s):</strong><br>
        ${spellingCount > 0 ? `• ${spellingCount} spelling error(s)` : ''}
        ${grammarCount > 0 ? `• ${grammarCount} grammar error(s)` : ''}
        ${otherCount > 0 ? `• ${otherCount} other error(s)` : ''}
      `;
      fixIssuesBtn.disabled = false;
    } else {
      errorsSummary.innerHTML = '<strong style="color: var(--ok);">✓ No errors found!</strong>';
      fixIssuesBtn.disabled = true;
    }
    
    checkedText = text;
    downloadBtn.disabled = false;
    
    saveStateWithStorage({
      text,
      model: modelSelect.value
    }, storageKey);
    
    toast('Grammar check completed!', 'success');
    
  } catch (e) {
    const errorMsg = e.message || 'Unknown error';
    toast(`Failed to check grammar: ${errorMsg}`, 'error');
    output.innerHTML = `<p class="error">Error: ${errorMsg}</p>`;
    console.error('Grammar check error:', e);
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = 'Check Grammar & Spelling';
  }
}

// Parse errors from natural language response (fallback)
function parseErrorsFromText(response, originalText) {
  const errors = [];
  // Simple heuristic: look for patterns like "error: ..." or "issue: ..."
  // This is a fallback if JSON parsing fails
  const lines = response.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('issue')) {
      // Try to extract text and suggestion
      const match = line.match(/(.+?)\s*(?:should be|correct to|change to|->|→)\s*(.+)/i);
      if (match) {
        errors.push({
          text: match[1].trim(),
          type: 'grammar',
          explanation: line,
          correction: match[2].trim()
        });
      }
    }
  }
  return errors;
}

// Display text with highlighted errors
function displayHighlightedText(text, errors) {
  if (errors.length === 0) {
    output.innerHTML = `<p style="color: var(--ok);">✓ No errors found in the text!</p>`;
    return;
  }
  
  // Find all error positions in the text
  const errorRanges = [];
  for (const error of errors) {
    const errorText = error.text.trim();
    if (!errorText) continue;
    
    // Find all occurrences of the error text
    let searchIndex = 0;
    while (true) {
      const index = text.indexOf(errorText, searchIndex);
      if (index === -1) break;
      
      errorRanges.push({
        start: index,
        end: index + errorText.length,
        error: error
      });
      
      searchIndex = index + 1;
    }
  }
  
  // Sort by start position
  errorRanges.sort((a, b) => a.start - b.start);
  
  // Remove overlapping ranges (keep first occurrence)
  const nonOverlapping = [];
  for (const range of errorRanges) {
    const overlaps = nonOverlapping.some(r => 
      (range.start >= r.start && range.start < r.end) ||
      (range.end > r.start && range.end <= r.end) ||
      (range.start <= r.start && range.end >= r.end)
    );
    
    if (!overlaps) {
      nonOverlapping.push(range);
    }
  }
  
  // Sort by position in reverse order for safe replacement
  nonOverlapping.sort((a, b) => b.start - a.start);
  
  let highlighted = text;
  
  // Replace errors with highlighted spans (working backwards to preserve indices)
  for (const range of nonOverlapping) {
    const before = highlighted.substring(0, range.start);
    const errorText = highlighted.substring(range.start, range.end);
    const after = highlighted.substring(range.end);
    
    const tooltip = range.error.explanation || `${range.error.type}: ${range.error.correction || 'needs correction'}`;
    const escapedTooltip = tooltip.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const highlight = `<span class="error-highlight" title="${escapedTooltip}">${errorText}<span class="error-tooltip">${escapedTooltip}</span></span>`;
    
    highlighted = before + highlight + after;
  }
  
  output.innerHTML = highlighted;
}

// Fix all issues
async function fixAllIssues() {
  if (errors.length === 0 || !checkedText) {
    toast('No errors to fix', 'info');
    return;
  }
  
  try {
    fixIssuesBtn.disabled = true;
    fixIssuesBtn.textContent = 'Fixing...';
    
    let engine = currentEngine;
    if (!engine) {
      engine = await initializeEngine();
    }
    
    const prompt = `You are a grammar and spelling corrector. Fix all errors in the following text. Return ONLY the corrected text, with no explanations or additional text.

Original text:
${checkedText}

Return the corrected version:`;

    let response = '';
    
    try {
      if (engine.chat && engine.chat.completions && engine.chat.completions.create) {
        const result = await engine.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a grammar and spelling corrector. Return only the corrected text, no explanations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });
        
        if (result && typeof result === 'object' && 'choices' in result) {
          response = result.choices[0].message.content.trim();
        } else if (typeof result === 'string') {
          response = result.trim();
        }
      } else if (engine.generate) {
        response = await engine.generate(prompt, {
          temperature: 0.1,
          max_tokens: 2000
        });
      } else if (engine.chat) {
        const result = await engine.chat({
          messages: [
            { role: 'system', content: 'You are a grammar and spelling corrector. Return only the corrected text, no explanations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });
        
        if (typeof result === 'string') {
          response = result;
        } else if (result && result.content) {
          response = result.content;
        }
      }
      
      response = response.trim();
      
      // Remove any markdown code blocks
      response = response.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
      
      fixedText = response;
      
      // Update textarea with fixed text
      textInput.value = fixedText;
      
      // Re-check the fixed text
      await checkGrammar();
      
      toast('All issues fixed!', 'success');
      
    } catch (apiError) {
      console.error('Fix API error:', apiError);
      throw new Error(`Failed to fix issues: ${apiError.message}`);
    }
    
  } catch (e) {
    const errorMsg = e.message || 'Unknown error';
    toast(`Failed to fix issues: ${errorMsg}`, 'error');
    console.error('Fix error:', e);
  } finally {
    fixIssuesBtn.disabled = false;
    fixIssuesBtn.textContent = 'Fix All Issues';
  }
}

// Download fixed text
function downloadFixedText() {
  const textToDownload = fixedText || checkedText || textInput.value;
  
  if (!textToDownload) {
    toast('No text to download', 'error');
    return;
  }
  
  const blob = new Blob([textToDownload], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `corrected-text-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('Text downloaded!', 'success');
}

// Handle file upload
function handleFileUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    textInput.value = content;
    fileInfo.textContent = `Loaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    toast('File loaded!', 'success');
  };
  reader.onerror = () => {
    toast('Failed to read file', 'error');
  };
  reader.readAsText(file);
}

// Clear
function clearAll() {
  textInput.value = '';
  output.innerHTML = '<p class="placeholder" style="color: var(--muted);">Checked text with highlighted errors will appear here...</p>';
  errorsSummary.textContent = '';
  fixIssuesBtn.disabled = true;
  downloadBtn.disabled = true;
  fileInfo.textContent = '';
  errors = [];
  originalText = '';
  checkedText = '';
  fixedText = '';
}

// Clear selected model
async function clearSelectedModel() {
  const modelName = modelSelect.value;
  
  if (!modelName) {
    toast('No model selected', 'info');
    return;
  }
  
  if (!confirm(`Are you sure you want to clear the cached model "${modelName}"? This will delete it from your browser's storage.`)) {
    return;
  }
  
  try {
    // WebLLM uses IndexedDB, we need to clear it
    // The model name is used as the key
    if (typeof indexedDB !== 'undefined') {
      // Note: WebLLM manages its own cache, we can't directly delete it
      // But we can clear the engine reference
      currentEngine = null;
      toast('Model reference cleared. The cached model files remain in storage.', 'info');
      modelStatus.textContent = 'Model reference cleared';
      modelStatus.style.color = 'var(--muted)';
    }
  } catch (e) {
    console.error('Failed to clear model:', e);
    toast('Failed to clear model', 'error');
  }
}

// Check model status (same as regex generator)
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

// Event listeners
on(downloadModelBtn, 'click', downloadModel);
on(checkModelBtn, 'click', checkModelStatus);
on(clearModelBtn, 'click', clearSelectedModel);
on(checkBtn, 'click', checkGrammar);
on(clearBtn, 'click', clearAll);
on(fixIssuesBtn, 'click', fixAllIssues);
on(downloadBtn, 'click', downloadFixedText);

// File upload handlers
on(fileUploadArea, 'click', () => fileInput.click());
on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFileUpload(file);
  }
});

// Drag and drop
on(fileUploadArea, 'dragover', (e) => {
  e.preventDefault();
  fileUploadArea.classList.add('dragover');
});

on(fileUploadArea, 'dragleave', () => {
  fileUploadArea.classList.remove('dragover');
});

on(fileUploadArea, 'drop', (e) => {
  e.preventDefault();
  fileUploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    handleFileUpload(file);
  } else {
    toast('Please upload a text file', 'error');
  }
});

// Check model status on load
checkModelStatus().catch(console.error);
listCachedModels().catch(console.error);

