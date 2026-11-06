#!/usr/bin/env python3
"""Free expressive voiceover with Chatterbox (MIT license, commercial use OK).

Usage (run with the TTS venv):
  .venv-tts/bin/python scripts/voice.py "Your script here" -o out/vo.wav
  .venv-tts/bin/python scripts/voice.py script.txt -o out/vo.wav --ref assets/voices/narrator.wav --emotion 0.7
  .venv-tts/bin/python scripts/voice.py "Bonjour à tous" --lang fr -o out/fr.wav   # multilingual model

Default = the channel voice: built-in Chatterbox voice, emotion 0.8, pace 0.4.
--ref      5-15s clean recording of the voice to clone (your own voice, or one you have rights to)
--emotion  0.25 calm ... 0.5 normal ... 0.8+ dramatic/hype
--pace     cfg weight: lower (0.3) = slower, more deliberate; 0.4 default
--raw      skip mastering (by default: de-noise, warmth/presence EQ, -14 LUFS for YouTube/TikTok)
"""
import argparse, re
from pathlib import Path
import torch, torchaudio

p = argparse.ArgumentParser()
p.add_argument("text"); p.add_argument("-o", "--out", default="out/voiceover.wav")
p.add_argument("--ref"); p.add_argument("--emotion", type=float, default=0.8)
p.add_argument("--pace", type=float, default=0.4); p.add_argument("--lang", default="en"); p.add_argument("--raw", action="store_true")
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
out = Path(a.out)
if a.raw:
    torchaudio.save(str(out), torch.cat(parts[:-1], dim=1), model.sr)
else:
    import subprocess, tempfile
    tmp = Path(tempfile.mkdtemp()) / "raw.wav"
    torchaudio.save(str(tmp), torch.cat(parts[:-1], dim=1), model.sr)
    # Mastering: cut rumble, light de-noise, a little warmth + presence, gentle compression, -14 LUFS.
    chain = ("highpass=f=80,afftdn=nf=-25,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3500:t=q:w=1.2:g=2,"
             "acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,loudnorm=I=-14:TP=-1.5:LRA=7")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(tmp), "-af", chain, "-ar", "48000", str(out)], check=True)
print("Saved", out)
