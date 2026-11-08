"""Video 013 · Camera (Kurzgesagt x pixel) — CLEAN, bold melodic-house soundtrack (the rave was "so noisy").
128 BPM, 20 bars = 37.5 s, seamless loop, same timeline (camerak.json). No distortion, no noise sweeps, no harsh synths:
clean punchy kick, warm sidechained chords, round bass, soft hats, and a bright bell/piano lead.
The camera plays it: every flash / shutter click = clap + soft click, every sensor cell / filter row / photo row = a bell
note of the melody, every part that pops in = a rising pluck. Sections: 0-3 full · 4-11 breakdown (pads + plucks, kick
returns at bar 8, tonal riser) · 12-15 drop · 16-17 groove · 18-19 full (loop).
Writes public/videos/13-camera/camerak_clean.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import big_kick, clap  # noqa: E402

EV = json.loads((ROOT / "remotion/src/videos/camera/camerak.json").read_text())
BPM, BARS = EV["bpm"], 20
BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)
rng = np.random.default_rng(3)

def onepole(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def saws(f, n, voices=5, spread=0.008):
    x = np.zeros(n)
    for v in range(voices):
        dt = 1 + (spread * (v - (voices - 1) / 2) / ((voices - 1) / 2) if voices > 1 else 0)
        ph = np.cumsum(np.full(n, f * dt)) / SR + rng.random(); x += 2 * (ph % 1) - 1
    return x / voices
def kick(vol=0.95):
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22) * vol * np.clip(t / 0.002, 0, 1)
def bell(midi, vol=0.09, dur=0.7):
    """clean FM bell / piano-ish note"""
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    mod = np.sin(2 * np.pi * f * 2 * t) * 1.6 * np.exp(-t / 0.25)
    x = np.sin(2 * np.pi * f * t + mod) * 0.7 + np.sin(2 * np.pi * f * 2 * t) * 0.18 * np.exp(-t / 0.15)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.32)
def pluck(midi, vol=0.06, dur=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    return onepole(saws(hz(midi), n, 3, 0.006), 2200) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.09)
def pad(notes, dur, vol=0.035):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: x += saws(hz(m), n, 5, 0.01)
    x = onepole(onepole(x, 1800), 1800)
    return x * vol * np.clip(t / 0.25, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
def bass(midi, dur, vol=0.32):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * hz(midi) * t) + 0.25 * np.sin(2 * np.pi * hz(midi) * 2 * t)
    return x * vol * np.clip(t / 0.005, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
def softhat(vol=0.035, seed=0):
    x = noise(0.04, 1.0, 0.012, rate=44100, seed=seed)
    return (x - onepole(x, 6000)) * vol                 # high-passed, short, quiet
def tick(vol=0.12):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t / 0.006) * vol
def tonal_riser(dur, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
    f = 220 * 2 ** (2 * k)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)) * vol * k ** 2
def boom(vol=0.6):
    n = int(1.2 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.5) * vol

main = Song(bpm=BPM, bars=BARS, loop=True); sc = Song(bpm=BPM, bars=BARS, loop=True)
kicks = []
PROG = [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 67]]   # Am7 Fmaj7 Cmaj7 G (warm)
ROOT_ = [45, 41, 48, 43]
sec = lambda bar: "full" if bar < 4 or bar >= 18 else "break" if bar < 12 else "drop" if bar < 16 else "groove"
for bar in range(BARS):
    s_ = sec(bar); r = ROOT_[bar % 4]
    four = s_ != "break" or bar >= 8
    for s in ((0, 4, 8, 12) if four else (0,)):
        main.add(kick(0.95 if s_ == "drop" else 0.85), bt(bar, s)); kicks.append(bt(bar, s))
    if s_ != "break" or bar >= 10:
        for s in (4, 12): main.add(clap(0.26, seed=bar * 2 + s), bt(bar, s))
    for s in range(0, 16, 2): main.add(softhat(0.03 if s_ == "break" else 0.045, seed=bar * 8 + s), bt(bar, s + 1))
    sc.add(pad(PROG[bar % 4], BAR, 0.04 if s_ != "break" else 0.05), bt(bar))
    if s_ != "break":
        for s, ln in ((0, 3), (3, 3), (6, 2), (8, 3), (11, 3), (14, 2)):          # rolling house bass
            sc.add(bass(r - 12 + (12 if s in (6, 14) else 0), ln * S16 * 0.9, 0.3), bt(bar, s))
    else:
        for s in range(0, 16, 2):                                                    # breakdown: soft arp
            main.add(pluck(PROG[bar % 4][(s // 2) % 4] + 12, 0.045), bt(bar, s))
main.add(tonal_riser(BAR * 2, 0.045), bt(10)); main.add(boom(0.5), bt(12))
main.add(boom(0.35), bt(4)); main.add(boom(0.35), bt(16))
STEPS = (0, 3, 6, 8, 11, 14); MEL = [[76, 76, 79, 76, 74, 72], [76, 76, 79, 81, 79, 74]]
for t in EV["flashes"]: main.add(clap(0.22, seed=int(t * 10)), t); main.add(tick(0.1), t)
for o, c in EV["shutter"]: main.add(tick(0.14), o); main.add(bell(84, 0.08, 0.5), o); main.add(tick(0.08), c)
for i, t in enumerate(EV["parts"]): main.add(bell([72, 76, 79, 83, 84][i], 0.07, 0.6), t)
for key in ("cells", "filters", "screen"):
    for k, t in enumerate(EV[key]): main.add(bell(MEL[(k // 6) % 2][k % 6], 0.085), t)
t = np.arange(len(sc.buf)) / SR
last = np.full(len(t), -10.0)
for k in sorted(kicks): last[t >= k] = k
main.buf += sc.buf * (1 - 0.6 * np.exp(-(t - last) / 0.14))
main.lowpass(12000); main.reverb(wet=0.1, decay=1.2)
main.save(ROOT / "public/videos/13-camera/camerak_clean.wav")
print("clean ok")
