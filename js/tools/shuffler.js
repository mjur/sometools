// List Shuffler Tool
import { toast, on, copy, qs } from '/js/ui.js';

const delimiterSelect = qs('#delimiter');
const customDelimiterGroup = qs('#custom-delimiter-group');
const customDelimiterInput = qs('#custom-delimiter');
const inputTextarea = qs('#input');
const shuffleBtn = qs('#shuffle-btn');
const clearBtn = qs('#clear-btn');
const copyBtn = qs('#copy-btn');
const output = qs('#output');

// Delimiter mapping
const delimiterMap = {
  'newline': '\n',
  'comma': ',',
  'semicolon': ';',
  'pipe': '|',
  'tab': '\t',
  'space': ' ',
  'custom': null // Will use custom input
};

function getDelimiter() {
  const delimiterType = delimiterSelect.value;
  if (delimiterType === 'custom') {
    return customDelimiterInput.value || '\n';
  }
  return delimiterMap[delimiterType] || '\n';
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleItems() {
  const inputText = inputTextarea.value.trim();
  
  if (!inputText) {
    output.innerHTML = '<p class="error">Please enter some items to shuffle</p>';
    copyBtn.style.display = 'none';
    return;
  }
  
  const delimiter = getDelimiter();
  let items;
  
  if (delimiter === '\n') {
    // For newline, split by newline and filter out empty lines
    items = inputText.split(/\r?\n/).filter(item => item.trim() !== '');
  } else {
    // For other delimiters, split and trim each item
    items = inputText.split(delimiter).map(item => item.trim()).filter(item => item !== '');
  }
  
  if (items.length === 0) {
    output.innerHTML = '<p class="error">No valid items found. Check your delimiter setting.</p>';
    copyBtn.style.display = 'none';
    return;
  }
  
  if (items.length === 1) {
    output.innerHTML = '<p class="error">Only one item found. Need at least 2 items to shuffle.</p>';
    copyBtn.style.display = 'none';
    return;
  }
  
  // Shuffle the items
  const shuffled = shuffleArray(items);
  
  // Display results
  displayResults(shuffled, delimiter);
}

function displayResults(items, delimiter) {
  const displayDelimiter = delimiter === '\n' ? '\n' : delimiter;
  const resultText = items.join(displayDelimiter);
  
  let html = '<div class="shuffler-stats">';
  html += '<p><strong>Shuffled ' + items.length + ' item' + (items.length !== 1 ? 's' : '') + '</strong></p>';
  html += '</div>';
  
  html += '<div class="shuffler-items">';
  if (delimiter === '\n') {
    // Display as list for newline delimiter
    html += '<pre>' + resultText + '</pre>';
  } else {
    // Display as text for other delimiters
    html += '<pre>' + resultText + '</pre>';
  }
  html += '</div>';
  
  output.innerHTML = html;
  copyBtn.style.display = 'inline-block';
  
  // Store result text for copying
  output.dataset.resultText = resultText;
}

async function handleCopy() {
  const resultText = output.dataset.resultText;
  if (!resultText) {
    toast('No items to copy', 'error');
    return;
  }
  
  await copy(resultText, 'Shuffled items copied!');
}

function clearOutput() {
  inputTextarea.value = '';
  output.innerHTML = '<p class="placeholder">Enter items and click "Shuffle Items" to shuffle them</p>';
  copyBtn.style.display = 'none';
  delete output.dataset.resultText;
}

// Show/hide custom delimiter input
function updateDelimiterVisibility() {
  if (delimiterSelect.value === 'custom') {
    customDelimiterGroup.style.display = 'flex';
  } else {
    customDelimiterGroup.style.display = 'none';
  }
}

// Event listeners
on(shuffleBtn, 'click', shuffleItems);
on(clearBtn, 'click', clearOutput);
on(copyBtn, 'click', handleCopy);
on(delimiterSelect, 'change', updateDelimiterVisibility);

// Initial visibility update
updateDelimiterVisibility();

// Add CSS for the shuffler display
const style = document.createElement('style');
style.textContent = `
  .shuffler-stats {
    background: var(--bg-elev);
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  
  .shuffler-stats p {
    margin: 0.5rem 0;
  }
  
  .shuffler-items {
    margin: 1rem 0;
  }
  
  .shuffler-items pre {
    background: var(--bg-elev);
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }
  
  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .icon-btn {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: background 0.2s;
  }
  
  .icon-btn:hover {
    background: var(--bg-hover);
  }
`;
document.head.appendChild(style);

