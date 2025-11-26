# ONNX Models to Find for Image Enhancement Tool

This document tracks which models are ready to use and which need to be found/set up.

## ✅ Ready to Use

### Colorization (DDColor)
- **Status**: ✅ Working (locally hosted)
- **File**: `/models/ddcolor_paper_tiny.onnx`
- **Model**: DDColor Paper Tiny
- **Source**: https://github.com/instant-high/DDColor-onnx
- **Size**: Small variant (faster processing)
- **Note**: Ready to use - no setup required!

### Style Transfer
- **Status**: ⚠️ CDN URL not working - needs alternative source
- **Previous URL** (404): https://cdn.jsdelivr.net/gh/onnx/models@main/vision/style_transfer/fast_neural_style/model/mosaic-9.onnx
- **Alternative Options**:
  - Download from ONNX Model Zoo and host locally: https://github.com/onnx/models/tree/main/vision/style_transfer/fast_neural_style/model
  - Search Hugging Face for "fast neural style onnx" models
  - Use other style transfer models from Hugging Face
- **Size**: ~20-40MB
- **Source**: ONNX Model Zoo (needs local hosting or alternative CDN)

## 🔍 Models to Find

### 1. Image Upscaling (Real-ESRGAN)
- **Priority**: High
- **Search**: 
  - https://github.com/xinntao/Real-ESRGAN/releases
  - https://huggingface.co/models?search=realesrgan
  - https://huggingface.co/models?search=upscale+onnx
- **Expected URL Format**: 
  - `https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/realesrgan-x4plus.onnx`
  - `https://huggingface.co/{user}/{model}/resolve/main/realesrgan-x4plus.onnx`
- **Size**: ~67MB
- **Notes**: Look for ONNX format, not PyTorch weights

### 2. Face Restoration (GFPGAN)
- **Priority**: High
- **Search**:
  - https://github.com/TencentARC/GFPGAN/releases
  - https://huggingface.co/models?search=gfpgan
  - https://huggingface.co/models?search=face+restoration+onnx
- **Expected URL Format**:
  - `https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.onnx`
  - `https://huggingface.co/{user}/{model}/resolve/main/gfpgan.onnx`
- **Size**: ~100-150MB (full), ~50MB (quantized)
- **Alternative**: CodeFormer (smaller)

### 3. Face Restoration (CodeFormer - Alternative)
- **Priority**: Medium (if GFPGAN is too large)
- **Search**:
  - https://github.com/sczhou/CodeFormer/releases
  - https://huggingface.co/models?search=codeformer
- **Expected URL Format**:
  - `https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/codeformer.onnx`
- **Size**: ~50MB
- **Notes**: Smaller alternative to GFPGAN

### 4. Colorization (DeOldify) - ✅ COMPLETED
- **Status**: ✅ Using DDColor Paper Tiny model
- **File**: `/models/ddcolor_paper_tiny.onnx`
- **Model**: DDColor Paper Tiny (smaller, faster variant)
- **Source**: https://github.com/instant-high/DDColor-onnx
- **Note**: Model is set up and ready to use!
- **Alternative models** (if needed):
  - DeOldify: https://github.com/jantic/DeOldify
  - Colorful Image Colorization (lighter)

### 5. Image Enhancement/Denoising (Waifu2x)
- **Priority**: Low
- **Search**:
  - https://github.com/nagadomi/waifu2x/releases
  - https://huggingface.co/models?search=waifu2x
  - https://huggingface.co/models?search=denoise+onnx
- **Expected URL Format**:
  - `https://github.com/nagadomi/waifu2x/releases/download/v1.0.0/waifu2x.onnx`
- **Size**: ~30-50MB
- **Notes**: Good for anime/illustrations

## 📋 Action Items

1. **Search Hugging Face** for ONNX models:
   - Real-ESRGAN: https://huggingface.co/models?search=realesrgan+onnx
   - GFPGAN: https://huggingface.co/models?search=gfpgan+onnx
   - DeOldify: https://huggingface.co/models?search=deoldify+onnx

2. **Check GitHub Releases** for pre-converted ONNX models:
   - Real-ESRGAN releases: https://github.com/xinntao/Real-ESRGAN/releases
   - GFPGAN releases: https://github.com/TencentARC/GFPGAN/releases
   - CodeFormer releases: https://github.com/sczhou/CodeFormer/releases

3. **Consider Quantized Models**:
   - Look for INT8 quantized versions (4x smaller, 2-4x faster)
   - Check if models have quantized variants in their repos

4. **CDN Hosting**:
   - If models are found but not on CDN, consider hosting on:
     - jsDelivr (via GitHub releases)
     - unpkg (via npm packages)
     - Your own CDN

5. **Update Configuration**:
   - Once models are found, update URLs in `js/tools/image-enhance.js`
   - Test each model to ensure it works
   - Update this document with working URLs

## 🔗 Useful Links

- **Hugging Face ONNX Models**: https://huggingface.co/models?library=onnx
- **ONNX Model Zoo**: https://github.com/onnx/models
- **ONNX Runtime**: https://onnxruntime.ai/
- **jsDelivr CDN**: https://www.jsdelivr.com/
- **Model Conversion Guide**: See README-IMAGE-ENHANCE.md

## 💡 Tips

- **Start with smaller models** (CodeFormer, Waifu2x) for faster testing
- **Use quantized models** when available (INT8)
- **Test on small images first** (256×256) before trying larger ones
- **Check model input/output shapes** to ensure compatibility
- **Verify model format** is ONNX (`.onnx` extension)

## 📝 Notes

- Models are cached in IndexedDB after first download
- Total cache size limit: 500MB (configurable in `model-cache.js`)
- Models download automatically on first use
- Processing happens entirely client-side

