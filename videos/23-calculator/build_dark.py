"""Video 023 (adult cut) · darker, minimal score for the calculator video — same timeline as build.py (reads
remotion/src/videos/calculator/calculator.json), 120 BPM deep minimal: soft deep kick, long sub notes, a sparse hat, a
filtered drone, and ONE tense three-note motif on a glassy bell with a long delay. No bleeps, no voice chops.
Events stay musical but quiet and physical: key presses are muted clicks + a low pluck, a lamp turning on is a glass ping,
a column of the addition is a low thud, the carry a soft rising sine, the result a chord swell.
Writes public/videos/23-calculator/music_dark.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

ev = json.loads((ROOT / "remotion/src/videos/calculator/calculator.json").read_text())
BPM, BARS = 120, 20
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(230)

def lp(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def hp(x, cut): return x - lp(x, cut)
def reson(x, f, q):                                                              # 2-pole band-pass resonator
    w = 2 * np.pi * f / SR; r = np.exp(-w / (2 * q)); a1, a2 = 2 * r * np.cos(w), -r * r; g = (1 - r * r) * 0.5
    y = np.empty_like(x); y1 = y2 = 0.0
    for i in range(len(x)):
        v = g * x[i] + a1 * y1 + a2 * y2; y2 = y1; y1 = v; y[i] = v
    return y
_chop = {}
def chop(midi, dur, vowel="a", vol=0.5):
    """vocal-chop-like formant note (the earworm)"""
    key = (midi, round(dur, 3), vowel)
    if key not in _chop:
        n = int(dur * SR); t = np.arange(n) / SR
        f = hz(midi) * (1 + 0.012 * np.exp(-t / 0.03) + 0.004 * np.sin(2 * np.pi * 6 * t))
        ph = np.cumsum(f) / SR; src = (2 * (ph % 1) - 1) + 0.5 * (2 * ((ph * 1.005) % 1) - 1)
        F = {"a": (850, 1250, 2700), "o": (520, 920, 2500), "e": (600, 1900, 2600)}[vowel]
        x = reson(src, F[0], 7) * 1.0 + reson(src, F[1], 9) * 0.7 + reson(src, F[2], 10) * 0.25
        x *= np.clip(t / 0.008, 0, 1) * np.clip((dur - t) / 0.03, 0, 1) * (0.7 + 0.3 * np.exp(-t / 0.08))
        _chop[key] = x / (np.max(np.abs(x)) + 1e-9)
    return _chop[key] * vol
def kick(vol=1.0):
    n = int(0.42 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(48 + 115 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.22)
    c = hp(noise(0.005, 1.0, 0.002, rate=44100, seed=1), 2500); out[:len(c)] += c * 0.22
    return out * vol
def clap(vol=0.3, seed=0):
    n = int(0.22 * SR); t = np.arange(n) / SR
    nz = lp(hp(noise(0.22, 1.0, 0.22, rate=44100, seed=seed)[:n], 900), 6500)
    env = sum(np.exp(-np.clip(t - d, 0, None) / 0.012) * (t >= d) for d in (0, 0.011, 0.023)) * 0.4 + np.exp(-t / 0.08) * 0.5
    return nz * env * vol
def snr(vol=0.2, seed=0):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 200 * t) * np.exp(-t / 0.03) * 0.5 + lp(hp(noise(0.12, 1.0, 0.12, rate=44100, seed=seed)[:n], 1500), 7000) * np.exp(-t / 0.045)) * vol
def hat(vol, seed, long=False):
    d = 0.16 if long else 0.04; return lp(hp(noise(d, 1.0, d * 0.5, rate=44100, seed=seed), 7000), 12000) * vol
def tick(vol=0.16):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1500 * t) * np.exp(-t / 0.008) + 0.5 * np.sin(2 * np.pi * 2900 * t) * np.exp(-t / 0.004)) * vol
def logdrum(midi, dur, vol=0.42):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * (1 + 0.9 * np.exp(-t / 0.018))
    ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.3 * np.sin(2 * np.pi * 2 * ph) * np.exp(-t / 0.08) + 0.12 * np.sin(2 * np.pi * 3 * ph) * np.exp(-t / 0.04)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / (dur * 0.6)) * np.clip((dur - t) / 0.02, 0, 1)
def blip(midi, vol=0.13, dur=0.28):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * np.sign(np.sin(2 * np.pi * f * t))
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.09)
def pluck(midi, vol=0.06, dur=0.4):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t + 1.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.06))
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.15)
def pad(notes, dur, vol=0.02):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.005, 0.005): x += np.sin(2 * np.pi * hz(m) * (1 + d) * t + rng.random() * 6) + 0.3 * np.sin(2 * np.pi * hz(m) * 2 * (1 + d) * t)
    return x * vol * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
def riser(dur, vol=0.07, seed=4):
    n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
    nz = noise(dur, 1.0, dur, rate=44100, seed=seed)[:n]
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (k * 2)) / SR) * 0.35
    return (hp(lp(nz, 9000), 1500) * 0.6 * k ** 2 + tone * k ** 1.5) * vol
def impact(vol=0.5):
    n = int(1.6 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.6) + lp(noise(1.6, 1.0, 1.6, rate=44100, seed=7)[:n], 2500) * np.exp(-t / 0.35) * 0.25) * vol

def marimba(midi, vol=0.1, dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.03) + 0.12 * np.sin(2 * np.pi * 10 * f * t) * np.exp(-t / 0.012)
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.2)
def snare(vol=0.26, seed=0):
    n = int(0.2 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(230 + 60 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.045) * 0.5
    nz = lp(hp(noise(0.2, 1.0, 0.2, rate=44100, seed=seed)[:n], 1500), 7500) * np.exp(-t / 0.06) * 0.7
    return (body + nz) * vol

def deepkick(vol=0.8):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-t / 0.035)) / SR) * np.exp(-t / 0.26) * vol
def sub(midi, dur, vol=0.42):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * hz(midi) * t) + 0.12 * np.sin(2 * np.pi * 2 * hz(midi) * t)) * vol * np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.15, 0, 1)
def drone(notes, dur, vol=0.03, c0=350, c1=900):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.006, 0.0, 0.006):
            ph = hz(m) * (1 + d) * t + rng.random(); x += 2 * (ph % 1) - 1
    cut = c0 + (c1 - c0) * (0.5 - 0.5 * np.cos(2 * np.pi * t / dur))
    y = np.empty(n); s = 0.0; s2 = 0.0
    for i in range(n):
        a = np.exp(-2 * np.pi * cut[i] / SR); s = (1 - a) * x[i] + a * s; s2 = (1 - a) * s + a * s2; y[i] = s2
    return y * vol * np.clip(t / 0.8, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)
def glass(midi, vol=0.07, dur=2.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.25) + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.08)
    return x * vol * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.7)
def lowpluck(midi, vol=0.14):
    n = int(0.6 * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.05)) * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.2)
def click(vol=0.12, seed=0):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (hp(noise(0.03, 1.0, 0.006, rate=44100, seed=seed)[:n], 2000) * 0.6 + np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.004)) * vol
def thud(vol=0.3):
    n = int(0.3 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(70 + 90 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.09) * vol
def sweep(m0, m1, dur=0.6, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m0) * (hz(m1) / hz(m0)) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * vol * np.sin(np.pi * t / dur)
def air(dur, vol=0.03, seed=3):
    n = int(dur * SR); t = np.arange(n) / SR
    return lp(hp(noise(dur, 1.0, dur, rate=44100, seed=seed)[:n], 400), 2500) * vol * np.sin(np.pi * t / dur) ** 2

S = StereoSong(BPM, BARS)
ROOT_ = [26, 26, 22, 24]                                                           # D  D  Bb  C  (2 bars each)
MOTIF = [(0, 69), (3, 74), (6, 77)]                                                 # A4 D5 F5 — the one idea
kicks = []
for bar in range(BARS):
    r = ROOT_[(bar // 2) % 4]
    quiet = bar < 2 or bar >= 18 or bar in (10, 11)
    for s in (0, 4, 8, 12):
        if not quiet or s == 0: S.add(deepkick(0.8 if not quiet else 0.55), bt(bar, s), 0, "drums"); kicks.append(bt(bar, s))
    for s in (2, 6, 10, 14):
        if bar >= 4 and not quiet: S.add(hat(0.022, seed=bar * 16 + s), bt(bar, s), 0.25, "drums")
    if bar >= 6 and not quiet: S.add(click(0.07, seed=bar), bt(bar, 13), -0.3, "drums")
    if bar % 2 == 0:
        S.add(sub(r + 12, BAR * 2 * 0.98, 0.4), bt(bar), 0, "bass")
        S.add(drone([50, 57, 62], BAR * 2 + 0.6, 0.028, 300, 700 + 60 * bar), bt(bar), 0, "pads")
        for s, m in MOTIF: S.add(glass(m + (12 if bar in (12, 14, 16) else 0), 0.075), bt(bar, s), [-0.3, 0.3, 0][MOTIF.index((s, m))], "lead")
    elif bar % 4 == 3: S.add(glass(81, 0.05), bt(bar, 8), 0.2, "lead")
# events
for i, t in enumerate(ev["keys"]): S.add(click(0.2, seed=40 + i), t, 0, "fx"); S.add(lowpluck([50, 57, 53, 62][i], 0.16), t, 0, "fx")
A, B = (0, 1, 0), (0, 1, 1)
for bits, times, note in ((A, ev["abits"], 81), (B, ev["bbits"], 84)):
    for i, t in enumerate(times):
        S.add(click(0.1, seed=60 + i), t, [-0.3, 0, 0.3][i], "fx")
        if bits[i]: S.add(glass(note, 0.09, 1.6), t, [-0.3, 0, 0.3][i], "lead")
for i, t in enumerate(ev["cols"]): S.add(thud(0.3), t, 0, "fx"); S.add(glass([86, 74, 89][i], 0.08, 1.4), t + BEAT / 2, 0, "lead")
S.add(sweep(62, 74, BEAT * 1.2, 0.06), ev["cols"][1] + BEAT / 2, -0.2, "fx")
for k in range(int((ev["zoom"][1] - ev["zoom"][0]) / S16)): S.add(click(0.05 + 0.03 * (k % 4 == 0), seed=100 + k), ev["zoom"][0] + k * S16, [-0.6, 0.6][k % 2], "fx")
S.add(drone([62, 65, 69, 74], BAR * 2, 0.04, 500, 2200), ev["result"], 0, "pads"); S.add(thud(0.35), ev["result"], 0, "fx")
for i, t in enumerate(ev["segs"]): S.add(glass([74, 77, 81, 84, 86][i], 0.07, 1.4), t, [-0.3, 0.3][i % 2], "lead")
for t in (ev["in"], ev["out"]): S.add(air(BAR, 0.035, seed=int(t)), t - BAR / 2); S.add(thud(0.3), t, 0, "fx")
S.delay("lead", BEAT * 0.75, fb=0.5, mix=0.35); S.delay("fx", BEAT * 0.5, fb=0.3, mix=0.12)
S.sidechain("bass", kicks, 0.3); S.sidechain("pads", kicks, 0.35)
S.reverb("lead", 0.45, 3.2, 21); S.reverb("pads", 0.4, 3.0, 41); S.reverb("drums", 0.1, 1.0, 51); S.reverb("fx", 0.3, 1.8, 61)
S.save(ROOT / "public/videos/23-calculator/music_dark.wav", gains={"drums": 0.95, "bass": 1.0, "lead": 1.0, "pads": 1.0, "fx": 0.9})
print(f"calculator dark: {DUR:.3f} s")
