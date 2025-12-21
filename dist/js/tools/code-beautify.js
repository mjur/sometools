import { on, copy, downloadFile, qs, toast } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const output = qs('#output');
const languageSelect = qs('#language');
const indentSelect = qs('#indent');
const beautifyBtn = qs('#beautify');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');

// Load state
const storageKey = 'code-beautify-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.language) languageSelect.value = state.language;
if (state?.indent) indentSelect.value = state.indent;

function beautify() {
  const code = input.value;
  const language = languageSelect.value;
  const indentValue = indentSelect.value;
  
  if (!code.trim()) {
    toast('Please enter code to beautify');
    return;
  }
  
  try {
    let beautified = '';
    const indent = indentValue === 'tab' ? '\t' : parseInt(indentValue);
    
    if (typeof js_beautify === 'undefined') {
      throw new Error('js-beautify library not loaded');
    }
    
    if (language === 'javascript') {
      beautified = js_beautify(code, {
        indent_size: indent,
        indent_char: indent === '\t' ? '\t' : ' ',
        preserve_newlines: true,
        max_preserve_newlines: 2,
        wrap_line_length: 0,
      });
    } else if (language === 'css') {
      beautified = css_beautify(code, {
        indent_size: indent,
        indent_char: indent === '\t' ? '\t' : ' ',
      });
    } else if (language === 'html') {
      beautified = html_beautify(code, {
        indent_size: indent,
        indent_char: indent === '\t' ? '\t' : ' ',
        wrap_line_length: 0,
        preserve_newlines: true,
      });
    }
    
    output.value = beautified;
    toast('Code beautified successfully');
    
    saveStateWithStorage(storageKey, {
      input: code,
      language,
      indent: indentValue,
    });
  } catch (error) {
    toast(`Error: ${error.message}`);
    console.error('Beautification error:', error);
  }
}

on(beautifyBtn, 'click', beautify);
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
  downloadFile(output.value, `beautified.${ext}`, `text/${languageSelect.value}`);
  toast('File downloaded');
});
on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  saveStateWithStorage(storageKey, { input: '', language: languageSelect.value, indent: indentSelect.value });
});

on(input, 'input', () => {
  saveStateWithStorage(storageKey, { input: input.value, language: languageSelect.value, indent: indentSelect.value });
});


