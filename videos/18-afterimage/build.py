"""Video 018 · The afterimage game: "stare at the dot for 10 seconds" — 40 s seamless loop, 120 BPM (20 bars, 2 s each)
so 1 second = 2 beats. Catchy "vocal chop" riff (formant synth) repeated all along (the earworm), log-drum bass, claps.
The game is the song: every second of the countdown is a rising blip + a heartbeat kick, a snare roll and riser build
the last 2 bars, a breath of silence, then the DROP exactly when the image turns grey (12 s). Level-up jingles open
each explanation level.

Timeline (s): 0-2 instruction · 2-12 countdown (stare) · 12 reveal (grey image looks coloured) · 18 LEVEL 1: 3 kinds of
cones · 24 LEVEL 2: the cones facing a colour get tired · 30 LEVEL 3: grey = only the rested cones answer → opposite
colour · 36-40 "try again" (same as the intro → loop).
Writes remotion/src/videos/afterimage/afterimage.json + public/videos/18-afterimage/music.wav.
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
rng = np.random.default_rng(18)

STARE0, REVEAL = bt(1), bt(6)
secs = [STARE0 + i for i in range(10)]                                            # one blip per second of the countdown
levels = [bt(9), bt(12), bt(15)]
tired = [bt(12 + k // 4, (k % 4) * 4) for k in range(8)]                           # LEVEL 2: cone energy drains per beat
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "stare0": STARE0, "reveal": REVEAL, "secs": secs, "levels": levels,
      "tired": tired, "again": bt(18)}
(ROOT / "remotion/src/videos/afterimage/afterimage.json").write_text(json.dumps(ev))

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

S = StereoSong(BPM, BARS)
# A minor: Am - F - C - G ; the riff is the same 2-bar earworm all along
ROOTS = [45, 41, 48, 43]; CH = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]
RIFF = [(0, 76, 2, "a"), (3, 76, 2, "a"), (6, 79, 2, "e"), (8, 81, 3, "a"), (11, 79, 2, "o"), (14, 76, 2, "a"),
        (16, 76, 2, "a"), (19, 76, 2, "a"), (22, 79, 2, "e"), (24, 84, 3, "a"), (27, 81, 2, "e"), (30, 79, 2, "o")]
sec = lambda b: "intro" if b < 1 or b >= 18 else "stare" if b < 6 else "drop" if b < 9 else "explain"
kicks = []
for bar in range(BARS):
    s_ = sec(bar); r = ROOTS[bar % 4]; ch = CH[bar % 4]
    # the riff (quieter + darker during the stare, full in the drop)
    for s, m, ln, vw in RIFF:
        if s // 16 == bar % 2:
            v = {"intro": 0.34, "stare": 0.2, "drop": 0.42, "explain": 0.3}[s_]
            S.add(chop(m, ln * S16 * 0.95, vw, v), bt(bar, s % 16), [-0.25, 0.25][(s // 2) % 2], "chop")
    if s_ == "stare":
        last = bar == 5
        for s in (0, 8): S.add(kick(0.8), bt(bar, s), 0, "drums"); kicks.append(bt(bar, s))          # heartbeat on each second
        for s in (2, 10): S.add(kick(0.45), bt(bar, s), 0, "drums")
        for s in range(0, 16, 4): S.add(tick(0.15), bt(bar, s), [-0.5, 0.5][(s // 4) % 2], "drums")   # clock
        S.add(logdrum(r - 12, BEAT * 1.8, 0.3), bt(bar, 0), 0, "bass")
        S.add(pad(ch, BAR, 0.018 + 0.004 * (bar - 1)), bt(bar), 0, "pads")
        if bar == 4:
            for s in range(0, 16, 2): S.add(snr(0.07 + s * 0.006, seed=s), bt(bar, s), 0, "drums")
        if last:
            for s in range(0, 8): S.add(snr(0.13 + s * 0.008, seed=20 + s), bt(bar, s), 0, "drums")
            for k in range(12): S.add(snr(0.18 + k * 0.008, seed=40 + k), bt(bar, 8) + k * S16 / 2, 0, "drums")   # 32nds, stops before the drop
    else:
        full = s_ in ("drop", "intro")
        for s in (0, 4, 8, 12): S.add(kick(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
        for s in (4, 12): S.add(clap(0.3 if full else 0.22, seed=bar * 2 + s), bt(bar, s), 0.05, "drums")
        for s in range(16):
            if s % 2 == 0 or full: S.add(hat([0.04, 0.015, 0.03, 0.015][s % 4], seed=700 + bar * 16 + s, long=(s == 14)), bt(bar, s), [-0.3, 0.3][s % 2], "drums")
        for s, m, ln in ((0, r - 12, 3), (3, r - 12, 2), (6, r, 2), (10, r - 12, 3), (13, r - 5, 2)):       # log-drum bassline
            S.add(logdrum(m, ln * S16 * 0.95, 0.4 if full else 0.34), bt(bar, s), 0, "bass")
        S.add(pad(ch, BAR, 0.02), bt(bar), 0, "pads")
        for s in (2, 6, 10, 14): S.add(pluck(ch[(s // 4) % 3] + 12, 0.045), bt(bar, s), [0.5, -0.5][(s // 4) % 2], "keys")
# the game sounds are part of the song
SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79]
for i, t in enumerate(secs): S.add(blip(SCALE[i] + 12, 0.12 + i * 0.008), t, [-0.4, 0.4][i % 2], "keys")
S.add(riser(BAR * 2, 0.08), bt(4)); S.add(impact(0.55), REVEAL, 0, "fx")
for L in levels:
    for k, m in enumerate((69, 72, 76, 81)): S.add(blip(m + 12, 0.11, 0.3), L + k * S16, [-0.3, 0.3][k % 2], "keys")
for i, t in enumerate(tired): S.add(blip([81, 79, 76, 74, 72, 69, 67, 64][i], 0.1, 0.35), t + 2 * S16, 0.3, "keys")
S.add(riser(BAR, 0.05, seed=9), bt(17))
S.delay("chop", BEAT * 0.75, fb=0.32, mix=0.2); S.delay("keys", BEAT * 0.5, fb=0.3, mix=0.2)
S.sidechain("bass", kicks, 0.35); S.sidechain("pads", kicks, 0.5); S.sidechain("chop", kicks, 0.15)
S.reverb("chop", 0.22, 1.4, 21); S.reverb("keys", 0.25, 1.6, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.1, 0.9, 51); S.reverb("fx", 0.3, 1.5, 61)
S.save(ROOT / "public/videos/18-afterimage/music.wav", gains={"drums": 1.0, "bass": 0.95, "chop": 1.0, "keys": 0.9, "pads": 0.8, "fx": 0.9})
print(f"afterimage: {DUR:.3f} s")
