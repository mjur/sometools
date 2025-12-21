import { toast, on, qs, downloadFile } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const resizeBtn = qs('#resize');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const resizeMode = qs('#resize-mode');
const widthInput = qs('#width');
const heightInput = qs('#height');
const percentageInput = qs('#percentage');
const maintainAspect = qs('#maintain-aspect');
const widthGroup = qs('#width-group');
const heightGroup = qs('#height-group');
const percentageGroup = qs('#percentage-group');

let currentFile = null;
let originalWidth = 0;
let originalHeight = 0;
let resizedBlob = null;

// Update UI based on resize mode
on(resizeMode, 'change', () => {
  const mode = resizeMode.value;
  widthGroup.style.display = (mode === 'width' || mode === 'custom') ? 'flex' : 'none';
  heightGroup.style.display = (mode === 'height' || mode === 'custom') ? 'flex' : 'none';
  percentageGroup.style.display = mode === 'percentage' ? 'flex' : 'none';
  maintainAspect.disabled = mode === 'custom';
  if (mode === 'custom') maintainAspect.checked = false;
});

// File input handler
on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// Drop zone handlers
on(dropZone, 'click', () => fileInput.click());
on(dropZone, 'dragover', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = 'var(--bg-elev)';
});
on(dropZone, 'dragleave', () => {
  dropZone.style.backgroundColor = '';
});
on(dropZone, 'drop', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = '';
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
    
    // Get image dimensions
    const img = new Image();
    img.onload = () => {
      originalWidth = img.width;
      originalHeight = img.height;
      widthInput.value = originalWidth;
      heightInput.value = originalHeight;
      imageInfo.textContent = `${originalWidth} × ${originalHeight} px`;
      resizeBtn.disabled = false;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resizeImage() {
  if (!currentFile) {
    toast('Please upload an image first');
    return;
  }
  
  const mode = resizeMode.value;
  let targetWidth, targetHeight;
  
  if (mode === 'percentage') {
    const percent = percentageInput.value / 100;
    targetWidth = Math.round(originalWidth * percent);
    targetHeight = Math.round(originalHeight * percent);
  } else if (mode === 'width') {
    targetWidth = parseInt(widthInput.value);
    if (maintainAspect.checked) {
      targetHeight = Math.round((originalHeight / originalWidth) * targetWidth);
      heightInput.value = targetHeight;
    } else {
      targetHeight = parseInt(heightInput.value);
    }
  } else if (mode === 'height') {
    targetHeight = parseInt(heightInput.value);
    if (maintainAspect.checked) {
      targetWidth = Math.round((originalWidth / originalHeight) * targetHeight);
      widthInput.value = targetWidth;
    } else {
      targetWidth = parseInt(widthInput.value);
    }
  } else { // custom
    targetWidth = parseInt(widthInput.value);
    targetHeight = parseInt(heightInput.value);
  }
  
  if (targetWidth < 1 || targetHeight < 1) {
    toast('Width and height must be at least 1 pixel');
    return;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    canvas.toBlob((blob) => {
      resizedBlob = blob;
      const url = URL.createObjectURL(blob);
      outputArea.innerHTML = `
        <img src="${url}" alt="Resized" style="max-width: 100%; max-height: calc(100% - 2rem); border-radius: 6px; object-fit: contain;">
        <p class="text-sm text-muted" style="margin-top: 0.5rem; text-align: center;">${targetWidth} × ${targetHeight} px</p>
      `;
      downloadBtn.disabled = false;
      toast(`Image resized to ${targetWidth} × ${targetHeight} px`);
    }, currentFile.type || 'image/png', 0.95);
  };
  img.src = previewImg.src;
}

on(resizeBtn, 'click', resizeImage);
on(clearBtn, 'click', () => {
  currentFile = null;
  resizedBlob = null;
  previewImg.src = '';
  imagePreview.style.display = 'none';
  dropZone.style.display = 'flex';
  outputArea.innerHTML = '<p>Upload an image to resize</p>';
  resizeBtn.disabled = true;
  downloadBtn.disabled = true;
  fileInput.value = '';
  originalWidth = 0;
  originalHeight = 0;
});

on(downloadBtn, 'click', () => {
  if (resizedBlob) {
    const ext = currentFile.name.split('.').pop() || 'png';
    downloadFile(resizedBlob, `resized.${ext}`, resizedBlob.type);
    toast('Image downloaded');
  }
});

// Auto-resize when dimensions change (if image is loaded)
on(widthInput, 'input', () => {
  if (resizeMode.value === 'width' && maintainAspect.checked && originalWidth > 0) {
    const newWidth = parseInt(widthInput.value);
    if (newWidth > 0) {
      heightInput.value = Math.round((originalHeight / originalWidth) * newWidth);
    }
  }
});

on(heightInput, 'input', () => {
  if (resizeMode.value === 'height' && maintainAspect.checked && originalHeight > 0) {
    const newHeight = parseInt(heightInput.value);
    if (newHeight > 0) {
      widthInput.value = Math.round((originalWidth / originalHeight) * newHeight);
    }
  }
});

