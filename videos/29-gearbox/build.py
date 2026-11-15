"""Video 029 · What happens inside a manual gearbox when you change gear — same slick 3D toon-pixel neon look as the
Wankel video. 40.3 s seamless loop, 155 BPM EUROBEAT (26 bars, the drift / Initial D sound): driving octave bass,
16th synth arps, offbeat open hats, a bright lead hook, orchestra-hit stabs. Every gear change is a hit; during the
"full send" section each upshift is a classic Eurobeat key change (+1 semitone), back to the home key for the loop.

Timeline (bars, 1.548 s): 0-2 hook (shifts 1-2-3-1) · 2-4 engine → clutch → gearbox → wheels · 4-6 every gear is always
meshed, spinning free on the output shaft · 6-8 the stick slides a collar that locks ONE gear to the shaft · 8-10 the
synchro cone matches speeds first (no grinding) · 10-12 1st: small drives big = 2.0x the push · 12-14 top gear: big
drives small · 14-16 the clutch unplugs the engine while you switch · 16-18 grind = the synchro lost · 18-22 full send
(1-2-3, key changes) · 22-26 hook again (loop).
Writes remotion/src/videos/gearbox/gearbox.json + public/videos/29-gearbox/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 155, 26
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(29)

L = [bt(b) for b in (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 22)]
# gear state over time: (time, gear) — 0 = neutral; slow-motion shifts in the explanation, fast ones in hook / full send
shifts = [(0.0, 1), (bt(0, 8), 2), (bt(1, 0), 3), (bt(1, 8), 1),
          (bt(4, 0), 0), (bt(6, 8), 1), (bt(8, 0), 0), (bt(9, 0), 2), (bt(10, 0), 1), (bt(12, 4), 3), (bt(14, 4), 0), (bt(15, 0), 2),
          (bt(16, 4), 0), (bt(17, 0), 3),
          (bt(18, 0), 1), (bt(19, 0), 2), (bt(20, 0), 3), (bt(21, 8), 1),
          (bt(22, 0), 1), (bt(22, 8), 2), (bt(23, 0), 3), (bt(23, 8), 1), (bt(24, 0), 1), (bt(24, 8), 2), (bt(25, 0), 3), (bt(25, 8), 1)]
hits = [t for t, g in shifts[1:]]
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "l": L, "shifts": shifts, "grind": bt(16, 8), "clutch": [bt(14, 0), bt(15, 4)]}
(ROOT / "remotion/src/videos/gearbox/gearbox.json").write_text(json.dumps(ev))

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

def ekick(vol=0.85):
    n = int(0.3 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(55 + 150 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.15)
    c = hp(noise(0.004, 1.0, 0.002, rate=44100, seed=1), 3000); out[:len(c)] += c * 0.3
    return out * vol
def esnare(vol=0.28, seed=0):
    n = int(0.2 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(220 + 60 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.04) * 0.5 + lp(hp(noise(0.2, 1.0, 0.2, rate=44100, seed=seed)[:n], 1500), 9000) * np.exp(-t / 0.07)) * vol
def obass(midi, dur, vol=0.28):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi); x = np.zeros(n)
    for d in (-0.004, 0.004): ph = f * (1 + d) * t + rng.random(); x += 2 * (ph % 1) - 1
    return (lp(x, 1400) * (0.6 + 0.4 * np.exp(-t / 0.05)) + 0.5 * np.sin(2 * np.pi * f * t)) * vol * np.clip(t / 0.002, 0, 1) * np.clip((dur - t) / 0.015, 0, 1)
def sarp(midi, vol=0.035):
    n = int(0.11 * SR); t = np.arange(n) / SR; f = hz(midi)
    return lp(np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + (2 * ((f * t) % 1) - 1) * 0.5, 5000) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.05)
def lead(midi, dur, vol=0.06):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for d in (-0.008, 0.0, 0.008):
        f = hz(midi) * (1 + d) * (1 + 0.005 * np.sin(2 * np.pi * 6 * t) * np.clip((t - 0.1) / 0.2, 0, 1)); ph = np.cumsum(f) / SR + rng.random(); x += 2 * (ph % 1) - 1
    return lp(x, 4200) / 3 * vol * np.clip(t / 0.005, 0, 1) * np.clip((dur - t) / 0.04, 0, 1)
def orch(notes, vol=0.08):
    n = int(0.5 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.01, 0.0, 0.01): ph = hz(m) * (1 + d) * t + rng.random(); x += 2 * (ph % 1) - 1
    x += lp(noise(0.5, 1.0, 0.5, rate=44100, seed=3)[:n], 3000) * 2
    return lp(x, 3500) / (len(notes) * 3) * vol * 3 * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.18)
def clunk(vol=0.3):
    n = int(0.15 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(180 + 400 * np.exp(-t / 0.006)) / SR) * np.exp(-t / 0.04) + hp(noise(0.15, 1.0, 0.02, rate=44100, seed=4)[:n], 2500) * 0.5) * vol
def grindn(dur, vol=0.12):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(hp(noise(dur, 1.0, dur, rate=44100, seed=6)[:n], 1500), 6000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 37 * t)))
    return x * vol * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)

S = StereoSong(BPM, BARS)
# A minor Eurobeat: Am - F - G - Em ; full-send section transposes +1 per upshift
CH = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]; RT = [33, 29, 31, 28]
HOOK = [(0, 76), (2, 76), (3, 79), (4, 81), (6, 79), (8, 76), (10, 74), (11, 76), (12, 72), (14, 74)]
def section(b):
    if b < 2 or b >= 22: return "hook"
    if b < 4: return "path"
    if b < 18: return "explain"
    return "send"
def transpose(t):
    if not (bt(18) <= t < bt(22)): return 0
    g = [gg for tt, gg in shifts if tt <= t][-1]
    return {1: 0, 2: 1, 3: 2}.get(g, 0) if t < bt(21, 8) else 0
kicks = []
for bar in range(BARS):
    s_ = section(bar); ch = CH[bar % 4]; r = RT[bar % 4]
    full = s_ in ("hook", "send")
    for s in range(16):
        t = bt(bar, s); tr = transpose(t)
        if s % 4 == 0 and (full or s_ == "path" or s in (0, 8)): S.add(ekick(0.85 if full else 0.65), t, 0, "drums"); kicks.append(t)
        if s % 8 == 4 and s_ != "explain" or (s_ == "explain" and s == 12): S.add(esnare(0.28 if full else 0.2, seed=bar * 16 + s), t, 0.05, "drums")
        if s % 4 == 2: S.add(hat(0.05 if full else 0.032, seed=900 + bar * 16 + s, long=True), t, 0.3, "drums")
        if s % 2 == 0 and (full or s_ == "path" or s % 4 == 0): S.add(obass(r + tr + (12 if (s // 2) % 2 else 0), S16 * 1.8, 0.28 if full else 0.22), t, 0, "bass")
        if full or s_ == "path": S.add(sarp(ch[[0, 1, 2, 1][s % 4]] + 24 + tr, 0.035 if full else 0.025), t, [-0.5, 0.5][s % 2], "keys")
    S.add(pad([m + transpose(bt(bar)) for m in ch], BAR, 0.018), bt(bar), 0, "pads")
    if full:
        for s, m in HOOK: S.add(lead(m + transpose(bt(bar, s)), S16 * 1.9, 0.06), bt(bar, s), 0, "lead")
    if s_ == "explain" and bar % 2 == 1:
        for s, m in HOOK[:5]: S.add(lead(m - 12, S16 * 1.9, 0.035), bt(bar, s), 0, "lead")
# every shift is a hit: a mechanical clunk + an orchestra stab (big ones in slow motion)
for t in hits:
    big = bt(4) <= t < bt(18)
    S.add(clunk(0.3 if big else 0.2), t, 0, "fx")
    if big or bt(18) <= t < bt(22): S.add(orch([m + transpose(t + 0.01) + 12 for m in CH[int(t / BAR) % 4]], 0.09 if big else 0.07), t, 0, "fx")
S.add(grindn(BEAT * 1.5, 0.12), ev["grind"], 0, "fx")
S.add(riser(BAR, 0.05, seed=3), bt(17)); S.add(riser(BAR, 0.05, seed=5), bt(1))
S.delay("lead", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("keys", BEAT * 0.5, fb=0.25, mix=0.12)
S.sidechain("bass", kicks, 0.3); S.sidechain("pads", kicks, 0.5); S.sidechain("keys", kicks, 0.15)
S.reverb("lead", 0.25, 1.6, 21); S.reverb("keys", 0.18, 1.3, 31); S.reverb("pads", 0.35, 2.2, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.25, 1.4, 61)
S.save(ROOT / "public/videos/29-gearbox/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.9, "lead": 1.0, "pads": 0.8, "fx": 1.0})
print(f"gearbox: {DUR:.3f} s")
