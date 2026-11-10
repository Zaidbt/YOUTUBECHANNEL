"""Video 023 · How does a calculator do maths when it only knows 0 and 1? — 40 s seamless loop, 120 BPM robot electro-pop
(20 bars, 2 s each): 808-style electro beat, square octave bass, a vocoder-ish chop motif (the earworm), bleepy arps.
Everything the calculator does is a sound in key: each key press is a beep (2, +, 3, =), each lamp (bit) that turns on
is a bell, each column of the addition is a "ka-chunk", the carry is a rising glide, the 28 switches click in 16ths,
and the 5 lit bars of the display are 5 notes.

Timeline (bars): 0 hook: the calculator shows 2+3=5 · 2-4 a finger types 2 + 3 = · 4 DIVE into the chip: numbers become
lamps worth 4-2-1 (2 = 010, 3 = 011) · 7 it adds column by column · 9 "1 + 1 = 10": write 0, carry the 1 · 10.5 zoom
into one adder: ~28 switches (transistors) · 12 result 101 = 4 + 0 + 1 = 5 · 14 back out: the screen lights 5 of its 7
bars · 16 all in millionths of a second; first calculator chip (1971) = 2,300 switches · 18 hook again (loop).
Writes remotion/src/videos/calculator/calculator.json + public/videos/23-calculator/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 120, 20
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(23)

keys = [bt(2), bt(2, 8), bt(3), bt(3, 8)]                                          # 2  +  3  =
IN, OUT, AGAIN = bt(4), bt(14), bt(18)
abits = [bt(4, 8) + k * BEAT for k in range(3)]                                    # 2 -> 0 1 0 (lamps 4, 2, 1)
bbits = [bt(5, 8) + k * BEAT for k in range(3)]                                    # 3 -> 0 1 1
cols = [bt(7, 8), bt(9), bt(10, 8)]                                                # columns 1s, 2s, 4s
zoom = [bt(11), bt(12)]                                                            # inside one adder
result = bt(12)
segs = [bt(14, 4) + k * BEAT / 2 for k in range(5)]                                # the 5 lit bars of the "5"
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "keys": keys, "in": IN, "out": OUT, "again": AGAIN, "abits": abits, "bbits": bbits,
      "cols": cols, "zoom": zoom, "result": result, "segs": segs}
(ROOT / "remotion/src/videos/calculator/calculator.json").write_text(json.dumps(ev))

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

def k808(vol=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(46 + 130 * np.exp(-t / 0.025)) / SR) * np.exp(-t / 0.3)
    c = hp(noise(0.004, 1.0, 0.002, rate=44100, seed=1), 3000); out[:len(c)] += c * 0.3
    return out * vol
def sqbass(midi, dur, vol=0.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = lp(np.sign(np.sin(2 * np.pi * f * t)) * 0.7 + (2 * ((f * t) % 1) - 1) * 0.4, 900) + 0.5 * np.sin(2 * np.pi * f * t)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / (dur * 1.2)) * np.clip((dur - t) / 0.02, 0, 1)
def beepk(midi, vol=0.17, dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.45 + np.sin(2 * np.pi * f * t) * 0.6 + 0.2 * np.sin(2 * np.pi * 2 * f * t)
    return lp(x, 5200) * vol * np.clip(t / 0.003, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
def bell(midi, vol=0.1, dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    return np.sin(2 * np.pi * f * t + 1.4 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / 0.12)) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.3)
def chunk(vol=0.25):
    n = int(0.16 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(160 + 300 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.04) + hp(noise(0.16, 1.0, 0.03, rate=44100, seed=6)[:n], 1800) * 0.5 * np.exp(-t / 0.02)
    return x * vol
def glide(m0, m1, dur=0.5, vol=0.1):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m0) * (hz(m1) / hz(m0)) ** (t / dur)
    ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) + 0.3 * np.sign(np.sin(2 * np.pi * ph))) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
def arp(midi, vol=0.045):
    n = int(0.2 * SR); t = np.arange(n) / SR; f = hz(midi)
    return lp(np.sign(np.sin(2 * np.pi * f * t)), 3200) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.06)

S = StereoSong(BPM, BARS)
ROOTS = [36, 33, 41, 43]; CH = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]   # C - Am - F - G
# the earworm: a robot-voice motif, the same every 2 bars
RIFF = [(0, 76, 2, "e"), (2, 76, 2, "e"), (4, 79, 2, "a"), (6, 76, 2, "e"), (8, 81, 3, "a"), (12, 79, 3, "o"),
        (16, 76, 2, "e"), (18, 76, 2, "e"), (20, 79, 2, "a"), (22, 84, 2, "e"), (24, 83, 3, "a"), (28, 79, 3, "o")]
def sec(b):
    return "hook" if b < 2 or b >= 18 else "keys" if b < 4 else "bits" if b < 7 else "add" if b < 10 else "zoom" if b < 12 else "res" if b < 14 else "calc"
EN = {"hook": 1.0, "keys": 0.45, "bits": 0.7, "add": 0.9, "zoom": 0.5, "res": 1.0, "calc": 1.0}
kicks = []
for bar in range(BARS):
    s_ = sec(bar); r = ROOTS[bar % 4]; ch = CH[bar % 4]; en = EN[s_]
    if bar == 10: s_, en = "add", 0.9                                                 # the zoom starts at 10.5
    for s in ((0, 6, 10) if en > 0.6 else (0, 8)): S.add(k808(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
    for s in (4, 12):
        if en > 0.6: S.add(clap(0.26, seed=bar * 2 + s), bt(bar, s), 0.05, "drums")
        else: S.add(snr(0.1, seed=bar + s), bt(bar, s), 0, "drums")
    for s in range(16):
        if en > 0.6 or s % 2 == 0: S.add(hat([0.04, 0.014, 0.028, 0.014][s % 4], seed=700 + bar * 16 + s, long=(s == 14 and en > 0.9)), bt(bar, s), [-0.3, 0.3][s % 2], "drums")
    for s in range(0, 16, 2): S.add(sqbass(r + (12 if (s // 2) % 2 else 0), S16 * 1.8, 0.2 * (0.6 + 0.4 * en)), bt(bar, s), 0, "bass")
    S.add(pad(ch, BAR, 0.016 + 0.006 * en), bt(bar), 0, "pads")
    if en > 0.65:
        for s in range(16): S.add(arp(ch[[0, 2, 1, 3][s % 4]] + 12, 0.035 * en), bt(bar, s), [-0.5, 0.5][s % 2], "keys")
    if s_ in ("hook", "res", "calc", "add"):
        for s, m, ln, vw in RIFF:
            if s // 16 == bar % 2: S.add(chop(m, ln * S16 * 0.9, vw, 0.34 * en), bt(bar, s % 16), 0, "chop"); S.add(beepk(m + 12, 0.035, ln * S16 * 0.6), bt(bar, s % 16), 0.3, "keys")
# everything the calculator does is a sound
for t, m in zip(keys, (74, 79, 76, 84)): S.add(beepk(m, 0.2, 0.3), t, 0, "fx")
A, B = (0, 1, 0), (0, 1, 1)
for i, t in enumerate(abits): S.add(bell(81, 0.13) if A[i] else tick(0.14), t, [-0.4, 0, 0.4][i], "keys")
for i, t in enumerate(bbits): S.add(bell(84, 0.13) if B[i] else tick(0.14), t, [-0.4, 0, 0.4][i], "keys")
for i, t in enumerate(cols):
    S.add(chunk(0.3), t, 0, "fx"); S.add(bell([88, 76, 91][i], 0.14), t + BEAT / 2, 0, "keys")
S.add(glide(72, 84, BEAT * 1.2, 0.11), cols[1] + BEAT / 2, -0.2, "fx")                # the carry
for k in range(int((zoom[1] - zoom[0]) / S16)): S.add(tick(0.07 + 0.03 * (k % 4 == 0)), zoom[0] + k * S16, [-0.6, 0.6][k % 2], "fx")
S.add(impact(0.5), result, 0, "fx"); [S.add(blip(m, 0.12, 0.4), result + k * S16, [-0.3, 0.3][k % 2], "keys") for k, m in enumerate((84, 88, 91, 96))]
for i, t in enumerate(segs): S.add(bell([76, 79, 84, 88, 91][i], 0.13), t, [-0.4, 0.4][i % 2], "keys")
for t in (IN, OUT): S.add(impact(0.4), t, 0, "fx"); S.add(riser(BEAT * 2, 0.05, seed=int(t)), t - BEAT * 2)
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.18); S.delay("keys", BEAT * 0.5, fb=0.3, mix=0.16)
S.sidechain("bass", kicks, 0.3); S.sidechain("pads", kicks, 0.5); S.sidechain("keys", kicks, 0.12)
S.reverb("chop", 0.22, 1.4, 21); S.reverb("keys", 0.24, 1.6, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.1, 0.9, 51); S.reverb("fx", 0.22, 1.2, 61)
S.save(ROOT / "public/videos/23-calculator/music.wav", gains={"drums": 1.0, "bass": 0.95, "chop": 1.0, "keys": 0.95, "pads": 0.8, "fx": 1.0})
print(f"calculator: {DUR:.3f} s")
