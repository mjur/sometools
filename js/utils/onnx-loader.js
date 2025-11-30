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
    
    // Try with WASM only as fallback (for WebGL compatibility issues)
    if (sessionOptions.executionProviders.includes('webgl')) {
      console.log('Retrying with WASM only (WebGL compatibility issue)...');
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
      console.log(`Creating tensor for input: ${key}`);
      
      if (value instanceof ort.Tensor) {
        onnxInputs[key] = value;
        console.log(`Input ${key} is already a tensor`);
        continue;
      } else {
        // Get expected shape from metadata
      const metadata = inputMetadata.find(m => m.name === key);
      console.log(`Metadata for ${key}:`, metadata);
      
      let shape;
      
        // Calculate shape from data first (most reliable)
        // Check if shape is attached to the data - this is the most reliable source
        let calculatedShape = value._shape || getShape(value);
        const actualLength = value.length || (value.byteLength ? value.byteLength / 4 : 0);
        
        console.log(`Calculated shape from data: [${calculatedShape.join(',')}], actual length: ${actualLength}`);
        console.log(`Value._shape:`, value._shape);
        console.log(`Value._height:`, value._height, `Value._width:`, value._width);
        
        // If we have _shape attached, use it directly (this is set by preprocessing and is most reliable)
        if (value._shape && Array.isArray(value._shape) && value._shape.length >= 4) {
          calculatedShape = value._shape;
          console.log(`✓ Using _shape from preprocessing: [${calculatedShape.join(',')}]`);
        }
        // If we have height/width attached but no _shape, infer shape
        else if (value._height && value._width && !value._shape) {
          // Default to RGB (3 channels) unless we know otherwise
          calculatedShape = [1, 3, value._height, value._width]; // NCHW format
          console.log(`Using height/width from data (assuming RGB): [${calculatedShape.join(',')}]`);
        }
        
        // Special case: Real-ESRGAN models require 128x128 input
        // Check if this looks like a Real-ESRGAN model (input name is 'image')
        // The image should have been resized to 128x128 in enhanceImage(), but if not, force it here
        const isRealESRGAN = key === 'image';
        
        // Special case: Super resolution models require 224x224 grayscale input
        // Check if this is a super resolution model (input name is 'input' and we have 224x224 data)
        const isSuperResolution = key === 'input' && calculatedShape.length === 4 && 
                                  calculatedShape[2] === 224 && calculatedShape[3] === 224;
        const expectedGrayscaleLength = 224 * 224 * 1; // 50176
        const expectedRGBLength = 224 * 224 * 3; // 150528
        
        // Super resolution models always expect grayscale, even if preprocessing created RGB
        // We need to convert the RGB data to grayscale here
        let processedValue = value;
        let processedLength = actualLength;
        
        if (isSuperResolution && actualLength === expectedRGBLength) {
          console.warn(`⚠️ Super resolution model expects grayscale but got RGB data. Converting...`);
          console.warn(`  Expected length: ${expectedGrayscaleLength}, Actual: ${actualLength}`);
          
          // Convert RGB to grayscale by taking the first channel (R) or averaging
          // Since the data is in NCHW format: [R pixels, G pixels, B pixels]
          const numPixels = 224 * 224;
          const grayscaleData = new Float32Array(expectedGrayscaleLength);
          
          // Take R channel (first third of data) as grayscale
          for (let i = 0; i < numPixels; i++) {
            grayscaleData[i] = value[i]; // R channel
          }
          
          // Replace the value in inputs with grayscale data
          inputs[key] = grayscaleData;
          processedValue = grayscaleData;
          processedLength = expectedGrayscaleLength;
          calculatedShape = [1, 1, 224, 224];
          console.log(`✓ Converted RGB to grayscale, new shape: [${calculatedShape.join(',')}]`);
        } else if (isSuperResolution && processedLength === expectedGrayscaleLength) {
          calculatedShape = [1, 1, 224, 224];
          console.log(`✓ Super resolution detected - using grayscale shape: [${calculatedShape.join(',')}]`);
        }
        
        // For super resolution with RGB data, we've already converted it above
        // So set the shape to grayscale now
        if (isSuperResolution && processedLength === expectedGrayscaleLength) {
          calculatedShape = [1, 1, 224, 224];
          shape = [1, 1, 224, 224];
          console.log(`✓ Super resolution: Set shape to grayscale [${shape.join(',')}]`);
        }
        
        if (metadata && metadata.shape && Array.isArray(metadata.shape)) {
          // Check if model has fixed dimensions
          const modelShape = metadata.shape.map((dim, idx) => {
            if (typeof dim === 'string' || dim < 0 || dim === 'dynamic' || dim === null) {
              // Dynamic dimension - use calculated shape
              return calculatedShape[idx] || 1;
            }
            return dim;
          });
          
          // Check if height and width are fixed (indices 2 and 3 for NCHW)
          const heightIdx = 2;
          const widthIdx = 3;
          const isFixedHeight = typeof metadata.shape[heightIdx] === 'number' && 
                                metadata.shape[heightIdx] > 0 && 
                                metadata.shape[heightIdx] !== 'dynamic';
          const isFixedWidth = typeof metadata.shape[widthIdx] === 'number' && 
                               metadata.shape[widthIdx] > 0 && 
                               metadata.shape[widthIdx] !== 'dynamic';
          
          if (isFixedHeight && isFixedWidth) {
            // Model has fixed dimensions - MUST use model's shape
            // But for super resolution, override with grayscale shape if we converted the data
            if (isSuperResolution && processedLength === expectedGrayscaleLength) {
              shape = [1, 1, 224, 224];
              console.log(`✓ Super resolution: Overriding model shape with grayscale [${shape.join(',')}]`);
            } else {
              shape = modelShape;
              console.log(`✓ Using model's fixed input shape: [${shape.join(',')}]`);
            }
          } else if (isRealESRGAN) {
            // Real-ESRGAN fallback: force 128x128
            shape = [1, 3, 128, 128];
            console.log(`✓ Real-ESRGAN detected - forcing shape: [${shape.join(',')}]`);
          } else if (isSuperResolution && processedLength === expectedGrayscaleLength) {
            // Super resolution: use grayscale shape
            shape = [1, 1, 224, 224];
            console.log(`✓ Super resolution detected - using grayscale shape: [${shape.join(',')}]`);
          } else {
            // Model supports dynamic dimensions - use calculated shape
            shape = calculatedShape;
            console.log(`Using dynamic input shape: [${shape.join(',')}]`);
          }
        } else if (isRealESRGAN) {
          // Real-ESRGAN fallback: force 128x128 when metadata is not available
          shape = [1, 3, 128, 128];
          console.log(`✓ Real-ESRGAN detected (no metadata) - forcing shape: [${shape.join(',')}]`);
        } else if (isSuperResolution && processedLength === expectedGrayscaleLength) {
          // Super resolution fallback: force 224x224 grayscale when metadata is not available
          shape = [1, 1, 224, 224];
          console.log(`✓ Super resolution detected (no metadata) - forcing grayscale shape: [${shape.join(',')}]`);
        } else {
          // No metadata available, use calculated shape
          shape = calculatedShape;
        }
        
        // Final validation - ensure shape matches data
        // Use processedLength (which may have been converted to grayscale) instead of actualLength
        const finalLength = shape.reduce((a, b) => a * b, 1);
        
        // For super resolution with grayscale data, ALWAYS use grayscale shape - don't override
        if (isSuperResolution && processedLength === expectedGrayscaleLength) {
          shape = [1, 1, 224, 224];
          console.log(`✓ Super resolution: Final grayscale shape [${shape.join(',')}]`);
        } else if (processedLength > 0 && finalLength !== processedLength) {
          // Try to infer correct shape from data length
          // Common patterns: [1, 3, H, W] for NCHW RGB or [1, 1, H, W] for grayscale
          console.warn(`Shape [${shape.join(',')}] doesn't match data length ${processedLength}. Attempting to infer correct shape...`);
          
          // Check if it's grayscale (1 channel)
          if (processedLength === 224 * 224 * 1) {
            shape = [1, 1, 224, 224];
            console.log(`Inferred grayscale NCHW shape: [${shape.join(',')}]`);
          }
          // Check if it's RGB (3 channels)
          else if (processedLength === 224 * 224 * 3) {
            shape = [1, 3, 224, 224];
            console.log(`Inferred RGB NCHW shape: [${shape.join(',')}]`);
          }
          // Try NCHW format: [1, 3, H, W] where H*W = processedLength/3
          else {
            const pixels = processedLength / 3;
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
        }
        
        // For super resolution, ALWAYS ensure we use grayscale shape [1, 1, 224, 224]
        // The model expects [,1,224,224] (dynamic batch), but we'll use [1,1,224,224] which should work
        if (isSuperResolution && processedLength === expectedGrayscaleLength) {
          shape = [1, 1, 224, 224];
          console.log(`✓ Final shape for super resolution (forced): [${shape.join(',')}]`);
        }
        
        // Final check: ensure shape matches processedLength
        const finalShapeLength = shape.reduce((a, b) => a * b, 1);
        if (processedLength > 0 && finalShapeLength !== processedLength) {
          console.warn(`Shape [${shape.join(',')}] length (${finalShapeLength}) doesn't match data length (${processedLength}). Adjusting...`);
          // If we have grayscale data (50176), force grayscale shape
          if (processedLength === expectedGrayscaleLength) {
            if (isSuperResolution) {
              shape = [1, 1, 224, 224];
              console.log(`✓ Forced super resolution grayscale shape: [${shape.join(',')}]`);
            } else {
              // Try to infer from data length
              const pixels = processedLength;
              const h = Math.sqrt(pixels);
              if (Number.isInteger(h)) {
                shape = [1, 1, h, h];
                console.log(`✓ Inferred grayscale shape: [${shape.join(',')}]`);
              }
            }
          }
        }
        
        // Final override for super resolution - MUST be grayscale
        if (isSuperResolution && processedLength === expectedGrayscaleLength) {
          shape = [1, 1, 224, 224];
          console.log(`✓ Final override: Super resolution grayscale shape [${shape.join(',')}]`);
        }
        
        console.log(`Final tensor shape for ${key}: [${shape.join(',')}]`);
        console.log(`Data length: ${processedLength}, Expected from shape: ${shape.reduce((a, b) => a * b, 1)}`);
        
        // Verify shape matches data length
        const shapeLength = shape.reduce((a, b) => a * b, 1);
        if (shapeLength !== processedLength) {
          console.error(`CRITICAL: Shape [${shape.join(',')}] length (${shapeLength}) doesn't match data length (${processedLength})!`);
          // For super resolution, force correct shape
          if (isSuperResolution && processedLength === expectedGrayscaleLength) {
            shape = [1, 1, 224, 224];
            console.log(`✓ Corrected to grayscale shape: [${shape.join(',')}]`);
          }
        }
        
        try {
          onnxInputs[key] = new ort.Tensor('float32', processedValue, shape);
          console.log(`✓ Tensor created successfully with shape [${shape.join(',')}]`);
        } catch (tensorError) {
          console.error(`Failed to create tensor with shape [${shape.join(',')}]. Data length: ${processedLength}`, tensorError);
          
          // For super resolution with dynamic batch, try without specifying batch dimension
          // Some ONNX Runtime versions might need the shape without the batch dimension
          if (isSuperResolution && processedLength === expectedGrayscaleLength && tensorError.message && tensorError.message.includes('expected shape')) {
            console.warn(`Trying alternative shape format for dynamic batch dimension...`);
            // Try creating tensor and let ONNX Runtime infer the batch dimension
            // But we still need to provide the full shape, so this might not work
            // Instead, ensure the shape is exactly what the model expects
            try {
              // The model expects [,1,224,224] - try with shape that matches exactly
              // Since batch is dynamic, [1,1,224,224] should work, but if not, 
              // we might need to check the actual model input specification
              onnxInputs[key] = new ort.Tensor('float32', processedValue, [1, 1, 224, 224]);
              console.log(`✓ Tensor created with [1,1,224,224] shape`);
            } catch (retryError) {
              console.error(`Retry also failed:`, retryError);
              // Last resort: try with calculated shape
              console.warn(`Trying with calculated shape: [${calculatedShape.join(',')}]`);
              onnxInputs[key] = new ort.Tensor('float32', processedValue, calculatedShape);
            }
          } else {
            // Last resort: try to create with calculated shape
            console.warn(`Trying with calculated shape: [${calculatedShape.join(',')}]`);
            onnxInputs[key] = new ort.Tensor('float32', processedValue, calculatedShape);
          }
        }
      }
    }
    
    // Before running inference, log the input shapes for debugging
    console.log('Input tensors before inference:');
    for (const [key, tensor] of Object.entries(onnxInputs)) {
      if (tensor instanceof ort.Tensor) {
        console.log(`  ${key}: shape [${tensor.dims.join(',')}], type: ${tensor.type}`);
      }
    }
    
    // Check session input metadata if available
    if (session.inputNames && session.inputNames.length > 0) {
      console.log('Session input names:', session.inputNames);
      // Try to get input metadata from session
      try {
        if (session.inputs && Array.isArray(session.inputs)) {
          console.log('Session input specifications:');
          session.inputs.forEach((inp, idx) => {
            console.log(`  Input ${idx}: name="${inp.name}", shape=${JSON.stringify(inp.shape)}, type=${inp.type}`);
          });
        }
      } catch (e) {
        console.log('Could not access input metadata:', e);
      }
    }
    
    try {
      const outputs = await session.run(onnxInputs);
      return outputs;
    } catch (runError) {
      // If the error is about dynamic batch dimension, try to provide more context
      if (runError.message && runError.message.includes('expected shape') && runError.message.includes(',')) {
        console.error('Dynamic batch dimension error detected. The model expects a dynamic batch dimension.');
        console.error('This might be a limitation of ONNX Runtime Web. The model expects:', runError.message.match(/expected shape '([^']+)'/)?.[1]);
        console.error('We provided shape:', Object.values(onnxInputs)[0]?.dims);
        console.error('Full error:', runError);
        
        // This is likely a model compatibility issue - the model was exported with dynamic batch
        // but ONNX Runtime Web might not handle it correctly
        throw new Error(`Model input shape mismatch. The model expects a dynamic batch dimension, but ONNX Runtime Web may not support this properly. Error: ${runError.message}`);
      }
      throw runError;
    }
  } catch (error) {
    console.error('Inference error:', error);
    
    // Convert error to Error object if it's not already
    let errorObj = error;
    if (typeof error === 'number') {
      // ONNX Runtime error code
      errorObj = new Error(`ONNX Runtime error code: ${error}. This may indicate a dimension mismatch or unsupported operation.`);
    } else if (!(error instanceof Error)) {
      errorObj = new Error(String(error));
    }
    
    // Check if it's a WebGL compatibility issue (e.g., resize mode not supported)
    if (errorObj.message && (
      errorObj.message.includes('resize') && errorObj.message.includes('does not support') ||
      errorObj.message.includes('packed') && errorObj.message.includes('does not support')
    )) {
      console.warn('WebGL backend compatibility issue detected. This model may require WASM backend.');
      throw new Error(`Model operation not supported by WebGL backend. Please try using WASM backend instead. Original error: ${errorObj.message}`);
    }
    
    // Check for dimension mismatch errors
    if (errorObj.message && (
      errorObj.message.includes('mismatched dimensions') ||
      errorObj.message.includes('Concat') ||
      errorObj.message.includes('Non concat axis') ||
      errorObj.message.includes('dimension')
    )) {
      throw new Error(`Dimension mismatch: ${errorObj.message}. The model may require specific input dimensions (multiples of 8, 16, or 32).`);
    }
    
    throw errorObj;
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

