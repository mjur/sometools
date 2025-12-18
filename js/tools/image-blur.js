// Image Blur Tool
// Real-time brush-based blur tool

import { toast, on, qs, downloadFile } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewContainer = qs('#preview-container');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const resetBtn = qs('#reset');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const blurIntensity = qs('#blur-intensity');
const blurValue = qs('#blur-value');
const brushSize = qs('#brush-size');
const brushValue = qs('#brush-value');
const fullImage = qs('#full-image');

let currentFile = null;
let resultBlob = null;
let originalImage = null;
let canvas = null;
let ctx = null;
let isPainting = false;
let lastX = 0;
let lastY = 0;
let workingCanvas = null;
let workingCtx = null;

// Apply Gaussian blur to a circular area
function applyBlurToArea(canvas, ctx, x, y, radius, blurRadius) {
  // Get the area to blur (circular region)
  const size = radius * 2;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext('2d');
  
  // Draw the area from the main canvas
  tempCtx.drawImage(
    canvas,
    x - radius, y - radius, size, size,
    0, 0, size, size
  );
  
  // Apply blur to the temp canvas
  applyGaussianBlur(tempCanvas, tempCanvas, blurRadius);
  
  // Create a mask for circular brush
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = size;
  maskCanvas.height = size;
  const maskCtx = maskCanvas.getContext('2d');
  maskCtx.fillStyle = 'white';
  maskCtx.beginPath();
  maskCtx.arc(radius, radius, radius, 0, Math.PI * 2);
  maskCtx.fill();
  
  // Apply circular mask and composite back
  const imageData = tempCtx.getImageData(0, 0, size, size);
  const maskData = maskCtx.getImageData(0, 0, size, size);
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    const alpha = maskData.data[i + 3] / 255;
    imageData.data[i + 3] = imageData.data[i + 3] * alpha;
  }
  
  tempCtx.putImageData(imageData, 0, 0);
  
  // Composite back to main canvas
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(tempCanvas, x - radius, y - radius);
  ctx.restore();
}

// Apply Gaussian blur to entire canvas
function applyGaussianBlur(sourceCanvas, targetCanvas, radius) {
  const sourceCtx = sourceCanvas.getContext('2d');
  const targetCtx = targetCanvas.getContext('2d');
  
  // Get image data
  const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const data = imageData.data;
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  
  // Simple box blur approximation (faster than true Gaussian)
  const passes = Math.ceil(radius / 2);
  
  for (let pass = 0; pass < passes; pass++) {
    // Horizontal blur
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        const blurSize = Math.floor(radius / passes);
        for (let dx = -blurSize; dx <= blurSize; dx++) {
          const nx = px + dx;
          if (nx >= 0 && nx < width) {
            const idx = (py * width + nx) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }
        
        if (count > 0) {
          const idx = (py * width + px) * 4;
          data[idx] = r / count;
          data[idx + 1] = g / count;
          data[idx + 2] = b / count;
          data[idx + 3] = a / count;
        }
      }
    }
    
    // Vertical blur
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        const blurSize = Math.floor(radius / passes);
        for (let dy = -blurSize; dy <= blurSize; dy++) {
          const ny = py + dy;
          if (ny >= 0 && ny < height) {
            const idx = (ny * width + px) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }
        
        if (count > 0) {
          const idx = (py * width + px) * 4;
          data[idx] = r / count;
          data[idx + 1] = g / count;
          data[idx + 2] = b / count;
          data[idx + 3] = a / count;
        }
      }
    }
  }
  
  // Put blurred data back
  targetCtx.putImageData(imageData, 0, 0);
}

// Draw brush cursor
function drawBrushCursor(x, y, size) {
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const canvasX = (x - rect.left) * scaleX;
  const canvasY = (y - rect.top) * scaleY;
  
  // Draw on a temporary overlay or use CSS cursor
  // For now, we'll just show it visually on hover
}

// Handle canvas mouse events for brush
function handleCanvasMouseDown(event) {
  isPainting = true;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  lastX = (event.clientX - rect.left) * scaleX;
  lastY = (event.clientY - rect.top) * scaleY;
  
  const intensity = parseInt(blurIntensity.value) || 10;
  const size = parseInt(brushSize.value) || 50;
  
  if (fullImage.checked) {
    // Blur entire image
    applyGaussianBlur(workingCanvas, workingCanvas, intensity);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(workingCanvas, 0, 0);
    resetBtn.disabled = false;
  } else {
    // Apply blur at brush position
    applyBlurToArea(workingCanvas, ctx, lastX, lastY, size / 2, intensity);
    resetBtn.disabled = false;
  }
  
  // Update output immediately
  updateOutput();
}

