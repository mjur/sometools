import { toast, on, qs, copy } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const barcodeType = qs('#barcode-type');
const barcodeContainer = qs('#barcode-container');
const generateBtn = qs('#generate');
const copyInputBtn = qs('#copy-input');
const downloadBtn = qs('#download');

const storageKey = 'barcode-generator-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.type) barcodeType.value = state.type;

let currentBarcodeDataURL = null;

function generateBarcode() {
  const text = input.value.trim();
  const type = barcodeType.value;
  
  if (!text) {
    barcodeContainer.innerHTML = '<p style="color: var(--muted);">Enter data above to generate barcode</p>';
    currentBarcodeDataURL = null;
    return;
  }
  
  if (typeof JsBarcode === 'undefined') {
    barcodeContainer.innerHTML = '<p style="color: var(--error);">Barcode library not loaded. Please refresh the page.</p>';
    return;
  }
  
  try {
    barcodeContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    barcodeContainer.appendChild(canvas);
    
    JsBarcode(canvas, text, {
      format: type,
      width: 2,
      height: 100,
      displayValue: true
    });
    
    currentBarcodeDataURL = canvas.toDataURL('image/png');
    
    saveStateWithStorage(storageKey, {
      input: text,
      type: type
    });
  } catch (error) {
    barcodeContainer.innerHTML = `<p style="color: var(--error);">Error generating barcode: ${error.message}</p>`;
    currentBarcodeDataURL = null;
  }
}

on(generateBtn, 'click', generateBarcode);
on(barcodeType, 'change', generateBarcode);
on(input, 'input', () => {
  if (input.value.trim()) {
    generateBarcode();
  }
});
on(copyInputBtn, 'click', async () => {
  await copy(input.value);
  toast('Input copied');
});
on(downloadBtn, 'click', () => {
  if (currentBarcodeDataURL) {
    const link = document.createElement('a');
    link.download = `barcode-${Date.now()}.png`;
    link.href = currentBarcodeDataURL;
    link.click();
  } else {
    toast('No barcode to download', 'error');
  }
});

// Auto-generate if there's saved state
if (state?.input) {
  setTimeout(() => generateBarcode(), 100);
}

