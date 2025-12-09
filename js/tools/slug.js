import { on, copy, qs, toast } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const output = qs('#output');
const lowercaseCheck = qs('#lowercase');
const trimCheck = qs('#trim');
const separatorSelect = qs('#separator');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const clearBtn = qs('#clear');

// Load state
const storageKey = 'slug-generator-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.lowercase !== undefined) lowercaseCheck.checked = state.lowercase;
if (state?.trim !== undefined) trimCheck.checked = state.trim;
if (state?.separator) separatorSelect.value = state.separator;

function generateSlug(text) {
  let slug = text;
  
  // Trim if enabled
  if (trimCheck.checked) {
    slug = slug.trim();
  }
  
  // Convert to lowercase if enabled
  if (lowercaseCheck.checked) {
    slug = slug.toLowerCase();
  }
  
  // Replace spaces and special characters with separator
  const separator = separatorSelect.value;
  slug = slug
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
    .replace(/[\s_]+/g, separator) // Replace spaces and underscores with separator
    .replace(new RegExp(`${separator}+`, 'g'), separator) // Replace multiple separators with single
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), ''); // Remove leading/trailing separators
  
  return slug;
}

function updateSlug() {
  const text = input.value;
  const slug = generateSlug(text);
  output.value = slug;
  
  saveStateWithStorage(storageKey, {
    input: text,
    lowercase: lowercaseCheck.checked,
    trim: trimCheck.checked,
    separator: separatorSelect.value,
  });
}

on(input, 'input', updateSlug);
on(lowercaseCheck, 'change', updateSlug);
on(trimCheck, 'change', updateSlug);
on(separatorSelect, 'change', updateSlug);

on(copyInputBtn, 'click', async () => {
  await copy(input.value);
  toast('Input copied');
});

on(copyOutputBtn, 'click', async () => {
  await copy(output.value);
  toast('Slug copied');
});

on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  saveStateWithStorage(storageKey, {
    input: '',
    lowercase: lowercaseCheck.checked,
    trim: trimCheck.checked,
    separator: separatorSelect.value,
  });
});

// Initial update
updateSlug();

