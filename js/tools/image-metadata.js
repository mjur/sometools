import { toast, on, qs } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const imageInfo = qs('#image-info');
const metadataArea = qs('#metadata-area');
const clearBtn = qs('#clear');

let currentFile = null;

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
    previewImg.src = e.target.result;
    imagePreview.style.display = 'flex';
    dropZone.style.display = 'none';
    
    const img = new Image();
    img.onload = () => {
      imageInfo.textContent = `${img.width} × ${img.height} px, ${(file.size / 1024).toFixed(2)} KB`;
      
      // Load EXIF data
      if (typeof EXIF !== 'undefined') {
        EXIF.getData(img, function() {
          displayMetadata(this);
        });
      } else {
        displayBasicMetadata(file, img);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function displayBasicMetadata(file, img) {
  let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
  html += `<div><strong>File Name:</strong> ${file.name}</div>`;
  html += `<div><strong>File Size:</strong> ${(file.size / 1024).toFixed(2)} KB</div>`;
  html += `<div><strong>File Type:</strong> ${file.type}</div>`;
  html += `<div><strong>Dimensions:</strong> ${img.width} × ${img.height} px</div>`;
  html += `<div><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</div>`;
  html += '</div>';
  html += '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted);">EXIF library not loaded. Install exif-js for full metadata support.</div>';
  metadataArea.innerHTML = html;
}

function displayMetadata(img) {
  let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
  
  // Basic file info
  html += '<h3 style="margin-bottom: 0.5rem;">File Information</h3>';
  html += `<div><strong>File Name:</strong> ${currentFile.name}</div>`;
  html += `<div><strong>File Size:</strong> ${(currentFile.size / 1024).toFixed(2)} KB</div>`;
  html += `<div><strong>File Type:</strong> ${currentFile.type}</div>`;
  html += `<div><strong>Dimensions:</strong> ${img.width} × ${img.height} px</div>`;
  html += `<div><strong>Last Modified:</strong> ${new Date(currentFile.lastModified).toLocaleString()}</div>`;
  
  // EXIF data
  const allTags = EXIF.getAllTags(img);
  if (Object.keys(allTags).length > 0) {
    html += '<h3 style="margin-top: 1rem; margin-bottom: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">EXIF Data</h3>';
    
    // Camera info
    if (allTags.Make || allTags.Model) {
      html += '<div style="margin-bottom: 0.5rem;"><strong>Camera:</strong> ';
      if (allTags.Make) html += allTags.Make;
      if (allTags.Make && allTags.Model) html += ' ';
      if (allTags.Model) html += allTags.Model;
      html += '</div>';
    }
    
    // Date taken
    if (allTags.DateTimeOriginal) {
      html += `<div><strong>Date Taken:</strong> ${allTags.DateTimeOriginal}</div>`;
    } else if (allTags.DateTime) {
      html += `<div><strong>Date:</strong> ${allTags.DateTime}</div>`;
    }
    
    // Camera settings
    if (allTags.ExposureTime) html += `<div><strong>Exposure Time:</strong> ${allTags.ExposureTime}s</div>`;
    if (allTags.FNumber) html += `<div><strong>F-Number:</strong> f/${allTags.FNumber}</div>`;
    if (allTags.ISO) html += `<div><strong>ISO:</strong> ${allTags.ISO}</div>`;
    if (allTags.FocalLength) html += `<div><strong>Focal Length:</strong> ${allTags.FocalLength}mm</div>`;
    if (allTags.Flash) html += `<div><strong>Flash:</strong> ${allTags.Flash === 1 ? 'Yes' : 'No'}</div>`;
    if (allTags.Orientation) html += `<div><strong>Orientation:</strong> ${allTags.Orientation}</div>`;
    
    // GPS
    if (allTags.GPSLatitude && allTags.GPSLongitude) {
      html += '<h3 style="margin-top: 1rem; margin-bottom: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">Location</h3>';
      html += `<div><strong>Latitude:</strong> ${allTags.GPSLatitude}°</div>`;
      html += `<div><strong>Longitude:</strong> ${allTags.GPSLongitude}°</div>`;
      const lat = allTags.GPSLatitude;
      const lon = allTags.GPSLongitude;
      html += `<div style="margin-top: 0.5rem;"><a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" style="color: var(--accent);">View on Google Maps</a></div>`;
    }
    
    // All other tags
    const otherTags = Object.keys(allTags).filter(key => 
      !['Make', 'Model', 'DateTimeOriginal', 'DateTime', 'ExposureTime', 'FNumber', 
        'ISO', 'FocalLength', 'Flash', 'Orientation', 'GPSLatitude', 'GPSLongitude'].includes(key)
    );
    
    if (otherTags.length > 0) {
      html += '<h3 style="margin-top: 1rem; margin-bottom: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">Other Metadata</h3>';
      otherTags.forEach(key => {
        html += `<div><strong>${key}:</strong> ${allTags[key]}</div>`;
      });
    }
  } else {
    html += '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted);">No EXIF data found in this image.</div>';
  }
  
  html += '</div>';
  metadataArea.innerHTML = html;
}

on(clearBtn, 'click', () => {
  currentFile = null;
  previewImg.src = '';
  imagePreview.style.display = 'none';
  dropZone.style.display = 'flex';
  metadataArea.innerHTML = '<p style="color: var(--muted);">Upload an image to view metadata</p>';
  fileInput.value = '';
});

