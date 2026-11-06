#!/usr/bin/env python3
"""Transcribe audio/video with faster-whisper -> .srt captions + word-level .json.

Usage: python3 scripts/transcribe.py input.mp4 [--model small] [--lang en] [--out out/]
Models: tiny, base, small, medium, large-v3 (bigger = slower, more accurate).
"""
import argparse, json
from pathlib import Path
from faster_whisper import WhisperModel

def ts(t: float) -> str:
    h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int((s % 1) * 1000):03}"

p = argparse.ArgumentParser()
p.add_argument("input"); p.add_argument("--model", default="small")
p.add_argument("--lang", default=None); p.add_argument("--out", default="out")
a = p.parse_args()

model = WhisperModel(a.model, device="cpu", compute_type="int8")
segments, info = model.transcribe(a.input, language=a.lang, word_timestamps=True, vad_filter=True)
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
stem = out / Path(a.input).stem
srt, words = [], []
for i, s in enumerate(segments, 1):
    srt.append(f"{i}\n{ts(s.start)} --> {ts(s.end)}\n{s.text.strip()}\n")
    words += [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for w in (s.words or [])]
    print(f"[{s.start:6.1f}] {s.text.strip()}")
stem.with_suffix(".srt").write_text("\n".join(srt))
stem.with_suffix(".words.json").write_text(json.dumps({"language": info.language, "words": words}, indent=1))
print(f"\nSaved {stem}.srt and {stem}.words.json (language: {info.language})")
