#!/usr/bin/env python3
import os
import argparse

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


def main():
    parser = argparse.ArgumentParser(
        description="Convert fakespot-ai/roberta-base-ai-text-detection-v1 (or another HF model) to ONNX using torch.onnx.export."
    )
    parser.add_argument(
        "--model-id",
        type=str,
        default="fakespot-ai/roberta-base-ai-text-detection-v1",
        help="Hugging Face model ID (default: fakespot-ai/roberta-base-ai-text-detection-v1)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="models/fakespot-ai-text-detection-v1-onnx",
        help="Directory to save ONNX model and tokenizer",
    )
    parser.add_argument(
        "--opset",
        type=int,
        default=17,
        help="ONNX opset version (>= 11; 17 is fine for recent ONNX Runtime)",
    )
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    print(f"Loading model and tokenizer: {args.model_id}")
    tokenizer = AutoTokenizer.from_pretrained(args.model_id, use_fast=True)
    model = AutoModelForSequenceClassification.from_pretrained(args.model_id)
    model.eval()

    # Dummy text to build example inputs
    dummy_text = "This is a sample text for ONNX conversion."
    inputs = tokenizer(dummy_text, return_tensors="pt")

    # Define ONNX export path inside the output directory
    onnx_path = os.path.join(args.output_dir, "model.onnx")

    print(f"Exporting to ONNX at: {onnx_path}")
    with torch.no_grad():
        torch.onnx.export(
            model,
            (inputs["input_ids"], inputs["attention_mask"]),
            onnx_path,
            export_params=True,
            opset_version=args.opset,
            input_names=["input_ids", "attention_mask"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch_size", 1: "sequence_length"},
                "attention_mask": {0: "batch_size", 1: "sequence_length"},
                "logits": {0: "batch_size"},
            },
        )

    print("Saving tokenizer and config alongside ONNX model...")
    tokenizer.save_pretrained(args.output_dir)
    # Save the model config only (weights are in the ONNX file)
    model.config.save_pretrained(args.output_dir)

    print("\nDone.")
    print(f"ONNX directory: {os.path.abspath(args.output_dir)}")
    print("Created files include:")
    print("  - model.onnx")
    print("  - config.json")
    print("  - tokenizer.json / tokenizer_config.json / special_tokens_map.json")


if __name__ == "__main__":
    main()


