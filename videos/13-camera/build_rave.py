"""Video 013 · Camera (Kurzgesagt x pixel) — the RAVE soundtrack, 128 BPM, 20 bars = 37.5 s, seamless loop.

Same timeline as build_k.py (reads camerak.json): every flash / shutter click is a big clap + click, every sensor cell
that lights up (and every filter row, every photo row) is a rave stab of the melody, every part that pops in is a
hoover blip. Structure: bars 0-3 full (four-on-the-floor, offbeat bass, stabs) · 4-11 breakdown with an acid 303 line,
filter opening, snare roll in bar 11 · 12-15 THE DROP (hoover + stabs on the cells) · 16-17 groove · 18-19 full (loop).
Writes public/videos/13-camera/camerak_rave.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import big_kick, clap, impact, riser  # noqa: E402

EV = json.loads((ROOT / "remotion/src/videos/camera/camerak.json").read_text())
BPM, BARS = EV["bpm"], 20
BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)
rng = np.random.default_rng(7)

def env(n, a=0.003, d=None):
    t = np.arange(n) / SR
    e = np.clip(t / a, 0, 1)
    return e * (np.exp(-t / d) if d else 1)
def saws(f, n, voices=7, spread=0.012):
    t = np.arange(n) / SR; x = np.zeros(n)
    for v in range(voices):
        dt = 1 + (spread * (v - (voices - 1) / 2) / ((voices - 1) / 2) if voices > 1 else 0)
        ph = np.cumsum(f * dt) / SR + rng.random()
        x += 2 * (ph % 1) - 1
    return x / voices
def onepole(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def svf(x, cut, res=0.85):
    """resonant low-pass (Chamberlin state-variable), cut can be an array"""
    cut = np.broadcast_to(cut, x.shape); lo = bp = 0.0; y = np.zeros_like(x); q = 1 - res
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(cut[i], SR / 6) / SR)
        lo += f * bp; hi = x[i] - lo - q * bp; bp += f * hi; y[i] = lo
    return y
def kick(vol=1.0):
    return np.tanh(big_kick(1.0) * 2.2) * vol
def stab(notes, vol=0.12, dur=0.22):
    n = int(dur * SR); x = np.zeros(n)
    for m in notes: x += saws(hz(m), n, 5, 0.01)
    t = np.arange(n) / SR
    org = sum(np.sign(np.sin(2 * np.pi * hz(m + 12) * t)) for m in notes) * 0.25
    return onepole(x + org * 0.5, 5200) * vol * env(n, 0.002, 0.09)
def hoover(midi, dur, vol=0.12):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * (1 + 0.5 * np.exp(-t / 0.08)) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t))   # the swoop down
    x = saws(f, n, 7, 0.03) + 0.5 * saws(f * 0.5, n, 3, 0.02)
    return onepole(x, 3500) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
def acid(midi, dur, cut0, cut1, vol=0.12, accent=False):
    n = int(dur * SR); t = np.arange(n) / SR
    x = saws(hz(midi), n, 1)
    cut = cut0 + (cut1 - cut0) * np.exp(-t / (0.09 if not accent else 0.16))
    return np.tanh(svf(x, cut, 0.9) * 2.5) * vol * env(n, 0.002) * np.clip((dur - t) / 0.01, 0, 1)
def sub(midi, dur, vol=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.tanh(np.sin(2 * np.pi * hz(midi) * t) * 1.6) * vol * np.clip(t / 0.004, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)
def openhat(vol=0.08, seed=0):
    return noise(0.14, vol, 0.05, rate=44100, seed=seed)
def snare(vol=0.3, seed=0):
    n = int(0.16 * SR); t = np.arange(n) / SR
    return mix(noise(0.16, vol, 0.06, rate=30000, seed=seed), np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04) * vol * 0.7)
def shutter_click(vol=0.3, seed=0):
    a = noise(0.012, vol, 0.004, rate=44100, seed=seed); c = noise(0.02, vol * 0.8, 0.006, rate=22050, seed=seed + 1)
    out = np.zeros(int(0.06 * SR)); out[:len(a)] += a; o = int(0.035 * SR); out[o:o + len(c)] += c[:len(out) - o]
    return out
def sweep_noise(dur, vol=0.1, seed=0, up=True):
    n = int(dur * SR); x = rng.standard_normal(n); k = np.linspace(0, 1, n)
    y = onepole(x, 800) * (1 - k) + (x - onepole(x, 800)) * k if up else x
    return y * vol * (k ** 2 if up else (1 - k))

main = Song(bpm=BPM, bars=BARS, loop=True); sc = Song(bpm=BPM, bars=BARS, loop=True)
kicks = []
PROG = [[57, 60, 64], [57, 60, 64], [60, 64, 67], [55, 59, 62]]     # Am Am C G (rave minor)
ROOT_ = [45, 45, 48, 43]
section = lambda bar: "full" if bar < 4 or bar >= 18 else "break" if bar < 12 else "drop" if bar < 16 else "groove"
for bar in range(BARS):
    sec = section(bar)
    four = sec in ("full", "drop", "groove") or bar >= 10            # the kick comes back at bar 10 (the CLICK part)
    for s in ((0, 4, 8, 12) if four else (0, 8)):
        main.add(kick(1.0 if sec == "drop" else 0.9), bt(bar, s)); kicks.append(bt(bar, s))
    for s in (4, 12):
        if sec != "break" or bar >= 8: main.add(clap(0.42 if sec == "drop" else 0.32, seed=bar * 2 + s), bt(bar, s))
    for s in range(2, 16, 4): main.add(openhat(0.09 if sec != "break" else 0.05, seed=bar * 4 + s), bt(bar, s))
    for s in range(0, 16, 2): main.add(hat(0.06, seed=bar * 8 + s), bt(bar, s + 1))
    r = ROOT_[bar % 4]
    if sec in ("full", "drop", "groove"):
        for s in (2, 6, 10, 14): sc.add(sub(r - 12, S16 * 1.8, 0.4), bt(bar, s))            # offbeat rave bass
        if sec != "groove":
            for s in (0, 3, 6, 10): main.add(stab(PROG[bar % 4], 0.07), bt(bar, s))           # rave chord riff
    if sec == "break":                                                                        # acid 303 line
        open_ = (bar - 4) / 8
        pat = [0, 0, 12, 0, 3, 0, 15, 0, 0, 7, 0, 12, 0, 3, 10, 0]
        for s, d in enumerate(pat):
            sc.add(acid(r - 12 + d, S16 * 0.92, 250 + 300 * open_, 900 + 3600 * open_, 0.1, accent=d >= 12), bt(bar, s))
    if sec == "drop":                                                                         # hoover lead
        for s, ln, m in ((0, 6, 69), (6, 4, 72), (10, 6, 67)):
            main.add(hoover(m + (0 if bar % 2 == 0 else -2), ln * S16 * 0.95, 0.07), bt(bar, s))
# snare roll into the drop (bar 11) + noise sweep
for k in range(8): main.add(snare(0.08 + 0.12 * k / 8, seed=300 + k), bt(11, k))              # 16ths...
for k in range(16): main.add(snare(0.2 + 0.1 * k / 16, seed=400 + k), r4(bt(11, 8) + k * S16 / 2))   # ...then 32nds
main.add(sweep_noise(BAR * 2, 0.1, up=True), bt(10)); main.add(impact(1.0, seed=8), bt(12))
main.add(riser(BAR, 0.12, seed=3), bt(3)); main.add(impact(0.6, seed=4), bt(4))
main.add(impact(0.75, seed=12), bt(16))
# the camera plays it: flashes / clicks = hits, cells / filters / photo rows = rave stabs, parts = hoover blips
STEPS = (0, 3, 6, 8, 11, 14); MEL = [[69, 69, 72, 69, 67, 64], [69, 69, 72, 74, 72, 67]]
for t in EV["flashes"]: main.add(clap(0.3, seed=int(t * 10)), t); main.add(shutter_click(0.32, seed=int(t * 10)), t)
for o, c in EV["shutter"]: main.add(shutter_click(0.36, seed=int(o * 10)), o); main.add(stab([69, 72, 76], 0.09), o); main.add(shutter_click(0.24, seed=int(c * 10)), c)
for i, t in enumerate(EV["parts"]): main.add(hoover([81, 84, 88, 91, 93][i] - 12, 0.18, 0.05), t)
for key in ("cells", "filters", "screen"):
    for k, t in enumerate(EV[key]):
        m = MEL[(k // 6) % 2][k % 6]
        main.add(stab([m, m + 3 if k % 6 in (0, 3) else m + 4, m + 7], 0.085), t)
t = np.arange(len(sc.buf)) / SR
last = np.full(len(t), -10.0)
for k in sorted(kicks): last[t >= k] = k
main.buf += sc.buf * (1 - 0.7 * np.exp(-(t - last) / 0.13))
main.buf = np.tanh(main.buf * 1.15) / 1.15                       # a little glue / grit
main.reverb(wet=0.12, decay=1.4)
main.save(ROOT / "public/videos/13-camera/camerak_rave.wav")
print("rave ok")
