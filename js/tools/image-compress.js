import { toast, on, qs, downloadFile } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const compressBtn = qs('#compress');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const qualitySlider = qs('#quality');
const qualityValue = qs('#quality-value');
const outputFormat = qs('#output-format');
const compressionStats = qs('#compression-stats');

let currentFile = null;
let originalSize = 0;
let compressedBlob = null;

on(qualitySlider, 'input', (e) => {
  qualityValue.textContent = Math.round(e.target.value * 100) + '%';
});

on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

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
  if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
    handleFile(file);
  } else {
    toast('Please drop a JPEG or PNG image');
  }
});

function handleFile(file) {
  currentFile = file;
  originalSize = file.size;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    imagePreview.style.display = 'flex';
    dropZone.style.display = 'none';
    imageInfo.textContent = `${(originalSize / 1024).toFixed(2)} KB`;
    compressBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

function compressImage() {
  if (!currentFile) {
    toast('Please upload an image first');
    return;
  }
  
  const quality = parseFloat(qualitySlider.value);
  const format = outputFormat.value;
  let outputType = currentFile.type;
  
  if (format === 'jpeg') outputType = 'image/jpeg';
  else if (format === 'webp') outputType = 'image/webp';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      compressedBlob = blob;
      const url = URL.createObjectURL(blob);
      outputArea.innerHTML = `
        <img src="${url}" alt="Compressed" style="max-width: 100%; max-height: calc(100% - 2rem); border-radius: 6px; object-fit: contain;">
      `;
      
      const compressedSize = blob.size;
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      compressionStats.textContent = `${(originalSize / 1024).toFixed(2)} KB → ${(compressedSize / 1024).toFixed(2)} KB (${reduction}% reduction)`;
      downloadBtn.disabled = false;
      toast(`Image compressed: ${reduction}% reduction`);
    }, outputType, quality);
  };
  img.src = previewImg.src;
}

on(compressBtn, 'click', compressImage);
on(clearBtn, 'click', () => {
  currentFile = null;
  compressedBlob = null;
  previewImg.src = '';
  imagePreview.style.display = 'none';
  dropZone.style.display = 'flex';
  outputArea.innerHTML = '<p>Upload an image to compress</p>';
  compressionStats.textContent = '';
  compressBtn.disabled = true;
  downloadBtn.disabled = true;
  fileInput.value = '';
  originalSize = 0;
});

on(downloadBtn, 'click', () => {
  if (compressedBlob) {
    const format = outputFormat.value;
    let ext = currentFile.name.split('.').pop() || 'jpg';
    if (format === 'jpeg') ext = 'jpg';
    else if (format === 'webp') ext = 'webp';
    downloadFile(compressedBlob, `compressed.${ext}`, compressedBlob.type);
    toast('Image downloaded');
  }
});

