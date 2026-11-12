"""Video 026 · What actually makes the knuckle CRACK — realistic 3D medical-animation style (no pixels, no mascots),
TikTok word-by-word captions with a real script for 20-25 year olds. 43.9 s seamless loop, 142 BPM UK-drill-style
beat (26 bars): sliding 808s, half-time snare, triplet hi-hat rolls, a dark minor piano motif, an airy choir pad.
Clean mix, no distortion. Every caption word lands on the grid; the CRACK is the snare + an 808 drop.
Script (sources): Unsworth et al. 1971 (bubble-collapse theory); Kawchuk et al., PLOS ONE 2015 (real-time MRI: the
sound comes with cavity formation, the cavity persists); ~20 min refractory period; no arthritis link found
(Castellanos & Axelrod 1990; deWeber et al. 2011; Unger 1998).
Writes remotion/src/videos/crack/crack.json + public/videos/26-crack/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 142, 26
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
B = lambda beats: round(beats * BEAT, 5)
rng = np.random.default_rng(26)

HOOK = "That crack isn't your bones."
SENT = [
    ("joint", "Every knuckle is a sealed bag of joint fluid, with carbon dioxide dissolved in it."),
    ("pull", "Pull the finger, the bag gets bigger, and the pressure inside crashes."),
    ("tear", "The gas can't stay dissolved. In a split second it tears open a cavity."),
    ("crack", "That's the crack."),
    ("1971", "For 44 years scientists said the sound was the bubble popping."),
    ("mri", "Then in 2015 they filmed it inside an MRI: the bubble was still there after the crack."),
    ("wait", "The gas takes about 20 minutes to dissolve back. That's why you can't crack it twice."),
    ("arth", "And no, studies haven't linked it to arthritis."),
]
words, segs = [], []
beat = 8.0
for key, s in SENT:
    if key == "crack": beat = max(beat, 44.0)                     # the crack lands on beat 44 (bar 11)
    seg0 = beat
    for i, w in enumerate(s.split()):
        words.append({"w": w, "t": B(beat), "seg": len(segs)})
        beat += 1.0 if (len(w.strip(".,:")) >= 5 or w.endswith((".", ",", ":"))) else 0.5
    segs.append({"key": key, "t": B(seg0), "end": B(beat)})
    beat += 1.5 if key != "crack" else 2.0
assert beat <= 99, beat
hook_words = [{"w": w, "t": B(99 + i), "seg": -1} for i, w in enumerate(HOOK.split())]
CRACK = next(s["t"] for s in segs if s["key"] == "crack")
hook_cracks = [B(b) for b in (1, 3, 5, 7)] + [B(b) for b in (99, 101, 103)]
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "words": words, "hookWords": hook_words, "hook": HOOK, "segs": segs, "crack": CRACK,
      "hookCracks": hook_cracks, "dive": B(8), "out": next(s["t"] for s in segs if s["key"] == "arth"), "end": B(99)}
(ROOT / "remotion/src/videos/crack/crack.json").write_text(json.dumps(ev))
print("script ends at beat", beat, "crack at", CRACK)

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

def k808(midi, dur, vol=0.42, slide_to=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f0 = hz(midi); f = f0 * np.ones(n)
    if slide_to is not None: f = f0 * (hz(slide_to) / f0) ** np.clip((t - dur * 0.55) / (dur * 0.3), 0, 1)
    f = f * (1 + 1.2 * np.exp(-t / 0.012))
    ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.18 * np.sin(2 * np.pi * 2 * ph)
    return x * vol * np.clip(t / 0.002, 0, 1) * np.clip((dur - t) / 0.03, 0, 1) * (0.75 + 0.25 * np.exp(-t / 0.25))
def dkick(vol=0.8):
    n = int(0.25 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(60 + 160 * np.exp(-t / 0.015)) / SR) * np.exp(-t / 0.08) + hp(noise(0.25, 1.0, 0.004, rate=44100, seed=2)[:n], 3000) * 0.3) * vol
def dsnare(vol=0.32, seed=0):
    n = int(0.28 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(230 + 90 * np.exp(-t / 0.008)) / SR) * np.exp(-t / 0.04) * 0.5
    nz = lp(hp(noise(0.28, 1.0, 0.28, rate=44100, seed=seed)[:n], 1800), 9000) * np.exp(-t / 0.07)
    return (body + nz * 0.8) * vol
def kcrack(vol=0.4, seed=0):
    n = int(0.12 * SR); t = np.arange(n) / SR
    click = np.zeros(n); click[:40] = np.hanning(80)[40:]
    return (click * 0.8 + hp(noise(0.12, 1.0, 0.12, rate=44100, seed=seed)[:n], 1200) * np.exp(-t / 0.012) * 0.7 + np.sin(2 * np.pi * np.cumsum(420 + 900 * np.exp(-t / 0.004)) / SR) * np.exp(-t / 0.02) * 0.5) * vol
def dhat(vol=0.03, seed=0):
    x = noise(0.03, 1.0, 0.012, rate=44100, seed=seed); return hp(x, 8000) * vol
def piano(midi, dur=1.2, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t + 0.7 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.15)) + 0.35 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.4) + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.1)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.7) * np.clip((dur - t) / 0.05, 0, 1)
def choir(notes, dur, vol=0.02):
    n = int(dur * SR); out = np.zeros(n); t = np.arange(n) / SR
    for m in notes: out[:n] += chop(m, dur, "o", 1.0)[:n] * 0.5
    return lp(out, 2500) * vol * np.clip(t / 0.5, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)
def bell(midi, vol=0.05, dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    return np.sin(2 * np.pi * f * t + 1.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / 0.15)) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.5)

S = StereoSong(BPM, BARS)
# F# minor, dark: F#m - D - Bm - C#  (2 bars each)
CH = [[54, 57, 61], [50, 54, 57], [47, 50, 54], [49, 53, 56]]
RT = [30, 26, 35, 25]
# dark piano motif (the earworm), 2 bars, played over every chord pair
MOTIF = [(0, 73), (3, 76), (6, 74), (8, 73), (11, 69), (14, 71), (16, 73), (19, 76), (22, 78), (24, 76), (27, 74), (30, 73)]
segs = ev["segs"]; segT = lambda k: next(s["t"] for s in segs if s["key"] == k)
def section(t):
    if t < B(8) or t >= B(99): return "hook"
    if t < segT("pull"): return "verse"
    if t < CRACK: return "build"
    if t < segT("wait"): return "drop"
    if t < segT("arth"): return "break"
    return "drop"
kicks = []
for bar in range(BARS):
    ci = (bar // 2) % 4; ch = CH[ci]; r = RT[ci]
    for s in range(16):
        t = bt(bar, s); sc = section(t); full = sc in ("hook", "drop")
        # drill kick/808 pattern (the 808 follows the kick and slides on bar ends)
        if sc != "break" or s == 0:
            if s in (0, 6, 11) or (full and s == 14 and bar % 2):
                S.add(dkick(0.75 if full else 0.6), t, 0, "drums"); kicks.append(t)
                nxt = 14 if s == 11 else (11 if s == 6 else 6)
                ln = ((nxt - s) % 16 or 16) * S16
                S.add(k808(r + (7 if s == 11 and bar % 2 else 0), ln * 0.95, 0.4 if full else 0.32, slide_to=(r + 12 if s == 11 and bar % 2 == 1 else None)), t, 0, "bass")
        if s == 8 and sc not in ("build", "break"): S.add(dsnare(0.3 if full else 0.24, seed=bar), t, 0.05, "drums"); S.add(kcrack(0.22, seed=bar), t, -0.2, "drums")
        if sc == "build" and s in (8,): S.add(dsnare(0.18, seed=bar), t, 0, "drums")
        # hats: 8ths with triplet rolls on bar ends
        if s % 2 == 0 and sc != "break": S.add(dhat(0.035 if s % 4 == 0 else 0.025, seed=900 + bar * 16 + s), t, 0.3, "drums")
        if sc == "break" and s % 4 == 0: S.add(tick(0.05), t, -0.3, "drums")
    if section(bt(bar, 12)) in ("hook", "drop", "verse"):
        for k in range(6): S.add(dhat(0.02 + 0.004 * k, seed=1300 + bar * 8 + k), bt(bar, 12) + k * (4 * S16 / 6), [-0.4, 0.4][k % 2], "drums")
    S.add(choir([m + 12 for m in ch], BAR, 0.025), bt(bar), 0, "pads")
    for s, m in MOTIF:
        if s // 16 == bar % 2:
            sc = section(bt(bar, s % 16))
            if sc != "build" or s % 16 < 8: S.add(piano(m - (12 if ci == 2 else 0) + (0 if ci in (0, 1) else -2 if ci == 3 else 0), 1.0, 0.065 if sc in ("hook", "drop") else 0.05), bt(bar, s % 16), [-0.25, 0.25][(s // 3) % 2], "keys")
# events: cracks in the hook, the tension before the crack, the big crack
for i, t in enumerate(hook_cracks): S.add(kcrack(0.45, seed=500 + i), t, 0.2, "fx")
S.add(riser(segs[2]["end"] - segT("pull"), 0.06, seed=7), segT("pull"))
for k in range(12): S.add(dhat(0.03 + 0.004 * k, seed=60 + k), CRACK - BAR / 2 + k * (BAR / 2) / 12, 0, "drums")
S.add(kcrack(0.75, seed=77), CRACK, 0, "fx"); S.add(impact(0.55), CRACK, 0, "fx"); S.add(k808(RT[0] - 12 + 12, BAR, 0.5, slide_to=RT[0]), CRACK, 0, "bass")
S.add(bell(85, 0.07), segT("1971"), 0.3, "keys"); S.add(bell(80, 0.07), segT("mri"), -0.3, "keys")
S.delay("keys", BEAT * 0.75, fb=0.32, mix=0.2)
S.sidechain("pads", kicks, 0.35)
S.reverb("keys", 0.3, 2.2, 21); S.reverb("pads", 0.4, 2.8, 31); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.25, 1.4, 61)
S.save(ROOT / "public/videos/26-crack/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 1.0, "pads": 0.9, "fx": 0.95})
print(f"crack: {DUR:.3f} s")
