// Image Enhancement Tool
// Uses ONNX models for AI-powered image enhancement

console.log('🚀 image-enhance.js script loading...');

import { toast, on, qs, downloadFile } from '/js/ui.js';
import { loadONNXRuntime, createInferenceSession } from '/js/utils/onnx-loader.js';
import { getOrDownloadModel, getCacheStats, formatBytes, deleteCachedModel } from '/js/utils/model-cache.js';
import { loadImage, processImageWithModel, resizeImage, canvasToBlob } from '/js/utils/image-processor.js';

// Model configurations
// Note: Model URLs need to be updated with actual ONNX model files
// Models can be:
// 1. Self-hosted in /models/ directory
// 2. Hosted on CDN (Hugging Face, GitHub Releases, etc.)
// 3. Converted from PyTorch/TensorFlow to ONNX format

const MODEL_CONFIGS = {
  upscale: {
    name: 'Real-ESRGAN Upscaling',
    key: 'realesrgan-x4plus-v1',
    url: 'http://localhost:3000/Real-ESRGAN-x4plus.onnx', // Local server
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 4,
    description: 'Upscale images by 4x with AI-powered super-resolution',
    requiresSetup: false
  },
  enhance: {
    name: 'Image Enhancement',
    key: 'image-enhance-v1',
    url: 'http://localhost:3000/Real-ESRGAN-x4plus.onnx', // Local server - can reuse Real-ESRGAN
    // Real-ESRGAN also works for general enhancement
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 1,
    description: 'Enhance image quality, reduce noise, and improve details',
    requiresSetup: false
  },
  restore: {
    name: 'Face Restoration (GFPGAN)',
    key: 'gfpgan-v1',
    url: '/models/gfpgan/GFPGANv1.3.onnx', // Requires local hosting
    // To use: Download and convert GFPGAN model, place in /models/gfpgan/
    // Source: https://github.com/TencentARC/GFPGAN
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 1,
    description: 'Restore and enhance faces in old or damaged photos',
    requiresSetup: true
  },
  colorize: {
    name: 'Image Colorization (DDColor)',
    key: 'ddcolor-modelscope-v1',
    url: 'http://localhost:3000/ddcolor_modelscope.onnx', // DDColor ModelScope model
    // Model: DDColor ModelScope
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 1,
    description: 'Add realistic color to black and white photographs',
    requiresSetup: false,
    inputSize: 512 // This model expects 512x512 input
  },
  deoldify: {
    name: 'Photo Restoration & Colorization (DeOldify)',
    key: 'deoldify-art-v1',
    url: 'http://localhost:5000/deoldify_backbone-lite/onnx/deoldify-art.onnx', // DeOldify model (same port as AI detector)
    // Model: DeOldify Artistic (backbone-lite variant)
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 1,
    description: 'Restore and colorize old black and white photographs with high-quality AI',
    requiresSetup: false,
    // DeOldify expects grayscale input (converted to RGB) and uses YUV post-processing
    // DeOldify uses ImageNet normalization stats (not [0.5, 0.5, 0.5])
    mean: [0.485, 0.456, 0.406], // ImageNet mean
    std: [0.229, 0.224, 0.225],   // ImageNet std
    useYUVPostProcessing: true // Use YUV post-processing to preserve original colors (no colorization)
  },
  style: {
    name: 'Style Transfer',
    key: 'style-transfer-mosaic-v1',
    // Pre-converted ONNX model from ONNX Model Zoo
    // Download from: https://github.com/onnx/models/raw/main/vision/style_transfer/fast_neural_style/model/mosaic-9.onnx
    // Place in: /models/style-transfer/mosaic-9.onnx
    url: '/models/style-transfer/mosaic-9.onnx',
    // Other available styles (download and place in same directory):
    // - rain-princess-9.onnx
    // - candy-9.onnx  
    // - udnie-9.onnx
    // Note: GitHub raw URLs have CORS issues, so models must be hosted locally
    inputName: 'input1',
    outputName: 'add_37',
    scaleFactor: 1,
    description: 'Apply artistic styles to your images',
    requiresSetup: true // Easy setup: Download pre-converted ONNX model and place in /models/style-transfer/
  },
  super_resolution: {
    name: 'Super Resolution',
    key: 'super-resolution-v1',
    url: 'http://localhost:3000/animesr.onnx', // Local server
    inputName: 'input', // Will be auto-detected if different
    outputName: 'output', // Will be auto-detected if different
    scaleFactor: 4,
    description: 'Upscale images with super resolution AI',
    requiresSetup: false,
    inputSize: 512, // This model expects 512x512
    grayscale: false // This model expects RGB (3 channels)
  }
};

// DOM elements
const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const enhanceBtn = qs('#enhance');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const modelSelect = qs('#model-select');
const scaleFactorSelect = qs('#scale-factor');
const scaleFactorGroup = qs('#scale-factor-group');
const strengthSlider = qs('#strength');
const strengthValue = qs('#strength-value');
const strengthGroup = qs('#strength-group');
const modelStatus = qs('#model-status');
const progressContainer = qs('#progress-container');
const progressText = qs('#progress-text');
const progressPercent = qs('#progress-percent');
const progressBar = qs('#progress-bar');
const clearModelCacheBtn = qs('#clear-model-cache');
const cachedModelsContainer = qs('#cached-models-container');
const refreshCacheListBtn = qs('#refresh-cache-list');
const debugStatus = qs('#debug-status');
const debugText = qs('#debug-text');

// Debug: Log all DOM elements
console.log('🔍 DOM elements found:');
console.log('  modelSelect:', modelSelect);
console.log('  enhanceBtn:', enhanceBtn);
console.log('  fileInput:', fileInput);

// Show debug info on page
if (debugStatus && debugText) {
  debugStatus.style.display = 'block';
  debugText.textContent = `Script loaded. Model select: ${modelSelect ? 'found' : 'NOT FOUND'}`;
}

if (!modelSelect) {
  console.error('❌ CRITICAL ERROR: modelSelect (#model-select) not found in DOM!');
  if (debugText) {
    debugText.textContent = 'ERROR: Model select element not found!';
    debugText.style.color = 'red';
  }
}

// State
let currentFile = null;
let currentImage = null;
let currentSession = null;
let currentModelConfig = null;
let enhancedBlob = null;

