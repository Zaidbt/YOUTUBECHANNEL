"""Video 003 · How does a watch tick? (majestic cinematic pixel-3D) — 48 s, 120 BPM, 24 bars of 2 s.

One tick timeline drives the picture and the music. Ticks per second per bar:
  0-2  8   real speed (ticks = soft wooden 16ths)
  3    8->2 slowing (ticks spread out, pads drop in pitch)
  4-15 2   slow-mo 1/4: tick on every beat (tick = heartbeat kick, tock = soft snare)
  16   4   slow-mo 1/2
  17-23 8  real speed, payoff + reveal of the dial

Writes remotion/src/videos/watch/majestic.json and public/videos/03-watch-majestic/music.wav
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402

BPM, BARS = 120, 24
BAR = 4 * 60 / BPM
DUR = BARS * BAR

# ---------- tick timeline ----------
RATE = 120
def rate_at(t):
    b = t / BAR
    if b < 3: return 8.0
    if b < 4: return 2 + 6 * (1 - (b - 3)) ** 2
    if b < 16: return 2.0
    if b < 17: return 4.0
    return 8.0
ts = np.arange(int(DUR * RATE) + 1) / RATE
tc = np.zeros_like(ts)
for i in range(1, len(ts)):
    tc[i] = tc[i - 1] + rate_at((ts[i - 1] + ts[i]) / 2) / RATE
    if abs(ts[i] - 4 * BAR) < 0.5 / RATE:
        tc[i] = np.ceil(tc[i] - 1e-6)
ticks = [0.0] + [round(float(ts[i]), 4) for i in range(1, len(ts)) if np.floor(tc[i] + 1e-6) > np.floor(tc[i - 1] + 1e-6)]
ticks = [t for t in ticks if t < DUR - 1e-6]
out = ROOT / "remotion/src/videos/watch/majestic.json"
out.write_text(json.dumps({"duration": DUR, "bar": BAR, "rate": RATE, "tc": [round(float(x), 4) for x in tc], "ticks": ticks}))
print(f"timeline: {len(ticks)} ticks")

# ---------- sound palette ----------
def bell(midi, dur=2.0, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.15) + 0.1 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.05)
    return x * vol * np.exp(-t / 0.6) * np.clip(t / 0.006, 0, 1)

def warm_pad(start, dur, notes, vol=0.024):
    for n in notes:
        for det in (-0.07, 0.0, 0.07):
            x = tri(n + det, dur, vol)
            p = pulse(n + 12 + det, dur, duty=0.5, vol=vol * 0.22)[:len(x)]
            x = x + p
            k = np.linspace(0, 1, len(x))
            s.add(x * np.clip(k / 0.3, 0, 1) * np.clip((1 - k) / 0.25, 0, 1), start)

def sub(start, dur, midi, vol=0.3):
    n = int(dur * SR); t = np.arange(n) / SR; k = np.linspace(0, 1, n)
    s.add(np.sin(2 * np.pi * hz(midi) * t) * vol * np.clip(k / 0.08, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), start)

def swell(dur, vol=0.2, seed=5):
    x = np.convolve(noise(dur, vol, 99, rate=44100, seed=seed), np.ones(12) / 12, mode="same")
    return x * np.linspace(0, 1, len(x)) ** 3

def wood(tock, vol):
    n = int(0.05 * SR); t = np.arange(n) / SR
    f = 1300 if tock else 1900
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / 0.009) * vol

s = Song(bpm=BPM, bars=BARS, loop=False, tail=0.0)
PROG = [[50, 57, 62, 65], [46, 53, 62, 65], [53, 60, 64, 69], [48, 55, 64, 67]]  # Dm Bb F C
chord = lambda bar: PROG[bar % 4]

# melodies (beat-grid, None = rest). Slow chapters get one motif per 2-bar chapter.
INTRO = {0: [74, None, 77, None], 1: [81, None, 79, 77], 2: [76, None, 72, None], 3: [79, 76, None, None]}
CHAPTER = {
    4: [62, 65, 69, None], 5: [72, None, 69, None],           # spring (low, rising)
    6: [65, 69, 72, 74], 7: [77, None, 74, None],             # gears (want to race)
    8: [76, None, None, 74], 9: [72, None, 76, None],         # fork (lock... release)
    10: [74, 77, 81, 77], 11: [74, 77, 81, 84],               # balance (swinging)
    12: [81, None, 77, None], 13: [79, None, 76, None],       # hairspring (calm)
    14: [74, 77, 81, 86], 15: [84, 81, 79, 76],               # every swing = a tick
}
PAYOFF = {18: [86, None, 84, 81], 19: [86, None, 88, 86], 20: [84, None, 81, 79], 21: [79, 81, 84, None], 22: [86, None, None, None]}

for bar in range(BARS):
    ch = chord(bar)
    loud = 1.0 if 17 <= bar <= 21 else 0.75 if bar < 3 else 0.85
    if bar < 23:
        warm_pad(s.t(bar) - 0.12, BAR + 0.4, ch if bar < 18 else ch + [ch[2] + 12], vol=0.022 * loud)
        sub(s.t(bar), BAR, ch[0] - 12, vol=0.28 * loud)
    mel = INTRO.get(bar) or CHAPTER.get(bar) or PAYOFF.get(bar)
    if mel:
        for k, n in enumerate(mel):
            if n: s.add(bell(n, vol=0.065 if bar < 18 else 0.075), s.t(bar, k))
# bar 3: tape-style slowdown of everything so far in that bar
s.tape_stop(s.t(3), BAR, end_rate=0.35)
# bar 16: swell into real speed; bar 17 downbeat lift
s.add(swell(BAR * 1.0, 0.2), s.t(16))
# ending: final chord rings out
for n in [50, 57, 62, 65, 69, 74]:
    s.add(bell(n + 12, dur=4.0, vol=0.05), s.t(23))
warm_pad(s.t(22.5), BAR * 1.5, [50, 57, 62, 69], vol=0.02)
sub(s.t(23), BAR * 0.95, 38, vol=0.3)

# ticks = percussion
for k, t in enumerate(ticks):
    b = t / BAR; tock = k % 2 == 1
    if b < 3 or b >= 17:
        s.add(wood(tock, 0.06 if b < 22 else 0.04), t)
    elif b < 4:
        s.add(wood(tock, 0.08), t)
    else:
        s.add(wood(tock, 0.1), t)
        s.add(kick(0.7) * 0.8 if not tock else mix(noise(0.22, 0.15, 0.08, rate=7000, seed=k), tri(57, 0.06, 0.14, decay=0.03)), t)

s.lowpass(5600)
s.reverb(wet=0.34, decay=2.6)
n = int(1.2 * SR); s.buf[-n:] *= np.linspace(1, 0, n) ** 1.5
s.save(ROOT / "public/videos/03-watch-majestic/music.wav")
