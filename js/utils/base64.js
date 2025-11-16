// Base64 utilities

// Encode to base64
export function encodeBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    throw new Error('Failed to encode: ' + e.message);
  }
}

// Decode from base64
export function decodeBase64(str) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    throw new Error('Failed to decode: ' + e.message);
  }
}

// Encode to base64url (URL-safe)
export function encodeBase64URL(str) {
  const base64 = encodeBase64(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Decode from base64url
export function decodeBase64URL(str) {
  // Convert from base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeBase64(base64);
}

// Auto-detect if string is base64/base64url
export function isBase64(str) {
  if (!str || typeof str !== 'string') return false;
  
  // Remove whitespace
  const cleaned = str.replace(/\s/g, '');
  if (cleaned.length === 0) return false;
  
  // Check for base64url characters (no padding)
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  if (!base64urlPattern.test(cleaned)) return false;
  
  // Try to decode
  try {
    decodeBase64URL(cleaned);
    return true;
  } catch (e) {
    try {
      decodeBase64(cleaned);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

// Encode file to base64
export function encodeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove data URL prefix
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

