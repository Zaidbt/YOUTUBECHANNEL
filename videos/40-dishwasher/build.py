"""Video 040 · How does a dishwasher work? — the @engineeredwithin1 format in the CelPixel look.
33.6 s loop, 100 BPM city pop in F major (14 bars): Rhodes, slap bass, bright brass stabs, a whistle hook.
The machine plays along: every jet sweep is a shaker, the pump is a low hum, PSSHH hits on the jets.
Facts: the spray arm has no motor of its own — the angled water jets push it round (reaction, like a lawn sprinkler;
patents); a pump recirculates the same water, through a filter, again and again; a heater warms it (programmes
~45-70 °C) and enzymes in the detergent break down starch/protein; rinse aid lowers the water's surface tension so it
runs off in a sheet instead of drying as spots; ~13 L for a 14-place load (Which? tests) vs ~100 L by hand on
average (University of Bonn study, range 33-440 L).
Timeline (bars): 0-2 hook · 2-2.5 dive (4x slower) · 2.5-5 ① what spins the arm? · 5-7.5 ② where does the water
come from? · 7.5-10 ③ what cleans the gunk? · 10-12 ④ why no spots? · 12-14 hook.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(40)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 100, 14
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, s=0: round(bar * BAR + s * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
L = [bb(x) for x in (0, 2, 2.5, 5, 7.5, 10, 12, 14)]
SPEED = [(L[0], L[1], 1, 1), (L[1], L[2], 1, 4), (L[2], L[6] - BAR / 2, 4, 4), (L[6] - BAR / 2, L[6], 4, 1), (L[6], DUR, 1, 1)]
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "l": L, "speed": SPEED}
(ROOT / "remotion/src/videos/dishwasher/dishwasher.json").write_text(json.dumps(ev))

def rhodes(notes, dur, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += np.sin(2 * np.pi * f * t + 1.1 * np.exp(-t / 0.3) * np.sin(2 * np.pi * f * t)) * (1 + 0.18 * np.sin(2 * np.pi * 4.6 * t))
    return x / len(notes) * vol * 3 * np.clip(t / 0.004, 0, 1) * np.exp(-t / 1.4) * np.clip((dur - t) / 0.06, 0, 1)
def slap(midi, dur, vol=0.3):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi); ph = f * t
    x = np.sin(2 * np.pi * ph) + 0.5 * np.sin(4 * np.pi * ph) * np.exp(-t / 0.05) + 0.25 * np.sin(6 * np.pi * ph) * np.exp(-t / 0.02)
    return lp(x, 1600) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.35) * np.clip((dur - t) / 0.02, 0, 1)
def brass(notes, dur, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        ph = hz(m) * t * (1 + 0.003 * np.sin(2 * np.pi * 5 * t)); x += 2 * (ph % 1) - 1
    return lp(x, 2600) / len(notes) * vol * np.clip(t / 0.015, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
def whistle(midi, dur, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.15, 0, 1))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.05 * hp(noise(dur, 1.0, dur, rate=44100, seed=midi)[:n], 4000)) * vol * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.04, 0, 1)
def shaker(vol, seed):
    return lp(hp(noise(0.07, 1.0, 0.05, rate=44100, seed=seed), 4000), 10000) * vol
def psh(dur=0.35, vol=0.1):
    n = int(dur * SR); t = np.arange(n) / SR
    return lp(hp(noise(dur, 1.0, dur, rate=44100, seed=12)[:n], 1200), 7000) * np.exp(-t / 0.12) * vol
def hum(dur, vol=0.04):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 43.65 * t) + 0.5 * np.sin(2 * np.pi * 87.3 * t)) * vol * np.clip(t / 0.2, 0, 1) * np.clip((dur - t) / 0.2, 0, 1)

S = StereoSong(BPM, BARS)
CH = [[65, 69, 72, 76], [62, 65, 69, 72], [58, 62, 65, 69], [60, 64, 67, 70]]; RT = [41, 38, 34, 36]     # Fmaj7 Dm7 Bbmaj7 C7
HOOK = [(0, 81), (2, 79), (3, 77), (6, 76), (8, 77), (10, 79), (12, 81), (14, 84)]
BASS = [(0, 0), (3, 12), (6, 0), (7, 10), (10, 12), (12, 7), (14, 0)]
def inside(b): return 2.5 <= b < 12
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; ins = inside(bar)
    for s in range(16):
        t = bt(bar, s) + (S16 * 0.12 if s % 2 else 0)
        if s in (0, 8) or (s == 10 and not ins): S.add(tkick(0.75 if not ins else 0.55), t, 0, "drums"); kicks.append(t)
        if s in (4, 12): S.add(snare(0.2 if not ins else 0.14, seed=bar + s), t, 0.05, "drums")
        S.add(shaker(0.022 if s % 2 else 0.032, seed=200 + bar * 16 + s), t, 0.35 if s % 2 else -0.35, "drums")
    for s, d in BASS: S.add(slap(r + d, S16 * 1.6, 0.26), bt(bar, s), 0, "bass")
    S.add(rhodes(ch, BAR * 0.95, 0.05), bt(bar), -0.2, "keys"); S.add(rhodes(ch[1:], S16 * 3, 0.03), bt(bar, 10), 0.2, "keys")
    if not ins and bar % 2 == 1: S.add(brass([m + 12 for m in ch[:3]], S16 * 2, 0.07), bt(bar, 14), 0, "brass")
    if not ins or bar % 2 == 0:
        for s, m in HOOK: S.add(whistle(m, S16 * 1.7, 0.06 if not ins else 0.045), bt(bar, s), 0.15, "lead")
S.add(hum(L[6] - L[2], 0.035), L[2], 0, "fx")
for k in range(int((L[6] - L[2]) / (2 * BEAT))): S.add(psh(0.3, 0.06), L[2] + k * 2 * BEAT, (-0.4, 0.4)[k % 2], "fx")
for t in (bt(0, 0), bt(1, 0), bt(12, 0), bt(13, 0)): S.add(psh(0.5, 0.09), t, 0, "fx")
S.add(riser(BAR / 2, 0.04, seed=3), L[1]); S.add(impact(0.22), L[2], 0, "fx"); S.add(impact(0.2), L[6], 0, "fx")
S.delay("lead", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("keys", BEAT * 0.5, fb=0.2, mix=0.1)
S.sidechain("bass", kicks, 0.15); S.sidechain("keys", kicks, 0.15)
S.reverb("lead", 0.25, 1.6, 21); S.reverb("keys", 0.25, 1.6, 31); S.reverb("brass", 0.2, 1.4, 41); S.reverb("drums", 0.07, 0.8, 51); S.reverb("fx", 0.2, 1.2, 61)
S.save(ROOT / "public/videos/40-dishwasher/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "brass": 0.9, "lead": 0.9, "fx": 1.0})
print(f"dishwasher: {DUR:.3f} s")
