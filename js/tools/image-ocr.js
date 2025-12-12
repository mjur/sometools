// Image OCR Tool
// Uses Tesseract.js for browser-based OCR

import { toast, on, qs } from '/js/ui.js';

// DOM elements
const fileInput = qs('#file-input');
const fileUploadArea = qs('#file-upload-area');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const languageSelect = qs('#language-select');
const ocrStatus = qs('#ocr-status');
const extractBtn = qs('#extract-btn');
const clearBtn = qs('#clear-btn');
const output = qs('#output');
const outputPlaceholder = qs('#output-placeholder');
const textResult = qs('#text-result');
const extractedText = qs('#extracted-text');
const copyBtn = qs('#copy-btn');
const downloadBtn = qs('#download-btn');
const confidenceInfo = qs('#confidence-info');
const progressContainer = qs('#progress-container');
const progressText = qs('#progress-text');
const progressPercent = qs('#progress-percent');
const progressBar = qs('#progress-bar');

// State
let currentImage = null;
let tesseractWorker = null;
let isProcessing = false;

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

// Load Tesseract.js
async function loadTesseract() {
  if (window.Tesseract && window.Tesseract.createWorker) {
    console.log('[OCR] Using cached Tesseract.js');
    return window.Tesseract;
  }
  
  try {
    console.log('[OCR] Loading Tesseract.js from CDN...');
    ocrStatus.textContent = 'Loading OCR engine...';
    
    // Tesseract.js is loaded via script tag (UMD bundle)
    // Try multiple CDN sources
    const cdnSources = [
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js',
      'https://unpkg.com/tesseract.js@5.0.4/dist/tesseract.min.js',
      'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    ];
    
    // Check if already loaded
    if (window.Tesseract && window.Tesseract.createWorker) {
      console.log('[OCR] Tesseract.js already available');
      return window.Tesseract;
    }
    
    // Load via script tag
    return new Promise((resolve, reject) => {
      let loaded = false;
      let lastError = null;
      let sourceIndex = 0;
      
      function tryNextSource() {
        if (sourceIndex >= cdnSources.length) {
          reject(new Error(`Failed to load Tesseract.js from any CDN. Last error: ${lastError?.message || 'Unknown error'}`));
          return;
        }
        
        const cdnUrl = cdnSources[sourceIndex];
        console.log(`[OCR] Trying to load from: ${cdnUrl}`);
        
        const script = document.createElement('script');
        script.src = cdnUrl;
        script.async = true;
        
        script.onload = () => {
          if (window.Tesseract && window.Tesseract.createWorker) {
            console.log(`[OCR] ✓ Loaded from: ${cdnUrl}`);
            loaded = true;
            resolve(window.Tesseract);
          } else {
            console.warn(`[OCR] Script loaded but Tesseract not found on window`);
            tryNextSource();
          }
        };
        
        script.onerror = (error) => {
          console.warn(`[OCR] Failed to load from ${cdnUrl}`);
          lastError = error;
          sourceIndex++;
          tryNextSource();
        };
        
        document.head.appendChild(script);
      }
      
      tryNextSource();
    });
  } catch (error) {
    console.error('[OCR] Failed to load Tesseract.js:', error);
    throw new Error(`Failed to load Tesseract.js: ${error.message}`);
  }
}

// Initialize Tesseract worker
async function initWorker() {
  if (tesseractWorker) {
    return tesseractWorker;
  }
  
  try {
    const tesseract = await loadTesseract();
    const language = languageSelect.value;
    
    console.log(`[OCR] Creating worker with language: ${language}`);
    ocrStatus.textContent = `Initializing OCR engine (${language})...`;
    updateProgress('Initializing OCR engine...', 10);
    
    // Tesseract.js createWorker API
    tesseractWorker = await tesseract.createWorker(language);
    
    console.log('[OCR] ✓ Worker created');
    return tesseractWorker;
  } catch (error) {
    console.error('[OCR] Failed to create worker:', error);
    throw new Error(`Failed to initialize OCR engine: ${error.message}`);
  }
}

// Extract text from image
async function extractText() {
  if (!currentImage) {
    toast('Please upload an image first', 'error');
    return;
  }
  
  if (isProcessing) {
    toast('OCR is already processing...', 'info');
    return;
  }
  
  try {
    isProcessing = true;
    extractBtn.disabled = true;
    outputPlaceholder.style.display = 'none';
    textResult.style.display = 'none';
    updateProgress('Initializing...', 0);
    
    console.log('[OCR] Starting text extraction...');
    
    // Ensure image is fully loaded
    if (!previewImg.complete) {
      await new Promise((resolve, reject) => {
        previewImg.onload = resolve;
        previewImg.onerror = reject;
      });
    }
    
    // Get selected language
    const language = languageSelect.value;
    
    // Initialize worker if needed, or recreate if language changed
    let worker = tesseractWorker;
    
    // Check if we need to recreate worker for language change
    if (worker) {
      try {
        // Try to get current language from worker
        const params = await worker.getParameters();
        const currentLanguage = params?.tesseract_lang;
        
        if (currentLanguage !== language) {
          console.log(`[OCR] Language changed from ${currentLanguage} to ${language}, recreating worker...`);
          await worker.terminate();
          tesseractWorker = null;
          worker = null;
        }
      } catch (error) {
        // If getParameters fails, assume we need to recreate
        console.log('[OCR] Could not get worker parameters, recreating worker...');
        await worker.terminate().catch(() => {});
        tesseractWorker = null;
        worker = null;
      }
    }
    
    // Create worker if we don't have one or it was terminated
    if (!worker) {
      const tesseract = await loadTesseract();
      worker = await tesseract.createWorker(language);
      tesseractWorker = worker;
    }
    
    ocrStatus.textContent = 'Extracting text...';
    updateProgress('Preparing image...', 30);
    
    // Convert image to canvas for better compatibility with Tesseract.js
    // Tesseract.js works better with canvas or image data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = previewImg.naturalWidth || previewImg.width;
    canvas.height = previewImg.naturalHeight || previewImg.height;
    ctx.drawImage(previewImg, 0, 0);
    
    updateProgress('Extracting text from image...', 40);
    
    // Perform OCR
    // Tesseract.js accepts: canvas, image element, image URL, or image data
    // Using canvas for best compatibility
    const recognizePromise = worker.recognize(canvas);
    
    // Simulate progress (since we can't get real-time progress from the worker)
    let progressInterval;
    let currentProgress = 30;
    progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += 5;
        updateProgress('Processing image...', currentProgress);
      }
    }, 500);
    
    const { data } = await recognizePromise;
    
    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    updateProgress('Finalizing...', 95);
    
    console.log('[OCR] Text extracted:', data.text);
    console.log('[OCR] Confidence:', data.confidence);
    
    // Display extracted text
    extractedText.value = data.text;
    textResult.style.display = 'block';
    
    // Show confidence info
    if (data.confidence !== undefined) {
      const confidence = Math.round(data.confidence);
      confidenceInfo.textContent = `Confidence: ${confidence}%`;
      confidenceInfo.style.color = confidence > 80 ? 'var(--ok)' : confidence > 60 ? 'var(--warning)' : 'var(--error)';
    }
    
    hideProgress();
    ocrStatus.textContent = 'Text extracted successfully';
    ocrStatus.style.color = 'var(--ok)';
    
    toast('Text extracted successfully!', 'success');
  } catch (error) {
    console.error('[OCR] Text extraction error:', error);
    hideProgress();
    ocrStatus.textContent = `Error: ${error.message}`;
    ocrStatus.style.color = 'var(--error)';
    toast(`Failed to extract text: ${error.message}`, 'error');
    outputPlaceholder.style.display = 'block';
    outputPlaceholder.textContent = `Error: ${error.message}`;
  } finally {
    isProcessing = false;
    extractBtn.disabled = false;
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
      extractBtn.disabled = false;
      ocrStatus.textContent = 'Ready to extract text';
      ocrStatus.style.color = 'var(--muted)';
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
  extractBtn.disabled = true;
  outputPlaceholder.style.display = 'block';
  outputPlaceholder.textContent = 'Upload an image and click "Extract Text" to get the text content';
  textResult.style.display = 'none';
  extractedText.value = '';
  confidenceInfo.textContent = '';
  ocrStatus.textContent = 'Ready';
  ocrStatus.style.color = 'var(--muted)';
  hideProgress();
  
  // Terminate worker to free memory
  if (tesseractWorker) {
    tesseractWorker.terminate().catch(console.error);
    tesseractWorker = null;
  }
}

// Copy text to clipboard
async function copyText() {
  const text = extractedText.value;
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    toast('Text copied to clipboard!', 'success');
  } catch (error) {
    console.error('Failed to copy:', error);
    toast('Failed to copy text', 'error');
  }
}

// Download text as file
function downloadText() {
  const text = extractedText.value;
  if (!text) return;
  
  try {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Text downloaded!', 'success');
  } catch (error) {
    console.error('Failed to download:', error);
    toast('Failed to download text', 'error');
  }
}

// Handle language change
function handleLanguageChange() {
  // Terminate current worker - will be recreated with new language
  if (tesseractWorker) {
    tesseractWorker.terminate().catch(console.error);
    tesseractWorker = null;
  }
  
  if (currentImage) {
    ocrStatus.textContent = `Language changed to ${languageSelect.options[languageSelect.selectedIndex].text}. Ready to extract.`;
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

on(extractBtn, 'click', extractText);
on(clearBtn, 'click', clearAll);
on(copyBtn, 'click', copyText);
on(downloadBtn, 'click', downloadText);
on(languageSelect, 'change', handleLanguageChange);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (tesseractWorker) {
    tesseractWorker.terminate().catch(console.error);
  }
});

