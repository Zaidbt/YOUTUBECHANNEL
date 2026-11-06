#!/usr/bin/env python3
"""Free expressive voiceover with Chatterbox (MIT license, commercial use OK).

Usage (run with the TTS venv):
  .venv-tts/bin/python scripts/voice.py "Your script here" -o out/vo.wav
  .venv-tts/bin/python scripts/voice.py script.txt -o out/vo.wav --ref assets/voices/narrator.wav --emotion 0.7
  .venv-tts/bin/python scripts/voice.py "Bonjour à tous" --lang fr -o out/fr.wav   # multilingual model

--ref      5-15s clean recording of the voice to clone (your own voice, or one you have rights to)
--emotion  0.25 calm ... 0.5 normal ... 0.8+ dramatic/hype
--pace     cfg weight: lower (0.3) = slower, more deliberate; 0.5 default
"""
import argparse, re
from pathlib import Path
import torch, torchaudio

p = argparse.ArgumentParser()
p.add_argument("text"); p.add_argument("-o", "--out", default="out/voiceover.wav")
p.add_argument("--ref"); p.add_argument("--emotion", type=float, default=0.5)
p.add_argument("--pace", type=float, default=0.5); p.add_argument("--lang", default="en")
a = p.parse_args()

text = Path(a.text).read_text() if a.text.endswith(".txt") and Path(a.text).exists() else a.text
# Generate sentence by sentence: long inputs degrade quality.
sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
# Very short sentences ("Did you know?") come out garbled alone: merge them into the next one.
chunks, buf = [], ""
for s in sentences:
    buf = f"{buf} {s}".strip()
    if len(buf.split()) >= 6:
        chunks.append(buf); buf = ""
if buf:
    if chunks: chunks[-1] += " " + buf
    else: chunks.append(buf)

if a.lang == "en":
    from chatterbox.tts import ChatterboxTTS
    model = ChatterboxTTS.from_pretrained(device="cpu")
    gen = lambda t: model.generate(t, audio_prompt_path=a.ref, exaggeration=a.emotion, cfg_weight=a.pace)
else:
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    gen = lambda t: model.generate(t, language_id=a.lang, audio_prompt_path=a.ref, exaggeration=a.emotion, cfg_weight=a.pace)

gap = torch.zeros(1, int(model.sr * 0.15))
parts = []
for i, c in enumerate(chunks, 1):
    print(f"[{i}/{len(chunks)}] {c}")
    parts += [gen(c), gap]
Path(a.out).parent.mkdir(parents=True, exist_ok=True)
torchaudio.save(a.out, torch.cat(parts[:-1], dim=1), model.sr)
print("Saved", a.out)
