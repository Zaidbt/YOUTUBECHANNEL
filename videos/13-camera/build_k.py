"""Video 013 · Camera — Kurzgesagt-style pixel remake, 37.5 s seamless loop, 128 BPM phonk (20 bars).

Story (bars): 0-1 hero (flash on the snares) · 2-3 light from the apple into the lens · 4-5 X-RAY: the parts pop in
(a pluck each) · 6-7 1. the lens focuses the light · 8-9 2. the shutter, a tiny door, blocks it · 10-11 CLICK: it opens
on the snares · 12 DIVE into the sensor · 12-13 3. light buckets fill up (cowbell) · 14-15 red/green/blue filters drop
(cowbell, a row each) · 16 back out · 16-17 the chip makes the photo (it appears on the cowbell) · 18-19 hero (loop).
Writes remotion/src/videos/camera/camerak.json + public/videos/13-camera/camerak.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import big_kick, clap, impact, riser, pluck  # noqa: E402

BPM, BARS = 128, 20
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR
S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)

flashes = [bt(b, s) for b in (0, 1, 18, 19) for s in (4, 12)]
shutter = [[bt(b, s), r4(bt(b, s) + 3 * S16)] for b in (10, 11) for s in (4, 12)]
parts = [bt(4, 2), bt(4, 6), bt(4, 10), bt(4, 14), bt(5, 2)]                 # LENS SHUTTER SENSOR CHIP SCREEN pop in
STEPS = (0, 3, 6, 8, 11, 14)
MEL = [[69, 69, 72, 69, 67, 64], [69, 69, 72, 74, 72, 67]]
hits = lambda bars: [[bt(b, s), MEL[k % 2][i]] for k, b in enumerate(bars) for i, s in enumerate(STEPS)]
cells, filters, screen = hits((12, 13)), hits((14, 15)), hits((16, 17))
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "flashes": flashes, "shutter": shutter, "parts": parts,
      "cells": [c[0] for c in cells], "filters": [c[0] for c in filters], "screen": [c[0] for c in screen]}
(ROOT / "remotion/src/videos/camera/camerak.json").write_text(json.dumps(ev))

def cowbell(midi, vol=0.08, dur=0.32):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi + 12)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.6 + np.sign(np.sin(2 * np.pi * f * 1.48 * t)) * 0.4
    x = np.convolve(x, np.ones(6) / 6, mode="same")
    return x * vol * (0.7 * np.exp(-t / 0.05) + 0.3 * np.exp(-t / 0.22))
def b808(midi, dur, vol=0.5, glide_from=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.full(n, hz(midi))
    if glide_from is not None: f = hz(midi) + (hz(glide_from) - hz(midi)) * np.exp(-t / 0.06)
    f = f + (hz(midi + 12) - hz(midi)) * np.exp(-t / 0.02)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 3.0) * vol * np.clip(t / 0.003, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)
def shutter_click(vol=0.3, seed=0):
    a = noise(0.012, vol, 0.004, rate=44100, seed=seed); c = noise(0.02, vol * 0.8, 0.006, rate=22050, seed=seed + 1)
    out = np.zeros(int(0.06 * SR)); out[:len(a)] += a; o = int(0.035 * SR); out[o:o + len(c)] += c[:len(out) - o]
    return out
def flash_whine(dur=0.35, vol=0.025):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(2500 + 4500 * (t / dur) ** 2) / SR) * vol * (t / dur)

main = Song(bpm=BPM, bars=BARS, loop=True); sc = Song(bpm=BPM, bars=BARS, loop=True)
kicks = []
ROOTS = [33, 33, 36, 31]
for bar in range(BARS):
    calm = 4 <= bar < 12
    for s in ((0, 10) if calm else (0, 7, 10)):
        main.add(big_kick(0.85 if calm else 0.95), bt(bar, s)); kicks.append(bt(bar, s))
    for s in (4, 12): main.add(clap(0.22 if calm else 0.36, seed=bar * 2 + s), bt(bar, s))
    for s in range(0, 16, 2): main.add(hat(0.08 if calm else 0.11, seed=bar * 8 + s), bt(bar, s + 1))
    if not calm and bar % 2 == 1:
        for k in range(6): main.add(hat(0.06, seed=900 + bar * 8 + k), r4(bt(bar, 13) + k * S16 / 2))
    r = ROOTS[bar % 4]
    for s, ln in ((0, 6), (6, 4), (10, 6)):
        sc.add(b808(r, ln * S16 * 0.95, 0.3 if calm else 0.5, glide_from=r + 5 if s == 10 else None), bt(bar, s))
for t in flashes: main.add(flash_whine(), t - 0.36); main.add(shutter_click(0.32, seed=int(t * 10)), t)
for o, c in shutter: main.add(shutter_click(0.34, seed=int(o * 10)), o); main.add(shutter_click(0.22, seed=int(c * 10)), c)
for i, t in enumerate(parts): main.add(pluck([81, 84, 88, 91, 93][i], 0.25, 0.08), t)
for t, m in cells + filters + screen: main.add(cowbell(m), t)
main.add(riser(BAR, 0.12, seed=3), bt(3)); main.add(impact(0.6, seed=4), bt(4))          # x-ray
main.add(riser(BAR, 0.18, seed=7), bt(11)); main.add(impact(1.0, seed=8), bt(12))        # the drop: into the sensor
main.add(impact(0.7, seed=12), bt(16))                                                     # back out
t = np.arange(len(sc.buf)) / SR
last = np.full(len(t), -10.0)
for k in sorted(kicks): last[t >= k] = k
main.buf += sc.buf * (1 - 0.6 * np.exp(-(t - last) / 0.12))
main.lowpass(10000); main.reverb(wet=0.12, decay=1.2)
main.save(ROOT / "public/videos/13-camera/camerak.wav")
print(f"camerak: {DUR:.3f} s")
