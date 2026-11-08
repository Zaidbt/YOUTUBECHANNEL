"""Video 016 · How does a light bulb make light? — 40 s seamless loop, 120 BPM clean synthwave (20 bars), stereo.

Story (bars, 2 s each): 0-1 hook: a glowing LED bulb (a moth circles it) · 2-3 "~10 quintillion photons a second"
(a sparkle per photon burst) · 4 DIVE into the LED chip: N crystal (extra electrons) vs P crystal (holes), a step
between them · 5.5 switch on (3 V) · 6-9 electrons fall off the step into holes, each fall = a flash of light = a note
(pitch = colour) · 9-10.5 bigger fall = bluer (red / green / blue, low / mid / high notes) · 10.5-12 blue LEDs, Nobel
2014 (16ths) · 12 dive out: blue chip + yellow phosphor = white (blue = high note, yellow = lower) · 14 old bulb: a
2,500 °C wire, 90 % heat · 16 LEDs: 75 % less power, up to 25x longer life · 18.5 hook again (loop).
Writes remotion/src/videos/bulb/bulb.json + public/videos/16-bulb/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 120, 20
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(16)

hero_ph = [bt(2, s) for s in range(0, 32, 2)]                                   # photon bursts out of the bulb
von = bt(5, 8)                                                                   # switch on
gap_at = lambda t: 0.8 if bt(9) <= t < bt(9, 8) else 1.1 if bt(9, 8) <= t < bt(10) else 1.4
rec = [bt(6 + k // 8, (k % 8) * 2) for k in range(24)] + [bt(9 + k // 8, (k % 8) * 2) for k in range(12)] \
    + [bt(10, 8 + k) if k < 8 else bt(11, k - 8) for k in range(24)]
rec = [{"t": t, "g": gap_at(t)} for t in rec]
pkg = [bt(12, 4 + 2 * k) if k < 6 else bt(13, 2 * (k - 6)) for k in range(14)]   # photons in the phosphor dome
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "heroPh": hero_ph, "von": von, "rec": rec, "pkg": pkg}
(ROOT / "remotion/src/videos/bulb/bulb.json").write_text(json.dumps(ev))

def lp(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def hp(x, cut): return x - lp(x, cut)
def saws(f, n, v=4, sp=0.008):
    x = np.zeros(n)
    for k in range(v):
        dt = 1 + (sp * (k - (v - 1) / 2) / ((v - 1) / 2) if v > 1 else 0)
        ph = np.cumsum(np.full(n, f * dt)) / SR + rng.random(); x += 2 * (ph % 1) - 1
    return x / v
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(48 + 120 * np.exp(-t / 0.028)) / SR) * np.exp(-t / 0.22)
    c = hp(noise(0.006, 1.0, 0.002, rate=44100, seed=1), 3000); out[:len(c)] += c * 0.25
    return out
def snare(vol=0.3, seed=0):                                                     # clean "gated" 80s snare
    n = int(0.26 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
    nz = lp(hp(noise(0.26, 1.0, 0.26, rate=44100, seed=seed)[:n], 900), 7000)
    gate = np.clip((0.2 - t) / 0.03, 0, 1) * (0.55 + 0.45 * np.exp(-t / 0.05))
    return (body + nz * gate * 0.6) * vol
def hat(vol, seed): x = noise(0.05, 1.0, 0.02, rate=44100, seed=seed); return hp(x, 7000) * vol
def bass(midi, dur, vol=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(saws(hz(midi), n, 2, 0.004), 700) * 1.6 + 0.5 * np.sin(2 * np.pi * hz(midi) * t)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.18)
def pluck(midi, vol=0.08, dur=0.45):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = lp(saws(f, n, 3, 0.01), 3500) * 0.7 + 0.5 * np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.05)
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.16)
def bell(midi, vol=0.08, dur=0.9):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t + 1.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / 0.15))
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.35)
def pad(notes, dur, vol=0.03, cut=1500):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: x += saws(hz(m), n, 6, 0.014)
    return lp(x, cut) * vol * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
def lead(midi, dur, vol=0.085):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.25, 0, 1))
    ph = np.cumsum(f) / SR
    x = lp(2 * (ph % 1) - 1, 2600) * 0.6 + np.sin(2 * np.pi * ph) * 0.6
    return x * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.06, 0, 1)
def boom(vol=0.5):
    n = int(1.4 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(40 + 80 * np.exp(-t / 0.09)) / SR) * np.exp(-t / 0.55) * vol
def swell(dur, vol=0.04, seed=4):
    x = noise(dur, 1.0, dur, rate=44100, seed=seed); k = np.linspace(0, 1, len(x))
    return (lp(x, 500) * (1 - k) + lp(x, 5000) * k) * k ** 2.5 * vol
def click(vol=0.3):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.004) * vol

S = StereoSong(BPM, BARS)
CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]     # Am F C G
ROOT_ = [45, 41, 48, 43]
sec = lambda b: "hook" if b < 2 or b >= 18 else "build" if b < 4 else "chip" if b < 6 else "drive" if b < 12 else "pkg" if b < 14 else "old" if b < 16 else "led"
kicks = []
for bar in range(BARS):
    s_ = sec(bar); r = ROOT_[bar % 4]; ch = CH[bar % 4]
    full = s_ in ("hook", "drive", "pkg", "led")
    ks = (0, 4, 8, 12) if full or s_ == "build" else (0, 8) if s_ in ("old",) else ()
    for s in ks: S.add(kick(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
    if full or s_ == "old":
        for s in (4, 12): S.add(snare(0.28, seed=bar * 3 + s), bt(bar, s), 0.05, "drums")
    for s in range(16):
        if full or s_ in ("build", "led") or (s_ == "chip" and s % 4 == 2): S.add(hat([0.03, 0.012, 0.022, 0.012][s % 4], seed=500 + bar * 16 + s), bt(bar, s), [-0.3, 0.3][s % 2], "drums")
    if s_ != "chip" or bar == 5:                                                 # 16th octave bass (synthwave)
        for s in range(16): S.add(bass(r - 12 + (12 if s % 2 else 0), S16 * 0.9, 0.3 if s_ != "old" else 0.22), bt(bar, s), 0, "bass")
    else:
        S.add(bass(r - 12, BAR * 0.9, 0.22), bt(bar), 0, "bass")
    S.add(pad(ch, BAR, 0.026, 900 if s_ in ("chip", "old") else 1700), bt(bar), -0.35, "pads")
    S.add(pad([n + 12 for n in ch[:3]], BAR, 0.012, 2200), bt(bar), 0.35, "pads")
    if s_ in ("hook", "led"):
        for s in range(0, 16, 2): S.add(pluck(ch[(s // 2) % 4] + 12, 0.05), bt(bar, s), [-0.45, 0.45][(s // 2) % 2], "keys")
HOOK = [(0, 76, 3), (3, 74, 3), (6, 72, 2), (8, 76, 6), (16, 77, 3), (19, 76, 3), (22, 72, 2), (24, 69, 8)]
for start in (0, 18):
    for s, m, ln in HOOK: S.add(lead(m, ln * S16 * 0.95), bt(start + s // 16, s % 16), 0, "lead")
S.delay("lead", BEAT * 0.75, fb=0.4, mix=0.3); S.delay("keys", BEAT * 0.5, fb=0.35, mix=0.22)
# events play the music
for i, t in enumerate(hero_ph): S.add(bell([84, 88, 91, 93][i % 4], 0.045, 0.5), t, [-0.6, 0.6][i % 2], "keys")
S.add(click(0.35), von, 0, "fx"); S.add(swell(BAR / 2, 0.04), von - BAR / 2)
COL = {0.8: [57, 60, 64], 1.1: [64, 67, 69], 1.4: [76, 79, 81, 84]}               # red = low, green = mid, blue = high
for i, e in enumerate(rec): S.add(bell(COL[e["g"]][i % len(COL[e["g"]])], 0.07 if e["g"] == 1.4 else 0.085), e["t"], [-0.4, 0.4][i % 2], "keys")
for i, t in enumerate(pkg): S.add(bell([84, 81][i % 2] if i % 2 == 0 else [72, 69][(i // 2) % 2], 0.07), t, [-0.5, 0.5][i % 2], "keys")
S.add(boom(0.4), bt(4), 0, "fx"); S.add(boom(0.35), bt(12), 0, "fx"); S.add(boom(0.3), bt(14), 0, "fx"); S.add(boom(0.3), bt(16), 0, "fx")
S.add(swell(BAR, 0.05, seed=8), bt(3)); S.add(swell(BAR, 0.05, seed=9), bt(11))
S.sidechain("bass", kicks, 0.5); S.sidechain("pads", kicks, 0.55); S.sidechain("keys", kicks, 0.2)
S.reverb("keys", 0.3, 1.8, 21); S.reverb("pads", 0.35, 2.4, 31); S.reverb("lead", 0.3, 2.0, 41); S.reverb("drums", 0.12, 1.0, 51); S.reverb("fx", 0.3, 1.5, 61)
S.save(ROOT / "public/videos/16-bulb/music.wav", gains={"drums": 1.0, "bass": 0.9, "keys": 0.9, "pads": 0.8, "lead": 1.0, "fx": 0.9})
print(f"bulb: {DUR:.3f} s")
