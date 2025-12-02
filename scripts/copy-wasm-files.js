#!/usr/bin/env node
/**
 * Post-build script to copy WASM files with expected names for ONNX Runtime
 * ONNX Runtime expects specific file names without Vite's hash suffixes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, '../js/tools/bundled/assets');
const onnxDistDir = path.join(__dirname, '../node_modules/onnxruntime-web/dist');

// WASM files that need to be copied with expected names
const wasmFiles = [
  {
    source: 'ort-wasm-simd-threaded.asyncify-BJtBjfiH.wasm',
    targets: [
      'ort-wasm-simd-threaded.asyncify.wasm',
      'ort-wasm-simd-threaded.wasm'
    ]
  },
  {
    source: 'ort-wasm-simd-threaded.jsep-BGTZ4Y7F.wasm',
    targets: [
      'ort-wasm-simd-threaded.jsep.wasm'
    ]
  }
];

// MJS wrapper files that ONNX Runtime needs for dynamic imports
const mjsFiles = [
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.mjs'
];

console.log('Copying WASM and MJS files for ONNX Runtime...');

// Copy WASM files
for (const { source, targets } of wasmFiles) {
  const sourcePath = path.join(assetsDir, source);
  
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Source file not found: ${source}`);
    continue;
  }
  
  for (const target of targets) {
    const targetPath = path.join(assetsDir, target);
    try {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✓ Copied WASM: ${source} -> ${target}`);
    } catch (error) {
      console.error(`Failed to copy ${source} -> ${target}:`, error.message);
    }
  }
}

// Copy MJS wrapper files from node_modules
for (const mjsFile of mjsFiles) {
  const sourcePath = path.join(onnxDistDir, mjsFile);
  const targetPath = path.join(assetsDir, mjsFile);
  
  if (!fs.existsSync(sourcePath)) {
    console.warn(`MJS source file not found: ${mjsFile}`);
    continue;
  }
  
  try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied MJS: ${mjsFile}`);
  } catch (error) {
    console.error(`Failed to copy MJS ${mjsFile}:`, error.message);
  }
}

console.log('WASM and MJS file copying complete.');

