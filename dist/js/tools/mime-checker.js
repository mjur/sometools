import { toast, on, qs, copy } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const mode = qs('#mode');
const extension = qs('#extension');
const output = qs('#output');
const copyOutputBtn = qs('#copy-output');
const extensionMode = qs('#extension-mode');
const fileMode = qs('#file-mode');
const fileInput = qs('#file-input');
const fileOutput = qs('#file-output');
const copyFileOutputBtn = qs('#copy-file-output');

const storageKey = 'mime-checker-state';

// Common MIME types
const mimeTypes = {
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'bmp': 'image/bmp',
  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'txt': 'text/plain',
  'html': 'text/html',
  'htm': 'text/html',
  'css': 'text/css',
  'js': 'text/javascript',
  'json': 'application/json',
  'xml': 'application/xml',
  'csv': 'text/csv',
  'md': 'text/markdown',
  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'm4a': 'audio/mp4',
  // Video
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'avi': 'video/x-msvideo',
  'mov': 'video/quicktime',
  // Archives
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  'tar': 'application/x-tar',
  'gz': 'application/gzip',
};

function getMimeType(ext) {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  return mimeTypes[cleanExt] || 'application/octet-stream';
}

function updateMode() {
  const currentMode = mode.value;
  if (currentMode === 'extension') {
    extensionMode.style.display = 'grid';
    fileMode.style.display = 'none';
  } else {
    extensionMode.style.display = 'none';
    fileMode.style.display = 'grid';
  }
}

function checkExtension() {
  const ext = extension.value.trim();
  if (!ext) {
    output.value = '';
    return;
  }
  
  const mimeType = getMimeType(ext);
  const cleanExt = ext.replace(/^\./, '');
  
  const result = [
    `Extension: .${cleanExt}`,
    `MIME Type: ${mimeType}`,
    '',
    'Description:',
    mimeType.startsWith('image/') ? 'Image file' :
    mimeType.startsWith('video/') ? 'Video file' :
    mimeType.startsWith('audio/') ? 'Audio file' :
    mimeType.startsWith('text/') ? 'Text file' :
    mimeType.startsWith('application/') ? 'Application file' :
    'Unknown file type'
  ].join('\n');
  
  output.value = result;
  
  saveStateWithStorage(storageKey, {
    mode: mode.value,
    extension: ext
  });
}

function checkFile() {
  const file = fileInput.files[0];
  if (!file) {
    fileOutput.value = '';
    return;
  }
  
  const result = [
    `File Name: ${file.name}`,
    `File Size: ${file.size.toLocaleString()} bytes (${(file.size / 1024).toFixed(2)} KB)`,
    `MIME Type: ${file.type || 'unknown'}`,
    '',
    'File Information:',
    `  Last Modified: ${new Date(file.lastModified).toLocaleString()}`,
  ].join('\n');
  
  fileOutput.value = result;
}

on(mode, 'change', updateMode);
on(extension, 'input', checkExtension);
on(fileInput, 'change', checkFile);
on(copyOutputBtn, 'click', async () => {
  await copy(output.value);
  toast('Output copied');
});
on(copyFileOutputBtn, 'click', async () => {
  await copy(fileOutput.value);
  toast('Output copied');
});

// Load state
const state = loadStateWithStorage(storageKey);
if (state) {
  if (state.mode) mode.value = state.mode;
  if (state.extension) extension.value = state.extension;
}

updateMode();
if (state?.extension) {
  checkExtension();
}

