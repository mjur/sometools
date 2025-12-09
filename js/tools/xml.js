import { on, copy, qs, toast } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const output = qs('#output');
const indentSelect = qs('#indent');
const validateBtn = qs('#validate');
const formatBtn = qs('#format');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const clearBtn = qs('#clear');
const validationStatus = qs('#validation-status');

// Load state
const storageKey = 'xml-tool-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.indent) indentSelect.value = state.indent;

function validateXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const parseError = xmlDoc.querySelector('parsererror');
  
  if (parseError) {
    return {
      valid: false,
      error: parseError.textContent,
    };
  }
  
  return {
    valid: true,
    message: 'XML is valid',
  };
}

function formatXML(xmlString) {
  const indentValue = indentSelect.value;
  const indent = indentValue === 'tab' ? '\t' : ' '.repeat(parseInt(indentValue));
  
  try {
    if (typeof html_beautify !== 'undefined') {
      // Use html_beautify for XML formatting (similar structure)
      return html_beautify(xmlString, {
        indent_size: indentValue === 'tab' ? 1 : parseInt(indentValue),
        indent_char: indentValue === 'tab' ? '\t' : ' ',
        wrap_line_length: 0,
        preserve_newlines: true,
      });
    }
    
    // Fallback: simple formatting
    let formatted = '';
    let indentLevel = 0;
    const regex = /(>)(<)(\/*)/g;
    xmlString = xmlString.replace(/>\s+</g, '><');
    xmlString = xmlString.replace(regex, '$1\n$2$3');
    
    const parts = xmlString.split('\n');
    for (const part of parts) {
      if (!part.trim()) continue;
      
      const indent = indentValue === 'tab' ? '\t' : ' '.repeat(parseInt(indentValue));
      const currentIndent = indent.repeat(indentLevel);
      
      if (part.match(/^<\w[^>]*[^/]>.*$/)) {
        formatted += currentIndent + part + '\n';
        indentLevel++;
      } else if (part.match(/^<\/\w/)) {
        indentLevel--;
        formatted += indent.repeat(indentLevel) + part + '\n';
      } else {
        formatted += currentIndent + part + '\n';
      }
    }
    
    return formatted.trim();
  } catch (error) {
    throw new Error(`Formatting failed: ${error.message}`);
  }
}

function validate() {
  const xml = input.value.trim();
  
  if (!xml) {
    toast('Please enter XML to validate');
    return;
  }
  
  const result = validateXML(xml);
  
  if (result.valid) {
    validationStatus.innerHTML = `<div style="color: var(--ok); padding: 0.5rem; background-color: rgba(46, 125, 50, 0.1); border-radius: 4px;">✓ ${result.message}</div>`;
    output.value = result.message;
  } else {
    validationStatus.innerHTML = `<div style="color: var(--error); padding: 0.5rem; background-color: rgba(211, 47, 47, 0.1); border-radius: 4px;">✗ ${result.error}</div>`;
    output.value = `Error: ${result.error}`;
  }
  
  saveStateWithStorage(storageKey, { input: xml, indent: indentSelect.value });
}

function format() {
  const xml = input.value.trim();
  
  if (!xml) {
    toast('Please enter XML to format');
    return;
  }
  
  // First validate
  const validation = validateXML(xml);
  if (!validation.valid) {
    validationStatus.innerHTML = `<div style="color: var(--error); padding: 0.5rem; background-color: rgba(211, 47, 47, 0.1); border-radius: 4px;">✗ Cannot format invalid XML: ${validation.error}</div>`;
    output.value = `Error: ${validation.error}`;
    return;
  }
  
  try {
    const formatted = formatXML(xml);
    output.value = formatted;
    validationStatus.innerHTML = `<div style="color: var(--ok); padding: 0.5rem; background-color: rgba(46, 125, 50, 0.1); border-radius: 4px;">✓ XML formatted successfully</div>`;
    toast('XML formatted successfully');
    
    saveStateWithStorage(storageKey, { input: xml, indent: indentSelect.value });
  } catch (error) {
    validationStatus.innerHTML = `<div style="color: var(--error); padding: 0.5rem; background-color: rgba(211, 47, 47, 0.1); border-radius: 4px;">✗ ${error.message}</div>`;
    output.value = `Error: ${error.message}`;
    toast(`Error: ${error.message}`);
  }
}

on(validateBtn, 'click', validate);
on(formatBtn, 'click', format);
on(copyInputBtn, 'click', async () => {
  await copy(input.value);
  toast('Input copied');
});
on(copyOutputBtn, 'click', async () => {
  await copy(output.value);
  toast('Output copied');
});
on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  validationStatus.innerHTML = '';
  saveStateWithStorage(storageKey, { input: '', indent: indentSelect.value });
});


