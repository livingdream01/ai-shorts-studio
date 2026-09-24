#!/usr/bin/env python3
"""Align captions to the actual voiceover with Whisper.

Usage: python3 align.py voice.wav captions.srt
Produces an SRT whose timings match the audio, so captions never drift.
"""
import sys
from faster_whisper import WhisperModel


def stamp(t):
    ms = int((t % 1) * 1000)
    s = int(t) % 60
    m = int(t // 60) % 60
    h = int(t // 3600)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    wav, out = sys.argv[1], sys.argv[2]
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(wav, language="en", vad_filter=True)
    n = 0
    with open(out, "w") as f:
        for s in segments:
            text = s.text.strip()
            if not text:
                continue
            n += 1
            f.write(f"{n}\n{stamp(s.start)} --> {stamp(s.end)}\n{text}\n\n")
    print(f"[align] {n} caption cues written to {out}")


if __name__ == "__main__":
    main()
