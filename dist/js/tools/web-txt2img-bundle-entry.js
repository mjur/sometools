// web-txt2img bundle entry
// This is used by Vite to build a single bundled script that exposes
// Txt2ImgWorkerClient on window.

import { Txt2ImgWorkerClient, createTxt2ImgWorker } from 'web-txt2img';

// Expose the client class globally (using WebTxt2ImgClient as alias for compatibility)
window.WebTxt2ImgClient = Txt2ImgWorkerClient;
window.Txt2ImgWorkerClient = Txt2ImgWorkerClient;
window.createTxt2ImgWorker = createTxt2ImgWorker;

// Pre-import transformers.js so it's available for the worker
// The worker will try to import it, and having it pre-loaded helps
try {
  // Try to import transformers.js and make it available globally
  // This helps the worker find it when it tries to import
  import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.x/dist/transformers.min.js').then(transformers => {
    // Make it available globally for the worker
    window.transformers = transformers;
    window.AutoTokenizer = transformers.AutoTokenizer;
    window.env = transformers.env;
    console.log('Transformers.js pre-loaded for worker');
  }).catch(err => {
    console.warn('Could not pre-load Transformers.js:', err);
  });
} catch (err) {
  console.warn('Could not pre-load Transformers.js:', err);
}

