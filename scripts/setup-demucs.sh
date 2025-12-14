#!/bin/bash
# Setup script for Demucs audio stem separation
# Downloads Demucs repository and sets up conversion environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEMUCS_DIR="$PROJECT_ROOT/demucs"
VENV_DIR="$PROJECT_ROOT/venv-demucs"

echo "=========================================="
echo "Demucs Setup Script"
echo "=========================================="
echo ""

# Check if Demucs directory already exists
if [ -d "$DEMUCS_DIR" ]; then
    echo "⚠️  Demucs directory already exists at: $DEMUCS_DIR"
    read -p "Do you want to remove it and re-clone? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing Demucs directory..."
        rm -rf "$DEMUCS_DIR"
    else
        echo "Using existing Demucs directory."
    fi
fi

# Clone Demucs repository if it doesn't exist
if [ ! -d "$DEMUCS_DIR" ]; then
    echo "📥 Cloning Demucs repository..."
    git clone https://github.com/adefossez/demucs.git "$DEMUCS_DIR"
    echo "✓ Demucs repository cloned"
else
    echo "✓ Demucs repository already exists"
fi

# Create virtual environment
echo ""
echo "🐍 Setting up Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    # Try Python 3.11 first (best compatibility)
    if command -v python3.11 &> /dev/null; then
        echo "Using Python 3.11..."
        python3.11 -m venv "$VENV_DIR"
    elif command -v python3.12 &> /dev/null; then
        echo "Using Python 3.12..."
        python3.12 -m venv "$VENV_DIR"
    elif command -v python3 &> /dev/null; then
        echo "Using default Python 3..."
        python3 -m venv "$VENV_DIR"
    else
        echo "❌ Error: Python 3 not found. Please install Python 3.11 or 3.12."
        exit 1
    fi
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment and install dependencies
echo ""
echo "📦 Installing dependencies..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
pip install --upgrade pip

# Install Demucs and conversion dependencies
echo "Installing Demucs..."
pip install demucs

echo "Installing ONNX conversion dependencies..."
pip install torch onnx onnxruntime

echo "Installing audio processing dependencies..."
pip install soundfile librosa

echo ""
echo "✓ Dependencies installed"
echo ""

# Create models directory
MODELS_DIR="$PROJECT_ROOT/models/demucs-onnx"
mkdir -p "$MODELS_DIR"
echo "✓ Created models directory: $MODELS_DIR"

# Create README
cat > "$MODELS_DIR/README.md" << 'EOF'
# Demucs ONNX Models

This directory contains ONNX-converted Demucs models for browser use.

## Pre-converted Models

You can download pre-converted models from:

1. **Hugging Face**: https://huggingface.co/arjune123/demucs-onnx
   - Model: `htdemucs_6s.onnx` (6 sources: drums, bass, other, vocals, piano, guitar)
   - Direct download: https://huggingface.co/arjune123/demucs-onnx/resolve/main/htdemucs_6s.onnx

2. **GitHub**: https://github.com/gianlourbano/demucs-onnx

## Converting Your Own Models

To convert Demucs models to ONNX:

```bash
source venv-demucs/bin/activate
python scripts/convert-demucs-to-onnx.py --model htdemucs --output models/demucs-onnx
```

Available models:
- `htdemucs` - Hybrid Transformer Demucs (default, best quality)
- `htdemucs_ft` - Fine-tuned version (slower, better quality)
- `htdemucs_6s` - 6 sources (adds piano and guitar)
- `mdx` - MDX model (trained on MusDB)
- `mdx_extra` - MDX with extra training data
- `mdx_q` - Quantized MDX (smaller)
- `mdx_extra_q` - Quantized MDX extra (smaller)
EOF

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Activate the virtual environment:"
echo "   source venv-demucs/bin/activate"
echo ""
echo "2. Download a pre-converted ONNX model:"
echo "   wget -O models/demucs-onnx/htdemucs_6s.onnx \\"
echo "     https://huggingface.co/arjune123/demucs-onnx/resolve/main/htdemucs_6s.onnx"
echo ""
echo "3. Or convert your own model:"
echo "   python scripts/convert-demucs-to-onnx.py --model htdemucs"
echo ""
echo "4. The browser tool is ready at: /convert/audio-stem-separator/"
echo ""

