"""Video 012 · How does a chameleon change color? — 48 s seamless loop, 130 BPM funk carioca (Brazilian funk), 26 bars.

The chameleon plays the chords: every colour is a chord (GREEN = Am, YELLOW = C, ORANGE = F, RED = G), and the
crystal spacing in the skin (tight = blue reflection → green skin, spread = red) follows the same colour timeline.
Events (chameleon.json):
  colors   [time, state] — 0 green, 1 yellow, 2 orange, 3 red (changes land on bars or beats)
  tongue   the tongue shoots at the fly (whip + impact)
Bars 25 returns to green so the end flows into the start.
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
S16 = BEAT / 4
r4 = lambda x: round(x, 4)
bt = lambda bar, step=0: r4(bar * BAR + step * S16)

G, Y, O, R = 0, 1, 2, 3
colors = [[bt(0), G], [bt(1), Y], [bt(2), O], [bt(3), R], [bt(4), G],
          [bt(10), Y], [bt(10, 8), O], [bt(11), R]]
cycle = [G, Y, O, R]
colors += [[bt(12, k * 4), cycle[k % 4]] for k in range(16)]                 # the drop: a colour per beat
colors += [[bt(16), G], [bt(18), O], [bt(18, 4), R], [bt(18, 8), O], [bt(18, 12), R], [bt(19), O], [bt(19, 8), R],
           [bt(20), Y], [bt(22), O], [bt(23), R], [bt(24), Y], [bt(25), G]]
tongue = bt(20, 4)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "colors": colors, "tongue": tongue}
(ROOT / "remotion/src/videos/chameleon/chameleon.json").write_text(json.dumps(ev))

# ---------- instruments ----------
def b808(midi, dur, vol=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) + (hz(midi + 12) - hz(midi)) * np.exp(-t / 0.03)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2.4) * vol * np.exp(-t / max(0.3, dur * 0.8)) * np.clip(t / 0.003, 0, 1)

def tambor(f0, vol=0.35, seed=0):
    """Tamborzão-style pitched drum hit."""
    n = int(0.18 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.07)
    return mix(body * vol, noise(0.03, vol * 0.3, 0.008, rate=22050, seed=seed))

def whistle(dur=0.22, vol=0.08, f=2400):
    n = int(dur * SR); t = np.arange(n) / SR
    fm = f * (1 + 0.03 * np.sin(2 * np.pi * 28 * t))
    return np.sin(2 * np.pi * np.cumsum(fm) / SR) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.04, 0, 1)

def chop(midi, dur, vol=0.05):
    """Vocal-ish chop: pulse with a little vibrato and a formant-y second partial."""
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * (1 + 0.006 * np.sin(2 * np.pi * 6 * t))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.6 + np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * 0.4
    return x * vol * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.25)

CHORD = {G: [57, 60, 64], Y: [60, 64, 67], O: [53, 57, 60], R: [55, 59, 62]}  # Am C F G
main = Song(bpm=BPM, bars=BARS, loop=True)
sc = Song(bpm=BPM, bars=BARS, loop=True)
kicks = []
def state_at(t):
    s = G
    for tt, c in colors:
        if tt <= t + 1e-6: s = c
    return s

def funk(bar, full=True):
    for s in (0, 6, 10) if full else (0, 10):
        main.add(big_kick(0.95), bt(bar, s)); kicks.append(bt(bar, s))
    for s in (4, 12): main.add(clap(0.32, seed=bar * 2 + s), bt(bar, s))
    for s, f in ((2, 180), (3, 220), (7, 160), (11, 220), (14, 180)) if full else ((3, 220), (11, 220)):
        main.add(tambor(f, 0.3, seed=bar * 16 + s), bt(bar, s))
    for s in range(0, 16, 2): main.add(hat(0.1, seed=bar * 8 + s), bt(bar, s + 1))
    root = CHORD[state_at(bt(bar))][0] - 24
    for s, ln in ((0, 6), (6, 4), (10, 6)):
        sc.add(b808(root, ln * S16 * 0.95, 0.45 if full else 0.3), bt(bar, s))

for bar in range(BARS):
    funk(bar, full=not (4 <= bar < 8))
# every colour change is a chord (chops) + a whistle in the drop
for k, (t, c) in enumerate(colors):
    notes = CHORD[c]
    for i, n in enumerate(notes): main.add(chop(n + 12, BEAT * 0.9, 0.035), t + i * 0.012)
    if bt(12) <= t < bt(16) or bt(18) <= t < bt(20): main.add(whistle(0.16, 0.06, 2200 + 200 * c), t)
# sustained chord bed that follows the colour (sidechained)
for bar in range(BARS):
    for half in (0, 8):
        c = state_at(bt(bar, half))
        for n in CHORD[c]:
            x = tri(n + 12, BEAT * 2, 0.018); k = np.linspace(0, 1, len(x)); sc.add(x * np.clip(k / 0.15, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), bt(bar, half))
main.add(riser(BAR * 2, 0.16, seed=3), bt(2)); main.add(impact(0.85, seed=4), bt(4))     # dive into the skin
main.add(riser(BAR, 0.18, seed=11), bt(11)); main.add(impact(1.0, seed=12), bt(12))      # the drop
main.add(impact(0.8, seed=16), bt(16))                                                     # back to the jungle
n = int(0.25 * SR); tt_ = np.arange(n) / SR
main.add(np.sin(2 * np.pi * np.cumsum(300 + 3000 * tt_ / 0.25) / SR) * np.exp(-tt_ / 0.1) * 0.12, tongue - 0.12)  # the tongue whip
main.add(impact(0.7, seed=20), tongue)

t = np.arange(len(sc.buf)) / SR
last = np.full(len(t), -10.0)
for k in sorted(kicks): last[t >= k] = k
main.buf += sc.buf * (1 - 0.55 * np.exp(-(t - last) / 0.1))
main.lowpass(9500)
main.reverb(wet=0.14, decay=1.4)
main.save(ROOT / "public/videos/12-chameleon/music.wav")
print(f"{len(colors)} colour changes")
