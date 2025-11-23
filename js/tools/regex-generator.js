import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';

// WebLLM will be loaded dynamically
let WebLLM = null;
let currentEngine = null;
let isModelLoading = false;

const modelSelect = qs('#model-select');
const downloadModelBtn = qs('#download-model');
const checkModelBtn = qs('#check-model');
const modelStatus = qs('#model-status');
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
  if (WebLLM) return WebLLM;
  
  try {
    toast('Loading WebLLM library...', 'info');
    
    // Wait for WebLLM to be available (loaded via script tag)
    let attempts = 0;
    while (attempts < 50) {
      if (typeof window !== 'undefined' && (window.webllm || window.Engine)) {
        WebLLM = window.Engine || window.webllm?.Engine || window.webllm;
        if (WebLLM) {
          toast('WebLLM library loaded', 'success');
          return WebLLM;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // If still not loaded, try dynamic import as fallback
    try {
      const module = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.40/dist/index.js');
      WebLLM = module.Engine || module.default || module;
      toast('WebLLM library loaded', 'success');
      return WebLLM;
    } catch (importError) {
      throw new Error('WebLLM library not found. Please refresh the page and ensure you have an internet connection.');
    }
  } catch (e) {
    toast(`Failed to load WebLLM: ${e.message}`, 'error');
    console.error('WebLLM load error:', e);
    throw e;
  }
}

// Check if model is cached
async function checkModelStatus() {
  const modelName = modelSelect.value;
  try {
    modelStatus.textContent = 'Checking model status...';
    modelStatus.style.color = 'var(--muted)';
    
    // Check IndexedDB for cached model
    const dbName = 'webllm';
    const request = indexedDB.open(dbName);
    
    return new Promise((resolve) => {
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['model'], 'readonly');
        const store = transaction.objectStore('model');
        const checkRequest = store.get(modelName);
        
        checkRequest.onsuccess = () => {
          if (checkRequest.result) {
            modelStatus.textContent = `✓ Model "${modelName}" is cached and ready`;
            modelStatus.style.color = 'var(--ok)';
            resolve(true);
          } else {
            modelStatus.textContent = `✗ Model "${modelName}" is not cached. Click "Download & Cache Model" to download it.`;
            modelStatus.style.color = 'var(--error)';
            resolve(false);
          }
        };
        
        checkRequest.onerror = () => {
          modelStatus.textContent = `✗ Model "${modelName}" is not cached. Click "Download & Cache Model" to download it.`;
          modelStatus.style.color = 'var(--error)';
          resolve(false);
        };
      };
      
      request.onerror = () => {
        modelStatus.textContent = `✗ Model "${modelName}" is not cached. Click "Download & Cache Model" to download it.`;
        modelStatus.style.color = 'var(--error)';
        resolve(false);
      };
    });
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
  
  try {
    isModelLoading = true;
    downloadModelBtn.disabled = true;
    downloadModelBtn.textContent = 'Downloading...';
    modelStatus.textContent = `Downloading model "${modelName}"... This may take several minutes.`;
    modelStatus.style.color = 'var(--muted)';
    
    // Load WebLLM if not already loaded
    const EngineClass = await loadWebLLM();
    
    toast(`Starting download of ${modelName}...`, 'info');
    
    // Initialize engine with the selected model
    // WebLLM API: new Engine(model, initProgressCallback)
    const engine = new EngineClass(
      modelName,
      (report) => {
        const progress = report.progress || 0;
        const text = report.text || '';
        modelStatus.textContent = `Downloading: ${(progress * 100).toFixed(1)}% - ${text}`;
        
        if (progress === 1) {
          modelStatus.textContent = `✓ Model "${modelName}" downloaded and cached successfully!`;
          modelStatus.style.color = 'var(--ok)';
        }
      }
    );
    
    // Wait for model to be ready
    await engine.ready;
    
    currentEngine = engine;
    isModelLoading = false;
    downloadModelBtn.disabled = false;
    downloadModelBtn.textContent = 'Download & Cache Model';
    
    toast('Model downloaded and cached successfully!', 'success');
    modelStatus.textContent = `✓ Model "${modelName}" is ready to use`;
    modelStatus.style.color = 'var(--ok)';
    
  } catch (e) {
    isModelLoading = false;
    downloadModelBtn.disabled = false;
    downloadModelBtn.textContent = 'Download & Cache Model';
    
    const errorMsg = e.message || 'Unknown error';
    toast(`Failed to download model: ${errorMsg}`, 'error');
    modelStatus.textContent = `✗ Error: ${errorMsg}`;
    modelStatus.style.color = 'var(--error)';
    
    if (errorMsg.includes('quota') || errorMsg.includes('storage') || errorMsg.includes('space')) {
      modelStatus.textContent += '\n\n⚠️ Your browser cache may be full. Try increasing your browser cache size (see instructions above).';
    }
    
    console.error('Model download error:', e);
  }
}

// Initialize engine (load from cache or download)
async function initializeEngine() {
  if (currentEngine) {
    return currentEngine;
  }
  
  const modelName = modelSelect.value;
  
  try {
    const EngineClass = await loadWebLLM();
    
    toast('Loading model from cache...', 'info');
    
    const engine = new EngineClass(
      modelName,
      (report) => {
        const progress = report.progress || 0;
        const text = report.text || '';
        if (progress < 1) {
          modelStatus.textContent = `Loading: ${(progress * 100).toFixed(1)}% - ${text}`;
        }
      }
    );
    
    // Wait for model to be ready
    await engine.ready;
    currentEngine = engine;
    
    toast('Model loaded successfully!', 'success');
    modelStatus.textContent = `✓ Model "${modelName}" is ready`;
    modelStatus.style.color = 'var(--ok)';
    
    return engine;
  } catch (e) {
    const errorMsg = e.message || 'Unknown error';
    toast(`Failed to load model: ${errorMsg}`, 'error');
    modelStatus.textContent = `✗ Error loading model: ${errorMsg}`;
    modelStatus.style.color = 'var(--error)';
    
    if (errorMsg.includes('not found') || errorMsg.includes('cache')) {
      modelStatus.textContent += '\n\nClick "Download & Cache Model" to download it.';
    }
    
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
    // WebLLM uses a different API: engine.chat() returns a generator
    let generatedText = '';
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
      temperature: 0.3, // Lower temperature for more consistent output
      max_tokens: 200
    });
    
    // Handle streaming response if needed
    if (response && typeof response === 'object' && 'choices' in response) {
      generatedText = response.choices[0].message.content.trim();
    } else if (typeof response === 'string') {
      generatedText = response.trim();
    } else {
      // Handle async generator
      for await (const chunk of response) {
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
          generatedText += chunk.choices[0].delta.content || '';
        }
      }
      generatedText = generatedText.trim();
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

// Event listeners
on(downloadModelBtn, 'click', downloadModel);
on(checkModelBtn, 'click', checkModelStatus);
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
  modelStatus.textContent = 'Model changed. Click "Check Model Status" to verify cache.';
  modelStatus.style.color = 'var(--muted)';
  
  // Save state
  saveStateWithStorage({
    description: descriptionInput.value,
    model: modelSelect.value,
    output: outputTextarea.value,
    explanation: explanationPre.textContent
  }, storageKey);
});

// Check model status on load
checkModelStatus();

