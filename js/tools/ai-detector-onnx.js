// AI Text Detector Tool
// Uses ONNX Runtime directly for AI-generated text detection
// Model is hosted at localhost:5000

import { toast, on, qs } from '/js/ui.js';
import { loadONNXRuntime, createInferenceSession, runInference } from '/js/utils/onnx-loader.js';
import { getOrDownloadModel } from '/js/utils/model-cache.js';
import { loadTokenizerFromJSON } from '/js/utils/bpe-tokenizer.js';

// Model configuration
const MODEL_CONFIG = {
  name: 'AI Text Detector (Fakespot RoBERTa)',
  key: 'fakespot-ai-text-detection-v1-onnx',
  // Update these URLs to match your local server paths
  modelUrl: 'http://localhost:5000/fakespot-ai-text-detection-v1-onnx/model.onnx',
  tokenizerUrl: 'http://localhost:5000/fakespot-ai-text-detection-v1-onnx/tokenizer.json',
  // For RoBERTa-style BPE we can still use vocab/merges if needed as fallback
  vocabUrl: 'http://localhost:5000/fakespot-ai-text-detection-v1-onnx/vocab.json',
  mergesUrl: 'http://localhost:5000/fakespot-ai-text-detection-v1-onnx/merges.txt',
  configUrl: 'http://localhost:5000/fakespot-ai-text-detection-v1-onnx/config.json',
  maxLength: 512
};

// DOM elements
const textInput = qs('#text-input');
const fileInput = qs('#file-input');
const fileUploadArea = qs('#file-upload-area');
const fileInfo = qs('#file-info');
const detectBtn = qs('#detect-btn');
const clearBtn = qs('#clear-btn');
const resultBox = qs('#result');
const resultPlaceholder = qs('#result-placeholder');
const resultTitle = qs('#result-title');
const resultDescription = qs('#result-description');
const resultDetails = qs('#result-details');
const confidenceFill = qs('#confidence-fill');
const modelStatus = qs('#model-status');
const progressContainer = qs('#progress-container');
const progressFill = qs('#progress-fill');
const progressText = qs('#progress-text');

// State
let ort = null;
let session = null;
let tokenizer = null;
let vocab = null;
let merges = null;
let config = null;
let isModelLoading = false;

// Load BPE tokenizer using the proper implementation
async function loadTokenizer() {
  if (tokenizer) return tokenizer;
  
  try {
    console.log('Loading BPE tokenizer from tokenizer.json...');
    
    // Use the proper BPE tokenizer implementation
    tokenizer = await loadTokenizerFromJSON(MODEL_CONFIG.tokenizerUrl);
    console.log('✓ BPE Tokenizer loaded successfully');
    
    return tokenizer;
  } catch (error) {
    console.error('Tokenizer loading error:', error);
    
    // Provide helpful error message for CORS
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      const errorMsg = `CORS Error: Your server at localhost:5000 needs to allow cross-origin requests from localhost:4000.

To fix this, run the provided server script:
  python server-with-cors.py

Or if using Python's http.server, you need to add CORS headers manually.
See server-with-cors.py for a complete example.`;
      
      throw new Error(errorMsg);
    }
    
    throw new Error(`Failed to load tokenizer: ${error.message}`);
  }
}

// Tokenize text using the loaded BPE tokenizer
function tokenizeText(text, maxLength = 512) {
  if (!tokenizer) {
    throw new Error('Tokenizer not loaded');
  }
  
  try {
    // Use the BPE tokenizer's encode method
    const tokens = tokenizer.encode(text, maxLength);
    return tokens;
  } catch (error) {
    console.error('Tokenization error:', error);
    throw new Error(`Failed to tokenize text: ${error.message}`);
  }
}

