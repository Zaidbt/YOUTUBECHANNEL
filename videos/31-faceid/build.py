"""Video 031 · How Face ID works — same format as 030 (real-life hook, HUD, notification step cards, pinned callouts).
38.7 s seamless loop, 124 BPM minimal tech house in A minor (20 bars, 1.935 s each). Every dot burst is a 16th tick,
the flood light is a pad swell, MATCH is a chord chime, DENIED is a two-note error buzz.
Facts (Apple Face ID security guide): flood illuminator (infrared, works in the dark), dot projector (>30,000 invisible
IR dots), IR camera reads how the dots land → depth map; the Neural Engine turns it into a mathematical representation
compared with the enrolled one inside the Secure Enclave (never leaves the phone); a flat photo has no depth;
false match ≈ 1 in 1,000,000 (Touch ID ≈ 1 in 50,000).
Timeline (bars): 0-2 hook (scan → unlock) · 2-2.5 switch to infrared view · 2.5-5 ① flood light · 5-8 ② 30,000 dots ·
8-11 ③ depth map · 11-14 ④ maths + Secure Enclave → MATCH · 14-16.5 ⑤ a photo → no depth → DENIED ·
16.5-18 ⑥ 1 in 1,000,000 · 18-20 hook (relock, scan).
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(31)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 124, 20
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
L = [bb(x) for x in (0, 2, 2.5, 5, 8, 11, 14, 16.5, 18, 20)]
UNLOCK = [bt(0, 12)]; RELOCK = bt(18, 0)
DOTS = [bt(5, s) for s in range(4, 16)] + [bt(6, s) for s in range(0, 16, 2)]    # dot bursts (counter climbs)
MATCH = bt(13, 0); DENIED = bt(15, 8)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "l": L, "unlock": UNLOCK, "relock": RELOCK, "dots": DOTS, "match": MATCH, "denied": DENIED}
(ROOT / "remotion/src/videos/faceid/faceid.json").write_text(json.dumps(ev))

def ohat(vol=0.05, seed=0):
    return lp(hp(noise(0.12, 1.0, 0.09, rate=44100, seed=seed), 6000), 12000) * vol
def bassn(midi, dur, vol=0.3):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi); ph = f * t
    x = np.sin(2 * np.pi * ph) + 0.4 * np.sin(4 * np.pi * ph) * np.exp(-t / 0.05) + 0.2 * (2 * (ph % 1) - 1)
    return lp(x, 900) * vol * np.clip(t / 0.003, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)
def stab(notes, dur, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.006, 0.006): ph = hz(m) * (1 + d) * t; x += 2 * (ph % 1) - 1
    return lp(x, 2200) / len(notes) * vol * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.18)
def chime(notes, vol=0.12):
    out = np.zeros(int(1.2 * SR))
    for m in notes: out += marimba(m, vol / len(notes) * 2, 1.2); b = blip(m + 12, vol * 0.3, 0.6); out[:len(b)] += b
    return out
def err(vol=0.18):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = np.where(t < 0.2, hz(46), hz(45)); x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    return lp(x, 1500) * vol * (np.clip((0.19 - t) / 0.01, 0, 1) + np.clip((t - 0.25) / 0.01, 0, 1) * np.clip((0.48 - t) / 0.02, 0, 1))

S = StereoSong(BPM, BARS)
# A minor: Am9 - Fmaj7 - C/G - Em7
CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [55, 60, 64, 67], [52, 55, 59, 62]]; RT = [33, 29, 31, 28]
RIFF = [(0, 76), (3, 74), (6, 72), (8, 69), (10, 72), (14, 71)]
BL = [0, None, 12, 0, None, 0, 12, None, 0, None, 12, 0, None, 7, 12, None]
def light(b): return 2 <= b < 5 or 14 <= b < 16.5
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; lt = light(bar)
    for s in range(16):
        t = bt(bar, s)
        if s % 4 == 0 and not (lt and s == 12 and bar % 2): S.add(tkick(0.8), t, 0, "drums"); kicks.append(t)
        if s % 4 == 2: S.add(ohat(0.045, seed=bar * 16 + s), t, 0.25, "drums")
        if s in (4, 12) and not lt: S.add(clap(0.2, seed=bar + s), t, -0.05, "drums")
        if s % 2 == 1: S.add(hat(0.018, seed=500 + bar * 16 + s), t, -0.3, "drums")
        if BL[s] is not None and not (lt and s < 8): S.add(bassn(r + BL[s], S16 * 0.9, 0.3), t, 0, "bass")
    for s in (2, 7, 10):
        S.add(stab(ch, S16 * 1.5, 0.05 if not lt else 0.035), bt(bar, s), -0.25 if s == 7 else 0.25, "keys")
    S.add(pad([m + 12 for m in ch[:3]], BAR, 0.012 if not lt else 0.022), bt(bar), 0.15, "pads")
    if not lt:
        for s, m in RIFF: S.add(chop(m, S16 * 1.8, "ao"[s % 2], 0.22), bt(bar, s), 0.1, "chop")
# events = notes
for i, t in enumerate(DOTS): S.add(blip([69, 72, 76, 79][i % 4] + 12, 0.07, 0.2), t, (-0.5, 0.5)[i % 2], "fx")
for t in UNLOCK: S.add(chime([76, 81], 0.12), t, 0, "fx")
S.add(chime([69, 72, 76, 81], 0.16), MATCH, 0, "fx"); S.add(err(0.16), DENIED, 0, "fx")
S.add(riser(BAR / 2, 0.05, seed=3), L[1]); S.add(impact(0.3), L[2], 0, "fx"); S.add(impact(0.3), L[7], 0, "fx")
S.add(pad([57, 64, 69, 76], BAR * 2.2, 0.02), L[2], 0, "pads")                   # flood light swell
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("fx", BEAT * 0.5, fb=0.25, mix=0.15)
S.sidechain("bass", kicks, 0.3); S.sidechain("pads", kicks, 0.5); S.sidechain("keys", kicks, 0.3)
S.reverb("chop", 0.25, 1.6, 21); S.reverb("keys", 0.2, 1.4, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.25, 1.4, 61)
S.save(ROOT / "public/videos/31-faceid/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.9, "pads": 0.8, "chop": 0.95, "fx": 1.0})
print(f"faceid: {DUR:.3f} s")
