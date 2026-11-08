"""Video 014 · Air fryer — v2 soundtrack: a real stereo nu-disco / funk-house production, 120 BPM, 15 bars = 30 s, loop.
Layered drums with swing (kick click+body+sub, clap+snare with room, swung hats, shaker, congas), a funky octave
bassline, Rhodes chords with auto-pan, lush strings, a catchy whistle hook with ping-pong delay. Clean (no distortion).
Sections: 0-2 hook · 3-4 heater (lighter) · 5-6 groove (hot air) · 7-8 macro: glassy, "bloop" per water molecule ·
build · 9-10 DROP: a sparkle per golden fry · 11-12 groove + DING · 13-14 hook (loop). Same events as airfryer.json.
Writes public/videos/14-airfryer/music_v2.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from hyper import clap  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

EV = json.loads((ROOT / "remotion/src/videos/airfryer/airfryer.json").read_text())
BPM, BARS = EV["bpm"], 15
BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
SW = S16 * 0.12                                                       # swing on the off-16ths
bt = lambda bar, step=0: round(bar * BAR + step * S16 + (SW if step % 2 == 1 else 0), 5)
rng = np.random.default_rng(9)

def lp(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def hp(x, cut): return x - lp(x, cut)
def env(n, a, d): t = np.arange(n) / SR; return np.clip(t / a, 0, 1) * np.exp(-t / d)
def saws(f, n, v=4, sp=0.008):
    x = np.zeros(n)
    for k in range(v):
        dt = 1 + (sp * (k - (v - 1) / 2) / ((v - 1) / 2) if v > 1 else 0)
        ph = np.cumsum(np.full(n, f * dt)) / SR + rng.random(); x += 2 * (ph % 1) - 1
    return x / v
# ---- drums ----
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(46 + 120 * np.exp(-t / 0.028)) / SR) * np.exp(-t / 0.24)
    click = hp(noise(0.006, 1.0, 0.002, rate=44100, seed=1), 3000)
    out = body * 0.95; out[:len(click)] += click * 0.35
    return out
def snare(vol=1.0, seed=0):
    n = int(0.22 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05) * 0.5
    nz = hp(noise(0.22, 1.0, 0.07, rate=44100, seed=seed), 1200) * 0.6
    c = clap(0.6, seed=seed)[:n]; out = tone + nz; out[:len(c)] += c
    return out * vol
def hat(vol, seed, dur=0.045): return hp(noise(dur, 1.0, dur / 3, rate=44100, seed=seed), 7000) * vol
def shaker(vol, seed): x = noise(0.07, 1.0, 0.03, rate=44100, seed=seed); return lp(hp(x, 4000), 9000) * vol * np.clip(np.arange(len(x)) / SR / 0.02, 0, 1)
def conga(f, vol=0.25):
    n = int(0.25 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.25 * np.exp(-t / 0.015))) / SR) * np.exp(-t / 0.09) * vol
# ---- melodic ----
def bass(midi, dur, vol=0.42):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(saws(hz(midi), n, 2, 0.003), 900) * 0.7 + np.sin(2 * np.pi * hz(midi) * t)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.clip((dur - t) / 0.02, 0, 1) * (0.6 + 0.4 * np.exp(-t / 0.15))
def rhodes(notes, dur, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += np.sin(2 * np.pi * f * t + 1.1 * np.exp(-t / 0.12) * np.sin(2 * np.pi * f * 14 * t) * 0.3 + 0.8 * np.exp(-t / 0.5) * np.sin(2 * np.pi * f * t))
    return x * vol * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.6) * np.clip((dur - t) / 0.05, 0, 1)
def strings(notes, dur, vol=0.03, seed=0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: x += saws(hz(m), n, 6, 0.012)
    return lp(lp(x, 2600), 2600) * vol * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
def whistle(midi, dur, vol=0.11, prev=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) if prev is None else hz(midi) + (hz(prev) - hz(midi)) * np.exp(-t / 0.03)
    f = f * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.15, 0, 1))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.08 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR)
    return x * vol * np.clip(t / 0.015, 0, 1) * np.clip((dur - t) / 0.04, 0, 1)
def bell(midi, vol=0.08, dur=0.8):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    return np.sin(2 * np.pi * f * t + 1.3 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / 0.15)) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.35)
def marimba(midi, vol=0.12):
    n = int(0.5 * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)) * vol * np.exp(-t / 0.18) * np.clip(t / 0.002, 0, 1)
def bloop(midi, vol=0.09):
    n = int(0.16 * SR); t = np.arange(n) / SR
    f = hz(midi) * (0.6 + 0.8 * (1 - np.exp(-t / 0.04)))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.06)
def whoosh(dur=0.9, vol=0.05, seed=3):
    x = noise(dur, 1.0, dur, rate=44100, seed=seed); n = len(x); k = np.linspace(0, 1, n)
    y = lp(x, 1500) * np.sin(np.pi * k) ** 2
    return y * vol
def swell(dur, vol=0.04, seed=4):
    x = noise(dur, 1.0, dur, rate=44100, seed=seed); k = np.linspace(0, 1, len(x))
    return (lp(x, 600) * (1 - k) + lp(x, 5000) * k) * k ** 2.5 * vol

S = StereoSong(BPM, BARS)
CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [50, 53, 57, 60, 64], [52, 56, 59, 62, 65]]   # Am9 Fmaj9 Dm9 E7b9
ROOT_ = [45, 41, 38, 40]
sec = lambda b: "hook" if b < 3 or b >= 13 else "heat" if b < 5 else "air" if b < 7 else "macro" if b < 9 else "drop" if b < 11 else "groove"
kicks = []
for bar in range(BARS):
    s_ = sec(bar); r = ROOT_[bar % 4]; ch = CH[bar % 4]
    full = s_ in ("hook", "air", "drop", "groove")
    # drums
    kick_steps = (0, 4, 8, 12) if full else (0, 8) if s_ == "heat" else (0,) if bar == 7 else (0, 4, 8, 12)
    for s in kick_steps: S.add(kick(), bt(bar, s), 0, "drums", 0.95); kicks.append(bt(bar, s))
    if s_ != "macro" or bar == 8:
        for s in (4, 12): S.add(snare(0.5 if full else 0.35, seed=bar * 2 + s), bt(bar, s), 0.05, "drums")
    for s in range(16):
        v = [0.06, 0.03, 0.05, 0.03][s % 4] * (1.0 if full else 0.7)
        S.add(hat(v, seed=bar * 16 + s), bt(bar, s), 0.3, "drums")
        if full: S.add(shaker(0.03 if s % 2 else 0.018, seed=900 + bar * 16 + s), bt(bar, s), -0.35, "drums")
    if full:
        for s in (2, 6, 10, 14): S.add(hat(0.035, seed=500 + bar * 4 + s, dur=0.16), bt(bar, s), 0.15, "drums")
        for s, f, p in ((3, 330, -0.5), (7, 250, 0.5), (11, 330, -0.5), (13, 290, 0.5), (14, 250, 0.5)): S.add(conga(f, 0.12), bt(bar, s), p, "drums")
    # bass (funky octaves) — not in the glassy macro bars
    if s_ != "macro":
        for s, ln, oc in ((0, 2, 0), (3, 1, 12), (4, 2, 0), (7, 1, 12), (8, 2, 0), (10, 1, 0), (11, 1, 12), (12, 2, 0), (14, 1, 7), (15, 1, 12)):
            S.add(bass(r - 12 + oc, ln * S16 * 0.92, 0.36 if full else 0.28), bt(bar, s), 0, "bass")
    # rhodes chops (auto-panned) + strings
    for k, s in enumerate((0, 3, 6, 10, 13)):
        S.add(rhodes([n + 12 for n in ch[1:]], S16 * 2.5, 0.05 if s_ != "macro" else 0.035), bt(bar, s), [-0.4, 0.4][k % 2], "keys")
    S.add(strings(ch, BAR, 0.026 if s_ in ("drop", "hook") else 0.018), bt(bar), -0.3, "pads")
    S.add(strings([n + 12 for n in ch[:3]], BAR, 0.012), bt(bar), 0.3, "pads")
# the hook (whistle) in bars 0-2 and 13-14
HOOK = [(0, 76, 2), (2, 79, 2), (4, 81, 3), (8, 84, 2), (10, 81, 2), (12, 79, 2), (14, 76, 2),
        (16, 74, 2), (18, 76, 2), (20, 79, 4), (26, 81, 2), (28, 76, 4)]                       # 16ths over 2 bars
for start in (0, 13):
    prev = None
    for s, m, ln in HOOK:
        bar = start + s // 16
        if bar >= BARS: continue
        S.add(whistle(m, ln * S16 * 0.95, 0.1, prev), bt(bar, s % 16), 0, "lead"); prev = m
S.delay("lead", BEAT * 0.75, fb=0.4, mix=0.3)
# events = notes
for i, t in enumerate(EV["puffs"]): S.add(whoosh(0.45, 0.04, seed=i), t, [-0.3, 0.3][i % 2], "fx")
for i, t in enumerate(EV["parts"]): S.add(marimba([69, 72, 76][i], 0.16), t, [-0.3, 0, 0.3][i], "keys")
for i, t in enumerate(EV["drops"]): S.add(bloop([84, 88, 91, 86][i % 4], 0.1), t, [-0.5, 0.5][i % 2], "fx")
for i, t in enumerate(EV["golden"]): S.add(bell([76, 79, 81, 84, 88, 91, 93, 96][i % 8], 0.075), t, [-0.35, 0.35][i % 2], "lead")
S.add(bell(88, 0.13, 1.6), EV["ding"], 0, "lead"); S.add(bell(100, 0.05, 1.2), EV["ding"], 0.3, "lead")
for b_ in (3, 7, 11): S.add(whoosh(1.0, 0.07, seed=b_), b_ * BAR - 0.6, 0, "fx")
S.add(swell(BAR, 0.05), 8 * BAR, 0, "fx")
for k in range(8): S.add(snare(0.08 + 0.18 * k / 8, seed=700 + k), bt(8, 8 + k), 0, "drums")             # soft build
S.sidechain("bass", kicks, 0.55); S.sidechain("pads", kicks, 0.6); S.sidechain("keys", kicks, 0.3)
S.reverb("keys", 0.25, 1.6, 21); S.reverb("pads", 0.3, 2.0, 31); S.reverb("lead", 0.25, 1.8, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.3, 1.5, 61)
S.save(ROOT / "public/videos/14-airfryer/music_v2.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.9, "pads": 0.8, "lead": 1.0, "fx": 0.9})
