import { toast, on, qs, copy } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const imagePreview = qs('#image-preview');
const previewImg = qs('#preview-img');
const imageInfo = qs('#image-info');
const outputArea = qs('#output-area');
const extractBtn = qs('#extract');
const clearBtn = qs('#clear');

let currentFile = null;
let canvas = null;
let ctx = null;

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
      canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      imageInfo.textContent = `${img.width} × ${img.height} px`;
      extractBtn.disabled = false;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Click on image to pick color
on(previewImg, 'click', (e) => {
  if (!canvas) return;
  
  const rect = previewImg.getBoundingClientRect();
  const scaleX = canvas.width / previewImg.offsetWidth;
  const scaleY = canvas.height / previewImg.offsetHeight;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  
  const pixel = ctx.getImageData(x, y, 1, 1);
  const [r, g, b, a] = pixel.data;
  showColor(r, g, b, a);
});

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function showColor(r, g, b, a) {
  const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  const [h, s, l] = rgbToHsl(r, g, b);
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const rgba = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
  const hsl = `hsl(${h}, ${s}%, ${l}%)`;
  
  outputArea.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg); border-radius: 6px;">
        <div style="width: 80px; height: 80px; border-radius: 6px; background: ${hex}; border: 2px solid var(--border);"></div>
        <div style="flex: 1;">
          <div style="margin-bottom: 0.5rem;"><strong>HEX:</strong> <code>${hex}</code> <button class="copy-color" data-color="${hex}" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.875rem;">Copy</button></div>
          <div style="margin-bottom: 0.5rem;"><strong>RGB:</strong> <code>${rgb}</code> <button class="copy-color" data-color="${rgb}" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.875rem;">Copy</button></div>
          <div style="margin-bottom: 0.5rem;"><strong>RGBA:</strong> <code>${rgba}</code> <button class="copy-color" data-color="${rgba}" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.875rem;">Copy</button></div>
          <div><strong>HSL:</strong> <code>${hsl}</code> <button class="copy-color" data-color="${hsl}" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.875rem;">Copy</button></div>
        </div>
      </div>
    </div>
  `;
  
  // Add copy handlers
  outputArea.querySelectorAll('.copy-color').forEach(btn => {
    btn.addEventListener('click', async () => {
      await copy(btn.dataset.color);
      toast('Color copied to clipboard');
    });
  });
}

function extractColors() {
  if (!canvas) {
    toast('Please upload an image first');
    return;
  }
  
  extractBtn.disabled = true;
  extractBtn.textContent = 'Extracting...';
  outputArea.innerHTML = '<p style="color: var(--muted);">Extracting colors, please wait...</p>';
  
  // Use requestAnimationFrame to avoid blocking the UI
  setTimeout(() => {
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const colorMap = new Map();
      
      // Process all pixels (with quantization to group similar colors)
      // Quantize to reduce similar shades while keeping distinct colors
      const quantizeStep = 5; // Group colors within 5 RGB units
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        
        if (a < 128) continue; // Skip transparent pixels
        
        // Quantize colors to group similar shades
        const qr = Math.round(r / quantizeStep) * quantizeStep;
        const qg = Math.round(g / quantizeStep) * quantizeStep;
        const qb = Math.round(b / quantizeStep) * quantizeStep;
        const key = `${qr},${qg},${qb}`;
        
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }
      
      // Sort by frequency (hash count) - most frequent first
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
        .map(([key, count]) => ({
          rgb: key.split(',').map(Number),
          count: count
        }));
  
      let html = `<div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-elev); border-radius: 6px; border: 1px solid var(--border);">
        <strong>Total unique colors found: ${sortedColors.length}</strong>
      </div>`;
      html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; max-height: 600px; overflow-y: auto;">';
      
      sortedColors.forEach(({ rgb: [r, g, b], count }) => {
        const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
        const [h, s, l] = rgbToHsl(r, g, b);
        const rgb = `rgb(${r}, ${g}, ${b})`;
        const hsl = `hsl(${h}, ${s}%, ${l}%)`;
        
        html += `
          <div style="padding: 1rem; background: var(--bg); border-radius: 6px; border: 1px solid var(--border);">
            <div style="width: 100%; height: 60px; border-radius: 4px; background: ${hex}; margin-bottom: 0.5rem; border: 1px solid var(--border);"></div>
            <div style="font-size: 0.875rem;">
              <div style="margin-bottom: 0.25rem;"><strong>HEX:</strong> <code>${hex}</code></div>
              <div style="margin-bottom: 0.25rem;"><strong>RGB:</strong> <code>${rgb}</code></div>
              <div style="margin-bottom: 0.25rem;"><strong>HSL:</strong> <code>${hsl}</code></div>
              <div style="margin-top: 0.5rem; color: var(--muted); font-size: 0.75rem;">Frequency: ${count.toLocaleString()} pixels</div>
            </div>
            <div style="margin-top: 0.5rem; display: flex; gap: 0.25rem; flex-wrap: wrap;">
              <button class="copy-color" data-color="${hex}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Copy HEX</button>
              <button class="copy-color" data-color="${rgb}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Copy RGB</button>
              <button class="copy-color" data-color="${hsl}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Copy HSL</button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      outputArea.innerHTML = html;
      
      // Add copy handlers
      outputArea.querySelectorAll('.copy-color').forEach(btn => {
        btn.addEventListener('click', async () => {
          await copy(btn.dataset.color);
          toast('Color copied to clipboard');
        });
      });
      
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract Colors';
      toast(`Extracted ${sortedColors.length} unique colors (sorted by frequency)`);
    } catch (error) {
      console.error('Error extracting colors:', error);
      toast(`Error extracting colors: ${error.message}`);
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract Colors';
      outputArea.innerHTML = '<p style="color: var(--error);">Error extracting colors. Please try again.</p>';
    }
  }, 10);
}

on(extractBtn, 'click', extractColors);
on(clearBtn, 'click', () => {
  currentFile = null;
  canvas = null;
  ctx = null;
  previewImg.src = '';
  imagePreview.style.display = 'none';
  dropZone.style.display = 'flex';
  outputArea.innerHTML = '<p>Upload an image to extract colors</p>';
  extractBtn.disabled = true;
  fileInput.value = '';
});

