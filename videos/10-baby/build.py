"""Video 010 · How does a baby form? (fertilisation → birth) — 48 s seamless loop, 140 BPM jersey club / trap, 28 bars.

140 BPM ≈ a baby's heart rate (110–160 bpm), so in the heartbeat section the heart beats exactly on the beat.
The animation plays the music:
  sperm race      hi-hat rolls (the tails)
  fertilisation   impact (bar 7)
  divisions       each division adds voices to the chord: 1 → 2 → 4 → 8 → 16 → 32 cells
  implantation    impact (bar 12)
  heartbeat       lub-dub kick on every beat (bars 13–15), the heart flashes with every kick afterwards
  growth stages   an 808 hit + crash at each size (raspberry, lime, banana, watermelon)
  birth           big impact (bar 24)
Bars 26–27 mirror bars 0–1 (back to the egg) so the loop closes.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import big_kick, clap, impact, riser, supersaw, pluck  # noqa: E402

BPM, BARS = 140, 28
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR
S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)

ev = {
    "duration": DUR, "bpm": BPM, "bar": BAR,
    "race": [bt(3), bt(7)], "fertilise": bt(7),
    "divisions": [bt(7, 8), bt(8), bt(8, 8), bt(9), bt(9, 8)],   # 1→2→4→8→16→32
    "blastocyst": bt(10), "toWomb": bt(11.5), "implant": bt(12),
    "heart": bt(13),
    "stages": [bt(16), bt(18), bt(20), bt(22)],                     # week 8, 12, 20, 40
    "headDown": bt(23), "birth": bt(24), "oneCell": bt(25.5), "backToEgg": bt(26.5),
}
kicks = []
(ROOT / "remotion/src/videos/baby/baby.json").write_text(json.dumps(ev))

# ---------- instruments ----------
def b808(midi, dur, vol=0.5, glide_from=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * np.ones(n)
    if glide_from is not None: f = hz(midi) + (hz(glide_from) - hz(midi)) * np.exp(-t / 0.06)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    x = np.tanh(x * 1.8) * np.exp(-t / max(0.4, dur * 0.7))
    return x * vol * np.clip(t / 0.004, 0, 1)

def lubdub(vol=1.0):
    return mix(big_kick(vol), np.pad(big_kick(vol * 0.7), (int(0.13 * SR), 0)))

main = Song(bpm=BPM, bars=BARS, loop=True)
sc = Song(bpm=BPM, bars=BARS, loop=True)
PROG = [[51, 58, 63, 67], [48, 55, 60, 63], [44, 51, 56, 60], [46, 53, 58, 62]]  # Eb Cm Ab Bb
ch = lambda bar: PROG[bar % 4]
def pad(bar, vol=0.03):
    for n in ch(bar)[1:]:
        x = tri(n + 12, BAR, vol); k = np.linspace(0, 1, len(x)); sc.add(x * np.clip(k / 0.25, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), sc.t(bar))
def K(t, v=0.95): main.add(big_kick(v), t); kicks.append(t)
def hats(bar, kind="8"):
    if kind == "8": steps = range(0, 16, 2)
    elif kind == "16": steps = range(16)
    else: steps = []
    for s in steps: main.add(hat(0.12 if s % 4 else 0.16, seed=bar * 16 + s), bt(bar, s))
def triplet_roll(bar, beat, n=6, vol=0.12):
    for i in range(n): main.add(hat(vol * (0.6 + 0.4 * i / n), seed=900 + bar * 10 + i), bar * BAR + (beat + i / n) * BEAT)
JERSEY = [0, 4, 8, 11, 14]  # bouncy jersey-club kick pattern (16ths)
def jersey(bar, v=0.9):
    for s in JERSEY: K(bt(bar, s), v)
    for s in (4, 12): main.add(clap(0.3, seed=bar * 2 + s), bt(bar, s))
LEAD = [[75, None, 79, 82, None, 79, 77, None], [75, None, 72, 75, None, 79, None, 75], [80, None, 79, 75, None, 72, 75, None], [77, None, 74, 77, None, 82, 80, 79]]
def lead(bar, vol=0.06, up=0):
    for i, n in enumerate(LEAD[bar % 4]):
        if n: main.add(supersaw([n + up], BEAT / 2 * 0.9, vol=vol / 3, release=0.04), main.t(bar, i / 2))
def bass808(bar, vol=0.45):
    r = ch(bar)[0] - 12
    for s, ln, gl in ((0, 6, None), (6, 4, r + 12), (10, 6, None)):
        sc.add(b808(r, ln * S16 * 0.95, vol, gl), bt(bar, s))

# 0-2 intro (the egg): soft, warm
for bar in (0, 1, 2):
    pad(bar); K(bt(bar), 0.6); K(bt(bar, 8), 0.5); hats(bar, "8")
    for i, n in enumerate([75, 79, 82, 79]): main.add(pluck(n, 0.3, 0.05), main.t(bar, i))
# 3-6 the race: hats roll faster and faster (the tails), four-on-the-floor builds
for bar in range(3, 7):
    pad(bar, 0.025)
    for b in range(4): K(bt(bar, b * 4), 0.7 + 0.05 * (bar - 3))
    hats(bar, "16")
    for b in range(4): triplet_roll(bar, b + 0.5, 3 + (bar - 3), 0.1)
main.add(riser(BAR * 2, 0.18, seed=3), bt(5))
# 7 fertilisation + 7.5-9.5 divisions: the chord gains voices with every division
main.add(impact(0.95, seed=7), ev["fertilise"])
VOICES = [[63], [63, 67], [58, 63, 67, 70], [51, 58, 63, 67, 70, 75, 79, 82]]
for k, t in enumerate(ev["divisions"]):
    notes = VOICES[min(k, 3)] + ([87, 91, 94] if k >= 4 else [])
    main.add(supersaw([n + (12 if k >= 3 else 0) for n in notes[:8]], BEAT * 1.8, vol=0.028 / np.sqrt(len(notes) / 2 + 1)), t)
    main.add(pluck(75 + 4 * k, 0.25, 0.07), t)
for bar in (7, 8, 9, 10):
    K(bt(bar), 0.9); K(bt(bar, 10), 0.8); main.add(clap(0.3, seed=bar), bt(bar, 8)); hats(bar, "8"); bass808(bar, 0.4)
    triplet_roll(bar, 3, 6, 0.1)
# 11-12 travel to the womb + implantation
for bar in (11, 12): pad(bar, 0.035); hats(bar, "8")
main.add(riser(BAR * 1, 0.18, seed=11), bt(11)); main.add(impact(0.85, seed=12), ev["implant"])
K(bt(12), 0.8)
# 13-15 the heartbeat: a lub-dub on every beat (140 bpm, a baby's heart rate)
for bar in (13, 14, 15):
    for b in range(4):
        t = bt(bar, b * 4); main.add(lubdub(0.85), t); kicks.extend([t, t + 0.13])
    for s in (4, 12): main.add(clap(0.28, seed=40 + bar + s), bt(bar, s))
    hats(bar, "8"); pad(bar, 0.03); bass808(bar, 0.35)
main.add(riser(BAR, 0.2, seed=15), bt(15))
# 16-23 growth: jersey club drop, an 808 boom + crash at every size
for bar in range(16, 24):
    jersey(bar); hats(bar, "16" if bar % 2 else "8"); bass808(bar); lead(bar, up=12 if bar >= 20 else 0)
    triplet_roll(bar, 3, 6, 0.11)
for k, t in enumerate(ev["stages"]):
    main.add(crash(0.32, seed=60 + k), t); sc.add(b808(39 - 2 * k, BAR * 0.9, 0.55, 51), t)
# 24-25 birth: big hit, bright major chord ("hello, world")
main.add(impact(1.0, seed=24), ev["birth"])
for bar in (24, 25):
    jersey(bar); hats(bar, "16"); bass808(bar); lead(bar, up=12)
main.add(supersaw([75, 79, 82, 87], BAR, vol=0.022), ev["birth"])
# 26-27 outro = intro (one cell)
for bar in (26, 27):
    pad(bar); K(bt(bar), 0.6); K(bt(bar, 8), 0.5); hats(bar, "8")
    for i, n in enumerate([75, 79, 82, 79]): main.add(pluck(n, 0.3, 0.05), main.t(bar, i))

tt = np.arange(len(sc.buf)) / SR
last = np.full(len(tt), -10.0)
for k in sorted(kicks): last[tt >= k] = k
main.buf += sc.buf * (1 - 0.55 * np.exp(-(tt - last) / 0.1))
main.lowpass(9000)
main.reverb(wet=0.16, decay=1.6)
main.save(ROOT / "public/videos/10-baby/music.wav")
ev["kicks"] = sorted(set(round(k, 4) for k in kicks))
(ROOT / "remotion/src/videos/baby/baby.json").write_text(json.dumps(ev))
print(f"{len(ev['kicks'])} kicks")
