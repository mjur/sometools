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
    
    // Check for ONNX version compatibility issues
    if (error.message && error.message.includes('IR_VERSION')) {
      throw new Error(`ONNX model version not supported. The model needs to be converted to ONNX IR version 3 or higher. Error: ${error.message}`);
    }
    
    // Try with WASM only as fallback
    if (sessionOptions.executionProviders.includes('webgl')) {
      console.log('Retrying with WASM only...');
      try {
        return await ort.InferenceSession.create(modelData, {
          ...sessionOptions,
          executionProviders: ['wasm']
        });
      } catch (wasmError) {
        // If WASM also fails with version error, throw the original error
        if (wasmError.message && wasmError.message.includes('IR_VERSION')) {
          throw new Error(`ONNX model version not supported. The model needs to be converted to ONNX IR version 3 or higher. Error: ${wasmError.message}`);
        }
        throw wasmError;
      }
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
    // Get model input metadata - try different ways to access it
    let inputMetadata = [];
    if (session.inputs && Array.isArray(session.inputs)) {
      inputMetadata = session.inputs.map(inp => ({
        name: inp.name,
        shape: inp.shape,
        type: inp.type
      }));
    } else if (session.inputNames) {
      // Fallback: create metadata from input names only
      inputMetadata = session.inputNames.map(name => ({
        name,
        shape: null // Will calculate from data
      }));
    }
    
    // Convert inputs to ONNX tensors if needed
    const onnxInputs = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (value instanceof ort.Tensor) {
        onnxInputs[key] = value;
      } else {
        // Get expected shape from metadata
        const metadata = inputMetadata.find(m => m.name === key);
        let shape;
        
        // Calculate shape from data first (most reliable)
        // Check if shape is attached to the data
        let calculatedShape = value._shape || getShape(value);
        const actualLength = value.length || (value.byteLength ? value.byteLength / 4 : 0);
        
        // If we have height/width attached, use them
        if (value._height && value._width && !value._shape) {
          calculatedShape = [1, 3, value._height, value._width]; // NCHW format
        }
        
        if (metadata && metadata.shape && Array.isArray(metadata.shape)) {
          // Use model's expected shape, but handle dynamic dimensions
          shape = metadata.shape.map((dim, idx) => {
            if (typeof dim === 'string' || dim < 0 || dim === 'dynamic' || dim === null) {
              // Dynamic dimension - use calculated shape
              return calculatedShape[idx] || 1;
            }
            return dim;
          });
          
          // Verify data length matches expected shape
          const expectedLength = shape.reduce((a, b) => a * b, 1);
          
          if (actualLength !== expectedLength && actualLength > 0) {
            console.warn(`Tensor shape mismatch for ${key}. Expected: [${shape.join(',')}] (length: ${expectedLength}), Actual length: ${actualLength}. Using calculated shape.`);
            // If mismatch, use calculated shape (from preprocessing)
            shape = calculatedShape;
          }
        } else {
          // No metadata available, use calculated shape
          shape = calculatedShape;
        }
        
        // Final validation - ensure shape matches data
        const finalLength = shape.reduce((a, b) => a * b, 1);
        if (actualLength > 0 && finalLength !== actualLength) {
          // Try to infer correct shape from data length
          // Common patterns: [1, 3, H, W] for NCHW or [1, H, W, 3] for NHWC
          console.warn(`Shape [${shape.join(',')}] doesn't match data length ${actualLength}. Attempting to infer correct shape...`);
          
          // Try NCHW format: [1, 3, H, W] where H*W = actualLength/3
          const pixels = actualLength / 3;
          const h = Math.sqrt(pixels);
          if (Number.isInteger(h)) {
            shape = [1, 3, h, h];
            console.log(`Inferred NCHW shape: [${shape.join(',')}]`);
          } else {
            // Use calculated shape as fallback
            shape = calculatedShape;
            console.log(`Using calculated shape: [${shape.join(',')}]`);
          }
        }
        
        try {
          onnxInputs[key] = new ort.Tensor('float32', value, shape);
        } catch (tensorError) {
          console.error(`Failed to create tensor with shape [${shape.join(',')}]. Data length: ${actualLength}`, tensorError);
          // Last resort: try to create with calculated shape
          onnxInputs[key] = new ort.Tensor('float32', value, calculatedShape);
        }
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

