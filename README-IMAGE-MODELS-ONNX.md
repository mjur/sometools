# Image Processing Models → ONNX Conversion Guide

This guide explains how to convert various image processing models to ONNX format for use in the browser-based image enhancement tool.

## Available Conversion Scripts

1. **Real-ESRGAN** - Super-resolution + deblur + denoise
2. **SCUNet** - Dedicated denoising
3. **Zero-DCE / Zero-DCE++** - Low-light enhancement
4. **FBCNN** - JPEG artifact removal
5. **DeOldify** - Colorization (B&W photos)

## Prerequisites

Install the required Python packages:

```bash
pip install torch onnx onnxruntime
```

For Real-ESRGAN specifically:
```bash
pip install realesrgan
```

## Model Conversion Scripts

### 1. Real-ESRGAN

**Best for:** Super-resolution, mild deblur, mild denoise

```bash
python convert-realesrgan-to-onnx.py
```

**Model Options:**
- `RealESRGAN_x4plus` (default) - Best for general photos, ~67MB
- `RealESRGAN_x4plus_anime_6B` - Optimized for anime/cartoon, ~17MB

**Output:** `./models/realesrgan-{variant}/onnx/model.onnx`

**GitHub:** https://github.com/xinntao/Real-ESRGAN

---

### 2. SCUNet

**Best for:** Dedicated denoising (real-world noise)

```bash
python convert-scunet-to-onnx.py --model-path /path/to/scunet.pth
```

**Download Model:**
1. Clone repository: `git clone https://github.com/cszn/SCUNet`
2. Download the model checkpoint
3. Place in `./models/scunet/scunet.pth`

**Output:** `./models/scunet/onnx/model.onnx`

**GitHub:** https://github.com/cszn/SCUNet

---

### 3. Zero-DCE / Zero-DCE++

**Best for:** Low-light image enhancement ("enlighten")

```bash
# Zero-DCE
python convert-zero-dce-to-onnx.py --variant zero-dce --model-path /path/to/zero-dce.pth

# Zero-DCE++ (improved version)
python convert-zero-dce-to-onnx.py --variant zero-dce++ --model-path /path/to/zero-dce++.pth
```

**Download Model:**
1. Clone repository: `git clone https://github.com/Li-Chongyi/Zero-DCE`
2. Download the model checkpoint
3. Place in `./models/zero-dce/zero-dce.pth` or `./models/zero-dce++/zero-dce++.pth`

**Output:** `./models/{variant}/onnx/model.onnx`

**GitHub:** https://github.com/Li-Chongyi/Zero-DCE

---

### 4. FBCNN

**Best for:** JPEG artifact removal / restoration

```bash
python convert-fbcnn-to-onnx.py --quality 10 --model-path /path/to/FBCNN_q10.pth
```

**Quality Factors:** 10, 20, 30, 40 (lower = more compressed, needs more restoration)

**Download Model:**
1. Clone repository: `git clone https://github.com/jiaxi-jiang/FBCNN`
2. Download model for desired quality factor
3. Place in `./models/fbcnn/FBCNN_q{quality}.pth`

**Output:** `./models/fbcnn_q{quality}/onnx/model.onnx`

**GitHub:** https://github.com/jiaxi-jiang/FBCNN

**Alternative:** Check PINTO Model Zoo for pre-converted ONNX models:
- https://github.com/PINTO0309/PINTO_model_zoo

---

### 5. DeOldify

**Best for:** Colorization (old photos / B&W)

```bash
python convert-deoldify-to-onnx.py --variant backbone-lite --model-path /path/to/backbone-lite.pth
```

**Model Variants:**
- `backbone-lite` (recommended) - Smallest, fastest, best for browser
- `stable` - Balanced quality/speed
- `artistic` - Highest quality, largest

**Download Model:**
1. Clone repository: `git clone https://github.com/jantic/DeOldify`
2. Download the model checkpoint for your chosen variant
3. Place in `./models/deoldify/{variant}.pth`

**Output:** `./models/deoldify_{variant}/onnx/model.onnx`

**GitHub:** https://github.com/jantic/DeOldify

