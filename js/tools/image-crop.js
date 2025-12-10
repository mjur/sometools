import { toast, on, qs, downloadFile } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const cropArea = qs('#crop-area');
const cropContainer = qs('#crop-container');
const cropImg = qs('#crop-img');
const cropOverlay = qs('#crop-overlay');
const cropSelection = qs('#crop-selection');
const outputArea = qs('#output-area');
const cropBtn = qs('#crop');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');

let currentFile = null;
let croppedBlob = null;
let isDragging = false;
let isResizing = false;
let isSelecting = false;
let resizeHandle = null;
let dragStart = { x: 0, y: 0 };
let selection = { x: 0, y: 0, width: 0, height: 0 };
let containerRect = { width: 0, height: 0, left: 0, top: 0 };

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
    cropImg.src = e.target.result;
    dropZone.style.display = 'none';
    cropArea.style.display = 'block';
    
    cropImg.onload = () => {
      updateContainerRect();
      resetSelection();
      cropBtn.disabled = false;
    };
  };
  reader.readAsDataURL(file);
}

function updateContainerRect() {
  const rect = cropContainer.getBoundingClientRect();
  containerRect = {
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top
  };
}

function resetSelection() {
  updateContainerRect();
  const margin = 20;
  const imgWidth = cropImg.offsetWidth || cropImg.width;
  const imgHeight = cropImg.offsetHeight || cropImg.height;
  selection = {
    x: margin,
    y: margin,
    width: Math.max(50, imgWidth - margin * 2),
    height: Math.max(50, imgHeight - margin * 2)
  };
  updateSelection();
}

function updateSelection() {
  cropSelection.style.left = selection.x + 'px';
  cropSelection.style.top = selection.y + 'px';
  cropSelection.style.width = selection.width + 'px';
  cropSelection.style.height = selection.height + 'px';
  cropSelection.style.display = 'block';
}

// Start dragging selection box
on(cropSelection, 'mousedown', (e) => {
  if (e.target.classList.contains('crop-handle')) {
    isResizing = true;
    resizeHandle = e.target.classList.contains('se') ? 'se' :
                   e.target.classList.contains('sw') ? 'sw' :
                   e.target.classList.contains('ne') ? 'ne' :
                   e.target.classList.contains('nw') ? 'nw' : null;
  } else {
    isDragging = true;
  }
  updateContainerRect();
  const mouseX = e.clientX - containerRect.left;
  const mouseY = e.clientY - containerRect.top;
  dragStart = { 
    x: mouseX, 
    y: mouseY,
    selX: selection.x,
    selY: selection.y,
    selWidth: selection.width,
    selHeight: selection.height
  };
  e.preventDefault();
  e.stopPropagation();
});

// Start new selection on overlay
on(cropOverlay, 'mousedown', (e) => {
  if (e.target === cropSelection || cropSelection.contains(e.target)) {
    return; // Don't start new selection if clicking on existing selection
  }
  updateContainerRect();
  const x = e.clientX - containerRect.left;
  const y = e.clientY - containerRect.top;
  selection.x = x;
  selection.y = y;
  selection.width = 0;
  selection.height = 0;
  isSelecting = true;
  dragStart = { x, y };
  updateSelection();
  e.preventDefault();
  e.stopPropagation();
});

