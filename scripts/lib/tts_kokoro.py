#!/usr/bin/env python3
"""Kokoro TTS — natural, local, CPU-friendly. Reads text on stdin, writes a wav.

Usage: echo "text" | python3 tts_kokoro.py out.wav [voice] [speed]
Voices: af_heart, af_bella (female), am_michael, am_adam (male) …
"""
import sys
import numpy as np

def to_np(a):
    try:
        return a.detach().cpu().numpy()
    except AttributeError:
        return np.asarray(a)

def main():
    out = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else "af_heart"
    speed = float(sys.argv[3]) if len(sys.argv) > 3 else 0.92
    text = sys.stdin.read().strip()
    if not text:
        sys.exit("no text")
    import soundfile as sf
    from kokoro import KPipeline

    pipe = KPipeline(lang_code="a")  # american english
    chunks = [to_np(a) for _, _, a in pipe(text, voice=voice, speed=speed)]
    wav = np.concatenate(chunks) if chunks else np.zeros(1, dtype="float32")
    sf.write(out, wav, 24000)
    print(f"[tts] kokoro {voice} → {out} ({len(wav)/24000:.1f}s)")

if __name__ == "__main__":
    main()
