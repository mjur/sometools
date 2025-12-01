// Calculator Tool
// Simple, Advanced, and Scientific calculator with history and memory
// Uses advanced-calculator package for professional expression evaluation

console.log('🚀 calculator.js script loading...');

import { on, qs } from '/js/ui.js';

// Import advanced-calculator package
let advancedCalc = null;

async function loadAdvancedCalculator() {
  if (advancedCalc) return advancedCalc;
  
  try {
    // Import the advanced-calculator package (Vite will handle CommonJS conversion)
    const calcModule = await import('advanced-calculator');
    advancedCalc = calcModule.default || calcModule;
    console.log('✅ Advanced calculator loaded', advancedCalc);
    return advancedCalc;
  } catch (error) {
    console.warn('Failed to load advanced-calculator, using fallback:', error);
    // Fallback to basic evaluation
    advancedCalc = {
      evaluate: (expr) => {
        try {
          return Function(`"use strict"; return (${expr})`)();
        } catch (e) {
          throw new Error('Invalid expression');
        }
      },
      add: (...args) => args.reduce((a, b) => a + b, 0),
      sub: (a, ...args) => args.reduce((acc, val) => acc - val, a),
      multiply: (...args) => args.reduce((a, b) => a * b, 1),
      divide: (a, ...args) => args.reduce((acc, val) => acc / val, a),
      sqrt: (x) => Math.sqrt(x),
      sin: (x) => Math.sin(x * Math.PI / 180),
      cos: (x) => Math.cos(x * Math.PI / 180),
      tan: (x) => Math.tan(x * Math.PI / 180),
      log: (x) => Math.log10(x),
      ln: (x) => Math.log(x),
      pow: (x, y) => Math.pow(x, y)
    };
    return advancedCalc;
  }
}

// Load calculator on init
loadAdvancedCalculator();

// Calculator state
let currentMode = 'simple';
let currentValue = '0';
let previousValue = null;
let operator = null;
let shouldResetDisplay = false;
let memory = 0;
let history = [];

// DOM elements
const modeButtons = document.querySelectorAll('.mode-btn');
const calculatorInput = qs('#calculator-input');
const historyDisplay = qs('#history-display');
const memoryDisplay = qs('#memory-display');
const memoryValue = qs('#memory-value');
const historyPanel = qs('#history-panel');
const historyList = qs('#history-list');

// Button configurations
const simpleButtons = [
  ['C', 'clear'], ['±', 'negate'], ['%', 'percent'], ['÷', 'operator', '/'],
  ['7', 'number'], ['8', 'number'], ['9', 'number'], ['×', 'operator', '*'],
  ['4', 'number'], ['5', 'number'], ['6', 'number'], ['−', 'operator', '-'],
  ['1', 'number'], ['2', 'number'], ['3', 'number'], ['+', 'operator', '+'],
  ['0', 'number', 'zero'], ['.', 'decimal'], ['=', 'equals']
];

const advancedButtons = [
  ['C', 'clear'], ['CE', 'clearEntry'], ['⌫', 'backspace'], ['÷', 'operator', '/'],
  ['7', 'number'], ['8', 'number'], ['9', 'number'], ['×', 'operator', '*'],
  ['4', 'number'], ['5', 'number'], ['6', 'number'], ['−', 'operator', '-'],
  ['1', 'number'], ['2', 'number'], ['3', 'number'], ['+', 'operator', '+'],
  ['0', 'number', 'zero'], ['.', 'decimal'], ['±', 'negate'], ['=', 'equals']
];

const scientificButtons = [
  ['sin', 'function', 'sin'], ['cos', 'function', 'cos'], ['tan', 'function', 'tan'], ['ln', 'function', 'ln'], ['log', 'function', 'log'],
  ['asin', 'function', 'asin'], ['acos', 'function', 'acos'], ['atan', 'function', 'atan'], ['e^x', 'function', 'exp'], ['10^x', 'function', 'pow10'],
  ['x²', 'function', 'square'], ['x³', 'function', 'cube'], ['√', 'function', 'sqrt'], ['∛', 'function', 'cbrt'], ['x^y', 'function', 'pow'],
  ['π', 'constant', 'pi'], ['e', 'constant', 'e'], ['(', 'function', 'lparen'], [')', 'function', 'rparen'], ['!', 'function', 'factorial']
];

