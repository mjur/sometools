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
    inputName = 'input',
    grayscale = false // If true, convert to grayscale (1 channel instead of 3)
  } = options;
  
  console.log(`preprocessImage: grayscale=${grayscale}, targetSize=${targetWidth}x${targetHeight}`);
  
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
  const numPixels = width * height;
  const numChannels = grayscale ? 1 : 3;
  const inputData = new Float32Array(1 * numChannels * height * width);
  
  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    
    if (grayscale) {
      // Convert RGB to grayscale using luminance formula
      const gray = (0.299 * r + 0.587 * g + 0.114 * b);
      
      // Normalize to [0, 1] and apply mean/std
      if (normalize) {
        inputData[i] = ((gray / 255.0) - mean[0]) / std[0];
      } else {
        inputData[i] = gray / 255.0;
      }
    } else {
      // RGB format: R channel, then G channel, then B channel
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
  }
  
  // Store shape info on the array itself for tensor creation
  const result = {
    [inputName]: inputData,
    shape: [1, numChannels, height, width], // NCHW format
    originalWidth: image.width,
    originalHeight: image.height,
    processedWidth: width,
    processedHeight: height
  };
  
  // Attach shape info directly to the Float32Array for tensor creation
  // This is critical for the tensor creation to use the correct shape
  if (inputData && inputData instanceof Float32Array) {
    inputData._shape = [1, numChannels, height, width];
    inputData._height = height;
    inputData._width = width;
    console.log(`Attached shape metadata to inputData: [${inputData._shape.join(',')}], dimensions: ${width}x${height}, grayscale: ${grayscale}`);
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
  
  console.log('postprocessImage: Determining output dimensions from metadata.shape:', metadata.shape);
  
  // Determine output dimensions
  let outputWidth, outputHeight;
  
  if (metadata.shape && metadata.shape.length >= 4) {
    console.log('postprocessImage: Shape has 4+ dimensions, parsing...');
    // Most ONNX models use NCHW: [batch, channels, height, width]
    const numChannels = metadata.shape[1];
    if (numChannels === 3 || numChannels === 1 || numChannels === 4) {
      // NCHW: [batch, channels, height, width]
      outputHeight = metadata.shape[2];
      outputWidth = metadata.shape[3];
    } else if (metadata.shape[3] === 3 || metadata.shape[3] === 1 || metadata.shape[3] === 4) {
      // NHWC: [batch, height, width, channels]
      outputHeight = metadata.shape[1];
      outputWidth = metadata.shape[2];
    } else if (numChannels === 2) {
      // 2-channel output (likely AB channels from LAB color space)
      outputHeight = metadata.shape[2];
      outputWidth = metadata.shape[3];
      console.log('postprocessImage: Detected 2-channel output (likely LAB AB channels)');
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
  const numChannels = metadata.shape && metadata.shape.length >= 4 ? metadata.shape[1] : 3;
  const isLABOutput = numChannels === 2; // 2-channel output is likely LAB AB channels
  
  console.log('postprocessImage: numChannels:', numChannels, 'isLABOutput:', isLABOutput);
  
  if (metadata.shape && metadata.shape.length >= 4) {
    // NCHW: channels in position 1, NHWC: channels in position 3
    isNCHW = (metadata.shape[1] === 3 || metadata.shape[1] === 1 || metadata.shape[1] === 4 || metadata.shape[1] === 2);
  }
  
  // Pre-extract L channel from original image if needed for LAB output
  let lChannelData = null;
  if (isLABOutput && metadata.originalImage) {
    console.log('postprocessImage: Extracting L channel from original image...');
    const origCanvas = document.createElement('canvas');
    origCanvas.width = metadata.processedWidth;
    origCanvas.height = metadata.processedHeight;
    const origCtx = origCanvas.getContext('2d');
    origCtx.drawImage(metadata.originalImage, 0, 0, metadata.processedWidth, metadata.processedHeight);
    const origData = origCtx.getImageData(0, 0, metadata.processedWidth, metadata.processedHeight);
    
    lChannelData = new Float32Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
      const origR = origData.data[i * 4];
      const origG = origData.data[i * 4 + 1];
      const origB = origData.data[i * 4 + 2];
      
      // Convert RGB to LAB to get L channel
      // RGB to XYZ
      let r = origR / 255.0;
      let g = origG / 255.0;
      let b = origB / 255.0;
      
      // Apply gamma correction
      r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
      g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
      b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
      
      // Reference white (D65)
      r *= 100;
      g *= 100;
      b *= 100;
      
      // XYZ to LAB
      let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 95.047;
      let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 100.0;
      let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 108.883;
      
      x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
      y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
      z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
      
      lChannelData[i] = (116 * y) - 16;
    }
    console.log('postprocessImage: L channel extracted');
  }
  
  // Convert output to image data
  for (let i = 0; i < numPixels; i++) {
    let r, g, b;
    
    if (isLABOutput) {
      // 2-channel output: AB channels from LAB color space
      // Denormalize AB channels - they might be normalized
      let a = outputData[i];
      let b_channel = outputData[numPixels + i];
      
      // Denormalize AB channels - try different ranges
      // LAB A and B typically range from -128 to 127
      // If normalized to [0, 1], scale to [0, 127] then shift to [-128, 127]
      // If normalized to [-1, 1], scale to [-127, 127]
      if (Math.abs(a) <= 1 && Math.abs(b_channel) <= 1) {
        // Likely normalized, scale to LAB range
        // Try assuming [-1, 1] range first
        a = a * 127;
        b_channel = b_channel * 127;
      }
      
      // Get L channel
      const l = lChannelData ? lChannelData[i] : 50; // Use extracted L or default
      
      // Convert LAB to RGB
      // LAB to XYZ conversion
      let y = (l + 16) / 116;
      let x = a / 500 + y;
      let z = y - b_channel / 200;
      
      // Apply inverse gamma correction
      x = x > 0.206897 ? x * x * x : (x - 16/116) / 7.787;
      y = y > 0.206897 ? y * y * y : (y - 16/116) / 7.787;
      z = z > 0.206897 ? z * z * z : (z - 16/116) / 7.787;
      
      // Reference white (D65)
      x *= 0.95047;
      z *= 1.08883;
      
      // XYZ to RGB conversion
      r = x * 3.2406 + y * -1.5372 + z * -0.4986;
      g = x * -0.9689 + y * 1.8758 + z * 0.0415;
      b = x * 0.0557 + y * -0.2040 + z * 1.0570;
      
      // Apply gamma correction
      r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
      g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
      b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;
      
      // Clamp and scale to [0, 255]
      r = Math.max(0, Math.min(1, r)) * 255;
      g = Math.max(0, Math.min(1, g)) * 255;
      b = Math.max(0, Math.min(1, b)) * 255;
    } else if (isNCHW) {
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
    
    // Denormalize if needed (skip for LAB output as it's already converted)
    if (!isLABOutput) {
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
    }
    
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
    outputName = 'output',
    originalImage = null // For LAB color space models that need L channel from input
  } = options;
  
  console.log(`processImageWithModel: Input image size: ${image.width}x${image.height}`);
  console.log(`Preprocess options:`, preprocessOptions);
  
  // Preprocess
  // If targetWidth/targetHeight are not provided, use actual image dimensions
  const preprocessOpts = {
    inputName,
    ...preprocessOptions
  };
  
  // If no target dimensions specified, use image's actual dimensions
  if (!preprocessOpts.targetWidth || !preprocessOpts.targetHeight) {
    preprocessOpts.targetWidth = image.width;
    preprocessOpts.targetHeight = image.height;
  }
  
  console.log(`Preprocessing with dimensions: ${preprocessOpts.targetWidth}x${preprocessOpts.targetHeight}, grayscale: ${preprocessOpts.grayscale}`);
  
  const preprocessed = preprocessImage(image, preprocessOpts);
  
  console.log(`Preprocessed shape: [${preprocessed.shape.join(',')}]`);
  console.log(`Preprocessed dimensions: ${preprocessed.processedWidth}x${preprocessed.processedHeight}`);
  
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
  
  // Log output tensor info for debugging
  console.log('Output tensor:', outputTensor);
  if (outputTensor.dims) {
    console.log('Output tensor dims:', outputTensor.dims);
  }
  if (outputTensor.shape) {
    console.log('Output tensor shape:', outputTensor.shape);
  }
  if (outputTensor.data) {
    console.log('Output tensor data length:', outputTensor.data.length);
    console.log('Output tensor data type:', outputTensor.data.constructor.name);
  }
  
  // Convert tensor to array if needed
  let outputData;
  let outputDims;
  
  if (outputTensor instanceof Float32Array || outputTensor instanceof Uint8Array) {
    outputData = outputTensor;
    outputDims = preprocessed.shape; // Use preprocessing shape as fallback
    console.log('Output is Float32Array/Uint8Array, using preprocessed shape:', outputDims);
  } else if (outputTensor.data) {
    outputData = outputTensor.data;
    outputDims = outputTensor.dims || outputTensor.shape || preprocessed.shape;
    console.log('Output tensor dims/shape:', outputDims);
  } else if (Array.isArray(outputTensor)) {
    outputData = new Float32Array(outputTensor);
    outputDims = preprocessed.shape;
    console.log('Output is Array, using preprocessed shape:', outputDims);
  } else {
    throw new Error('Unsupported output tensor format');
  }
  
  console.log('Final output dims:', outputDims);
  console.log('Final output data length:', outputData.length);
  
  // Postprocess
  const postMetadata = {
    shape: outputDims || preprocessed.shape,
    processedWidth: preprocessed.processedWidth,
    processedHeight: preprocessed.processedHeight,
    originalWidth: preprocessed.originalWidth,
    originalHeight: preprocessed.originalHeight,
    originalImage: originalImage || image // Pass original image for LAB color space conversion
  };
  
  console.log('Postprocessing metadata:', postMetadata);
  console.log('Postprocessing options:', postprocessOptions);
  
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
 * Resize image to exact dimensions (may crop or stretch to fit exactly)
 * @param {HTMLImageElement|HTMLCanvasElement} image - Source image
 * @param {number} targetWidth - Exact target width
 * @param {number} targetHeight - Exact target height
 * @returns {HTMLCanvasElement} Resized canvas with exact dimensions
 */
export function resizeImageExact(image, targetWidth, targetHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  // Draw image stretched/shrunk to exact dimensions
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
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

