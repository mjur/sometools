# Image Enhancement Tool - Model Setup Guide

The Image Enhancement tool uses ONNX models for AI-powered image processing. Models need to be downloaded and cached in the browser.

## Model Requirements

The tool supports the following enhancement types:
- **Upscaling**: Real-ESRGAN (4x upscaling)
- **Enhancement**: General image quality improvement
- **Face Restoration**: GFPGAN (face restoration)
- **Colorization**: DeOldify (B&W to color)
- **Style Transfer**: Neural style transfer

## Getting ONNX Models

### Option 1: Use Pre-converted ONNX Models

1. **Real-ESRGAN** (for upscaling/enhancement):
   - Source: https://github.com/xinntao/Real-ESRGAN
   - Convert PyTorch model to ONNX using:
     ```python
     import torch
     from realesrgan import RealESRGANer
     
     # Load model
     model = RealESRGANer(scale=4, model_path='path/to/model.pth')
     
     # Convert to ONNX
     dummy_input = torch.randn(1, 3, 256, 256)
     torch.onnx.export(model.net_g, dummy_input, "RealESRGAN_x4plus.onnx")
     ```

2. **GFPGAN** (for face restoration):
   - Source: https://github.com/TencentARC/GFPGAN
   - Similar conversion process from PyTorch to ONNX

3. **DeOldify** (for colorization):
   - Source: https://github.com/jantic/DeOldify
   - Convert PyTorch model to ONNX

4. **Style Transfer**:
   - ONNX Model Zoo has pre-converted models:
   - https://github.com/onnx/models/tree/main/vision/style_transfer/fast_neural_style

### Option 2: Host Models

1. Place ONNX model files in `/models/` directory:
   ```
   /models/
     realesrgan/
       RealESRGAN_x4plus.onnx
     gfpgan/
       GFPGANv1.3.onnx
     deoldify/
       deoldify.onnx
   ```

2. Update model URLs in `js/tools/image-enhance.js`:
   ```javascript
   url: '/models/realesrgan/RealESRGAN_x4plus.onnx'
   ```

### Option 3: Use CDN/Hugging Face

1. Host models on a CDN or Hugging Face
2. Update URLs in `js/tools/image-enhance.js` to point to CDN URLs

## Model Conversion Script

Here's a basic script to convert PyTorch models to ONNX:

```python
import torch
import torch.onnx

def convert_to_onnx(pytorch_model_path, onnx_output_path, input_shape=(1, 3, 256, 256)):
    # Load PyTorch model
    model = torch.load(pytorch_model_path, map_location='cpu')
    model.eval()
    
    # Create dummy input
    dummy_input = torch.randn(*input_shape)
    
    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        onnx_output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    print(f"Model converted to {onnx_output_path}")
```

## Model Optimization

For better performance, consider:

1. **Quantization**: Convert FP32 to INT8 (4x smaller, 2-4x faster)
   ```python
   # Use ONNX Runtime quantization tools
   from onnxruntime.quantization import quantize_dynamic
   quantize_dynamic("model.onnx", "model_quantized.onnx")
   ```

2. **Model Pruning**: Remove unnecessary weights

3. **Input Size**: Some models work better with specific input sizes (e.g., multiples of 32)

## Testing Models

1. Start the development server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open the tool: http://localhost:8000/convert/image-enhance

3. Select a model type and upload an image

4. The model will be downloaded and cached on first use

## Troubleshooting

### Model Not Found (404 Error)
- Check that model files exist at the specified URLs
- Verify file paths are correct
- Ensure models are served with correct MIME type

### Shape Mismatch Errors
- Models may expect specific input sizes
- Check model documentation for required input dimensions
- Adjust preprocessing in `image-processor.js` if needed

### GPU/WebGL Errors
- Ensure WebGL is available in browser
- Try different browser (Chrome/Edge recommended)
- Check browser console for detailed errors

### Memory Issues
- Large models may require significant RAM
- Try processing smaller images
- Clear browser cache if needed

## Model Sources

- **ONNX Model Zoo**: https://github.com/onnx/models
- **Hugging Face**: https://huggingface.co/models (search for ONNX)
- **Original Repositories**: Check each model's GitHub repo for conversion instructions

## Notes

- Models are cached in IndexedDB after first download
- Cache limit is 500MB (configurable in `model-cache.js`)
- Models use LRU eviction when cache is full
- Processing happens entirely client-side - no data leaves your device