// Load model using ONNX Runtime
async function loadModel() {
  if (session && tokenizer) return { session, tokenizer };
  if (isModelLoading) {
    toast('Model is already loading...', 'info');
    return null;
  }
  
  try {
    isModelLoading = true;
    modelStatus.textContent = 'Loading model...';
    progressContainer.style.display = 'block';
    progressFill.style.width = '10%';
    progressText.textContent = 'Initializing ONNX Runtime...';
    
    // Load ONNX Runtime
    ort = await loadONNXRuntime();
    progressFill.style.width = '20%';
    progressText.textContent = 'Loading tokenizer...';
    
    // Load tokenizer
    await loadTokenizer();
    progressFill.style.width = '40%';
    progressText.textContent = 'Downloading model...';
    
    // Download model
    const modelData = await getOrDownloadModel(
      MODEL_CONFIG.key,
      MODEL_CONFIG.modelUrl,
      (loaded, total) => {
        if (total > 0) {
          const percent = 40 + Math.round((loaded / total) * 50); // 40-90%
          progressFill.style.width = percent + '%';
          const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
          const totalMB = (total / (1024 * 1024)).toFixed(1);
          progressText.textContent = `Downloading model: ${loadedMB} MB / ${totalMB} MB`;
        }
      }
    );
    
    progressFill.style.width = '95%';
    progressText.textContent = 'Creating inference session...';
    
    // Create ONNX session
    session = await createInferenceSession(modelData, {
      executionProviders: ['wasm'] // Use WASM for compatibility
    });
    
    progressFill.style.width = '100%';
    progressText.textContent = 'Model loaded!';
    
    // Load config
    try {
      const configResponse = await fetch(MODEL_CONFIG.configUrl);
      config = await configResponse.json();
    } catch (error) {
      console.warn('Failed to load config:', error);
    }
    
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 500);
    
    modelStatus.textContent = 'Model loaded: RoBERTa-base OpenAI Detector';
    modelStatus.style.color = 'var(--ok)';
    console.log('✓ Model loaded successfully');
    
    isModelLoading = false;
    return { session, tokenizer };
  } catch (error) {
    isModelLoading = false;
    progressContainer.style.display = 'none';
    modelStatus.textContent = `Failed to load model: ${error.message}`;
    modelStatus.style.color = 'var(--error)';
    toast(`Failed to load model: ${error.message}`, 'error');
    console.error('Model loading error:', error);
    return null;
  }
}

