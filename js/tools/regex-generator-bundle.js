// This file will be bundled with WebLLM using Vite
// It exports the WebLLM CreateMLCEngine function for use in regex-generator.js

import { CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm';

// Export for use in regex-generator.js
if (typeof window !== 'undefined') {
  window.CreateMLCEngine = CreateMLCEngine;
  window.MLCEngine = MLCEngine;
}

export { CreateMLCEngine, MLCEngine };
export default CreateMLCEngine;

