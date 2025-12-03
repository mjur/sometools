import { C as CreateMLCEngine, M as MLCEngine } from './assets/index-Ci6f6unR.js';

// This file will be bundled with WebLLM using Vite
// It exports the WebLLM CreateMLCEngine function for use in regex-generator.js


// Export for use in regex-generator.js
if (typeof window !== 'undefined') {
  window.CreateMLCEngine = CreateMLCEngine;
  window.MLCEngine = MLCEngine;
}
