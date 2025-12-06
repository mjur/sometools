import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';

const input = qs('#input');
const output = qs('#output');
const inputFormat = qs('#input-format');
const outputFormat = qs('#output-format');
const runBtn = qs('#run');
const inputCopyBtn = qs('#input-copy');
const outputCopyBtn = qs('#output-copy');
const downloadBtn = qs('#download');
const exampleBtn = qs('#input-example');

// Load state from URL or localStorage
const storageKey = 'csv-converter-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
}
if (state?.inputFormat) {
  inputFormat.value = state.inputFormat;
}
if (state?.outputFormat) {
  outputFormat.value = state.outputFormat;
}

// Example CSV
const exampleCSV = `name,age,email,city
John Doe,30,john@example.com,New York
Jane Smith,25,jane@example.com,Los Angeles
Bob Johnson,35,bob@example.com,Chicago`;

// Parse CSV/TSV to array of objects
function parseDelimited(text, delimiter) {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      // Try to parse as number or boolean
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (value === '') value = null;
      else if (!isNaN(value) && value !== '') {
        const num = Number(value);
        if (!isNaN(num)) value = num;
      }
      row[header] = value;
    });
    rows.push(row);
  }
  
  return rows;
}

// Convert array of objects to CSV/TSV
function toDelimited(data, delimiter) {
  if (!Array.isArray(data) || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const lines = [headers.join(delimiter)];
  
  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];
      if (value === null || value === undefined) value = '';
      else if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    lines.push(values.join(delimiter));
  }
  
  return lines.join('\n');
}

// Convert JSON to array of objects
function jsonToArray(jsonData) {
  if (Array.isArray(jsonData)) {
    return jsonData;
  } else if (typeof jsonData === 'object' && jsonData !== null) {
    // If it's a single object, wrap it in an array
    return [jsonData];
  }
  return [];
}

function convert() {
  const inputText = input.value.trim();
  const inFormat = inputFormat.value;
  const outFormat = outputFormat.value;
  
  if (!inputText) {
    output.value = '';
    return;
  }
  
  if (inFormat === outFormat) {
    output.value = inputText;
    saveStateWithStorage({ input: inputText, inputFormat: inFormat, outputFormat: outFormat }, storageKey);
    return;
  }
  
  try {
    let data;
    
    // Parse input
    if (inFormat === 'json') {
      const result = safeParse(inputText);
      if (!result.success) {
        output.value = `Error: Invalid JSON\n${result.error?.message || 'Failed to parse JSON'}`;
        output.className = 'error';
        return;
      }
      data = jsonToArray(result.data);
    } else {
      const delimiter = inFormat === 'csv' ? ',' : '\t';
      data = parseDelimited(inputText, delimiter);
    }
    
    // Convert to output format
    let outputText;
    if (outFormat === 'json') {
      outputText = JSON.stringify(data, null, 2);
    } else {
      const delimiter = outFormat === 'csv' ? ',' : '\t';
      outputText = toDelimited(data, delimiter);
    }
    
    output.value = outputText;
    output.className = 'ok';
    
    // Save state
    saveStateWithStorage({
      input: inputText,
      inputFormat: inFormat,
      outputFormat: outFormat
    }, storageKey);
  } catch (error) {
    output.value = `Error: ${error.message}`;
    output.className = 'error';
  }
}

// Convert button
on(runBtn, 'click', convert);

// Format change triggers conversion
on(inputFormat, 'change', () => {
  if (input.value.trim()) {
    convert();
  }
});

on(outputFormat, 'change', () => {
  if (input.value.trim()) {
    convert();
  }
});

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    convert();
  }
});

// Copy buttons
on(inputCopyBtn, 'click', async () => {
  await copy(input.value, 'Input copied to clipboard!');
});

on(outputCopyBtn, 'click', async () => {
  if (output.value) {
    await copy(output.value, 'Output copied to clipboard!');
  } else {
    toast('No output to copy', 'error');
  }
});

// Download button
on(downloadBtn, 'click', () => {
  if (!output.value) {
    toast('No output to download', 'error');
    return;
  }
  
  const format = outputFormat.value;
  const extension = format === 'json' ? 'json' : format;
  const mimeType = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/tab-separated-values';
  
  const blob = new Blob([output.value], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `converted.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
  toast('File downloaded', 'success');
});

// Example button
on(exampleBtn, 'click', () => {
  input.value = exampleCSV;
  inputFormat.value = 'csv';
  convert();
});

// Auto-convert on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (input.value.trim()) {
      convert();
    }
  }, 500);
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
  }
  if (urlState?.inputFormat) {
    inputFormat.value = urlState.inputFormat;
  }
  if (urlState?.outputFormat) {
    outputFormat.value = urlState.outputFormat;
  }
  if (urlState?.input) {
    convert();
  }
}

// Initial convert if there's content
if (input.value) {
  convert();
}

