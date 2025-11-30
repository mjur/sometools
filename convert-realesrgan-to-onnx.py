#!/usr/bin/env python3
"""
Convert Real-ESRGAN Model to ONNX Format
Real-ESRGAN is a practical image restoration algorithm for general image/video super-resolution.

Requirements:
    pip install realesrgan torch onnx onnxruntime

Usage:
    python convert-realesrgan-to-onnx.py
"""

import os
import sys
from pathlib import Path
import torch

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = {
        'torch': 'torch',
        'onnx': 'onnx',
        'onnxruntime': 'onnxruntime'
    }
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(required_packages[package])
    
    if missing:
        print("❌ Missing required packages. Please install them:")
        print(f"   pip install {' '.join(missing)}")
        return False
    return True

def convert_realesrgan_to_onnx(model_name='RealESRGAN_x4plus', output_dir=None):
    """
    Convert Real-ESRGAN model to ONNX format
    
    Args:
        model_name: Model variant ('RealESRGAN_x4plus', 'RealESRGAN_x4plus_anime_6B', etc.)
        output_dir: Directory to save the ONNX model
    """
    try:
        from realesrgan import RealESRGANer
        from realesrgan.archs.srvgg_arch import SRVGGNetCompact
        from realesrgan.archs.rrdbnet_arch import RRDBNet
    except ImportError:
        print("❌ realesrgan package not found.")
        print("   Install with: pip install realesrgan")
        print("   Or clone from: https://github.com/xinntao/Real-ESRGAN")
        return False
    
    print(f"\n🔄 Converting Real-ESRGAN model: {model_name}")
    print("=" * 60)
    
    # Set output directory
    if output_dir is None:
        output_dir = f"./models/realesrgan-{model_name.lower()}"
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    onnx_dir = output_path / "onnx"
    onnx_dir.mkdir(exist_ok=True)
    
    try:
        # Step 1: Load the model
        print("\n📥 Step 1: Loading Real-ESRGAN model...")
        
        # Initialize Real-ESRGAN
        # Note: This will download the model if not already cached
        upsampler = RealESRGANer(
            scale=4,
            model_path=None,  # Will use default model
            model=RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4),
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=False  # Use FP32 for ONNX compatibility
        )
        
        # Get the actual model
        model = upsampler.model
        model.eval()
        
        print(f"   ✓ Model loaded")
        
        # Step 2: Create dummy input
        print("\n🔄 Step 2: Preparing model for ONNX export...")
        # Real-ESRGAN typically works with 128x128 or larger inputs
        dummy_input = torch.randn(1, 3, 128, 128)
        
        # Step 3: Export to ONNX
        print("\n💾 Step 3: Exporting to ONNX format...")
        print("   This may take a few minutes...")
        
        onnx_model_path = onnx_dir / "model.onnx"
        
        torch.onnx.export(
            model,
            dummy_input,
            str(onnx_model_path),
            export_params=True,
            opset_version=11,  # Use opset 11 for better compatibility
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {2: 'height', 3: 'width'},
                'output': {2: 'height', 3: 'width'}
            }
        )
        
        print(f"   ✓ ONNX model saved to {onnx_model_path}")
        
        # Step 4: Verify the model
        print("\n✅ Step 4: Verifying ONNX model...")
        try:
            import onnx
            onnx_model = onnx.load(str(onnx_model_path))
            onnx.checker.check_model(onnx_model)
            print("   ✓ ONNX model is valid")
        except Exception as e:
            print(f"   ⚠️  Verification warning: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Conversion complete!")
        print(f"\n📁 Model files saved to: {output_path.absolute()}")
        print(f"   - {onnx_model_path}")
        
        print("\n💡 Next steps:")
        print("   1. Host the model file on a web server (or use local server)")
        print("   2. Update the model configuration in js/tools/image-enhance.js")
        print("   3. Point to the local model path")
        print("\n📝 Note: Real-ESRGAN expects RGB input images (3 channels)")
        print("   Input size can vary, but 128x128 or larger works best")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Alternative: Download pre-converted ONNX models from:")
        print("   - https://github.com/xinntao/Real-ESRGAN")
        print("   - https://github.com/PINTO0309/PINTO_model_zoo")
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("Real-ESRGAN → ONNX Converter")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    print("\n📋 Real-ESRGAN Model Variants:")
    print("\n   1. RealESRGAN_x4plus (default)")
    print("      - Best for general photos")
    print("      - 4x upscaling")
    print("      - ~67MB")
    print("\n   2. RealESRGAN_x4plus_anime_6B")
    print("      - Optimized for anime/cartoon images")
    print("      - 4x upscaling")
    print("      - ~17MB")
    
    choice = input("\nEnter model number (1-2, default: 1): ").strip()
    
    if choice == '2':
        model_name = 'RealESRGAN_x4plus_anime_6B'
    else:
        model_name = 'RealESRGAN_x4plus'
    
    # Convert
    success = convert_realesrgan_to_onnx(model_name)
    
    if success:
        print("\n🎉 Success! Your model is ready to use.")
        sys.exit(0)
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == '__main__':
    main()



