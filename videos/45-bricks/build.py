"""Sound for video 045: every brick that breaks = a bright pluck note at the exact time (C major pentatonic, column
→ step, row → octave: top of the heart high), density-normalised into a sparkle; 132 BPM bubbly pop bed (soft kick,
claps, plucky bass, sparkle arps) that grows with the number of balls; '100 BALLS' / '300 BALLS' / 'LAST 5' hits;
CLEAR = big chord + fanfare; the rebuild = a rising glissando; quiet seam. 43.6 s loop."""
import json, sys
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "scripts")); sys.path.insert(0, str(HERE))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
from sim import D, BAR, BEAT, LAUNCH, ROWS, COLS  # noqa: E402
import pickle
rng = np.random.default_rng(45)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])
EV = json.loads((HERE / "events.json").read_text()); META = json.loads((HERE / "meta.json").read_text()); CLEAR = META["clear"]
frames = pickle.load(open(HERE / "sim.pkl", "rb"))
first = lambda n: next((i / 60 for i in range(len(frames)) if len(frames[i][0]) >= n), None)
T100, T300 = first(100), first(300)
T5 = next((i / 60 for i in range(len(frames)) if i / 60 > LAUNCH and int((frames[i][2] > 0).sum()) <= 5), None)
PENTA = [0, 2, 4, 7, 9]
def penta(step, base=72): o, k = divmod(step, 5); return base + 12 * o + PENTA[k]
def pluck(midi, vol, dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t + 1.2 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.05))
    return x * vol * np.clip(t / 0.0015, 0, 1) * np.exp(-t / 0.16)
def bass(midi, dur, vol=0.25):
    n = int(dur * SR); t = np.arange(n) / SR; ph = hz(midi) * t
    return lp(np.sin(2 * np.pi * ph) + 0.3 * (2 * (ph % 1) - 1), 700) * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.3) * np.clip((dur - t) / 0.02, 0, 1)
def brass(notes, dur, vol=0.1):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: ph = hz(m) * t; x += 2 * (ph % 1) - 1
    return lp(x, 2800) / len(notes) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
S = StereoSong(132, int(round(D / BAR)))
et = np.array([e[0] for e in EV])
for (t, r, c) in EV:
    dens = np.sum(np.abs(et - t) < 0.03); g = 1 / np.sqrt(dens)
    S.add(pluck(penta(c // 3 + (ROWS - r) // 6 * 2, 67), 0.09 * g), t, (c - COLS / 2) / COLS * 1.2, "notes")
CH = [[65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]]; RT = [41, 38, 34, 36]
kicks = []; END = (CLEAR or D) + 1.0
for bar in range(int(D / BAR)):
    ch, r = CH[bar % 4], RT[bar % 4]; t0 = bar * BAR
    lvl = 0 if t0 < LAUNCH else (1 if t0 < (T100 or 99) else 2)
    if t0 >= END: lvl = 0
    for q in range(16):
        t = t0 + q * BEAT / 4
        if lvl >= 1 and q % 4 == 0: S.add(tkick(0.6 + 0.15 * (lvl - 1)), t, 0, "drums"); kicks.append(t)
        if lvl >= 1 and q in (4, 12): S.add(clap(0.15, seed=bar + q), t, 0, "drums")
        if lvl >= 2 and q % 2 == 1: S.add(hat(0.018, seed=bar * 16 + q), t, 0.3, "drums")
        if lvl >= 1 and q in (0, 3, 6, 10): S.add(bass(r + (12 if q == 6 else 0), BEAT / 4 * 1.8), t, 0, "bass")
        if lvl >= 2 and q % 2 == 0: S.add(pluck(ch[(q // 2) % 3] + 12, 0.035, 0.25), t, (-0.4, 0.4)[(q // 2) % 2], "keys")
    S.add(pad([m for m in ch], BAR, 0.012 + 0.004 * lvl), t0, 0.1, "pads")
for tb in (T100, T300, T5):
    if tb: S.add(brass([72, 76, 79], BEAT * 0.8, 0.1), tb, 0, "fx"); S.add(impact(0.22), tb, 0, "fx")
S.add(pluck(91, 0.12, 0.6), LAUNCH, 0, "fx")
if CLEAR:
    S.add(impact(0.45), CLEAR, 0, "fx")
    for k, m in enumerate((72, 76, 79, 84)): S.add(brass([m, m - 12], BEAT * (0.5 if k < 3 else 1.6), 0.12), CLEAR + k * BEAT / 2, 0, "fx")
    R0 = CLEAR + 1.8
    for k in range(ROWS): S.add(pluck(penta(k, 60), 0.05, 0.3), R0 + (ROWS - 1 - k) * 0.06, 0, "fx")
S.sidechain("pads", kicks, 0.4); S.sidechain("bass", kicks, 0.2)
S.reverb("notes", 0.28, 1.6, 21); S.reverb("fx", 0.22, 1.4, 31); S.reverb("pads", 0.4, 2.4, 41); S.reverb("keys", 0.25, 1.4, 51); S.reverb("drums", 0.06, 0.8, 61)
S.save(HERE / "music.wav", gains={"notes": 1.0, "fx": 1.0, "bass": 1.0, "drums": 1.0, "keys": 0.8, "pads": 0.85})
print("sound", D)
