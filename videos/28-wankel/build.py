"""Video 028 · How the Mazda rotary (Wankel) engine works — slick 3D toon-pixel look (real 3D parts, outlines, neon rim
lights), 41.4 s seamless loop, 116 BPM future funk / city pop (20 bars): four-on-the-floor, disco hats, slap bass,
filtered chopped chords, a vocal-chop hook, string stabs. The engine drives the music: each ignition in the slow-motion
sections is a big hit, and the filter on the chords opens with the shaft speed.

Shaft plan (integer revolutions per section, total a multiple of 3 so the rotor returns to the same orientation and the
loop is seamless): 0-2 hook 8 · 2-4 exploded view "3 moving parts" 2 · 4-8 slow cycle 3 (= 1 rotor turn) · 8-10 three
bangs per rotor turn 6 · 10-12 gears: shaft 3x faster 3 · 12-14 the catch (apex seals, oil) 6 · 14-16 Le Mans 1991 9 ·
16-18 rev-up 24 · 18-20 hook 8.  Writes remotion/src/videos/wankel/wankel.json + public/videos/28-wankel/music.wav.
"""
import json, math, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 116, 20
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(28)

SECTIONS = [("hook", 0, 2, 8), ("parts", 2, 4, 2), ("cycle", 4, 8, 3), ("three", 8, 10, 6), ("gears", 10, 12, 3), ("catch", 12, 14, 6), ("lemans", 14, 16, 9), ("revup", 16, 18, 24), ("hook2", 18, 20, 8)]
shaft, rev = [], 0
for name, b0, b1, n in SECTIONS:
    shaft.append({"name": name, "t0": bt(b0), "t1": bt(b1), "r0": rev, "r1": rev + n}); rev += n
assert rev % 3 == 0, rev
def revs_at(t):
    for s in shaft:
        if s["t0"] <= t < s["t1"]: return s["r0"] + (t - s["t0"]) / (s["t1"] - s["t0"]) * (s["r1"] - s["r0"])
    return shaft[-1]["r1"]
# ignition: a chamber centre (rotor angle + 60 deg + k*120 deg) crosses 90 deg (the spark plugs, right side)
ign, prev = [], None
for i in range(int(DUR * 2000)):
    t = i / 2000; ra = (revs_at(t) / 3 * 360) % 360
    phases = [((ra + 60 + 120 * k) % 360) for k in range(3)]
    if prev is not None:
        for p0, p1 in zip(prev, phases):
            if p0 < 90 <= p1: ign.append(round(t, 4))
    prev = phases
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "shaft": shaft, "ign": ign, "revs": rev}
(ROOT / "remotion/src/videos/wankel/wankel.json").write_text(json.dumps(ev))
print("revs", rev, "ignitions", len(ign))

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

def hkick(vol=0.85):
    n = int(0.4 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-t / 0.028)) / SR) * np.exp(-t / 0.22)
    c = hp(noise(0.004, 1.0, 0.002, rate=44100, seed=1), 3000); out[:len(c)] += c * 0.25
    return out * vol
def slap(midi, dur, vol=0.33):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 0.5 * np.exp(-t / 0.012)); ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.4 * lp(2 * (ph % 1) - 1, 1800) + 0.25 * np.sin(2 * np.pi * 3 * ph) * np.exp(-t / 0.03)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / (dur * 0.75)) * np.clip((dur - t) / 0.02, 0, 1)
def chops(notes, dur, cut, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += np.sin(2 * np.pi * f * t + 1.1 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.2)) + 0.4 * np.sin(2 * np.pi * 2 * f * t)
    return lp(lp(x, cut), cut) / len(notes) * vol * 3 * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.25) * np.clip((dur - t) / 0.03, 0, 1)
def strings(notes, dur=0.3, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.006, 0.006): ph = hz(m) * (1 + d) * t + rng.random(); x += 2 * (ph % 1) - 1
    return lp(x, 3200) / len(notes) * vol * 2 * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.12)
def bigbang(vol=0.5):
    n = int(0.6 * SR); t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * np.cumsum(50 + 160 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.22)
    bark = lp(hp(noise(0.6, 1.0, 0.6, rate=44100, seed=9)[:n], 250), 3000) * np.exp(-t / 0.07)
    return (thud * 0.8 + bark * 0.45) * vol
def brap(midi, vol=0.06):
    n = int(0.12 * SR); t = np.arange(n) / SR; f = hz(midi)
    return lp(np.sign(np.sin(2 * np.pi * f * t)), 2500) * vol * np.exp(-t / 0.04)
