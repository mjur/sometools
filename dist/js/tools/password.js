import { on, copy, qs, toast } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const lengthInput = qs('#length');
const uppercaseCheck = qs('#uppercase');
const lowercaseCheck = qs('#lowercase');
const numbersCheck = qs('#numbers');
const symbolsCheck = qs('#symbols');
const excludeSimilarCheck = qs('#exclude-similar');
const excludeAmbiguousCheck = qs('#exclude-ambiguous');
const generateBtn = qs('#generate');
const generateMultipleBtn = qs('#generate-multiple');
const output = qs('#output');
const copyBtn = qs('#copy');
const clearBtn = qs('#clear');
const strengthText = qs('#strength-text');
const strengthFill = qs('#strength-fill');

// Character sets
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const SIMILAR = 'il1Lo0O';
const AMBIGUOUS = '{}[]()/\\\'"`~,;:.<>';

// Load state
const storageKey = 'password-generator-state';
const state = loadStateWithStorage(storageKey);
if (state?.length) lengthInput.value = state.length;
if (state?.uppercase !== undefined) uppercaseCheck.checked = state.uppercase;
if (state?.lowercase !== undefined) lowercaseCheck.checked = state.lowercase;
if (state?.numbers !== undefined) numbersCheck.checked = state.numbers;
if (state?.symbols !== undefined) symbolsCheck.checked = state.symbols;
if (state?.excludeSimilar !== undefined) excludeSimilarCheck.checked = state.excludeSimilar;
if (state?.excludeAmbiguous !== undefined) excludeAmbiguousCheck.checked = state.excludeAmbiguous;

function getCharacterSet() {
  let charset = '';
  
  if (uppercaseCheck.checked) charset += UPPERCASE;
  if (lowercaseCheck.checked) charset += LOWERCASE;
  if (numbersCheck.checked) charset += NUMBERS;
  if (symbolsCheck.checked) charset += SYMBOLS;
  
  if (excludeSimilarCheck.checked) {
    charset = charset.split('').filter(c => !SIMILAR.includes(c)).join('');
  }
  
  if (excludeAmbiguousCheck.checked) {
    charset = charset.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
  }
  
  return charset;
}

function generatePassword(length) {
  const charset = getCharacterSet();
  
  if (charset.length === 0) {
    throw new Error('At least one character type must be selected');
  }
  
  // Use Web Crypto API for secure random generation
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  return password;
}

function calculateStrength(password) {
  let score = 0;
  
  // Length score (0-25 points)
  if (password.length >= 16) score += 25;
  else if (password.length >= 12) score += 20;
  else if (password.length >= 8) score += 15;
  else if (password.length >= 6) score += 10;
  else score += 5;
  
  // Character variety (0-25 points)
  let variety = 0;
  if (/[a-z]/.test(password)) variety++;
  if (/[A-Z]/.test(password)) variety++;
  if (/[0-9]/.test(password)) variety++;
  if (/[^a-zA-Z0-9]/.test(password)) variety++;
  score += variety * 6.25;
  
  // Complexity (0-25 points)
  const hasRepeats = /(.)\1{2,}/.test(password);
  const hasPattern = /(012|abc|ABC|qwerty|password)/i.test(password);
  if (!hasRepeats && !hasPattern) score += 25;
  else if (!hasRepeats || !hasPattern) score += 15;
  else score += 5;
  
  // Entropy estimate (0-25 points)
  const charsetSize = getCharacterSet().length;
  const entropy = Math.log2(charsetSize) * password.length;
  if (entropy >= 80) score += 25;
  else if (entropy >= 60) score += 20;
  else if (entropy >= 40) score += 15;
  else if (entropy >= 30) score += 10;
  else score += 5;
  
  // Cap at 100
  score = Math.min(100, score);
  
  return {
    score,
    level: score >= 80 ? 'Very Strong' : 
           score >= 60 ? 'Strong' : 
           score >= 40 ? 'Moderate' : 
           score >= 20 ? 'Weak' : 'Very Weak',
    color: score >= 80 ? '#4caf50' : 
           score >= 60 ? '#8bc34a' : 
           score >= 40 ? '#ffc107' : 
           score >= 20 ? '#ff9800' : '#f44336',
  };
}

function updateStrength(password) {
  if (!password) {
    strengthText.textContent = '-';
    strengthFill.style.width = '0%';
    strengthFill.style.backgroundColor = 'transparent';
    return;
  }
  
  const { score, level, color } = calculateStrength(password);
  strengthText.textContent = `${level} (${score}/100)`;
  strengthFill.style.width = `${score}%`;
  strengthFill.style.backgroundColor = color;
}

function generate() {
  try {
    const length = parseInt(lengthInput.value) || 16;
    
    if (length < 4 || length > 128) {
      toast('Length must be between 4 and 128');
      return;
    }
    
    const password = generatePassword(length);
    output.value = password;
    updateStrength(password);
    
    saveState();
  } catch (error) {
    toast(error.message);
  }
}

function generateMultiple() {
  try {
    const length = parseInt(lengthInput.value) || 16;
    
    if (length < 4 || length > 128) {
      toast('Length must be between 4 and 128');
      return;
    }
    
    const passwords = [];
    for (let i = 0; i < 5; i++) {
      passwords.push(generatePassword(length));
    }
    
    output.value = passwords.join('\n');
    updateStrength(passwords[0]);
    
    saveState();
  } catch (error) {
    toast(error.message);
  }
}

function saveState() {
  saveStateWithStorage(storageKey, {
    length: lengthInput.value,
    uppercase: uppercaseCheck.checked,
    lowercase: lowercaseCheck.checked,
    numbers: numbersCheck.checked,
    symbols: symbolsCheck.checked,
    excludeSimilar: excludeSimilarCheck.checked,
    excludeAmbiguous: excludeAmbiguousCheck.checked,
  });
}

on(generateBtn, 'click', generate);
on(generateMultipleBtn, 'click', generateMultiple);
on(copyBtn, 'click', async () => {
  if (!output.value) {
    toast('No password to copy');
    return;
  }
  await copy(output.value);
  toast('Password copied to clipboard');
});
on(clearBtn, 'click', () => {
  output.value = '';
  updateStrength('');
});

// Generate on Enter key in length input
on(lengthInput, 'keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

// Update strength when password changes
on(output, 'input', () => {
  updateStrength(output.value);
});

// Save state when options change
on(uppercaseCheck, 'change', saveState);
on(lowercaseCheck, 'change', saveState);
on(numbersCheck, 'change', saveState);
on(symbolsCheck, 'change', saveState);
on(excludeSimilarCheck, 'change', saveState);
on(excludeAmbiguousCheck, 'change', saveState);
on(lengthInput, 'input', saveState);

// Initial generation
generate();

