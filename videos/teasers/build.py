"""Two 10 s teasers in the cinematic pixel-3D style (120 BPM = 5 bars of 2 s).

fireflies: a pulse/phase-coupled firefly swarm drifts from random blinking to perfect sync.
           Every flash is a note: chaos → chords on the beat. The sim drives both picture and sound.
watch:     the watch escapement, ticks as percussion: real speed → slow-mo (tick per beat) → back up.

Writes remotion/src/videos/teasers/{fireflies,watch}.json and public/videos/teasers/{fireflies,watch}.wav
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402

BPM, BARS = 120, 5
BAR = 4 * 60 / BPM
DUR = BARS * BAR  # 10 s
OUT_JSON = ROOT / "remotion/src/videos/teasers"; OUT_JSON.mkdir(parents=True, exist_ok=True)
OUT_WAV = ROOT / "public/videos/teasers"; OUT_WAV.mkdir(parents=True, exist_ok=True)


def bell(midi, dur=0.9, vol=0.08):
    """Soft glassy pluck (sine + a little octave), for firefly flashes."""
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.08)
    return x * vol * np.exp(-t / 0.28) * np.clip(t / 0.004, 0, 1)

def pad(song, bar, notes, vol=0.035, bars=1.0):
    for n in notes:
        for det in (-0.08, 0.08):
            x = pulse(n + det, BAR * bars, duty=0.5, vol=vol)
            env = np.clip(np.linspace(0, 3, len(x)), 0, 1) * np.clip(np.linspace(4, 0, len(x)), 0, 1)
            song.add(x * env, song.t(bar))

def soft_kick(vol=0.7):
    return kick(vol) * 0.9

def finish(song, name, cutoff=4200, fade=0.35):
    song.lowpass(cutoff)
    n = int(fade * SR); song.buf[-n:] *= np.linspace(1, 0, n)
    song.save(OUT_WAV / f"{name}.wav")


# ===================== FIREFLIES =====================
rng = np.random.default_rng(7)
N = 72
pos = np.stack([rng.uniform(-11, 11, N), rng.uniform(0.6, 7.5, N), rng.uniform(-26, 4, N)], 1)
omega = 2.0 * (1 + 0.13 * rng.standard_normal(N))  # natural flash rates around 2 Hz (= the beat)
phi = rng.uniform(0, 1, N)
dt = 1 / 1000
K = lambda t: 0 if t < 2 else min(7.0, (t - 2) * 1.9)          # neighbours start to matter at bar 1
C = lambda t: 0 if t < 5 else min(9.0, (t - 5) * 3.2)          # ...and lock onto the beat by bar 4
flashes = [[] for _ in range(N)]
for step in range(int(DUR / dt)):
    t = step * dt
    z = np.exp(2j * np.pi * phi).mean(); R, psi = abs(z), np.angle(z)
    dphi = omega + K(t) / (2 * np.pi) * R * np.sin(psi - 2 * np.pi * phi) + C(t) / (2 * np.pi) * np.sin(2 * np.pi * (2 * t - phi))
    new = phi + dphi * dt
    for i in np.nonzero(np.floor(new) > np.floor(phi))[0]:
        flashes[i].append(round(t + dt, 4))
    phi = new
sync = [abs(np.exp(2j * np.pi * np.array([f[-1] * 2 for f in flashes if f])).mean())]
(OUT_JSON / "fireflies.json").write_text(json.dumps({"duration": DUR, "bar": BAR, "pos": pos.round(3).tolist(), "flashes": flashes}))
print(f"fireflies: {sum(map(len, flashes))} flashes, final beat-lock R={sync[0]:.2f}")

s = Song(bpm=BPM, bars=BARS, loop=True)
PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79]
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62], [57, 64, 69]]
for bar, ch in enumerate(CHORDS):
    pad(s, bar, [n + 12 for n in ch], vol=0.03 if bar < 4 else 0.045)
    s.add(tri(ch[0] - 12, BAR * 0.95, 0.25 if bar < 3 else 0.4), s.t(bar))
# each flash = a note; dense moments get scaled down so the sync builds into a chord, not a wall of noise
all_f = sorted((t, i) for i, fs in enumerate(flashes) for t in fs)
times = np.array([t for t, _ in all_f])
for t, i in all_f:
    dens = np.sum(np.abs(times - t) < 0.02)
    s.add(bell(PENTA[i % len(PENTA)] + 12, vol=0.11 / np.sqrt(dens)), t)
for b in range(12, 20):  # heartbeat kick as they lock in (bars 3-4)
    s.add(soft_kick(0.5 if b < 16 else 0.75), b * s.beat)
for b in range(16, 20):
    s.add(mix(noise(0.12, 0.12, 0.05, rate=9000, seed=b), tri(57, 0.04, 0.1, decay=0.02)), (b + 0.5) * s.beat)
finish(s, "fireflies")


# ===================== WATCH =====================
RATE = 120
rates = [8, 2, 2, 4, 8]  # ticks per second per bar: real → slow-mo (tick per beat) → 2x → real
ts = np.arange(int(DUR * RATE) + 1) / RATE
tc = np.zeros_like(ts)
for i in range(1, len(ts)):
    b = min(BARS - 1, int(((ts[i - 1] + ts[i]) / 2) // BAR))
    tc[i] = tc[i - 1] + rates[b] / RATE
    if abs(ts[i] - BAR) < 0.5 / RATE:
        tc[i] = np.ceil(tc[i] - 1e-6)
ticks = [0.0] + [round(float(ts[i]), 4) for i in range(1, len(ts)) if np.floor(tc[i] + 1e-6) > np.floor(tc[i - 1] + 1e-6)]
ticks = [t for t in ticks if t < DUR - 1e-6]
(OUT_JSON / "watch.json").write_text(json.dumps({"duration": DUR, "bar": BAR, "rate": RATE, "tc": [round(float(x), 4) for x in tc], "ticks": ticks}))
print(f"watch: {len(ticks)} ticks")

s = Song(bpm=BPM, bars=BARS, loop=True)
WCH = [[50, 57, 62], [46, 53, 62], [53, 57, 64], [48, 55, 64], [50, 57, 62]]
MEL = [[74, 77, 81, 79], [77, 74, 70, 74], [72, 77, 81, 84], [79, 76, 72, 76], [74, 81, 86, 81]]
for bar, ch in enumerate(WCH):
    pad(s, bar, [n + 12 for n in ch], vol=0.03)
    s.add(tri(ch[0] - 12, BAR * 0.95, 0.4), s.t(bar))
    for k, n in enumerate(MEL[bar]):
        s.add(bell(n, dur=0.8, vol=0.07 if bar in (1, 2) else 0.05), s.t(bar, k))
for k, t in enumerate(ticks):
    b = t / BAR
    tock = k % 2 == 1
    click = lambda f, v: np.sin(2 * np.pi * f * np.arange(int(0.03 * SR)) / SR) * np.exp(-np.arange(int(0.03 * SR)) / SR / 0.006) * v
    if b < 1 or b >= 4:
        s.add(click(1500 if tock else 2300, 0.14), t)
    else:
        s.add(click(1500 if tock else 2300, 0.2), t)
        s.add(mix(noise(0.14, 0.3, 0.05, rate=9000, seed=k), tri(57, 0.05, 0.25, decay=0.02)) if tock else soft_kick(0.85), t)
finish(s, "watch")
