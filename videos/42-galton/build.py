"""Sound for video 042, frame-accurate from the Galton simulation (events.json):
- every peg hit = a glassy pluck at the exact time; pitch from the peg's row (top rows high, bottom rows low → each
  ball plays a falling run) and column (left/right = a neighbouring scale step), panned by x; C major pentatonic so
  any overlap is consonant; dense moments are gain-normalised into a shimmer;
- every ball entering a bin = a soft woody tock pitched by the bin;
- bed: warm pad chords that change with each colour wave (every 4 s), a soft kick from 8 s that builds, a riser into
  the reveal; REVEAL = impact + big chord + a harp glissando that follows the curve being drawn; trap door = clunk +
  a rattle of falling balls + whoosh; then near-silence so the loop restarts cleanly. 120 BPM, 44 s."""
import json, sys
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "scripts")); sys.path.insert(0, str(HERE))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
from sim import D, REVEAL, OPEN, BAR, BEAT, PEGS, NB, CX, ROWS  # noqa: E402
rng = np.random.default_rng(42)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

EV = json.loads((HERE / "events.json").read_text())
PENTA = [0, 2, 4, 7, 9]
def penta(step, base=60):
    o, k = divmod(step, 5); return base + 12 * o + PENTA[k]
ROW_OF = []
for r in range(ROWS):
    ROW_OF += [r] * (r + 2)

def pluck(midi, vol, dur=0.6):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.22) + 0.35 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t / 0.04) + 0.12 * np.sin(2 * np.pi * f * 6.1 * t) * np.exp(-t / 0.015)
    return x * vol * np.clip(t / 0.0015, 0, 1)
def tock(midi, vol):
    n = int(0.12 * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.03) + 0.3 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t / 0.01)) * vol
def harp(midi, vol=0.08, dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.3)) * vol * np.exp(-t / 0.6) * np.clip(t / 0.002, 0, 1)
def click(vol):
    n = int(0.025 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (2800 + 900 * rng.random()) * t) * np.exp(-t / 0.004)) * vol
def clunk(vol=0.4):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.12) + lp(noise(0.5, 1.0, 0.05, rate=44100, seed=3)[:n], 1500) * 0.4) * vol
def whoosh(dur, vol):
    n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
    return lp(hp(noise(dur, 1.0, dur, rate=44100, seed=9)[:n], 300), 2500) * vol * np.sin(np.pi * k) ** 2

S = StereoSong(120, int(round(D / BAR)))
hits = EV["hits"]; ht = np.array([h[0] for h in hits])
for (t, p, sp) in hits:
    if t >= OPEN: continue
    dens = np.sum(np.abs(ht - t) < 0.03); g = 1.0 / np.sqrt(dens)
    r = ROW_OF[p]; px = PEGS[p][0]
    step = (ROWS - 1 - r) + int(round((px - CX) / 56.0))          # top rows high, a step left/right by column
    S.add(pluck(penta(step, 60), 0.085 * g * min(1.0, sp / 300)), t, (px - CX) / 420 * 0.7, "plucks")
lt = np.array([l[0] for l in EV["lands"]])
for (t, b) in EV["lands"]:
    if t >= OPEN: continue
    dens = np.sum(np.abs(lt - t) < 0.05)
    S.add(tock(penta(b // 2, 43), 0.06 / np.sqrt(dens)), t, (b - (NB - 1) / 2) / NB, "tocks")
CH = [[48, 52, 55, 59], [45, 48, 52, 57], [41, 45, 48, 52], [43, 47, 50, 55]]
WAVE = 2 * BAR
for w in range(int(OPEN / WAVE) + 1):
    t0 = w * WAVE
    if t0 >= OPEN: break
    S.add(pad([m + 12 for m in CH[w % 4]], min(WAVE, OPEN - t0 + 1.0), 0.012 + 0.002 * w), t0, 0.1, "pads")
kicks = []
for b in range(4, int(REVEAL / BAR)):
    for q in range(4):
        t = b * BAR + q * BEAT
        S.add(tkick(0.35 + 0.04 * b), t, 0, "drums"); kicks.append(t)
        if b >= 10 and q % 2 == 1: S.add(clap(0.12, seed=b + q), t, 0, "drums")
        if b >= 7: S.add(hat(0.018, seed=b * 4 + q), t + BEAT / 2, 0.3, "drums")
S.add(riser(2 * BAR, 0.06, seed=4), REVEAL - 2 * BAR)
S.add(impact(0.45), REVEAL, 0, "fx"); S.add(pad([60, 64, 67, 72, 76], 4.0, 0.03), REVEAL, 0, "fx")
for k in range(15):
    S.add(harp(penta(k, 60), 0.07), REVEAL + k * (1.1 / 15), -0.7 + 1.4 * k / 14, "fx")
S.add(clunk(0.4), OPEN, 0, "fx"); S.add(whoosh(1.4, 0.12), OPEN + 0.1, 0, "fx")
for k in range(380):
    S.add(click(0.05 * (1 - k / 380) ** 0.5), OPEN + 0.15 + 0.9 * (k / 380) ** 1.6, rng.uniform(-0.8, 0.8), "plucks")
S.sidechain("pads", kicks, 0.35)
S.reverb("plucks", 0.3, 1.8, 21); S.reverb("pads", 0.4, 2.6, 41); S.reverb("fx", 0.3, 2.0, 31); S.reverb("tocks", 0.1, 0.6, 51); S.reverb("drums", 0.08, 0.8, 61)
S.save(HERE / "music.wav", gains={"plucks": 1.0, "tocks": 0.9, "pads": 0.9, "drums": 0.8, "fx": 1.0})
print("sound", D)