// Initialize ONNX Runtime
let ort = null;
async function initONNX() {
  if (ort) return ort;
  try {
    ort = await loadONNXRuntime();
    return ort;
  } catch (error) {
    toast(`Failed to load ONNX Runtime: ${error.message}`, 'error');
    throw error;
  }
}

// Update UI based on model selection
if (modelSelect) {
  on(modelSelect, 'change', () => {
    const modelType = modelSelect.value;
    console.log('🔵 Model selection changed to:', modelType);
    console.log('🔵 Available configs:', Object.keys(MODEL_CONFIGS));
    console.log('🔵 Config for', modelType, ':', MODEL_CONFIGS[modelType]);
    
    if (!modelType || !MODEL_CONFIGS[modelType]) {
      console.error('❌ Invalid model type:', modelType, 'Available models:', Object.keys(MODEL_CONFIGS));
      toast('Invalid model selection. Please select a valid enhancement type.', 'error');
      return;
    }
    
    currentModelConfig = MODEL_CONFIGS[modelType];
    console.log('✅ Current model config set to:', currentModelConfig?.name);
    console.log('✅ Full config:', currentModelConfig);
  
  // Show/hide scale factor for upscaling
  scaleFactorGroup.style.display = (modelType === 'upscale' || modelType === 'enhance' || modelType === 'super_resolution') ? 'flex' : 'none';
  
  // Show/hide strength for style transfer
  strengthGroup.style.display = (modelType === 'style') ? 'flex' : 'none';
  
  // Reset session when model changes
  currentSession = null;
  
  // Update status
  updateModelStatus();
  
  // Enable enhance button if image is already loaded
  if (currentImage && currentModelConfig) {
    enhanceBtn.disabled = false;
    if (outputArea) {
      outputArea.innerHTML = '<p>Ready to enhance</p>';
    }
  } else if (currentImage && !currentModelConfig) {
    enhanceBtn.disabled = true;
    if (outputArea) {
      outputArea.innerHTML = '<p>Please select an enhancement type</p>';
    }
  }
  });
} else {
  console.error('CRITICAL: modelSelect element not found, cannot attach change handler!');
}

// Strength slider
on(strengthSlider, 'input', (e) => {
  strengthValue.textContent = Math.round(e.target.value * 100) + '%';
});

// Clear model cache for the currently selected model
if (clearModelCacheBtn) {
  on(clearModelCacheBtn, 'click', async () => {
    if (!currentModelConfig) {
      toast('No model selected to clear', 'error');
      return;
    }

    try {
      // Clear cached model file (if present)
      await deleteCachedModel(currentModelConfig.key);
      currentSession = null;
      toast(`Cleared cache for ${currentModelConfig.name}`, 'success');
      await updateModelStatus();
      await updateCachedModelsList(); // Refresh the list
    } catch (error) {
      console.error('Failed to clear model cache:', error);
      toast(`Failed to clear model cache: ${error.message}`, 'error');
    }
  });
}

// Refresh cache list button
if (refreshCacheListBtn) {
  on(refreshCacheListBtn, 'click', async () => {
    await updateCachedModelsList();
  });
}

