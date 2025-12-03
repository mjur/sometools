// Random Number Generator Tool
import { toast, on, copy, qs } from '/js/ui.js';

const countInput = qs('#count');
const minInput = qs('#min');
const maxInput = qs('#max');
const allowDuplicatesCheckbox = qs('#allow-duplicates');
const sortCheckbox = qs('#sort-numbers');
const generateBtn = qs('#generate-btn');
const clearBtn = qs('#clear-btn');
const copyBtn = qs('#copy-btn');
const copyAllBtn = qs('#copy-all-btn');
const output = qs('#output');

function generateRandomNumbers() {
  const count = parseInt(countInput.value) || 1;
  const min = parseInt(minInput.value) || 1;
  const max = parseInt(maxInput.value) || 100;
  const allowDuplicates = allowDuplicatesCheckbox.checked;
  const sort = sortCheckbox.checked;
  
  // Validation
  if (count < 1 || count > 10000) {
    output.innerHTML = '<p class="error">Number of random numbers must be between 1 and 10,000</p>';
    return;
  }
  
  if (min >= max) {
    output.innerHTML = '<p class="error">Minimum value must be less than maximum value</p>';
    return;
  }
  
  if (!allowDuplicates && (max - min + 1) < count) {
    output.innerHTML = '<p class="error">Cannot generate ' + count + ' unique numbers in range [' + min + ', ' + max + ']. Range is too small.</p>';
    return;
  }
  
  const numbers = [];
  
  if (allowDuplicates) {
    // Generate with duplicates allowed
    for (let i = 0; i < count; i++) {
      numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
  } else {
    // Generate unique numbers
    const availableNumbers = [];
    for (let i = min; i <= max; i++) {
      availableNumbers.push(i);
    }
    
    // Shuffle and take first 'count' numbers
    for (let i = availableNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableNumbers[i], availableNumbers[j]] = [availableNumbers[j], availableNumbers[i]];
    }
    
    for (let i = 0; i < count && i < availableNumbers.length; i++) {
      numbers.push(availableNumbers[i]);
    }
  }
  
  // Sort if requested
  if (sort) {
    numbers.sort((a, b) => a - b);
  }
  
  // Display results
  displayResults(numbers, min, max);
}

function displayResults(numbers, min, max) {
  if (numbers.length === 0) {
    output.innerHTML = '<p class="error">No numbers generated</p>';
    copyBtn.style.display = 'none';
    copyAllBtn.style.display = 'none';
    return;
  }
  
  const stats = {
    count: numbers.length,
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    sum: numbers.reduce((a, b) => a + b, 0),
    average: (numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2)
  };
  
  let html = '<div class="random-stats">';
  html += '<p><strong>Generated ' + stats.count + ' number' + (stats.count !== 1 ? 's' : '') + '</strong></p>';
  html += '<p>Range: [' + min + ', ' + max + ']</p>';
  html += '<p>Min: ' + stats.min + ' | Max: ' + stats.max + ' | Average: ' + stats.average + '</p>';
  html += '</div>';
  
  html += '<div class="random-numbers">';
  numbers.forEach((num, index) => {
    html += '<span class="random-number">' + num + '</span>';
    if ((index + 1) % 10 === 0) {
      html += '<br>';
    }
  });
  html += '</div>';
  
  html += '<div class="random-text">';
  html += '<p><strong>As comma-separated:</strong></p>';
  html += '<code>' + numbers.join(', ') + '</code>';
  html += '</div>';
  
  output.innerHTML = html;
  
  // Show copy buttons
  copyBtn.style.display = 'inline-block';
  copyAllBtn.style.display = 'inline-block';
}

async function handleCopy() {
  const numbers = Array.from(output.querySelectorAll('.random-number')).map(el => el.textContent);
  if (numbers.length === 0) {
    toast('No numbers to copy', 'error');
    return;
  }
  
  const text = numbers.join(', ');
  await copy(text, 'Numbers copied!');
}

async function handleCopyAll() {
  const codeElement = output.querySelector('code');
  if (!codeElement) {
    toast('No numbers to copy', 'error');
    return;
  }
  
  const text = codeElement.textContent;
  await copy(text, 'All numbers copied!');
}

function clearOutput() {
  output.innerHTML = '<p class="placeholder">Click "Generate Random Numbers" to generate numbers</p>';
  copyBtn.style.display = 'none';
  copyAllBtn.style.display = 'none';
}

// Event listeners
on(generateBtn, 'click', generateRandomNumbers);
on(clearBtn, 'click', clearOutput);
on(copyBtn, 'click', handleCopy);
on(copyAllBtn, 'click', handleCopyAll);

// Allow Enter key to generate
[minInput, maxInput, countInput].forEach(input => {
  on(input, 'keypress', (e) => {
    if (e.key === 'Enter') {
      generateRandomNumbers();
    }
  });
});

// Add some CSS for the random numbers display
const style = document.createElement('style');
style.textContent = `
  .random-stats {
    background: var(--bg-elev);
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  
  .random-stats p {
    margin: 0.5rem 0;
  }
  
  .random-numbers {
    margin: 1rem 0;
    line-height: 2;
  }
  
  .random-number {
    display: inline-block;
    background: var(--bg-elev);
    padding: 0.25rem 0.5rem;
    margin: 0.25rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
  }
  
  .random-text {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  
  .random-text code {
    display: block;
    background: var(--bg-elev);
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    word-break: break-all;
    font-size: 0.875rem;
  }
  
  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .output-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
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

