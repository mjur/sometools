import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';

const input = qs('#input');
const output = qs('#output');
const estimateBtn = qs('#estimate');
const copyBtn = qs('#copy');

// Load state from URL or localStorage
const storageKey = 'compression-estimator-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function compress(data, format) {
  const encoder = new TextEncoder();
  const stream = new CompressionStream(format);
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  writer.write(encoder.encode(data));
  writer.close();
  
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  return totalLength;
}

async function estimate() {
  const text = input.value;
  
  if (!text) {
    output.textContent = 'Enter text to estimate compression';
    output.className = '';
    return;
  }
  
  const originalSize = new TextEncoder().encode(text).length;
  
  try {
    output.textContent = 'Compressing...';
    output.className = '';
    
    const gzipSize = await compress(text, 'gzip');
    
    let result = 'Compression Results\n';
    result += '='.repeat(50) + '\n\n';
    result += `Original Size: ${formatBytes(originalSize)} (${originalSize} bytes)\n\n`;
    result += `Gzip Size: ${formatBytes(gzipSize)} (${gzipSize} bytes)\n`;
    result += `Gzip Ratio: ${((1 - gzipSize / originalSize) * 100).toFixed(2)}% reduction\n\n`;
    
    // Try brotli if available
    try {
      const brotliActual = await compress(text, 'br');
      result += `Brotli Size: ${formatBytes(brotliActual)} (${brotliActual} bytes)\n`;
      result += `Brotli Ratio: ${((1 - brotliActual / originalSize) * 100).toFixed(2)}% reduction\n`;
    } catch (e) {
      // Brotli not available in all browsers
      result += `Brotli: Not available in this browser\n`;
    }
    
    output.textContent = result;
    output.className = 'ok';
    
    // Save state
    saveStateWithStorage({ input: text }, storageKey);
  } catch (error) {
    output.textContent = `Error: ${error.message}\n\nNote: CompressionStream API may not be available in all browsers.`;
    output.className = 'error';
  }
}

// Estimate button
on(estimateBtn, 'click', estimate);

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    estimate();
  }
});

// Copy button
on(copyBtn, 'click', async () => {
  await copy(input.value, 'Input copied to clipboard!');
});

// Auto-estimate on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (input.value.trim()) {
      estimate();
    }
  }, 1000);
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
    estimate();
  }
}

// Initial estimate if there's content
if (input.value) {
  estimate();
}

