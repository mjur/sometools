import { on, copy, downloadFile, qs, toast } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const output = qs('#output');
const languageSelect = qs('#language');
const minifyBtn = qs('#minify');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const inputStats = qs('#input-stats');
const outputStats = qs('#output-stats');

// Load state
const storageKey = 'code-minify-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.language) languageSelect.value = state.language;

function updateStats(textarea, statsEl) {
  const text = textarea.value;
  const chars = text.length;
  const lines = text.split('\n').length;
  statsEl.textContent = `${chars.toLocaleString()} characters, ${lines} lines`;
}

async function minify() {
  const code = input.value;
  const language = languageSelect.value;
  
  if (!code.trim()) {
    toast('Please enter code to minify');
    return;
  }
  
  try {
    let minified = '';
    
    if (language === 'javascript') {
      if (typeof Terser === 'undefined') {
        throw new Error('Terser library not loaded. Please refresh the page.');
      }
      
      // Verify Terser has the minify method
      if (typeof Terser.minify !== 'function') {
        throw new Error('Terser.minify is not a function. Terser may not be loaded correctly.');
      }
      
      // Use Terser with basic options - it may return a Promise
      let result;
      try {
        const minifyResult = Terser.minify(code, {
          compress: true,
          mangle: true,
        });
        
        // Handle both sync and async versions
        result = minifyResult instanceof Promise ? await minifyResult : minifyResult;
      } catch (e) {
        throw new Error(`Terser error: ${e.message}`);
      }
      
      if (result.error) {
        throw new Error(result.error.message || 'Minification failed');
      }
      
      // Check if code exists - Terser should always return code
      if (result.code === undefined || result.code === null) {
        throw new Error('Terser failed to minify - code may be invalid or too large. Try a smaller code sample.');
      } else if (typeof result.code !== 'string') {
        throw new Error(`Terser returned invalid result type: ${typeof result.code}`);
      } else {
        minified = result.code;
      }
    } else if (language === 'css') {
      // Try different possible global names for CleanCSS
      const CleanCSSLib = window.CleanCSS || window.cleanCSS || window.cleancss;
      
      if (!CleanCSSLib) {
        // Fallback: simple CSS minification
        minified = code
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
          .replace(/\s+/g, ' ') // Collapse whitespace
          .replace(/\s*{\s*/g, '{') // Remove spaces around {
          .replace(/\s*}\s*/g, '}') // Remove spaces around }
          .replace(/\s*:\s*/g, ':') // Remove spaces around :
          .replace(/\s*;\s*/g, ';') // Remove spaces around ;
          .replace(/\s*,\s*/g, ',') // Remove spaces around ,
          .trim();
      } else {
        try {
          const result = new CleanCSSLib({}).minify(code);
          if (result.errors && result.errors.length > 0) {
            throw new Error(result.errors.join(', '));
          }
          if (result.styles === undefined || result.styles === null) {
            // CleanCSS might return undefined in some cases
            minified = code.trim();
          } else if (typeof result.styles !== 'string') {
            throw new Error('CleanCSS returned invalid result type');
          } else {
            minified = result.styles;
          }
        } catch (e) {
          // If CleanCSS fails, use fallback
          minified = code
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*:\s*/g, ':')
            .replace(/\s*;\s*/g, ';')
            .replace(/\s*,\s*/g, ',')
            .trim();
        }
      }
    } else if (language === 'html') {
      // Try different possible global names for HTMLMinifier
      const htmlMinifier = window.minify || window.HTMLMinifier || window.htmlminifier;
      
      // Check if it's a function or has a minify method
      const hasMinifyFunction = htmlMinifier && (
        typeof htmlMinifier === 'function' || 
        typeof htmlMinifier.minify === 'function'
      );
      
      if (!hasMinifyFunction) {
        // Fallback: simple HTML minification
        minified = code
          .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
          .replace(/>\s+</g, '><') // Remove whitespace between tags
          .replace(/\s+/g, ' ') // Collapse whitespace
          .replace(/\s*>\s*/g, '>') // Remove spaces around >
          .replace(/\s*<\s*/g, '<') // Remove spaces around <
          .trim();
      } else {
        try {
          // Try as function first, then as object with minify method
          if (typeof htmlMinifier === 'function') {
            minified = htmlMinifier(code, {
              collapseWhitespace: true,
              removeComments: true,
              removeEmptyAttributes: true,
              removeRedundantAttributes: true,
              minifyCSS: true,
              minifyJS: true,
            });
          } else {
            minified = htmlMinifier.minify(code, {
              collapseWhitespace: true,
              removeComments: true,
              removeEmptyAttributes: true,
              removeRedundantAttributes: true,
              minifyCSS: true,
              minifyJS: true,
            });
          }
          
          // Ensure result is a string
          if (typeof minified !== 'string') {
            throw new Error('HTMLMinifier returned non-string result');
          }
        } catch (e) {
          // If minify fails, use fallback
          minified = code
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/>\s+</g, '><')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }
    }
    
    // Validate minified result
    if (typeof minified !== 'string') {
      throw new Error(`Minification returned invalid result type: ${typeof minified}`);
    }
    
    // Ensure we have a valid result (should already be handled above, but safety check)
    if (minified === '' && code.trim().length > 0) {
      minified = code.trim();
    }
    
    output.value = minified;
    updateStats(input, inputStats);
    updateStats(output, outputStats);
    
    const originalLength = code.length;
    const minifiedLength = minified.length;
    const reduction = originalLength > 0 
      ? ((1 - minifiedLength / originalLength) * 100).toFixed(1)
      : '0.0';
    
    // Show more detailed info
    const sizeInfo = `${originalLength.toLocaleString()} → ${minifiedLength.toLocaleString()} chars`;
    const reductionMsg = parseFloat(reduction) > 0 
      ? `${reduction}% reduction`
      : 'No reduction (code may already be minified or too simple)';
    toast(`Minified: ${sizeInfo} (${reductionMsg})`);
    
    saveStateWithStorage(storageKey, {
      input: code,
      language,
    });
  } catch (error) {
    toast(`Error: ${error.message}`);
    console.error('Minification error:', error);
  }
}

on(minifyBtn, 'click', minify);
on(copyInputBtn, 'click', async () => {
  await copy(input.value);
  toast('Input copied');
});
on(copyOutputBtn, 'click', async () => {
  await copy(output.value);
  toast('Output copied');
});
on(downloadBtn, 'click', () => {
  const ext = languageSelect.value === 'javascript' ? 'js' : languageSelect.value;
  downloadFile(output.value, `minified.${ext}`, `text/${languageSelect.value}`);
  toast('File downloaded');
});
on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  updateStats(input, inputStats);
  updateStats(output, outputStats);
  saveStateWithStorage(storageKey, { input: '', language: languageSelect.value });
});

on(input, 'input', () => {
  updateStats(input, inputStats);
  saveStateWithStorage(storageKey, { input: input.value, language: languageSelect.value });
});

// Initial stats
updateStats(input, inputStats);
updateStats(output, outputStats);

