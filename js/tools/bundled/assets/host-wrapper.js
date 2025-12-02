// Worker wrapper that loads Transformers.js first, then the actual worker
// This ensures AutoTokenizer is available when the worker code runs

(async function() {
  try {
    // Load Transformers.js and make it available globally
    const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.x/dist/transformers.min.js');
    globalThis.transformers = transformers;
    globalThis.AutoTokenizer = transformers.AutoTokenizer;
    globalThis.env = transformers.env;
    console.log('[Worker] Transformers.js loaded successfully');
    
    // Now import and execute the actual worker code
    await import('./host-O6WzXidB.js');
  } catch (err) {
    console.error('[Worker] Failed to load Transformers.js or worker:', err);
    // Still try to load the worker even if transformers fails
    // The worker will handle the error when it tries to use the tokenizer
    try {
      await import('./host-O6WzXidB.js');
    } catch (workerErr) {
      console.error('[Worker] Failed to load worker:', workerErr);
    }
  }
})();

