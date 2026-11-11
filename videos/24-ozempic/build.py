"""Video 024 · How does a weekly weight-loss shot (semaglutide: Ozempic / Wegovy) switch off hunger? — 45.6 s seamless
loop, 100 BPM amapiano-flavoured groove (19 bars, 2.4 s each): shakers, soft kick, a melodic LOG-DRUM bassline (the
earworm), Rhodes chords, a whistle answer. Clean stereo.
The mechanism plays the music: every GLP-1 chain your gut releases is a pluck, every enzyme bite is a rim + a falling
note, a drug molecule surviving a bite is a bright bell, the hunger gauge dropping is a descending log-drum run.

Timeline (bars): 0 hook: the pen · 1.5 zoom callout: a copy of the gut hormone GLP-1 · 3 DIVE into the bloodstream:
you eat → the gut releases GLP-1 = "I'm full" · 4.75 enzymes shred it in ~2 minutes · 6.5 the drug: same chain + a fatty
tail that rides a blood protein · 8.25 it lasts a week (~5,000x longer) · 10 the body: in the brain the "full" signal
stays on · 11.75 the stomach empties slower · 13.5 trials: ~15 % of body weight in ~16 months · 15.25 stop: most of it
comes back · 17 hook again (loop).
Writes remotion/src/videos/ozempic/ozempic.json + public/videos/24-ozempic/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 100, 19
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
SW = S16 * 0.12
bt = lambda bar, step=0: round(bar * BAR + step * S16 + (SW if step % 2 == 1 else 0), 5)
rng = np.random.default_rng(24)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))                              # fractional bars

L = [bb(x) for x in (0, 1.5, 3, 4.75, 6.5, 8.25, 10, 11.75, 13.5, 15.25, 17)]          # label / step starts
IN, OUT, BACK = L[2], L[6], L[10]
release = [bt(3, 4) + k * BEAT for k in range(6)]                                      # gut releases a GLP-1 chain
bites = [bb(4.75) + BEAT + k * BEAT for k in range(6)]                                 # an enzyme shreds one
drugs = [bb(6.5) + BEAT * 0.5 + k * BEAT * 1.5 for k in range(4)]                      # drug molecules arrive
bounce = [bb(8.25) + BEAT * 0.5 + k * BEAT for k in range(6)]                          # enzymes bounce off the drug
signal = [bb(10) + BEAT + k * BEAT / 2 for k in range(12)]                             # "full" pulses reach the brain
drips = [bb(11.75) + BEAT + k * BEAT * 1.5 for k in range(4)]                          # the stomach lets food out, slowly
chart = [bb(13.5) + BEAT * 0.5 + k * BEAT / 2 for k in range(12)]                      # weight curve points (down, then back up)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "l": L, "in": IN, "out": OUT, "back": BACK, "release": release, "bites": bites,
      "drugs": drugs, "bounce": bounce, "signal": signal, "drips": drips, "chart": chart}
(ROOT / "remotion/src/videos/ozempic/ozempic.json").write_text(json.dumps(ev))

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

def softk(vol=0.85):
    n = int(0.45 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(44 + 90 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.25)
    c = hp(noise(0.005, 1.0, 0.002, rate=44100, seed=1), 2500); out[:len(c)] += c * 0.15
    return out * vol
def shaker(vol, seed):
    x = noise(0.07, 1.0, 0.03, rate=44100, seed=seed); return lp(hp(x, 5000), 9500) * vol * np.clip(np.arange(len(x)) / SR / 0.02, 0, 1)
def rimc(vol=0.1):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008) + 0.4 * np.sin(2 * np.pi * 800 * t) * np.exp(-t / 0.012)) * vol
def rhodes(notes, dur, vol=0.045):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for i, m in enumerate(notes):
        f = hz(m); o = int(i * 0.012 * SR); tt = np.clip(t - i * 0.012, 0, None)
        s = np.sin(2 * np.pi * f * tt + (1.6 * np.exp(-tt / 0.25) + 0.2) * np.sin(2 * np.pi * f * tt)) * (tt > 0)
        x += s
    x *= 1 + 0.1 * np.sin(2 * np.pi * 4.5 * t)
    return x * vol * np.clip(t / 0.004, 0, 1) * np.exp(-t / 1.2) * np.clip((dur - t) / 0.06, 0, 1)
def whistle(midi, dur, vol=0.07, slide=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * np.ones(n)
    if slide is not None: f = hz(midi) + (hz(slide) - hz(midi)) * np.exp(-t / 0.05)
    f = f * (1 + 0.009 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.12) / 0.2, 0, 1)); ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) + 0.12 * np.sin(2 * np.pi * 2 * ph)) * vol * np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)
def bellb(midi, vol=0.1, dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    return np.sin(2 * np.pi * f * t + 1.4 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / 0.12)) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.3)

S = StereoSong(BPM, BARS)
# F minor: Fm9 - Dbmaj7 - Abmaj7 - Eb   (one bar each; bar 0 = the last chord's turnaround so the loop resolves)
CH = [[56, 60, 63, 65, 67], [53, 56, 60, 63], [56, 60, 63, 67], [55, 58, 63, 67]]
RT = [29, 25, 32, 27]
chord = lambda b: CH[(b - 1) % 4]; root = lambda b: RT[(b - 1) % 4]
# the earworm: a log-drum bass melody, 2-bar phrase
LOG = [(0, 0, 3), (3, 0, 2), (6, 12, 2), (8, 7, 2), (11, 10, 2), (14, 12, 2)]
LOG2 = [(0, 0, 3), (3, 0, 2), (6, 12, 2), (8, 15, 2), (10, 12, 2), (12, 10, 2), (14, 7, 2)]
def sec(b):
    return "hook" if b < 3 or b >= 17 else "blood" if b < 10 else "body"
kicks = []
for bar in range(BARS):
    s_ = sec(bar); ch = chord(bar); r = root(bar); full = s_ in ("hook",) or bar in (8, 9, 13, 14, 15, 16)
    for s in (0, 4, 8, 12): S.add(softk(), bt(bar, s), 0, "drums"); kicks.append(bt(bar, s))
    for s in range(16): S.add(shaker([0.04, 0.016, 0.03, 0.02][s % 4] * (1 if full else 0.75), seed=300 + bar * 16 + s), bt(bar, s), 0.35, "drums")
    for s in (4, 12): S.add(clap(0.2 if full else 0.13, seed=bar * 2 + s), bt(bar, s), -0.05, "drums")
    for s in (3, 10): S.add(rimc(0.08), bt(bar, s), -0.35, "drums")
    for s, d, ln in (LOG2 if bar % 2 else LOG): S.add(logdrum(r + 12 + d, ln * S16 * 0.95, 0.4), bt(bar, s), 0, "bass")
    S.add(rhodes(ch, BEAT * 1.8, 0.042), bt(bar, 0), -0.25, "keys"); S.add(rhodes(ch[1:], BEAT * 1.0, 0.03), bt(bar, 7), 0.25, "keys")
    S.add(pad([m + 12 for m in ch[:3]], BAR, 0.012), bt(bar), 0, "pads")
# whistle answer phrase over the hook bars (0-2 and 17-18)
WH = [(2, 77, 2, None), (4, 80, 2, 79), (6, 84, 4, None), (12, 82, 3, None), (18, 80, 2, None), (20, 77, 2, None), (22, 75, 4, 77), (28, 72, 4, None)]
for start in (0, 17):
    for s, m, ln, sl in WH:
        bar = start + s // 16
        if bar < BARS: S.add(whistle(m, ln * S16 * 0.95, 0.06, sl), bt(bar, s % 16), 0.1, "lead")
# the mechanism plays the music
UP = [77, 80, 84, 87, 89, 92]
for i, t in enumerate(release): S.add(pluck(UP[i], 0.09, 0.4), t, [-0.4, 0.4][i % 2], "keys")
for i, t in enumerate(bites): S.add(rimc(0.16), t, 0, "drums"); S.add(bellb([84, 80, 77, 75, 72, 68][i], 0.07, 0.5), t, [-0.4, 0.4][i % 2], "keys")
for i, t in enumerate(drugs): S.add(bellb([80, 84, 87, 92][i], 0.11, 1.4), t, [-0.3, 0.3][i % 2], "lead")
for i, t in enumerate(bounce): S.add(tick(0.12), t, [-0.5, 0.5][i % 2], "drums"); S.add(bellb(92, 0.05, 0.6), t + S16, 0.2, "keys")
for i, t in enumerate(signal): S.add(pluck([80, 84][i % 2], 0.05, 0.3), t, [-0.5, 0.5][i % 2], "keys")
for i, t in enumerate(drips): S.add(logdrum([53, 51, 48, 44][i], BEAT, 0.3), t, 0, "bass")
CURVE = [84, 82, 80, 79, 77, 75, 72, 70, 72, 75, 77, 80]
for i, t in enumerate(chart): S.add(bellb(CURVE[i], 0.07, 0.6), t, [-0.3, 0.3][i % 2], "lead")
for t in (IN, OUT, BACK): S.add(impact(0.35), t, 0, "fx"); S.add(riser(BEAT * 2, 0.045, seed=int(t * 3)), t - BEAT * 2)
S.delay("lead", BEAT * 0.75, fb=0.4, mix=0.28); S.delay("keys", BEAT * 0.5, fb=0.3, mix=0.16)
S.sidechain("bass", kicks, 0.25); S.sidechain("pads", kicks, 0.5); S.sidechain("keys", kicks, 0.18)
S.reverb("keys", 0.26, 1.7, 21); S.reverb("pads", 0.35, 2.4, 31); S.reverb("lead", 0.32, 2.1, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.3, 1.5, 61)
S.save(ROOT / "public/videos/24-ozempic/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "pads": 0.8, "lead": 1.0, "fx": 0.85})
print(f"ozempic: {DUR:.3f} s")
