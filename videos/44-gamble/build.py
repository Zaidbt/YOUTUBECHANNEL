"""Sound for video 044 (steady vs gambler), from the race events: happy 128 BPM tropical pop (marimba riff, off-beat
plucks, claps, round bass). Floor breaks = notes climbing a C major scale (steady LEFT, gambler RIGHT); the coin:
spin whirr, HEADS = bright coin jingle, TAILS = a sad two-note 'wah-wah'; popped balls = bubble pops; countdown
beeps in key; a hit on every callout; win fanfare. 48.75 s loop."""
import json, sys
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "scripts")); sys.path.insert(0, str(HERE))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
from sim import D, BAR, BEAT, START, FLOORS, FLIPS  # noqa: E402
rng = np.random.default_rng(44)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])
EV = json.loads((HERE / "events.json").read_text()); TL = json.loads((HERE / "timeline.json").read_text())["TL"]
WIN_T = TL["S"]["finish"]; G = TL["G"]["brk"]; SB = TL["S"]["brk"]
MAJ = [0, 2, 4, 5, 7, 9, 11]
def sc(step, base=60): o, k = divmod(step, 7); return base + 12 * o + MAJ[k]
def steel(midi, vol, dur=0.6):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.15) + 0.3 * np.sin(2 * np.pi * f * 2.92 * t) * np.exp(-t / 0.08)
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.28)
def coinj(vol=0.12):
    a = steel(88, vol, 0.12); b = steel(95, vol, 0.5); out = np.zeros(int(0.62 * SR)); out[:len(a)] += a; out[int(0.08 * SR):int(0.08 * SR) + len(b)] += b; return out
def wahwah(vol=0.12):
    def tone(m, d):
        n = int(d * SR); t = np.arange(n) / SR; f = hz(m) * (1 - 0.03 * t / d); ph = np.cumsum(f) / SR
        x = 2 * (ph % 1) - 1; return lp(x, 1100) * (0.6 + 0.4 * np.sin(np.pi * t / d)) * vol * np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.05, 0, 1)
    a, b = tone(55, 0.22), tone(54, 0.4); out = np.zeros(len(a) + len(b) + 100); out[:len(a)] += a; out[len(a) + 100:] += b; return out
def whirr(dur=0.45, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * (18 + 30 * t / dur) * t)) * hp(noise(dur, 1.0, dur, rate=44100, seed=4)[:n], 3000) * vol
def bubble(vol):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(600 + 1600 * t / 0.05) / SR) * np.exp(-t / 0.015) * vol
def bass(midi, dur, vol=0.26):
    n = int(dur * SR); t = np.arange(n) / SR; ph = hz(midi) * t
    return lp(np.sin(2 * np.pi * ph) + 0.3 * (2 * (ph % 1) - 1), 800) * vol * np.clip(t / 0.003, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
def skank(notes, vol=0.05):
    n = int(0.16 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: ph = hz(m) * t; x += 2 * (ph % 1) - 1
    return lp(x, 2600) / len(notes) * vol * np.exp(-t / 0.05)
def brass(notes, dur, vol=0.1):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: ph = hz(m) * t; x += 2 * (ph % 1) - 1
    return lp(x, 2800) / len(notes) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)

S = StereoSong(128, int(round(D / BAR)))
CH = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]; RT = [36, 31, 33, 29]
RIFF = [(0, 72), (2, 76), (3, 79), (6, 76), (8, 74), (10, 72), (11, 74), (14, 67)]
END = WIN_T + 2.5
kicks = []
for bar in range(int(D / BAR)):
    ch, r = CH[bar % 4], RT[bar % 4]; t0 = bar * BAR
    intro = t0 < START - 0.01; done = t0 >= END
    for q in range(16):
        t = t0 + q * BEAT / 4
        if done: break
        if q % 4 == 0 and not intro: S.add(tkick(0.75), t, 0, "drums"); kicks.append(t)
        if q in (4, 12): S.add(clap(0.17 if not intro else 0.1, seed=bar + q), t, 0, "drums")
        if q % 4 == 2: S.add(skank(ch, 0.05), t, 0.3, "keys"); S.add(hat(0.025, seed=bar * 16 + q), t, -0.3, "drums")
        if not intro and q in (0, 3, 6, 8, 11, 14): S.add(bass(r + (12 if q in (6, 14) else 0), BEAT / 4 * 1.6), t, 0, "bass")
    S.add(pad([m + 12 for m in ch], BAR, 0.01), t0, 0.1, "pads")
    if not done:
        for q, m in RIFF: S.add(steel(m, 0.075 if not intro else 0.06), t0 + q * BEAT / 4, -0.15, "lead")
# countdown beeps + GO
for j in range(3): S.add(steel(79, 0.12, 0.3), START - 2.1 + j * 0.7, 0, "fx")
S.add(steel(91, 0.15, 0.6), START, 0, "fx"); S.add(impact(0.3), START, 0, "fx")
# floor breaks
for (t, kind, nm, k) in [e for e in EV if e[1] == "break"]:
    if nm == "S": S.add(steel(sc(k, 60), 0.1), t, -0.6, "notes")
    else:
        S.add(steel(sc(k, 67), 0.09), t, 0.6, "notes"); S.add(whirr(), t, 0.6, "fx")
        if FLIPS[k] == "H": S.add(coinj(0.13), t + 0.45, 0.6, "fx")
        else: S.add(wahwah(0.12), t + 0.45, 0.6, "fx")
for (t, kind, nm, pts) in [e for e in EV if e[1] == "pop"]:
    for q in range(10): S.add(bubble(0.05), t + q * 0.025, 0.6 + rng.uniform(-0.2, 0.2), "fx")
b = [e for e in EV if e[1] == "bounce"]; bt_ = np.array([e[0] for e in b])
for (t, kind, nm, x) in b[::3]:
    if t > END: continue
    S.add(bubble(0.015 / np.sqrt(np.sum(np.abs(bt_ - t) < 0.02))), t, -0.6 if nm == "S" else 0.6, "clicks")
# callouts + win
ov = next(SB[k] for k in range(FLOORS) if sum(1 for x in G if x <= SB[k]) < k + 1 and SB[k] > G[6])
for tb in (G[4] + 1.05, G[6] + 1.05, G[7] + 1.15, G[8] + 1.1, ov):
    S.add(brass([67, 72, 76], BEAT * 0.8, 0.1), tb, 0, "fx")
S.add(impact(0.45), WIN_T, -0.4, "fx")
for k, m in enumerate((72, 76, 79, 84)): S.add(brass([m, m - 12], BEAT * (0.5 if k < 3 else 1.5), 0.12), WIN_T + k * BEAT / 2, 0, "fx")
S.add(riser(1.2, 0.04, seed=8), D - 1.2)
S.delay("lead", BEAT * 0.75, fb=0.25, mix=0.15)
S.sidechain("pads", kicks, 0.4); S.sidechain("bass", kicks, 0.2)
S.reverb("lead", 0.2, 1.4, 21); S.reverb("notes", 0.25, 1.6, 31); S.reverb("fx", 0.2, 1.4, 41); S.reverb("pads", 0.35, 2.2, 51); S.reverb("drums", 0.06, 0.8, 61)
S.save(HERE / "music.wav", gains={"lead": 0.9, "notes": 1.0, "fx": 1.0, "clicks": 0.7, "bass": 1.0, "drums": 1.0, "keys": 0.9, "pads": 0.8})
print("sound", D)
