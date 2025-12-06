#!/usr/bin/env node
/**
 * Script to download and inspect the MusicGen decoder model
 * This will help us determine the correct input shapes for past_key_values
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_URL = 'https://huggingface.co/Xenova/musicgen-small/resolve/main/onnx/decoder_model_merged_int8.onnx';
const OUTPUT_DIR = path.join(__dirname, '..', 'models', 'musicgen-inspect');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'decoder_model_merged_int8.onnx');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Downloading MusicGen decoder model for inspection...');
console.log('URL:', MODEL_URL);
console.log('Output:', OUTPUT_FILE);
console.log('');
console.log('After download, you can:');
console.log('1. Open the file in Netron: https://netron.app/');
console.log('2. Look for inputs named "past_key_values.*.decoder.key" and "past_key_values.*.decoder.value"');
console.log('3. Check their shape properties');
console.log('');

const file = fs.createWriteStream(OUTPUT_FILE);
let downloadedBytes = 0;
let totalBytes = 0;

https.get(MODEL_URL, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    console.log('Following redirect to:', response.headers.location);
    return https.get(response.headers.location, handleResponse);
  }
  handleResponse(response);
});

function handleResponse(response) {
  totalBytes = parseInt(response.headers['content-length'] || '0', 10);
  
  response.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    if (totalBytes > 0) {
      const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
      process.stdout.write(`\rDownloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB / ${(totalBytes / 1024 / 1024).toFixed(2)} MB (${percent}%)`);
    } else {
      process.stdout.write(`\rDownloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
    }
  });
  
  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log('\n\n✓ Download complete!');
    console.log(`File saved to: ${OUTPUT_FILE}`);
    console.log('\nNext steps:');
    console.log('1. Go to https://netron.app/');
    console.log('2. Click "Open Model" and select the downloaded file');
    console.log('3. Search for "past_key_values.0.decoder.key" in the inputs');
    console.log('4. Check the shape property to see the expected dimensions');
  });
  
  response.on('error', (err) => {
    fs.unlink(OUTPUT_FILE, () => {});
    console.error('\n✗ Download failed:', err.message);
    process.exit(1);
  });
}

file.on('error', (err) => {
  fs.unlink(OUTPUT_FILE, () => {});
  console.error('\n✗ File write error:', err.message);
  process.exit(1);
});

