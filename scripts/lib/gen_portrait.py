#!/usr/bin/env python3
"""Generate the character's reference portrait with SD-Turbo (one-time).

Usage: python3 gen_portrait.py assets/wren-ref.png
"""
import sys
import torch
from diffusers import AutoPipelineForText2Image

out = sys.argv[1] if len(sys.argv) > 1 else "assets/wren-ref.png"
prompt = (
    "close-up portrait photograph of a calm young woman, early 20s, soft natural "
    "window light, plain warm background, looking directly at camera, neutral "
    "expression, 35mm lens, shallow depth of field, cinematic, photorealistic"
)

pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sd-turbo", torch_dtype=torch.float32)
pipe.set_progress_bar_config(disable=True)
g = torch.Generator().manual_seed(7)
img = pipe(prompt=prompt, num_inference_steps=2, guidance_scale=0.0, generator=g).images[0]
img = img.resize((576, 768))
img.save(out)
print(f"[portrait] wrote {out} {img.size}")
