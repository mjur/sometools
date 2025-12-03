// URL state management utilities

// Encode state to base64url
export function encodeState(obj) {
  try {
    const json = JSON.stringify(obj);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    // Convert to base64url (replace + with -, / with _, remove padding)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (e) {
    console.error('Failed to encode state:', e);
    return '';
  }
}

// Decode state from base64url
export function decodeState(str) {
  if (!str) return null;
  try {
    // Convert from base64url to base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode state:', e);
    return null;
  }
}

// Parse query parameters
export function parseQuery() {
  const params = new URLSearchParams(window.location.search);
  const obj = {};
  for (const [key, value] of params.entries()) {
    obj[key] = value;
  }
  return obj;
}

// Set query parameter
export function setQuery(key, value) {
  const url = new URL(window.location);
  if (value === null || value === undefined || value === '') {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }
  return url;
}

// Load state from URL (fragment or query)
export function loadState() {
  // Try fragment first (for larger payloads)
  if (window.location.hash) {
    const state = decodeState(window.location.hash.slice(1));
    if (state) return state;
  }
  
  // Fall back to query params
  return parseQuery();
}

// Save state to URL
export function saveState(state, useFragment = true) {
  if (useFragment) {
    const encoded = encodeState(state);
    if (encoded) {
      window.history.replaceState(null, '', `#${encoded}`);
      return true;
    }
  }
  
  // Fall back to query params for simple states
  const url = new URL(window.location);
  url.hash = ''; // Clear fragment
  for (const [key, value] of Object.entries(state)) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    } else {
      url.searchParams.delete(key);
    }
  }
  window.history.replaceState(null, '', url);
  return true;
}

// Load from localStorage
export function loadFromStorage(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error('Failed to load from storage:', e);
    return null;
  }
}

// Save to localStorage
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Failed to save to storage:', e);
    return false;
  }
}

// Load state with localStorage fallback
export function loadStateWithStorage(storageKey) {
  // Prefer URL state
  const urlState = loadState();
  if (urlState && Object.keys(urlState).length > 0) {
    return urlState;
  }
  
  // Fall back to localStorage
  return loadFromStorage(storageKey);
}

// Save state with localStorage backup
export function saveStateWithStorage(state, storageKey, useFragment = true) {
  saveState(state, useFragment);
  saveToStorage(storageKey, state);
}