def whine(f0, f1, dur, vol=0.045):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / dur); ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) + 0.3 * lp(2 * (ph % 1) - 1, 2500)) * vol * np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.1, 0, 1)

S = StereoSong(BPM, BARS)
# future funk: Fmaj7 - Em7 - Dm7 - Cmaj7 (IV-iii-ii-I in C), bright 7ths
CH = [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]]; RT = [41, 40, 38, 36]
HOOK = [(0, 79), (2, 81), (3, 79), (6, 76), (8, 74), (10, 76), (11, 79), (14, 72)]
sec = lambda bar: next(s["name"] for s in shaft if s["t0"] <= bt(bar) + 1e-6 < s["t1"])
speed = lambda bar: next((s["r1"] - s["r0"]) / ((s["t1"] - s["t0"]) / BAR) for s in shaft if s["t0"] <= bt(bar) + 1e-6 < s["t1"])
kicks = []
for bar in range(BARS):
    s_ = sec(bar); ch = CH[bar % 4]; r = RT[bar % 4]; sp = speed(bar)
    slow = s_ in ("parts", "cycle", "gears")
    cut = 900 + min(1, sp / 6) * 3500                                                       # the filter follows the shaft speed
    for s in (0, 4, 8, 12):
        if not slow or s in (0, 8): S.add(hkick(0.8 if not slow else 0.6), bt(bar, s), 0, "drums"); kicks.append(bt(bar, s))
    for s in (4, 12): S.add(clap(0.22 if not slow else 0.14, seed=bar * 2 + s), bt(bar, s), 0.05, "drums")
    for s in range(16):
        if s % 4 == 2: S.add(hat(0.045, seed=900 + bar * 16 + s, long=True), bt(bar, s), 0.3, "drums")
        elif not slow: S.add(hat(0.016, seed=1100 + bar * 16 + s), bt(bar, s), -0.3, "drums")
    for s, d, ln in ((0, 0, 2), (3, 12, 1), (4, 0, 2), (7, 12, 1), (8, 7, 2), (10, 10, 1), (11, 12, 2), (14, 7, 2)):
        if not slow or s in (0, 8): S.add(slap(r + d, ln * S16 * 0.9, 0.32 if not slow else 0.24), bt(bar, s), 0, "bass")
    for s in (0, 3, 6, 10, 12):                                                             # chopped, filtered chords (the city-pop sample feel)
        S.add(chops([m + 12 for m in ch], S16 * (2.5 if s != 12 else 3.5), cut, 0.05), bt(bar, s), [-0.3, 0.3][s % 2], "keys")
    S.add(pad(ch, BAR, 0.014), bt(bar), 0, "pads")
    if s_ in ("hook", "hook2", "lemans", "three", "catch"):
        for s, m in HOOK: S.add(chop(m + (2 if bar % 4 == 2 else 0), S16 * 1.8, "ao"[s % 2], 0.3), bt(bar, s), 0, "chop")
        if bar % 2 == 1: S.add(strings([m + 24 for m in ch[:3]], 0.25, 0.05), bt(bar, 14), 0.2, "keys")
# the engine
for t in ign:
    s_ = next(s["name"] for s in shaft if s["t0"] <= t < s["t1"] + 1e-6)
    if s_ in ("parts", "cycle", "gears"): S.add(bigbang(0.45), t, 0, "fx"); S.add(impact(0.25), t, 0, "fx")
    elif s_ in ("three", "catch"): S.add(brap(52, 0.05), t, 0.2, "fx")
ru = next(s for s in shaft if s["name"] == "revup")
S.add(whine(90, 300, ru["t1"] - ru["t0"] - BEAT / 2, 0.05), ru["t0"], 0, "fx")
S.add(riser(BAR, 0.05, seed=3), bt(1)); S.add(riser(BAR, 0.05, seed=4), bt(17))
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("keys", BEAT * 0.5, fb=0.25, mix=0.12)
S.sidechain("bass", kicks, 0.3); S.sidechain("keys", kicks, 0.45); S.sidechain("pads", kicks, 0.5)
S.reverb("chop", 0.25, 1.6, 21); S.reverb("keys", 0.22, 1.5, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.22, 1.3, 61)
S.save(ROOT / "public/videos/28-wankel/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "chop": 0.95, "pads": 0.8, "fx": 1.0})
print(f"wankel: {DUR:.3f} s")
