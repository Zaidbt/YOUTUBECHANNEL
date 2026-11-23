"""Video 041 · How does an electric toothbrush work? (capability test in the engineeredwithin1 format, own models/text).
32.7 s loop, 110 BPM boogie funk in E minor (15 bars). In slow motion every swing of the head is a note (LEFT = low,
RIGHT = high); the speed-up doubles the swing rate each step until it becomes the motor's buzz.
Facts: oscillating-rotating brushes swing ~8,800 times a minute (~150/s, varies by model, retailer specs); the head
does not spin, it swings back and forth; a small DC motor spins, a gear + crank turn that rotation into a back-and-
forth twist carried up a shaft to the head; a rechargeable cell + a switch feed the motor; it charges with no metal
contacts: a coil in the base makes a changing magnetic field that induces current in a coil inside the handle.
Timeline (bars): 0-1.5 hook · 1.5-2.5 slow down (LEFT! RIGHT!) · 2.5-5 ① what swings it? · 5-7 ② inside the motor ·
7-9.5 ③ what feeds it? · 9.5-11 ④ how does it charge? · 11-13.5 speed-up ×2 steps · 13.5-15 hook.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(41)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 110, 15
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, s=0: round(bar * BAR + s * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
OSC = 8800                                                    # swings a minute (real)
L = [bb(x) for x in (0, 1.5, 2.5, 5, 7, 9.5, 11, 13.5, 15)]
# slow factor: chosen so in slow motion one swing (LEFT→RIGHT) = one beat: 8800/min / 64 = 137.5/min ≈ 1.25 beats... use 64x
FACT = [64, 32, 16, 8, 4, 2, 1]
STEPS = [(bb(11 + 0.375 * i), f) for i, f in enumerate(FACT)]
SPEED = [(L[0], L[1], 1, 1), (L[1], L[2], 1, 64), (L[2], STEPS[0][0], 64, 64)] + [(STEPS[i][0], STEPS[i + 1][0], STEPS[i][1], STEPS[i][1]) for i in range(6)] + [(STEPS[6][0], DUR, 1, 1)]
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "osc": OSC, "l": L, "speed": SPEED, "steps": STEPS}
(ROOT / "remotion/src/videos/toothbrush2/toothbrush.json").write_text(json.dumps(ev))

def clav(midi, dur, vol=0.06):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi); ph = f * t
    x = (2 * (ph % 1) - 1) * 0.5 + np.sign(np.sin(2 * np.pi * ph)) * 0.3
    return lp(x, 2400) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.12)
def synbass(midi, dur, vol=0.3):
    n = int(dur * SR); t = np.arange(n) / SR; ph = hz(midi) * t
    x = np.sin(2 * np.pi * ph) + 0.6 * (2 * (ph % 1) - 1)
    cut = 500 + 1800 * np.exp(-t / 0.06)
    y = np.zeros(n); s = 0.0
    for i in range(n): a = np.exp(-2 * np.pi * cut[i] / SR); s = (1 - a) * x[i] + a * s; y[i] = s
    return y * vol * np.clip(t / 0.003, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)
def strings(notes, dur, vol=0.03):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.005, 0.005): ph = hz(m) * (1 + d) * t; x += 2 * (ph % 1) - 1
    return lp(x, 3000) / len(notes) * vol * np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.1, 0, 1)
def buzz(f, dur, vol):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sign(np.sin(2 * np.pi * f * t))
    return lp(x, 3000) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.01, 0, 1)

S = StereoSong(BPM, BARS)
CH = [[64, 67, 71, 74], [60, 64, 67, 71], [62, 66, 69, 72], [59, 62, 66, 69]]; RT = [40, 36, 38, 35]
def light(b): return 2.5 <= b < 11
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; lt = light(bar)
    for s in range(16):
        t = bt(bar, s) + (S16 * 0.1 if s % 2 else 0)
        if s % 4 == 0: S.add(tkick(0.75 if not lt else 0.55), t, 0, "drums"); kicks.append(t)
        if s in (4, 12): S.add(clap(0.2 if not lt else 0.13, seed=bar + s), t, 0, "drums")
        if s % 2 == 0: S.add(hat(0.028 if not lt else 0.018, seed=bar * 16 + s, long=s % 4 == 2), t, 0.3, "drums")
    for s, d in ((0, 0), (3, 12), (6, 7), (8, 0), (10, 12), (11, 10), (14, 7)): S.add(synbass(r + 12 + d, S16 * 1.5, 0.26), bt(bar, s), 0, "bass")
    for s in (2, 6, 10, 14): S.add(clav(ch[(s // 4) % 4] + 12, S16, 0.06), bt(bar, s) + S16 * 0.1, 0.25, "keys")
    S.add(strings([m + 12 for m in ch[:3]], BAR, 0.02 if lt else 0.03), bt(bar), -0.2, "pads")
    if not lt:
        for s, m in ((0, 76), (3, 79), (6, 76), (8, 74), (11, 71), (14, 74)): S.add(chop(m, S16 * 1.6, "ao"[s % 2], 0.18), bt(bar, s), 0.1, "chop")
# the swings ARE the notes in slow motion (64x: ~2.3 swings/s → we mark every swing on the 8th grid)
for bar in range(3, 11):
    for s in range(0, 16, 2):
        S.add(marimba(64 if (s // 2) % 2 == 0 else 71, 0.09, 0.3), bt(bar, s), (-0.4, 0.4)[(s // 2) % 2], "fx")
# speed-up: the buzz doubles each step (octave riser), real speed = a high buzz
for i, (t0, f) in enumerate(STEPS):
    t1 = STEPS[i + 1][0] if i < 6 else L[7]
    S.add(buzz(OSC / 60 / f * 2, t1 - t0, 0.05 + 0.005 * i), t0, 0, "fx")
for t in (bt(0, 0), bt(13, 8)): S.add(buzz(OSC / 60 * 2, BAR * 1.5, 0.03), t, 0, "fx")
S.add(riser(BAR / 2, 0.04, seed=3), L[1]); S.add(impact(0.22), L[2], 0, "fx"); S.add(impact(0.25), L[7], 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("fx", BEAT * 0.5, fb=0.2, mix=0.1)
S.sidechain("bass", kicks, 0.2); S.sidechain("pads", kicks, 0.4); S.sidechain("keys", kicks, 0.2)
S.reverb("chop", 0.25, 1.6, 21); S.reverb("keys", 0.15, 1.2, 31); S.reverb("pads", 0.35, 2.2, 41); S.reverb("drums", 0.07, 0.8, 51); S.reverb("fx", 0.2, 1.2, 61)
S.save(ROOT / "public/videos/41-toothbrush/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.9, "pads": 0.8, "chop": 0.85, "fx": 1.0})
print(f"toothbrush: {DUR:.3f} s")
