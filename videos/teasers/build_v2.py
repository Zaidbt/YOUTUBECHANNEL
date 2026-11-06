"""Teasers v2 — smoother, more majestic. Same ideas as build.py, richer sound and a denser swarm.

fireflies: 170 coupled fireflies drift from random blinking to beat-locked sync; each flash is a soft note.
watch:     ticks as gentle percussion inside a warm hall; real speed -> slow-mo -> real speed.
Music: long detuned pads, sub bass, glassy bells, a reverse swell into the climax, convolution hall reverb.

Writes remotion/src/videos/teasers/{fireflies2,watch2}.json, public/videos/teasers/{fireflies2,watch2}.wav
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402

BPM, BARS = 120, 5
BAR = 4 * 60 / BPM
DUR = BARS * BAR
OUT_JSON = ROOT / "remotion/src/videos/teasers"
OUT_WAV = ROOT / "public/videos/teasers"


def bell(midi, dur=1.6, vol=0.08):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.15) + 0.1 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.05)
    return x * vol * np.exp(-t / 0.55) * np.clip(t / 0.006, 0, 1)

def warm_pad(song, start, dur, notes, vol=0.03):
    """Detuned triangle + soft pulse, slow swell in and out."""
    for n in notes:
        for det in (-0.07, 0.0, 0.07):
            m = len(tri(n, dur))
            x = tri(n + det, dur, vol) + pulse(n + 12 + det, dur, duty=0.5, vol=vol * 0.25)[:m]
            k = np.linspace(0, 1, len(x))
            env = np.clip(k / 0.35, 0, 1) * np.clip((1 - k) / 0.25, 0, 1)
            song.add(x * env, start)

def sub(song, start, dur, midi, vol=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * hz(midi) * t) * vol
    k = np.linspace(0, 1, n); x *= np.clip(k / 0.1, 0, 1) * np.clip((1 - k) / 0.2, 0, 1)
    song.add(x, start)

def swell(dur=2.0, vol=0.25, seed=5):
    """Reverse-cymbal style rise."""
    x = noise(dur, vol, 99, rate=44100, seed=seed)
    x = np.convolve(x, np.ones(12) / 12, mode="same")
    return x * np.linspace(0, 1, len(x)) ** 3

def heartbeat(vol=0.7):
    return kick(vol) * 0.8

def finish(song, name, cutoff=5200, wet=0.38, decay=2.6, fade=0.5):
    song.lowpass(cutoff)
    song.reverb(wet=wet, decay=decay)
    n = int(fade * SR); song.buf[-n:] *= np.linspace(1, 0, n) ** 1.5
    song.save(OUT_WAV / f"{name}.wav")


# ===================== FIREFLIES =====================
rng = np.random.default_rng(21)
N = 170
pos = np.stack([rng.uniform(-14, 14, N), rng.uniform(0.4, 9, N), rng.uniform(-40, 6, N)], 1)
omega = 2.0 * (1 + 0.13 * rng.standard_normal(N))
phi = rng.uniform(0, 1, N)
dt = 1 / 1000
K = lambda t: 0 if t < 2 else min(7.0, (t - 2) * 1.9)
C = lambda t: 0 if t < 5 else min(9.0, (t - 5) * 3.2)
flashes = [[] for _ in range(N)]
for step in range(int(DUR / dt)):
    t = step * dt
    z = np.exp(2j * np.pi * phi).mean(); R, psi = abs(z), np.angle(z)
    new = phi + dt * (omega + K(t) / (2 * np.pi) * R * np.sin(psi - 2 * np.pi * phi) + C(t) / (2 * np.pi) * np.sin(2 * np.pi * (2 * t - phi)))
    for i in np.nonzero(np.floor(new) > np.floor(phi))[0]:
        flashes[i].append(round(t + dt, 4))
    phi = new
(OUT_JSON / "fireflies2.json").write_text(json.dumps({"duration": DUR, "pos": pos.round(3).tolist(), "flashes": flashes}))
print(f"fireflies2: {N} fireflies, {sum(map(len, flashes))} flashes")

s = Song(bpm=BPM, bars=BARS, loop=True)
CHORDS = [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 64, 67], [55, 62, 67, 71], [57, 64, 69, 76]]
for bar, ch in enumerate(CHORDS):
    warm_pad(s, s.t(bar) - 0.15, BAR + 0.5, [n for n in ch], vol=0.022 if bar < 3 else 0.03)
    sub(s, s.t(bar), BAR, ch[0] - 24, vol=0.22 if bar < 3 else 0.32)
warm_pad(s, s.t(4), BAR, [69 + 12, 76 + 12], vol=0.012)  # air on top of the climax
s.add(swell(2.0, 0.22), s.t(3))
PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81]
all_f = sorted((t, i) for i, fs in enumerate(flashes) for t in fs)
times = np.array([t for t, _ in all_f])
for t, i in all_f:
    dens = np.sum(np.abs(times - t) < 0.025)
    s.add(bell(PENTA[i % len(PENTA)] + 12, vol=0.085 / np.sqrt(dens)), t)
for b in range(12, 20):
    s.add(heartbeat(0.45 if b < 16 else 0.7), b * s.beat)
finish(s, "fireflies2")


# ===================== WATCH =====================
RATE = 120
rates = [8, 2, 2, 4, 8]
ts = np.arange(int(DUR * RATE) + 1) / RATE
tc = np.zeros_like(ts)
for i in range(1, len(ts)):
    b = min(BARS - 1, int(((ts[i - 1] + ts[i]) / 2) // BAR))
    tc[i] = tc[i - 1] + rates[b] / RATE
    if abs(ts[i] - BAR) < 0.5 / RATE:
        tc[i] = np.ceil(tc[i] - 1e-6)
ticks = [0.0] + [round(float(ts[i]), 4) for i in range(1, len(ts)) if np.floor(tc[i] + 1e-6) > np.floor(tc[i - 1] + 1e-6)]
ticks = [t for t in ticks if t < DUR - 1e-6]
(OUT_JSON / "watch2.json").write_text(json.dumps({"duration": DUR, "rate": RATE, "tc": [round(float(x), 4) for x in tc], "ticks": ticks}))

s = Song(bpm=BPM, bars=BARS, loop=True)
WCH = [[50, 57, 62, 65], [46, 53, 62, 65], [53, 60, 64, 69], [48, 55, 64, 67], [50, 57, 62, 69]]
MEL = [[74, None, 77, None], [81, None, 79, 77], [76, None, 72, None], [79, 76, 74, 72], [74, None, None, None]]
for bar, ch in enumerate(WCH):
    warm_pad(s, s.t(bar) - 0.15, BAR + 0.5, ch, vol=0.024)
    sub(s, s.t(bar), BAR, ch[0] - 12, vol=0.3)
    for k, n in enumerate(MEL[bar]):
        if n: s.add(bell(n, dur=2.0, vol=0.06), s.t(bar, k))
s.add(swell(2.0, 0.2, seed=8), s.t(3))
for k, t in enumerate(ticks):
    b = t / BAR; tock = k % 2 == 1
    n = int(0.05 * SR); tt = np.arange(n) / SR
    wood = (np.sin(2 * np.pi * (1300 if tock else 1900) * tt) + 0.4 * np.sin(2 * np.pi * (2600 if tock else 3800) * tt)) * np.exp(-tt / 0.009)
    if b < 1 or b >= 4:
        s.add(wood * 0.07, t)
    else:
        s.add(wood * 0.11, t)
        s.add(heartbeat(0.75) if not tock else mix(noise(0.2, 0.16, 0.08, rate=7000, seed=k), tri(57, 0.06, 0.15, decay=0.03)), t)
finish(s, "watch2", cutoff=5600, wet=0.32)
print(f"watch2: {len(ticks)} ticks")
