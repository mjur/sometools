import { toast, on, qs, qsa, downloadFile } from '/js/ui.js';

// Wait for jsPDF to be available
let jsPDF = null;
const checkJsPDF = () => {
  if (window.jspdf && window.jspdf.jsPDF) {
    jsPDF = window.jspdf.jsPDF;
    return true;
  }
  return false;
};

// Poll for jsPDF availability
const waitForJsPDF = () => {
  return new Promise((resolve) => {
    if (checkJsPDF()) {
      resolve();
      return;
    }
    const interval = setInterval(() => {
      if (checkJsPDF()) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(interval);
      if (!checkJsPDF()) {
        toast('Failed to load PDF library. Please refresh the page.', 'error');
      }
    }, 5000);
  });
};

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const convertBtn = qs('#convert');
const downloadBtn = qs('#download');
const previewBtn = qs('#preview');
const clearBtn = qs('#clear');
const pageSizeSelect = qs('#page-size');
const customSizeGroup = qs('#custom-size-group');
const customWidth = qs('#custom-width');
const customHeight = qs('#custom-height');
const orientationSelect = qs('#orientation');
const marginInput = qs('#margin');
const fitToPageCheck = qs('#fit-to-page');

let currentFile = null;
let currentImageData = null;
let pdfBlob = null;

// Page size definitions (in mm)
const pageSizes = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 }
};

// Initialize
waitForJsPDF().then(() => {
  console.log('jsPDF loaded');
});

// Show/hide custom size inputs
on(pageSizeSelect, 'change', () => {
  if (pageSizeSelect.value === 'custom') {
    customSizeGroup.style.display = 'flex';
  } else {
    customSizeGroup.style.display = 'none';
  }
});

// File handling
function handleFile(file) {
  if (!file) return;
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    toast('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.', 'error');
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

// Convert to PDF
on(convertBtn, 'click', async () => {
  if (!currentImageData || !jsPDF) {
    if (!jsPDF) {
      toast('PDF library not loaded yet. Please wait...', 'error');
      await waitForJsPDF();
    }
    if (!currentImageData) {
      toast('Please upload an image first', 'error');
      return;
    }
  }
  
  try {
    convertBtn.disabled = true;
    convertBtn.textContent = 'Converting...';
    
    // Get page dimensions
    let pageWidth, pageHeight;
    if (pageSizeSelect.value === 'custom') {
      pageWidth = parseFloat(customWidth.value) || 210;
      pageHeight = parseFloat(customHeight.value) || 297;
    } else {
      const size = pageSizes[pageSizeSelect.value] || pageSizes.a4;
      pageWidth = size.width;
      pageHeight = size.height;
    }
    
    // Swap dimensions for landscape
    if (orientationSelect.value === 'landscape') {
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }
    
    const margin = parseFloat(marginInput.value) || 10;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: orientationSelect.value === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: pageSizeSelect.value === 'custom' 
        ? [pageWidth, pageHeight]
        : pageSizeSelect.value
    });
    
    // Load image to get dimensions
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = currentImageData;
    });
    
    // Calculate image dimensions
    let imgWidth, imgHeight;
    if (fitToPageCheck.checked) {
      // Fit to page maintaining aspect ratio
      const imgAspect = img.width / img.height;
      const contentAspect = contentWidth / contentHeight;
      
      if (imgAspect > contentAspect) {
        // Image is wider - fit to width
        imgWidth = contentWidth;
        imgHeight = contentWidth / imgAspect;
      } else {
        // Image is taller - fit to height
        imgHeight = contentHeight;
        imgWidth = contentHeight * imgAspect;
      }
    } else {
      // Use original size (convert px to mm, assuming 96 DPI)
      imgWidth = (img.width / 96) * 25.4;
      imgHeight = (img.height / 96) * 25.4;
    }
    
    // Center image
    const x = margin + (contentWidth - imgWidth) / 2;
    const y = margin + (contentHeight - imgHeight) / 2;
    
    // Add image to PDF
    pdf.addImage(currentImageData, 'JPEG', x, y, imgWidth, imgHeight);
    
    // Generate blob
    pdfBlob = pdf.output('blob');
    
    // Update UI
    outputArea.innerHTML = `
      <div style="text-align: center;">
        <p style="color: var(--ok); font-weight: 500;">✓ PDF created successfully</p>
        <p class="text-sm text-muted" style="margin-top: 0.5rem;">
          ${pageWidth.toFixed(1)} × ${pageHeight.toFixed(1)} mm
          ${orientationSelect.value === 'landscape' ? '(Landscape)' : '(Portrait)'}
        </p>
      </div>
    `;
    
    downloadBtn.disabled = false;
    previewBtn.disabled = false;
    
    toast('PDF created successfully', 'success');
  } catch (error) {
    console.error('Conversion error:', error);
    toast(`Conversion failed: ${error.message}`, 'error');
    outputArea.innerHTML = '<p style="color: var(--error);">Conversion failed</p>';
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = 'Convert to PDF';
  }
});

// Download PDF
on(downloadBtn, 'click', () => {
  if (!pdfBlob) {
    toast('No PDF to download. Please convert first.', 'error');
    return;
  }
  
  const filename = currentFile 
    ? currentFile.name.replace(/\.[^/.]+$/, '') + '.pdf'
    : 'converted.pdf';
  
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('PDF downloaded', 'success');
});

// Preview PDF
on(previewBtn, 'click', () => {
  if (!pdfBlob) {
    toast('No PDF to preview. Please convert first.', 'error');
    return;
  }
  
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
  // Clean up after a delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Clear
on(clearBtn, 'click', () => {
  currentFile = null;
  currentImageData = null;
  pdfBlob = null;
  fileInput.value = '';
  imagePreview.style.display = 'none';
  outputArea.innerHTML = '<p>Upload an image to convert to PDF</p>';
  convertBtn.disabled = true;
  downloadBtn.disabled = true;
  previewBtn.disabled = true;
  toast('Cleared', 'info');
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!convertBtn.disabled) {
      convertBtn.click();
    }
  }
});

