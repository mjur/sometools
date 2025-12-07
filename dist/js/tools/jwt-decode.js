import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';

const input = qs('#input');
const output = qs('#output');
const runBtn = qs('#run');
const copyBtn = qs('#copy');
const exampleBtn = qs('#example');

// Load state from URL or localStorage
const storageKey = 'jwt-decode-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
}

// Example JWT
const exampleJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Base64 URL decode
function base64UrlDecode(str) {
  // Replace URL-safe characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  
  try {
    // Decode
    const decoded = atob(base64);
    return decoded;
  } catch (e) {
    throw new Error('Invalid base64 encoding');
  }
}

// Format timestamp if present
function formatTimestamp(timestamp) {
  if (typeof timestamp === 'number') {
    const date = new Date(timestamp * 1000);
    return `${timestamp} (${date.toISOString()})`;
  }
  return timestamp;
}

// Format JWT claims
function formatClaims(obj) {
  const formatted = {};
  const commonClaims = {
    'iss': 'Issuer',
    'sub': 'Subject',
    'aud': 'Audience',
    'exp': 'Expiration Time',
    'nbf': 'Not Before',
    'iat': 'Issued At',
    'jti': 'JWT ID'
  };
  
  for (const [key, value] of Object.entries(obj)) {
    const displayKey = commonClaims[key] ? `${key} (${commonClaims[key]})` : key;
    if (['exp', 'nbf', 'iat'].includes(key) && typeof value === 'number') {
      formatted[displayKey] = formatTimestamp(value);
    } else {
      formatted[displayKey] = value;
    }
  }
  
  return formatted;
}

function decode() {
  const token = input.value.trim();
  
  if (!token) {
    output.textContent = 'Enter a JWT token to decode';
    output.className = '';
    return;
  }
  
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    output.textContent = 'Invalid JWT ❌\n\nA JWT must have exactly 3 parts separated by dots.\n\nFormat: header.payload.signature';
    output.className = 'error';
    return;
  }
  
  try {
    // Decode header
    const headerStr = base64UrlDecode(parts[0]);
    const header = JSON.parse(headerStr);
    
    // Decode payload
    const payloadStr = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadStr);
    
    // Signature (not decoded, just shown)
    const signature = parts[2];
    
    // Build output
    let result = 'JWT Decoded Successfully ✅\n\n';
    result += '='.repeat(60) + '\n';
    result += 'HEADER\n';
    result += '='.repeat(60) + '\n';
    result += JSON.stringify(header, null, 2) + '\n\n';
    
    result += '='.repeat(60) + '\n';
    result += 'PAYLOAD\n';
    result += '='.repeat(60) + '\n';
    const formattedPayload = formatClaims(payload);
    result += JSON.stringify(formattedPayload, null, 2) + '\n\n';
    
    result += '='.repeat(60) + '\n';
    result += 'SIGNATURE\n';
    result += '='.repeat(60) + '\n';
    result += signature + '\n\n';
    
    // Check expiration
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      if (expDate < now) {
        result += '⚠️  WARNING: This token has EXPIRED\n';
        result += `Expired at: ${expDate.toISOString()}\n\n`;
      } else {
        result += `✓ Token is valid until: ${expDate.toISOString()}\n\n`;
      }
    }
    
    // Check not before
    if (payload.nbf) {
      const nbfDate = new Date(payload.nbf * 1000);
      const now = new Date();
      if (nbfDate > now) {
        result += `⚠️  WARNING: This token is not valid yet\n`;
        result += `Valid from: ${nbfDate.toISOString()}\n\n`;
      }
    }
    
    output.textContent = result;
    output.className = 'ok';
  } catch (error) {
    output.textContent = `Decode Error ❌\n\n${error.message}\n\nMake sure the JWT token is valid and properly formatted.`;
    output.className = 'error';
  }
  
  // Save state
  saveStateWithStorage({
    input: token
  }, storageKey);
}

// Decode button
on(runBtn, 'click', decode);

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    decode();
  }
});

// Copy button
on(copyBtn, 'click', async () => {
  await copy(input.value, 'JWT token copied to clipboard!');
});

// Example button
on(exampleBtn, 'click', () => {
  input.value = exampleJWT;
  decode();
});

// Auto-decode on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (input.value.trim()) {
      decode();
    }
  }, 500);
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
    decode();
  }
}

// Initial decode if there's content
if (input.value) {
  decode();
}

