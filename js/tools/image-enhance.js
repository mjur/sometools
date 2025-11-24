// Image Enhancement Tool
// Uses ONNX models for AI-powered image enhancement

import { toast, on, qs, downloadFile } from '/js/ui.js';
import { loadONNXRuntime, createInferenceSession } from '/js/utils/onnx-loader.js';
import { getOrDownloadModel, getCacheStats, formatBytes } from '/js/utils/model-cache.js';
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
    url: '/models/realesrgan/RealESRGAN_x4plus.onnx', // Update with actual URL
    // Alternative: Convert Real-ESRGAN PyTorch model to ONNX
    // Source: https://github.com/xinntao/Real-ESRGAN
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 4,
    description: 'Upscale images by 4x with AI-powered super-resolution'
  },
  enhance: {
    name: 'Image Enhancement',
    key: 'image-enhance-v1',
    url: '/models/realesrgan/RealESRGAN_x4plus.onnx', // Can reuse Real-ESRGAN
    // Real-ESRGAN also works for general enhancement
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 1,
    description: 'Enhance image quality, reduce noise, and improve details'
  },
  restore: {
    name: 'Face Restoration (GFPGAN)',
    key: 'gfpgan-v1',
    url: '/models/gfpgan/GFPGANv1.3.onnx', // Update with actual URL
    // Convert GFPGAN PyTorch model to ONNX
    // Source: https://github.com/TencentARC/GFPGAN
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 1,
    description: 'Restore and enhance faces in old or damaged photos'
  },
  colorize: {
    name: 'Image Colorization',
    key: 'deoldify-v1',
    url: '/models/deoldify/deoldify.onnx', // Update with actual URL
    // Convert DeOldify PyTorch model to ONNX
    // Source: https://github.com/jantic/DeOldify
    // Alternative: Use Colorful Image Colorization (smaller model)
    inputName: 'input',
    outputName: 'output',
    scaleFactor: 1,
    description: 'Add realistic color to black and white photographs'
  },
  style: {
    name: 'Style Transfer',
    key: 'style-transfer-mosaic-v1',
    url: 'https://github.com/onnx/models/raw/main/vision/style_transfer/fast_neural_style/model/mosaic-9.onnx',
    // ONNX Model Zoo - this one should work if accessible
    // Alternative styles available in ONNX Model Zoo
    inputName: 'input1',
    outputName: 'add_37',
    scaleFactor: 1,
    description: 'Apply artistic styles to your images'
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
on(modelSelect, 'change', () => {
  const modelType = modelSelect.value;
  currentModelConfig = MODEL_CONFIGS[modelType];
  
  // Show/hide scale factor for upscaling
  scaleFactorGroup.style.display = (modelType === 'upscale' || modelType === 'enhance') ? 'flex' : 'none';
  
  // Show/hide strength for style transfer
  strengthGroup.style.display = (modelType === 'style') ? 'flex' : 'none';
  
  // Reset session when model changes
  currentSession = null;
  
  // Update status
  updateModelStatus();
});

// Strength slider
on(strengthSlider, 'input', (e) => {
  strengthValue.textContent = Math.round(e.target.value * 100) + '%';
});

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
    } else {
      modelStatus.innerHTML = `
        <p style="margin: 0; color: var(--muted);">${currentModelConfig.name} model will be downloaded on first use (~${formatBytes(50 * 1024 * 1024)})</p>
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
      enhanceBtn.disabled = false;
      outputArea.innerHTML = '<p>Ready to enhance</p>';
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
    // Initialize ONNX
    await initONNX();
    
    // Show progress
    progressContainer.style.display = 'block';
    progressText.textContent = 'Loading model...';
    progressBar.style.width = '10%';
    
    // Get or download model
    const modelData = await getOrDownloadModel(
      currentModelConfig.key,
      currentModelConfig.url,
      (loaded, total) => {
        if (total > 0) {
          const percent = Math.round((loaded / total) * 90); // 90% for download
          progressBar.style.width = percent + '%';
          progressPercent.textContent = percent + '%';
          progressText.textContent = `Downloading model: ${formatBytes(loaded)} / ${formatBytes(total)}`;
        }
      }
    );
    
    progressBar.style.width = '95%';
    progressText.textContent = 'Initializing model...';
    
    // Create session
    currentSession = await createInferenceSession(modelData);
    
    progressContainer.style.display = 'none';
    toast('Model loaded successfully', 'success');
    
    return currentSession;
  } catch (error) {
    progressContainer.style.display = 'none';
    toast(`Failed to load model: ${error.message}`, 'error');
    throw error;
  }
}

// Enhance image
async function enhanceImage() {
  if (!currentImage || !currentModelConfig) {
    toast('Please upload an image and select a model', 'error');
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
    
    // Process image
    // Note: Some models may need specific input sizes (e.g., multiples of 32)
    // Real-ESRGAN typically works with any size, but some models need fixed sizes
    let modelInputWidth = processedImage.width;
    let modelInputHeight = processedImage.height;
    
    // Round to nearest multiple of 32 for some models (optional optimization)
    if (currentModelConfig.key.includes('realesrgan') || currentModelConfig.key.includes('gfpgan')) {
      modelInputWidth = Math.floor(modelInputWidth / 32) * 32 || 32;
      modelInputHeight = Math.floor(modelInputHeight / 32) * 32 || 32;
    }
    
    const outputCanvas = await processImageWithModel(processedImage, session, {
      preprocessOptions: {
        targetWidth: modelInputWidth,
        targetHeight: modelInputHeight
      },
      postprocessOptions: {
        scaleFactor: scaleFactor,
        denormalize: true,
        mean: [0.5, 0.5, 0.5],
        std: [0.5, 0.5, 0.5]
      },
      inputName: currentModelConfig.inputName,
      outputName: currentModelConfig.outputName
    });
    
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
    
    let errorMessage = error.message;
    let userFriendlyMessage = '';
    
    // Provide helpful error messages
    if (errorMessage.includes('404') || errorMessage.includes('Failed to download')) {
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
    } else if (errorMessage.includes('tensor') || errorMessage.includes('shape')) {
      userFriendlyMessage = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: var(--error); margin-bottom: 1rem;">Model Processing Error</p>
          <p class="text-sm text-muted">The model input/output format doesn't match. This may require model-specific preprocessing adjustments.</p>
          <p class="text-sm text-muted" style="margin-top: 0.5rem; font-family: monospace; font-size: 0.75rem;">${error.message}</p>
        </div>
      `;
    } else if (errorMessage.includes('WebGL') || errorMessage.includes('GPU')) {
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
  // Set initial model
  currentModelConfig = MODEL_CONFIGS[modelSelect.value];
  await updateModelStatus();
  
  // Try to initialize ONNX (non-blocking)
  initONNX().catch(console.error);
})();

