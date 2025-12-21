// Image Watermark Tool
// Add text or image watermarks to images

import { toast, on, qs, downloadFile } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const previewContainer = qs('#preview-container');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const applyWatermarkBtn = qs('#apply-watermark');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const watermarkType = qs('#watermark-type');
const watermarkText = qs('#watermark-text');
const textSize = qs('#text-size');
const textSizeValue = qs('#text-size-value');
const textColor = qs('#text-color');
const watermarkImageInput = qs('#watermark-image');
const selectWatermarkImageBtn = qs('#select-watermark-image');
const watermarkImageName = qs('#watermark-image-name');
const imageSize = qs('#image-size');
const imageSizeValue = qs('#image-size-value');
const position = qs('#position');
const opacity = qs('#opacity');
const opacityValue = qs('#opacity-value');
const offsetX = qs('#offset-x');
const offsetY = qs('#offset-y');
const textOptions = document.querySelectorAll('.text-options');
const imageOptions = document.querySelectorAll('.image-options');

let currentFile = null;
let resultBlob = null;
let originalImage = null;
let watermarkImage = null;

// Calculate watermark position
function calculatePosition(canvasWidth, canvasHeight, watermarkWidth, watermarkHeight, position, offsetXVal, offsetYVal) {
  let x, y;
  
  switch (position) {
    case 'top-left':
      x = offsetXVal;
      y = offsetYVal;
      break;
    case 'top-center':
      x = (canvasWidth - watermarkWidth) / 2 + offsetXVal;
      y = offsetYVal;
      break;
    case 'top-right':
      x = canvasWidth - watermarkWidth - offsetXVal;
      y = offsetYVal;
      break;
    case 'center-left':
      x = offsetXVal;
      y = (canvasHeight - watermarkHeight) / 2 + offsetYVal;
      break;
    case 'center':
      x = (canvasWidth - watermarkWidth) / 2 + offsetXVal;
      y = (canvasHeight - watermarkHeight) / 2 + offsetYVal;
      break;
    case 'center-right':
      x = canvasWidth - watermarkWidth - offsetXVal;
      y = (canvasHeight - watermarkHeight) / 2 + offsetYVal;
      break;
    case 'bottom-left':
      x = offsetXVal;
      y = canvasHeight - watermarkHeight - offsetYVal;
      break;
    case 'bottom-center':
      x = (canvasWidth - watermarkWidth) / 2 + offsetXVal;
      y = canvasHeight - watermarkHeight - offsetYVal;
      break;
    case 'bottom-right':
      x = canvasWidth - watermarkWidth - offsetXVal;
      y = canvasHeight - watermarkHeight - offsetYVal;
      break;
    default:
      x = offsetXVal;
      y = offsetYVal;
  }
  
  return { x, y };
}

// Apply watermark to image
function applyWatermark() {
  if (!originalImage) {
    toast('Please upload an image first');
    return;
  }

  const type = watermarkType.value;
  const opacityVal = parseFloat(opacity.value);
  const offsetXVal = parseInt(offsetX.value) || 0;
  const offsetYVal = parseInt(offsetY.value) || 0;
  const positionVal = position.value;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(originalImage, 0, 0);

    // Set opacity
    ctx.globalAlpha = opacityVal;

    if (type === 'text') {
      // Text watermark
      const text = watermarkText.value || 'Watermark';
      const fontSize = parseInt(textSize.value) || 48;
      const color = textColor.value || '#ffffff';

      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Measure text
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = fontSize;

      // Calculate position
      const pos = calculatePosition(
        canvas.width,
        canvas.height,
        textWidth,
        textHeight,
        positionVal,
        offsetXVal,
        offsetYVal
      );

      // Add text shadow for better visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillText(text, pos.x, pos.y);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      toast('Text watermark applied');
    } else if (type === 'image') {
      // Image watermark
      if (!watermarkImage) {
        toast('Please select a watermark image first');
        return;
      }

      const sizePercent = parseInt(imageSize.value) || 20;
      const watermarkWidth = (canvas.width * sizePercent) / 100;
      const watermarkHeight = (watermarkImage.height * watermarkWidth) / watermarkImage.width;

      // Calculate position
      const pos = calculatePosition(
        canvas.width,
        canvas.height,
        watermarkWidth,
        watermarkHeight,
        positionVal,
        offsetXVal,
        offsetYVal
      );

      // Draw watermark image
      ctx.drawImage(
        watermarkImage,
        pos.x,
        pos.y,
        watermarkWidth,
        watermarkHeight
      );

      toast('Image watermark applied');
    }

    // Reset opacity
    ctx.globalAlpha = 1.0;

    // Display result
    canvas.toBlob((blob) => {
      resultBlob = blob;
      const resultUrl = URL.createObjectURL(blob);

      const outputImg = document.createElement('img');
      outputImg.src = resultUrl;
      outputImg.alt = 'Watermarked image';
      outputImg.style.maxWidth = '100%';
      outputImg.style.maxHeight = 'calc(100% - 2rem)';
      outputImg.style.objectFit = 'contain';

      outputArea.innerHTML = '';
      outputArea.appendChild(outputImg);

      downloadBtn.disabled = false;
    }, currentFile?.type || 'image/png', 0.95);
  } catch (error) {
    console.error('Watermark error:', error);
    toast(`Error: ${error.message || 'Failed to apply watermark'}`, 'error');
  }
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

    originalImage = new Image();
    originalImage.onload = () => {
      imageInfo.textContent = `${originalImage.width} × ${originalImage.height} px`;
      applyWatermarkBtn.disabled = false;
    };
    originalImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Watermark image handler
on(selectWatermarkImageBtn, 'click', () => {
  watermarkImageInput.click();
});

on(watermarkImageInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      watermarkImage = new Image();
      watermarkImage.onload = () => {
        watermarkImageName.textContent = file.name;
        toast('Watermark image loaded');
      };
      watermarkImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Toggle options based on watermark type
on(watermarkType, 'change', (e) => {
  const type = e.target.value;
  if (type === 'text') {
    textOptions.forEach(el => el.style.display = 'flex');
    imageOptions.forEach(el => el.style.display = 'none');
  } else {
    textOptions.forEach(el => el.style.display = 'none');
    imageOptions.forEach(el => el.style.display = 'flex');
  }
});

on(applyWatermarkBtn, 'click', applyWatermark);

on(clearBtn, 'click', () => {
  currentFile = null;
  resultBlob = null;
  originalImage = null;
  watermarkImage = null;
  previewImg.src = '';
  imagePreview.style.display = 'none';
  dropZone.style.display = 'flex';
  outputArea.innerHTML = '<p>Upload an image to add a watermark</p>';
  applyWatermarkBtn.disabled = true;
  downloadBtn.disabled = true;
  fileInput.value = '';
  watermarkImageInput.value = '';
  watermarkImageName.textContent = '';
});

on(downloadBtn, 'click', () => {
  if (resultBlob) {
    const filename = currentFile.name.replace(/\.[^/.]+$/, '') || 'image';
    const ext = currentFile.name.split('.').pop() || 'png';
    downloadFile(resultBlob, `${filename}-watermarked.${ext}`, resultBlob.type);
    toast('Image downloaded');
  }
});

// Update value displays
on(textSize, 'input', (e) => {
  textSizeValue.textContent = e.target.value;
});

on(imageSize, 'input', (e) => {
  imageSizeValue.textContent = e.target.value;
});

on(opacity, 'input', (e) => {
  opacityValue.textContent = e.target.value;
});

