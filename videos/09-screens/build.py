"""Video 009 · How do screens work? — 48 s seamless loop, 170 BPM drum & bass, 34 bars.

The picture IS the drum machine: in the close-up, the red sub-pixel lights on every kick, green on every snare,
blue on every hat. Colours are chords: R = A, G = C, B = E (A minor) — yellow (R+G) plays A+C, white plays all three.
Events (screens.json):
  kicks / snares / hats   the drum pattern (times), shared by picture and sound
  masks                   [time, mask] colour held per bar in the mixing section (1=R, 2=G, 4=B)
  levels                  16 brightness steps (256 levels) on 16ths
  cycle                   [time, mask] colour changes on 16ths in the drop (each one plays its notes)
  reveal                  16ths that reveal the on-screen text column by column
  scans                   refresh sweeps (one per beat) in the refresh section
Bars 30-33 mirror bars 0-3 so the loop closes.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import big_kick, clap, impact, riser, supersaw, pluck, saw  # noqa: E402

BPM, BARS = 170, 34
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR
S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)  # bar + 16th step

# drum & bass two-step: kick on 1 and the "and" of 3, snare on 2 and 4, shuffled hats + a ghost snare
KICK_STEPS, SNARE_STEPS = [0, 10], [4, 12]
HAT_STEPS = [2, 6, 7, 10, 14, 15]
GHOST = [9]
def drum_bars():
    full = set(range(0, 4)) | set(range(8, 12)) | set(range(18, 30)) | set(range(30, 34))
    half = set(range(4, 8)) | set(range(12, 18))
    return full, half
FULL, HALF = drum_bars()
kicks, snares, hats = [], [], []
for bar in range(BARS):
    if bar in FULL:
        kicks += [bt(bar, s) for s in KICK_STEPS]; snares += [bt(bar, s) for s in SNARE_STEPS]; hats += [bt(bar, s) for s in HAT_STEPS]
    elif bar in HALF:
        kicks += [bt(bar, 0)]; snares += [bt(bar, 8)]; hats += [bt(bar, s) for s in range(2, 16, 4)]
MASKS = [3, 6, 5, 7]  # yellow, cyan, magenta, white (bars 12-15)
masks = [[bt(12 + i), m] for i, m in enumerate(MASKS)]
levels = [bt(16, k * 2) for k in range(16)]             # bars 16-17: 16 brightness steps on 8ths
CYCLE = [1, 3, 2, 6, 4, 5, 7, 3, 1, 5, 4, 6, 2, 3, 7, 7]
cycle = [[bt(18, k), CYCLE[k % 16]] for k in range(64)] # bars 18-21: a colour per 16th
reveal = [bt(4, k) for k in range(32)]                  # bars 4-5
scans = [bt(26, k * 4) for k in range(16)]              # bars 26-29: one refresh sweep per beat
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "kicks": kicks, "snares": snares, "hats": hats, "masks": masks,
      "levels": levels, "cycle": cycle, "reveal": reveal, "scans": scans}
(ROOT / "remotion/src/videos/screens/screens.json").write_text(json.dumps(ev))
print(f"{len(kicks)} kicks, {len(snares)} snares, {len(hats)} hats")

# ---------- sound ----------
main = Song(bpm=BPM, bars=BARS, loop=True)
sc = Song(bpm=BPM, bars=BARS, loop=True)
NOTE = {1: 69, 2: 72, 4: 76}  # R=A, G=C, B=E
def mask_notes(m, up=0): return [NOTE[b] + up for b in (1, 2, 4) if m & b]
PROG = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]]  # Am F C G

def reese(bar, vol=0.09, bars=1):
    root = PROG[bar % 4][0] - 12
    n = int(BAR * bars * SR); t = np.arange(n) / SR
    x = sum(saw(root, BAR * bars, 1.0, d)[:n] for d in (-0.12, 0.1))
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * t / (BEAT * 2))
    k = max(3, int(40 - 30 * lfo.mean()))
    x = np.convolve(x, np.ones(k) / k, mode="same")  # crude low-pass = the growl
    env = np.clip(t / 0.02, 0, 1) * np.clip((BAR * bars - t) / 0.05, 0, 1)
    sc.add(x * env * vol * (0.7 + 0.3 * lfo), sc.t(bar))
def sub_bass(bar, vol=0.3):
    root = PROG[bar % 4][0] - 12
    n = int(BAR * SR); t = np.arange(n) / SR
    sc.add(np.sin(2 * np.pi * hz(root) * t) * vol * np.clip(t / 0.01, 0, 1) * np.clip((BAR - t) / 0.05, 0, 1), sc.t(bar))
def pad(bar, vol=0.03):
    for n in PROG[bar % 4][1:]:
        x = tri(n + 12, BAR, vol); k = np.linspace(0, 1, len(x)); sc.add(x * np.clip(k / 0.2, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), sc.t(bar))
LEAD = {0: [81, None, 79, 81, 84, None, 81, None], 1: [77, None, 76, 77, 81, None, 77, None], 2: [79, None, 76, 79, 84, None, 83, 81], 3: [79, None, 74, None, 79, 81, None, None]}
def lead(bar, vol=0.06, up=0):
    for i, n in enumerate(LEAD[bar % 4]):
        if n: main.add(supersaw([n + up], BEAT / 2 * 0.9, vol=vol / 3, release=0.04), main.t(bar, i / 2))

for t in kicks: main.add(big_kick(1.0), t)
for i, t in enumerate(snares): main.add(clap(0.34, seed=i), t); main.add(tri(52, 0.08, 0.2, decay=0.03), t)
for i, t in enumerate(hats): main.add(hat(0.13 if i % 2 else 0.18, seed=i), t)
for bar in FULL:
    for s in GHOST: main.add(clap(0.1, seed=500 + bar), bt(bar, s))

for bar in range(BARS):
    if bar in (8, 9, 10, 11, 18, 19, 20, 21, 22, 23, 24, 25): reese(bar)
    sub_bass(bar, 0.26 if bar in FULL else 0.18)
    pad(bar, 0.03 if bar in HALF else 0.022)
for bar in (0, 1, 2, 3, 22, 23, 24, 25, 30, 31, 32, 33): lead(bar)
# bars 4-5: the screen text appears column by column — a tick per column
for k, t in enumerate(reveal): main.add(pluck(93 + (k % 4) * 2, 0.05, 0.035), t)
main.add(riser(BAR * 2, 0.16, seed=4), bt(6)); main.add(impact(0.9, seed=8), bt(8))   # zoom into one pixel
# bars 8-11: the sub-pixels ARE the drums; R/G/B ping their notes on top
for t in kicks:
    if bt(8) <= t < bt(12): main.add(pluck(NOTE[1], 0.12, 0.05), t)
for t in snares:
    if bt(8) <= t < bt(12): main.add(pluck(NOTE[2], 0.12, 0.05), t)
for t in hats:
    if bt(8) <= t < bt(12): main.add(pluck(NOTE[4] + 12, 0.06, 0.03), t)
# bars 12-15: colour = chord (stab on the bar, repeated on 8ths)
for t, m in masks:
    main.add(supersaw(mask_notes(m), BEAT * 0.9, vol=0.03), t)
    for e in range(1, 8): main.add(supersaw(mask_notes(m, 12), BEAT / 2 * 0.6, vol=0.012), t + e * BEAT / 2)
# bars 16-17: 256 levels — brightness steps = a rising, opening white chord
for k, t in enumerate(levels): main.add(supersaw(mask_notes(7), BEAT / 2 * 0.9, vol=0.004 + 0.0022 * k), t)
main.add(riser(BAR * 2, 0.2, seed=9), bt(16))
for i in range(16): main.add(clap(0.1 + 0.02 * i, seed=700 + i), bt(17, i))
# bars 18-21 DROP: every colour change plays its notes
main.add(impact(1.0, seed=12), bt(18))
for t, m in cycle:
    for n in mask_notes(m, 12): main.add(pluck(n, 0.09, 0.03), t)
# bars 26-29: the screen redraws top to bottom on every beat: a short up-sweep per scan
for t in scans: main.add(sweep(500, 3000, BEAT * 0.9, duty=0.25, vol=0.035, curve=1.4), t)
for bar in range(26, 30): pad(bar, 0.025)

kick_t = sorted(kicks)
tt = np.arange(len(sc.buf)) / SR
last = np.full(len(tt), -10.0)
for k in kick_t: last[tt >= k] = k
main.buf += sc.buf * (1 - 0.6 * np.exp(-(tt - last) / 0.1))
main.lowpass(9500)
main.reverb(wet=0.14, decay=1.4)
main.save(ROOT / "public/videos/09-screens/music.wav")
