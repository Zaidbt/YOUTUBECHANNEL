"""Video 012 · Chameleon, Kurzgesagt-inspired pixel remake (30 s, 144 BPM "funk 150", 18 bars, seamless loop).

Story: hero (a colour every beat) · bar 2 glide · bar 3 DIVE into the skin · inside, step by step:
bars 3-4 white light = all colours (waves) · 5-6 the gap between crystal rows picks the colour that bounces back ·
7-8 small gap -> blue, + yellow pigment = green · 9-10 DROP: excited, the gap grows -> red (a colour per beat) ·
bar 11 back out · 11-12 it's to talk · 13-14 tongue · 15-17 hook (loop).
Every light wave is a note: blue = high, red = low (short wave = high pitch, like sound).
Writes remotion/src/videos/chameleon/c30k.json + public/videos/12-chameleon/c30k.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import big_kick, clap, impact, riser, pluck  # noqa: E402

BPM, BARS = 144, 18
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR
S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)
beat = lambda b: r4(b * BEAT)

G, Y, O, R = 0, 1, 2, 3
cycle = [G, Y, O, R]
colors = [[beat(b), cycle[b % 4]] for b in range(8)]                                   # hero: a colour every beat
colors += [[beat(8), G]]                                                                 # calm, green, into the skin
colors += [[beat(b), cycle[b % 4]] for b in range(36, 44)]                              # DROP inside: the gap grows/shrinks
colors += [[beat(44), G], [beat(48), O]] + [[beat(b), [O, R][b % 2]] for b in range(49, 52)]   # it's to talk
colors += [[beat(52), Y], [beat(56), G]]                                                # tongue on beat 54
colors += [[beat(b), cycle[b % 4]] for b in range(64, 72)]                              # hook, ramps into beat 0 = green
tongue = beat(54)
B_, G_, Y_, R_ = 0, 1, 2, 3                                                             # wave colours: blue green yellow red
waves = [[bt(3, 2 * k), [R_, Y_, G_, B_][k % 4]] for k in range(16)]                     # all colours (white light)
waves += [[bt(5, 2 * k), [R_, Y_, G_, B_][k % 4]] for k in range(16)]                    # they hit the rows, only blue returns
waves += [[bt(7, 2 * k), [B_, G_][k % 2]] for k in range(16)]                            # blue in, green out (through yellow)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "colors": colors, "tongue": tongue, "waves": waves}
(ROOT / "remotion/src/videos/chameleon/c30k.json").write_text(json.dumps(ev))

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
    calm = 3 <= bar < 9                                                                  # lighter drums while we explain
    for s in ((0, 10) if calm else (0, 6, 10)):
        main.add(big_kick(0.95 if not calm else 0.8), bt(bar, s)); kicks.append(bt(bar, s))
    for s in (4, 12): main.add(clap(0.34 if not calm else 0.2, seed=bar * 2 + s), bt(bar, s))
    for s, f in (((3, 220), (11, 220)) if calm else ((2, 180), (3, 220), (7, 160), (11, 220), (14, 180), (15, 200))):
        main.add(tambor(f, 0.3 if not calm else 0.2, seed=bar * 16 + s), bt(bar, s))
    for s in range(0, 16, 2): main.add(hat(0.1 if not calm else 0.07, seed=bar * 8 + s), bt(bar, s + 1))
    for s, ln in ((0, 6), (6, 4), (10, 6)):
        sc.add(b808(CHORD[state_at(bt(bar, s))][0] - 24, ln * S16 * 0.95, 0.45), bt(bar, s))
for t, c in colors:
    for i, n in enumerate(CHORD[c]): main.add(chop(n + 12, BEAT * 0.9, 0.04), t + i * 0.012)
    if t < bt(2) or bt(9) <= t < bt(11) or bt(12) <= t < bt(13) or t >= bt(16): main.add(whistle(0.14, 0.05, 2200 + 200 * c), t)
for bar in range(BARS):
    for half in (0, 8):
        c = state_at(bt(bar, half))
        for n in CHORD[c]:
            x = tri(n + 12, BEAT * 2, 0.018); k = np.linspace(0, 1, len(x)); sc.add(x * np.clip(k / 0.15, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), bt(bar, half))
main.add(riser(BAR, 0.14, seed=3), bt(2)); main.add(impact(0.7, seed=4), bt(3))      # dive into the skin
main.add(riser(BAR, 0.18, seed=7), bt(8)); main.add(impact(1.0, seed=8), bt(9))    # the drop (inside)
main.add(impact(0.6, seed=11), bt(11))                                             # back out
WN = {B_: 88, G_: 84, Y_: 81, R_: 76}                                              # short wave = high note
for t, c in waves: main.add(pluck(WN[c], 0.22, 0.07), t)
n = int(0.25 * SR); tt_ = np.arange(n) / SR
main.add(np.sin(2 * np.pi * np.cumsum(300 + 3000 * tt_ / 0.25) / SR) * np.exp(-tt_ / 0.1) * 0.12, tongue - 0.12)
main.add(impact(0.7, seed=20), tongue)
t = np.arange(len(sc.buf)) / SR
last = np.full(len(t), -10.0)
for k in sorted(kicks): last[t >= k] = k
main.buf += sc.buf * (1 - 0.55 * np.exp(-(t - last) / 0.1))
main.lowpass(9500); main.reverb(wet=0.14, decay=1.2)
main.save(ROOT / "public/videos/12-chameleon/c30k.wav")
print(f"c30k: {DUR:.3f} s, {len(colors)} colour changes")
