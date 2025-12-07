import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { on, qs } from '/js/ui.js';

const foregroundColor = qs('#foreground-color');
const foregroundHex = qs('#foreground-hex');
const backgroundColor = qs('#background-color');
const backgroundHex = qs('#background-hex');
const preview = qs('#preview');
const results = qs('#results');

// Load state from localStorage
const storageKey = 'color-contrast-state';
const state = loadStateWithStorage(storageKey);
if (state?.foreground) {
  foregroundColor.value = state.foreground;
  foregroundHex.value = state.foreground;
}
if (state?.background) {
  backgroundColor.value = state.background;
  backgroundHex.value = state.background;
}

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance
function getLuminance(rgb) {
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Validate hex color
function isValidHex(hex) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

// Update preview and results
function update() {
  const fgHex = foregroundHex.value.trim();
  const bgHex = backgroundHex.value.trim();
  
  // Validate colors
  if (!isValidHex(fgHex) || !isValidHex(bgHex)) {
    preview.style.color = '#000000';
    preview.style.backgroundColor = '#ffffff';
    results.innerHTML = '<div style="color: var(--text-muted);">Enter valid hex colors (e.g., #000000 or #fff)</div>';
    return;
  }
  
  // Sync color pickers
  foregroundColor.value = fgHex;
  backgroundColor.value = bgHex;
  
  // Update preview
  preview.style.color = fgHex;
  preview.style.backgroundColor = bgHex;
  
  // Calculate contrast
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);
  
  if (!fgRgb || !bgRgb) {
    results.innerHTML = '<div style="color: var(--error);">Invalid color values</div>';
    return;
  }
  
  const ratio = getContrastRatio(fgRgb, bgRgb);
  const ratioFormatted = ratio.toFixed(2);
  
  // WCAG levels
  const normalAA = ratio >= 4.5;
  const largeAA = ratio >= 3;
  const normalAAA = ratio >= 7;
  const largeAAA = ratio >= 4.5;
  
  // Build results HTML
  let html = `<div class="contrast-ratio">${ratioFormatted}:1</div>`;
  
  html += '<div style="margin-top: 1rem;">';
  html += '<strong>WCAG Compliance:</strong><br>';
  
  // Normal text
  html += '<div style="margin-top: 0.5rem;">';
  html += '<strong>Normal Text:</strong><br>';
  html += `<span class="wcag-level ${normalAA ? 'wcag-pass' : 'wcag-fail'}">`;
  html += `Level AA: ${normalAA ? '✓ Pass' : '✗ Fail'} (requires 4.5:1)`;
  html += '</span><br>';
  html += `<span class="wcag-level ${normalAAA ? 'wcag-pass' : 'wcag-fail'}">`;
  html += `Level AAA: ${normalAAA ? '✓ Pass' : '✗ Fail'} (requires 7:1)`;
  html += '</span>';
  html += '</div>';
  
  // Large text
  html += '<div style="margin-top: 0.5rem;">';
  html += '<strong>Large Text (18pt+ or 14pt+ bold):</strong><br>';
  html += `<span class="wcag-level ${largeAA ? 'wcag-pass' : 'wcag-fail'}">`;
  html += `Level AA: ${largeAA ? '✓ Pass' : '✗ Fail'} (requires 3:1)`;
  html += '</span><br>';
  html += `<span class="wcag-level ${largeAAA ? 'wcag-pass' : 'wcag-fail'}">`;
  html += `Level AAA: ${largeAAA ? '✓ Pass' : '✗ Fail'} (requires 4.5:1)`;
  html += '</span>';
  html += '</div>';
  
  html += '</div>';
  
  results.innerHTML = html;
  
  // Save state
  saveStateWithStorage({
    foreground: fgHex,
    background: bgHex
  }, storageKey);
}

// Sync color picker to text input
on(foregroundColor, 'input', (e) => {
  foregroundHex.value = e.target.value;
  update();
});

on(backgroundColor, 'input', (e) => {
  backgroundHex.value = e.target.value;
  update();
});

// Sync text input to color picker
on(foregroundHex, 'input', () => {
  if (isValidHex(foregroundHex.value)) {
    foregroundColor.value = foregroundHex.value;
  }
  update();
});

on(backgroundHex, 'input', () => {
  if (isValidHex(backgroundHex.value)) {
    backgroundColor.value = backgroundHex.value;
  }
  update();
});

// Initial update
update();

