// Shared UI utilities

// DOM helpers
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

export function on(element, event, handler, options) {
  element.addEventListener(event, handler, options);
  return () => element.removeEventListener(event, handler, options);
}

// Debounce
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Copy to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

// Toast notifications
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function toast(message, type = 'info', duration = 3000) {
  const container = getToastContainer();
  const toastEl = document.createElement('div');
  toastEl.className = `toast ${type}`;
  toastEl.textContent = message;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'polite');
  
  container.appendChild(toastEl);
  
  setTimeout(() => {
    toastEl.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 300);
  }, duration);
}

// Add slideOut animation if not already in CSS
if (!document.querySelector('style[data-toast-animations]')) {
  const style = document.createElement('style');
  style.setAttribute('data-toast-animations', 'true');
  style.textContent = `
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Copy wrapper with toast
export async function copy(text, successMessage = 'Copied to clipboard!') {
  const success = await copyToClipboard(text);
  if (success) {
    toast(successMessage, 'success');
  } else {
    toast('Failed to copy', 'error');
  }
  return success;
}

// Theme toggle
export function initTheme() {
  const theme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', theme);
  
  return theme;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  
  // Force style recalculation by temporarily removing and re-adding
  document.documentElement.removeAttribute('data-theme');
  // Force a reflow
  void document.documentElement.offsetHeight;
  // Set the new theme
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Force another reflow to ensure CSS updates
  requestAnimationFrame(() => {
    void document.documentElement.offsetHeight;
  });
  
  return newTheme;
}

// Keyboard shortcuts
const shortcuts = new Map();

export function registerShortcut(key, handler, description) {
  shortcuts.set(key, { handler, description });
}

export function initKeyboardShortcuts() {
  on(document, 'keydown', (e) => {
    // Command palette: Cmd/Ctrl+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // Could open a command palette modal here
      console.log('Command palette (not implemented yet)');
      return;
    }
    
    // Help: Cmd/Ctrl+/
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const helpSection = qs('.faq');
      if (helpSection) {
        helpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstSummary = qs('details summary', helpSection);
        if (firstSummary) {
          firstSummary.focus();
        }
      }
      return;
    }
    
    // Check registered shortcuts
    const key = `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.altKey ? 'alt+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`;
    const shortcut = shortcuts.get(key);
    if (shortcut) {
      e.preventDefault();
      shortcut.handler(e);
    }
  });
}

// Download file
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize UI on load
if (document.readyState === 'loading') {
  on(document, 'DOMContentLoaded', () => {
    initTheme();
    initKeyboardShortcuts();
  });
} else {
  initTheme();
  initKeyboardShortcuts();
}

