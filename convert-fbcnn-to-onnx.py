#!/usr/bin/env python3
"""
Convert FBCNN Model to ONNX Format
FBCNN specializes in removing JPEG compression artifacts.

Requirements:
    pip install torch onnx onnxruntime

Usage:
    python convert-fbcnn-to-onnx.py
"""

import os
import sys
from pathlib import Path
import torch
import urllib.request

def download_file(url, output_path, description="file"):
    """Download a file from a URL with progress indication"""
    try:
        print(f"\n📥 Downloading {description}...")
        print(f"   URL: {url}")
        print(f"   Saving to: {output_path}")
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create request with user agent
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        # Open URL and get file size
        with urllib.request.urlopen(req) as response:
            total_size = int(response.headers.get('Content-Length', 0))
            
            # Download with progress
            downloaded = 0
            chunk_size = 8192  # 8KB chunks
            
            with open(str(output_path), 'wb') as f:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    if total_size > 0:
                        percent = (downloaded * 100) / total_size
                        size_mb = downloaded / (1024*1024)
                        total_mb = total_size / (1024*1024)
                        print(f"\r   Progress: {percent:.1f}% ({size_mb:.1f} MB / {total_mb:.1f} MB)", end='', flush=True)
                    else:
                        size_mb = downloaded / (1024*1024)
                        print(f"\r   Progress: {size_mb:.1f} MB downloaded", end='', flush=True)
        
        print("\n   ✓ Download complete!")
        return True
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print(f"\n   ❌ Download failed: Authentication required (401)")
        elif e.code == 404:
            print(f"\n   ❌ Download failed: File not found (404)")
        else:
            print(f"\n   ❌ Download failed: HTTP Error {e.code}")
        return False
    except Exception as e:
        print(f"\n   ❌ Download failed: {e}")
        return False

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

