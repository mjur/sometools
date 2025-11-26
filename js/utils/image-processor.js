// Image processing utilities for ONNX models
// Handles preprocessing, inference, and post-processing

import { createInferenceSession, runInference } from './onnx-loader.js';

/**
 * Preprocess image for ONNX model input
 * @param {HTMLImageElement|HTMLCanvasElement} image - Source image
 * @param {Object} options - Preprocessing options
 * @param {number} options.targetWidth - Target width (optional)
 * @param {number} options.targetHeight - Target height (optional)
 * @param {boolean} options.normalize - Normalize to [0, 1] range (default: true)
 * @param {Array<number>} options.mean - Mean values for normalization (default: [0.5, 0.5, 0.5])
 * @param {Array<number> options.std - Std values for normalization (default: [0.5, 0.5, 0.5])
 * @param {string} options.inputName - ONNX input tensor name (default: 'input')
 * @returns {Object} Preprocessed tensor data
 */
export function preprocessImage(image, options = {}) {
  const {
    targetWidth,
    targetHeight,
    normalize = true,
    mean = [0.5, 0.5, 0.5],
    std = [0.5, 0.5, 0.5],
    inputName = 'input'
  } = options;
  
  // Create canvas for processing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Determine dimensions
  let width = image.width;
  let height = image.height;
  
  if (targetWidth && targetHeight) {
    width = targetWidth;
    height = targetHeight;
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Draw and resize image
  ctx.drawImage(image, 0, 0, width, height);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Convert to float32 array
  // Most ONNX models expect NCHW format: [batch, channels, height, width]
  const numPixels = width * height;
  const inputData = new Float32Array(1 * 3 * height * width);
  
  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    
    // Normalize to [0, 1] and apply mean/std
    // NCHW format: R channel, then G channel, then B channel
    if (normalize) {
      inputData[i] = ((r / 255.0) - mean[0]) / std[0];
      inputData[i + numPixels] = ((g / 255.0) - mean[1]) / std[1];
      inputData[i + numPixels * 2] = ((b / 255.0) - mean[2]) / std[2];
    } else {
      inputData[i] = r / 255.0;
      inputData[i + numPixels] = g / 255.0;
      inputData[i + numPixels * 2] = b / 255.0;
    }
  }
  
  // Store shape info on the array itself for tensor creation
  const result = {
    [inputName]: inputData,
    shape: [1, 3, height, width], // NCHW format
    originalWidth: image.width,
    originalHeight: image.height,
    processedWidth: width,
    processedHeight: height
  };
  
  // Attach shape info to the array for easier access
  if (inputData && typeof inputData === 'object') {
    inputData._shape = [1, 3, height, width];
    inputData._height = height;
    inputData._width = width;
  }
  
  return result;
}

/**
 * Postprocess ONNX model output to image
 * @param {Float32Array|TypedArray} outputData - Model output tensor
 * @param {Object} metadata - Metadata from preprocessing
 * @param {Object} options - Postprocessing options
 * @param {boolean} options.denormalize - Denormalize from [0, 1] range (default: true)
 * @param {Array<number>} options.mean - Mean values (default: [0.5, 0.5, 0.5])
 * @param {Array<number>} options.std - Std values (default: [0.5, 0.5, 0.5])
 * @param {number} options.scaleFactor - Scale factor for upscaling (default: 1)
 * @returns {HTMLCanvasElement} Canvas with processed image
 */
