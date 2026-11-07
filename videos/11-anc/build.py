"""Video 011 · How do noise-cancelling headphones work? — 48 s seamless loop, 130 BPM UK garage (2-step), 26 bars.

The cancellation is audible: a real engine-drone layer sits in the mix and is multiplied by (1 - anc(t)), the same
anc(t) the picture uses to flatten the red noise wave. So when the wave goes flat on screen, the noise leaves the song.
Events (anc.json):
  anc        [time, level] breakpoints of the cancellation (0 = off, 1 = on); toggles ON/OFF every bar in bars 12-15
  pulses     engine "wub" pulses on 8ths (the mic blinks on each)
  flips      the chip flips the wave on every beat in bars 6-7 (an organ stab each)
  chatter    bars 20-21: voices/clicks that slip through (high blips, only partly cancelled)
Bar 25 switches ANC off again so the end (engine roaring) flows into the start.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import big_kick, clap, impact, riser, pluck  # noqa: E402

BPM, BARS = 130, 26
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR
S16 = BEAT / 4; SWING = S16 * 0.18
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16 + (SWING if step % 2 == 1 else 0))

# cancellation level over time
anc = [[0, 0], [bt(10) - 0.001, 0], [bt(10) + 0.15, 1],
       [bt(12), 1], [bt(12) + 0.02, 0], [bt(13), 0], [bt(13) + 0.02, 1], [bt(14), 1], [bt(14) + 0.02, 0], [bt(15), 0], [bt(15) + 0.02, 1],
       [bt(25), 1], [bt(25) + 0.3, 0], [DUR, 0]]
pulses = [bt(b, s) for b in range(BARS) for s in range(0, 16, 2)]
flips = [bt(b, s) for b in (6, 7) for s in (0, 4, 8, 12)]
chatter = [r4(bt(20) + k * S16 * 1.5) for k in range(int(2 * BAR / (S16 * 1.5)))]
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "anc": anc, "pulses": pulses, "flips": flips, "chatter": chatter}
(ROOT / "remotion/src/videos/anc/anc.json").write_text(json.dumps(ev))

def anc_at(t):
    xs = [a[0] for a in anc]; ys = [a[1] for a in anc]
    return np.interp(t, xs, ys)

# ---------- instruments ----------
main = Song(bpm=BPM, bars=BARS, loop=True)
sc = Song(bpm=BPM, bars=BARS, loop=True)
noise_layer = Song(bpm=BPM, bars=BARS, loop=True)
PROG = [[45, 57, 60, 64, 67], [41, 57, 60, 65, 69], [43, 55, 59, 62, 66], [40, 55, 59, 64, 67]]  # Am9 Fmaj7 G Em7-ish
ch = lambda bar: PROG[bar % 4]

def organ(notes, dur, vol=0.03):
    n = int(dur * SR); x = np.zeros(n); t = np.arange(n) / SR
    for m in notes:
        f = hz(m)
        x += (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.25 * np.sign(np.sin(2 * np.pi * 3 * f * t))) * vol
    return x * np.clip(t / 0.005, 0, 1) * np.exp(-t / 0.18)

def sub(bar, vol=0.32):
    r = ch(bar)[0] - 12
    for s, ln in ((0, 3), (6, 2), (10, 4), (14, 2)):
        n = int(ln * S16 * SR); t = np.arange(n) / SR
        sc.add(np.tanh(np.sin(2 * np.pi * hz(r) * t) * 1.5) * vol * np.clip(t / 0.005, 0, 1) * np.clip((ln * S16 - t) / 0.03, 0, 1), bt(bar, s))

def ukg(bar, full=True):
    main.add(big_kick(0.95), bt(bar, 0)); main.add(big_kick(0.8), bt(bar, 10))
    if full: main.add(big_kick(0.6), bt(bar, 7))
    for s in (4, 12): main.add(clap(0.32, seed=bar * 2 + s), bt(bar, s))
    for s in range(1, 16, 2): main.add(hat(0.11 if s % 4 == 1 else 0.15, seed=bar * 16 + s), bt(bar, s))
    main.add(hat(0.12, open_=True, seed=bar), bt(bar, 14))
    for s in (3, 6, 11, 14) if full else (6, 14):
        main.add(organ([n + 12 for n in ch(bar)[1:]], S16 * 2, 0.022), bt(bar, s))
    sub(bar, 0.32 if full else 0.22)

kicks = []
for bar in range(BARS):
    full = not (bar in (4, 5) or bar in (8, 9))
    ukg(bar, full)
    kicks += [bt(bar, 0), bt(bar, 10)]
# chip flips: an organ stab on every flip (bars 6-7)
for k, t in enumerate(flips): main.add(organ([n + 24 for n in ch(6 + k // 4)[1:4]], BEAT * 0.8, 0.035), t)
main.add(riser(BAR * 2, 0.16, seed=8), bt(8)); main.add(impact(0.9, seed=10), bt(10))
# toggle hits in bars 12-15
for b in (12, 13, 14, 15): main.add(pluck(93 if b % 2 else 81, 0.15, 0.08), bt(b))
# chatter: bright blips that only partly cancel
for k, t in enumerate(chatter): main.add(pluck(96 + (k * 5) % 12, 0.05, 0.03), t)
# a little lead in the "you hear just the music" bars
LEAD = [81, None, 84, 83, None, 79, None, 76]
for bar in (22, 23, 24):
    for i, n in enumerate(LEAD):
        if n: main.add(pulse(n, BEAT / 2 * 0.8, duty=0.25, vol=0.05, decay=0.2, sustain=0.4), main.t(bar, i / 2))

# ---------- the engine drone (the noise that gets cancelled) ----------
n = len(noise_layer.buf); t = np.arange(n) / SR
rng = np.random.default_rng(4)
brown = np.cumsum(rng.standard_normal(n)); brown -= np.convolve(brown, np.ones(4000) / 4000, mode="same"); brown /= np.max(np.abs(brown)) + 1e-9
hum = 0.6 * np.sin(2 * np.pi * 87 * t) + 0.35 * np.sin(2 * np.pi * 174 * t + 1) + 0.2 * np.sin(2 * np.pi * 261 * t + 2)
wub = 0.75 + 0.25 * np.cos(2 * np.pi * t / (BEAT / 2))  # engine pulses on 8ths (the mic blinks)
drone = (0.55 * brown + 0.45 * hum) * wub
noise_layer.buf = drone * 0.32 * (1 - anc_at(t))

# side-chain + mix
tt = t
last = np.full(n, -10.0)
for k in sorted(kicks): last[tt >= k] = k
main.buf += sc.buf * (1 - 0.5 * np.exp(-(tt - last) / 0.1)) + noise_layer.buf
main.lowpass(10000)
main.reverb(wet=0.14, decay=1.4)
main.save(ROOT / "public/videos/11-anc/music.wav")
print("ok", len(pulses), "pulses,", len(flips), "flips,", len(chatter), "chatter")
