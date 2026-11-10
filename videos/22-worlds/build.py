"""Video 022 · CHOOSE A WORLD TO SURVIVE ON FOR 1 YEAR — a "pick one, comment it" video (reference: Helmet Simulations'
"Choose a world to survive on for two years"), in our pixel style and with real planetary science in every line.
40 s seamless loop, 90 BPM dreamy half-time synth (15 bars, 2.667 s each): warm pads, deep sub, slow arps, soft drums.
The menu has its own 4-note jingle (the cursor hopping over worlds 01-04 = the earworm), each world has its own chord
and instrument (Mars: lonely whistle · Venus: shimmering bells · Titan: slow methane-drop plucks · Europa: cold bells +
Geiger clicks), and every caption types in with soft ticks.

Timeline (bars): 0-1.5 menu "choose a world" · 1.5 MARS · 4.5 VENUS (55 km up) · 7.5 TITAN · 10.5 EUROPA (3 bars each,
one caption per bar) · 13.5-15 menu again: "comment 01 02 03 04" (loop).
Writes remotion/src/videos/worlds/worlds.json + public/videos/22-worlds/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 90, 15
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(22)

W = [bt(1, 8), bt(4, 8), bt(7, 8), bt(10, 8)]; END = bt(13, 8)
caps = [[w + 0.25, w + BAR, w + 2 * BAR] for w in W]                                   # 3 captions per world
cursor = [k * BEAT for k in range(6)] + [END + k * BEAT for k in range(6)]             # menu cursor hops (one per beat)
drops = [W[2] + 0.5 + k * BEAT * 1.5 for k in range(5)]                                # Titan: slow methane drops
geiger = sorted(float(W[3] + 0.3 + x) for x in rng.random(34) ** 0.8 * (3 * BAR - 0.6))  # Europa: radiation clicks
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "w": W, "end": END, "caps": caps, "cursor": cursor, "drops": drops, "geiger": geiger}
(ROOT / "remotion/src/videos/worlds/worlds.json").write_text(json.dumps(ev))

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

def softkick(vol=0.8):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(42 + 70 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.3) * vol
def softsn(vol=0.14, seed=0):
    n = int(0.35 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.05) * 0.4 + lp(hp(noise(0.35, 1.0, 0.35, rate=44100, seed=seed)[:n], 800), 4500) * np.exp(-t / 0.12)) * vol
def warm(notes, dur, vol=0.03, cut=1200):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.007, 0.0, 0.007):
            ph = hz(m) * (1 + d) * t + rng.random(); x += 2 * (ph % 1) - 1
    return lp(lp(x, cut), cut) * vol * np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)
def subb(midi, dur, vol=0.4):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * hz(midi) * t) + 0.15 * np.sin(2 * np.pi * 2 * hz(midi) * t)) * vol * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.1, 0, 1)
def bellc(midi, vol=0.07, dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t + 1.6 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.3)) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.5)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.55)
def whistle(midi, dur, vol=0.07, slide=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * np.ones(n)
    if slide is not None: f = hz(midi) + (hz(slide) - hz(midi)) * np.exp(-t / 0.08)
    f = f * (1 + 0.01 * np.sin(2 * np.pi * 5 * t) * np.clip((t - 0.15) / 0.3, 0, 1)); ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) + 0.1 * np.sin(2 * np.pi * 2 * ph)) * vol * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.15, 0, 1)
def dropn(midi, vol=0.12):
    n = int(0.9 * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 0.6 * np.exp(-t / 0.03))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.22)
def wind(dur, vol=0.03, seed=5):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(hp(noise(dur, 1.0, dur, rate=44100, seed=seed)[:n], 250), 1100)
    return x * vol * (0.5 + 0.5 * np.sin(2 * np.pi * t / dur * 1.5 - 1.2)) * np.clip(t / 0.8, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)
def gclick(vol=0.05):
    n = int(0.012 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 3400 * t) * np.exp(-t / 0.0018) * vol
def select(vol=0.13):
    out = np.zeros(int(0.7 * SR))
    for k, m in enumerate((81, 88)):
        s = blip(m, vol, 0.5); o = int(k * 0.09 * SR); out[o:o + len(s)] += s
    return out

S = StereoSong(BPM, BARS)
# section per half-bar index (30 halves): menu(3) + 4 worlds x 6 + menu(3)
CHORD = {"menu": ([62, 65, 69, 72, 76], 38), "mars": ([62, 65, 69, 76], 38), "venus": ([58, 62, 65, 69, 72], 34), "titan": ([55, 58, 62, 65, 69], 31), "europa": ([57, 62, 64, 69, 71], 33)}
def sec_at(t): return "menu" if t < W[0] or t >= END else "mars" if t < W[1] else "venus" if t < W[2] else "titan" if t < W[3] else "europa"
kicks = []
for hb in range(BARS * 2):
    t0 = hb * BAR / 2; s_ = sec_at(t0 + 0.01); ch, root = CHORD[s_]
    S.add(warm(ch, BAR / 2 + 0.5, 0.03, 1000 if s_ in ("europa", "titan") else 1500), t0, -0.3, "pads")
    S.add(warm([m + 12 for m in ch[:3]], BAR / 2 + 0.5, 0.012, 2200), t0, 0.3, "pads")
    S.add(subb(root, BAR / 2 * 0.95, 0.36), t0, 0, "bass")
    # half-time drums: kick on 1, soft snare on 3
    if hb % 2 == 0: S.add(softkick(), t0, 0, "drums"); kicks.append(t0); S.add(softkick(0.5), t0 + BEAT * 1.5, 0, "drums")
    else: S.add(softsn(0.15, seed=hb), t0, 0.05, "drums")
    for k in range(4): S.add(hat(0.016 if k % 2 else 0.026, seed=800 + hb * 4 + k), t0 + k * BEAT / 2, [-0.3, 0.3][k % 2], "drums")
    # slow arp (8ths), each world its own instrument
    for k in range(4):
        m = ch[(hb * 4 + k) % len(ch)] + 12; tt = t0 + k * BEAT / 2
        if s_ == "menu": S.add(pluck(m, 0.045, 0.5), tt, [-0.4, 0.4][k % 2], "keys")
        elif s_ == "mars" and k % 2 == 0: S.add(pluck(m, 0.035, 0.6), tt, [-0.4, 0.4][(k // 2) % 2], "keys")
        elif s_ == "venus": S.add(bellc(m + (12 if k == 3 else 0), 0.04, 1.2), tt, [-0.5, 0.5][k % 2], "keys")
        elif s_ == "europa" and k % 2 == 0: S.add(bellc(m + 12, 0.035, 2.0), tt, [-0.5, 0.5][(k // 2) % 2], "keys")
# the menu jingle: the cursor hops over 01-04 (the earworm)
JING = [74, 77, 81, 84, 81, 77]
for i, t in enumerate(cursor): S.add(blip(JING[i % 6], 0.12, 0.3), t, [-0.3, 0.3][i % 2], "lead"); S.add(chop(JING[i % 6], BEAT * 0.45, "ao"[i % 2], 0.18), t, 0, "lead")
# entering a world: confirm sound + a soft whoosh before
for w in W + [END]: S.add(select(), w, 0, "lead"); S.add(riser(BEAT * 2, 0.035, seed=int(w * 7)), w - BEAT * 2); S.add(impact(0.3), w, 0, "fx")
# Mars: a lonely whistle + wind
for s, m, ln, sl in ((2, 74, 6, None), (10, 77, 4, 76), (16, 81, 10, None), (30, 79, 6, 81), (38, 74, 9, 76)):
    S.add(whistle(m, ln * S16 * 0.95, 0.06, sl), W[0] + s * S16, 0.1, "lead")
S.add(wind(3 * BAR, 0.035), W[0], 0, "fx")
# Venus: a rising shimmer
for k, m in enumerate((82, 86, 89, 93, 89, 86)): S.add(bellc(m, 0.05, 2.0), W[1] + BEAT + k * BEAT * 2, [-0.6, 0.6][k % 2], "lead")
# Titan: each slow methane drop is a note
for i, t in enumerate(drops): S.add(dropn([67, 70, 74, 77, 79][i], 0.13), t, [-0.5, 0.5][i % 2], "lead")
for s, m, ln in ((4, 67, 10), (20, 70, 10), (36, 74, 10)): S.add(whistle(m - 12, ln * S16, 0.035), W[2] + s * S16, -0.1, "lead")
# Europa: Geiger clicks + a cold slow melody
for i, t in enumerate(geiger): S.add(gclick(0.05 + 0.03 * rng.random()), t, float(rng.random() * 1.6 - 0.8), "fx2")
for k, m in enumerate((76, 81, 83, 88, 86, 81)): S.add(bellc(m, 0.055, 2.4), W[3] + BEAT + k * BEAT * 2, [-0.4, 0.4][k % 2], "lead")
# captions type in with soft ticks
for cs in caps:
    for c in cs:
        for k in range(8): S.add(tick(0.025), c + k * 0.085, [-0.2, 0.2][k % 2], "fx2")
S.delay("lead", BEAT * 0.75, fb=0.42, mix=0.3); S.delay("keys", BEAT * 0.5, fb=0.35, mix=0.2)
S.sidechain("bass", kicks, 0.3); S.sidechain("pads", kicks, 0.35)
S.reverb("lead", 0.4, 2.6, 21); S.reverb("keys", 0.35, 2.2, 31); S.reverb("pads", 0.4, 2.8, 41); S.reverb("drums", 0.15, 1.2, 51); S.reverb("fx", 0.3, 1.8, 61)
S.save(ROOT / "public/videos/22-worlds/music.wav", gains={"drums": 0.9, "bass": 1.0, "lead": 1.0, "keys": 0.9, "pads": 0.9, "fx": 0.9, "fx2": 1.0})
print(f"worlds: {DUR:.3f} s")
