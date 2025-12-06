# MusicGen ONNX Model Documentation

## Model Information
- **Model**: `Xenova/musicgen-small`
- **Source**: https://huggingface.co/Xenova/musicgen-small
- **Decoder Model**: `decoder_model_merged_int8.onnx` (~407MB, INT8 quantized)
- **Designed For**: Transformers.js (`@huggingface/transformers` or `@xenova/transformers`)
- **Library**: The model is specifically exported for use with Transformers.js, not raw ONNX Runtime
- **Sequence Length Limit**: 2048 tokens (~41 seconds at 50 Hz) - This is an architectural limitation of MusicGen models, not just the small variant
- **Larger Models**: `musicgen-medium` (1.5B) and `musicgen-large` (3.3B) exist but are not available in browser-compatible format from Xenova

## Current Issue

The decoder model is experiencing dimension mismatch errors (error code `876249264`) when providing `past_key_values` inputs. The model's input metadata is not accessible via `decoderSession.inputs`, making it difficult to determine the expected shapes.

## Attempted Solutions

1. **Omitting `past_key_values` entirely**: Model requires `past_key_values` inputs (fails with empty error)
2. **Sequence Length 0**: Error code `876249264` - ONNX Runtime rejects zero-sized dimensions
3. **Sequence Lengths 1-128**: All tested sequence lengths (1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 24, 32, 48, 64, 96, 128) fail with various error codes
4. **`use_cache_branch` variations**: Tried both `true` and `false` for all sequence lengths - all fail
5. **Separate tensor data**: Created separate Float32Arrays for each layer to ensure independent tensors - still fails

**Error Codes Observed**: `876249264`, `1224457248`, `1224434760`, `1224472000`, `1223920840`, `748918856`, `1005569520`, `1143981440`, `1200663240`, `1347637040`, `1133976648`, `1210613128`, and many others.

**Note**: All sequence lengths and `use_cache_branch` combinations fail with different error codes, suggesting the model processes them but rejects them at different stages. The different error codes indicate the issue may not be just the sequence length dimension or the `use_cache_branch` flag. This suggests a fundamental incompatibility between the ONNX model export and ONNX Runtime Web, or a missing initialization step.

## Key Findings from Research

1. **ONNX Runtime Requirements**:
   - Some execution providers require fixed input shapes
   - Zero-sized dimensions are not accepted
   - Dimensions may need to be multiples of 8, 16, or 32

2. **Past Key Values in Autoregressive Models**:
   - `past_key_values` stores previously computed key and value states
   - Shape typically: `[batch_size, num_heads, sequence_length, head_dim]`
   - For first iteration, sequence_length should represent no previous tokens (0), but ONNX Runtime doesn't accept this

3. **Model Architecture**:
   - MusicGen-small has 24 decoder layers
   - Each layer has: `decoder.key`, `decoder.value`, `encoder.key`, `encoder.value`
   - Encoder KV cache: `[1, 16, 512, 64]` (from Netron: `encoder_sequence_length_out = 512`)
   - Decoder KV cache: `[1, 16, past_decoder_sequence_length, 64]` (from Netron, but `past_decoder_sequence_length` is dynamic and unknown for first iteration)
   - **Netron Inspection**: Confirmed shapes from Netron:
     - `past_key_values.0.decoder.key`: `float32[total_batch_size,16,past_decoder_sequence_length,64]`
     - `past_key_values.0.encoder.key`: `float32[total_batch_size,16,encoder_sequence_length_out,64]`

## Status: BLOCKED

**All reasonable attempts have been exhausted.** The model consistently fails with dimension mismatch errors regardless of:
- Sequence length (tested 1-128)
- `use_cache_branch` value (tested both `true` and `false`)
- Tensor initialization (separate arrays for each layer)

This suggests a **fundamental incompatibility** between the ONNX model export and ONNX Runtime Web, or a missing initialization step that is not documented.

## Key Finding: Model Designed for Transformers.js

**Important Discovery**: The model is specifically designed for use with Transformers.js (`@huggingface/transformers` or `@xenova/transformers`), not raw ONNX Runtime. The Hugging Face model page shows example usage with `MusicgenForConditionalGeneration` from Transformers.js.

**Example from Hugging Face**:
```javascript
import { AutoTokenizer, MusicgenForConditionalGeneration, RawAudio } from '@huggingface/transformers';

const model = await MusicgenForConditionalGeneration.from_pretrained('Xenova/musicgen-small', {
  quantized: false,
  device: 'wasm',
  dtype: 'q8',
  text_encoder: 'q8',
  decoder_model_merged: 'q8',
  encodec_decode: 'fp32',
});
```

This suggests that **using raw ONNX Runtime may not be the intended approach** for this model. Transformers.js likely handles the `past_key_values` initialization internally.

## Recommended Next Steps

1. **Use Transformers.js Instead** (HIGHEST PRIORITY):
   - Switch to using `@huggingface/transformers` or `@xenova/transformers` library
   - Use `MusicgenForConditionalGeneration.from_pretrained()` instead of raw ONNX Runtime
   - This is the intended usage pattern according to the model's documentation

2. **If Must Use Raw ONNX Runtime**:
   - Contact Xenova (https://github.com/xenova) or check their GitHub repository
   - Ask for documentation on using the ONNX models directly (if supported)
   - Request clarification on how to handle the first iteration with `past_key_values`
   - Check if there's a different ONNX export designed for raw ONNX Runtime

3. **Alternative Approaches**:
   - Use Transformers.js wrapper (recommended)
   - Look for a server-side solution
   - Check if there's a different quantization or export that works better with ONNX Runtime Web

4. **Model Export Investigation**:
   - The model might have been exported with dynamic shapes specifically for Transformers.js
   - Transformers.js may handle shape inference and initialization differently than raw ONNX Runtime
   - May need to use Transformers.js's internal ONNX Runtime wrapper instead of direct access

## Resources

- **Hugging Face Model Page**: https://huggingface.co/Xenova/musicgen-small (shows Transformers.js usage example)
- **Transformers.js Repository**: https://github.com/xenova/transformers.js
- **Transformers.js Documentation**: https://huggingface.co/docs/transformers.js
- ONNX Runtime Documentation: https://onnxruntime.ai/docs/
- ONNX Runtime Error Codes: https://onnxruntime.ai/docs/genai/howto/troubleshoot.html
- Netron Model Viewer: https://netron.app/

## Current Implementation

See `js/tools/music-generate.js` for the current implementation. The `createEmptyPastKeyValues()` function attempts to create empty past_key_values tensors, but the correct sequence length for the decoder KV cache is unknown.

