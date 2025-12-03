// AI Text Detector Tool
// Uses Transformers.js for AI-generated text detection
// Transformers.js handles tokenization automatically and works with models from Hugging Face

import { toast, on, qs } from '/js/ui.js';

// Model configuration for Transformers.js
// Models are hosted at localhost:5000
const MODEL_CONFIG = {
  name: 'AI Text Detector',
  // Use local model hosted at localhost:5000
  // The model should be accessible at: http://localhost:5000/roberta-base-openai-detector/
  // Model structure: config.json, tokenizer.json, onnx/model.onnx (or model_quantized.onnx)
  localModelPath: 'http://localhost:5000',
  // Try local model first - it has all required files (config, tokenizer, ONNX model)
  models: [
    'http://localhost:5000/roberta-base-openai-detector' // Local converted ONNX model
  ],
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
let pipeline = null;
let isModelLoading = false;
let currentModelName = null;

// Load Transformers.js library
async function loadTransformers() {
  if (window.pipeline) {
    console.log('Using cached Transformers.js pipeline');
    return window.pipeline;
  }
  
  try {
    // Load Transformers.js from CDN using dynamic import
    if (!window.transformers) {
      console.log('Loading Transformers.js from CDN...');
      modelStatus.textContent = 'Loading Transformers.js (this may take 10-30 seconds)...';
      
      // Add timeout to detect if import hangs
      const importPromise = import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transformers.js import timed out after 60 seconds')), 60000)
      );
      
      const transformersModule = await Promise.race([importPromise, timeoutPromise]);
      const { pipeline, env } = transformersModule;
      
      // Store globally for reuse
      window.pipeline = pipeline;
      window.transformersEnv = env;
      window.transformers = { pipeline, env };
      
      console.log('✓ Transformers.js loaded successfully');
      console.log('Pipeline type:', typeof pipeline);
    }
    
    if (!window.pipeline) {
      throw new Error('Pipeline function not available');
    }
    
    return window.pipeline;
  } catch (error) {
    console.error('Failed to load Transformers.js:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Failed to load Transformers.js: ${error.message}. Please check your internet connection and try again.`);
  }
}

// Load model using Transformers.js
async function loadModel() {
  if (pipeline) return pipeline;
  if (isModelLoading) {
    toast('Model is already loading...', 'info');
    return null;
  }
  
  try {
    isModelLoading = true;
    modelStatus.textContent = 'Loading Transformers.js library...';
    console.log('Starting model load...');
    
    const pipelineFn = await loadTransformers();
    console.log('Transformers.js loaded, pipeline function:', typeof pipelineFn);
    
    // Configure Transformers.js to use local cache and local models
    if (window.transformersEnv) {
      window.transformersEnv.allowLocalModels = true;
      window.transformersEnv.allowRemoteModels = true;
      
      // Set local model path if specified
      if (MODEL_CONFIG.localModelPath) {
        // Transformers.js will use this as the base path for local models
        window.transformersEnv.localModelPath = MODEL_CONFIG.localModelPath;
        console.log('Using local model path:', MODEL_CONFIG.localModelPath);
      }
      
      console.log('Transformers.js environment configured');
    } else {
      console.warn('transformersEnv not available');
    }
    
    // Try each model in order
    let lastError = null;
    for (const modelName of MODEL_CONFIG.models) {
      try {
        modelStatus.textContent = `Loading model: ${modelName}...`;
        progressContainer.style.display = 'block';
        progressFill.style.width = '10%';
        progressText.textContent = `Initializing ${modelName}...`;
        
        console.log(`Trying to load model: ${modelName}`);
        
        // Create text classification pipeline
        // Transformers.js will handle tokenization and model loading automatically
        // Use regular model format (PyTorch/Safetensors) - don't force ONNX
        console.log(`Creating pipeline for ${modelName}...`);
        pipeline = await pipelineFn(
          'text-classification',
          modelName,
          {
            // Don't specify quantized/ONNX - let Transformers.js use whatever format is available
            device: 'cpu', // Use CPU (WASM backend)
            progress_callback: (progress) => {
              console.log('Progress:', progress);
              if (progress.status === 'progress' && progress.progress !== undefined) {
                const percent = Math.round(progress.progress * 100);
                progressFill.style.width = `${10 + (percent * 0.9)}%`; // 10-100%
                progressText.textContent = `Downloading ${modelName}: ${percent}%`;
              } else if (progress.status) {
                progressText.textContent = `${progress.status}...`;
                console.log(`Status: ${progress.status}`);
              }
            }
          }
        );
        console.log(`Pipeline created for ${modelName}`);
        
        currentModelName = modelName;
        progressContainer.style.display = 'none';
        modelStatus.textContent = `Model loaded: ${modelName}`;
        modelStatus.style.color = 'var(--ok)';
        console.log(`✓ Successfully loaded model: ${modelName}`);
        
        isModelLoading = false;
        return pipeline;
      } catch (error) {
        console.warn(`✗ Failed to load ${modelName}:`, error.message);
        lastError = error;
        continue; // Try next model
      }
    }
    
    throw new Error(`Failed to load any model. Last error: ${lastError?.message || 'Unknown error'}`);
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

// Detect AI in text using Transformers.js
async function detectAI(text) {
  if (!text || !text.trim()) {
    toast('Please enter some text to analyze', 'info');
    return;
  }
  
  try {
    detectBtn.disabled = true;
    detectBtn.textContent = 'Analyzing...';
    
    // Load model if needed
    const classifier = await loadModel();
    if (!classifier) {
      detectBtn.disabled = false;
      detectBtn.textContent = 'Detect AI';
      return;
    }
    
    modelStatus.textContent = 'Running inference...';
    
    // Transformers.js handles tokenization and inference automatically
    // The pipeline returns an array of classification results
    const results = await classifier(text);
    
    console.log('Model results:', results);
    
    // Transformers.js text-classification returns an array like:
    // [{ label: 'LABEL_0', score: 0.95 }, { label: 'LABEL_1', score: 0.05 }]
    // or sometimes: [{ label: 'AI-generated', score: 0.95 }]
    
    let aiProbability = 0.5;
    let humanProbability = 0.5;
    
    if (Array.isArray(results) && results.length > 0) {
      // Find the AI label - could be 'LABEL_1', 'AI-generated', 'AI', etc.
      const aiResult = results.find(r => 
        r.label && (
          r.label.toLowerCase().includes('ai') || 
          r.label.toLowerCase().includes('generated') ||
          r.label === 'LABEL_1' ||
          r.label === '1'
        )
      );
      
      const humanResult = results.find(r => 
        r.label && (
          r.label.toLowerCase().includes('human') || 
          r.label.toLowerCase().includes('written') ||
          r.label === 'LABEL_0' ||
          r.label === '0'
        )
      );
      
      if (aiResult) {
        aiProbability = aiResult.score;
        humanProbability = 1 - aiProbability;
        console.log(`Found AI label: ${aiResult.label}, score: ${aiResult.score}`);
      } else if (humanResult) {
        humanProbability = humanResult.score;
        aiProbability = 1 - humanProbability;
        console.log(`Found Human label: ${humanResult.label}, score: ${humanResult.score}`);
      } else {
        // Fallback: use first result or highest score
        const firstResult = results[0];
        if (firstResult.label === 'LABEL_0' || firstResult.label === '0') {
          humanProbability = firstResult.score;
          aiProbability = 1 - humanProbability;
        } else {
          aiProbability = firstResult.score;
          humanProbability = 1 - aiProbability;
        }
        console.log(`Using first result: ${firstResult.label}, score: ${firstResult.score}`);
      }
    } else if (results && results.label && results.score) {
      // Single result object
      if (results.label.toLowerCase().includes('ai') || results.label.toLowerCase().includes('generated')) {
        aiProbability = results.score;
        humanProbability = 1 - aiProbability;
      } else {
        humanProbability = results.score;
        aiProbability = 1 - humanProbability;
      }
      console.log(`Single result: ${results.label}, score: ${results.score}`);
    }
    
    console.log('Final AI probability:', aiProbability);
    console.log('Final human probability:', humanProbability);
    
    // Display results
    displayResults(aiProbability, humanProbability, text);
    
    detectBtn.disabled = false;
    detectBtn.textContent = 'Detect AI';
    modelStatus.textContent = 'Analysis complete!';
    
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
function displayResults(aiProb, humanProb, originalText) {
  resultPlaceholder.style.display = 'none';
  resultBox.style.display = 'block';
  
  const confidence = Math.max(aiProb, humanProb);
  const isAI = aiProb > humanProb;
  
  // Update result box styling
  resultBox.className = 'result-box';
  if (confidence > 0.7) {
    resultBox.classList.add(isAI ? 'ai' : 'human');
  } else {
    resultBox.classList.add('uncertain');
  }
  
  // Update title
  if (confidence > 0.7) {
    resultTitle.textContent = isAI ? '🤖 Likely AI-Generated' : '👤 Likely Human-Written';
  } else {
    resultTitle.textContent = '❓ Uncertain';
  }
  
  // Update confidence bar
  const fillPercent = isAI ? aiProb * 100 : humanProb * 100;
  confidenceFill.style.width = `${fillPercent}%`;
  confidenceFill.className = `confidence-fill ${isAI ? 'ai' : 'human'}`;
  confidenceFill.textContent = `${Math.round(fillPercent)}%`;
  
  // Update description
  if (confidence > 0.7) {
    resultDescription.textContent = isAI
      ? `This text appears to be AI-generated with ${Math.round(aiProb * 100)}% confidence.`
      : `This text appears to be human-written with ${Math.round(humanProb * 100)}% confidence.`;
  } else {
    resultDescription.textContent = `The model is uncertain about this text. Confidence: ${Math.round(confidence * 100)}%`;
  }
  
  // Update details
  resultDetails.innerHTML = `
    <strong>Detailed Results:</strong><br>
    AI Probability: ${(aiProb * 100).toFixed(1)}%<br>
    Human Probability: ${(humanProb * 100).toFixed(1)}%<br>
    Confidence: ${(confidence * 100).toFixed(1)}%<br>
    Model: ${currentModelName || 'Unknown'}<br><br>
    <em>Note: These results are probabilistic and should be used as a guide, not absolute truth.</em>
  `;
}

// File upload handling
on(fileUploadArea, 'click', () => fileInput.click());

on(fileInput, 'change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.type !== 'text/plain' && !file.name.match(/\.(txt|md|markdown)$/i)) {
    toast('Please select a text file', 'error');
    return;
  }
  
  try {
    const text = await file.text();
    textInput.value = text;
    fileInfo.textContent = `Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    toast('File loaded successfully', 'success');
  } catch (error) {
    toast(`Failed to load file: ${error.message}`, 'error');
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

on(fileUploadArea, 'drop', async (e) => {
  e.preventDefault();
  fileUploadArea.classList.remove('dragover');
  
  const file = e.dataTransfer.files[0];
  if (!file) return;
  
  if (file.type !== 'text/plain' && !file.name.match(/\.(txt|md|markdown)$/i)) {
    toast('Please drop a text file', 'error');
    return;
  }
  
  try {
    const text = await file.text();
    textInput.value = text;
    fileInfo.textContent = `Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    toast('File loaded successfully', 'success');
  } catch (error) {
    toast(`Failed to load file: ${error.message}`, 'error');
  }
});

// Button handlers
on(detectBtn, 'click', () => {
  console.log('Detect button clicked');
  const text = textInput.value.trim();
  console.log('Text length:', text.length);
  if (!text) {
    console.warn('No text provided');
  }
  detectAI(text).catch(err => {
    console.error('Error in detectAI:', err);
  });
});

on(clearBtn, 'click', () => {
  textInput.value = '';
  fileInfo.textContent = '';
  resultBox.style.display = 'none';
  resultPlaceholder.style.display = 'block';
  fileInput.value = '';
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('AI Detector tool initialized with Transformers.js');
});
