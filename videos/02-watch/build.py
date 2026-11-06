"""Video 002 · How does a watch tick? — tick timeline + soundtrack (single source of truth).

The watch ticks 8x per second at real speed. At 120 BPM that is exactly one tick per 16th note,
so the ticks ARE the hi-hats. In slow-mo the ticks become the kick (tick) and snare (tock).

Writes:
  remotion/src/videos/watch/timeline.json   tick counter tc(t) sampled at 120 Hz + tick times
  public/videos/02-watch/music.wav          32.000 s, loops seamlessly (last bar flows into the first)

Section map (bars of 2 s, 0-based) — mirrored in remotion/src/videos/watch/WatchVideo.tsx:
  0 outside hook · 1 zoom in · 2 inside real speed · 3 slowing (3D -> pixels)
  4-7 2D slow-mo 1/8 (tick on beats 1 & 3) · 8 1/4 (quarters) · 9 1/2 (eighths)
  10 back to 3D real speed · 11-12 big numbers · 13 zoom out · 14-15 outside (= bar 0, loop)
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402

BPM, BARS = 120, 16
BAR = 4 * 60 / BPM
DUR = BARS * BAR  # 32 s

# ---------- tick timeline ----------
RATE = 120  # samples per second

def rate_at(t):
    b = t / BAR
    if b < 3: return 8.0
    if b < 4: return 1 + 7 * (1 - (b - 3)) ** 2.5  # slowing: 8 -> 1 tick/s
    if b < 8: return 1.0
    if b < 9: return 2.0
    if b < 10: return 4.0
    return 8.0

ts = np.arange(int(DUR * RATE) + 1) / RATE
tc = np.zeros_like(ts)
for i in range(1, len(ts)):
    t = ts[i]
    tc[i] = tc[i - 1] + rate_at((ts[i - 1] + t) / 2) / RATE
    if abs(t - 4 * BAR) < 0.5 / RATE:  # snap so the first slow-mo tick lands on the downbeat
        tc[i] = np.ceil(tc[i] - 1e-6)
# a tick = the moment tc reaches the next whole number (t=0 included; the tick at t=32 is the loop's t=0)
ticks = [0.0] + [round(float(ts[i]), 4) for i in range(1, len(ts)) if np.floor(tc[i] + 1e-6) > np.floor(tc[i - 1] + 1e-6)]
ticks = [t for t in ticks if t < DUR - 1e-6]
assert round(tc[-1]) % 2 == 0, "loop needs an even tick count"
out = ROOT / "remotion/src/videos/watch/timeline.json"
out.write_text(json.dumps({"rate": RATE, "bpm": BPM, "bar": BAR, "duration": DUR, "tc": [round(float(x), 4) for x in tc], "ticks": ticks}))
print(f"timeline: {len(ticks)} ticks, tc_end={tc[-1]:.3f} -> {out.relative_to(ROOT)}")

# ---------- music ----------
s = Song(bpm=BPM, bars=BARS, loop=True)
B, E, S = s.beat, s.beat / 2, s.beat / 4

CH = {"Dm": [50, 53, 57], "Bb": [46, 50, 53], "F": [53, 57, 60], "C": [48, 52, 55]}
PROG = ["Dm", "Bb", "F", "C"]
chord = lambda bar: PROG[bar % 4]
MEL = {  # (16th step, midi, length in 16ths)
    "Dm": [(0, 74, 2), (2, 77, 2), (4, 81, 3), (8, 79, 2), (10, 77, 2), (12, 76, 2), (14, 74, 2)],
    "Bb": [(0, 74, 2), (2, 77, 2), (4, 82, 3), (8, 81, 2), (10, 79, 2), (12, 77, 4)],
    "F":  [(0, 72, 2), (2, 77, 2), (4, 81, 3), (8, 84, 2), (10, 81, 2), (12, 79, 4)],
    "C":  [(0, 79, 2), (2, 76, 2), (4, 72, 2), (6, 76, 2), (8, 79, 3), (12, 81, 2), (14, 79, 2)],
}
FUNK = [(0, 0, 2), (3, 12, 1), (4, 0, 1), (6, 0, 2), (8, 7, 1), (10, 12, 1), (11, 0, 1), (14, 10, 2)]

def funk_bass(bar, vol=0.5):
    r = CH[chord(bar)][0] - 12
    for st, iv, ln in FUNK:
        s.add(tri(r + iv, ln * S * 0.92, vol), s.t(bar, st / 4))

def lead(bar, vol=0.12, up=0):
    for st, n, ln in MEL[chord(bar)]:
        s.add(pulse(n + up, ln * S * 0.95, duty=0.25, vol=vol, decay=0.3, sustain=0.45, vibrato=0.004), s.t(bar, st / 4))

def arp(bar, vol=0.045):
    ns = [n + 12 for n in CH[chord(bar)]] + [CH[chord(bar)][1] + 24]
    for i in range(16):
        s.add(pulse(ns[i % 4], S * 0.8, duty=0.25, vol=vol, decay=0.08, sustain=0.2), s.t(bar, i / 4))

def drums(bar, vol=1.0):
    for b in (0, 2): s.add(kick(0.8 * vol), s.t(bar, b))
    s.add(kick(0.55 * vol), s.t(bar, 2.75))
    for b in (1, 3): s.add(mix(noise(0.14, 0.32 * vol, 0.05, rate=9000, seed=b), tri(57, 0.05, 0.25 * vol, decay=0.02)), s.t(bar, b))

def pad(bar, vol=0.05):
    for n in CH[chord(bar)]:
        x = pulse(n + 12, BAR, duty=0.5, vol=vol)
        x *= np.clip(np.linspace(0, 4, len(x)), 0, 1)  # slow attack
        s.add(x, s.t(bar))

def soft_crash(at, vol=0.18):
    x = noise(1.4, vol, 0.4, rate=16000, seed=7)
    s.add(np.convolve(x, np.ones(6) / 6, mode="same"), at)

# bars 0-2: outside + inside at real speed
soft_crash(0)
for bar in (0, 1, 2):
    funk_bass(bar); drums(bar); lead(bar)
    if bar == 2: arp(bar)
# bar 3: slowing (play on, then tape-stop everything that's not a tick)
funk_bass(3); drums(3); lead(3); arp(3)
s.tape_stop(s.t(3), BAR, end_rate=0.15)
# bars 4-7: slow-mo, half-time; the ticks below provide kick + snare
SLOW_BELL = {4: [74, 77, 81, 77], 5: [74, 77, 82, 77], 6: [72, 77, 81, 84], 7: [79, 76, 72, 76]}
for bar in range(4, 8):
    r = CH[chord(bar)][0] - 12
    s.add(tri(r, B * 1.9, 0.45), s.t(bar, 0)); s.add(tri(r + 7, B * 0.9, 0.4), s.t(bar, 2.5)); s.add(tri(r + 12, B * 0.9, 0.35), s.t(bar, 3.5))
    pad(bar)
    for i, n in enumerate(SLOW_BELL[bar]):
        s.add(pulse(n, B * 0.9, duty=0.5, vol=0.09, decay=0.3, sustain=0.0), s.t(bar, i))
# bar 8: quarters; bar 9: eighths + riser
for bar in (8, 9):
    funk_bass(bar, 0.42); pad(bar, 0.04)
    if bar == 9: arp(bar, 0.05)
s.add(sweep(220, 1760, BAR, duty=0.25, vol=0.05, curve=1.6), s.t(9))
# bars 10-15: back to real speed (bars 14-15 match bars 0-1 so the loop is seamless)
soft_crash(s.t(10))
for bar in range(10, 16):
    funk_bass(bar); drums(bar); lead(bar)
    if bar < 14: arp(bar)
    if bar in (11, 12): lead(bar, vol=0.06, up=12)

# ---------- ticks = percussion ----------
def click(freq, vol, dur=0.03):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.006) * vol + noise(dur, vol * 0.25, 0.003, rate=44100, seed=int(freq))

for k, t in enumerate(ticks):
    b = t / BAR
    tock = k % 2 == 1
    if b < 3 or b >= 10:      # real speed: ticks are the hi-hat
        s.add(click(1500 if tock else 2300, 0.13 if tock else 0.16), t)
    elif b < 4:               # slowing: clicks drop in pitch with the tape
        r = rate_at(t) / 8
        s.add(click((1500 if tock else 2300) * (0.4 + 0.6 * r), 0.18), t)
    else:                     # slow-mo: tick = kick, tock = snare, plus the click on top
        s.add(click(1500 if tock else 2300, 0.22), t)
        if tock: s.add(mix(noise(0.16, 0.36, 0.06, rate=9000, seed=k), tri(57, 0.06, 0.3, decay=0.025)), t)
        else: s.add(kick(0.9), t)

s.lowpass(7500)
s.save(ROOT / "public/videos/02-watch/music.wav")
