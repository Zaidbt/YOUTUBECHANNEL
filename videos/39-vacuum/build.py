"""Video 039 · How does a cordless vacuum work? — in the @engineeredwithin1 explainer format (real-life hook, speed
HUD + RPM counter, one question per step, cutaway toy-coloured parts, ×4 speed-up back to real speed).
34.8 s loop, 124 BPM clean filter house in C minor (18 bars). THE MOTOR SINGS: 125,000 rpm = 2,083 Hz ≈ C7; every ×4
slow-down drops it two octaves (C5, C3, C1, then a thump per turn), so the speed-up at the end is a C riser.
Facts (Dyson, manufacturer figures, "up to"): motor up to 125,000 rpm; 14 cyclones; up to 79,000 g on the dust.
Timeline (bars): 0-2 hook · 2-3 slow down ×1024 · 3-5.5 ① what sucks? (impeller) · 5.5-8.5 ② where does the dust go?
(cyclones) · 8.5-10.5 ③ why no bag? (filter, clean air) · 10.5-12.5 ④ what feeds it? (battery + trigger) ·
12.5-15 speed-up 1024→256→64→16→4→1 · 15-16 real speed, all together · 16-18 hook.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(39)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 124, 18
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, s=0: round(bar * BAR + s * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
RPM = 125000; F0 = RPM / 60
L = [bb(x) for x in (0, 2, 3, 5.5, 8.5, 10.5, 12.5, 15, 16, 18)]
STEPS = [(bb(12.5), 1024), (bb(13.0), 256), (bb(13.5), 64), (bb(14.0), 16), (bb(14.5), 4), (bb(15.0), 1)]
SPEED = [(L[0], L[1], 1, 1), (L[1], L[2], 1, 1024), (L[2], L[6], 1024, 1024)] + \
        [(STEPS[i][0], STEPS[i + 1][0], STEPS[i][1], STEPS[i][1]) for i in range(5)] + [(STEPS[5][0], DUR, 1, 1)]
DELTA = 0.75 * BEAT                                                   # one cereal ring reaches the head every 3/4 beat
POPS = [round(j * DELTA, 5) for j in range(int(DUR / DELTA)) if j * DELTA < bt(2) or j * DELTA >= bt(16)]
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "rpm": RPM, "l": L, "speed": SPEED, "steps": STEPS, "pops": POPS, "delta": DELTA}
(ROOT / "remotion/src/videos/vacuum/vacuum.json").write_text(json.dumps(ev))

def whine(f, dur, vol):
    n = int(dur * SR); t = np.arange(n) / SR
    if f < 20:
        ph = (f * t) % 1; x = np.exp(-ph / 0.08) * np.sin(2 * np.pi * 55 * t)
    else:
        x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * f * 0.5 * t)
        x = x + 0.12 * lp(hp(noise(dur, 1.0, dur, rate=44100, seed=int(f))[:n], 1500), 6000)
    return x * vol * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)
def air(dur, vol, cut=1800):
    n = int(dur * SR); t = np.arange(n) / SR
    return lp(hp(noise(dur, 1.0, dur, rate=44100, seed=7)[:n], 200), cut) * vol * np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.1, 0, 1)
def fstab(notes, dur, vol, cut):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.007, 0.007): ph = hz(m) * (1 + d) * t; x += 2 * (ph % 1) - 1
    return lp(x, cut) / len(notes) * vol * np.clip(t / 0.005, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
def bass(midi, dur, vol=0.3):
    n = int(dur * SR); t = np.arange(n) / SR; ph = hz(midi) * t
    return lp(np.sin(2 * np.pi * ph) + 0.4 * (2 * (ph % 1) - 1), 700) * vol * np.clip(t / 0.004, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)
def pop(vol=0.12):
    n = int(0.06 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(900 + 1400 * t / 0.06) / SR) * np.exp(-t / 0.02) * vol

S = StereoSong(BPM, BARS)
CH = [[60, 63, 67, 70], [56, 60, 63, 67], [58, 62, 65, 68], [55, 58, 62, 65]]; RT = [36, 32, 34, 31]
def light(b): return 3 <= b < 12.5
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; lt = light(bar)
    # the filter sweeps open over each 4 bars (the "suction"), closed during the slow explanations
    cut = (900 + 2600 * ((bar % 4) / 3)) if not lt else 1100 + 300 * (bar % 2)
    for s in range(16):
        t = bt(bar, s)
        if s % 4 == 0: S.add(tkick(0.8 if not lt else 0.6), t, 0, "drums"); kicks.append(t)
        if s % 4 == 2: S.add(hat(0.035 if not lt else 0.022, seed=bar * 16 + s, long=True), t, 0.25, "drums")
        if s in (4, 12) and not lt: S.add(clap(0.18, seed=bar + s), t, -0.05, "drums")
        if s % 2 == 1 and not lt: S.add(hat(0.015, seed=500 + bar * 16 + s), t, -0.3, "drums")
    for s in (2, 6, 10, 14): S.add(fstab(ch, S16 * 1.6, 0.06, cut), bt(bar, s), -0.2 if s % 4 == 2 else 0.2, "keys")
    for s, d in ((0, 0), (3, 12), (6, 0), (8, 0), (11, 12), (14, 10)): S.add(bass(r + 12 + d, S16 * 1.5, 0.28), bt(bar, s), 0, "bass")
    S.add(pad([m + 12 for m in ch[:3]], BAR, 0.011), bt(bar), 0.1, "pads")
    if not lt:
        for s, m in ((0, 79), (3, 75), (6, 72), (10, 75), (12, 77), (14, 75)): S.add(chop(m, S16 * 1.6, "ao"[s % 2], 0.17), bt(bar, s), 0.1, "chop")
# the motor sings: whine at F0 / slow
for (a, c, s0, s1) in SPEED:
    if s0 == s1: S.add(whine(F0 / s0, c - a, 0.035 if s0 == 1 else 0.06), a, 0, "motor")
S.add(whine(F0, 0.6, 0.03), L[1], 0, "motor")                       # whine dies down while we slow
for t in POPS: S.add(pop(0.12), t, rng.uniform(-0.3, 0.3), "fx")
S.add(air(L[4] - L[3], 0.05, 2500), L[3], 0, "fx")                   # cyclone whoosh
S.add(riser(BAR * 2.5, 0.05, seed=4), L[6]); S.add(impact(0.3), L[7], 0, "fx"); S.add(impact(0.22), L[2], 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.2)
S.sidechain("bass", kicks, 0.35); S.sidechain("pads", kicks, 0.5); S.sidechain("keys", kicks, 0.45)
S.reverb("chop", 0.25, 1.6, 21); S.reverb("keys", 0.18, 1.4, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.06, 0.8, 51); S.reverb("fx", 0.2, 1.2, 61)
S.save(ROOT / "public/videos/39-vacuum/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "pads": 0.8, "chop": 0.85, "motor": 1.0, "fx": 1.0})
print(f"vacuum: {DUR:.3f} s")
