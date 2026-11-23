"""Music for video 038 from the simulation's own events (events.json): every split is a kalimba note quantised to
the 16th grid (sparse single plinks at the start → a continuous arpeggio when the arena fills); the chord changes
with every colour wave (2 bars); layers enter as the count grows; FULL = impact + big chord; burst = whoosh; quiet
reset so the loop flows. 120 BPM, 22 bars = 44 s, A minor-ish (Am F C G Em F Dm E, ...)."""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]; HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(38)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

EV = json.loads((HERE / "events.json").read_text())
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4; BARS = 22
bt = lambda bar, s=0: bar * BAR + s * S16

def kalimba(midi, vol=0.12, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55) + 0.35 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.05) + 0.15 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.2)
    return x * vol * np.clip(t / 0.002, 0, 1)
def glass(midi, vol=0.06, dur=2.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.4)) * vol * np.exp(-t / 0.9) * np.clip(t / 0.003, 0, 1)
def piano(notes, dur, vol=0.045):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.4) + 0.1 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.15)
    return x / len(notes) * vol * 3 * np.clip(t / 0.004, 0, 1) * np.exp(-t / 1.6) * np.clip((dur - t) / 0.1, 0, 1)
def sub(midi, dur, vol=0.28):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * hz(midi) * t) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
def whoosh(dur, vol=0.12):
    n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
    nz = noise(dur, 1.0, dur, rate=44100, seed=9)[:n]
    return reson(nz, 600, 1.5) * 0 + lp(hp(nz, 400), 3000) * vol * np.sin(np.pi * k) ** 2

PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [52, 55, 59], [53, 57, 60], [50, 53, 57], [52, 56, 59], [57, 60, 64], [53, 57, 62]]
ROOTS = [33, 29, 36, 31, 28, 29, 26, 28, 33, 29]
S = StereoSong(BPM, BARS)
kicks = []
for bar in range(BARS):
    w = min(9, bar // 2); ch = PROG[w]; r = ROOTS[w]
    lvl = 0 if bar < 6 else 1 if bar < 10 else 2 if bar < 14 else 3 if bar < 20 else (4 if bar < 21 else 5)
    if bar < 20:
        if bar % 2 == 0: S.add(piano([m + 12 for m in ch], BAR * 2, 0.04 + 0.006 * lvl), bt(bar), -0.15, "keys")
        S.add(pad([m + 12 for m in ch], BAR, 0.012 + 0.002 * lvl), bt(bar), 0.15, "pads")
    for s in range(16):
        t = bt(bar, s)
        if lvl >= 1 and lvl <= 4 and s % 4 == 0: S.add(tkick(0.55 + 0.1 * min(lvl, 3)), t, 0, "drums"); kicks.append(t)
        if lvl >= 1 and lvl <= 4 and s % 4 == 2: S.add(hat(0.02 + 0.006 * lvl, seed=bar * 16 + s), t, 0.3, "drums")
        if lvl >= 3 and lvl <= 4 and s in (4, 12): S.add(clap(0.17, seed=bar + s), t, -0.05, "drums")
        if lvl >= 3 and lvl <= 4 and s % 2 == 1: S.add(hat(0.014, seed=900 + bar * 16 + s), t, -0.3, "drums")
        if lvl == 4 and bar == 19 and s >= 8: S.add(snare(0.08 + 0.015 * (s - 8), seed=s), t, 0, "drums")
    if 2 <= lvl <= 4:
        for s, d in ((0, 0), (6, 0), (8, 12), (11, 0), (14, 7)): S.add(sub(r + 12 + d, S16 * 1.8, 0.24), bt(bar, s), 0, "bass")
# ---- the splits = kalimba notes on the 16th grid (max one per step, chord tones, arpeggiated) ----
used = set(); k = 0
for (t, kind, h, x) in EV["events"]:
    step = int(round(t / S16));
    if step in used or step * S16 >= bt(20): continue
    used.add(step); w = min(9, int(step * S16 / (2 * BAR))); ch = PROG[w]
    pat = [0, 1, 2, 1, 0, 2, 1, 2]; m = ch[pat[k % 8]] + 24 + (12 if (k // 8) % 4 == 3 else 0)
    S.add(kalimba(m, 0.11 if step * S16 < bt(12) else 0.08), step * S16, (x - 540) / 540 * 0.6, "fx"); k += 1
for bar in range(0, 20, 2): S.add(glass(PROG[min(9, bar // 2)][2] + 36, 0.05), bt(bar), 0, "fx")
# ---- FULL → burst → quiet reset ----
FULL = bt(20)
S.add(impact(0.4), FULL, 0, "fx"); S.add(piano([57, 64, 69, 72, 76], BAR * 2, 0.07), FULL, 0, "keys"); S.add(pad([69, 72, 76, 81], BAR * 1.8, 0.03), FULL, 0, "pads")
S.add(riser(BAR, 0.06, seed=4), bt(19)); S.add(whoosh(1.8, 0.14), FULL + 0.9, 0, "fx")
S.add(kalimba(69, 0.1), bt(21, 12), 0.2, "fx")
S.delay("fx", BEAT * 0.75, fb=0.28, mix=0.18)
S.sidechain("pads", kicks, 0.4); S.sidechain("keys", kicks, 0.15); S.sidechain("bass", kicks, 0.15)
S.reverb("fx", 0.3, 1.8, 21); S.reverb("keys", 0.3, 2.0, 31); S.reverb("pads", 0.4, 2.6, 41); S.reverb("drums", 0.08, 0.8, 51)
S.save(HERE / "music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.9, "pads": 0.85, "fx": 1.0})
print("music", BARS * BAR)