const scientificMainButtons = [
  ['C', 'clear'], ['CE', 'clearEntry'], ['⌫', 'backspace'], ['÷', 'operator', '/'],
  ['7', 'number'], ['8', 'number'], ['9', 'number'], ['×', 'operator', '*'],
  ['4', 'number'], ['5', 'number'], ['6', 'number'], ['−', 'operator', '-'],
  ['1', 'number'], ['2', 'number'], ['3', 'number'], ['+', 'operator', '+'],
  ['0', 'number', 'zero'], ['.', 'decimal'], ['±', 'negate'], ['=', 'equals']
];

// Initialize calculator
function init() {
  setupModeButtons();
  generateButtons();
  setupMemoryButtons();
  setupKeyboard();
  updateDisplay();
}

// Setup mode selector buttons
function setupModeButtons() {
  modeButtons.forEach(btn => {
    on(btn, 'click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });
}

// Switch calculator mode
function switchMode(mode) {
  currentMode = mode;
  
  // Update active button
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Show/hide calculator modes
  document.querySelectorAll('.calculator-mode').forEach(el => {
    el.style.display = 'none';
  });
  
  if (mode === 'simple') {
    qs('#simple-calculator').style.display = 'block';
    memoryDisplay.style.display = 'none';
    historyPanel.style.display = 'none';
  } else if (mode === 'advanced') {
    qs('#advanced-calculator').style.display = 'block';
    memoryDisplay.style.display = 'flex';
    historyPanel.style.display = 'block';
  } else if (mode === 'scientific') {
    qs('#scientific-calculator').style.display = 'flex';
    memoryDisplay.style.display = 'flex';
    historyPanel.style.display = 'block';
  }
  
  generateButtons();
  updateDisplay();
}

// Generate calculator buttons
function generateButtons() {
  if (currentMode === 'simple') {
    generateButtonGrid('simple-buttons', simpleButtons);
  } else if (currentMode === 'advanced') {
    generateButtonGrid('advanced-buttons', advancedButtons);
  } else if (currentMode === 'scientific') {
    generateButtonGrid('scientific-buttons', scientificButtons);
    generateButtonGrid('scientific-main-buttons', scientificMainButtons);
  }
}

// Generate button grid
function generateButtonGrid(containerId, buttons) {
  const container = qs(`#${containerId}`);
  if (!container) return;
  
  container.innerHTML = '';
  
  buttons.forEach(([label, type, value]) => {
    const btn = document.createElement('button');
    btn.className = `calculator-btn ${type}`;
    btn.textContent = label;
    btn.dataset.type = type;
    btn.dataset.value = value || label;
    
    if (type === 'zero') {
      btn.classList.add('zero');
    }
    
    on(btn, 'click', () => handleButtonClick(type, value || label));
    container.appendChild(btn);
  });
}

// Handle button clicks
async function handleButtonClick(type, value) {
  if (type === 'number') {
    inputNumber(value);
  } else if (type === 'operator') {
    inputOperator(value);
  } else if (type === 'decimal') {
    inputDecimal();
  } else if (type === 'equals') {
    await calculate();
  } else if (type === 'clear') {
    clear();
  } else if (type === 'clearEntry') {
    clearEntry();
  } else if (type === 'backspace') {
    backspace();
  } else if (type === 'negate') {
    negate();
  } else if (type === 'percent') {
    percent();
  } else if (type === 'function') {
    await inputFunction(value);
  } else if (type === 'constant') {
    inputConstant(value);
  }
  
  updateDisplay();
}

// Input number
function inputNumber(num) {
  if (shouldResetDisplay) {
    currentValue = '0';
    shouldResetDisplay = false;
  }
  
  if (currentValue === '0') {
    currentValue = num;
  } else {
    currentValue += num;
  }
}

// Input operator
async function inputOperator(op) {
  if (previousValue !== null && operator !== null && !shouldResetDisplay) {
    await calculate();
  }
  
  previousValue = parseFloat(currentValue);
  operator = op;
  shouldResetDisplay = true;
  historyDisplay.textContent = `${previousValue} ${getOperatorSymbol(op)}`;
}

// Input decimal
function inputDecimal() {
  if (shouldResetDisplay) {
    currentValue = '0';
    shouldResetDisplay = false;
  }
  
  if (!currentValue.includes('.')) {
    currentValue += '.';
  }
}

// Calculate result
async function calculate() {
  if (previousValue === null || operator === null) return;
  
  const prev = previousValue;
  const current = parseFloat(currentValue);
  let result;
  let expression;
  
  try {
    const calc = await loadAdvancedCalculator();
    
    switch (operator) {
      case '+':
        result = calc.add ? calc.add(prev, current) : prev + current;
        expression = `${prev} ${getOperatorSymbol(operator)} ${current}`;
        break;
      case '-':
        result = calc.sub ? calc.sub(prev, current) : prev - current;
        expression = `${prev} ${getOperatorSymbol(operator)} ${current}`;
        break;
      case '*':
        result = calc.multiply ? calc.multiply(prev, current) : prev * current;
        expression = `${prev} ${getOperatorSymbol(operator)} ${current}`;
        break;
      case '/':
        if (current === 0) {
          throw new Error('Division by zero');
        }
        result = calc.divide ? calc.divide(prev, current) : prev / current;
        expression = `${prev} ${getOperatorSymbol(operator)} ${current}`;
        break;
      case 'pow':
        result = calc.pow ? calc.pow(prev, current) : Math.pow(prev, current);
        expression = `${prev}^${current}`;
        break;
      default:
        return;
    }
    
    // Add to history
    addToHistory(expression, result);
    
    currentValue = formatNumber(result);
    previousValue = null;
    operator = null;
    shouldResetDisplay = true;
    historyDisplay.textContent = '';
  } catch (error) {
    currentValue = 'Error';
    previousValue = null;
    operator = null;
    shouldResetDisplay = true;
  }
}

// Input function (scientific)
async function inputFunction(func) {
  const value = parseFloat(currentValue);
  let result;
  let expression;
  
  try {
    const calc = await loadAdvancedCalculator();
    
    switch (func) {
      case 'sin':
        result = calc.sin ? calc.sin(value) : Math.sin(value * Math.PI / 180);
        expression = `sin(${value}°)`;
        break;
      case 'cos':
        result = calc.cos ? calc.cos(value) : Math.cos(value * Math.PI / 180);
        expression = `cos(${value}°)`;
        break;
      case 'tan':
        result = calc.tan ? calc.tan(value) : Math.tan(value * Math.PI / 180);
        expression = `tan(${value}°)`;
        break;
      case 'asin':
        result = Math.asin(value) * 180 / Math.PI;
        expression = `asin(${value})`;
        break;
      case 'acos':
        result = Math.acos(value) * 180 / Math.PI;
        expression = `acos(${value})`;
        break;
      case 'atan':
        result = Math.atan(value) * 180 / Math.PI;
        expression = `atan(${value})`;
        break;
      case 'ln':
        if (value <= 0) throw new Error('Invalid input');
        result = calc.ln ? calc.ln(value) : Math.log(value);
        expression = `ln(${value})`;
        break;
      case 'log':
        if (value <= 0) throw new Error('Invalid input');
        result = calc.log ? calc.log(value) : Math.log10(value);
        expression = `log(${value})`;
        break;
      case 'exp':
        result = Math.exp(value);
        expression = `e^${value}`;
        break;
      case 'pow10':
        result = calc.pow ? calc.pow(10, value) : Math.pow(10, value);
        expression = `10^${value}`;
        break;
      case 'square':
        result = value * value;
        expression = `${value}²`;
        break;
      case 'cube':
        result = value * value * value;
        expression = `${value}³`;
        break;
      case 'sqrt':
        if (value < 0) throw new Error('Invalid input');
        result = calc.sqrt ? calc.sqrt(value) : Math.sqrt(value);
        expression = `√${value}`;
        break;
      case 'cbrt':
        result = Math.cbrt(value);
        expression = `∛${value}`;
        break;
      case 'factorial':
        if (value < 0 || value !== Math.floor(value)) throw new Error('Invalid input');
        result = factorial(value);
        expression = `${value}!`;
        break;
      case 'pow':
        // Store for power operation
        previousValue = value;
        operator = 'pow';
        shouldResetDisplay = true;
        historyDisplay.textContent = `${value} ^`;
        return;
      case 'lparen':
      case 'rparen':
        // Parentheses not fully implemented in this version
        return;
      default:
        return;
    }
    
    addToHistory(expression, result);
    currentValue = formatNumber(result);
    shouldResetDisplay = true;
  } catch (error) {
    currentValue = 'Error';
    shouldResetDisplay = true;
  }
}

// Input constant
function inputConstant(constant) {
  if (shouldResetDisplay) {
    currentValue = '0';
    shouldResetDisplay = false;
  }
  
  if (constant === 'pi') {
    currentValue = formatNumber(Math.PI);
  } else if (constant === 'e') {
    currentValue = formatNumber(Math.E);
  }
  
  shouldResetDisplay = true;
}

// Clear all
function clear() {
  currentValue = '0';
  previousValue = null;
  operator = null;
  shouldResetDisplay = false;
  historyDisplay.textContent = '';
}

// Clear entry
function clearEntry() {
  currentValue = '0';
  shouldResetDisplay = false;
}

// Backspace
function backspace() {
  if (currentValue.length > 1) {
    currentValue = currentValue.slice(0, -1);
  } else {
    currentValue = '0';
  }
}

// Negate
function negate() {
  currentValue = formatNumber(parseFloat(currentValue) * -1);
}

// Percent
function percent() {
  if (previousValue !== null) {
    currentValue = formatNumber(previousValue * parseFloat(currentValue) / 100);
  } else {
    currentValue = formatNumber(parseFloat(currentValue) / 100);
  }
  shouldResetDisplay = true;
}

// Memory functions
function setupMemoryButtons() {
  const memoryButtons = document.querySelectorAll('.memory-btn');
  memoryButtons.forEach(btn => {
    on(btn, 'click', () => {
      const action = btn.dataset.action;
      handleMemoryAction(action);
    });
  });
}

function handleMemoryAction(action) {
  const value = parseFloat(currentValue);
  
  switch (action) {
    case 'mc': // Memory Clear
      memory = 0;
      break;
    case 'mr': // Memory Recall
      currentValue = formatNumber(memory);
      shouldResetDisplay = true;
      break;
    case 'ms': // Memory Store
      memory = value;
      break;
    case 'm+': // Memory Add
      memory += value;
      break;
    case 'm-': // Memory Subtract
      memory -= value;
      break;
  }
  
  updateMemoryDisplay();
}

function updateMemoryDisplay() {
  memoryValue.textContent = formatNumber(memory);
}

// History functions
function addToHistory(expression, result) {
  history.unshift({ expression, result, timestamp: Date.now() });
  if (history.length > 50) {
    history = history.slice(0, 50);
  }
  updateHistoryDisplay();
}

function updateHistoryDisplay() {
  if (!historyList) return;
  
  historyList.innerHTML = '';
  
  history.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="history-expression">${item.expression}</span>
      <span class="history-result">= ${formatNumber(item.result)}</span>
    `;
    
    on(div, 'click', () => {
      currentValue = formatNumber(item.result);
      shouldResetDisplay = true;
      updateDisplay();
    });
    
    historyList.appendChild(div);
  });
}

// Utility functions
function formatNumber(num) {
  if (isNaN(num) || !isFinite(num)) return 'Error';
  
  // Format to avoid scientific notation for large numbers
  const str = num.toString();
  if (str.includes('e')) {
    return num.toFixed(10).replace(/\.?0+$/, '');
  }
  
  // Limit decimal places
  const rounded = Math.round(num * 100000000) / 100000000;
  return rounded.toString();
}

function getOperatorSymbol(op) {
  const symbols = {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷'
  };
  return symbols[op] || op;
}

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity; // Prevent overflow
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Update display
function updateDisplay() {
  if (calculatorInput) {
    calculatorInput.value = currentValue;
  }
  updateMemoryDisplay();
}

// Keyboard support
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target === calculatorInput) return;
    
    const key = e.key;
    
    if (key >= '0' && key <= '9') {
      handleButtonClick('number', key);
      updateDisplay();
    } else if (key === '.') {
      handleButtonClick('decimal', '.');
      updateDisplay();
    } else if (key === '+') {
      handleButtonClick('operator', '+').then(() => updateDisplay());
    } else if (key === '-') {
      handleButtonClick('operator', '-').then(() => updateDisplay());
    } else if (key === '*') {
      handleButtonClick('operator', '*').then(() => updateDisplay());
    } else if (key === '/') {
      e.preventDefault();
      handleButtonClick('operator', '/').then(() => updateDisplay());
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      handleButtonClick('equals', '=').then(() => updateDisplay());
    } else if (key === 'Escape') {
      handleButtonClick('clear', 'C');
      updateDisplay();
    } else if (key === 'Backspace') {
      e.preventDefault();
      handleButtonClick('backspace', '⌫');
      updateDisplay();
    }
  });
}

// Initialize on load
init();

