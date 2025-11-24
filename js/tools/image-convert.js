import { toast, on, qs, downloadFile } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const convertBtn = qs('#convert');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const outputFormatSelect = qs('#output-format');
const jpegQualitySlider = qs('#jpeg-quality');
const jpegQualityValue = qs('#jpeg-quality-value');
const jpegQualityGroup = qs('#jpeg-quality-group');
const webpQualitySlider = qs('#webp-quality');
const webpQualityValue = qs('#webp-quality-value');
const webpQualityGroup = qs('#webp-quality-group');
const svgSizeGroup = qs('#svg-size-group');
const svgWidth = qs('#svg-width');
const svgHeight = qs('#svg-height');
const icoSizesGroup = qs('#ico-sizes-group');
const ico16 = qs('#ico-16');
const ico32 = qs('#ico-32');
const ico48 = qs('#ico-48');
const ico64 = qs('#ico-64');
const ico128 = qs('#ico-128');
const ico256 = qs('#ico-256');

let currentFile = null;
let currentImageData = null;
let convertedBlob = null;

// Update quality display
on(jpegQualitySlider, 'input', (e) => {
  jpegQualityValue.textContent = Math.round(e.target.value * 100) + '%';
});

on(webpQualitySlider, 'input', (e) => {
  webpQualityValue.textContent = Math.round(e.target.value * 100) + '%';
});

// Show/hide options based on output format
on(outputFormatSelect, 'change', () => {
  const format = outputFormatSelect.value;
  
  // Show/hide quality sliders
  jpegQualityGroup.style.display = format === 'jpeg' ? 'flex' : 'none';
  webpQualityGroup.style.display = format === 'webp' ? 'flex' : 'none';
  
  // Show/hide SVG size inputs
  svgSizeGroup.style.display = format === 'svg' ? 'flex' : 'none';
  
  // Show/hide ICO size checkboxes
  icoSizesGroup.style.display = format === 'ico' ? 'flex' : 'none';
});

// File handling
function handleFile(file) {
  if (!file) return;
  
  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
  const isValidType = validTypes.includes(file.type) || 
    file.name.toLowerCase().endsWith('.svg') ||
    file.name.toLowerCase().endsWith('.ico');
  
  if (!isValidType) {
    toast('Invalid file type. Please upload a PNG, JPEG, WebP, SVG, or ICO image.', 'error');
    return;
  }
  
  // Check file size (limit to 10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast('File too large. Please use an image smaller than 10MB.', 'error');
    return;
  }
  
  currentFile = file;
  
  // Read and preview image
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    previewImg.src = dataUrl;
    currentImageData = dataUrl;
    imagePreview.style.display = 'block';
    
    // Show image info
    const img = new Image();
    img.onload = () => {
      imageInfo.textContent = `${file.name} • ${img.width} × ${img.height}px • ${(file.size / 1024).toFixed(1)} KB`;
    };
    img.onerror = () => {
      imageInfo.textContent = `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;
    };
    img.src = dataUrl;
    
    // Enable convert button
    convertBtn.disabled = false;
    outputArea.innerHTML = '<p>Ready to convert</p>';
    toast('Image loaded successfully', 'success');
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

// Convert image to ICO format
async function createICO(imageData, sizes) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // ICO file structure
  const icoEntries = [];
  const icoData = [];
  
  for (const size of sizes) {
    canvas.width = size;
    canvas.height = size;
    
    // Draw image scaled to size
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });
    
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    
    // Get PNG data
    const pngData = canvas.toDataURL('image/png').split(',')[1];
    const pngBytes = Uint8Array.from(atob(pngData), c => c.charCodeAt(0));
    
    // ICO entry header (16 bytes)
    const entry = new ArrayBuffer(16);
    const entryView = new DataView(entry);
    entryView.setUint8(0, size === 256 ? 0 : size); // Width (0 = 256)
    entryView.setUint8(1, size === 256 ? 0 : size); // Height (0 = 256)
    entryView.setUint8(2, 0); // Color palette (0 = no palette)
    entryView.setUint8(3, 0); // Reserved
    entryView.setUint16(4, 1, true); // Color planes (little-endian)
    entryView.setUint16(6, 32, true); // Bits per pixel (little-endian)
    entryView.setUint32(8, pngBytes.length, true); // Image data size (little-endian)
    entryView.setUint32(12, 0, true); // Offset (will be set later)
    
    icoEntries.push(new Uint8Array(entry));
    icoData.push(pngBytes);
  }
  
  // Calculate offsets
  let offset = 6 + (icoEntries.length * 16); // ICO header + all entry headers
  for (let i = 0; i < icoEntries.length; i++) {
    const view = new DataView(icoEntries[i].buffer);
    view.setUint32(12, offset, true);
    offset += icoData[i].length;
  }
  
  // Build ICO file
  const icoHeader = new ArrayBuffer(6);
  const headerView = new DataView(icoHeader);
  headerView.setUint16(0, 0, true); // Reserved (must be 0)
  headerView.setUint16(2, 1, true); // Type (1 = ICO)
  headerView.setUint16(4, icoEntries.length, true); // Number of images
  
  const parts = [
    new Uint8Array(icoHeader),
    ...icoEntries,
    ...icoData
  ];
  
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  
  return new Blob([result], { type: 'image/x-icon' });
}

// Convert image to SVG (embed as base64)
async function createSVG(imageData, width, height) {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageData;
  });
  
  // Get base64 data
  const base64Data = imageData.split(',')[1];
  const mimeType = imageData.match(/data:([^;]+)/)?.[1] || 'image/png';
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${img.width} ${img.height}">
  <image width="${width}" height="${height}" href="data:${mimeType};base64,${base64Data}"/>
</svg>`;
  
  return new Blob([svg], { type: 'image/svg+xml' });
}

