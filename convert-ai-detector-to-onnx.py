#!/usr/bin/env python3
"""
Convert AI Text Detection Model to ONNX Format
This script converts a Hugging Face model to ONNX format for use with Transformers.js

Requirements:
    pip install "optimum[onnxruntime]" transformers torch
    (For zsh: pip install 'optimum[onnxruntime]' transformers torch)

Usage:
    python convert-ai-detector-to-onnx.py
"""

import os
import sys
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = {
        'optimum': 'optimum[onnxruntime]',
        'transformers': 'transformers',
        'torch': 'torch'
    }
    
    missing = []
    for package, install_name in required_packages.items():
        try:
            __import__(package)
        except ImportError:
            missing.append(install_name)
    
    if missing:
        print("❌ Missing required packages. Please install them:")
        # Quote packages with brackets for shell compatibility
        install_cmd = ' '.join(f'"{pkg}"' if '[' in pkg else pkg for pkg in missing)
        print(f"   pip install {install_cmd}")
        print("   (For zsh, use single quotes: pip install 'optimum[onnxruntime]' ...)")
        return False
    return True

def convert_model_to_onnx(model_id, output_dir=None, quantize=True):
    """
    Convert a Hugging Face model to ONNX format
    
    Args:
        model_id: Hugging Face model identifier (e.g., 'roberta-base-openai-detector')
        output_dir: Directory to save the ONNX model (default: ./models/{model_name})
        quantize: Whether to create a quantized version (smaller, faster)
    """
    try:
        from optimum.onnxruntime import ORTModelForSequenceClassification
        from optimum.onnxruntime.configuration import AutoQuantizationConfig
        from optimum.onnxruntime import ORTQuantizer
        from transformers import AutoTokenizer, AutoConfig
    except ImportError as e:
        print(f"❌ Error importing required modules: {e}")
        print("   Please install: pip install optimum[onnxruntime] transformers")
        return False
    
    print(f"\n🔄 Converting model: {model_id}")
    print("=" * 60)
    
    # Set output directory
    if output_dir is None:
        model_name = model_id.replace('/', '_')
        output_dir = f"./models/{model_name}"
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    onnx_dir = output_path / "onnx"
    onnx_dir.mkdir(exist_ok=True)
    
    try:
        # Step 1: Load tokenizer and config
        print("\n📥 Step 1: Loading tokenizer and model configuration...")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        config = AutoConfig.from_pretrained(model_id)
        
        # Save tokenizer files
        tokenizer.save_pretrained(output_path)
        config.save_pretrained(output_path)
        print(f"   ✓ Tokenizer and config saved to {output_path}")
        
        # Step 2: Convert model to ONNX
        print("\n🔄 Step 2: Converting model to ONNX format...")
        print("   This may take several minutes depending on model size...")
        
        model = ORTModelForSequenceClassification.from_pretrained(
            model_id,
            export=True,
            provider="CPUExecutionProvider"  # Use CPU for compatibility
        )
        
        # Save ONNX model
        onnx_model_path = onnx_dir / "model.onnx"
        model.save_pretrained(str(onnx_dir))
        print(f"   ✓ ONNX model saved to {onnx_model_path}")
        
        # Step 3: Quantize model (optional but recommended)
        if quantize:
            print("\n⚡ Step 3: Creating quantized version (smaller, faster)...")
            try:
                # Create quantizer
                quantizer = ORTQuantizer.from_pretrained(str(onnx_dir))
                
                # Configure quantization (use dynamic quantization for text models)
                qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)
                
                # Quantize
                quantizer.quantize(
                    save_dir=str(onnx_dir),
                    quantization_config=qconfig
                )
                
                print(f"   ✓ Quantized model saved to {onnx_dir / 'model_quantized.onnx'}")
            except Exception as e:
                print(f"   ⚠️  Quantization failed (non-critical): {e}")
                print("   The non-quantized model will still work")
        
        print("\n" + "=" * 60)
        print("✅ Conversion complete!")
        print(f"\n📁 Model files saved to: {output_path.absolute()}")
        print("\n📋 Files created:")
        print(f"   - {output_path / 'tokenizer.json'}")
        print(f"   - {output_path / 'tokenizer_config.json'}")
        print(f"   - {output_path / 'config.json'}")
        print(f"   - {onnx_dir / 'model.onnx'}")
        if quantize:
            print(f"   - {onnx_dir / 'model_quantized.onnx'}")
        
        print("\n💡 Next steps:")
        print("   1. Host these files on a web server (or use local server)")
        print("   2. Update the model configuration in js/tools/ai-detector.js")
        print("   3. Point to the local model path")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("AI Text Detection Model → ONNX Converter")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Recommended models for AI detection
    recommended_models = [
        {
            'id': 'roberta-base-openai-detector',
            'name': 'RoBERTa-base OpenAI Detector',
            'size': '~500MB',
            'description': 'Good balance of accuracy and speed'
        },
        {
            'id': 'roberta-large-openai-detector',
            'name': 'RoBERTa-large OpenAI Detector',
            'size': '~1.3GB',
            'description': 'Higher accuracy, larger size'
        },
        {
            'id': 'desklib/ai-text-detector-v1.01',
            'name': 'DeBERTa-v3-large AI Detector',
            'size': '~1.5GB',
            'description': 'High accuracy, based on DeBERTa-v3-large'
        }
    ]
    
    print("\n📋 Recommended AI Detection Models:")
    for i, model in enumerate(recommended_models, 1):
        print(f"\n   {i}. {model['name']}")
        print(f"      Model ID: {model['id']}")
        print(f"      Size: {model['size']}")
        print(f"      Description: {model['description']}")
    
    # Get user choice
    print("\n" + "-" * 60)
    choice = input("\nEnter model number to convert (1-3), or custom model ID: ").strip()
    
    if choice.isdigit() and 1 <= int(choice) <= len(recommended_models):
        model_id = recommended_models[int(choice) - 1]['id']
    elif choice:
        model_id = choice
    else:
        # Default to roberta-base-openai-detector
        model_id = 'roberta-base-openai-detector'
        print(f"\nUsing default model: {model_id}")
    
    # Ask about quantization
    quantize_input = input("\nCreate quantized version? (y/n, default: y): ").strip().lower()
    quantize = quantize_input != 'n'
    
    # Convert
    success = convert_model_to_onnx(model_id, quantize=quantize)
    
    if success:
        print("\n🎉 Success! Your model is ready to use.")
        sys.exit(0)
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == '__main__':
    main()

