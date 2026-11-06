"""Soundtrack for 'How a car engine works'. 128 BPM, A minor, 16 bars + ending hit.

Sections (bars, 0-based) match the video timeline in remotion/src/videos/CarEngine.tsx:
 0-1  REAL SPEED   driving riff
 2    SLOWING      tape stop
 3-6  SLOW-MO      half-time; one engine stroke per bar (BANG on bar 5)
 7    RECAP        riff returns
 8-9  2X FASTER    build-up, snare roll
 10-11 IDLE        groove
 12-13 FLOOR IT    rev riser
 14-15 DROP        full energy, octave up
 16   END          final hit
"""
import sys; from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from chiptune import *

s = Song(bpm=128, bars=17, tail=0.3)
B, E, S = s.beat, s.beat / 2, s.beat / 4  # beat, eighth, sixteenth

CH = {"Am": [57, 60, 64], "F": [53, 57, 60], "C": [48, 52, 55], "G": [55, 59, 62]}
prog = ["Am", "F", "G", "Am", "F", "C", "G", "Am", "F", "G", "Am", "F", "C", "G", "F", "G", "Am"]
RIFF = {
    "Am": [81, None, 79, 81, None, 76, None, 79],
    "F":  [77, None, 76, 77, None, 72, None, 74],
    "C":  [76, None, 74, 76, None, 79, None, 76],
    "G":  [74, None, 71, 74, None, 79, 78, 79],
}

def bass8(bar, ch, vol=0.55):
    r = CH[ch][0] - 12
    for i, n in enumerate([r, r, r + 12, r, r, r + 12, r, r + 7]):
        s.add(tri(n, E * 0.9, vol), s.t(bar, i / 2))

def arp16(bar, ch, vol=0.07, octave=12, step=S):
    notes = [n + octave for n in CH[ch]] + [CH[ch][1] + octave + 12]
    k = 0; t = 0.0
    while t < 4 - 1e-6:
        s.add(pulse(notes[k % 4], step * 0.9, duty=0.125, vol=vol), s.t(bar, t)); k += 1; t += step / B

def riff(bar, ch, up=0, vol=0.16):
    for i, n in enumerate(RIFF[ch]):
        if n: s.add(pulse(n + up, E * 0.95, duty=0.25, vol=vol, decay=0.25, sustain=0.5), s.t(bar, i / 2))

def beat_full(bar, hats16=False):
    for b in range(4):
        s.add(kick(), s.t(bar, b)) if b in (0, 2) else s.add(snare(), s.t(bar, b))
    s.add(kick(0.7), s.t(bar, 2.5))
    for i in range(16 if hats16 else 8):
        s.add(hat(0.14 if i % 2 else 0.2), s.t(bar, i / (4 if hats16 else 2)))

# 0-1 REAL SPEED
s.add(crash(0.35), 0)
for bar in (0, 1):
    ch = prog[bar]; bass8(bar, ch); arp16(bar, ch); riff(bar, ch); beat_full(bar)
# 2 SLOWING: play on, then tape-stop the whole bar
bar = 2; ch = prog[bar]; bass8(bar, ch); arp16(bar, ch); riff(bar, ch); beat_full(bar)
s.tape_stop(s.t(2), s.bar)

# 3-6 SLOW-MO: half-time, one stroke per bar
SLOW_MEL = {3: [69, 72, 76, 72], 4: [69, 72, 77, 81], 5: [79, None, 76, None], 6: [74, 71, 67, 71]}
for bar in range(3, 7):
    ch = prog[bar]; r = CH[ch][0] - 12
    s.add(tri(r, B * 1.9, 0.55), s.t(bar, 0)); s.add(tri(r, B * 0.9, 0.5), s.t(bar, 1.5)); s.add(tri(r + 7, B * 1.4, 0.5), s.t(bar, 2.5))
    arp16(bar, ch, vol=0.06, step=E)
    s.add(kick(), s.t(bar, 0)); s.add(snare(), s.t(bar, 2)); s.add(kick(0.6), s.t(bar, 3.5))
    for i in range(4): s.add(hat(0.12), s.t(bar, i + 0.5))
    for i, n in enumerate(SLOW_MEL[bar]):
        if n: s.add(pulse(n, B * 0.95, duty=0.5, vol=0.13, decay=0.35, sustain=0.3, vibrato=0.006), s.t(bar, i))
