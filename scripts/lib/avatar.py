#!/usr/bin/env python3
"""Animate the character portrait with Wav2Lip — a real talking head.

Usage: python3 avatar.py <portrait.png> <voice.wav> <out.mp4>

Applies compatibility shims for modern torch/librosa, then runs Wav2Lip's
inference as a subprocess of this process.
"""
import sys
import os
import functools
import runpy

W2L = "/opt/wav2lip"

# 1) torch.load: modern torch defaults weights_only=True, which rejects these checkpoints.
import torch
_orig_load = torch.load
torch.load = functools.partial(_orig_load, weights_only=False)

# 2) librosa.filters.mel: newer versions made sr/n_fft keyword-only.
import librosa.filters as _lf
_orig_mel = _lf.mel


def _mel(sr=None, n_fft=None, *a, **k):
    return _orig_mel(sr=sr, n_fft=n_fft, *a, **k)


_lf.mel = _mel

portrait, wav, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs("temp", exist_ok=True)  # Wav2Lip writes temp/ relative to the CWD
sys.path.insert(0, W2L)
sys.argv = [
    "inference.py",
    "--checkpoint_path", f"{W2L}/checkpoints/wav2lip_gan.pth",
    "--face", portrait,
    "--audio", wav,
    "--outfile", out,
    "--pads", "0", "20", "0", "0",
    "--nosmooth",
]
runpy.run_path(f"{W2L}/inference.py", run_name="__main__")
if os.path.exists(out):
    print(f"[avatar] wrote {out}")
else:
    sys.exit(f"[avatar] Wav2Lip did not produce {out}")
