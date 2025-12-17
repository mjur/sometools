// Image Background Removal Tool
// Uses color-based and selection techniques (no AI required)

import { toast, on, qs, downloadFile } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const previewContainer = qs('#preview-container');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const removeBgBtn = qs('#remove-bg');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const transparentBg = qs('#transparent-bg');
const showPreview = qs('#show-preview');
const toleranceInput = qs('#tolerance');
const toleranceValue = qs('#tolerance-value');
const methodSelect = qs('#method');

let currentFile = null;
let resultBlob = null;
let originalImage = null;
let canvas = null;
let ctx = null;
let isDrawing = false;
let currentTool = 'color'; // 'color', 'wand', 'brush'

// Create checkerboard pattern for transparent background preview
function createCheckerboardPattern() {
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  
  // Light gray squares
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(0, 0, 20, 20);
  
  // Dark gray squares
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(0, 0, 10, 10);
  ctx.fillRect(10, 10, 10, 10);
  
  return canvas.toDataURL();
}

// Update preview background
function updatePreviewBackground() {
  if (showPreview.checked && transparentBg.checked) {
    const checkerboard = createCheckerboardPattern();
    previewContainer.style.backgroundImage = `url(${checkerboard})`;
    previewContainer.style.backgroundRepeat = 'repeat';
  } else {
    previewContainer.style.backgroundImage = 'none';
    previewContainer.style.backgroundColor = transparentBg.checked ? 'transparent' : 'var(--bg)';
  }
}

// Get color at point
function getColorAt(imageData, x, y, width) {
  const index = (y * width + x) * 4;
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
    a: imageData.data[index + 3]
  };
}

// Calculate color distance
function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Flood fill algorithm (magic wand)
function floodFill(imageData, startX, startY, targetColor, tolerance, width, height) {
  const visited = new Set();
  const stack = [[startX, startY]];
  const pixelsToRemove = [];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    visited.add(key);
    const currentColor = getColorAt(imageData, x, y, width);
    const distance = colorDistance(currentColor, targetColor);

    if (distance <= tolerance) {
      pixelsToRemove.push([x, y]);

      // Add neighbors
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
  }

  return pixelsToRemove;
}

// Remove background using color-based method
function removeBackgroundByColor(image, targetColor, tolerance) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Remove pixels similar to target color
  for (let i = 0; i < data.length; i += 4) {
    const pixelColor = {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2]
    };
    
    const distance = colorDistance(pixelColor, targetColor);
    if (distance <= tolerance) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Remove background using magic wand (flood fill)
