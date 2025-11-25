# Image Enhancement Models - Quick Reference

## ✅ Working Models

| Model Type | Name | Status | URL | Size |
|------------|------|--------|-----|------|
| Style Transfer | Fast Neural Style | ✅ Working | CDN (jsDelivr) | ~20-40MB |

## 🔍 Models to Find

| Model Type | Priority | Search Keywords | Expected Size |
|------------|----------|-----------------|---------------|
| Upscaling | High | `realesrgan onnx`, `upscale onnx` | ~67MB |
| Face Restoration | High | `gfpgan onnx`, `codeformer onnx` | ~50-150MB |
| Colorization | Medium | `deoldify onnx`, `colorization onnx` | ~50-80MB |
| Enhancement | Low | `waifu2x onnx`, `denoise onnx` | ~30-50MB |

## 📋 Quick Actions

1. **Search Hugging Face**: https://huggingface.co/models?library=onnx
2. **Check GitHub Releases**: Look for `.onnx` files in releases
3. **Update URLs**: Edit `js/tools/image-enhance.js` when found
4. **Test Models**: Verify input/output shapes match

## 🔗 Resources

- **Hugging Face**: https://huggingface.co/models?library=onnx
- **ONNX Model Zoo**: https://github.com/onnx/models
- **Setup Guide**: See `README-IMAGE-ENHANCE.md`

