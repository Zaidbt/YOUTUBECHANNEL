"""Video 004 · How does a sewing machine tie a knot it can't reach? — 48 s seamless loop, 120 BPM, 24 bars.

One stitch counter sc(t) drives picture and music. Within one stitch (phase θ in [0,1)):
  0.00 needle pierces the fabric (beat 1, kick)      0.20 needle at the bottom, loop starts to form
  0.25 hook catches the loop (beat 2, bell)           0.25-0.60 hook carries the loop around the bobbin (beat 3, swoosh)
  0.60-0.75 take-up lever pulls it tight (beat 4, snare)   0.78-0.95 feed dogs move the fabric one stitch
Stitches per second per bar: real speed 16 (= 960 per minute, "about 1,000"), slow-mo 0.5 (one stitch per bar).

Writes remotion/src/videos/sewing/sewing.json and public/videos/04-sewing/music.wav
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
REAL = 16.0

def rate_at(t):
    b = t / BAR
    if b < 3: return REAL
    if b < 4: return 0.5 + (REAL - 0.5) * (1 - (b - 3)) ** 2.2
    if b < 14: return 0.5
    if b < 16: return 2.0
    if b < 17: return 4.0
    if b < 18: return 8.0
    return REAL

RATE = 240
ts = np.arange(int(DUR * RATE) + 1) / RATE
sc = np.zeros_like(ts)
for i in range(1, len(ts)):
    sc[i] = sc[i - 1] + rate_at((ts[i - 1] + ts[i]) / 2) / RATE
    if abs(ts[i] - 4 * BAR) < 0.5 / RATE:
        sc[i] = np.ceil(sc[i] - 1e-6)
assert abs(sc[-1] - round(sc[-1])) < 1e-6, "loop needs a whole number of stitches"
total = int(round(sc[-1]))

def crossings(phase):
    """Times where sc passes k + phase."""
    out = []
    for i in range(1, len(ts)):
        a, b = sc[i - 1] - phase, sc[i] - phase
        if np.floor(b + 1e-9) > np.floor(a + 1e-9):
            out.append(round(float(ts[i]), 4))
    return [t for t in out if t < DUR - 1e-6]

pierce, catch, tight = crossings(0.0), crossings(0.25), crossings(0.75)
if pierce[0] > 1e-6: pierce = [0.0] + pierce
(ROOT / "remotion/src/videos/sewing/sewing.json").write_text(json.dumps({"duration": DUR, "bar": BAR, "rate": RATE, "real": REAL, "sc": [round(float(x), 5) for x in sc]}))
print(f"timeline: {total} stitches, {len(pierce)} pierces")

# ---------- music ----------
def bell(midi, dur=1.8, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.15) + 0.1 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.05)
    return x * vol * np.exp(-t / 0.55) * np.clip(t / 0.006, 0, 1)

def warm_pad(start, dur, notes, vol=0.022):
    for n in notes:
        for det in (-0.07, 0.0, 0.07):
            x = tri(n + det, dur, vol); x = x + pulse(n + 12 + det, dur, duty=0.5, vol=vol * 0.22)[:len(x)]
            k = np.linspace(0, 1, len(x)); s.add(x * np.clip(k / 0.3, 0, 1) * np.clip((1 - k) / 0.25, 0, 1), start)

def sub(start, dur, midi, vol=0.28):
    n = int(dur * SR); t = np.arange(n) / SR; k = np.linspace(0, 1, n)
    s.add(np.sin(2 * np.pi * hz(midi) * t) * vol * np.clip(k / 0.08, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), start)

def swoosh(dur, vol=0.08, seed=3):
    x = np.convolve(noise(dur, vol, 99, rate=44100, seed=seed), np.ones(10) / 10, mode="same")
    k = np.linspace(0, 1, len(x)); return x * np.sin(np.pi * k) ** 2

def tick(vol):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2600 * t) + 0.3 * np.sin(2 * np.pi * 5200 * t)) * np.exp(-t / 0.004) * vol

def snare(vol=0.3, seed=0):
    return mix(noise(0.22, vol, 0.07, rate=8000, seed=seed), tri(57, 0.06, vol * 0.7, decay=0.03))

s = Song(bpm=BPM, bars=BARS, loop=True)
PROG = [[52, 59, 64, 67], [48, 55, 64, 67], [55, 62, 67, 71], [50, 57, 62, 66]]  # Em C G D
chord = lambda bar: PROG[bar % 4]
MEL = {
    0: [76, None, 79, None], 1: [76, 72, None, None], 2: [74, None, 79, 83], 3: [81, 78, None, None],
    18: [83, None, 79, 76], 19: [84, None, 79, None], 20: [86, None, 83, 79], 21: [81, 78, 74, None],
    22: [76, None, 79, None], 23: [81, 78, 74, None],
}
for bar in range(BARS):
    ch = chord(bar)
    real = bar < 3 or bar >= 18
    warm_pad(s.t(bar) - 0.12, BAR + 0.4, ch, vol=0.02 if real else 0.024)
    sub(s.t(bar), BAR, ch[0] - 12, vol=0.27)
    if bar in MEL:
        for k, n in enumerate(MEL[bar]):
            if n: s.add(bell(n, vol=0.06), s.t(bar, k))
    if real:  # light groove at real speed
        for b in (0, 2): s.add(kick(0.55) * 0.8, s.t(bar, b))
        for b in (1, 3): s.add(snare(0.16, seed=bar * 4 + b), s.t(bar, b))
s.tape_stop(s.t(3), BAR, end_rate=0.3)
s.add(swoosh(BAR, 0.12, seed=9) * np.linspace(0, 1, int(BAR * SR)) ** 2, s.t(17))  # riser into real speed

CATCH_NOTE = [88, 83, 86, 81, 84, 79, 83, 76, 81, 79]
for k, t in enumerate(pierce):
    b = t / BAR
    if b < 3 or b >= 18: s.add(tick(0.035), t)
    elif b < 4: s.add(tick(0.06), t)
    else: s.add(kick(0.8) * 0.85, t)
for k, t in enumerate(catch):
    b = t / BAR
    if 4 <= b < 14: s.add(bell(CATCH_NOTE[k % len(CATCH_NOTE)], dur=1.2, vol=0.07), t)
    elif 14 <= b < 18: s.add(bell(CATCH_NOTE[k % len(CATCH_NOTE)], dur=0.6, vol=0.05), t)
    if 4 <= b < 14: s.add(swoosh(0.7, 0.06, seed=k), t + 0.05)
for k, t in enumerate(tight):
    b = t / BAR
    if 4 <= b < 18: s.add(snare(0.32 if b < 14 else 0.24, seed=100 + k), t)

s.lowpass(5800)
s.reverb(wet=0.32, decay=2.4)
s.save(ROOT / "public/videos/04-sewing/music.wav")