function removeBackgroundByWand(image, startX, startY, tolerance) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const targetColor = getColorAt(imageData, startX, startY, canvas.width);
  const pixelsToRemove = floodFill(imageData, startX, startY, targetColor, tolerance, canvas.width, canvas.height);

  // Remove selected pixels
  for (const [x, y] of pixelsToRemove) {
    const index = (y * canvas.width + x) * 4;
    imageData.data[index + 3] = 0; // Set alpha to 0
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Remove background using edge detection (simple approach)
function removeBackgroundByEdges(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Simple edge detection: if pixel is similar to corners, remove it
  const corners = [
    getColorAt(imageData, 0, 0, width),
    getColorAt(imageData, width - 1, 0, width),
    getColorAt(imageData, 0, height - 1, width),
    getColorAt(imageData, width - 1, height - 1, width)
  ];

  // Average corner color
  const avgCorner = {
    r: Math.round(corners.reduce((sum, c) => sum + c.r, 0) / 4),
    g: Math.round(corners.reduce((sum, c) => sum + c.g, 0) / 4),
    b: Math.round(corners.reduce((sum, c) => sum + c.b, 0) / 4)
  };

  const tolerance = 30; // Adjustable

  for (let i = 0; i < data.length; i += 4) {
    const pixelColor = {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2]
    };
    
    const distance = colorDistance(pixelColor, avgCorner);
    if (distance <= tolerance) {
      data[i + 3] = 0; // Set alpha to 0
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Handle canvas click for color picker or magic wand
function handleCanvasClick(event) {
  if (!canvas || !originalImage) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const color = getColorAt(imageData, x, y, canvas.width);

  if (currentTool === 'color') {
    // Color-based removal
    const tolerance = parseInt(toleranceInput.value) || 30;
    const resultCanvas = removeBackgroundByColor(originalImage, color, tolerance);
    displayResult(resultCanvas);
    toast(`Removed background color (R:${color.r}, G:${color.g}, B:${color.b})`);
  } else if (currentTool === 'wand') {
    // Magic wand
    const tolerance = parseInt(toleranceInput.value) || 30;
    const resultCanvas = removeBackgroundByWand(originalImage, x, y, tolerance);
    displayResult(resultCanvas);
    toast('Removed similar pixels using magic wand');
  }
}

// Display result
function displayResult(resultCanvas) {
  resultCanvas.toBlob((blob) => {
    resultBlob = blob;
    const resultUrl = URL.createObjectURL(blob);
    
    const outputImg = document.createElement('img');
    outputImg.src = resultUrl;
    outputImg.alt = 'Background removed';
    outputImg.style.maxWidth = '100%';
    outputImg.style.maxHeight = 'calc(100% - 2rem)';
    outputImg.style.objectFit = 'contain';
    
    if (showPreview.checked) {
      const checkerboard = createCheckerboardPattern();
      outputArea.style.backgroundImage = `url(${checkerboard})`;
      outputArea.style.backgroundRepeat = 'repeat';
    } else {
      outputArea.style.backgroundImage = 'none';
      outputArea.style.backgroundColor = 'var(--bg)';
    }
    
    outputArea.innerHTML = '';
    outputArea.appendChild(outputImg);
    
    downloadBtn.disabled = false;
    toast('Background removed! Click on the image to refine the selection.');
  }, 'image/png');
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
    previewImg.src = e.target.result;
    imagePreview.style.display = 'flex';
    dropZone.style.display = 'none';
    updatePreviewBackground();
    
    // Create canvas for interaction
    originalImage = new Image();
    originalImage.onload = () => {
      imageInfo.textContent = `${originalImage.width} × ${originalImage.height} px`;
      removeBgBtn.disabled = false;
      
      // Create canvas overlay for clicking
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
      canvas.style.border = '2px solid var(--accent)';
      canvas.style.margin = '0 auto';
      canvas.style.display = 'block';
      
      ctx = canvas.getContext('2d');
      ctx.drawImage(originalImage, 0, 0);
      
      // Insert canvas before image info
      previewContainer.innerHTML = '';
      previewContainer.appendChild(canvas);
      previewContainer.appendChild(imageInfo);
      
      // Add click handler
      canvas.addEventListener('click', handleCanvasClick);
    };
    originalImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeBackground() {
  if (!originalImage) {
    toast('Please upload an image first');
    return;
  }

  const method = methodSelect.value;
  let resultCanvas;

  try {
    if (method === 'edges') {
      // Auto-detect background from corners
      resultCanvas = removeBackgroundByEdges(originalImage);
      toast('Background removed using edge detection');
    } else if (method === 'color') {
      // Get average color from corners
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalImage.width;
      tempCanvas.height = originalImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(originalImage, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      const corners = [
        getColorAt(imageData, 0, 0, tempCanvas.width),
        getColorAt(imageData, tempCanvas.width - 1, 0, tempCanvas.width),
        getColorAt(imageData, 0, tempCanvas.height - 1, tempCanvas.width),
        getColorAt(imageData, tempCanvas.width - 1, tempCanvas.height - 1, tempCanvas.width)
      ];
      
      const avgColor = {
        r: Math.round(corners.reduce((sum, c) => sum + c.r, 0) / 4),
        g: Math.round(corners.reduce((sum, c) => sum + c.g, 0) / 4),
        b: Math.round(corners.reduce((sum, c) => sum + c.b, 0) / 4)
      };
      
      const tolerance = parseInt(toleranceInput.value) || 30;
      resultCanvas = removeBackgroundByColor(originalImage, avgColor, tolerance);
      toast('Background removed using corner color detection');
    } else {
      toast('Please select a removal method');
      return;
    }

    displayResult(resultCanvas);
  } catch (error) {
    console.error('Background removal error:', error);
    toast(`Error: ${error.message || 'Failed to remove background'}`, 'error');
  }
}

on(removeBgBtn, 'click', removeBackground);

on(clearBtn, 'click', () => {
  currentFile = null;
  resultBlob = null;
  originalImage = null;
  canvas = null;
  ctx = null;
  previewImg.src = '';
  imagePreview.style.display = 'none';
  dropZone.style.display = 'flex';
  outputArea.innerHTML = '<p>Upload an image to remove its background</p>';
  outputArea.style.backgroundImage = 'none';
  outputArea.style.backgroundColor = 'var(--bg-elev)';
  removeBgBtn.disabled = true;
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
    downloadFile(resultBlob, `${filename}-no-bg.png`, 'image/png');
    toast('Image downloaded');
  }
});

// Update preview when options change
on(transparentBg, 'change', updatePreviewBackground);
on(showPreview, 'change', updatePreviewBackground);

// Update tolerance display
on(toleranceInput, 'input', (e) => {
  if (toleranceValue) {
    toleranceValue.textContent = e.target.value;
  }
});

// Tool selection
on(methodSelect, 'change', (e) => {
  currentTool = e.target.value === 'wand' ? 'wand' : 'color';
  if (canvas) {
    canvas.style.cursor = 'crosshair';
  }
});
