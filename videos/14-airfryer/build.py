"""Video 014 · How does an air fryer actually work? — 30 s seamless loop, 120 BPM nu-disco (15 bars), clean mix.

Story (bars, 2 s each): 0-1 hero (steam puffs on the snares) · 2 "spoiler: it doesn't fry" + glide · 3 DIVE inside:
FAN / HEATER / BASKET pop in (a note each), the heater climbs to 200°C · 5-6 the fan blows the hot air around (tornado)
· 7-8 the wind blows the moisture off the fries (a droplet = a high bell) · 9-10 DROP: Maillard reaction, a fry turns
golden on every 8th (a rising pluck) · 11 back out · 11-12 "a tiny turbo oven" + DING · 13-14 hero (loop).
Writes remotion/src/videos/airfryer/airfryer.json + public/videos/14-airfryer/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import clap  # noqa: E402

BPM, BARS = 120, 15
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)
rng = np.random.default_rng(5)

puffs = [bt(b, s) for b in (0, 1, 2, 12, 13, 14) for s in (4, 12)]
parts = [bt(3, 4), bt(3, 8), bt(3, 12)]                                  # FAN, HEATER, BASKET
drops = [bt(b, s) for b in (7, 8) for s in range(0, 16, 2)]              # 16 moisture droplets
golden = [bt(b, s) for b in (9, 10) for s in range(0, 16, 2)]            # 16 fries turn golden
ding = bt(12)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "puffs": puffs, "parts": parts, "drops": drops, "golden": golden, "ding": ding}
(ROOT / "remotion/src/videos/airfryer/airfryer.json").write_text(json.dumps(ev))

def onepole(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def saws(f, n, voices=4, spread=0.008):
    x = np.zeros(n)
    for v in range(voices):
        dt = 1 + (spread * (v - (voices - 1) / 2) / ((voices - 1) / 2) if voices > 1 else 0)
        ph = np.cumsum(np.full(n, f * dt)) / SR + rng.random(); x += 2 * (ph % 1) - 1
    return x / voices
def kick(vol=0.9):
    n = int(0.4 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(50 + 100 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.2) * vol * np.clip(t / 0.002, 0, 1)
def softhat(vol=0.035, seed=0, dur=0.05):
    x = noise(dur, 1.0, dur / 3, rate=44100, seed=seed); return (x - onepole(x, 6000)) * vol
def disco_bass(midi, dur, vol=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    x = onepole(saws(hz(midi), n, 2, 0.004), 700) + 0.6 * np.sin(2 * np.pi * hz(midi) * t)
    return x * vol * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.25)
def guitar(notes, vol=0.04, dur=0.16):
    """muted funky chord chop"""
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: x += np.sign(np.sin(2 * np.pi * hz(m) * t)) * 0.5 + np.sin(2 * np.pi * hz(m) * 2 * t) * 0.3
    return onepole(x, 2600) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.05)
def strings(notes, dur, vol=0.025):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: x += saws(hz(m), n, 5, 0.01)
    return onepole(onepole(x, 2200), 2200) * vol * np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.2, 0, 1)
def bell(midi, vol=0.08, dur=0.6):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t + 1.4 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.2))
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.3)
def pluck(midi, vol=0.07, dur=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    return onepole(saws(hz(midi), n, 3, 0.006), 2600) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.1)
def puff(vol=0.05, seed=0):
    x = noise(0.35, 1.0, 0.12, rate=22050, seed=seed); return onepole(x, 1500) * vol

main = Song(bpm=BPM, bars=BARS, loop=True); sc = Song(bpm=BPM, bars=BARS, loop=True)
kicks = []
PROG = [[57, 60, 64, 67], [62, 65, 69, 72], [60, 64, 67, 71], [55, 59, 62, 65]]   # Am7 Dm7 Cmaj7 G7
ROOT_ = [45, 50, 48, 43]
for bar in range(BARS):
    calm = 3 <= bar < 7                                  # explaining: lighter
    r = ROOT_[bar % 4]
    for s in ((0, 8) if calm else (0, 4, 8, 12)):
        main.add(kick(0.8 if calm else 0.9), bt(bar, s)); kicks.append(bt(bar, s))
    for s in (4, 12): main.add(clap(0.2 if calm else 0.28, seed=bar * 2 + s), bt(bar, s))
    for s in range(2, 16, 4): main.add(softhat(0.05 if not calm else 0.03, seed=bar * 4 + s, dur=0.12), bt(bar, s))   # open-ish offbeat
    for s in range(0, 16): main.add(softhat(0.018, seed=500 + bar * 16 + s), bt(bar, s))                              # 16ths = the fan
    for s, oc in ((0, 0), (2, 12), (4, 0), (6, 12), (8, 0), (10, 12), (12, 0), (14, 12)):                             # octave disco bass
        sc.add(disco_bass(r - 12 + oc, S16 * 1.8, 0.26 if not calm else 0.2), bt(bar, s))
    for s in (3, 7, 11, 14): main.add(guitar([n + 12 for n in PROG[bar % 4][1:]], 0.035), bt(bar, s))
    sc.add(strings(PROG[bar % 4], BAR, 0.02 if calm else 0.028), bt(bar))
for i, t in enumerate(puffs): main.add(puff(0.05, seed=i), t)
for i, t in enumerate(parts): main.add(bell([72, 76, 79][i], 0.08), t)
for i, t in enumerate(drops): main.add(bell([88, 91, 93, 96][i % 4], 0.045, 0.3), t)
for i, t in enumerate(golden): main.add(pluck([69, 72, 76, 79, 81, 84, 88, 91][i % 8], 0.07), t)
main.add(bell(84, 0.12, 1.2), ding); main.add(bell(96, 0.06, 1.0), ding)
t = np.arange(len(sc.buf)) / SR
last = np.full(len(t), -10.0)
for k in sorted(kicks): last[t >= k] = k
main.buf += sc.buf * (1 - 0.55 * np.exp(-(t - last) / 0.13))
main.lowpass(12000); main.reverb(wet=0.1, decay=1.2)
main.save(ROOT / "public/videos/14-airfryer/music.wav")
print(f"airfryer: {DUR:.3f} s")
