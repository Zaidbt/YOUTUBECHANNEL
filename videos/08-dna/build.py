"""Video 008 · How does your DNA copy itself? — 48 s seamless loop, 150 BPM, 30 bars of 1.6 s.

The DNA sequence itself is the melody: every letter has a note (A, T, C, G).
Events (dna.json, shared with the picture):
  letters 8.0-9.6     A, T, C, G introduced, one per beat
  unzip   14.4-17.6   the helicase splits one base pair per 16th (a zap each)          DROP 1
  add     17.6-24.0   polymerase adds the matching letter on both strands, one per 8th (the letter's note)
  twist   24.0-25.6   the two ladders twist into two helices
  error   28.0 wrong letter · 28.8 removed · 29.6 fixed (proofreading)
  storm   32.0-36.8   thousands of forks: a replication bubble opens on every 16th          DROP 2
  split   36.8        the two copies move apart (the cell divides)
Bars 28-29 mirror bars 0-1 so the loop closes.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402
from hyper import Hyper, pump_mix, impact, zap, riser, pluck, supersaw, clap  # noqa: E402

BPM, BARS = 150, 30
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR
r4 = lambda x: round(x, 4)
N = 32
rng = np.random.default_rng(8)
seq = "".join(rng.choice(list("ATCG"), N))
PAIR = {"A": "T", "T": "A", "C": "G", "G": "C"}
ev = {
    "duration": DUR, "bpm": BPM, "seq": seq, "N": N,
    "letters": [r4(8.0 + k * BEAT) for k in range(4)],
    "unzip": [r4(14.4 + k * BEAT / 4) for k in range(N)],
    "add": [r4(17.6 + k * BEAT / 2) for k in range(N)],
    "twist": [24.0, 25.6], "error": [28.0, 28.8, 29.6], "errIdx": 20,
    "storm": [r4(32.0 + k * BEAT / 4) for k in range(48)],
    "split": 36.8,
}
(ROOT / "remotion/src/videos/dna/dna.json").write_text(json.dumps(ev))
print("sequence:", seq)

main = Song(bpm=BPM, bars=BARS, loop=True)
sc = Song(bpm=BPM, bars=BARS, loop=True)
PROG = [[52, 59, 64, 67], [48, 55, 60, 64], [55, 62, 67, 71], [50, 57, 62, 66]]  # Em C G D
H = Hyper(main, sc, PROG, BEAT)
NOTE = {"A": 76, "T": 79, "C": 83, "G": 86}  # E5 G5 B5 D6: the letters live in E minor pentatonic
LEAD = [[88, None, 86, 88, None, 91, None, 88], [84, None, 83, 84, None, 88, None, 84], [86, None, 83, 86, None, 91, 90, 88], [86, 83, None, 81, None, 83, 86, None]]
def lead(bar, vol=0.065, up=0):
    for i, n in enumerate(LEAD[bar % 4]):
        if n: main.add(supersaw([n - 12 + up], BEAT / 2 * 0.95, vol=vol / 3, release=0.05), main.t(bar, i / 2))

kicks = []
def K(bar, which=(0, 1, 2, 3)):
    H.kick(bar, which); kicks.extend(main.t(bar, b) for b in which)

# 0-2 intro (the helix) — mirrored by 28-29
for bar in (0, 1, 2):
    K(bar); H.hats(bar); H.claps(bar); H.bass(bar); H.arp(bar, 0.04); H.pad(bar); lead(bar)
# 3-4 zoom out to the nucleus: filtered build
for bar in (3, 4): K(bar, (0, 2)); H.pad(bar, 0.035); H.arp(bar, 0.05); H.hats(bar)
main.add(crash(0.3, seed=2), main.t(3))
# 5-8 the code: half-time, the four letters ring out
for bar in range(5, 9):
    K(bar, (0, 2)); main.add(clap(0.26, seed=bar), main.t(bar, 2)); H.hats(bar); H.pad(bar, 0.035); H.bass(bar, 0.2)
for k, t in enumerate(ev["letters"]): main.add(pluck(NOTE["ATCG"[k]], 0.4, 0.1), t)
for bar in (6, 7):  # A–T, C–G pairs as dyads
    for b in range(4):
        x, y = ("A", "T") if bar == 6 else ("C", "G")
        main.add(pluck(NOTE[x], 0.25, 0.06), main.t(bar, b)); main.add(pluck(NOTE[y], 0.25, 0.05), main.t(bar, b + 0.5))
H.snare_roll(main.t(8), 1, 0.3); main.add(riser(BAR, 0.2, seed=8), main.t(8))
# 9-14 DROP 1: unzip (zaps) then the polymerase plays the sequence
main.add(impact(0.9, seed=21), main.t(9))
for bar in range(9, 15):
    K(bar); H.hats(bar, closed16=True); H.claps(bar); H.bass(bar); H.chords(bar)
for k, t in enumerate(ev["unzip"]): main.add(zap(0.07, 2200 + 60 * (k % 8)), t)
for k, t in enumerate(ev["add"]):
    b = seq[k]; main.add(pluck(NOTE[b], 0.2, 0.09), t); main.add(pluck(NOTE[PAIR[b]] - 12, 0.2, 0.05), t)
# 15-18 breakdown: two copies, proofreading
for bar in (15, 16, 17, 18): H.pad(bar, 0.04); H.arp(bar, 0.045); H.hats(bar)
main.add(supersaw([88, 91, 95], BAR, vol=0.018), ev["twist"][0])
e0, e1, e2 = ev["error"]
main.add(mix(pulse(58, 0.5, duty=0.5, vol=0.08), pulse(59, 0.5, duty=0.5, vol=0.08)), e0)   # wrong letter: sour buzz
main.add(sweep(1200, 300, 0.3, duty=0.25, vol=0.07), e1)                                   # removed
main.add(mix(pluck(NOTE["C"], 0.5, 0.1), pluck(NOTE["G"], 0.5, 0.08)), e2)                 # fixed
# 19 build
K(19); H.pad(19, 0.035); H.snare_roll(main.t(19), 1, 0.32); main.add(riser(BAR, 0.22, seed=11), main.t(19))
# 20-22 DROP 2: the storm of forks — the sequence as a 16th arp
main.add(impact(0.9, seed=31), main.t(20))
for bar in (20, 21, 22):
    K(bar); H.hats(bar, closed16=True); H.claps(bar); H.bass(bar); H.chords(bar); lead(bar, up=12)
for k, t in enumerate(ev["storm"]): main.add(pluck(NOTE[seq[k % N]] + 12, 0.08, 0.035), t)
# 23-27 the cell divides, payoff
main.add(impact(0.7, seed=41), ev["split"])
for bar in range(23, 28):
    K(bar); H.hats(bar, closed16=bar >= 25); H.claps(bar); H.bass(bar); (H.chords if bar >= 25 else H.pad)(bar); lead(bar)
# 28-29 outro = intro
for bar in (28, 29):
    K(bar); H.hats(bar); H.claps(bar); H.bass(bar); H.arp(bar, 0.04); H.pad(bar); lead(bar)

pump_mix(main, sc, kicks)
main.lowpass(9000)
main.reverb(wet=0.18, decay=1.6)
main.save(ROOT / "public/videos/08-dna/music.wav")
