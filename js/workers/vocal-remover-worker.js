// Web Worker for Vocal Remover AI Model Processing
// This worker handles the heavy ONNX model inference to keep the main thread responsive

import { loadONNXRuntime, createInferenceSession, runInference } from '/js/utils/onnx-loader.js';
import { getOrDownloadModel } from '/js/utils/model-cache.js';

let ort = null;
let session = null;
let currentConfig = null;

// Load ONNX Runtime
async function loadONNX() {
  if (ort) return ort;
  ort = await loadONNXRuntime();
  return ort;
}

// Load the AI model
async function loadModel(config) {
  if (session && currentConfig && currentConfig.key === config.key) {
    return session; // Already loaded
  }
  
  await loadONNX();
  
  // Download model
  const modelData = await getOrDownloadModel(
    config.key + '_' + config.modelUrl.split('/').slice(-2).join('_'),
    config.modelUrl
  );
  
  // Create session
  session = await createInferenceSession(modelData, {
    executionProviders: ['wasm']
  });
  
  // Auto-detect input/output names
  if (session.inputNames && session.inputNames.length > 0) {
    config.inputName = session.inputNames[0];
  }
  
  currentConfig = config;
  return session;
}

// Process audio chunk with AI model
async function processChunk(audioChunkBuffer, chunkInfo, config) {
  const { chunkIdx, totalChunks, chunkSizeSamples, expectsStereo } = chunkInfo;
  
  // Convert ArrayBuffer to Float32Array
  const audioChunk = new Float32Array(audioChunkBuffer);
  
  // Load model if needed
  const modelSession = await loadModel(config);
  
  // Prepare input tensor
  const inputShape = expectsStereo ? [1, 2, chunkSizeSamples] : [1, audioChunk.length];
  const inputTensor = new ort.Tensor('float32', audioChunk, inputShape);
  
  // Prepare inputs
  const inputs = {
    [config.inputName]: inputTensor
  };
  
  // Handle additional inputs (like onnx::ReduceMean_1)
  const allInputNames = modelSession.inputNames || [];
  for (const inputName of allInputNames) {
    if (inputName !== config.inputName && !inputs[inputName]) {
      // Handle onnx::ReduceMean_1
      if (inputName === 'onnx::ReduceMean_1') {
        const expectedShape = [1, 4, 2048, 336];
        const totalSize = expectedShape.reduce((a, b) => a * b, 1);
        
        // Quick stats from chunk
        let max = 0;
        for (let i = 0; i < Math.min(audioChunk.length, 1000); i++) {
          const absVal = Math.abs(audioChunk[i]);
          if (absVal > max) max = absVal;
        }
        const fillValue = max > 0 ? max * 0.001 : 0.0001;
        
        const meanData = new Float32Array(totalSize).fill(fillValue);
        inputs[inputName] = new ort.Tensor('float32', meanData, expectedShape);
      } else {
        // Default scalar or tensor
        const inputMeta = modelSession.inputs?.find(inp => inp.name === inputName);
        const shape = inputMeta?.shape || [];
        const type = inputMeta?.type || 'float32';
        
        if (shape.length === 0) {
          inputs[inputName] = new ort.Tensor(type, new Float32Array([0]), []);
        } else {
          const totalSize = shape.reduce((a, b) => a * (b > 0 ? b : 1), 1);
          inputs[inputName] = new ort.Tensor(type, new Float32Array(totalSize).fill(0), shape);
        }
      }
    }
  }
  
  // Run inference
  const outputs = await runInference(modelSession, inputs);
  
  // Find the correct output (prefer 4D shape)
  let outputTensor = outputs[config.outputName];
  if (!outputTensor || (outputTensor.dims && outputTensor.dims.length !== 4)) {
    // Try to find 4D output
    for (const [name, tensor] of Object.entries(outputs)) {
      if (tensor.dims && tensor.dims.length === 4) {
        const [batch, stems, channels, samples] = tensor.dims;
        if (batch === 1 && stems > 0 && channels > 0 && samples > 0) {
          outputTensor = tensor;
          break;
        }
      }
    }
  }
  
  if (!outputTensor) {
    throw new Error('No suitable output tensor found');
  }
  
  // Check if output has data
  const sampleData = Array.from(outputTensor.data.slice(0, Math.min(100, outputTensor.data.length)));
  const hasData = sampleData.some(v => Math.abs(v) > 1e-6);
  if (!hasData) {
    throw new Error('Model output is all zeros');
  }
  
  // Extract output data
  let outputData = outputTensor.data instanceof Float32Array 
    ? outputTensor.data 
    : new Float32Array(outputTensor.data);
  
  // Process output based on shape
  const dims = outputTensor.dims;
  if (dims.length === 4) {
    const [batch, stems, channels, samples] = dims;
    const stemIndices = config.stemIndices || [];
    const expectedStems = config.numStems || 0;
    
    if (stems === expectedStems && stemIndices.length > 0) {
      // Combine specified stems
      const instrumentalData = new Float32Array(channels * samples);
      
      for (let ch = 0; ch < channels; ch++) {
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (const stemIdx of stemIndices) {
            const idx = stemIdx * channels * samples + ch * samples + i;
            sum += outputData[idx];
          }
          instrumentalData[ch * samples + i] = sum;
        }
      }
      
      outputData = instrumentalData;
    }
  }
  
  // Send progress update
  self.postMessage({
    type: 'progress',
    chunk: chunkIdx + 1,
    total: totalChunks,
    progress: (chunkIdx + 1) / totalChunks
  });
  
  return outputData;
}

// Handle messages from main thread
self.addEventListener('message', async (e) => {
  const { type, data } = e.data;
  
  try {
    if (type === 'process') {
      const { audioData, config, chunkInfo } = data;
      
      try {
        // Process chunk
        const outputData = await processChunk(audioData, chunkInfo, config);
        
        // Send result back
        self.postMessage({
          type: 'result',
          chunk: chunkInfo.chunkIdx,
          data: outputData.buffer,
          length: outputData.length
        }, [outputData.buffer]); // Transfer ownership
      } catch (error) {
        self.postMessage({
          type: 'error',
          error: error.message,
          stack: error.stack,
          chunk: chunkInfo.chunkIdx
        });
      }
      
    } else if (type === 'load') {
      // Preload model
      await loadONNX();
      const modelSession = await loadModel(data.config);
      
      self.postMessage({
        type: 'loaded',
        inputNames: modelSession.inputNames,
        outputNames: modelSession.outputNames
      });
      
    } else if (type === 'close') {
      // Cleanup
      if (session) {
        // ONNX sessions don't have explicit cleanup, but we can clear references
        session = null;
        currentConfig = null;
      }
      self.close();
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      stack: error.stack
    });
  }
});

