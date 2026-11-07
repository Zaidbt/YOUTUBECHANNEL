"""Video 012 · 10 s HOOK cut of the chameleon video — 144 BPM funk (6 bars = exactly 10 s), seamless loop.

Built for retention: action from frame 0 (the colour flips on every beat), a crash-zoom into the skin at 3.3 s,
the tongue shot at 7.5 s, and the hook comes back for the loop. Every colour flip is a chord (G=Am Y=C O=F R=G).
Writes remotion/src/videos/chameleon/hook.json + public/videos/12-chameleon/hook.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import big_kick, clap, impact, riser  # noqa: E402

BPM, BARS = 144, 6
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR
S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)
beat = lambda b: r4(b * BEAT)

G, Y, O, R = 0, 1, 2, 3
cycle = [G, Y, O, R]
colors = [[beat(b), cycle[b % 4]] for b in range(8)]                       # bars 0-1: a colour on every beat
colors += [[beat(8), G], [beat(10), R], [beat(12), G], [beat(14), R]]      # bars 2-3 (skin): close / spread
colors += [[beat(16), G], [beat(18), R], [beat(20), G]]                    # bar 4: tongue on beat 18
colors += [[beat(b), cycle[b % 4]] for b in (21, 22, 23)]                  # ramps back into beat 0 = green
tongue = beat(18)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "colors": colors, "tongue": tongue}
(ROOT / "remotion/src/videos/chameleon/hook.json").write_text(json.dumps(ev))

def b808(midi, dur, vol=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) + (hz(midi + 12) - hz(midi)) * np.exp(-t / 0.03)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2.4) * vol * np.exp(-t / max(0.3, dur * 0.8)) * np.clip(t / 0.003, 0, 1)
def tambor(f0, vol=0.35, seed=0):
    n = int(0.16 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.06)
    return mix(body * vol, noise(0.03, vol * 0.3, 0.008, rate=22050, seed=seed))
def whistle(dur=0.16, vol=0.06, f=2400):
    n = int(dur * SR); t = np.arange(n) / SR
    fm = f * (1 + 0.03 * np.sin(2 * np.pi * 28 * t))
    return np.sin(2 * np.pi * np.cumsum(fm) / SR) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.04, 0, 1)
def chop(midi, dur, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * (1 + 0.006 * np.sin(2 * np.pi * 6 * t))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.6 + np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * 0.4
    return x * vol * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.2)

CHORD = {G: [57, 60, 64], Y: [60, 64, 67], O: [53, 57, 60], R: [55, 59, 62]}
main = Song(bpm=BPM, bars=BARS, loop=True); sc = Song(bpm=BPM, bars=BARS, loop=True)
kicks = []
def state_at(t):
    s = G
    for tt, c in colors:
        if tt <= t + 1e-6: s = c
    return s
for bar in range(BARS):
    for s in (0, 6, 10):
        main.add(big_kick(0.95), bt(bar, s)); kicks.append(bt(bar, s))
    for s in (4, 12): main.add(clap(0.34, seed=bar * 2 + s), bt(bar, s))
    for s, f in ((2, 180), (3, 220), (7, 160), (11, 220), (14, 180), (15, 200)):
        main.add(tambor(f, 0.3, seed=bar * 16 + s), bt(bar, s))
    for s in range(0, 16, 2): main.add(hat(0.1, seed=bar * 8 + s), bt(bar, s + 1))
    for s, ln in ((0, 6), (6, 4), (10, 6)):
        sc.add(b808(CHORD[state_at(bt(bar, s))][0] - 24, ln * S16 * 0.95, 0.45), bt(bar, s))
for t, c in colors:
    for i, n in enumerate(CHORD[c]): main.add(chop(n + 12, BEAT * 0.9, 0.04), t + i * 0.012)
    main.add(whistle(0.14, 0.05, 2200 + 200 * c), t)
for bar in range(BARS):
    for half in (0, 8):
        c = state_at(bt(bar, half))
        for n in CHORD[c]:
            x = tri(n + 12, BEAT * 2, 0.018); k = np.linspace(0, 1, len(x)); sc.add(x * np.clip(k / 0.15, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), bt(bar, half))
main.add(riser(BAR, 0.16, seed=3), bt(1)); main.add(impact(0.95, seed=4), bt(2))   # crash-zoom into the skin
main.add(impact(0.8, seed=16), bt(4))                                              # back out
n = int(0.25 * SR); tt_ = np.arange(n) / SR
main.add(np.sin(2 * np.pi * np.cumsum(300 + 3000 * tt_ / 0.25) / SR) * np.exp(-tt_ / 0.1) * 0.12, tongue - 0.12)
main.add(impact(0.7, seed=20), tongue)
t = np.arange(len(sc.buf)) / SR
last = np.full(len(t), -10.0)
for k in sorted(kicks): last[t >= k] = k
main.buf += sc.buf * (1 - 0.55 * np.exp(-(t - last) / 0.1))
main.lowpass(9500); main.reverb(wet=0.14, decay=1.2)
main.save(ROOT / "public/videos/12-chameleon/hook.wav")
print(f"hook: {DUR:.3f} s, {len(colors)} colour changes")
