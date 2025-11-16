// Hash utilities using Web Crypto API

// Check if Web Crypto API is available
function checkWebCrypto() {
  if (!crypto || !crypto.subtle) {
    throw new Error('Web Crypto API is not available. Please use HTTPS or localhost.');
  }
}

// Available algorithms
export const ALGORITHMS = {
  'SHA-1': 'SHA-1',
  'SHA-256': 'SHA-256',
  'SHA-384': 'SHA-384',
  'SHA-512': 'SHA-512'
};

// Hash text using Web Crypto API
export async function hashText(text, algorithm = 'SHA-256') {
  checkWebCrypto();
  
  if (!ALGORITHMS[algorithm]) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return arrayBufferToHex(hashBuffer);
}

// Hash file using Web Crypto API
export async function hashFile(file, algorithm = 'SHA-256') {
  checkWebCrypto();
  
  if (!ALGORITHMS[algorithm]) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
  return arrayBufferToHex(hashBuffer);
}

// Convert ArrayBuffer to hex string
function arrayBufferToHex(buffer) {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const hashArray = Array.from(new Uint8Array(buffer));
  const binary = String.fromCharCode.apply(null, hashArray);
  return btoa(binary);
}

// Hash to base64
export async function hashTextBase64(text, algorithm = 'SHA-256') {
  checkWebCrypto();
  
  if (!ALGORITHMS[algorithm]) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return arrayBufferToBase64(hashBuffer);
}

// Hash file to base64
export async function hashFileBase64(file, algorithm = 'SHA-256') {
  checkWebCrypto();
  
  if (!ALGORITHMS[algorithm]) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
  return arrayBufferToBase64(hashBuffer);
}

// HMAC using Web Crypto API
export async function hmac(key, message, algorithm = 'SHA-256') {
  const keyData = new TextEncoder().encode(key);
  const messageData = new TextEncoder().encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return arrayBufferToHex(signature);
}

// Note: MD5, SHA-3, and BLAKE2 are not available in Web Crypto API
// For these, you would need to include a library like:
// - crypto-js for MD5
// - js-sha3 for SHA-3
// - blakejs for BLAKE2

