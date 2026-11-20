"""Video 034 · How a microwave heats food. Format of 030-033.
41.1 s seamless loop, 140 BPM clean future bass (half-time, supersaw chords, a wobble that IS the microwave hum) in
A minor (24 bars). The magnetron hum is an A1 (55 Hz) drone under the hook; every field flip in ② is a pluck; the
"ding" is an A-major bell.
Facts: microwaves at 2.45 GHz; water molecules are polar (+ end, - end) and turn to follow the electric field, which
flips direction ~4.9 billion times a second (2 flips per cycle); the jostling = heat (dielectric heating). The magnetron
makes the waves, a waveguide carries them in, they bounce off the metal walls and make standing waves: hot and cold
spots about 6 cm apart (half of the 12.2 cm wavelength) → the turntable moves the food through them. Microwaves only
reach ~1-2 cm into most food; the middle heats by conduction → stir / let it stand.
Timeline (bars): 0-2 hook (microwave running) · 2-2.5 dive into the food · 2.5-5.5 ① water has a + and a - end ·
5.5-8.5 ② the field flips 4.9 billion times a second · 8.5-11.5 ③ jostling = heat · 11.5-14.5 ④ the magnetron ·
14.5-17.5 ⑤ hot & cold spots → it spins · 17.5-20.5 ⑥ only 1-2 cm deep → stir · 20.5-22 ding · 22-24 hook.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(34)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 140, 24
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
L = [bb(x) for x in (0, 2, 2.5, 5.5, 8.5, 11.5, 14.5, 17.5, 20.5, 22, 24)]
FLIPS = [bt(b, s) for b in range(5, 9) for s in range(0, 16, 2) if L[3] <= bt(b, s) < L[4]]
DING = bb(21.0)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "l": L, "flips": FLIPS, "ding": DING}
(ROOT / "remotion/src/videos/microwave/microwave.json").write_text(json.dumps(ev))

def saw_chord(notes, dur, vol=0.05, cut=2400):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.012, -0.004, 0.004, 0.012): ph = hz(m) * (1 + d) * t + rng.random(); x += 2 * (ph % 1) - 1
    return lp(x, cut) / (len(notes) * 2) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.04, 0, 1)
def wob(midi, dur, rate, vol=0.12):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi); ph = f * t
    x = 2 * (ph % 1) - 1 + 0.6 * np.sin(2 * np.pi * ph * 0.5)
    lfo = 0.5 - 0.5 * np.cos(2 * np.pi * rate * t)
    y = np.zeros(n); s = 0.0
    a = np.exp(-2 * np.pi * (150 + 1600 * lfo) / SR)
    for i in range(n): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y * vol * np.clip(t / 0.005, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
def bell(midi, vol=0.12, dur=1.8):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.3) + 0.25 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / 0.1)) * vol * np.exp(-t / 0.7) * np.clip(t / 0.002, 0, 1)
def hum(dur, vol=0.06):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 110 * t) + 0.25 * np.sin(2 * np.pi * 165 * t)) * vol * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)

S = StereoSong(BPM, BARS)
CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 52, 55, 59, 64], [55, 59, 62, 66]]; RT = [33, 29, 36, 31]
LEAD = [(0, 76), (3, 79), (6, 76), (8, 74), (10, 72), (12, 74), (14, 76)]
def sect(b): return "hook" if b < 2 or b >= 22 else "calm" if (b < 5.5 or 11.5 <= b < 14.5) else "full"
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; sc = sect(bar)
    for s in range(16):
        t = bt(bar, s)
        if s == 0 or (s == 10 and sc != "calm"): S.add(tkick(0.85), t, 0, "drums"); kicks.append(t)
        if s == 8: S.add(clap(0.24 if sc != "calm" else 0.16, seed=bar), t, 0, "drums"); S.add(snr(0.12, seed=bar), t, 0.1, "drums")
        if s % 2 == 0: S.add(hat(0.025, seed=200 + bar * 16 + s), t, 0.3, "drums")
        if sc == "full" and s in (13, 15): S.add(hat(0.02, seed=600 + bar * 16 + s), t, -0.3, "drums")
    if sc == "full":
        S.add(wob(r, BEAT * 1.9, 4 / BEAT / 2, 0.12), bt(bar), 0, "bass"); S.add(wob(r, BEAT * 1.9, 2 / BEAT, 0.12), bt(bar, 8), 0, "bass")
    else:
        S.add(k808(r, BAR * 0.9, 0.3), bt(bar), 0, "bass")
    for s in (0, 3, 6, 10, 12) if sc == "full" else (0, 8):
        S.add(saw_chord(ch, S16 * (2.5 if sc == "full" else 7), 0.06 if sc == "full" else 0.045, 2600 if sc == "full" else 1500), bt(bar, s), 0, "keys")
    S.add(pad([m + 12 for m in ch[:3]], BAR, 0.012), bt(bar), 0.15, "pads")
    if sc != "calm":
        for s, m in LEAD: S.add(chop(m, S16 * 1.8, "ae"[s % 2], 0.2), bt(bar, s), 0.1, "chop")
for a, c in ((L[0], L[1]), (L[9], L[10])): S.add(hum(c - a, 0.07), a, 0, "fx")
for i, t in enumerate(FLIPS): S.add(pluck([81, 84, 88, 84][i % 4], 0.07, 0.25), t, (-0.4, 0.4)[i % 2], "fx")
for k, m in enumerate((81, 85, 88)): S.add(bell(m + 12, 0.1), DING + k * 0.004, 0, "fx")
S.add(riser(BAR, 0.05, seed=3), L[1] - BAR / 2); S.add(impact(0.3), L[2], 0, "fx"); S.add(impact(0.25), L[5], 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("fx", BEAT * 0.5, fb=0.25, mix=0.15)
S.sidechain("bass", kicks, 0.3); S.sidechain("pads", kicks, 0.5); S.sidechain("keys", kicks, 0.45)
S.reverb("chop", 0.25, 1.6, 21); S.reverb("keys", 0.2, 1.6, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.25, 1.4, 61)
S.save(ROOT / "public/videos/34-microwave/music.wav", gains={"drums": 1.0, "bass": 0.95, "keys": 0.9, "pads": 0.8, "chop": 0.9, "fx": 1.0})
print(f"microwave: {DUR:.3f} s")
