"""Sound for video 043, frame-accurate from the race (events.json):
- every floor that breaks = a crunch + a bell note that climbs a D minor scale with the floor number; the ×2 lane is
  panned LEFT (warm bell), the ×3 lane RIGHT (bright pluck) → you hear the left lane's notes slow down while the
  right lane's notes speed up into a run;
- bounces = soft clicks (sampled), panned by lane;
- bed: driving 8th-note pulse bass + kick + hats in D minor (Dm Bb F C), tension pad, a riser into the finish,
  WIN = impact + big chord, the loser's last floor = a low crunch, reset = reverse whoosh, quiet at the seam.
120 BPM, 44 s."""
import json, sys
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "scripts")); sys.path.insert(0, str(HERE))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
from sim import D, BAR, BEAT, START, FLOORS  # noqa: E402
rng = np.random.default_rng(43)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

EV = json.loads((HERE / "events.json").read_text()); TL = json.loads((HERE / "timeline.json").read_text())["TL"]
WIN_T = min(TL["L"]["finish"], TL["R"]["finish"]); LOSE_T = max(TL["L"]["finish"], TL["R"]["finish"])
MINOR = [0, 2, 3, 5, 7, 8, 10]
def scale(step, base=62):
    o, k = divmod(step, 7); return base + 12 * o + MINOR[k]

def bell(midi, vol, dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.25) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.08)) * vol * np.exp(-t / 0.45) * np.clip(t / 0.002, 0, 1)
def pluckb(midi, vol, dur=0.7):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t + 1.6 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.05))
    return x * vol * np.exp(-t / 0.2) * np.clip(t / 0.0015, 0, 1)
def crunch(vol, low=False):
    n = int(0.25 * SR); t = np.arange(n) / SR
    nz = noise(0.25, 1.0, 0.25, rate=44100, seed=int(vol * 1000) + (7 if low else 3))[:n]
    body = np.sin(2 * np.pi * np.cumsum((60 if low else 140) + 200 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.06)
    return (lp(hp(nz, 800 if not low else 200), 6000 if not low else 1500) * np.exp(-t / 0.05) * 0.6 + body * 0.6) * vol
def click(vol):
    n = int(0.02 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (2400 + 800 * rng.random()) * t) * np.exp(-t / 0.004) * vol
def pulse(midi, dur, vol=0.22):
    n = int(dur * SR); t = np.arange(n) / SR; ph = hz(midi) * t
    x = (2 * (ph % 1) - 1) + 0.5 * np.sin(2 * np.pi * ph)
    return lp(x, 900) * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.18) * np.clip((dur - t) / 0.02, 0, 1)
def whoosh(dur, vol, rev=False):
    n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
    env = k ** 2 if rev else (1 - k) ** 2
    return lp(hp(noise(dur, 1.0, dur, rate=44100, seed=9)[:n], 400), 4000) * vol * env

S = StereoSong(120, int(round(D / BAR)))
# floor breaks: the melody of the race
for (t, kind, nm, k) in [e for e in EV if e[1] == "break"]:
    if nm == "L":
        S.add(bell(scale(k, 50), 0.12), t, -0.6, "notes"); S.add(crunch(0.12), t, -0.6, "fx")
    else:
        S.add(pluckb(scale(k, 62), 0.11), t, 0.6, "notes"); S.add(crunch(0.11), t, 0.6, "fx")
# bounces (sampled, quiet)
b = [e for e in EV if e[1] == "bounce"]; bt_ = np.array([e[0] for e in b])
for (t, kind, nm, x) in b[::2]:
    if t > LOSE_T: continue
    dens = np.sum(np.abs(bt_ - t) < 0.02)
    S.add(click(0.03 / np.sqrt(dens)), t, -0.6 if nm == "L" else 0.6, "clicks")
# bed: energetic from the first frame; breakdown on "...OR IS IT?", drop on "HERE IT COMES!"
CH = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]; RT = [38, 34, 41, 36]
RIFF = [(0, 74), (2, 77), (3, 74), (6, 72), (8, 69), (10, 72), (12, 74), (14, 77)]
BREAK0, DROP = 26.8, 31.4
END = int((LOSE_T + 1.0) / BAR) + 1
def brass(notes, dur, vol=0.1):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: ph = hz(m) * t; x += 2 * (ph % 1) - 1
    return lp(x, 2600) / len(notes) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
kicks = []
for bar in range(END):
    ch, r = CH[bar % 4], RT[bar % 4]
    for q in range(16):
        t = bar * BAR + q * BEAT / 4
        if t > LOSE_T + 0.6: break
        brk = BREAK0 <= t < DROP; big = t >= DROP
        if q % 2 == 0: S.add(pulse(r + (12 if q % 4 == 2 else 0), BEAT / 2 * 0.9, 0.2 if not brk else 0.08), t, 0, "bass")
        if q % 4 == 0 and not (brk and q != 0): S.add(tkick(0.8 if not brk else 0.5), t, 0, "drums"); kicks.append(t)
        if q % 4 == 2 and not brk: S.add(hat(0.03, seed=bar * 16 + q, long=True), t, 0.3, "drums")
        if big and q % 2 == 1: S.add(hat(0.018, seed=900 + bar * 16 + q), t, -0.3, "drums")
        if q in (4, 12) and not brk: S.add(clap(0.2, seed=bar + q), t, 0, "drums")
        if brk and t > DROP - 1.0: S.add(snare(0.05 + 0.15 * (t - DROP + 1.0), seed=q), t, 0, "drums")
    S.add(pad([m + 12 for m in ch], BAR, 0.014 if bar * BAR < DROP else 0.022), bar * BAR, 0, "pads")
    if not (BREAK0 <= bar * BAR < DROP):
        for q, m in RIFF: S.add(chop(m, BEAT / 4 * 1.7, "ao"[q % 2], 0.16 if bar * BAR < DROP else 0.2), bar * BAR + q * BEAT / 4, 0.15, "lead")
# hype hits on every banner
for tb in (0.0, 9.0, 23.4, 26.8, 31.4, 35.0):
    S.add(brass([62, 65, 69, 74], BEAT * 0.9, 0.12), tb, 0, "fx"); S.add(impact(0.25), tb, 0, "fx")
S.add(riser(WIN_T - 30.0, 0.07, seed=4), 30.0)
S.add(impact(0.5), WIN_T, 0.4, "fx"); S.add(pad([62, 65, 69, 74, 77], 3.0, 0.035), WIN_T, 0, "fx")
for k, m in enumerate((74, 77, 81, 86)): S.add(pluckb(m, 0.1, 1.2), WIN_T + 0.08 * k, 0.6, "notes")
S.add(crunch(0.2, low=True), LOSE_T, -0.6, "fx")
S.add(whoosh(1.0, 0.09, rev=True), D - 2.6 - 0.2, 0, "fx")
S.add(riser(1.2, 0.05, seed=8), D - 1.2)
S.sidechain("pads", kicks, 0.4); S.sidechain("bass", kicks, 0.25)
S.reverb("notes", 0.3, 1.8, 21); S.reverb("pads", 0.4, 2.6, 41); S.reverb("fx", 0.25, 1.6, 31); S.reverb("drums", 0.07, 0.8, 51); S.reverb("clicks", 0.1, 0.5, 61)
S.delay("lead", BEAT * 0.75, fb=0.3, mix=0.2); S.reverb("lead", 0.25, 1.6, 71)
S.save(HERE / "music.wav", gains={"notes": 1.0, "fx": 1.0, "clicks": 0.7, "bass": 0.95, "drums": 1.0, "pads": 0.85, "lead": 0.85})
print("sound", D)