// Mouse move
document.addEventListener('mousemove', (e) => {
  if (!isDragging && !isResizing && !isSelecting) return;
  
  updateContainerRect();
  const currentX = e.clientX - containerRect.left;
  const currentY = e.clientY - containerRect.top;
  const imgWidth = cropImg.offsetWidth || cropImg.width;
  const imgHeight = cropImg.offsetHeight || cropImg.height;
  
  if (isSelecting) {
    // Creating new selection
    const startX = Math.min(dragStart.x, currentX);
    const startY = Math.min(dragStart.y, currentY);
    const endX = Math.max(dragStart.x, currentX);
    const endY = Math.max(dragStart.y, currentY);
    
    selection.x = Math.max(0, Math.min(startX, imgWidth));
    selection.y = Math.max(0, Math.min(startY, imgHeight));
    selection.width = Math.max(20, Math.min(endX - startX, imgWidth - selection.x));
    selection.height = Math.max(20, Math.min(endY - startY, imgHeight - selection.y));
  } else if (isResizing && resizeHandle) {
    // Resizing from corner - use initial selection state stored in dragStart
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    
    const startX = dragStart.selX;
    const startY = dragStart.selY;
    const startWidth = dragStart.selWidth;
    const startHeight = dragStart.selHeight;
    
    if (resizeHandle === 'se') {
      // Southeast: resize bottom-right corner
      const newWidth = startWidth + deltaX;
      const newHeight = startHeight + deltaY;
      selection.width = Math.max(20, Math.min(newWidth, imgWidth - startX));
      selection.height = Math.max(20, Math.min(newHeight, imgHeight - startY));
      selection.x = startX;
      selection.y = startY;
    } else if (resizeHandle === 'sw') {
      // Southwest: resize bottom-left corner
      const newX = Math.max(0, Math.min(startX + deltaX, startX + startWidth - 20));
      selection.x = newX;
      selection.width = Math.max(20, Math.min(startX + startWidth - newX, imgWidth - newX));
      const newHeight = startHeight + deltaY;
      selection.height = Math.max(20, Math.min(newHeight, imgHeight - startY));
      selection.y = startY;
    } else if (resizeHandle === 'ne') {
      // Northeast: resize top-right corner
      const newWidth = startWidth + deltaX;
      selection.width = Math.max(20, Math.min(newWidth, imgWidth - startX));
      const newY = Math.max(0, Math.min(startY + deltaY, startY + startHeight - 20));
      selection.y = newY;
      selection.height = Math.max(20, Math.min(startY + startHeight - newY, imgHeight - newY));
      selection.x = startX;
    } else if (resizeHandle === 'nw') {
      // Northwest: resize top-left corner
      const newX = Math.max(0, Math.min(startX + deltaX, startX + startWidth - 20));
      selection.x = newX;
      selection.width = Math.max(20, Math.min(startX + startWidth - newX, imgWidth - newX));
      const newY = Math.max(0, Math.min(startY + deltaY, startY + startHeight - 20));
      selection.y = newY;
      selection.height = Math.max(20, Math.min(startY + startHeight - newY, imgHeight - newY));
    }
  } else if (isDragging) {
    // Dragging existing selection
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    const newX = dragStart.selX + deltaX;
    const newY = dragStart.selY + deltaY;
    
    selection.x = Math.max(0, Math.min(newX, imgWidth - selection.width));
    selection.y = Math.max(0, Math.min(newY, imgHeight - selection.height));
  }
  
  updateSelection();
});

// End dragging
document.addEventListener('mouseup', () => {
  if (isSelecting && selection.width > 0 && selection.height > 0) {
    // Selection complete
  }
  isDragging = false;
  isResizing = false;
  isSelecting = false;
  resizeHandle = null;
});

function cropImage() {
  if (!currentFile || selection.width === 0 || selection.height === 0) {
    toast('Please select an area to crop');
    return;
  }
  
  const canvas = document.createElement('canvas');
  const imgWidth = cropImg.offsetWidth || cropImg.width;
  const imgHeight = cropImg.offsetHeight || cropImg.height;
  const scaleX = cropImg.naturalWidth / imgWidth;
  const scaleY = cropImg.naturalHeight / imgHeight;
  
  canvas.width = selection.width * scaleX;
  canvas.height = selection.height * scaleY;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(
    cropImg,
    selection.x * scaleX, selection.y * scaleY,
    canvas.width, canvas.height,
    0, 0,
    canvas.width, canvas.height
  );
  
  canvas.toBlob((blob) => {
    croppedBlob = blob;
    const url = URL.createObjectURL(blob);
    outputArea.innerHTML = `
      <img src="${url}" alt="Cropped" style="max-width: 100%; max-height: calc(100% - 2rem); border-radius: 6px; object-fit: contain;">
      <p class="text-sm text-muted" style="margin-top: 0.5rem; text-align: center;">${Math.round(canvas.width)} × ${Math.round(canvas.height)} px</p>
    `;
    downloadBtn.disabled = false;
    toast(`Image cropped to ${Math.round(canvas.width)} × ${Math.round(canvas.height)} px`);
  }, currentFile.type || 'image/png', 0.95);
}

on(cropBtn, 'click', cropImage);
on(clearBtn, 'click', () => {
  currentFile = null;
  croppedBlob = null;
  cropImg.src = '';
  cropArea.style.display = 'none';
  dropZone.style.display = 'flex';
  outputArea.innerHTML = '<p>Upload an image to crop</p>';
  cropBtn.disabled = true;
  downloadBtn.disabled = true;
  fileInput.value = '';
  cropSelection.style.display = 'none';
});

on(downloadBtn, 'click', () => {
  if (croppedBlob) {
    const ext = currentFile.name.split('.').pop() || 'png';
    downloadFile(croppedBlob, `cropped.${ext}`, croppedBlob.type);
    toast('Image downloaded');
  }
});

// Update selection on window resize
window.addEventListener('resize', () => {
  if (cropArea.style.display !== 'none') {
    updateContainerRect();
    updateSelection();
  }
});

