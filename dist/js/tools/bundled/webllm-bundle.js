import { w as webllm, C as CreateMLCEngine } from './assets/index-Ci6f6unR.js';

// WebLLM bundle entry
// This is used by Vite to build a single bundled script that exposes both
// CreateMLCEngine and the full webllm API on window.


// Expose the full WebLLM namespace (for cache helpers etc.)
window.webllm = webllm;

// Preserve the existing global used by tools
window.CreateMLCEngine = CreateMLCEngine;