s.add(sweep(300, 900, B * 0.9, duty=0.25, vol=0.08), s.t(3, 0))       # intake: rising "suck"
s.add(sweep(220, 660, s.bar * 0.95, duty=0.5, vol=0.05, curve=1), s.t(4, 0))  # compression: tension
s.add(boom(0.9), s.t(5, 0)); s.add(crash(0.5), s.t(5, 0))            # POWER STROKE
s.add(noise(B * 1.5, 0.12, 0.4, rate=6000, seed=9), s.t(6, 0))       # exhaust whoosh

# 7 RECAP
bar = 7; ch = prog[bar]; bass8(bar, ch); arp16(bar, ch); riff(bar, ch); beat_full(bar)
s.add(boom(0.5), s.t(7, 2))  # the one bang of the recap cycle

# 8-9 2X FASTER... THEN DOUBLE IT (build)
for bar in (8, 9):
    ch = prog[bar]; bass8(bar, ch, vol=0.5)
    arp16(bar, ch, vol=0.06 + 0.02 * (bar - 8), octave=12 * (bar - 7))
    for b in range(4): s.add(kick(0.8), s.t(bar, b))
    step = 0.5 if bar == 8 else 0.25
    for i in range(int(4 / step)):
        s.add(snare(0.18 + 0.3 * ((bar - 8) * 4 + i * step) / 8, seed=i), s.t(bar, i * step))
s.add(sweep(200, 1600, s.bar * 2, duty=0.125, vol=0.05, curve=1.5), s.t(8))

# 10-11 IDLE groove
s.add(crash(0.35), s.t(10))
for bar in (10, 11):
    ch = prog[bar]; bass8(bar, ch); arp16(bar, ch); riff(bar, ch); beat_full(bar)

# 12-13 FLOOR IT: engine-rev riser
for bar in (12, 13):
    ch = prog[bar]; bass8(bar, ch, vol=0.5); arp16(bar, ch, vol=0.07)
    for b in range(4): s.add(kick(0.85), s.t(bar, b))
    for i in range(8): s.add(hat(0.16), s.t(bar, i / 2))
s.add(sweep(55, 440, s.bar * 2, duty=0.35, vol=0.14, curve=1.3), s.t(12))
s.add(noise(s.bar * 2, 0.0001, 99, rate=44100) * np.linspace(0, 900, int(s.bar * 2 * SR)) ** 1.0, s.t(12))
for i in range(8): s.add(snare(0.2 + 0.05 * i, seed=20 + i), s.t(13, 2 + i / 4))

# 14-15 DROP
s.add(crash(0.5), s.t(14)); s.add(boom(0.6), s.t(14))
for bar in (14, 15):
    ch = prog[bar]; bass8(bar, ch); arp16(bar, ch, vol=0.08); riff(bar, ch, up=12, vol=0.14); riff(bar, ch, vol=0.08); beat_full(bar, hats16=True)

# 16 END: final A-minor hit
for n in CH["Am"] + [69, 72, 76]:
    s.add(pulse(n + 12, 1.2, duty=0.25, vol=0.08, decay=0.5, sustain=0.0), s.t(16))
s.add(tri(45, 1.2, 0.6, decay=0.5, sustain=0.0), s.t(16)); s.add(kick(), s.t(16)); s.add(crash(0.5), s.t(16))

s.save(Path(__file__).resolve().parents[2] / "public/videos/01-car-engine/music.wav")
