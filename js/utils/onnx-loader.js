// ONNX.js loader utility
// Handles ONNX Runtime initialization and model loading

let ort = null;
let isInitialized = false;

/**
 * Load ONNX Runtime library
 */
export async function loadONNXRuntime() {
  if (ort) return ort;
  
  try {
    // Try CDN sources first (since we're using vanilla JS modules)
    const cdnSources = [
      {
        url: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.0/dist/ort.min.js',
        name: 'jsdelivr'
      },
      {
        url: 'https://unpkg.com/onnxruntime-web@1.16.0/dist/ort.min.js',
        name: 'unpkg'
      }
    ];
    
    // Try loading from CDN via script tag
    for (const source of cdnSources) {
      try {
        console.log(`Trying to load ONNX Runtime from: ${source.name}`);
        
        // Load via script tag (onnxruntime-web exposes global 'ort' object)
        await new Promise((resolve, reject) => {
          if (window.ort) {
            ort = window.ort;
            resolve();
            return;
          }
          
          const script = document.createElement('script');
          script.src = source.url;
          script.onload = () => {
            if (window.ort) {
              ort = window.ort;
              console.log(`ONNX Runtime loaded from ${source.name}`);
              resolve();
            } else {
              reject(new Error('ONNX Runtime not found on window object'));
            }
          };
          script.onerror = () => {
            reject(new Error(`Failed to load from ${source.name}`));
          };
          document.head.appendChild(script);
        });
        
        break; // Success, exit loop
      } catch (error) {
        console.warn(`Failed to load from ${source.name}:`, error);
        continue;
      }
    }
    
    // Fallback: Try ES module import (requires bundler)
    if (!ort) {
      try {
        ort = await import('onnxruntime-web');
      } catch (importError) {
        throw new Error('ONNX Runtime not available. Please ensure you have an internet connection or bundle onnxruntime-web.');
      }
    }
    
    // Configure ONNX Runtime
    if (ort && ort.env) {
      // Set WebGL backend as default (better browser support)
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
    }
    
    isInitialized = true;
    console.log('ONNX Runtime loaded successfully');
    return ort;
  } catch (error) {
    console.error('Failed to load ONNX Runtime:', error);
    throw new Error(`Failed to load ONNX Runtime: ${error.message}`);
  }
}

/**
 * Create an ONNX inference session from a model buffer
 * @param {ArrayBuffer|Uint8Array} modelData - The ONNX model data
 * @param {Object} options - Session options
 * @returns {Promise<ort.InferenceSession>} ONNX inference session
 */
export async function createInferenceSession(modelData, options = {}) {
  if (!isInitialized) {
    await loadONNXRuntime();
  }
  
  if (!ort) {
    throw new Error('ONNX Runtime not loaded');
  }
  
  const sessionOptions = {
    executionProviders: ['webgl', 'wasm'], // Try WebGL first, fallback to WASM
    graphOptimizationLevel: 'all',
    ...options
  };
  
  try {
    const session = await ort.InferenceSession.create(modelData, sessionOptions);
    console.log('ONNX session created successfully');
    return session;
  } catch (error) {
    console.error('Failed to create ONNX session:', error);
    // Try with WASM only as fallback
    if (sessionOptions.executionProviders.includes('webgl')) {
      console.log('Retrying with WASM only...');
      return await ort.InferenceSession.create(modelData, {
        ...sessionOptions,
        executionProviders: ['wasm']
      });
    }
    throw error;
  }
}

/**
 * Run inference on an ONNX model
 * @param {ort.InferenceSession} session - The inference session
 * @param {Object} inputs - Input tensors (key-value pairs)
 * @returns {Promise<Object>} Output tensors
 */
export async function runInference(session, inputs) {
  if (!session) {
    throw new Error('Session not initialized');
  }
  
  try {
    // Convert inputs to ONNX tensors if needed
    const onnxInputs = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (value instanceof ort.Tensor) {
        onnxInputs[key] = value;
      } else {
        // Assume it's a typed array or array
        onnxInputs[key] = new ort.Tensor('float32', value, getShape(value));
      }
    }
    
    const outputs = await session.run(onnxInputs);
    return outputs;
  } catch (error) {
    console.error('Inference error:', error);
    throw error;
  }
}

/**
 * Get shape of an array (helper function)
 */
function getShape(arr) {
  const shape = [];
  let current = arr;
  
  while (Array.isArray(current)) {
    shape.push(current.length);
    current = current[0];
  }
  
  return shape;
}

/**
 * Check if ONNX Runtime is available
 */
export function isONNXAvailable() {
  return isInitialized && ort !== null;
}

/**
 * Get available execution providers
 */
export async function getExecutionProviders() {
  if (!isInitialized) {
    await loadONNXRuntime();
  }
  
  const providers = [];
  
  // Check WebGL
  if (typeof WebGLRenderingContext !== 'undefined') {
    providers.push('webgl');
  }
  
  // Check WebGPU (experimental)
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    providers.push('webgpu');
  }
  
  // WASM is always available
  providers.push('wasm');
  
  return providers;
}

