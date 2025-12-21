// Image Caption Generator Tool
// Uses Transformers.js with vit-gpt2-image-captioning model
// Model: https://huggingface.co/Xenova/vit-gpt2-image-captioning

import { toast, on, qs } from '/js/ui.js';

// DOM elements
const fileInput = qs('#file-input');
const fileUploadArea = qs('#file-upload-area');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const modelStatus = qs('#model-status');
const generateBtn = qs('#generate-btn');
const clearBtn = qs('#clear-btn');
const output = qs('#output');
const outputPlaceholder = qs('#output-placeholder');
const captionResult = qs('#caption-result');
const captionText = qs('#caption-text');
const copyBtn = qs('#copy-btn');
const progressContainer = qs('#progress-container');
const progressText = qs('#progress-text');
const progressPercent = qs('#progress-percent');
const progressBar = qs('#progress-bar');

// State
let pipeline = null;
let isModelLoading = false;
let currentImage = null;

// Model configuration
const MODEL_NAME = 'Xenova/vit-gpt2-image-captioning';

// Progress helpers
function updateProgress(text, percent) {
  if (progressText) progressText.textContent = text || 'Processing...';
  
  let validPercent = 0;
  if (typeof percent === 'number' && isFinite(percent)) {
    validPercent = Math.max(0, Math.min(100, percent));
  }
  
  if (progressPercent) progressPercent.textContent = `${Math.round(validPercent)}%`;
  if (progressBar) progressBar.value = validPercent;
  if (progressContainer) progressContainer.style.display = 'block';
}

function hideProgress() {
  if (progressContainer) progressContainer.style.display = 'none';
}

// Load Transformers.js library
async function loadTransformers() {
  if (window.pipeline) {
    console.log('[Image Caption] Using cached Transformers.js pipeline');
    return window.pipeline;
  }
  
  try {
    if (!window.transformers) {
      console.log('[Image Caption] Loading Transformers.js from CDN...');
      modelStatus.textContent = 'Loading Transformers.js library...';
      
      const importPromise = import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transformers.js import timed out after 60 seconds')), 60000)
      );
      
      const transformersModule = await Promise.race([importPromise, timeoutPromise]);
      const { pipeline, env } = transformersModule;
      
      // Store globally for reuse
      window.pipeline = pipeline;
      window.transformersEnv = env;
      window.transformers = { pipeline, env };
      
      console.log('[Image Caption] ✓ Transformers.js loaded successfully');
    }
    
    if (!window.pipeline) {
      throw new Error('Pipeline function not available');
    }
    
    return window.pipeline;
  } catch (error) {
    console.error('[Image Caption] Failed to load Transformers.js:', error);
    throw new Error(`Failed to load Transformers.js: ${error.message}`);
  }
}

// Load image-to-text model
async function loadModel() {
  if (pipeline) return pipeline;
  if (isModelLoading) {
    toast('Model is already loading...', 'info');
    return null;
  }
  
  try {
    isModelLoading = true;
    modelStatus.textContent = 'Loading Transformers.js library...';
    console.log('[Image Caption] Starting model load...');
    
    const pipelineFn = await loadTransformers();
    console.log('[Image Caption] Transformers.js loaded');
    
    // Configure Transformers.js environment
    if (window.transformersEnv) {
      window.transformersEnv.allowLocalModels = true;
      window.transformersEnv.allowRemoteModels = true;
      console.log('[Image Caption] Transformers.js environment configured');
    }
    
    modelStatus.textContent = `Loading model: ${MODEL_NAME}...`;
    updateProgress('Initializing model...', 10);
    
    console.log(`[Image Caption] Creating image-to-text pipeline for ${MODEL_NAME}...`);
    
    // Create image-to-text pipeline
    pipeline = await pipelineFn(
      'image-to-text',
      MODEL_NAME,
      {
        device: 'cpu', // Use CPU (WASM backend)
        progress_callback: (progress) => {
          console.log('[Image Caption] Progress:', progress);
          if (progress.status === 'progress' && progress.progress !== undefined) {
            const percent = Math.round(progress.progress * 100);
            updateProgress(`Downloading model: ${percent}%`, 10 + (percent * 0.8)); // 10-90%
          } else if (progress.status) {
            updateProgress(`${progress.status}...`, 50);
            console.log(`[Image Caption] Status: ${progress.status}`);
          }
        }
      }
    );
    
    console.log(`[Image Caption] ✓ Successfully loaded model: ${MODEL_NAME}`);
    
    hideProgress();
    modelStatus.textContent = `Model loaded: ${MODEL_NAME}`;
    modelStatus.style.color = 'var(--ok)';
    
    isModelLoading = false;
    return pipeline;
  } catch (error) {
    isModelLoading = false;
    hideProgress();
    modelStatus.textContent = `Failed to load model: ${error.message}`;
    modelStatus.style.color = 'var(--error)';
    toast(`Failed to load model: ${error.message}`, 'error');
    console.error('[Image Caption] Model loading error:', error);
    return null;
  }
}

