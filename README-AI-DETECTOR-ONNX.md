# AI Detector Model Conversion Guide

This guide explains how to convert an AI text detection model to ONNX format for use with the browser-based AI detector tool.

## Prerequisites

1. **Python 3.8+** installed
2. **Required Python packages**:
   ```bash
   pip install "optimum[onnxruntime]" transformers torch
   ```
   
   **Note for zsh users**: The square brackets need to be quoted. Use:
   ```bash
   pip install 'optimum[onnxruntime]' transformers torch
   ```

## Quick Start

1. **Run the conversion script**:
   ```bash
   python convert-ai-detector-to-onnx.py
   ```

2. **Follow the prompts** to select a model and conversion options

3. **Host the converted model** files on a web server

4. **Update the tool** to use your local model

## Recommended Models

### 1. RoBERTa-base OpenAI Detector
- **Model ID**: `roberta-base-openai-detector`
- **Size**: ~500MB
- **Accuracy**: Good balance
- **Speed**: Fast
- **Best for**: General use, quick detection

### 2. RoBERTa-large OpenAI Detector
- **Model ID**: `roberta-large-openai-detector`
- **Size**: ~1.3GB
- **Accuracy**: Higher accuracy
- **Speed**: Slower
- **Best for**: When accuracy is more important than speed

### 3. DeBERTa-v3-large AI Detector
- **Model ID**: `desklib/ai-text-detector-v1.01`
- **Size**: ~1.5GB
- **Accuracy**: Very high
- **Speed**: Slower
- **Best for**: Maximum accuracy

## Manual Conversion (Advanced)

If you prefer to convert manually or customize the process:

```python
from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer

# Load and convert
model_id = "roberta-base-openai-detector"
model = ORTModelForSequenceClassification.from_pretrained(
    model_id,
    export=True
)

# Save
output_dir = "./models/roberta-base-openai-detector"
model.save_pretrained(f"{output_dir}/onnx")
tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.save_pretrained(output_dir)
```

## Using the Converted Model

After conversion, you'll have these files:
```
models/roberta-base-openai-detector/
├── config.json
├── tokenizer.json
├── tokenizer_config.json
└── onnx/
    ├── model.onnx
    └── model_quantized.onnx (if quantization was enabled)
```

### Option 1: Local Server

1. **Start a local web server** in the models directory:
   ```bash
   cd models
   python -m http.server 8000
   ```

2. **Update the model configuration** in `js/tools/ai-detector.js`:
   ```javascript
   const MODEL_CONFIG = {
     models: [
       'http://localhost:8000/roberta-base-openai-detector'
     ]
   };
   ```

### Option 2: Host on Your Web Server

1. **Upload the model files** to your web server
2. **Update the model path** in the configuration
3. **Ensure CORS is enabled** if hosting on a different domain

### Option 3: Use Transformers.js with Local Path

Configure Transformers.js to use local models:

```javascript
import { env } from '@xenova/transformers';

env.localModelPath = '/models/';
env.allowRemoteModels = false;
```

## Troubleshooting

### "Model not found" error
- Ensure the model ID is correct
- Check that you have internet connection to download the model
- Verify the model exists on Hugging Face

### "ONNX conversion failed"
- Check that you have enough disk space (models can be 500MB-1.5GB)
- Ensure you have the latest versions of `optimum` and `transformers`
- Try a smaller model first (roberta-base instead of roberta-large)

### "Quantization failed"
- This is non-critical - the non-quantized model will still work
- Quantization reduces model size but may slightly reduce accuracy

### Model too large
- Use the quantized version (`model_quantized.onnx`)
- Consider using a smaller model (roberta-base instead of roberta-large)
- The quantized model is typically 2-4x smaller

## Model Performance

After conversion, test the model with known AI-generated and human-written text to verify it's working correctly. The model should output classification scores indicating the likelihood of text being AI-generated.

## Notes

- **First conversion**: The first time you convert a model, it will download the model from Hugging Face (can be 500MB-1.5GB)
- **Conversion time**: Large models can take 5-15 minutes to convert
- **Disk space**: Ensure you have at least 2-3GB free space for the conversion process
- **Memory**: Large models may require 4-8GB RAM during conversion

## References

- [Hugging Face Optimum Documentation](https://huggingface.co/docs/optimum)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [ONNX Runtime Documentation](https://onnxruntime.ai/)

