// Worker wrapper that loads Transformers.js first, then the actual worker
// This ensures AutoTokenizer is available when the worker code runs

// Immediate log to verify script execution
try {
  console.log('[Worker] Wrapper script starting...');
  console.log('[Worker] Self:', typeof self !== 'undefined' ? 'exists' : 'missing');
  console.log('[Worker] GlobalThis:', typeof globalThis !== 'undefined' ? 'exists' : 'missing');
} catch (e) {
  console.error('[Worker] Error in initial logging:', e);
}

(async function() {
  console.log('[Worker] Async IIFE starting...');
  try {
    // Load Transformers.js and make it available globally
    const transformersModule = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.x/dist/transformers.min.js');
    
    // Log what we got from the module
    console.log('[Worker] Transformers module keys:', {
      moduleKeys: Object.keys(transformersModule).slice(0, 30),
      hasDefault: !!transformersModule.default,
      defaultType: transformersModule.default ? typeof transformersModule.default : 'undefined',
      hasAutoProcessor: !!transformersModule.AutoProcessor,
      hasMultiModalityCausalLM: !!transformersModule.MultiModalityCausalLM,
      hasAutoTokenizer: !!transformersModule.AutoTokenizer
    });
    
    // Create a transformers object with all exports
    // Use a simple approach: create new object and copy all enumerable properties
    // Then explicitly set the critical ones to ensure they're there
    const transformers = Object.assign({}, transformersModule);
    
    // Remove 'default' if it exists as a key (we'll merge it separately if needed)
    if ('default' in transformers) {
      delete transformers.default;
    }
    
    // If there's a default export that's an object, merge its properties
    if (transformersModule.default && typeof transformersModule.default === 'object') {
      Object.assign(transformers, transformersModule.default);
    }
    
    // Explicitly ensure critical classes exist (they should already be there, but be sure)
    if (transformersModule.AutoProcessor) {
      transformers.AutoProcessor = transformersModule.AutoProcessor;
    }
    if (transformersModule.MultiModalityCausalLM) {
      transformers.MultiModalityCausalLM = transformersModule.MultiModalityCausalLM;
    }
    if (transformersModule.AutoTokenizer) {
      transformers.AutoTokenizer = transformersModule.AutoTokenizer;
    }
    if (transformersModule.env) {
      transformers.env = transformersModule.env;
    }
    
    // Final verification - check if properties are actually on the object
    console.log('[Worker] Final transformers check:', {
      hasOwnAutoProcessor: transformers.hasOwnProperty('AutoProcessor'),
      AutoProcessor: !!transformers.AutoProcessor,
      AutoProcessorType: typeof transformers.AutoProcessor,
      hasAutoProcessorIn: 'AutoProcessor' in transformers,
      keys: Object.keys(transformers).filter(k => k.includes('Auto') || k.includes('Multi') || k.includes('Processor')).slice(0, 15),
      allPropertyNames: Object.getOwnPropertyNames(transformers).filter(k => k.includes('Auto') || k.includes('Multi') || k.includes('Processor')).slice(0, 15)
    });
    
    // Log what we're setting
    console.log('[Worker] Transformers object keys:', {
      transformersKeys: Object.keys(transformers).filter(k => k.includes('Auto') || k.includes('Multi') || k.includes('Processor') || k.includes('env')).slice(0, 20),
      hasAutoProcessor: !!transformers.AutoProcessor,
      hasMultiModalityCausalLM: !!transformers.MultiModalityCausalLM,
      hasAutoTokenizer: !!transformers.AutoTokenizer,
      hasEnv: !!transformers.env
    });
    
    // Set all the names that the worker might look for
    // The Janus adapter checks: g.transformers || g.HFTransformers || g.HuggingFaceTransformers
    // And then accesses: hf.AutoProcessor.from_pretrained
    // Use Object.freeze to prevent accidental overwrites, but first ensure all properties are enumerable
    // Actually, don't freeze - just ensure we're setting it correctly
    Object.defineProperty(globalThis, 'transformers', {
        value: transformers,
        writable: true,
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(globalThis, 'HFTransformers', {
        value: transformers,
        writable: true,
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(globalThis, 'HuggingFaceTransformers', {
        value: transformers,
        writable: true,
        enumerable: true,
        configurable: true
    });
    
    // Verify it's set correctly
    console.log('[Worker] globalThis.transformers verification:', {
        exists: !!globalThis.transformers,
        isSame: globalThis.transformers === transformers,
        hasAutoProcessor: !!(globalThis.transformers && globalThis.transformers.AutoProcessor),
        keys: globalThis.transformers ? Object.keys(globalThis.transformers).filter(k => k.includes('Auto') || k.includes('Multi') || k.includes('Processor')).slice(0, 15) : []
    });
    
    // Set individual globals for direct access (for SD-Turbo tokenizer)
    globalThis.AutoTokenizer = transformers.AutoTokenizer;
    globalThis.AutoProcessor = transformers.AutoProcessor;
    globalThis.MultiModalityCausalLM = transformers.MultiModalityCausalLM;
    globalThis.env = transformers.env;
    
    // Verify accessibility as the Janus adapter expects
    // The Janus adapter does: hf = g.transformers, then hf.AutoProcessor.from_pretrained
    const testHf = globalThis.transformers;
    const hasAutoProcessor = !!(testHf && testHf.AutoProcessor && typeof testHf.AutoProcessor.from_pretrained === 'function');
    const hasMultiModalityCausalLM = !!(testHf && testHf.MultiModalityCausalLM && typeof testHf.MultiModalityCausalLM.from_pretrained === 'function');
    
    console.log('[Worker] Transformers.js loaded', {
      hasAutoTokenizer: !!(testHf && testHf.AutoTokenizer && typeof testHf.AutoTokenizer.from_pretrained === 'function'),
      hasAutoProcessor,
      hasMultiModalityCausalLM,
      hasEnv: !!(testHf && testHf.env),
      AutoProcessorType: testHf ? typeof testHf.AutoProcessor : 'undefined',
      testHfExists: !!testHf,
      testHfAutoProcessor: !!(testHf && testHf.AutoProcessor),
      sampleKeys: testHf ? Object.keys(testHf).filter(k => 
        k.includes('Auto') || k.includes('Multi') || k.includes('Causal') || k.includes('Processor')
      ).slice(0, 10) : []
    });
    
    // Verify the classes are accessible as the Janus adapter expects
    if (!hasAutoProcessor || !hasMultiModalityCausalLM) {
      console.error('[Worker] Missing required classes or methods!', {
        testHf: !!testHf,
        AutoProcessor: !!(testHf && testHf.AutoProcessor),
        AutoProcessorType: testHf ? typeof testHf.AutoProcessor : 'undefined',
        AutoProcessorFromPretrained: !!(testHf && testHf.AutoProcessor && testHf.AutoProcessor.from_pretrained),
        MultiModalityCausalLM: !!(testHf && testHf.MultiModalityCausalLM),
        MultiModalityCausalLMType: testHf ? typeof testHf.MultiModalityCausalLM : 'undefined',
        moduleKeys: Object.keys(transformersModule).filter(k => k.includes('Auto') || k.includes('Multi') || k.includes('Processor')).slice(0, 20),
        transformersKeys: testHf ? Object.keys(testHf).filter(k => k.includes('Auto') || k.includes('Multi') || k.includes('Processor')).slice(0, 20) : []
      });
    }
    
    // Now import and execute the actual worker code
    console.log('[Worker] Loading host-O6WzXidB.js...');
    try {
      await import('./host-O6WzXidB.js');
      console.log('[Worker] host-O6WzXidB.js loaded successfully');
    } catch (importErr) {
      console.error('[Worker] Failed to import host-O6WzXidB.js:', importErr);
      console.error('[Worker] Import error details:', {
        message: importErr.message,
        stack: importErr.stack,
        name: importErr.name
      });
      throw importErr;
    }
  } catch (err) {
    console.error('[Worker] Failed to load Transformers.js or worker:', err);
    console.error('[Worker] Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    // Still try to load the worker even if transformers fails
    // The worker will handle the error when it tries to use the tokenizer
    try {
      console.log('[Worker] Attempting to load worker without Transformers.js...');
      await import('./host-O6WzXidB.js');
      console.log('[Worker] Worker loaded without Transformers.js');
    } catch (workerErr) {
      console.error('[Worker] Failed to load worker:', workerErr);
      console.error('[Worker] Worker error details:', {
        message: workerErr.message,
        stack: workerErr.stack,
        name: workerErr.name
      });
      // Re-throw so the error is visible
      throw workerErr;
    }
  }
})();