**Note:** For browser performance, restrict input resolution to ≤512x512

---

## General Conversion Process

1. **Install Dependencies:**
   ```bash
   pip install torch onnx onnxruntime
   ```

2. **Download Model:**
   - Clone the model repository
   - Download the PyTorch checkpoint (.pth file)
   - Place in appropriate directory under `./models/`

3. **Run Conversion Script:**
   ```bash
   python convert-{model}-to-onnx.py [options]
   ```

4. **Verify Output:**
   - Check that `./models/{model}/onnx/model.onnx` was created
   - File should be several MB to hundreds of MB depending on model

5. **Host Model:**
   - Use local server (e.g., `python models/server-with-cors.py`)
   - Or host on web server with CORS enabled

6. **Update Configuration:**
   - Edit `js/tools/image-enhance.js`
   - Add model configuration pointing to your ONNX file

## Model Directory Structure

After conversion, your models should be organized like this:

```
models/
├── realesrgan-realesrgan_x4plus/
│   └── onnx/
│       └── model.onnx
├── scunet/
│   └── onnx/
│       └── model.onnx
├── zero-dce/
│   └── onnx/
│       └── model.onnx
├── fbcnn_q10/
│   └── onnx/
│       └── model.onnx
└── deoldify_backbone-lite/
    └── onnx/
        └── model.onnx
```

## Troubleshooting

### Model Loading Errors

If you get errors loading the model checkpoint:

1. **Check Model Architecture:**
   - You may need to import the model architecture from the original repository
   - Some models require specific initialization code

2. **Model Dictionary:**
   - Some checkpoints store the model under different keys
   - Common keys: `'model'`, `'net'`, `'generator'`, `'DCE_net'`, etc.
   - Check the repository's loading code for the correct key

3. **Architecture Import:**
   - Clone the model repository
   - Add the repository to Python path
   - Import the model class before loading

### ONNX Export Errors

1. **Unsupported Operations:**
   - Some PyTorch operations may not be supported in ONNX opset 11
   - Try updating to a newer opset version (12, 13, 14)
   - Or modify the model architecture to use supported operations

2. **Dynamic Shapes:**
   - Models with dynamic input shapes may need special handling
   - The scripts use `dynamic_axes` to support variable input sizes

3. **Model Size:**
   - Very large models may cause memory issues
   - Consider using model quantization or smaller variants

### Alternative: Pre-converted Models

Many models are available pre-converted to ONNX:

- **PINTO Model Zoo:** https://github.com/PINTO0309/PINTO_model_zoo
  - Search for your model name
  - Download pre-converted ONNX files
  - Often includes quantized versions

- **Hugging Face:** https://huggingface.co/models
  - Some models have ONNX versions available
  - Check model card for ONNX downloads

## Integration with Image Enhancement Tool

After converting models, update `js/tools/image-enhance.js`:

```javascript
const MODELS = {
  // ... existing models ...
  
  scunet: {
    name: 'SCUNet Denoising',
    url: 'http://localhost:5000/scunet/onnx/model.onnx',
    inputSize: 256,  // or dynamic
    requiresSetup: false
  },
  
  zero_dce: {
    name: 'Zero-DCE Low-Light',
    url: 'http://localhost:5000/zero-dce/onnx/model.onnx',
    inputSize: 256,
    requiresSetup: false
  },
  
  // ... etc
};
```

## Performance Considerations

- **Model Size:** Larger models = longer download and inference time
- **Input Resolution:** Smaller inputs = faster processing
- **Quantization:** Consider quantizing models to INT8 for 2-4x speedup
- **Browser Memory:** Very large models may cause memory issues

## Recommended Models for Browser

For best browser performance, prioritize:

1. **Real-ESRGAN x4plus anime** (~17MB) - Smallest Real-ESRGAN variant
2. **SCUNet** - Compact denoising
3. **Zero-DCE++** - Lightweight low-light enhancement
4. **FBCNN** - Efficient JPEG restoration
5. **DeOldify backbone-lite** - Smallest colorization model

Restrict input resolution to 256x256 or 512x512 for faster processing.






