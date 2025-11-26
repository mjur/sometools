import torch
# from ddcolor import build_model  # adjust to their API

# 1) Load the tiny DDColor model from their code
model = ...  # build / load according to the DDColor README
model.eval()

   # 2) Use the expected size (your current ONNX says 1x3x256x256)
dummy = torch.randn(1, 3, 256, 256)

   # 3) Export to ONNX
torch.onnx.export(
    model,
    dummy,
    "ddcolor_paper_tiny.onnx",
    export_params=True,
    opset_version=11,
    do_constant_folding=True,
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
)