// Detect AI in text
async function detectAI(text) {
  if (!text || !text.trim()) {
    toast('Please enter some text to analyze', 'info');
    return;
  }
  
  try {
    detectBtn.disabled = true;
    detectBtn.textContent = 'Analyzing...';
    
    // Load model if needed
    const modelData = await loadModel();
    if (!modelData) {
      detectBtn.disabled = false;
      detectBtn.textContent = 'Detect AI';
      return;
    }
    
    const { session: modelSession } = modelData;
    
    modelStatus.textContent = 'Tokenizing text...';
    
    // Tokenize text using the loaded tokenizer
    const tokens = tokenizeText(text, MODEL_CONFIG.maxLength);
    console.log('Tokenized tokens (first 20):', tokens.slice(0, 20));
    console.log('Token count:', tokens.length);
    console.log('Unique tokens:', new Set(tokens).size);
    console.log('Token distribution:', {
      cls: tokens.filter(t => t === 0).length,
      sep: tokens.filter(t => t === 2).length,
      pad: tokens.filter(t => t === 1).length,
      other: tokens.filter(t => t !== 0 && t !== 1 && t !== 2).length
    });
    
    // Debug: Decode tokens back to see what they represent
    if (tokenizer && tokenizer.vocab) {
      const reverseVocab = {};
      for (const [token, id] of Object.entries(tokenizer.vocab)) {
        reverseVocab[id] = token;
      }
      const sampleTokens = tokens.slice(0, 30).map(id => {
        const token = reverseVocab[id];
        if (token === '<s>') return '[CLS]';
        if (token === '</s>') return '[SEP]';
        if (token === '<pad>') return '[PAD]';
        if (token === '<unk>') return '[UNK]';
        return token || `[${id}]`;
      }).join(' ');
      console.log('First 30 tokens decoded:', sampleTokens);
      console.log('Input text sample:', text.substring(0, 100));
    }
    
    const inputIds = new BigInt64Array(tokens.map(t => BigInt(t)));
    
    // Create attention mask (1 for real tokens, 0 for padding)
    const attentionMask = new BigInt64Array(MODEL_CONFIG.maxLength);
    let maskLength = tokens.findIndex(t => t === 1); // Find first PAD token
    if (maskLength === -1) maskLength = MODEL_CONFIG.maxLength;
    for (let i = 0; i < maskLength; i++) {
      attentionMask[i] = BigInt(1);
    }
    for (let i = maskLength; i < MODEL_CONFIG.maxLength; i++) {
      attentionMask[i] = BigInt(0);
    }
    
    modelStatus.textContent = 'Running inference...';
    
    // Prepare inputs
    const inputs = {
      input_ids: new ort.Tensor('int64', inputIds, [1, MODEL_CONFIG.maxLength]),
      attention_mask: new ort.Tensor('int64', attentionMask, [1, MODEL_CONFIG.maxLength])
    };
    
    // Run inference
    const outputs = await runInference(modelSession, inputs);
    
    console.log('Model outputs:', outputs);
    console.log('Output type:', typeof outputs);
    console.log('Is array:', Array.isArray(outputs));
    if (outputs) {
      console.log('Output keys:', Object.keys(outputs));
      if (Array.isArray(outputs)) {
        console.log('Output length:', outputs.length);
        outputs.forEach((out, i) => {
          console.log(`Output ${i}:`, out, 'type:', typeof out, 'data:', out?.data);
        });
      }
    }
    
    // Get logits (classification scores)
    // ONNX Runtime returns outputs as an array or object
    let logits;
    if (Array.isArray(outputs)) {
      logits = outputs[0]?.data || outputs[0];
    } else if (outputs && typeof outputs === 'object') {
      // Try common output names
      const outputKey = Object.keys(outputs)[0] || 'logits' || 'output';
      logits = outputs[outputKey]?.data || outputs[outputKey];
    } else {
      throw new Error('Unexpected output format from model');
    }
    
    if (!logits) {
      throw new Error('Could not extract logits from model output');
    }
    
    // Convert to array if it's a typed array
    const scores = Array.isArray(logits) ? logits : Array.from(logits);
    
    console.log('Raw logits:', scores);
    console.log('Logits shape/length:', scores.length);
    console.log('Logit values:', scores[0], scores[1]);
    
    // Apply softmax to get probabilities
    const expScores = scores.map(s => Math.exp(s));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = expScores.map(s => s / sumExp);
    
    console.log('Probabilities after softmax:', probabilities);
    console.log('Probability values:', probabilities[0], probabilities[1]);
    
    // For fakespot-ai/roberta-base-ai-text-detection-v1, config.json says:
    // id2label: { "0": "Human", "1": "AI" }
    // label2id: { "AI": 1, "Human": 0 }
    // So: probabilities[0] = Human, probabilities[1] = AI
    
    // BUT - if logits are very similar or the model always outputs the same thing,
    // the tokenizer might be broken. Let's check if logits are identical or very close
    const logitDiff = Math.abs(scores[0] - scores[1]);
    console.log('Logit difference:', logitDiff);
    
    if (logitDiff < 0.1) {
      console.warn('⚠️ WARNING: Logits are very similar - tokenizer might be broken!');
      console.warn('The model is likely receiving invalid or identical tokens.');
    }
    
    const humanProb = probabilities[0];  // Label 0 = Human
    const aiProb = probabilities[1];     // Label 1 = AI
    
    console.log('Interpreted results - AI:', aiProb, 'Human:', humanProb);
    
    // If probabilities are always the same, the tokenizer is definitely broken
    if (Math.abs(aiProb - 0.5) < 0.01 && Math.abs(humanProb - 0.5) < 0.01) {
      console.error('❌ ERROR: Model is outputting equal probabilities for all inputs!');
      console.error('This indicates the tokenizer is broken and producing invalid tokens.');
      toast('Warning: Tokenizer may not be working correctly. Results may be inaccurate.', 'warning');
    }
    
    // Display results
    displayResults(humanProb, aiProb, text);
    
    detectBtn.disabled = false;
    detectBtn.textContent = 'Detect AI';
    modelStatus.textContent = 'Analysis complete';
    
  } catch (error) {
    console.error('Detection error:', error);
    toast(`Detection failed: ${error.message}`, 'error');
    detectBtn.disabled = false;
    detectBtn.textContent = 'Detect AI';
    modelStatus.textContent = `Error: ${error.message}`;
    modelStatus.style.color = 'var(--error)';
  }
}

