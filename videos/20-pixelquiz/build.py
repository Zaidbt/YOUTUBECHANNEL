"""Video 020 · PIXEL QUIZ: how screens work, as a 3-level game — 40 s seamless loop, 108 BPM electro-funk (18 bars).
The viewer plays: each level asks a question, a 3-2-1 countdown (beeps on the beat), then we zoom into the screen for
the answer (coin jingle, score +1). The game sounds are the song; one earworm riff (vocal chop + clav) runs from frame 0.

Timeline (bars, 2.222 s): 0 LEVEL 1 "your screen has no yellow: what makes it?" (countdown 1.25-2) · 2 zoom in: red +
green subpixels · 4 zoom out: the eye blurs 3 lights into 1 colour · 6 LEVEL 2 "what makes white?" (countdown 6.75-7.5)
· 7.5 all 3 on = white, all off = black · 9.5 mixer: 256 levels per light → 16.7 M colours (a note per colour, 10 beats)
· 12 LEVEL 3 "how many lights in your phone screen?" (countdown 12.75-13.5) · 13.5 ~8 million, redrawn 60-120 times a
second (a tick per redraw) · 16.5 back to LEVEL 1 (loop).
Writes remotion/src/videos/pixelquiz/pixelquiz.json + public/videos/20-pixelquiz/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 108, 18
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(20)

Q = [bt(0), bt(6), bt(12)]                                                         # questions
A = [bt(2), bt(7, 8), bt(13, 8)]                                                   # answers
count = [[a - 3 * BEAT, a - 2 * BEAT, a - BEAT] for a in A]                        # 3-2-1
mix = [bt(9, 8) + k * BEAT for k in range(10)]                                     # a new colour per beat (bars 9.5-12)
redraw = [bt(13, 8) + (k + 2) * BEAT for k in range(10)]                           # screen redraws (bars 14-16.5)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "q": Q, "a": A, "count": count, "mix": mix, "redraw": redraw, "again": bt(16, 8)}
(ROOT / "remotion/src/videos/pixelquiz/pixelquiz.json").write_text(json.dumps(ev))

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

def clav(midi, vol=0.08, dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi); ph = f * t
    x = np.sign(np.sin(2 * np.pi * ph)) * 0.5 + (2 * (ph % 1) - 1) * 0.5
    return hp(lp(x, 4200), 300) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.07)
def slap(midi, dur, vol=0.34):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 0.5 * np.exp(-t / 0.012)); ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.4 * lp(2 * (ph % 1) - 1, 1800) + 0.25 * np.sin(2 * np.pi * 3 * ph) * np.exp(-t / 0.03)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / (dur * 0.7)) * np.clip((dur - t) / 0.02, 0, 1)
def beep(midi, vol=0.16, dur=0.16):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * t) * 0.6
    return lp(x, 5000) * vol * np.clip(t / 0.003, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)
def coin(vol=0.16):
    out = np.zeros(int(0.6 * SR))
    for k, m in enumerate((88, 93)):
        s = blip(m, vol, 0.45); o = int(k * 0.075 * SR); out[o:o + len(s)] += s
    return out

S = StereoSong(BPM, BARS)
ROOTS = [40, 43, 45, 38]; CH = [[64, 67, 71], [62, 67, 71], [64, 69, 72], [62, 66, 69]]   # Em - G - Am - D
RIFF = [(0, 76, 2, "a"), (2, 79, 1, "e"), (3, 76, 2, "a"), (6, 83, 2, "e"), (8, 81, 2, "a"), (11, 79, 2, "o"), (14, 76, 2, "a"),
        (16, 76, 2, "a"), (18, 79, 1, "e"), (19, 76, 2, "a"), (22, 83, 2, "e"), (24, 86, 3, "a"), (27, 83, 2, "e"), (30, 81, 2, "o")]
def is_q(bar):                                                                      # question bars: lighter groove (suspense)
    return bar in (0, 1, 6, 12) or (bar == 7) or (bar == 13)
kicks = []
for bar in range(BARS):
    r = ROOTS[bar % 4]; ch = CH[bar % 4]; q = is_q(bar)
    half_q = bar in (7, 13)                                                         # question until step 8, then the answer drops
    for s, m, ln, vw in RIFF:
        if s // 16 == bar % 2:
            st = s % 16; quiet = q and not (half_q and st >= 8)
            S.add(chop(m, ln * S16 * 0.95, vw, 0.2 if quiet else 0.36), bt(bar, st), [-0.25, 0.25][(s // 2) % 2], "chop")
            if not quiet: S.add(clav(m - 12, 0.07), bt(bar, st), [0.3, -0.3][(s // 2) % 2], "keys")
    for s in (0, 4, 8, 12):
        quiet = q and not (half_q and s >= 8)
        if not quiet or s in (0, 8): S.add(kick(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
    for s in (4, 12):
        quiet = q and not (half_q and s >= 8)
        if not quiet: S.add(clap(0.28, seed=bar * 2 + s), bt(bar, s), 0.05, "drums")
        else: S.add(snr(0.1, seed=bar + s), bt(bar, s), 0, "drums")
    for s in range(16):
        quiet = q and not (half_q and s >= 8)
        if s % 2 == 0 or not quiet: S.add(hat([0.035, 0.014, 0.026, 0.014][s % 4] * (0.7 if quiet else 1), seed=700 + bar * 16 + s, long=(s == 14 and not quiet)), bt(bar, s), [-0.3, 0.3][s % 2], "drums")
    for s, m, ln in ((0, r, 2), (3, r, 1), (4, r + 12, 2), (7, r, 2), (10, r + 10, 2), (12, r + 12, 1), (14, r + 7, 2)):   # slap bassline
        quiet = q and not (half_q and s >= 8)
        if not quiet or s in (0, 7): S.add(slap(m, ln * S16 * 0.95, 0.34), bt(bar, s), 0, "bass")
    S.add(pad(ch, BAR, 0.02), bt(bar), 0, "pads")
# the game sounds are part of the song
for c3 in count:
    for k, t in enumerate(c3): S.add(beep(76, 0.15), t, 0, "fx"); S.add(tick(0.1), t + BEAT / 2, 0.3, "fx")
    S.add(riser(3 * BEAT, 0.05, seed=int(c3[0] * 10)), c3[0])
for t in A: S.add(beep(88, 0.17, 0.3), t, 0, "fx"); S.add(coin(0.15), t + S16 * 2, 0.2, "keys"); S.add(impact(0.4), t, 0, "fx")
MIXN = [76, 79, 81, 83, 86, 83, 81, 79, 88, 91]
for i, t in enumerate(mix): S.add(blip(MIXN[i], 0.13, 0.35), t, [-0.4, 0.4][i % 2], "keys")
for i, t in enumerate(redraw): S.add(tick(0.12), t, [-0.5, 0.5][i % 2], "fx"); S.add(pluck([88, 91][i % 2], 0.05), t, 0, "keys")
S.delay("chop", BEAT * 0.75, fb=0.32, mix=0.2); S.delay("keys", BEAT * 0.5, fb=0.3, mix=0.18)
S.sidechain("bass", kicks, 0.3); S.sidechain("pads", kicks, 0.5); S.sidechain("chop", kicks, 0.15)
S.reverb("chop", 0.22, 1.4, 21); S.reverb("keys", 0.22, 1.5, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.1, 0.9, 51); S.reverb("fx", 0.25, 1.3, 61)
S.save(ROOT / "public/videos/20-pixelquiz/music.wav", gains={"drums": 1.0, "bass": 0.95, "chop": 0.95, "keys": 1.0, "pads": 0.8, "fx": 0.9})
print(f"pixelquiz: {DUR:.3f} s")
