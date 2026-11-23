"""Sound for video 038, frame-accurate from the simulation (events.json + frames_n.npy):
- every SPLIT = a bubbly pop + a kalimba note, at the exact birth time (no grid quantising); the note is a chord tone
  picked by the ball's x position (left = low, right = high), panned by x; dense moments are gain-normalised so they
  turn into a shimmering texture instead of clipping;
- every strong BOUNCE = a marble click (wall) or a woody tock (spinner arm), level = impact speed, panned by x;
- bed: the pad chord changes exactly when the colour wave changes (every 4 s), a soft kick marks each new wave, a low
  drone whose filter opens with the fill level (tension), a riser into FULL;
- FULL (40.0 s, ring flash) = impact + big chord; BURST (40.9 s) = explosion + a spray of clicks; the single new ball
  fades in at 43.55 s = one ping. 44 s, A minor colour (Am F C G Em F Dm E Am F)."""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]; HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts")); sys.path.insert(0, str(HERE))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
from sim import D, FULL_T, NMAX, FPS  # noqa: E402
rng = np.random.default_rng(38)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

EV = json.loads((HERE / "events.json").read_text()); NCOUNT = np.load(HERE / "frames_n.npy")
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT; WAVE = 2 * BAR
BURST0 = FULL_T + 0.9; RESET = D - 0.45
PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [52, 55, 59], [53, 57, 60], [50, 53, 57], [52, 56, 59], [57, 60, 64], [53, 57, 62]]

def pop(vol):
    n = int(0.05 * SR); t = np.arange(n) / SR
    f = 1500 * np.exp(-t / 0.012) + 520
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.014) * vol
def kalimba(midi, vol, dur=0.9):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.4) + 0.3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.04) + 0.12 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.15)
    return x * vol * np.clip(t / 0.0015, 0, 1)
_nz = noise(0.02, 1.0, 0.02, rate=44100, seed=3)
def click(vol, wood=False):
    n = int(0.03 * SR); t = np.arange(n) / SR; f = 900 if wood else 3400 + 600 * rng.random()
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / (0.012 if wood else 0.005)) + hp(_nz[:n] if len(_nz) >= n else np.pad(_nz, (0, n - len(_nz))), 2500) * 0.4 * np.exp(-t / 0.003)
    return x * vol
def drone(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = (2 * ((55 * t) % 1) - 1) + (2 * ((55.3 * t) % 1) - 1) + 0.6 * np.sin(2 * np.pi * 27.5 * t)
    fill = np.interp(t, np.arange(len(NCOUNT)) / FPS, NCOUNT / NMAX)
    cut = 150 + 2600 * fill ** 0.8
    y = np.zeros(n); s = 0.0; a = np.exp(-2 * np.pi * cut / SR)
    for i in range(n): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y * (0.04 + 0.08 * fill)
def explosion(vol=0.5):
    n = int(2.2 * SR); t = np.arange(n) / SR
    nz = noise(2.2, 1.0, 2.2, rate=44100, seed=11)[:n]
    return (lp(nz, 1800) * np.exp(-t / 0.5) * 0.6 + np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t / 0.4) + 30) / SR) * np.exp(-t / 0.7)) * vol

S = StereoSong(BPM, int(round(D / BAR)))
splits = [e for e in EV["events"] if e[0] < FULL_T + 0.05]
times = np.array([e[0] for e in splits])
for (t, _, h, x) in splits:
    dens = np.sum(np.abs(times - t) < 0.04)
    g = 1.0 / np.sqrt(dens)
    w = min(9, int(t / WAVE)); ch = PROG[w]
    u = min(0.999, max(0.0, (x - 70) / 940)); idx = int(u * 9)
    m = ch[idx % 3] + 12 * (1 + idx // 3)
    pan = (x - 540) / 540 * 0.7
    S.add(pop(0.10 * g), t, pan, "pops"); S.add(kalimba(m, 0.09 * g), t, pan, "notes")
bt_ = np.array([b[0] for b in EV["bounces"]])
for (t, x, sp, kind) in EV["bounces"]:
    if t >= FULL_T + 0.6: continue
    dens = np.sum(np.abs(bt_ - t) < 0.03)
    S.add(click(min(0.07, 0.07 * sp / 600) / np.sqrt(dens), wood=bool(kind)), t, (x - 540) / 540 * 0.8, "clicks")
# bed
for w in range(10):
    t0 = w * WAVE
    S.add(pad([m + 12 for m in PROG[w]], WAVE, 0.010 + 0.0025 * w), t0, 0.15, "pads")
    S.add(tkick(0.25 + 0.05 * w), t0, 0, "drums")
S.add(drone(FULL_T + 0.9), 0, 0, "drone")
S.add(riser(2 * BAR, 0.06, seed=4), FULL_T - 2 * BAR)
# FULL, BURST, RESET
S.add(impact(0.45), FULL_T + 0.1, 0, "fx"); S.add(pad([69, 72, 76, 81], 2.2, 0.035), FULL_T + 0.1, 0, "fx")
for m in (57, 64, 69, 72, 76): S.add(kalimba(m + 12, 0.07, 1.8), FULL_T + 0.1, 0, "fx")
S.add(explosion(0.45), BURST0, 0, "fx")
for k in range(320):
    tt = BURST0 + 1.3 * (k / 320) ** 1.8
    S.add(click(0.05 * (1 - k / 320), wood=k % 5 == 0), tt, rng.uniform(-0.9, 0.9), "clicks")
S.add(kalimba(81, 0.12, 1.6), RESET, 0.33, "fx"); S.add(pop(0.08), RESET, 0.33, "fx")
S.sidechain("pads", list(times[::3]), 0.15, 0.08)
S.reverb("notes", 0.28, 1.6, 21); S.reverb("pads", 0.4, 2.6, 41); S.reverb("fx", 0.3, 2.0, 31); S.reverb("clicks", 0.12, 0.6, 51); S.reverb("pops", 0.1, 0.5, 61)
S.save(HERE / "music.wav", gains={"pops": 1.0, "notes": 1.0, "clicks": 0.9, "pads": 0.9, "drums": 0.8, "drone": 0.9, "fx": 1.0})
print("sound", D)
