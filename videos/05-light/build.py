"""Video 005 · How does a light bulb make light? (LED) — 48 s seamless loop, 120 BPM, 24 bars of 2 s.

Scenes: bulb (0-7 s) → inside the copper wire (7-16 s) → inside the LED chip (16-38 s) → back out to the bulb (38-48 s).
Events (shared with the picture):
  pushes: every beat in the wire scene — the electric "push" racing down the wire (kick)
  drops:  an electron falls into a hole and a photon pops out (one bell note each)
          16-24 s one per second, 24-32 s every beat, 32-34 s 8ths, 34-36 s 16ths, 36-38 s 32nds
Writes remotion/src/videos/light/light.json and public/videos/05-light/music.wav
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402

BPM, BARS = 120, 24
BAR = 4 * 60 / BPM
DUR = BARS * BAR

pushes = [round(8 + 0.5 * k, 4) for k in range(16)]                      # 8.0 .. 15.5
drops = [16 + k * 1.0 for k in range(8)] + [24 + k * 0.5 for k in range(16)] + [32 + k * 0.25 for k in range(8)] \
      + [34 + k * 0.125 for k in range(16)] + [36 + k * 0.0625 for k in range(32)]
drops = [round(t, 4) for t in drops]
(ROOT / "remotion/src/videos/light/light.json").write_text(json.dumps({"duration": DUR, "pushes": pushes, "drops": drops}))
print(f"{len(pushes)} pushes, {len(drops)} drops")

def bell(midi, dur=1.6, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.15) + 0.1 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.05)
    return x * vol * np.exp(-t / 0.5) * np.clip(t / 0.005, 0, 1)

def warm_pad(start, dur, notes, vol=0.022):
    for n in notes:
        for det in (-0.07, 0.0, 0.07):
            x = tri(n + det, dur, vol); x = x + pulse(n + 12 + det, dur, duty=0.5, vol=vol * 0.2)[:len(x)]
            k = np.linspace(0, 1, len(x)); s.add(x * np.clip(k / 0.3, 0, 1) * np.clip((1 - k) / 0.25, 0, 1), start)

def sub(start, dur, midi, vol=0.28):
    n = int(dur * SR); t = np.arange(n) / SR; k = np.linspace(0, 1, n)
    s.add(np.sin(2 * np.pi * hz(midi) * t) * vol * np.clip(k / 0.08, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), start)

def zap(vol=0.12):
    """The electric push: a fast falling sine sweep."""
    n = int(0.18 * SR); t = np.arange(n) / SR
    f = 2400 * np.exp(-t / 0.03) + 120
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) * vol

def shaker(vol, seed):
    return np.diff(noise(0.06, vol, 0.015, rate=44100, seed=seed), prepend=0)

def snare(vol=0.2, seed=0):
    return mix(noise(0.2, vol, 0.06, rate=8000, seed=seed), tri(57, 0.05, vol * 0.6, decay=0.03))

s = Song(bpm=BPM, bars=BARS, loop=True)
PROG = [[54, 61, 66, 69], [50, 57, 62, 66], [57, 64, 69, 73], [52, 59, 64, 68]]  # F#m D A E
chord = lambda bar: PROG[bar % 4]
MEL = {0: [78, None, 81, None], 1: [78, 74, None, None], 2: [76, None, 81, 85], 3: [83, 80, None, None],
       19: [85, None, 81, 78], 20: [86, None, 81, None], 21: [88, None, 85, 81], 22: [78, None, 81, None], 23: [83, 80, 76, None]}
for bar in range(BARS):
    ch = chord(bar)
    warm_pad(s.t(bar) - 0.12, BAR + 0.4, ch, vol=0.02)
    sub(s.t(bar), BAR, ch[0] - 12, vol=0.26)
    if bar in MEL:
        for k, n in enumerate(MEL[bar]):
            if n: s.add(bell(n, vol=0.055), s.t(bar, k))
    groove = bar < 4 or bar >= 19
    if groove:
        for b in (0, 2): s.add(kick(0.5) * 0.8, s.t(bar, b))
        for b in (1, 3): s.add(snare(0.14, seed=bar * 4 + b), s.t(bar, b))
        for e in range(8): s.add(shaker(0.05 if e % 2 else 0.08, seed=bar * 8 + e), s.t(bar, e / 2))
for k, t in enumerate(pushes):
    s.add(kick(0.75) * 0.85, t); s.add(zap(0.09), t)
    if k % 2: s.add(snare(0.12, seed=200 + k), t)
# photons: one note per drop; dense passages get quieter per note so they melt into shimmer
PENTA = [78, 81, 83, 85, 88, 90, 93]
for k, t in enumerate(drops):
    dens = sum(1 for u in drops if abs(u - t) < 0.2)
    s.add(bell(PENTA[(k * 3) % len(PENTA)], dur=1.2, vol=0.09 / np.sqrt(dens)), t)
    if t < 32: s.add(kick(0.55) * 0.7, t)
s.add(np.convolve(noise(4.0, 0.12, 99, rate=44100, seed=4), np.ones(10) / 10, mode="same") * np.linspace(0, 1, int(4 * SR)) ** 3, 34.0)  # riser into the zoom-out

s.lowpass(6200)
s.reverb(wet=0.34, decay=2.6)
s.save(ROOT / "public/videos/05-light/music.wav")
