import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { generateUUIDv1, generateUUIDv2, generateUUIDv3, generateUUIDv4, generateUUIDv5 } from '/js/utils/uuid.js';

const output = qs('#output');
const generateBtn = qs('#generate');
const copyBtn = qs('#copy');
const clearBtn = qs('#clear');
const versionSelect = qs('#version');
const namespaceSelect = qs('#namespace');
const namespaceCustomInput = qs('#namespace-custom');
const nameInput = qs('#name');
const countInput = qs('#count');
const namespaceGroup = qs('#namespace-group');
const namespaceCustomGroup = qs('#namespace-custom-group');
const nameGroup = qs('#name-group');

// Load state
const storageKey = 'uuid-state';
const state = loadStateWithStorage(storageKey);
if (state?.version) versionSelect.value = state.version;
if (state?.namespace) namespaceSelect.value = state.namespace;
if (state?.namespaceCustom) namespaceCustomInput.value = state.namespaceCustom;
if (state?.name) nameInput.value = state.name;
if (state?.count) countInput.value = state.count;

// Show/hide fields based on version
function updateFieldsVisibility() {
  const version = versionSelect.value;
  const needsNamespace = version === 'v3' || version === 'v5';
  
  if (needsNamespace) {
    namespaceGroup.style.display = 'flex';
    nameGroup.style.display = 'flex';
    
    if (namespaceSelect.value === 'custom') {
      namespaceCustomGroup.style.display = 'flex';
    } else {
      namespaceCustomGroup.style.display = 'none';
    }
  } else {
    namespaceGroup.style.display = 'none';
    namespaceCustomGroup.style.display = 'none';
    nameGroup.style.display = 'none';
  }
}

// Initial visibility update
updateFieldsVisibility();

// Update visibility when version changes
on(versionSelect, 'change', () => {
  updateFieldsVisibility();
  saveState();
});

// Update visibility when namespace changes
on(namespaceSelect, 'change', () => {
  updateFieldsVisibility();
  saveState();
});

// Save state
function saveState() {
  saveStateWithStorage({
    version: versionSelect.value,
    namespace: namespaceSelect.value,
    namespaceCustom: namespaceCustomInput.value,
    name: nameInput.value,
    count: countInput.value
  }, storageKey);
}

// Save state on input changes
on(namespaceCustomInput, 'input', saveState);
on(nameInput, 'input', saveState);
on(countInput, 'input', saveState);

// Generate UUIDs
async function generate() {
  const version = versionSelect.value;
  const count = parseInt(countInput.value, 10) || 1;
  
  if (count < 1 || count > 100) {
    toast('Count must be between 1 and 100', 'error');
    return;
  }
  
  try {
    const uuids = [];
    
    if (version === 'v4') {
      // v4: Random
      for (let i = 0; i < count; i++) {
        uuids.push(generateUUIDv4());
      }
    } else if (version === 'v1') {
      // v1: Time-based
      for (let i = 0; i < count; i++) {
        uuids.push(generateUUIDv1());
      }
    } else if (version === 'v2') {
      // v2: DCE Security
      for (let i = 0; i < count; i++) {
        uuids.push(generateUUIDv2());
      }
    } else if (version === 'v3') {
      // v3: Name-based MD5
      const namespace = namespaceSelect.value === 'custom' 
        ? namespaceCustomInput.value.trim() 
        : namespaceSelect.value;
      const name = nameInput.value.trim();
      
      if (!namespace) {
        toast('Please enter a namespace', 'error');
        return;
      }
      if (!name) {
        toast('Please enter a name', 'error');
        return;
      }
      
      // Validate namespace UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (namespaceSelect.value === 'custom' && !uuidRegex.test(namespace)) {
        toast('Invalid namespace UUID format', 'error');
        return;
      }
      
      for (let i = 0; i < count; i++) {
        const uuid = await generateUUIDv3(namespace, name);
        uuids.push(uuid);
      }
    } else if (version === 'v5') {
      // v5: Name-based SHA-1
      const namespace = namespaceSelect.value === 'custom' 
        ? namespaceCustomInput.value.trim() 
        : namespaceSelect.value;
      const name = nameInput.value.trim();
      
      if (!namespace) {
        toast('Please enter a namespace', 'error');
        return;
      }
      if (!name) {
        toast('Please enter a name', 'error');
        return;
      }
      
      // Validate namespace UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (namespaceSelect.value === 'custom' && !uuidRegex.test(namespace)) {
        toast('Invalid namespace UUID format', 'error');
        return;
      }
      
      // Check Web Crypto API availability
      if (!crypto || !crypto.subtle) {
        toast('Web Crypto API is not available. Please use HTTPS or localhost.', 'error');
        return;
      }
      
      for (let i = 0; i < count; i++) {
        const uuid = await generateUUIDv5(namespace, name);
        uuids.push(uuid);
      }
    }
    
    output.value = uuids.join('\n');
    saveState();
    toast(`Generated ${count} UUID${count > 1 ? 's' : ''}`, 'success');
  } catch (e) {
    console.error('UUID generation error:', e);
    toast(`Error: ${e.message}`, 'error');
  }
}

// Buttons
on(generateBtn, 'click', generate);
on(copyBtn, 'click', () => {
  if (output.value) {
    copy(output.value, 'UUIDs copied!');
  } else {
    toast('No UUIDs to copy', 'error');
  }
});
on(clearBtn, 'click', () => {
  output.value = '';
  output.focus();
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

