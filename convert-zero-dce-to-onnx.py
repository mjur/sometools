#!/usr/bin/env python3
"""
Convert Zero-DCE / Zero-DCE++ Model to ONNX Format
Zero-DCE is a lightweight model for low-light image enhancement.

Requirements:
    pip install torch onnx onnxruntime

Usage:
    python convert-zero-dce-to-onnx.py
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

def convert_zero_dce_to_onnx(model_path=None, variant='zero-dce', output_dir=None):
    """
    Convert Zero-DCE model to ONNX format
    
    Args:
        model_path: Path to Zero-DCE PyTorch model file (.pth)
        variant: 'zero-dce' or 'zero-dce++'
        output_dir: Directory to save the ONNX model
    """
    print(f"\n🔄 Converting {variant.upper()} model to ONNX")
    print("=" * 60)
    
    # Set output directory
    if output_dir is None:
        output_dir = f"./models/{variant.replace('-', '_')}"
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    onnx_dir = output_path / "onnx"
    onnx_dir.mkdir(exist_ok=True)
    
    try:
        # Step 1: Download or load model
        print("\n📥 Step 1: Loading Zero-DCE model...")
        print("   Note: You need to download the Zero-DCE model first")
        print("   From: https://github.com/Li-Chongyi/Zero-DCE")
        
        if model_path is None:
            # Try to find model in common locations
            possible_paths = [
                f"./models/{variant}/{variant}.pth",
                f"./{variant}.pth",
                f"~/.cache/{variant}/{variant}.pth"
            ]
            
            model_path = None
            for path in possible_paths:
                expanded = Path(path).expanduser()
                if expanded.exists():
                    model_path = str(expanded)
                    break
            
            if model_path is None:
                default_model_path = Path(f"./models/{variant}/{variant}.pth")
                
                print(f"\n⚠️  {variant.upper()} model file not found.")
                
                # Try common download sources
                download_sources = [
                    ("GitHub Releases", f"https://github.com/Li-Chongyi/Zero-DCE/releases/download/v1.0/{variant}.pth"),
                    ("GitHub Raw", f"https://raw.githubusercontent.com/Li-Chongyi/Zero-DCE/main/{variant}.pth"),
                    ("Alternative Source", f"https://github.com/Li-Chongyi/Zero-DCE/releases/latest/download/{variant}.pth"),
                ]
                
                download_choice = input("\n   Would you like to try downloading the model? (y/n): ").strip().lower()
                
                if download_choice == 'y':
                    downloaded = False
                    for source_name, url in download_sources:
                        print(f"\n   Trying {source_name}...")
                        if download_file(url, default_model_path, f"{variant.upper()} model from {source_name}"):
                            model_path = str(default_model_path)
                            downloaded = True
                            break
                    
                    if not downloaded:
                        print("\n❌ Automatic download failed from all sources.")
                        print("\n📥 Manual Download Instructions:")
                        print("   1. Visit: https://github.com/Li-Chongyi/Zero-DCE")
                        print(f"   2. Download the {variant.upper()} checkpoint")
                        print(f"   3. Place it in: {default_model_path.absolute()}")
                        print("\n💡 Alternative: Check PINTO Model Zoo for pre-converted ONNX:")
                        print("   https://github.com/PINTO0309/PINTO_model_zoo")
                        return False
                else:
                    print("\n📥 Download Instructions:")
                    print("   1. Visit: https://github.com/Li-Chongyi/Zero-DCE")
                    print(f"   2. Download the {variant.upper()} checkpoint")
                    print(f"   3. Place it in: {default_model_path.absolute()}")
                    print("\n💡 Alternative: Check PINTO Model Zoo for pre-converted ONNX:")
                    print("   https://github.com/PINTO0309/PINTO_model_zoo")
                    return False
        
        # Load model
        print(f"   Loading model from: {model_path}")
        
        try:
            checkpoint = torch.load(model_path, map_location='cpu')
            model = checkpoint.get('model', checkpoint.get('net', checkpoint.get('DCE_net', None)))
            
            if model is None:
                print("   ⚠️  Could not find model in checkpoint. Trying to load as direct model...")
                model = torch.load(model_path, map_location='cpu')
            
            if isinstance(model, dict):
                print("   ⚠️  Model is a dictionary. Please check Zero-DCE repository for correct loading method.")
                return False
            
            model.eval()
            print("   ✓ Model loaded")
            
        except Exception as e:
            print(f"   ❌ Error loading model: {e}")
            print("\n💡 You may need to:")
            print("   1. Clone Zero-DCE repository: git clone https://github.com/Li-Chongyi/Zero-DCE")
            print("   2. Import the model architecture from their code")
            print("   3. Load the checkpoint properly")
            return False
        
        # Step 2: Create dummy input
        print("\n🔄 Step 2: Preparing model for ONNX export...")
        # Zero-DCE works with variable input sizes
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
        print("\n📝 Note: Zero-DCE expects RGB input images (3 channels)")
        print("   Input size can vary, but 256x256 or larger works well")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Alternative: Check for pre-converted ONNX models at:")
        print("   - https://github.com/PINTO0309/PINTO_model_zoo")
        return False

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Convert Zero-DCE to ONNX')
    parser.add_argument('--model-path', type=str, help='Path to Zero-DCE .pth model file')
    parser.add_argument('--variant', type=str, choices=['zero-dce', 'zero-dce++'], 
                       default='zero-dce', help='Model variant')
    args = parser.parse_args()
    
    print("=" * 60)
    print("Zero-DCE → ONNX Converter")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    print("\n📋 About Zero-DCE:")
    print("   - Lightweight model for low-light enhancement")
    print("   - Fast inference, ideal for browser")
    print("   - Zero-DCE++ is an improved version")
    print("\n📥 Download model from:")
    print("   https://github.com/Li-Chongyi/Zero-DCE")
    
    # Convert
    success = convert_zero_dce_to_onnx(model_path=args.model_path, variant=args.variant)
    
    if success:
        print("\n🎉 Success! Your model is ready to use.")
        sys.exit(0)
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == '__main__':
    main()