// Convert image using Canvas
async function convertImage(imageData, outputFormat, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // Handle SVG input
      if (imageData.includes('data:image/svg+xml')) {
        // SVG is already loaded, just draw it
        ctx.drawImage(img, 0, 0);
      } else {
        ctx.drawImage(img, 0, 0);
      }
      
      // Convert to requested format
      const mimeType = {
        'png': 'image/png',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp'
      }[outputFormat];
      
      if (!mimeType) {
        reject(new Error('Unsupported output format'));
        return;
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Conversion failed'));
        }
      }, mimeType, quality);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
}

// Main convert function
async function convert() {
  if (!currentImageData) {
    toast('Please upload an image first', 'error');
    return;
  }
  
  try {
    convertBtn.disabled = true;
    convertBtn.textContent = 'Converting...';
    
    const outputFormat = outputFormatSelect.value;
    let blob;
    
    if (outputFormat === 'ico') {
      // Get selected sizes
      const sizes = [];
      if (ico16.checked) sizes.push(16);
      if (ico32.checked) sizes.push(32);
      if (ico48.checked) sizes.push(48);
      if (ico64.checked) sizes.push(64);
      if (ico128.checked) sizes.push(128);
      if (ico256.checked) sizes.push(256);
      
      if (sizes.length === 0) {
        toast('Please select at least one ICO size', 'error');
        convertBtn.disabled = false;
        convertBtn.textContent = 'Convert';
        return;
      }
      
      blob = await createICO(currentImageData, sizes);
    } else if (outputFormat === 'svg') {
      const width = parseInt(svgWidth.value) || 800;
      const height = parseInt(svgHeight.value) || 600;
      blob = await createSVG(currentImageData, width, height);
    } else {
      // PNG, JPEG, or WebP
      const quality = outputFormat === 'jpeg' 
        ? parseFloat(jpegQualitySlider.value)
        : outputFormat === 'webp'
        ? parseFloat(webpQualitySlider.value)
        : undefined;
      
      blob = await convertImage(currentImageData, outputFormat, quality);
    }
    
    convertedBlob = blob;
    
    // Show preview
    const url = URL.createObjectURL(blob);
    outputArea.innerHTML = `
      <div style="text-align: center;">
        <img src="${url}" alt="Converted image" style="max-width: 100%; max-height: 400px; border-radius: 6px;">
        <p style="color: var(--ok); font-weight: 500; margin-top: 0.5rem;">✓ Converted successfully</p>
        <p class="text-sm text-muted" style="margin-top: 0.5rem;">
          ${(blob.size / 1024).toFixed(1)} KB • ${outputFormat.toUpperCase()}
        </p>
      </div>
    `;
    
    downloadBtn.disabled = false;
    toast('Conversion successful', 'success');
  } catch (error) {
    console.error('Conversion error:', error);
    toast(`Conversion failed: ${error.message}`, 'error');
    outputArea.innerHTML = '<p style="color: var(--error);">Conversion failed</p>';
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = 'Convert';
  }
}

// Convert button
on(convertBtn, 'click', convert);

// Download button
on(downloadBtn, 'click', () => {
  if (!convertedBlob) {
    toast('No converted image to download. Please convert first.', 'error');
    return;
  }
  
  const format = outputFormatSelect.value;
  const extension = {
    'png': 'png',
    'jpeg': 'jpg',
    'webp': 'webp',
    'svg': 'svg',
    'ico': 'ico'
  }[format] || 'png';
  
  const filename = currentFile 
    ? currentFile.name.replace(/\.[^/.]+$/, '') + '.' + extension
    : `converted.${extension}`;
  
  const url = URL.createObjectURL(convertedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('Image downloaded', 'success');
});

// Clear button
on(clearBtn, 'click', () => {
  currentFile = null;
  currentImageData = null;
  convertedBlob = null;
  fileInput.value = '';
  imagePreview.style.display = 'none';
  outputArea.innerHTML = '<p>Upload an image to convert</p>';
  convertBtn.disabled = true;
  downloadBtn.disabled = true;
  toast('Cleared', 'info');
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!convertBtn.disabled) {
      convert();
    }
  }
});