function handleCanvasMouseMove(event) {
  if (!isPainting) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const currentX = (event.clientX - rect.left) * scaleX;
  const currentY = (event.clientY - rect.top) * scaleY;
  
  const intensity = parseInt(blurIntensity.value) || 10;
  const size = parseInt(brushSize.value) || 50;
  
  // Interpolate between last position and current position for smooth brush strokes
  const distance = Math.sqrt(
    Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2)
  );
  const steps = Math.max(1, Math.floor(distance / (size / 4)));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = lastX + (currentX - lastX) * t;
    const y = lastY + (currentY - lastY) * t;
    
    applyBlurToArea(workingCanvas, ctx, x, y, size / 2, intensity);
  }
  
  lastX = currentX;
  lastY = currentY;
  
  // Update output in real-time
  updateOutput();
}

function handleCanvasMouseUp(event) {
  isPainting = false;
}

function handleCanvasMouseLeave(event) {
  isPainting = false;
}

// Update output area with current canvas
function updateOutput() {
  if (!canvas) return;
  
  canvas.toBlob((blob) => {
    if (!blob) return;
    
    resultBlob = blob;
    const resultUrl = URL.createObjectURL(blob);
    
    // Update or create output image
    let outputImg = outputArea.querySelector('img');
    if (!outputImg) {
      outputImg = document.createElement('img');
      outputImg.style.maxWidth = '100%';
      outputImg.style.maxHeight = 'calc(100% - 2rem)';
      outputImg.style.objectFit = 'contain';
      outputArea.innerHTML = '';
      outputArea.appendChild(outputImg);
    }
    
    outputImg.src = resultUrl;
    outputImg.alt = 'Blurred image';
    
    downloadBtn.disabled = false;
  }, currentFile?.type || 'image/png', 0.95);
}

// Reset to original image
function resetImage() {
  if (!originalImage || !workingCanvas) return;
  
  workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
  workingCtx.drawImage(originalImage, 0, 0);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(workingCanvas, 0, 0);
  
  updateOutput();
  resetBtn.disabled = true;
  toast('Image reset to original');
}

// File input handler
on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// Drop zone handlers
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
  if (file && file.type.startsWith('image/')) {
    handleFile(file);
  } else {
    toast('Please drop an image file');
  }
});

function handleFile(file) {
  currentFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.style.display = 'flex';
    dropZone.style.display = 'none';
    
    originalImage = new Image();
    originalImage.onload = () => {
      imageInfo.textContent = `${originalImage.width} × ${originalImage.height} px`;
      
      // Create display canvas
      if (canvas) {
        canvas.remove();
      }
      canvas = document.createElement('canvas');
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = 'calc(100% - 2rem)';
      canvas.style.objectFit = 'contain';
      canvas.style.cursor = 'crosshair';
      canvas.style.border = '2px solid var(--border)';
      canvas.style.margin = '0 auto';
      canvas.style.display = 'block';
      
      ctx = canvas.getContext('2d');
      ctx.drawImage(originalImage, 0, 0);
      
      // Create working canvas (for blur operations)
      workingCanvas = document.createElement('canvas');
      workingCanvas.width = originalImage.width;
      workingCanvas.height = originalImage.height;
      workingCtx = workingCanvas.getContext('2d');
      workingCtx.drawImage(originalImage, 0, 0);
      
      // Add event listeners for brush
      canvas.addEventListener('mousedown', handleCanvasMouseDown);
      canvas.addEventListener('mousemove', handleCanvasMouseMove);
      canvas.addEventListener('mouseup', handleCanvasMouseUp);
      canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
      
      // Touch support
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
      });
      
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
      });
      
      canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
      });
      
      previewContainer.innerHTML = '';
      previewContainer.appendChild(canvas);
      previewContainer.appendChild(imageInfo);
      
      resetBtn.disabled = false;
      updateOutput();
    };
    originalImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

on(resetBtn, 'click', resetImage);

on(clearBtn, 'click', () => {
  currentFile = null;
  resultBlob = null;
  originalImage = null;
  canvas = null;
  ctx = null;
  workingCanvas = null;
  workingCtx = null;
  isPainting = false;
  imagePreview.style.display = 'none';
  dropZone.style.display = 'flex';
  outputArea.innerHTML = '<p>Upload an image to blur</p>';
  resetBtn.disabled = true;
  downloadBtn.disabled = true;
  fileInput.value = '';
  if (canvas) {
    canvas.remove();
    canvas = null;
  }
});

on(downloadBtn, 'click', () => {
  if (resultBlob) {
    const filename = currentFile.name.replace(/\.[^/.]+$/, '') || 'image';
    const ext = currentFile.name.split('.').pop() || 'png';
    downloadFile(resultBlob, `${filename}-blurred.${ext}`, resultBlob.type);
    toast('Image downloaded');
  }
});

// Update blur value display
on(blurIntensity, 'input', (e) => {
  blurValue.textContent = e.target.value;
});

// Update brush value display
on(brushSize, 'input', (e) => {
  brushValue.textContent = e.target.value;
});