def convert_fbcnn_to_onnx(model_path=None, quality_factor=10, output_dir=None):
    """
    Convert FBCNN model to ONNX format
    
    Args:
        model_path: Path to FBCNN PyTorch model file (.pth)
        quality_factor: JPEG quality factor (10, 20, 30, 40)
        output_dir: Directory to save the ONNX model
    """
    print(f"\n🔄 Converting FBCNN model to ONNX (quality factor: {quality_factor})")
    print("=" * 60)
    
    # Set output directory
    if output_dir is None:
        output_dir = f"./models/fbcnn_q{quality_factor}"
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    onnx_dir = output_path / "onnx"
    onnx_dir.mkdir(exist_ok=True)
    
    try:
        # Step 1: Download or load model
        print("\n📥 Step 1: Loading FBCNN model...")
        print("   Note: You need to download the FBCNN model first")
        print("   From: https://github.com/jiaxi-jiang/FBCNN")
        
        if model_path is None:
            # Try to find model in common locations
            possible_paths = [
                f"./models/fbcnn/FBCNN_q{quality_factor}.pth",
                f"./FBCNN_q{quality_factor}.pth",
                f"~/.cache/fbcnn/FBCNN_q{quality_factor}.pth"
            ]
            
            model_path = None
            for path in possible_paths:
                expanded = Path(path).expanduser()
                if expanded.exists():
                    model_path = str(expanded)
                    break
            
            if model_path is None:
                default_model_path = Path(f"./models/fbcnn/FBCNN_q{quality_factor}.pth")
                
                print(f"\n⚠️  FBCNN model file not found (quality factor {quality_factor}).")
                
                # Try common download sources
                download_sources = [
                    ("GitHub Releases", f"https://github.com/jiaxi-jiang/FBCNN/releases/download/v1.0/FBCNN_q{quality_factor}.pth"),
                    ("GitHub Raw", f"https://raw.githubusercontent.com/jiaxi-jiang/FBCNN/main/FBCNN_q{quality_factor}.pth"),
                    ("Alternative Source", f"https://github.com/jiaxi-jiang/FBCNN/releases/latest/download/FBCNN_q{quality_factor}.pth"),
                ]
                
                download_choice = input("\n   Would you like to try downloading the model? (y/n): ").strip().lower()
                
                if download_choice == 'y':
                    downloaded = False
                    for source_name, url in download_sources:
                        print(f"\n   Trying {source_name}...")
                        if download_file(url, default_model_path, f"FBCNN q{quality_factor} model from {source_name}"):
                            model_path = str(default_model_path)
                            downloaded = True
                            break
                    
                    if not downloaded:
                        print("\n❌ Automatic download failed from all sources.")
                        print("\n📥 Manual Download Instructions:")
                        print("   1. Visit: https://github.com/jiaxi-jiang/FBCNN")
                        print(f"   2. Download FBCNN_q{quality_factor}.pth")
                        print(f"   3. Place it in: {default_model_path.absolute()}")
                        print("\n💡 Recommended: Check PINTO Model Zoo for pre-converted ONNX:")
                        print("   https://github.com/PINTO0309/PINTO_model_zoo")
                        print("   Search for 'FBCNN' - they have ready-to-use ONNX models!")
                        return False
                else:
                    print("\n📥 Download Instructions:")
                    print("   1. Visit: https://github.com/jiaxi-jiang/FBCNN")
                    print(f"   2. Download FBCNN_q{quality_factor}.pth")
                    print(f"   3. Place it in: {default_model_path.absolute()}")
                    print("\n💡 Recommended: Check PINTO Model Zoo for pre-converted ONNX:")
                    print("   https://github.com/PINTO0309/PINTO_model_zoo")
                    print("   Search for 'FBCNN' - they have ready-to-use ONNX models!")
                    return False
        
        # Load model
        print(f"   Loading model from: {model_path}")
        
        try:
            checkpoint = torch.load(model_path, map_location='cpu')
            model = checkpoint.get('model', checkpoint.get('net', checkpoint.get('FBCNN', None)))
            
            if model is None:
                print("   ⚠️  Could not find model in checkpoint. Trying to load as direct model...")
                model = torch.load(model_path, map_location='cpu')
            
            if isinstance(model, dict):
                print("   ⚠️  Model is a dictionary. Please check FBCNN repository for correct loading method.")
                return False
            
            model.eval()
            print("   ✓ Model loaded")
            
        except Exception as e:
            print(f"   ❌ Error loading model: {e}")
            print("\n💡 You may need to:")
            print("   1. Clone FBCNN repository: git clone https://github.com/jiaxi-jiang/FBCNN")
            print("   2. Import the model architecture from their code")
            print("   3. Load the checkpoint properly")
            return False
        
        # Step 2: Create dummy input
        print("\n🔄 Step 2: Preparing model for ONNX export...")
        # FBCNN works with variable input sizes
        dummy_input = torch.randn(1, 3, 256, 256)
        
        # Step 3: Export to ONNX
        print("\n💾 Step 3: Exporting to ONNX format...")
        print("   This may take a few minutes...")
        
        onnx_model_path = onnx_dir / "model.onnx"
        
        torch.onnx.export(
            model,
            dummy_input,
            str(onnx_model_path),
            export_params=True,
            opset_version=11,
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
        print("\n📝 Note: FBCNN expects RGB input images (3 channels)")
        print("   Input size can vary, but 256x256 or larger works well")
        print("\n💡 Tip: Check PINTO Model Zoo for pre-converted FBCNN ONNX models:")
        print("   https://github.com/PINTO0309/PINTO_model_zoo")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Alternative: Check for pre-converted ONNX models at:")
        print("   - https://github.com/PINTO0309/PINTO_model_zoo")
        print("   - Search for 'FBCNN' in the model zoo")
        return False

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Convert FBCNN to ONNX')
    parser.add_argument('--model-path', type=str, help='Path to FBCNN .pth model file')
    parser.add_argument('--quality', type=int, choices=[10, 20, 30, 40], 
                       default=10, help='JPEG quality factor')
    args = parser.parse_args()
    
    print("=" * 60)
    print("FBCNN → ONNX Converter")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    print("\n📋 About FBCNN:")
    print("   - Specializes in JPEG artifact removal")
    print("   - Removes compression blocks and ringing")
    print("   - Multiple quality factor models available (10, 20, 30, 40)")
    print("\n📥 Download model from:")
    print("   https://github.com/jiaxi-jiang/FBCNN")
    print("\n💡 Or check PINTO Model Zoo for pre-converted ONNX:")
    print("   https://github.com/PINTO0309/PINTO_model_zoo")
    
    # Convert
    success = convert_fbcnn_to_onnx(model_path=args.model_path, quality_factor=args.quality)
    
    if success:
        print("\n🎉 Success! Your model is ready to use.")
        sys.exit(0)
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == '__main__':
    main()

