# Pre-converted Demucs ONNX Models

## Available Models

### 1. Hugging Face: arjune123/demucs-onnx
**Model:** `htdemucs_6s.onnx` (6 sources: drums, bass, other, vocals, piano, guitar)

**Direct Download URL:**
```
https://huggingface.co/arjune123/demucs-onnx/resolve/main/htdemucs_6s.onnx
```

**Repository:**
- https://huggingface.co/arjune123/demucs-onnx

**Note:** This is the 6-source version. For vocal removal, you can use drums + bass + other + piano + guitar (excluding vocals).

### 2. GitHub: gianlourbano/demucs-onnx
**Repository:** https://github.com/gianlourbano/demucs-onnx

**Description:** WebGPU inference for HTDemucs using ONNX Runtime

**Note:** Check the repository for available model files and download instructions.

### 3. GitHub: sevagh/demucs.onnx
**Repository:** https://github.com/sevagh/demucs.onnx

**Description:** C++ ONNX/ORT inference for Demucs

**Note:** Check the repository for available model files and download instructions.

## Usage in Vocal Remover

To use the pre-converted Demucs model in your vocal remover tool, update the `AI_MODEL_CONFIG` in `js/tools/vocal-remover.js`:

```javascript
const AI_MODEL_CONFIG = {
  name: 'Demucs HTDemucs 6s',
  key: 'demucs-htdemucs-6s',
  modelUrl: 'https://huggingface.co/arjune123/demucs-onnx/resolve/main/htdemucs_6s.onnx',
  fallbackUrls: [],
  // htdemucs_6s outputs 6 stems: [drums, bass, other, vocals, piano, guitar]
  // For instrumental, combine: drums + bass + other + piano + guitar (exclude vocals at index 3)
  inputName: 'audio',
  outputName: 'output',
  sampleRate: 44100,
  chunkSize: 44100 * 5,
};
```

## Model Output Format

The `htdemucs_6s` model outputs 6 stems:
- [0] = drums
- [1] = bass
- [2] = other
- [3] = vocals (exclude this for instrumental)
- [4] = piano
- [5] = guitar

For vocal removal, combine stems 0, 1, 2, 4, 5 (excluding vocals at index 3).

