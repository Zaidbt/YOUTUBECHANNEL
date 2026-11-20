"""Video 033 · What happens when you click a pen. Format of 030-032.
38.6 s seamless loop, 112 BPM amapiano in G minor (18 bars): every click is a rim + a log-drum note, the slow-motion
press is a riser and the cam landing is the hit.
Facts (retractable ballpoint, rotating-cam design, e.g. the 1950s Parker Jotter): a spring at the tip pushes the ink
tube up; the button's sawtooth pushes a cam down and, because the teeth are slanted, twists it; on release the cam's
ridges land on the ends of ribs inside the barrel (a stop) → the tip stays out; the next click twists it again so the
ridges line up with channels between the ribs → the spring shoots it back up. Writing: a tiny metal ball (~0.7 mm,
tungsten carbide) rolls ink out like a roll-on deodorant; the ink is thick (oil-based) so it doesn't leak. Ballpoint
patented by László Bíró in 1938.
Timeline (bars): 0-2 hook (pen clicking on a notebook) · 2-2.5 dive (x-ray) · 2.5-4.5 ① a spring holds the ink tube up ·
4.5-7 ② press: the sawtooth pushes + twists the cam · 7-9.5 ③ release: it lands on a stop → tip stays out ·
9.5-12 ④ click again: twists into a channel → tip goes in · 12-14 ⑤ the ball · 14-16 ⑥ thick ink · 16-18 hook.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(33)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 112, 18
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
L = [bb(x) for x in (0, 2, 2.5, 4.5, 7, 9.5, 12, 14, 16, 18)]
FAST = 0.11
# each click: (press start, press end, release start, release end)
CLICKS = [(bt(0, s), bt(0, s) + FAST, bt(0, s) + FAST, bt(0, s) + 2 * FAST) for s in (4, 12)] + \
         [(bt(1, s), bt(1, s) + FAST, bt(1, s) + FAST, bt(1, s) + 2 * FAST) for s in (4, 12)] + \
         [(bb(5.0), bb(6.5), bb(7.5), bb(8.75)), (bb(10.0), bb(10.75), bb(11.0), bb(11.75))] + \
         [(bt(12, 0), bt(12, 0) + FAST, bt(12, 0) + FAST, bt(12, 0) + 2 * FAST), (bt(15, 12), bt(15, 12) + FAST, bt(15, 12) + FAST, bt(15, 12) + 2 * FAST)] + \
         [(bt(b, s), bt(b, s) + FAST, bt(b, s) + FAST, bt(b, s) + 2 * FAST) for b in (16, 17) for s in (4, 12)]
assert len(CLICKS) % 2 == 0
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "l": L, "clicks": CLICKS}
(ROOT / "remotion/src/videos/clickpen/clickpen.json").write_text(json.dumps(ev))

def shaker(vol, seed):
    return lp(hp(noise(0.06, 1.0, 0.04, rate=44100, seed=seed), 5000), 11000) * vol
def piano(notes, dur, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.3) + 0.15 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.1))
    return x / len(notes) * vol * 3 * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.7) * np.clip((dur - t) / 0.05, 0, 1)
def sax(midi, dur, vol=0.08):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.2, 0, 1))
    ph = np.cumsum(f) / SR; x = 2 * (ph % 1) - 1
    y = reson(x, 1200, 3) * 0.8 + reson(x, 2600, 6) * 0.3 + lp(x, 1800) * 0.4
    return y / (np.max(np.abs(y)) + 1e-9) * vol * np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
def pclick(vol=0.3, hi=True):
    n = int(0.05 * SR); t = np.arange(n) / SR; f = 3200 if hi else 2300
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + hp(noise(0.05, 1.0, 0.008, rate=44100, seed=5)[:n], 3500) * 0.7) * vol

S = StereoSong(BPM, BARS)
CH = [[55, 58, 62, 65, 69], [51, 55, 58, 62, 65], [48, 51, 55, 58, 62], [50, 54, 57, 60]]; RT = [31, 27, 24, 26]
LOG = [(0, 0, 3), (3, 0, 2), (6, 7, 2), (8, 0, 2), (10, 12, 2), (11, 10, 1), (14, 7, 2)]
HOOK = [(0, 74), (2, 77), (4, 74), (7, 72), (10, 70), (12, 69), (14, 70)]
def slow(t): return L[3] <= t < L[5]
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; sl = slow(bt(bar, 8))
    for s in range(16):
        t = bt(bar, s)
        if s % 4 == 0 and not (sl and s in (4, 12)): S.add(tkick(0.7), t, 0, "drums"); kicks.append(t)
        if s == 12 and not sl: S.add(clap(0.15, seed=bar), t, -0.1, "drums")
        S.add(shaker(0.022 if s % 2 else 0.036, seed=300 + bar * 16 + s), t + (S16 * 0.12 if s % 2 else 0), 0.35 if s % 2 else -0.35, "drums")
    for s, d, ln in LOG:
        if not sl or s in (0, 8): S.add(logdrum(r + 12 + d, S16 * ln * 1.2, 0.34), bt(bar, s), 0, "bass")
    for s in (0, 6, 10):
        S.add(piano(ch, S16 * (6 if s == 0 else 4), 0.05), bt(bar, s), -0.15, "keys")
    S.add(pad([m + 12 for m in ch[:3]], BAR, 0.012 if not sl else 0.02), bt(bar), 0.15, "pads")
    if not sl:
        for s, m in HOOK: S.add(sax(m, S16 * 1.8, 0.065), bt(bar, s), 0.1, "chop")
# the clicks ARE percussion: press = high click + log-drum note, release = low click
NOTE = [43, 50, 46, 55]
for i, (p0, p1, r0, r1) in enumerate(CLICKS):
    if p1 - p0 > 0.3:
        S.add(riser(p1 - p0, 0.04, seed=i), p0, 0, "fx"); S.add(pclick(0.32), p1, 0, "fx"); S.add(impact(0.25), r1, 0, "fx"); S.add(pclick(0.3, False), r1, 0, "fx")
        S.add(logdrum(NOTE[i % 4] + 12, BEAT, 0.4), r1, 0, "fx")
    else:
        S.add(pclick(0.3), p0, 0.15, "fx"); S.add(pclick(0.24, False), r1, -0.15, "fx"); S.add(logdrum(NOTE[i % 4] + 12, S16 * 2, 0.22), p0, 0, "fx")
S.add(riser(BAR / 2, 0.04, seed=3), L[1]); S.add(impact(0.25), L[2], 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("keys", BEAT * 0.5, fb=0.2, mix=0.1)
S.sidechain("bass", kicks, 0.15); S.sidechain("pads", kicks, 0.4); S.sidechain("keys", kicks, 0.15)
S.reverb("chop", 0.25, 1.6, 21); S.reverb("keys", 0.25, 1.6, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.15, 1.0, 61)
S.save(ROOT / "public/videos/33-clickpen/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "pads": 0.8, "chop": 0.9, "fx": 1.0})
print(f"clickpen: {DUR:.3f} s")
