#!/usr/bin/env python3
"""
Convert DeOldify Model to ONNX Format
DeOldify provides high-quality colorization for black & white photos.

Requirements:
    pip install torch onnx onnxruntime

Usage:
    python convert-deoldify-to-onnx.py
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
import torch
import urllib.request
from urllib.parse import urlparse

# Try to import DeOldify generator if available
try:
    sys.path.insert(0, str(Path(__file__).parent / "DeOldify"))
    from deoldify.generators import gen_inference_wide, gen_inference_deep
    DEOLDIFY_AVAILABLE = True
except ImportError:
    DEOLDIFY_AVAILABLE = False

def download_file(url, output_path, description="file"):
    """
    Download a file from a URL with progress indication
    
    Args:
        url: URL to download from
        output_path: Path to save the file
        description: Description of what's being downloaded
    """
    try:
        print(f"\n📥 Downloading {description}...")
        print(f"   URL: {url}")
        print(f"   Saving to: {output_path}")
        
        # Create output directory if it doesn't exist
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create request with user agent to avoid 403 errors
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

def convert_deoldify_to_onnx(model_path=None, variant='backbone-lite', output_dir=None):
    """
    Convert DeOldify model to ONNX format
    
    Args:
        model_path: Path to DeOldify PyTorch model file (.pth)
        variant: Model variant ('backbone-lite', 'stable', 'artistic')
        output_dir: Directory to save the ONNX model
    """
    print(f"\n🔄 Converting DeOldify model to ONNX ({variant})")
    print("=" * 60)
    
    # Set output directory
    if output_dir is None:
        output_dir = f"./models/deoldify_{variant}"
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    onnx_dir = output_path / "onnx"
    onnx_dir.mkdir(exist_ok=True)
    
    try:
        # Step 1: Download or load model
        print("\n📥 Step 1: Loading DeOldify model...")
        print("   Note: You need to download the DeOldify model first")
        print("   From: https://github.com/jantic/DeOldify")
        
        if model_path is None:
            # Try to find model in common locations
            possible_paths = [
                f"./models/deoldify/{variant}.pth",
                f"./deoldify_{variant}.pth",
                f"~/.cache/deoldify/{variant}.pth"
            ]
            
            model_path = None
            for path in possible_paths:
                expanded = Path(path).expanduser()
                if expanded.exists():
                    model_path = str(expanded)
                    break
            
            if model_path is None:
                # Try to download the model using DeOldify's official script
                default_model_path = Path(f"./models/deoldify/{variant}.pth")
                deoldify_repo = Path("./DeOldify")
                
                print(f"\n⚠️  DeOldify model file not found ({variant}).")
                print("\n📥 Automatically downloading model using DeOldify's official script...")
                
                # Automatically proceed with download
                download_choice = 'y'
                
                if download_choice == 'y':
                    print("\n📥 Using DeOldify's official download script...")
                    
                    # Step 1: Clone repository if it doesn't exist
                    if not deoldify_repo.exists():
                        print("\n   1. Cloning DeOldify repository...")
                        try:
                            subprocess.run(
                                ["git", "clone", "https://github.com/jantic/DeOldify.git", str(deoldify_repo)],
                                check=True,
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE
                            )
                            print("   ✓ Repository cloned successfully")
                        except subprocess.CalledProcessError as e:
                            print(f"   ❌ Failed to clone repository: {e.stderr.decode()}")
                            print("\n   Please clone manually:")
                            print("   git clone https://github.com/jantic/DeOldify")
                            return False
                    else:
                        print("\n   ✓ DeOldify repository already exists")
                    
                    # Step 2: Try to download models directly
                    print("\n   2. Attempting to download DeOldify models...")
                    print("   Note: DeOldify doesn't provide a download script.")
                    print("   Trying known model URLs...")
                    
                    # Known model file names and potential download sources
                    model_files = {
                        'backbone-lite': ['ColorizeArtistic_gen.pth'],
                        'stable': ['ColorizeStable_gen.pth'],
                        'artistic': ['ColorizeArtistic_gen.pth']
                    }
                    
                    # Try downloading from common sources
                    download_urls = [
                        f"https://data.deepai.org/deoldify/{model_files[variant][0]}",
                        f"https://github.com/jantic/DeOldify/releases/download/v1.0/{model_files[variant][0]}",
                    ]
                    
                    downloaded = False
                    for url in download_urls:
                        print(f"   Trying: {url}")
                        if download_file(url, default_model_path, f"DeOldify {variant} model"):
                            model_path = str(default_model_path)
                            downloaded = True
                            print(f"   ✓ Model downloaded successfully to: {default_model_path}")
                            break
                    
                    if not downloaded:
                        # Step 3: Look for existing models in DeOldify directory
                        print("\n   3. Searching for existing models in DeOldify directory...")
                        model_search_paths = [
                            deoldify_repo / "models",
                            deoldify_repo / "checkpoints",
                            Path.home() / ".cache" / "deoldify",
                        ]
                        
                        # Map variant names to actual model file names
                        model_name_map = {
                            'backbone-lite': ['ColorizeArtistic_gen.pth', 'backbone-lite.pth'],
                            'stable': ['ColorizeStable_gen.pth', 'stable.pth'],
                            'artistic': ['ColorizeArtistic_gen.pth', 'artistic.pth'],
                        }
                        
                        found_model = None
                        for search_path in model_search_paths:
                            if search_path.exists():
                                for model_name in model_name_map.get(variant, []):
                                    potential_model = search_path / model_name
                                    if potential_model.exists():
                                        found_model = potential_model
                                        print(f"   ✓ Found model: {found_model}")
                                        break
                                if found_model:
                                    break
                        
                        if found_model:
                            # Copy to our models directory
                            default_model_path.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(found_model, default_model_path)
                            print(f"   ✓ Copied to: {default_model_path}")
                            model_path = str(default_model_path)
                        else:
                            print("   ⚠️  Could not find model files.")
                            print("   Please download the model manually:")
                            print("   1. Visit: https://github.com/jantic/DeOldify")
                            print("   2. Use their Colab notebooks to download models")
                            print(f"   3. Place the model file at: {default_model_path.absolute()}")
                            print("\n   Or specify the path:")
                            print(f"   python convert-deoldify-to-onnx.py --model-path /path/to/{variant}.pth")
                            return False
        
        # Load model
        print(f"   Loading model from: {model_path}")
        
        try:
            # Load with weights_only=False for compatibility with older model formats
            checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
            model = checkpoint.get('model', checkpoint.get('net', checkpoint.get('generator', None)))
            
            if model is None:
                print("   ⚠️  Could not find model in checkpoint. Trying to load as direct model...")
                model = torch.load(model_path, map_location='cpu', weights_only=False)
            
            if isinstance(model, dict):
                print("   ℹ️  Checkpoint is a dictionary. Inspecting keys...")
                keys = list(model.keys())
                print(f"   Keys found: {keys[:10] if len(keys) > 10 else keys}")
                
                # Try to extract state_dict
                state_dict = None
                if 'generator' in model:
                    state_dict = model['generator']
                    print("   ✓ Found 'generator' key")
                elif 'state_dict' in model:
                    state_dict = model['state_dict']
                    print("   ✓ Found 'state_dict' key")
                elif all(isinstance(v, (torch.Tensor, dict)) for v in list(model.values())[:5]):
                    state_dict = model
                    print("   ✓ Checkpoint appears to be a state_dict directly")
                
                if state_dict is None:
                    print("   ❌ Could not find generator state_dict in checkpoint.")
                    return False
                
                # Try to load using DeOldify architecture
                deoldify_available = False
                try:
                    from deoldify.generators import gen_inference_wide, gen_inference_deep
                    deoldify_available = True
                except ImportError:
                    pass
                
                if not deoldify_available:
                    print("\n   ⚠️  DeOldify generator architecture not available.")
                    print("   Please ensure DeOldify repository is cloned in the current directory.")
                    print("   The script will try to clone it automatically...")
                    
                    deoldify_repo = Path("./DeOldify")
                    if not deoldify_repo.exists():
                        print("   Cloning DeOldify repository...")
                        try:
                            subprocess.run(
                                ["git", "clone", "https://github.com/jantic/DeOldify.git", str(deoldify_repo)],
                                check=True,
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE
                            )
                        except:
                            pass
                    
                    # Try importing again
                    try:
                        sys.path.insert(0, str(deoldify_repo))
                        from deoldify.generators import gen_inference_wide, gen_inference_deep
                        deoldify_available = True
                    except ImportError as e:
                        print(f"   ❌ Could not import DeOldify generators: {e}")
                        print("   Please install DeOldify dependencies:")
                        print("   pip install fastai torchvision matplotlib")
                        print("   Or install all DeOldify requirements:")
                        print("   cd DeOldify && pip install -r requirements.txt")
                        return False
                
                # Create generator and load state_dict
                print("   Creating generator architecture...")
                try:
                    # Copy model to DeOldify's expected location
                    deoldify_models_dir = Path("./DeOldify/models")
                    deoldify_models_dir.mkdir(parents=True, exist_ok=True)
                    
                    # Determine the actual model type from the downloaded file
                    # The downloaded file is ColorizeArtistic_gen.pth, so use artistic generator
                    actual_model_type = 'artistic'  # The downloaded model is artistic
                    expected_weight_name = f"Colorize{actual_model_type.capitalize()}_gen.pth"
                    expected_weight_path = deoldify_models_dir / expected_weight_name
                    
                    if not expected_weight_path.exists():
                        print(f"   Copying model to DeOldify expected location: {expected_weight_path}")
                        shutil.copy2(model_path, expected_weight_path)
                    
                    # Temporarily patch torch.load to use weights_only=False
                    original_load = torch.load
                    def patched_load(*args, **kwargs):
                        if 'weights_only' not in kwargs:
                            kwargs['weights_only'] = False
                        return original_load(*args, **kwargs)
                    torch.load = patched_load
                    
                    try:
                        # Use deep generator for artistic model (which is what we downloaded)
                        # DeOldify will load from its models directory
                        weight_name = expected_weight_name.replace('.pth', '')
                        model = gen_inference_deep(root_folder=Path("./DeOldify"), weights_name=weight_name)
                        print("   ✓ Generator created and weights loaded")
                    except Exception as e1:
                        print(f"   ⚠️  Error loading from DeOldify path: {e1}")
                        print("   Trying to load state_dict manually...")
                        # Create generator without weights first, then load our state_dict
                        model = gen_inference_deep(root_folder=Path("./DeOldify"), weights_name="ColorizeArtistic_gen")
                        
                        # Load the state_dict manually
                        model.model.load_state_dict(state_dict, strict=False)
                        print("   ✓ Loaded state_dict into generator")
                    finally:
                        # Restore original torch.load
                        torch.load = original_load
                except Exception as e:
                    print(f"   ❌ Error creating generator: {e}")
                    import traceback
                    traceback.print_exc()
                    print("   Please check DeOldify installation and dependencies.")
                    return False
            
            # DeOldify returns a Learner object, extract the actual model
            if hasattr(model, 'model'):
                model = model.model
            elif hasattr(model, 'generator'):
                model = model.generator
            
            model.eval()
            print("   ✓ Model loaded")
            
        except Exception as e:
            print(f"   ❌ Error loading model: {e}")
            print("\n💡 You may need to:")
            print("   1. Clone DeOldify repository: git clone https://github.com/jantic/DeOldify")
            print("   2. Import the model architecture from their code")
            print("   3. Load the checkpoint properly")
            print("\n📝 Note: DeOldify uses a generator-discriminator architecture")
            print("   You may need to extract just the generator for inference")
            return False
        
        # Step 2: Create dummy input
        print("\n🔄 Step 2: Preparing model for ONNX export...")
        # DeOldify works with variable input sizes, but smaller is better for browser
        # Restrict to 512x512 or smaller for browser performance
        dummy_input = torch.randn(1, 3, 512, 512)
        
        # Step 3: Export to ONNX
        print("\n💾 Step 3: Exporting to ONNX format...")
        print("   This may take several minutes (DeOldify models are large)...")
        
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
        print("\n📝 Note: DeOldify expects RGB input images (3 channels)")
        print("   For browser performance, restrict input to ≤512x512")
        print("   The model will output colorized RGB images")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Alternative: Check for pre-converted ONNX models at:")
        print("   - https://github.com/PINTO0309/PINTO_model_zoo")
        print("   - Search for 'DeOldify' or 'colorization' in the model zoo")
        return False

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Convert DeOldify to ONNX')
    parser.add_argument('--model-path', type=str, help='Path to DeOldify .pth model file')
    parser.add_argument('--variant', type=str, choices=['backbone-lite', 'stable', 'artistic'], 
                       default='backbone-lite', help='Model variant (backbone-lite is smallest)')
    args = parser.parse_args()
    
    print("=" * 60)
    print("DeOldify → ONNX Converter")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    print("\n📋 About DeOldify:")
    print("   - High-quality colorization for B&W photos")
    print("   - Multiple variants available:")
    print("     • backbone-lite: Smallest, fastest (recommended for browser)")
    print("     • stable: Balanced quality/speed")
    print("     • artistic: Highest quality, largest")
    print("\n📥 Download model from:")
    print("   https://github.com/jantic/DeOldify")
    print("\n💡 Tip: Use 'backbone-lite' variant for browser performance")
    print("   Restrict input resolution to ≤512x512 for best results")
    
    # Convert
    success = convert_deoldify_to_onnx(model_path=args.model_path, variant=args.variant)
    
    if success:
        print("\n🎉 Success! Your model is ready to use.")
        sys.exit(0)
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == '__main__':
    main()

