import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, qs } from '/js/ui.js';

const input = qs('#input');
const qrContainer = qs('#qr-container');
const generateBtn = qs('#generate');
const copyInputBtn = qs('#copy-input');
const downloadBtn = qs('#download');

// Load QRCode library dynamically
let QRCode = null;
async function loadQRCode() {
  if (QRCode) return true;
  try {
    // Use esm.sh for better ES module support
    const qrModule = await import('https://esm.sh/qrcode@1.5.3');
    QRCode = qrModule.default || qrModule;
    return true;
  } catch (error) {
    console.error('Failed to load QRCode library:', error);
    // Try alternative CDN
    try {
      const qrModule = await import('https://cdn.skypack.dev/qrcode@1.5.3');
      QRCode = qrModule.default || qrModule;
      return true;
    } catch (error2) {
      console.error('Failed to load QRCode from alternative CDN:', error2);
      return false;
    }
  }
}

// Preload QRCode
loadQRCode();

// Load state from URL or localStorage
const storageKey = 'qr-generator-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
  if (state.input) {
    // Wait a bit for library to load
    setTimeout(() => generateQR(), 500);
  }
}

let currentQRDataURL = null;

async function generateQR() {
  const text = input.value.trim();
  
  if (!text) {
    qrContainer.innerHTML = '<p style="color: var(--muted);">Enter text above to generate QR code</p>';
    currentQRDataURL = null;
    return;
  }
  
  const loaded = await loadQRCode();
  if (!loaded || !QRCode) {
    qrContainer.innerHTML = '<p style="color: var(--error);">QR Code library not loaded. Please refresh the page.</p>';
    return;
  }
  
  try {
    qrContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    qrContainer.appendChild(canvas);
    
    await QRCode.toCanvas(canvas, text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    currentQRDataURL = canvas.toDataURL('image/png');
    
    // Save state
    saveStateWithStorage({ input: text }, storageKey);
  } catch (error) {
    qrContainer.innerHTML = `<p style="color: var(--error);">Error generating QR code: ${error.message}</p>`;
    currentQRDataURL = null;
  }
}

// Generate button
on(generateBtn, 'click', generateQR);

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generateQR();
  }
});

// Copy input button
on(copyInputBtn, 'click', async () => {
  if (input.value) {
    await navigator.clipboard.writeText(input.value);
    toast('Text copied to clipboard!', 'success');
  } else {
    toast('No text to copy', 'error');
  }
});

// Download button
on(downloadBtn, 'click', () => {
  if (!currentQRDataURL) {
    toast('No QR code to download', 'error');
    return;
  }
  
  const a = document.createElement('a');
  a.href = currentQRDataURL;
  a.download = 'qrcode.png';
  a.click();
  toast('QR code downloaded', 'success');
});

// Auto-generate on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    generateQR();
  }, 500);
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
    generateQR();
  }
}


