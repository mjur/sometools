// Hash utilities using Web Crypto API

import { md5Hash, md5HashBinary } from './md5.js';

// Check if Web Crypto API is available
function checkWebCrypto() {
  if (!crypto || !crypto.subtle) {
    throw new Error('Web Crypto API is not available. Please use HTTPS or localhost.');
  }
}

// Available algorithms
export const ALGORITHMS = {
  'MD5': 'MD5',
  'SHA-1': 'SHA-1',
  'SHA-256': 'SHA-256',
  'SHA-384': 'SHA-384',
  'SHA-512': 'SHA-512'
};

// Hash text using Web Crypto API or MD5
export async function hashText(text, algorithm = 'SHA-256') {
  // MD5 doesn't use Web Crypto API
  if (algorithm === 'MD5') {
    return md5Hash(text);
  }
  
  checkWebCrypto();
  
  if (!ALGORITHMS[algorithm]) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return arrayBufferToHex(hashBuffer);
}

// Hash file using Web Crypto API or MD5
export async function hashFile(file, algorithm = 'SHA-256') {
  // MD5 doesn't use Web Crypto API
  if (algorithm === 'MD5') {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    return md5HashBinary(data);
  }
  
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

// Convert ArrayBuffer to binary string
function arrayBufferToBinary(buffer) {
  const hashArray = Array.from(new Uint8Array(buffer));
  return String.fromCharCode.apply(null, hashArray);
}

// Hash to base64
export async function hashTextBase64(text, algorithm = 'SHA-256') {
  // MD5 doesn't use Web Crypto API
  if (algorithm === 'MD5') {
    const hexHash = md5Hash(text);
    // Convert hex to base64
    const bytes = hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
    const binary = String.fromCharCode.apply(null, bytes);
    return btoa(binary);
  }
  
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
  // MD5 doesn't use Web Crypto API
  if (algorithm === 'MD5') {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const hexHash = md5HashBinary(data);
    // Convert hex to base64
    const bytes = hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
    const binary = String.fromCharCode.apply(null, bytes);
    return btoa(binary);
  }
  
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

// Hash to binary
export async function hashTextBinary(text, algorithm = 'SHA-256') {
  // MD5 doesn't use Web Crypto API
  if (algorithm === 'MD5') {
    const hexHash = md5Hash(text);
    // Convert hex to binary
    const bytes = hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
    return String.fromCharCode.apply(null, bytes);
  }
  
  checkWebCrypto();
  
  if (!ALGORITHMS[algorithm]) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return arrayBufferToBinary(hashBuffer);
}

// Hash file to binary
export async function hashFileBinary(file, algorithm = 'SHA-256') {
  // MD5 doesn't use Web Crypto API
  if (algorithm === 'MD5') {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const hexHash = md5HashBinary(data);
    // Convert hex to binary
    const bytes = hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
    return String.fromCharCode.apply(null, bytes);
  }
  
  checkWebCrypto();
  
  if (!ALGORITHMS[algorithm]) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
  return arrayBufferToBinary(hashBuffer);
}