// Display detection results
function displayResults(humanProb, aiProb, text) {
  const aiPercentage = Math.round(aiProb * 100);
  const humanPercentage = Math.round(humanProb * 100);
  
  // Determine result type
  let resultType = 'uncertain';
  if (aiPercentage >= 70) {
    resultType = 'ai';
  } else if (humanPercentage >= 70) {
    resultType = 'human';
  }
  
  // Update UI
  resultBox.className = `result-box ${resultType}`;
  resultPlaceholder.style.display = 'none';
  resultBox.style.display = 'block';
  
  resultTitle.textContent = resultType === 'ai' 
    ? '🤖 Likely AI-Generated'
    : resultType === 'human'
    ? '✍️ Likely Human-Written'
    : '❓ Uncertain';
  
  resultDescription.textContent = 
    `This text is ${aiPercentage}% likely to be AI-generated and ${humanPercentage}% likely to be human-written.`;
  
  // Update confidence bar
  confidenceFill.style.width = `${aiPercentage}%`;
  confidenceFill.style.backgroundColor = resultType === 'ai' 
    ? 'var(--error)' 
    : resultType === 'human'
    ? 'var(--ok)'
    : 'var(--warning)';
  
  // Show details
  resultDetails.innerHTML = `
    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
      <p style="margin: 0.5rem 0;"><strong>Confidence Scores:</strong></p>
      <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
        <li>AI-Generated: ${aiPercentage}%</li>
        <li>Human-Written: ${humanPercentage}%</li>
      </ul>
      <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-muted);">
        <strong>Note:</strong> AI detection is probabilistic and not 100% accurate. 
        Results should be used as a guide, not definitive proof.
      </p>
    </div>
  `;
}

// Event listeners
on(detectBtn, 'click', () => {
  const text = textInput.value.trim();
  if (!text) {
    toast('Please enter some text to analyze', 'info');
    return;
  }
  detectAI(text);
});

on(clearBtn, 'click', () => {
  textInput.value = '';
  fileInput.value = '';
  fileInfo.textContent = '';
  resultBox.style.display = 'none';
  resultPlaceholder.style.display = 'block';
  resultBox.className = 'result-box';
});

// File input handling
on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'text/plain') {
    const reader = new FileReader();
    reader.onload = (e) => {
      textInput.value = e.target.result;
      fileInfo.textContent = `Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    };
    reader.readAsText(file);
  } else {
    toast('Please select a text file (.txt)', 'error');
  }
});

// Drag and drop
on(fileUploadArea, 'dragover', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = 'var(--accent)';
});

on(fileUploadArea, 'dragleave', () => {
  fileUploadArea.style.borderColor = 'var(--border)';
});

on(fileUploadArea, 'drop', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = 'var(--border)';
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'text/plain') {
    fileInput.files = e.dataTransfer.files;
    const reader = new FileReader();
    reader.onload = (e) => {
      textInput.value = e.target.result;
      fileInfo.textContent = `Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    };
    reader.readAsText(file);
  } else {
    toast('Please drop a text file (.txt)', 'error');
  }
});

// Initialize
console.log('AI Detector tool initialized with ONNX Runtime');