export function postprocessImage(outputData, metadata, options = {}) {
  const {
    denormalize = true,
    mean = [0.5, 0.5, 0.5],
    std = [0.5, 0.5, 0.5],
    scaleFactor = 1
  } = options;
  
  // Determine output dimensions
  let outputWidth, outputHeight;
  
  if (metadata.shape && metadata.shape.length >= 4) {
    // Most ONNX models use NCHW: [batch, channels, height, width]
    if (metadata.shape[1] === 3 || metadata.shape[1] === 1 || metadata.shape[1] === 4) {
      // NCHW: [batch, channels, height, width]
      outputHeight = metadata.shape[2];
      outputWidth = metadata.shape[3];
    } else if (metadata.shape[3] === 3 || metadata.shape[3] === 1 || metadata.shape[3] === 4) {
      // NHWC: [batch, height, width, channels]
      outputHeight = metadata.shape[1];
      outputWidth = metadata.shape[2];
    } else {
      // Try to infer from shape
      outputHeight = metadata.shape[metadata.shape.length - 2] || metadata.processedHeight * scaleFactor;
      outputWidth = metadata.shape[metadata.shape.length - 1] || metadata.processedWidth * scaleFactor;
    }
  } else {
    // Fallback: use scale factor
    outputWidth = metadata.processedWidth * scaleFactor;
    outputHeight = metadata.processedHeight * scaleFactor;
  }
  
  // Create output canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(outputWidth, outputHeight);
  
  // Determine data layout
  const numPixels = outputWidth * outputHeight;
  let isNCHW = true; // Default to NCHW (most common)
  
  if (metadata.shape && metadata.shape.length >= 4) {
    // NCHW: channels in position 1, NHWC: channels in position 3
    isNCHW = (metadata.shape[1] === 3 || metadata.shape[1] === 1 || metadata.shape[1] === 4);
  }
  
  // Convert output to image data
  for (let i = 0; i < numPixels; i++) {
    let r, g, b;
    
    if (isNCHW) {
      // NCHW format: [batch, channels, height, width]
      // Data is organized as: [R pixels..., G pixels..., B pixels...]
      r = outputData[i];
      g = outputData[numPixels + i];
      b = outputData[numPixels * 2 + i];
    } else {
      // NHWC format: [batch, height, width, channels]
      // Data is organized as: [RGB, RGB, RGB, ...]
      r = outputData[i * 3];
      g = outputData[i * 3 + 1];
      b = outputData[i * 3 + 2];
    }
    
    // Denormalize if needed
    if (denormalize) {
      r = (r * std[0] + mean[0]) * 255.0;
      g = (g * std[1] + mean[1]) * 255.0;
      b = (b * std[2] + mean[2]) * 255.0;
    } else {
      r = r * 255.0;
      g = g * 255.0;
      b = b * 255.0;
    }
    
    // Clamp to [0, 255]
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    
    // Set pixel data
    imageData.data[i * 4] = r;
    imageData.data[i * 4 + 1] = g;
    imageData.data[i * 4 + 2] = b;
    imageData.data[i * 4 + 3] = 255; // Alpha
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Process image with ONNX model
 * @param {HTMLImageElement|HTMLCanvasElement} image - Input image
 * @param {ort.InferenceSession} session - ONNX inference session
 * @param {Object} options - Processing options
 * @returns {Promise<HTMLCanvasElement>} Processed image canvas
 */
export async function processImageWithModel(image, session, options = {}) {
  const {
    preprocessOptions = {},
    postprocessOptions = {},
    inputName = 'input',
    outputName = 'output'
  } = options;
  
  // Preprocess
  const preprocessed = preprocessImage(image, {
    inputName,
    ...preprocessOptions
  });
  
  // Run inference
  // Pass the shape metadata along with the data
  const inputs = {};
  inputs[inputName] = preprocessed[inputName];
  
  // Store shape info for tensor creation
  if (!preprocessed.shape) {
    preprocessed.shape = [1, 3, preprocessed.processedHeight, preprocessed.processedWidth];
  }
  
  const outputs = await runInference(session, inputs);
  
  // Get output tensor
  let outputTensor = outputs[outputName];
  if (!outputTensor && Object.keys(outputs).length > 0) {
    // Use first output if name doesn't match
    outputTensor = outputs[Object.keys(outputs)[0]];
  }
  
  if (!outputTensor) {
    throw new Error('No output tensor found from model');
  }
  
  // Convert tensor to array if needed
  let outputData;
  let outputDims;
  
  if (outputTensor instanceof Float32Array || outputTensor instanceof Uint8Array) {
    outputData = outputTensor;
    outputDims = preprocessed.shape; // Use preprocessing shape as fallback
  } else if (outputTensor.data) {
    outputData = outputTensor.data;
    outputDims = outputTensor.dims || outputTensor.shape || preprocessed.shape;
  } else if (Array.isArray(outputTensor)) {
    outputData = new Float32Array(outputTensor);
    outputDims = preprocessed.shape;
  } else {
    throw new Error('Unsupported output tensor format');
  }
  
  // Postprocess
  const postMetadata = {
    shape: outputDims || preprocessed.shape,
    processedWidth: preprocessed.processedWidth,
    processedHeight: preprocessed.processedHeight,
    originalWidth: preprocessed.originalWidth,
    originalHeight: preprocessed.originalHeight
  };
  
  return postprocessImage(outputData, postMetadata, postprocessOptions);
}

/**
 * Resize image while maintaining aspect ratio
 * @param {HTMLImageElement|HTMLCanvasElement} image - Source image
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {HTMLCanvasElement} Resized canvas
 */
export function resizeImage(image, maxWidth, maxHeight) {
  let width = image.width;
  let height = image.height;
  
  // Calculate scaling to fit within max dimensions
  const scale = Math.min(maxWidth / width, maxHeight / height);
  
  if (scale < 1) {
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  
  return canvas;
}

/**
 * Load image from URL or File
 * @param {string|File} source - Image URL or File object
 * @returns {Promise<HTMLImageElement>} Loaded image
 */
export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    
    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(source);
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}

/**
 * Convert canvas to blob
 * @param {HTMLCanvasElement} canvas - Canvas to convert
 * @param {string} mimeType - MIME type (default: 'image/png')
 * @param {number} quality - Quality for JPEG (0-1, default: 0.92)
 * @returns {Promise<Blob>} Image blob
 */
export function canvasToBlob(canvas, mimeType = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, mimeType, quality);
  });
}

