import { on, copy, qs, toast } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const markdownInput = qs('#markdown-input');
const markdownPreview = qs('#markdown-preview');
const autoPreviewCheck = qs('#auto-preview');
const clearBtn = qs('#clear');
const copyHtmlBtn = qs('#copy-html');

// Load state
const storageKey = 'markdown-editor-state';
const state = loadStateWithStorage(storageKey);
if (state?.markdown) markdownInput.value = state.markdown;
if (state?.autoPreview !== undefined) autoPreviewCheck.checked = state.autoPreview;

// Initialize marked if available
let markedInstance = null;
if (typeof marked !== 'undefined') {
  markedInstance = marked;
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
}

function updatePreview() {
  if (!markedInstance) {
    markdownPreview.innerHTML = '<p style="color: var(--error);">Markdown library not loaded. Please refresh the page.</p>';
    return;
  }
  
  const markdown = markdownInput.value;
  try {
    const html = markedInstance.parse(markdown);
    markdownPreview.innerHTML = html;
    
    // Save state
    saveStateWithStorage(storageKey, {
      markdown,
      autoPreview: autoPreviewCheck.checked,
    });
  } catch (error) {
    markdownPreview.innerHTML = `<p style="color: var(--error);">Error parsing Markdown: ${error.message}</p>`;
  }
}

// Auto-preview
on(markdownInput, 'input', () => {
  if (autoPreviewCheck.checked) {
    updatePreview();
  }
});

on(autoPreviewCheck, 'change', () => {
  if (autoPreviewCheck.checked) {
    updatePreview();
  }
});

// Manual preview update
on(markdownInput, 'keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    updatePreview();
  }
});

on(clearBtn, 'click', () => {
  if (confirm('Clear all content?')) {
    markdownInput.value = '';
    markdownPreview.innerHTML = '';
    saveStateWithStorage(storageKey, {
      markdown: '',
      autoPreview: autoPreviewCheck.checked,
    });
  }
});

on(copyHtmlBtn, 'click', async () => {
  if (!markedInstance) {
    toast('Markdown library not loaded');
    return;
  }
  
  try {
    const html = markedInstance.parse(markdownInput.value);
    await copy(html);
    toast('HTML copied to clipboard');
  } catch (error) {
    toast(`Error: ${error.message}`);
  }
});

// Initial preview
if (markdownInput.value && autoPreviewCheck.checked) {
  updatePreview();
}

