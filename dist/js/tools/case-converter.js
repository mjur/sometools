import { on, copy, qs, toast } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const outputsContainer = qs('#outputs');
const copyInputBtn = qs('#copy-input');
const copyAllBtn = qs('#copy-all');
const clearBtn = qs('#clear');

// Load state
const storageKey = 'case-converter-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;

// Case conversion functions
function toCamelCase(text) {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
}

function toPascalCase(text) {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    })
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
}

function toSnakeCase(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function toKebabCase(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

function toConstantCase(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '');
}

function toSentenceCase(text) {
  return text
    .toLowerCase()
    .replace(/^\w|\.\s*\w/g, (match) => match.toUpperCase());
}

function toTitleCase(text) {
  return text
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function toLowerCase(text) {
  return text.toLowerCase();
}

const cases = [
  { name: 'camelCase', fn: toCamelCase },
  { name: 'PascalCase', fn: toPascalCase },
  { name: 'snake_case', fn: toSnakeCase },
  { name: 'kebab-case', fn: toKebabCase },
  { name: 'CONSTANT_CASE', fn: toConstantCase },
  { name: 'Sentence case', fn: toSentenceCase },
  { name: 'Title Case', fn: toTitleCase },
  { name: 'lowercase', fn: toLowerCase },
];

function updateOutputs() {
  const text = input.value;
  if (!text.trim()) {
    outputsContainer.innerHTML = '<p style="color: var(--muted); padding: 1rem;">Enter text above to see conversions</p>';
    return;
  }
  
  outputsContainer.innerHTML = '';
  
  cases.forEach(({ name, fn }) => {
    const outputDiv = document.createElement('div');
    outputDiv.style.cssText = `
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.75rem;
      background-color: var(--bg-elev);
    `;
    
    const label = document.createElement('div');
    label.textContent = name;
    label.style.cssText = `
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      color: var(--muted);
    `;
    
    const value = document.createElement('div');
    value.textContent = fn(text);
    value.style.cssText = `
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      word-break: break-all;
      padding: 0.5rem;
      background-color: var(--bg);
      border-radius: 3px;
      border: 1px solid var(--border);
    `;
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.className = 'secondary-btn';
    copyBtn.style.cssText = 'margin-top: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.875rem;';
    copyBtn.onclick = async () => {
      await copy(fn(text));
      toast(`Copied ${name}`);
    };
    
    outputDiv.appendChild(label);
    outputDiv.appendChild(value);
    outputDiv.appendChild(copyBtn);
    outputsContainer.appendChild(outputDiv);
  });
  
  saveStateWithStorage(storageKey, { input: text });
}

on(input, 'input', updateOutputs);
on(clearBtn, 'click', () => {
  input.value = '';
  updateOutputs();
  saveStateWithStorage(storageKey, { input: '' });
});

on(copyInputBtn, 'click', async () => {
  await copy(input.value);
  toast('Input copied');
});

on(copyAllBtn, 'click', async () => {
  const allOutputs = cases.map(({ name, fn }) => `${name}: ${fn(input.value)}`).join('\n');
  await copy(allOutputs);
  toast('All outputs copied');
});

// Initial update
updateOutputs();

