"""Video 025 · What is the CRACK when you crack your knuckles? — 41.3 s seamless loop, 122 BPM tech house (21 bars).
The song's snare IS a knuckle crack (a synthesised pop: a click + a short broadband burst), so every crack you see is a
hit you hear. Rolling offbeat bass, a vocal-chop riff (the earworm), offbeat hats, stabs.
Story events play the music: the finger being pulled = a falling pressure sweep, the big CRACK = the drop, the 20-minute
refractory timer = a ticking hat, the "60 years" counter = rising plucks, the viewer's failed second crack = a low "nope".

Timeline (bars, 1.967 s): 0 hook: a hand cracks its knuckles · 1.5 X-ray callout on a knuckle · 3 DIVE into the joint:
a sealed bag of joint fluid · 5 pull: the bag stretches, pressure drops · 6.5 CRACK: dissolved gas rips out into a bubble
· 8 the sound = the bubble being born (MRI 2015) · 9.5 ~20 min to dissolve: no second crack · 11.5 out: one doctor cracked
only his left hand for 60 years · 13.5 no arthritis in either hand, Ig Nobel 2009 · 15.5 your turn: crack one, then try
again · 18 hook again (loop).
Writes remotion/src/videos/knuckles/knuckles.json + public/videos/25-knuckles/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 122, 21
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
rng = np.random.default_rng(25)

L = [bb(x) for x in (0, 1.5, 3, 5, 6.5, 8, 9.5, 11.5, 13.5, 15.5, 18)]
IN, OUT, BACK = L[2], L[7], L[10]
hook_cracks = [bt(0, 4), bt(0, 12), bt(1, 4), bt(18, 12), bt(19, 4), bt(19, 12), bt(20, 4)]   # visible cracks in the hook
pull = [bb(5), bb(6.5)]                                     # the finger is pulled, pressure drops
CRACK = bb(6.5)
count = [bb(11.5) + BEAT + k * BEAT / 2 for k in range(12)]  # 0 -> 36,500 counter steps
your = bt(16, 4); nope_t = bt(17, 4)                         # viewer: crack one... then try again: nope
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "l": L, "in": IN, "out": OUT, "back": BACK, "hook": hook_cracks, "pull": pull,
      "crack": CRACK, "count": count, "your": your, "nope": nope_t}
(ROOT / "remotion/src/videos/knuckles/knuckles.json").write_text(json.dumps(ev))

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

def kcrack(vol=0.42, seed=0, big=False):
    """a knuckle 'pop': sharp click + very short broadband burst + a tiny tonal knock"""
    n = int((0.25 if big else 0.12) * SR); t = np.arange(n) / SR
    click = np.zeros(n); click[:40] = np.hanning(80)[40:] * 1.0
    burst = hp(noise(n / SR, 1.0, n / SR, rate=44100, seed=seed)[:n], 1200) * np.exp(-t / (0.035 if big else 0.012))
    knock = np.sin(2 * np.pi * np.cumsum(420 + 900 * np.exp(-t / 0.004)) / SR) * np.exp(-t / 0.02)
    x = click * 0.8 + burst * 0.7 + knock * 0.5
    if big: x += np.sin(2 * np.pi * np.cumsum(55 + 120 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.12) * 0.6
    return x * vol
def tkick(vol=0.95):
    n = int(0.4 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(50 + 140 * np.exp(-t / 0.022)) / SR) * np.exp(-t / 0.2)
    c = hp(noise(0.004, 1.0, 0.002, rate=44100, seed=1), 3000); out[:len(c)] += c * 0.3
    return out * vol
def rbass(midi, dur, vol=0.3):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi); ph = f * t
    x = lp((2 * (ph % 1) - 1), 900) * 1.3 * (0.7 + 0.3 * np.exp(-t / 0.05)) + 0.5 * np.sin(2 * np.pi * f * t)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / (dur * 0.9)) * np.clip((dur - t) / 0.02, 0, 1)
def stab(notes, dur=0.25, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.005, 0.005): ph = hz(m) * (1 + d) * t + rng.random(); x += 2 * (ph % 1) - 1
    return lp(x, 2600) / len(notes) * vol * 3 * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.08)
def sweep(m0, m1, dur, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m0) * (hz(m1) / hz(m0)) ** (t / dur); ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) + 0.3 * lp(2 * (ph % 1) - 1, 1500)) * vol * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
def nope(vol=0.2):
    out = np.zeros(int(0.7 * SR))
    for k, m in enumerate((52, 47)):
        n = int(0.28 * SR); t = np.arange(n) / SR; f = hz(m)
        s = (np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * t)) * np.clip(t / 0.005, 0, 1) * np.clip((0.28 - t) / 0.03, 0, 1)
        o = int(k * 0.3 * SR); out[o:o + n] += lp(s, 1800) * vol
    return out

S = StereoSong(BPM, BARS)
ROOTS = [33, 33, 36, 31]; CH = [[57, 60, 64, 67], [57, 60, 64, 67], [60, 64, 67, 71], [55, 59, 62, 67]]   # Am7 Am7 Cmaj7 G
RIFF = [(0, 76, 2, "a"), (3, 74, 1, "e"), (4, 76, 2, "a"), (7, 79, 2, "o"), (10, 76, 2, "a"), (12, 72, 3, "e"),
        (16, 76, 2, "a"), (19, 74, 1, "e"), (20, 76, 2, "a"), (23, 81, 2, "o"), (26, 79, 2, "a"), (28, 76, 3, "e")]
def sec(b):
    if b < 3 or b >= 18: return "hook"
    if b < 5: return "joint"
    if b < 6.5: return "pull"
    if b < 9.5: return "drop"
    if b < 11.5: return "wait"
    if b < 15.5: return "story"
    return "you"
kicks = []
for bar in range(BARS):
    r = ROOTS[bar % 4]; ch = CH[bar % 4]
    for half in (0, 1):
        s_ = sec(bar + half * 0.5); steps = range(half * 8, half * 8 + 8)
        full = s_ in ("hook", "drop", "story", "you")
        for s in steps:
            if s % 4 == 0 and not (s_ == "pull" and s % 8 == 4): S.add(tkick(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
            if s % 8 == 4 and s_ != "pull": S.add(kcrack(0.42 if full else 0.3, seed=bar * 16 + s), bt(bar, s), 0.05, "drums")   # the snare = a crack
            if s % 4 == 2: S.add(hat(0.05 if full else 0.035, seed=900 + bar * 16 + s, long=(s % 8 == 6)), bt(bar, s), 0.3, "drums")
            elif full: S.add(hat(0.014, seed=1100 + bar * 16 + s), bt(bar, s), -0.3, "drums")
            if s_ == "wait" and s % 2 == 1: S.add(tick(0.07), bt(bar, s), [-0.5, 0.5][s % 4 // 2], "drums")
            if s_ != "pull" and s % 4 in (1, 2, 3) and (s % 4 != 1 or full): S.add(rbass(r + (12 if s % 4 == 3 else 0), S16 * 0.9, 0.3 if full else 0.24), bt(bar, s), 0, "bass")
        if full:
            for s in steps:
                if s % 8 in (2, 7): S.add(stab([m + 12 for m in ch[1:]], 0.22, 0.05), bt(bar, s), [0.3, -0.3][s % 2], "keys")
    S.add(pad(ch, BAR, 0.016), bt(bar), 0, "pads")
    for s, m, ln, vw in RIFF:
        if s // 16 == bar % 2:
            s_ = sec(bar + (s % 16) / 16)
            if s_ in ("hook", "drop", "story", "you"): S.add(chop(m, ln * S16 * 0.9, vw, 0.32), bt(bar, s % 16), 0, "chop")
# events
for i, t in enumerate(hook_cracks): S.add(kcrack(0.3, seed=500 + i), t + S16 * 0.5, -0.25, "fx")            # a second, smaller pop just after
S.add(sweep(76, 52, pull[1] - pull[0], 0.07), pull[0], 0, "fx"); S.add(riser(pull[1] - pull[0], 0.07, seed=7), pull[0])
S.add(kcrack(0.7, seed=77, big=True), CRACK, 0, "fx"); S.add(impact(0.55), CRACK, 0, "fx")
for i, t in enumerate(count): S.add(pluck([69, 72, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98][i], 0.05, 0.3), t, [-0.4, 0.4][i % 2], "keys")
S.add(kcrack(0.5, seed=88), your, 0, "fx"); S.add(nope(0.22), ev["nope"], 0, "fx")
for t in (IN, OUT, BACK): S.add(impact(0.3), t, 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.18); S.delay("keys", BEAT * 0.5, fb=0.3, mix=0.15)
S.sidechain("bass", kicks, 0.4); S.sidechain("pads", kicks, 0.55); S.sidechain("keys", kicks, 0.2); S.sidechain("chop", kicks, 0.15)
S.reverb("chop", 0.2, 1.3, 21); S.reverb("keys", 0.2, 1.4, 31); S.reverb("pads", 0.35, 2.2, 41); S.reverb("drums", 0.1, 0.9, 51); S.reverb("fx", 0.25, 1.4, 61)
S.save(ROOT / "public/videos/25-knuckles/music.wav", gains={"drums": 1.0, "bass": 1.0, "chop": 0.95, "keys": 0.9, "pads": 0.8, "fx": 0.95})
print(f"knuckles: {DUR:.3f} s")