// Generate caption for image
async function generateCaption() {
  if (!currentImage) {
    toast('Please upload an image first', 'error');
    return;
  }
  
  if (!pipeline) {
    toast('Model is not loaded. Please wait...', 'info');
    return;
  }
  
  try {
    generateBtn.disabled = true;
    outputPlaceholder.style.display = 'none';
    captionResult.style.display = 'none';
    updateProgress('Generating caption...', 0);
    
    console.log('[Image Caption] Generating caption for image...');
    
    // Ensure we have a valid image
    if (!previewImg || !previewImg.src || previewImg.src === '') {
      throw new Error('No image loaded');
    }
    
    // Ensure image is fully loaded
    if (!previewImg.complete) {
      await new Promise((resolve, reject) => {
        previewImg.onload = resolve;
        previewImg.onerror = reject;
      });
    }
    
    // Transformers.js image-to-text pipeline accepts:
    // - Image URL (string) 
    // - HTMLImageElement
    // - HTMLCanvasElement
    // - Blob URL
    
    // Try multiple approaches - start with the HTMLImageElement directly
    // If that doesn't work, try the image source URL
    let imageInput = previewImg;
    
    // If it's a data URL, try converting to Blob URL for better compatibility
    if (previewImg.src.startsWith('data:')) {
      try {
        const response = await fetch(previewImg.src);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        imageInput = blobUrl;
        console.log('[Image Caption] Converted data URL to Blob URL');
      } catch (error) {
        console.warn('[Image Caption] Failed to convert to Blob URL, using image element:', error);
        // Fall back to using the image element
        imageInput = previewImg;
      }
    }
    
    console.log('[Image Caption] Using image input type:', typeof imageInput === 'string' ? 'URL string' : imageInput.constructor.name);
    
    // Generate caption using the pipeline
    const result = await pipeline(imageInput);
    
    console.log('[Image Caption] Caption generated:', result);
    
    // Extract caption text
    let caption = '';
    if (Array.isArray(result) && result.length > 0) {
      // Result is an array of objects with 'generated_text' property
      caption = result[0].generated_text || result[0].text || '';
    } else if (result.generated_text) {
      caption = result.generated_text;
    } else if (result.text) {
      caption = result.text;
    } else if (typeof result === 'string') {
      caption = result;
    }
    
    if (!caption) {
      throw new Error('Failed to generate caption');
    }
    
    // Display caption
    captionText.textContent = caption;
    captionResult.style.display = 'block';
    hideProgress();
    
    toast('Caption generated successfully!', 'success');
    console.log('[Image Caption] Caption:', caption);
  } catch (error) {
    console.error('[Image Caption] Caption generation error:', error);
    hideProgress();
    toast(`Failed to generate caption: ${error.message}`, 'error');
    outputPlaceholder.style.display = 'block';
    outputPlaceholder.textContent = `Error: ${error.message}`;
  } finally {
    generateBtn.disabled = false;
  }
}

// Handle file input
function handleFileSelect(file) {
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast('Please upload an image file (JPG, PNG, GIF, or WebP)', 'error');
    return;
  }
  
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast('Image file is too large. Please use an image smaller than 10MB', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      previewImg.src = e.target.result;
      imagePreview.style.display = 'block';
      generateBtn.disabled = false;
      
      // Auto-load model if not loaded
      if (!pipeline && !isModelLoading) {
        loadModel().then(() => {
          if (pipeline) {
            toast('Model loaded. Click "Generate Caption" to continue.', 'success');
          }
        });
      }
    };
    img.onerror = () => {
      toast('Failed to load image', 'error');
    };
    img.src = e.target.result;
  };
  reader.onerror = () => {
    toast('Failed to read file', 'error');
  };
  reader.readAsDataURL(file);
}

// Clear everything
function clearAll() {
  fileInput.value = '';
  currentImage = null;
  imagePreview.style.display = 'none';
  previewImg.src = '';
  generateBtn.disabled = true;
  outputPlaceholder.style.display = 'block';
  outputPlaceholder.textContent = 'Upload an image and click "Generate Caption" to get a description';
  captionResult.style.display = 'none';
  hideProgress();
}

// Copy caption to clipboard
async function copyCaption() {
  const text = captionText.textContent;
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    toast('Caption copied to clipboard!', 'success');
  } catch (error) {
    console.error('Failed to copy:', error);
    toast('Failed to copy caption', 'error');
  }
}

// Event listeners
on(fileUploadArea, 'click', () => fileInput.click());

on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFileSelect(file);
  }
});

// Drag and drop
on(fileUploadArea, 'dragover', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = 'var(--primary)';
  fileUploadArea.style.background = 'var(--bg)';
});

on(fileUploadArea, 'dragleave', () => {
  fileUploadArea.style.borderColor = 'var(--border)';
  fileUploadArea.style.background = 'var(--bg-elev)';
});

on(fileUploadArea, 'drop', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = 'var(--border)';
  fileUploadArea.style.background = 'var(--bg-elev)';
  
  const file = e.dataTransfer.files[0];
  if (file) {
    fileInput.files = e.dataTransfer.files;
    handleFileSelect(file);
  }
});

on(generateBtn, 'click', generateCaption);
on(clearBtn, 'click', clearAll);
on(copyBtn, 'click', copyCaption);

// Auto-load model on page load (optional - can be lazy loaded)
// Uncomment to preload model:
// loadModel().catch(err => console.log('Model will be loaded on first use:', err));