// Update cached models list
async function updateCachedModelsList() {
  if (!cachedModelsContainer) {
    console.warn('cachedModelsContainer not found');
    return;
  }
  
  try {
    // Set loading state
    cachedModelsContainer.innerHTML = '<p style="margin: 0; color: var(--muted);">Loading cached models...</p>';
    
    // Add timeout to prevent hanging
    const stats = await Promise.race([
      getCacheStats(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading cache stats')), 5000))
    ]);
    
    if (!stats || !stats.models || stats.models.length === 0) {
      cachedModelsContainer.innerHTML = '<p style="margin: 0; color: var(--muted);">No models cached</p>';
      return;
    }
    
    // Sort by timestamp (newest first)
    const sortedModels = stats.models.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
    html += `<p style="margin: 0 0 0.5rem 0; color: var(--text-subtle); font-size: 0.875rem;">
      <strong>Total:</strong> ${stats.modelCount} model(s) - ${formatBytes(stats.totalSize)}
    </p>`;
    
    sortedModels.forEach(model => {
      const date = new Date(model.timestamp || 0);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      const modelName = Object.values(MODEL_CONFIGS).find(m => m.key === model.key)?.name || model.key;
      
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--bg); border: 1px solid var(--border); border-radius: 4px;">
          <div style="flex: 1;">
            <div style="font-weight: 500; margin-bottom: 0.25rem;">${modelName}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle);">
              ${formatBytes(model.size || 0)} • ${dateStr}
            </div>
            ${model.url ? `<div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem; word-break: break-all;">${model.url}</div>` : ''}
          </div>
          <button class="secondary" data-model-key="${model.key}" style="margin-left: 0.75rem; padding: 0.5rem 1rem; font-size: 0.875rem;">
            Delete
          </button>
        </div>
      `;
    });
    
    html += '</div>';
    cachedModelsContainer.innerHTML = html;
    
    // Add click handlers for delete buttons
    cachedModelsContainer.querySelectorAll('button[data-model-key]').forEach(btn => {
      const modelKey = btn.getAttribute('data-model-key');
      btn.addEventListener('click', async () => {
        const modelName = Object.values(MODEL_CONFIGS).find(m => m.key === modelKey)?.name || modelKey;
        if (!confirm(`Delete cached model "${modelName}"?`)) {
          return;
        }
        
        try {
          await deleteCachedModel(modelKey);
          toast('Model deleted from cache', 'success');
          await updateCachedModelsList();
          // If it was the current model, clear the session
          if (currentModelConfig && currentModelConfig.key === modelKey) {
            currentSession = null;
            await updateModelStatus();
          }
        } catch (error) {
          console.error('Failed to delete model:', error);
          toast(`Failed to delete model: ${error.message}`, 'error');
        }
      });
    });
  } catch (error) {
    console.error('Failed to update cached models list:', error);
    if (cachedModelsContainer) {
      cachedModelsContainer.innerHTML = `<p style="margin: 0; color: var(--error);">Failed to load cached models: ${error.message}</p>`;
    }
  }
}

// Check model status
async function updateModelStatus() {
  if (!currentModelConfig) return;
  
  try {
    const stats = await getCacheStats();
    const cached = stats.models.find(m => m.key === currentModelConfig.key);
    
    if (cached) {
      modelStatus.innerHTML = `
        <p style="margin: 0; color: var(--ok);">✓ ${currentModelConfig.name} model is cached (${formatBytes(cached.size)})</p>
      `;
    } else if (currentModelConfig.requiresSetup) {
      // Model requires local setup
      modelStatus.innerHTML = `
        <p style="margin: 0; color: var(--warning, #f59e0b);">⚠ ${currentModelConfig.name} requires setup</p>
        <p style="margin: 0.5rem 0 0 0; color: var(--text-subtle); font-size: 0.75rem;">
          This model needs to be downloaded, converted to ONNX, and placed in <code>/models/</code> directory. See <code>README-IMAGE-ENHANCE.md</code> for instructions.
        </p>
      `;
    } else {
      // Model available via CDN
      modelStatus.innerHTML = `
        <p style="margin: 0; color: var(--muted);">${currentModelConfig.name} will be downloaded from CDN on first use (~20-40MB)</p>
      `;
    }
  } catch (error) {
    console.error('Failed to check model status:', error);
  }
}

// File handling
function handleFile(file) {
  if (!file) return;
  
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    toast('Invalid file type. Please upload a PNG, JPEG, or WebP image.', 'error');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    toast('File too large. Please use an image smaller than 10MB.', 'error');
    return;
  }
  
  currentFile = file;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const img = await loadImage(e.target.result);
      currentImage = img;
      
      previewImg.src = e.target.result;
      imagePreview.style.display = 'flex';
      
      const imageInfoText = `${file.name} • ${img.width} × ${img.height}px • ${(file.size / 1024).toFixed(1)} KB`;
      imageInfo.textContent = imageInfoText;
      
      dropZone.style.display = 'none';
      // Only enable enhance button if model is also selected
      if (currentModelConfig) {
        enhanceBtn.disabled = false;
        outputArea.innerHTML = '<p>Ready to enhance</p>';
      } else {
        enhanceBtn.disabled = true;
        outputArea.innerHTML = '<p>Please select an enhancement type</p>';
      }
      outputArea.style.display = 'flex';
      outputArea.style.flexDirection = 'column';
      outputArea.style.alignItems = 'center';
      outputArea.style.justifyContent = 'center';
      
      toast('Image loaded successfully', 'success');
    } catch (error) {
      toast(`Failed to load image: ${error.message}`, 'error');
    }
  };
  
  reader.onerror = () => {
    toast('Failed to read file', 'error');
  };
  
  reader.readAsDataURL(file);
}

// Drag and drop
on(dropZone, 'click', () => fileInput.click());

on(dropZone, 'dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

on(dropZone, 'dragleave', () => {
  dropZone.classList.remove('dragover');
});

on(dropZone, 'drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) {
    handleFile(file);
  }
});

on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
});

// Load model session
async function loadModelSession() {
  if (currentSession && currentModelConfig) {
    return currentSession;
  }
  
  if (!currentModelConfig) {
    throw new Error('No model selected');
  }
  
  try {
    // Disable enhance button during download
    enhanceBtn.disabled = true;
    enhanceBtn.textContent = 'Loading model...';
    
    // Initialize ONNX
    await initONNX();
    
    // Show progress
    progressContainer.style.display = 'block';
    progressText.textContent = 'Loading model...';
    progressBar.style.width = '10%';
    
    // Throttle progress updates to prevent UI blocking
    let lastUpdate = 0;
    const throttleDelay = 100; // Update UI every 100ms max
    
    // Get or download model
    const modelData = await getOrDownloadModel(
      currentModelConfig.key,
      currentModelConfig.url,
      (loaded, total) => {
        const now = Date.now();
        if (now - lastUpdate >= throttleDelay || loaded === total) {
          lastUpdate = now;
          // Use requestAnimationFrame to ensure UI updates don't block
          requestAnimationFrame(() => {
            if (total > 0) {
              const percent = Math.round((loaded / total) * 90); // 90% for download
              progressBar.style.width = percent + '%';
              progressPercent.textContent = percent + '%';
              const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
              const totalMB = (total / (1024 * 1024)).toFixed(1);
              progressText.textContent = `Downloading model: ${loadedMB} MB / ${totalMB} MB`;
            }
          });
        }
      }
    );
    
    progressBar.style.width = '95%';
    progressText.textContent = 'Initializing model...';
    
    // Create session
    // Real-ESRGAN models have WebGL compatibility issues, use WASM for them
    const useWASMOnly = currentModelConfig.key.includes('realesrgan') || 
                       currentModelConfig.key.includes('image-enhance');
    currentSession = await createInferenceSession(modelData, useWASMOnly ? {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    } : undefined);
    
    // Log model input/output names for debugging
    if (currentSession && currentSession.inputNames) {
      console.log('Model input names:', currentSession.inputNames);
      console.log('Model output names:', currentSession.outputNames);
      console.log('Model inputs:', currentSession.inputs);
      console.log('Model outputs:', currentSession.outputs);
      
      // Auto-detect input/output names if they don't match
      if (currentModelConfig.inputName && !currentSession.inputNames.includes(currentModelConfig.inputName)) {
        console.warn(`Input name '${currentModelConfig.inputName}' not found. Available: ${currentSession.inputNames.join(', ')}`);
        // Use first available input name
        if (currentSession.inputNames.length > 0) {
          currentModelConfig.inputName = currentSession.inputNames[0];
          console.log(`Using input name: ${currentModelConfig.inputName}`);
        }
      }
      
      if (currentModelConfig.outputName && !currentSession.outputNames.includes(currentModelConfig.outputName)) {
        console.warn(`Output name '${currentModelConfig.outputName}' not found. Available: ${currentSession.outputNames.join(', ')}`);
        // Use first available output name
        if (currentSession.outputNames.length > 0) {
          currentModelConfig.outputName = currentSession.outputNames[0];
          console.log(`Using output name: ${currentModelConfig.outputName}`);
        }
      }
    }
    
    // Re-enable button
    enhanceBtn.disabled = false;
    enhanceBtn.textContent = 'Enhance Image';
    
    progressBar.style.width = '100%';
    progressText.textContent = 'Model ready!';
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 1000);
    
    toast('Model loaded successfully', 'success');
    
    return currentSession;
  } catch (error) {
    // Re-enable button on error
    enhanceBtn.disabled = false;
    enhanceBtn.textContent = 'Enhance Image';
    progressContainer.style.display = 'none';
    toast(`Failed to load model: ${error.message}`, 'error');
    throw error;
  }
}

// Enhance image
async function enhanceImage() {
  console.log('Enhance button clicked. currentImage:', !!currentImage, 'currentModelConfig:', !!currentModelConfig);
  
  // Ensure model is selected - always check dropdown value
  const modelType = modelSelect.value;
  console.log('Selected model type from dropdown:', modelType);
  
  if (!modelType || !MODEL_CONFIGS[modelType]) {
    toast('Please select an enhancement type from the dropdown', 'error');
    console.error('Invalid or missing model type. Available:', Object.keys(MODEL_CONFIGS));
    return;
  }
  
  // Always set from dropdown to ensure it's current
  currentModelConfig = MODEL_CONFIGS[modelType];
  console.log('Model config:', currentModelConfig?.name);
  
  if (!currentImage) {
    toast('Please upload an image first', 'error');
    return;
  }
  
  if (!currentModelConfig) {
    toast('Please select an enhancement type from the dropdown', 'error');
    console.error('Failed to set model config for type:', modelType);
    return;
  }
  
  try {
    enhanceBtn.disabled = true;
    enhanceBtn.textContent = 'Processing...';
    progressContainer.style.display = 'block';
    progressText.textContent = 'Preparing...';
    progressBar.style.width = '0%';
    
    // Load model
    const session = await loadModelSession();
    
    // Store original image for DeOldify YUV post-processing (before any resizing)
    const isDeOldify = currentModelConfig.key.includes('deoldify');
    let originalImageForPostProcessing = null;
    if (isDeOldify && currentModelConfig.useYUVPostProcessing) {
      // Store the original full-resolution image before any processing
      const origCanvas = document.createElement('canvas');
      origCanvas.width = currentImage.width;
      origCanvas.height = currentImage.height;
      const origCtx = origCanvas.getContext('2d');
      origCtx.drawImage(currentImage, 0, 0);
      originalImageForPostProcessing = origCanvas;
      console.log('DeOldify: Stored original full-resolution image for YUV post-processing');
    }
    
    // Limit input size for performance
    const maxInputSize = 1024;
    let processedImage = currentImage;
    
    if (currentImage.width > maxInputSize || currentImage.height > maxInputSize) {
      progressText.textContent = 'Resizing input image...';
      const resizedCanvas = resizeImage(currentImage, maxInputSize, maxInputSize);
      processedImage = resizedCanvas;
    }
    
    progressText.textContent = 'Processing image...';
    progressBar.style.width = '50%';
    
    // Get scale factor
    let scaleFactor = currentModelConfig.scaleFactor;
    if (scaleFactorSelect && scaleFactorSelect.style.display !== 'none') {
      scaleFactor = parseInt(scaleFactorSelect.value) || scaleFactor;
    }
    
    // Get model's expected input dimensions and resize if needed
    let modelInputWidth = processedImage.width;
    let modelInputHeight = processedImage.height;
    
    console.log('Current image size:', processedImage.width, 'x', processedImage.height);
    console.log('Session inputs:', session.inputs);
    
    // Real-ESRGAN models typically require 128x128 input
    // Models with inputSize specified (super resolution, colorize, etc.)
    // Since session.inputs is undefined, we'll use known fixed sizes for these models
    const realesrganFixedSize = 128;
    const modelInputSize = currentModelConfig.inputSize;
    
    // DeOldify requires dimensions to be multiples of a specific value
    // Try multiples of 64 first (more common for U-Net architectures), fallback to 32
    const roundToMultiple = (value, multiple) => Math.round(value / multiple) * multiple;
    
    // Check if this is DeOldify - needs square dimensions that are multiples of 16
    // DeOldify uses render_factor * render_base (render_base=16), so sizes are multiples of 16
    // Common sizes: 256 (16*16), 320 (20*16), 384 (24*16), 448 (28*16), 512 (32*16), 560 (35*16)
    // The model scales to square for processing, so we'll use square dimensions
    if (isDeOldify) {
      console.log(`DeOldify model detected - resizing to multiples of 16 (preserving aspect ratio)`);
      const originalWidth = processedImage.width;
      const originalHeight = processedImage.height;
      
      // DeOldify uses render_factor * 16 for dimensions
      // Preserve aspect ratio while ensuring dimensions are multiples of 16
      // Cap at 512x512 (render_factor 32) for browser performance
      const maxDim = Math.max(originalWidth, originalHeight);
      const aspectRatio = originalWidth / originalHeight;
      
      // Calculate render_factor equivalent (size / 16)
      // Cap at render_factor 32 (512) for browser performance - same as before
      let renderFactor = Math.max(16, Math.round(maxDim / 16));
      if (renderFactor > 32) {
        renderFactor = 32; // Cap at 512 (same as 512x512 square)
      }
      
      // Calculate dimensions preserving aspect ratio, rounded to multiples of 16
      let newWidth, newHeight;
      if (originalWidth >= originalHeight) {
        // Landscape or square - use max dimension (512) for width
        newWidth = Math.min(renderFactor * 16, 512); // Cap at 512
        newHeight = Math.round((newWidth / aspectRatio) / 16) * 16;
        // Ensure minimum dimension is at least 256 (16*16)
        if (newHeight < 256) {
          newHeight = 256;
          newWidth = Math.round((newHeight * aspectRatio) / 16) * 16;
        }
        // Make sure we don't exceed 512 on either dimension
        if (newWidth > 512) {
          newWidth = 512;
          newHeight = Math.round((newWidth / aspectRatio) / 16) * 16;
        }
      } else {
        // Portrait - use max dimension (512) for height
        newHeight = Math.min(renderFactor * 16, 512); // Cap at 512
        newWidth = Math.round((newHeight * aspectRatio) / 16) * 16;
        // Ensure minimum dimension is at least 256 (16*16)
        if (newWidth < 256) {
          newWidth = 256;
          newHeight = Math.round((newWidth / aspectRatio) / 16) * 16;
        }
        // Make sure we don't exceed 512 on either dimension
        if (newHeight > 512) {
          newHeight = 512;
          newWidth = Math.round((newHeight * aspectRatio) / 16) * 16;
        }
      }
      
      modelInputWidth = newWidth;
      modelInputHeight = newHeight;
      
      console.log(`Original size: ${originalWidth}x${originalHeight}`);
      console.log(`DeOldify render_factor equivalent: ${renderFactor} (size: ${newWidth}x${newHeight}, preserving aspect ratio, max 512)`);
      
      if (processedImage.width !== newWidth || processedImage.height !== newHeight) {
        console.log(`🔄 Resizing image from ${processedImage.width}x${processedImage.height} to ${newWidth}x${newHeight} (preserving aspect ratio)`);
        progressText.textContent = `Resizing to ${newWidth}x${newHeight}...`;
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        const ctx = resizedCanvas.getContext('2d');
        // Preserve aspect ratio (don't stretch)
        ctx.drawImage(processedImage, 0, 0, newWidth, newHeight);
        processedImage = resizedCanvas;
        console.log(`✓ Resized to ${processedImage.width}x${processedImage.height} (aspect ratio preserved)`);
      }
    }
    // Check if this model requires a fixed input size (super resolution, colorize, etc.)
    else if (modelInputSize) {
      console.log(`${currentModelConfig.name} model detected - using fixed input size: ${modelInputSize}x${modelInputSize}`);
      modelInputWidth = modelInputSize;
      modelInputHeight = modelInputSize;
      
      // ALWAYS resize to match model's required dimensions (exact size, no aspect ratio preservation)
      console.log(`Current processedImage size: ${processedImage.width}x${processedImage.height}`);
      console.log(`Target size: ${modelInputSize}x${modelInputSize}`);
      
      if (processedImage.width !== modelInputSize || processedImage.height !== modelInputSize) {
        console.log(`🔄 Resizing image EXACTLY from ${processedImage.width}x${processedImage.height} to ${modelInputSize}x${modelInputSize}`);
        progressText.textContent = `Resizing to ${modelInputSize}x${modelInputSize}...`;
        // Create exact size canvas
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = modelInputSize;
        resizedCanvas.height = modelInputSize;
        const ctx = resizedCanvas.getContext('2d');
        ctx.drawImage(processedImage, 0, 0, modelInputSize, modelInputSize);
        console.log(`✓ Resized canvas size: ${resizedCanvas.width}x${resizedCanvas.height}`);
        processedImage = resizedCanvas;
        console.log(`✓ Updated processedImage size: ${processedImage.width}x${processedImage.height}`);
      } else {
        console.log(`✓ Image already matches required size: ${modelInputSize}x${modelInputSize}`);
      }
    }
    // Check if this is a Real-ESRGAN model that requires fixed 128x128 input
    // Make sure DeOldify is checked first (already done above)
    else if (!isDeOldify && (currentModelConfig.key.includes('realesrgan') || currentModelConfig.key.includes('image-enhance'))) {
      console.log(`Real-ESRGAN model detected - using fixed input size: ${realesrganFixedSize}x${realesrganFixedSize}`);
      modelInputWidth = realesrganFixedSize;
      modelInputHeight = realesrganFixedSize;
      
      // ALWAYS resize to match model's required dimensions (exact size, no aspect ratio preservation)
      console.log(`Current processedImage size: ${processedImage.width}x${processedImage.height}`);
      console.log(`Target size: ${realesrganFixedSize}x${realesrganFixedSize}`);
      
      if (processedImage.width !== realesrganFixedSize || processedImage.height !== realesrganFixedSize) {
        console.log(`🔄 Resizing image EXACTLY from ${processedImage.width}x${processedImage.height} to ${realesrganFixedSize}x${realesrganFixedSize}`);
        progressText.textContent = `Resizing to ${realesrganFixedSize}x${realesrganFixedSize}...`;
        // Create exact size canvas
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = realesrganFixedSize;
        resizedCanvas.height = realesrganFixedSize;
        const ctx = resizedCanvas.getContext('2d');
        ctx.drawImage(processedImage, 0, 0, realesrganFixedSize, realesrganFixedSize);
        console.log(`✓ Resized canvas size: ${resizedCanvas.width}x${resizedCanvas.height}`);
        processedImage = resizedCanvas;
        console.log(`✓ Updated processedImage size: ${processedImage.width}x${processedImage.height}`);
      } else {
        console.log(`✓ Image already matches required size: ${realesrganFixedSize}x${realesrganFixedSize}`);
      }
    } else {
      // For other models, try to get shape from session or use dynamic sizing
      if (session.inputs && session.inputs.length > 0) {
        const inputMetadata = session.inputs[0];
        if (inputMetadata.shape && Array.isArray(inputMetadata.shape) && inputMetadata.shape.length >= 4) {
          const shape = inputMetadata.shape;
          const heightIdx = 2;
          const widthIdx = 3;
          const expectedHeight = shape[heightIdx];
          const expectedWidth = shape[widthIdx];
          
          if (typeof expectedHeight === 'number' && expectedHeight > 0 && 
              typeof expectedWidth === 'number' && expectedWidth > 0) {
            modelInputWidth = expectedWidth;
            modelInputHeight = expectedHeight;
            
            if (processedImage.width !== expectedWidth || processedImage.height !== expectedHeight) {
              const resizedCanvas = document.createElement('canvas');
              resizedCanvas.width = expectedWidth;
              resizedCanvas.height = expectedHeight;
              const ctx = resizedCanvas.getContext('2d');
              ctx.drawImage(processedImage, 0, 0, expectedWidth, expectedHeight);
              processedImage = resizedCanvas;
            }
          }
        }
      }
      
      // If no fixed dimensions detected, round to multiple of 32 for optimization
      if (modelInputWidth === processedImage.width && modelInputHeight === processedImage.height) {
        if (currentModelConfig.key.includes('gfpgan')) {
          modelInputWidth = Math.floor(modelInputWidth / 32) * 32 || 32;
          modelInputHeight = Math.floor(modelInputHeight / 32) * 32 || 32;
          
          if (processedImage.width !== modelInputWidth || processedImage.height !== modelInputHeight) {
            const resizedCanvas = resizeImage(processedImage, modelInputWidth, modelInputHeight);
            processedImage = resizedCanvas;
          }
        }
      }
    }
    
    console.log(`Final model input dimensions: ${modelInputWidth}x${modelInputHeight}`);
    console.log(`Final processedImage size: ${processedImage.width}x${processedImage.height}`);
    
    // Ensure processedImage matches modelInputWidth/Height exactly
    if (processedImage.width !== modelInputWidth || processedImage.height !== modelInputHeight) {
      console.log(`Final resize: ${processedImage.width}x${processedImage.height} -> ${modelInputWidth}x${modelInputHeight}`);
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = modelInputWidth;
      finalCanvas.height = modelInputHeight;
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.drawImage(processedImage, 0, 0, modelInputWidth, modelInputHeight);
      processedImage = finalCanvas;
    }
    
    console.log(`Final image size before processing: ${processedImage.width}x${processedImage.height}`);
    console.log(`Model input dimensions: ${modelInputWidth}x${modelInputHeight}`);
    
    let outputCanvas;
    try {
      // Check if model requires grayscale input
      const requiresGrayscale = currentModelConfig.grayscale === true;
      
      // DeOldify expects grayscale input (converted to RGB format)
      const useGrayscaleInput = requiresGrayscale || isDeOldify;
      
      // Use model-specific mean/std if provided, otherwise use defaults
      const mean = currentModelConfig.mean || [0.5, 0.5, 0.5];
      const std = currentModelConfig.std || [0.5, 0.5, 0.5];
      
      console.log(`Using normalization - mean: [${mean.join(', ')}], std: [${std.join(', ')}]`);
      if (isDeOldify) {
        console.log('DeOldify: Converting input to grayscale (RGB format)');
      }
      
      outputCanvas = await processImageWithModel(processedImage, session, {
        originalImage: originalImageForPostProcessing || currentImage, // Pass original full-res image for YUV post-processing or LAB models
        preprocessOptions: {
          // Don't pass targetWidth/Height - use the actual image dimensions
          // targetWidth: modelInputWidth,
          // targetHeight: modelInputHeight
          grayscale: false, // Don't use single-channel grayscale
          grayscaleToRGB: isDeOldify, // For DeOldify: convert to grayscale but keep as RGB (3 channels)
          mean: mean, // Use model-specific mean
          std: std    // Use model-specific std
        },
        postprocessOptions: {
          scaleFactor: scaleFactor,
          denormalize: true,
          mean: mean, // Use model-specific mean for denormalization
          std: std,    // Use model-specific std for denormalization
          useYUVPostProcessing: isDeOldify && currentModelConfig.useYUVPostProcessing // Enable YUV post-processing for DeOldify
        },
        inputName: currentModelConfig.inputName,
        outputName: currentModelConfig.outputName
      });
    } catch (inferenceError) {
      // Check if it's a WebGL compatibility issue (resize mode not supported)
      if (inferenceError.message && (
        inferenceError.message.includes('resize') && inferenceError.message.includes('does not support') ||
        inferenceError.message.includes('packed') && inferenceError.message.includes('does not support')
      )) {
        console.warn('WebGL backend compatibility issue detected. Recreating session with WASM backend...');
        progressText.textContent = 'Switching to WASM backend...';
        
        // Clear current session and recreate with WASM only
        currentSession = null;
        const modelData = await getOrDownloadModel(currentModelConfig.key, currentModelConfig.url);
        currentSession = await createInferenceSession(modelData, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
        
        // Retry inference with WASM backend
        progressText.textContent = 'Processing image (WASM backend)...';
        const requiresGrayscaleRetry = currentModelConfig.grayscale === true;
        const meanRetry = currentModelConfig.mean || [0.5, 0.5, 0.5];
        const stdRetry = currentModelConfig.std || [0.5, 0.5, 0.5];
        outputCanvas = await processImageWithModel(processedImage, currentSession, {
          preprocessOptions: {
            targetWidth: modelInputWidth,
            targetHeight: modelInputHeight,
            grayscale: requiresGrayscaleRetry,
            mean: meanRetry,
            std: stdRetry
          },
          postprocessOptions: {
            scaleFactor: scaleFactor,
            denormalize: true,
            mean: meanRetry,
            std: stdRetry
          },
          inputName: currentModelConfig.inputName,
          outputName: currentModelConfig.outputName
        });
      } else {
        throw inferenceError;
      }
    }
    
    progressBar.style.width = '100%';
    progressText.textContent = 'Finalizing...';
    
    // Convert to blob
    enhancedBlob = await canvasToBlob(outputCanvas, 'image/png');
    
    // Display result
    const url = URL.createObjectURL(enhancedBlob);
    outputArea.innerHTML = `
      <img src="${url}" alt="Enhanced image" style="max-width: 100%; max-height: calc(100% - 3rem); border-radius: 6px; object-fit: contain;">
      <div style="position: absolute; bottom: 0.75rem; left: 0; right: 0; text-align: center;">
        <p style="color: var(--ok); font-weight: 500; margin: 0; font-size: 0.875rem;">✓ Enhanced successfully</p>
        <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0; font-size: 0.75rem;">
          ${outputCanvas.width} × ${outputCanvas.height}px • ${formatBytes(enhancedBlob.size)}
        </p>
      </div>
    `;
    outputArea.style.display = 'flex';
    outputArea.style.flexDirection = 'column';
    outputArea.style.alignItems = 'center';
    outputArea.style.justifyContent = 'center';
    
    downloadBtn.disabled = false;
    progressContainer.style.display = 'none';
    toast('Image enhanced successfully', 'success');
  } catch (error) {
    console.error('Enhancement error:', error);
    
    // Handle different error types
    let errorMessage = '';
    if (error && typeof error === 'object') {
      errorMessage = error.message || error.toString() || String(error);
    } else {
      errorMessage = String(error);
    }
    
    let userFriendlyMessage = '';
    
    // Check for dynamic batch dimension error (ONNX Runtime Web limitation)
    if (errorMessage && errorMessage.includes && errorMessage.includes('expected shape') && errorMessage.includes(',') && errorMessage.includes('dynamic batch')) {
      userFriendlyMessage = 'This model uses a dynamic batch dimension which may not be fully supported by ONNX Runtime Web. The model needs to be re-exported with a fixed batch size (e.g., batch=1) to work in the browser.';
    } else if (errorMessage && errorMessage.includes && errorMessage.includes('expected shape') && errorMessage.includes('[,1,224,224]')) {
      userFriendlyMessage = 'The super resolution model expects a dynamic batch dimension, but ONNX Runtime Web may not support this. The model file needs to be re-exported with a fixed batch size (batch=1) to work in the browser.';
    }
    // Check for dimension mismatch errors (DeOldify and similar models)
    else if (errorMessage && errorMessage.includes && (errorMessage.includes('mismatched dimensions') || errorMessage.includes('Concat') || errorMessage.includes('Non concat axis') || errorMessage.includes('855068792'))) {
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem; font-weight: 500;">Model Processing Error</p>
          <p class="text-sm text-muted" style="margin-bottom: 1rem;">
            The model encountered an error during processing. This may be due to:
            <ul style="text-align: left; display: inline-block; margin-top: 0.5rem;">
              <li>Corrupted model cache - try clearing the model cache</li>
              <li>Incompatible model file - the ONNX model may need to be re-exported</li>
              <li>Dimension constraints - the model may require specific input dimensions</li>
            </ul>
          </p>
          <button id="clear-cache-btn" class="primary" style="margin-top: 1rem;">Clear Model Cache</button>
          <p class="text-sm text-muted" style="margin-top: 0.5rem; font-family: monospace; font-size: 0.75rem;">${errorMessage}</p>
        </div>
      `;
      
      // Add event listener for clear cache button
      setTimeout(() => {
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
          clearCacheBtn.addEventListener('click', async () => {
            try {
              await clearModelCache();
              toast('Model cache cleared. Please try again.', 'success');
              // Reload the page to re-download the model
              setTimeout(() => window.location.reload(), 1000);
            } catch (err) {
              toast(`Failed to clear cache: ${err.message}`, 'error');
            }
          });
        }
      }, 100);
    }
    // Provide helpful error messages
    else if (errorMessage && errorMessage.includes && (errorMessage.includes('CORS') || errorMessage.includes('cross-origin'))) {
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem; font-weight: 500;">CORS Error</p>
          <p class="text-sm text-muted" style="margin-bottom: 1rem;">
            The model URL does not allow cross-origin requests. This usually happens with GitHub raw URLs.
          </p>
          <details style="text-align: left; margin-top: 1rem; padding: 1rem; background: var(--bg-elev); border-radius: 6px;">
            <summary style="cursor: pointer; color: var(--accent); margin-bottom: 0.5rem;">How to fix</summary>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
              <p><strong>1.</strong> Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) to load the updated code</p>
              <p><strong>2.</strong> Clear the browser cache for this site</p>
              <p><strong>3.</strong> The code should now use jsDelivr CDN which supports CORS</p>
              <p style="margin-top: 0.5rem;"><strong>If the error persists:</strong> The model URL may need to be updated. Check the browser console for the actual URL being used.</p>
            </div>
          </details>
        </div>
      `;
    } else if (errorMessage && errorMessage.includes && (errorMessage.includes('404') || errorMessage.includes('Failed to download') || errorMessage.includes('not found'))) {
      // Check if model requires setup
      const requiresSetup = currentModelConfig?.requiresSetup;
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem; font-weight: 500;">${requiresSetup ? 'Model Setup Required' : 'Model Not Available'}</p>
          <p class="text-sm text-muted" style="margin-bottom: 1rem;">
            ${requiresSetup 
              ? `The ${currentModelConfig.name} model file is not found. This model needs to be set up locally.`
              : `The ${currentModelConfig.name} model file is not available at the configured URL.`
            }
          </p>
          ${requiresSetup ? `
          <details style="text-align: left; margin-top: 1rem; padding: 1rem; background: var(--bg-elev); border-radius: 6px;">
            <summary style="cursor: pointer; color: var(--accent); margin-bottom: 0.5rem;">How to set up this model</summary>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
              <p><strong>Step 1:</strong> Download the PyTorch model from the source repository</p>
              <p><strong>Step 2:</strong> Convert the model to ONNX format (see README-IMAGE-ENHANCE.md)</p>
              <p><strong>Step 3:</strong> Place the .onnx file in the <code>/models/</code> directory</p>
              <p><strong>Step 4:</strong> Ensure the file path matches: <code style="font-size: 0.7rem; word-break: break-all;">${currentModelConfig.url}</code></p>
              <p style="margin-top: 0.5rem;">See <code>README-IMAGE-ENHANCE.md</code> for detailed conversion instructions.</p>
            </div>
          </details>
          ` : `
          <details style="text-align: left; margin-top: 1rem; padding: 1rem; background: var(--bg-elev); border-radius: 6px;">
            <summary style="cursor: pointer; color: var(--accent); margin-bottom: 0.5rem;">Troubleshooting</summary>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
              <p><strong>Option 1:</strong> Host models in <code>/models/</code> directory</p>
              <p><strong>Option 2:</strong> Update model URLs in <code>js/tools/image-enhance.js</code></p>
              <p><strong>Option 3:</strong> Use publicly available ONNX models from Hugging Face or ONNX Model Zoo</p>
              <p style="margin-top: 0.5rem;">See <code>README-IMAGE-ENHANCE.md</code> for detailed instructions.</p>
            </div>
          </details>
          `}
          <p class="text-sm text-muted" style="margin-top: 1rem; font-size: 0.75rem;">
            Expected URL: <code style="font-size: 0.7rem; word-break: break-all;">${currentModelConfig.url}</code>
          </p>
        </div>
      `;
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem; font-weight: 500;">Model Not Available</p>
          <p class="text-sm text-muted" style="margin-bottom: 1rem;">
            The ${currentModelConfig.name} model file is not available at the configured URL.
          </p>
          <details style="text-align: left; margin-top: 1rem; padding: 1rem; background: var(--bg-elev); border-radius: 6px;">
            <summary style="cursor: pointer; color: var(--accent); margin-bottom: 0.5rem;">How to set up models</summary>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
              <p><strong>Option 1:</strong> Host models in <code>/models/</code> directory</p>
              <p><strong>Option 2:</strong> Update model URLs in <code>js/tools/image-enhance.js</code></p>
              <p><strong>Option 3:</strong> Use publicly available ONNX models from Hugging Face or ONNX Model Zoo</p>
              <p style="margin-top: 0.5rem;">See <code>README-IMAGE-ENHANCE.md</code> for detailed instructions.</p>
            </div>
          </details>
          <p class="text-sm text-muted" style="margin-top: 1rem; font-size: 0.75rem;">
            Expected URL: <code style="font-size: 0.7rem; word-break: break-all;">${currentModelConfig.url}</code>
          </p>
        </div>
      `;
    } else if (errorMessage && errorMessage.includes && errorMessage.includes('IR_VERSION')) {
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem; font-weight: 500;">ONNX Model Version Error</p>
          <p class="text-sm text-muted" style="margin-bottom: 1rem;">
            The model file uses an older ONNX format that is not supported. The model needs to be converted to ONNX IR version 3 or higher.
          </p>
          <details style="text-align: left; margin-top: 1rem; padding: 1rem; background: var(--bg-elev); border-radius: 6px;">
            <summary style="cursor: pointer; color: var(--accent); margin-bottom: 0.5rem;">How to fix</summary>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
              <p><strong>Option 1:</strong> Re-export the model with a newer ONNX version (IR_VERSION >= 3)</p>
              <p><strong>Option 2:</strong> Use a different model file that's already in the correct format</p>
              <p><strong>Option 3:</strong> Update the model conversion script to use a newer opset version</p>
              <p style="margin-top: 0.5rem;">Check the model source repository for updated ONNX export instructions.</p>
            </div>
          </details>
          <p class="text-sm text-muted" style="margin-top: 1rem; font-family: monospace; font-size: 0.75rem;">${error.message}</p>
        </div>
      `;
    } else if (errorMessage && errorMessage.includes && (errorMessage.includes('tensor') || errorMessage.includes('shape') || errorMessage.includes('size'))) {
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem;">Model Processing Error</p>
          <p class="text-sm text-muted">The model input/output format doesn't match. This may require model-specific preprocessing adjustments.</p>
          <details style="text-align: left; margin-top: 1rem; padding: 1rem; background: var(--bg-elev); border-radius: 6px;">
            <summary style="cursor: pointer; color: var(--accent); margin-bottom: 0.5rem;">Troubleshooting</summary>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
              <p>• Check the browser console for model input/output names</p>
              <p>• Verify the model expects the correct input format (NCHW vs NHWC)</p>
              <p>• Check if the model needs specific input dimensions</p>
              <p>• The model might need different preprocessing (normalization, mean/std values)</p>
            </div>
          </details>
          <p class="text-sm text-muted" style="margin-top: 1rem; font-family: monospace; font-size: 0.75rem;">${error.message}</p>
        </div>
      `;
    } else if (errorMessage && errorMessage.includes && (errorMessage.includes('WebGL') || errorMessage.includes('GPU'))) {
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem;">GPU Acceleration Error</p>
          <p class="text-sm text-muted">Try refreshing the page or using a different browser (Chrome/Edge recommended).</p>
          <p class="text-sm text-muted" style="margin-top: 0.5rem; font-family: monospace; font-size: 0.75rem;">${error.message}</p>
        </div>
      `;
    } else {
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem;">Enhancement Failed</p>
          <p class="text-sm text-muted">${errorMessage}</p>
        </div>
      `;
    }
    
    toast(`Enhancement failed: ${errorMessage.split('\n')[0]}`, 'error');
    outputArea.innerHTML = userFriendlyMessage;
    progressContainer.style.display = 'none';
  } finally {
    enhanceBtn.disabled = false;
    enhanceBtn.textContent = 'Enhance';
  }
}

// Buttons
on(enhanceBtn, 'click', enhanceImage);

on(downloadBtn, 'click', () => {
  if (!enhancedBlob) {
    toast('No enhanced image to download', 'error');
    return;
  }
  
  const filename = currentFile 
    ? currentFile.name.replace(/\.[^/.]+$/, '') + '-enhanced.png'
    : 'enhanced.png';
  
  const url = URL.createObjectURL(enhancedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('Image downloaded', 'success');
});

on(clearBtn, 'click', () => {
  currentFile = null;
  currentImage = null;
  enhancedBlob = null;
  currentSession = null;
  fileInput.value = '';
  imagePreview.style.display = 'none';
  dropZone.style.display = 'flex';
  outputArea.innerHTML = '<p>Upload an image to enhance</p>';
  outputArea.style.display = 'flex';
  outputArea.style.flexDirection = 'column';
  outputArea.style.alignItems = 'center';
  outputArea.style.justifyContent = 'center';
  enhanceBtn.disabled = true;
  downloadBtn.disabled = true;
  progressContainer.style.display = 'none';
  toast('Cleared', 'info');
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!enhanceBtn.disabled) {
      enhanceImage();
    }
  }
});

// Initialize
(async () => {
  console.log('Image enhance tool initializing...');
  console.log('Model select element:', modelSelect);
  console.log('Available model configs:', Object.keys(MODEL_CONFIGS));
  console.log('Cached models container:', cachedModelsContainer);
  
  if (!modelSelect) {
    console.error('CRITICAL: modelSelect element not found!');
    return;
  }
  
  if (!cachedModelsContainer) {
    console.warn('cachedModelsContainer not found - cached models list will not be displayed');
  }
  
  // Ensure a model is selected (set default if none selected)
  if (!modelSelect.value || !MODEL_CONFIGS[modelSelect.value]) {
    console.log('No model selected, setting default to upscale');
    modelSelect.value = 'upscale'; // Default to upscale
  }
  
  console.log('Selected model value:', modelSelect.value);
  
  // Set initial model
  currentModelConfig = MODEL_CONFIGS[modelSelect.value];
  console.log('Initial model config:', currentModelConfig?.name);
  
  if (!currentModelConfig) {
    console.error('Failed to initialize model config. Available models:', Object.keys(MODEL_CONFIGS));
    toast('Failed to initialize model. Please refresh the page.', 'error');
    return;
  }
  
  // Check for and clear old cached models with GitHub URLs (CORS issues)
  try {
    const stats = await getCacheStats();
    for (const model of stats.models) {
      // If model URL contains github.com/onnx/models/raw, it's the old URL with CORS issues
      if (model.url && model.url.includes('github.com/onnx/models/raw')) {
        console.log(`Clearing old cached model with CORS issue: ${model.key}`);
        await deleteCachedModel(model.key);
      }
    }
  } catch (error) {
    console.error('Failed to check/clear old models:', error);
  }
  
  await updateModelStatus();
  
  // Load cached models list (non-blocking, with error handling)
  updateCachedModelsList().catch(error => {
    console.error('Failed to load cached models list on init:', error);
    if (cachedModelsContainer) {
      cachedModelsContainer.innerHTML = '<p style="margin: 0; color: var(--muted);">Unable to load cached models</p>';
    }
  });
  
  // Try to initialize ONNX (non-blocking)
  initONNX().catch(console.error);
})();

