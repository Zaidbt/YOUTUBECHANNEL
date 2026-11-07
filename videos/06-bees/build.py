"""Video 006 · How do bees build perfect hexagons? — 48 s seamless loop, 120 BPM, 24 bars of 2 s.

The comb is generated here (hex grid inside a tongue-shaped comb hanging from a top bar) with, for every cell:
  vanish time (5-7 s rewind: the finished comb un-builds), build time (13-28 s, one note each),
  honey fill time (30.5-33.5 s) and wax cap time (upper cells, 33-35.5 s).
Frame 0 and frame 48 s both show the finished, honey-filled, capped comb → seamless loop.
Writes remotion/src/videos/bees/bees.json and public/videos/06-bees/music.wav
"""
import json, math, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402

BPM, BARS = 120, 24
BAR = 4 * 60 / BPM
DUR = BARS * BAR
R = 0.55                        # hexagon circumradius
TOP, A, B = 7.6, 6.6, 15.5      # comb hangs from y=TOP, half-width A, depth B

cells = []
for col in range(-14, 15):
    for row in range(-30, 30):
        x = 1.5 * R * col
        y = math.sqrt(3) * R * (row + (col % 2) * 0.5)
        if y > TOP - 0.4: continue
        if (x / A) ** 2 + ((TOP - y) / B) ** 2 <= 1: cells.append((x, y))
cells.sort(key=lambda c: (TOP - c[1]) + 0.35 * abs(c[0]))
N = len(cells)
q = lambda t, g=0.125: round(round(t / g) * g, 4)  # quantize to 16ths so every new cell lands on the grid
out = []
upper = [i for i, c in enumerate(cells) if c[1] > -0.5]
for k, (x, y) in enumerate(cells):
    u = k / (N - 1)
    build = q(13.0 + 15.0 * u ** 0.62)
    vanish = round(5.0 + 2.0 * (1 - u), 4)
    fill = round(30.5 + 3.0 * u, 4)
    cap = round(33.0 + 2.5 * upper.index(k) / max(1, len(upper) - 1), 4) if k in upper else None
    out.append({"x": round(x, 4), "y": round(y, 4), "build": build, "vanish": vanish, "fill": fill, "cap": cap})
flakes = [round(9.5 + 0.25 * i, 4) for i in range(8)]  # 8 wax glands, 2 flakes per beat
(ROOT / "remotion/src/videos/bees/bees.json").write_text(json.dumps({"duration": DUR, "R": R, "top": TOP, "cells": out, "flakes": flakes}))
print(f"{N} cells, {len(upper)} capped")

# ---------- music ----------
def bell(midi, dur=1.4, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.15) + 0.1 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.05)
    return x * vol * np.exp(-t / 0.45) * np.clip(t / 0.005, 0, 1)

def warm_pad(start, dur, notes, vol=0.022):
    for n in notes:
        for det in (-0.07, 0.0, 0.07):
            x = tri(n + det, dur, vol); x = x + pulse(n + 12 + det, dur, duty=0.5, vol=vol * 0.2)[:len(x)]
            k = np.linspace(0, 1, len(x)); s.add(x * np.clip(k / 0.3, 0, 1) * np.clip((1 - k) / 0.25, 0, 1), start)

def sub(start, dur, midi, vol=0.27):
    n = int(dur * SR); t = np.arange(n) / SR; k = np.linspace(0, 1, n)
    s.add(np.sin(2 * np.pi * hz(midi) * t) * vol * np.clip(k / 0.08, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), start)

def buzz(dur, vol=0.025, seed=0):
    """Bee hum: detuned low pulses with a fast wobble."""
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sign(np.sin(2 * np.pi * (f * (1 + 0.01 * np.sin(2 * np.pi * 7 * t + p))) * t)) for f, p in ((118, 0), (121, 1), (236.5, 2)))
    k = np.linspace(0, 1, n)
    return np.convolve(x, np.ones(18) / 18, mode="same") * vol * np.clip(k / 0.2, 0, 1) * np.clip((1 - k) / 0.2, 0, 1)

def snare(vol=0.16, seed=0):
    return mix(noise(0.2, vol, 0.06, rate=8000, seed=seed), tri(57, 0.05, vol * 0.6, decay=0.03))

s = Song(bpm=BPM, bars=BARS, loop=True)
PROG = [[46, 53, 58, 62], [43, 50, 55, 58], [51, 58, 63, 67], [53, 60, 65, 69]]  # Bb Gm Eb F
chord = lambda bar: PROG[bar % 4]
MEL = {0: [74, None, 77, None], 1: [74, 70, None, None], 2: [72, None, 75, 79], 3: [77, 74, None, None],
       19: [79, None, 77, 74], 20: [82, None, 77, None], 21: [81, None, 77, 74], 22: [74, None, 77, None], 23: [77, 74, 72, None]}
for bar in range(BARS):
    ch = chord(bar)
    warm_pad(s.t(bar) - 0.12, BAR + 0.4, ch, vol=0.021)
    sub(s.t(bar), BAR, ch[0] - 12, vol=0.26)
    if bar in MEL:
        for k, n in enumerate(MEL[bar]):
            if n: s.add(bell(n, vol=0.055), s.t(bar, k))
    if bar < 2 or bar >= 18:
        for b in (0, 2): s.add(kick(0.5) * 0.8, s.t(bar, b))
        for b in (1, 3): s.add(snare(0.14, seed=bar * 4 + b), s.t(bar, b))
    elif 6 <= bar < 15:
        s.add(kick(0.6) * 0.8, s.t(bar, 0)); s.add(snare(0.16, seed=bar), s.t(bar, 2))
s.add(buzz(DUR, 0.02), 0.0)
# rewind (5-7 s): play the start of bar 2 backwards, pitched down
seg = s.buf[int(4.0 * SR):int(6.0 * SR)].copy()
s.tape_stop(s.t(2.5), 1.0, end_rate=0.2)
s.add(seg[::-1] * np.linspace(0.2, 0.9, len(seg)), 5.0)
# wax flakes: soft high plinks
for i, t in enumerate(flakes): s.add(bell(93 + (i % 4) * 2, dur=0.6, vol=0.05), t)
# every new cell is a note (Bb major pentatonic); dense passages get quieter per note
PENTA = [70, 72, 74, 77, 79, 82, 84, 86]
builds = sorted(c["build"] for c in out)
for k, t in enumerate(builds):
    dens = sum(1 for u in builds if abs(u - t) < 0.06)
    s.add(bell(PENTA[k % len(PENTA)], dur=1.0, vol=0.085 / np.sqrt(dens)), t)
for c in out:
    if c["cap"] is not None: s.add(bell(89, dur=0.4, vol=0.012), c["cap"])
s.lowpass(5800)
s.reverb(wet=0.34, decay=2.6)
s.save(ROOT / "public/videos/06-bees/music.wav")
