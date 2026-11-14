"""Video 027 · How a 2-stroke engine works — pixel-art cross-section (LSD / ChameleonK flat look), 40.6 s seamless
loop, 130 BPM big beat (22 bars): a funky breakbeat, slap-ish bass, brass stabs, organ, and a "ring-ding-ding" pluck
riff (the earworm, named after the 2-stroke sound). The ENGINE PLAYS THE DRUMS: every ignition (each time the piston
reaches the top) is a "bang" hit + an exhaust "ding"; during the slow-motion revolutions each bang is a big hit.

Crank plan (revolutions are integers per section so the crank lands on top-dead-centre at every boundary and the loop
is seamless): 0-2 hook 1 rev/beat · 2-4 intro 1 rev · 4-8 slow rev A (power + compression) · 8-12 slow rev B (ports +
expansion chamber) · 12-14 compare 1 rev/beat · 14-16 the catch (oil smoke) 1 rev/beat · 16-19 rev-up 6 rev/beat ·
19-22 hook 1 rev/beat. Writes remotion/src/videos/twostroke/twostroke.json + public/videos/27-twostroke/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 130, 22
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(27)

SECTIONS = [("hook", 0, 2, 8), ("intro", 2, 4, 1), ("revA", 4, 8, 1), ("revB", 8, 12, 1), ("compare", 12, 14, 8), ("smoke", 14, 16, 8), ("revup", 16, 19, 72), ("hook2", 19, 22, 12)]
crank, rev, ign = [], 0, []
for name, b0, b1, n in SECTIONS:
    t0, t1 = bt(b0), bt(b1)
    crank.append({"name": name, "t0": t0, "t1": t1, "r0": rev, "r1": rev + n})
    if name != "revup":
        for k in range(n): ign.append(round(t0 + (t1 - t0) * k / n, 5))
    rev += n
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "crank": crank, "ign": ign, "revs": rev}
(ROOT / "remotion/src/videos/twostroke/twostroke.json").write_text(json.dumps(ev))
print("total revs", rev, "ignitions", len(ign))

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

def bigkick(vol=0.9):
    n = int(0.45 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(48 + 120 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.22)
    c = hp(noise(0.005, 1.0, 0.002, rate=44100, seed=1), 2500); out[:len(c)] += c * 0.3
    return out * vol
def bang(vol=0.5, big=False):
    """an engine 'bang': a punchy low thud + a short exhaust bark"""
    n = int((0.5 if big else 0.18) * SR); t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * np.cumsum(55 + 140 * np.exp(-t / 0.02)) / SR) * np.exp(-t / (0.2 if big else 0.07))
    bark = lp(hp(noise(n / SR, 1.0, n / SR, rate=44100, seed=5)[:n], 300), 2500) * np.exp(-t / (0.06 if big else 0.025))
    return (thud * 0.8 + bark * 0.5) * vol
def ding(midi, vol=0.08):
    n = int(0.35 * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.05)) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.1)
def bsnare(vol=0.3, seed=0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(200 + 60 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.05) * 0.55
    nz = lp(hp(noise(0.25, 1.0, 0.25, rate=44100, seed=seed)[:n], 1500), 8000) * np.exp(-t / 0.08)
    return (body + nz * 0.75) * vol
def fbass(midi, dur, vol=0.32):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 0.3 * np.exp(-t / 0.008)); ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.35 * lp(2 * (ph % 1) - 1, 1600) + 0.2 * np.sin(2 * np.pi * 3 * ph) * np.exp(-t / 0.04)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / (dur * 0.8)) * np.clip((dur - t) / 0.02, 0, 1)
def bstab(notes, dur=0.22, vol=0.06):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.006, 0.0, 0.006): ph = hz(m) * (1 + d) * t + rng.random(); x += 2 * (ph % 1) - 1
    return lp(x, 2800 + 2000 * np.exp(-t / 0.05).mean()) / len(notes) * vol * 3 * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.09)
def organ(notes, dur, vol=0.02):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.3 * np.sin(2 * np.pi * 3 * f * t)
    x *= 1 + 0.15 * np.sin(2 * np.pi * 6 * t)
    return x / len(notes) * vol * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
def buzz(f0, f1, dur, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / dur); ph = np.cumsum(f) / SR
    x = lp(2 * (ph % 1) - 1, 1800) + 0.4 * np.sin(2 * np.pi * ph * 0.5)
    return x * vol * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)

S = StereoSong(BPM, BARS)
CH = [[64, 67, 71], [62, 67, 71], [60, 64, 67], [62, 66, 69]]; RT = [40, 43, 36, 38]          # Em - G - C - D
RING = [(0, 76), (2, 79), (3, 79), (8, 76), (10, 81), (11, 79)]                                 # "ring-ding-ding" x2 per bar
sec_of = lambda bar: next(c["name"] for c in crank if c["t0"] <= bt(bar) + 1e-6 < c["t1"])
kicks = []
for bar in range(BARS):
    s_ = sec_of(bar); r = RT[bar % 4]; ch = CH[bar % 4]
    slow = s_ in ("intro", "revA", "revB")
    full = s_ in ("hook", "hook2", "compare", "smoke", "revup")
    # breakbeat
    for s in ((0, 10) if not slow else (0,)):
        S.add(bigkick(0.8 if full else 0.6), bt(bar, s), 0, "drums"); kicks.append(bt(bar, s))
    for s in (4, 12):
        if not slow or s == 12: S.add(bsnare(0.3 if full else 0.2, seed=bar * 2 + s), bt(bar, s), 0.05, "drums")
    if full:
        for s in (7, 15): S.add(bsnare(0.08, seed=bar + s), bt(bar, s), -0.1, "drums")
    for s in range(0, 16, 2): S.add(hat(0.032 if s % 4 == 2 else 0.02, seed=900 + bar * 16 + s, long=(s == 14 and full)), bt(bar, s), 0.3, "drums")
    # funky bass
    for s, m, ln in ((0, r, 3), (3, r + 12, 1), (6, r, 2), (8, r + 7, 2), (10, r + 10, 1), (11, r + 12, 2), (14, r + 7, 2)):
        if not slow or s in (0, 8): S.add(fbass(m, ln * S16 * 0.92, 0.3 if full else 0.24), bt(bar, s), 0, "bass")
    S.add(organ([m + 12 for m in ch], BAR, 0.016 if slow else 0.02), bt(bar), -0.3, "keys")
    if full:
        for s in (2, 14): S.add(bstab([m + 12 for m in ch], 0.18, 0.055), bt(bar, s), 0.3, "brass")
        for s, m in RING: S.add(pluck(m + (2 if bar % 4 == 3 else 0), 0.06, 0.3), bt(bar, s), [-0.35, 0.35][s % 2], "keys")
    if s_ in ("hook", "hook2", "compare"):
        for s, m in ((0, 79), (3, 76), (6, 81), (8, 79)):
            if bar % 2 == 0: S.add(chop(m, S16 * 2.4, "ae"[s % 2], 0.26), bt(bar, s), 0, "chop")
# the engine plays the drums
for t in ign:
    sec = next(c["name"] for c in crank if c["t0"] <= t + 1e-6 < c["t1"])
    big = sec in ("intro", "revA", "revB")
    S.add(bang(0.55 if big else 0.32, big), t, 0, "fx"); S.add(ding(88 if not big else 84, 0.06 if not big else 0.1), t + S16 * 0.5, 0.25, "fx")
    if big: S.add(impact(0.35), t, 0, "fx")
ru = next(c for c in crank if c["name"] == "revup")
S.add(buzz(60, 170, ru["t1"] - ru["t0"] - BEAT, 0.06), ru["t0"], 0, "fx")
S.add(riser(BAR, 0.05, seed=3), bt(1)); S.add(riser(BAR, 0.05, seed=4), bt(18))
S.delay("keys", BEAT * 0.75, fb=0.28, mix=0.15); S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.18)
S.sidechain("bass", kicks, 0.25); S.sidechain("keys", kicks, 0.2)
S.reverb("keys", 0.2, 1.4, 21); S.reverb("brass", 0.18, 1.2, 22); S.reverb("chop", 0.22, 1.4, 23); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.22, 1.3, 61)
S.save(ROOT / "public/videos/27-twostroke/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.9, "brass": 0.95, "chop": 0.95, "fx": 1.0})
print(f"twostroke: {DUR:.3f} s")
