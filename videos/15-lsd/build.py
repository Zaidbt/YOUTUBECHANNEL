"""Video 015 · What does LSD actually do to your brain? — 40.7 s seamless loop, 112 BPM melodic afro house (19 bars),
clean stereo mix (scripts/stereo.py). Scientific explainer only (mechanism + effects + risks, no use guidance).

Story (bars, 2.14 s each): 0-2 blotter stamp hook -> LSD molecule (1/5000 of an aspirin) · 3 DIVE into a synapse:
serotonin taps 5-HT2A -> one spike each (a mallet note per docking) · 5 LSD, same two-ring core, fits the lock ·
6.5 the lid snaps shut = the drop · 6.5-9.5 the neuron fires on every 16th (a blip each) · 9.5 out to the brain: the
cortex gets loud · 11 networks stay in their lane (fMRI matrix) · 12.5 cross-talk (a rising note per new link) ·
14.5 the DMN falls apart (colour waves) · 16 lasts 8-12 h, risks · 17.85 back to the stamp (loop).
Writes remotion/src/videos/lsd/lsd.json + public/videos/15-lsd/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from hyper import clap  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 112, 19
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
SW = S16 * 0.14
bt = lambda bar, step=0: round(bar * BAR + step * S16 + (SW if step % 2 == 1 else 0), 5)
rng = np.random.default_rng(15)

sero = [bt(b, s) for b in (3, 4) for s in (2, 6, 10, 14)]                    # 8 serotonin dockings
lsd_in, lsd_lock = bt(5, 0), bt(6, 8)                                        # LSD arrives, the lid closes
links = [bt(12 + (8 + 2 * k) // 16, (8 + 2 * k) % 16) for k in range(16)]     # 16 new long-range links (bars 12.5-14.5)
waves = [bt(14, 8), bt(14, 12)] + [bt(15, s) for s in (0, 4, 8, 12)]          # 6 colour waves on the beat
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "sero": sero, "lsdIn": lsd_in, "lsdLock": lsd_lock, "links": links, "waves": waves}
(ROOT / "remotion/src/videos/lsd/lsd.json").write_text(json.dumps(ev))

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
    n = int(0.5 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(44 + 110 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.26)
    c = hp(noise(0.006, 1.0, 0.002, rate=44100, seed=1), 3000); out[:len(c)] += c * 0.25
    return out
def rim(vol=0.2, seed=0):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.012) * 0.6 + hp(noise(0.08, 1.0, 0.015, rate=44100, seed=seed), 2000)[:n] * 0.4) * vol
def shaker(vol, seed): x = noise(0.08, 1.0, 0.035, rate=44100, seed=seed); return lp(hp(x, 4500), 9000) * vol * np.clip(np.arange(len(x)) / SR / 0.025, 0, 1)
def tom(f, vol=0.25):
    n = int(0.35 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.3 * np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.14) * vol
def sub(midi, dur, vol=0.42):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * hz(midi) * t) + 0.2 * np.sin(2 * np.pi * hz(midi) * 2 * t)
    return x * vol * np.clip(t / 0.004, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
def mallet(midi, vol=0.1, dur=0.6):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t / 0.05) + 0.1 * np.sin(2 * np.pi * f * 2 * t)
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.25)
def pad(notes, dur, vol=0.03, lfo=0.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: x += saws(hz(m), n, 6, 0.012)
    cut = 1400 + 1400 * lfo * (0.5 + 0.5 * np.sin(2 * np.pi * t / (dur / 2)))
    y = np.empty(n); s = 0.0
    for i in range(n): a = np.exp(-2 * np.pi * cut[i] / SR); s = (1 - a) * x[i] + a * s; y[i] = s
    return y * vol * np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)
def flute(midi, dur, vol=0.09):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * (1 + 0.007 * np.sin(2 * np.pi * 5 * t) * np.clip(t / 0.2, 0, 1))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.15 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR)
    breath = lp(noise(dur, 1.0, dur, rate=44100, seed=3), 3000)[:n] * 0.04
    return (x + breath) * vol * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)
def boom(vol=0.5):
    n = int(1.5 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-t / 0.1)) / SR) * np.exp(-t / 0.6) * vol
def swell(dur, vol=0.04, seed=4):
    x = noise(dur, 1.0, dur, rate=44100, seed=seed); k = np.linspace(0, 1, len(x))
    return (lp(x, 500) * (1 - k) + lp(x, 4000) * k) * k ** 2.5 * vol

S = StereoSong(BPM, BARS)
CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [55, 59, 62, 66, 69], [52, 55, 59, 62, 67]]   # Am9 Fmaj9 Gmaj7(#11) Em7
ROOT_ = [45, 41, 43, 40]
sec = lambda b: "hook" if b < 3 or b >= 17 else "syn" if b < 5 else "lsd" if b < 8 else "fire" if b < 10 else "net" if b < 12 else "drop" if b < 16 else "fade"
kicks = []
for bar in range(BARS):
    s_ = sec(bar); r = ROOT_[bar % 4]; ch = CH[bar % 4]
    four = s_ in ("hook", "fire", "drop", "fade") or bar == 7
    for s in ((0, 4, 8, 12) if four else (0, 8)): S.add(kick(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
    for s in (4, 12): S.add(rim(0.2 if four else 0.14, seed=bar * 2 + s), bt(bar, s), -0.15, "drums")
    if four: S.add(clap(0.18, seed=bar), bt(bar, 12), 0.1, "drums")
    for s in range(16): S.add(shaker([0.035, 0.018, 0.028, 0.018][s % 4] * (1 if four else 0.7), seed=300 + bar * 16 + s), bt(bar, s), 0.35, "drums")
    for s, f, p in ((3, 180, -0.5), (6, 140, 0.4), (10, 180, -0.5), (14, 120, 0.5)):
        if four: S.add(tom(f, 0.16), bt(bar, s), p, "drums")
    for s, ln in ((0, 3), (3, 3), (6, 2), (8, 3), (11, 2), (14, 2)):
        S.add(sub(r - 12 + (12 if s == 6 else 0), ln * S16 * 0.9, 0.36 if four else 0.28), bt(bar, s), 0, "bass")
    S.add(pad(ch, BAR, 0.026 if s_ != "drop" else 0.034, lfo=1.0 if s_ in ("drop", "fire") else 0.3), bt(bar), -0.35, "pads")
    S.add(pad([n + 12 for n in ch[:3]], BAR, 0.012, lfo=0.6), bt(bar), 0.35, "pads")
    if s_ in ("hook", "drop", "fade"):                                         # mallet arpeggio
        for s in range(0, 16, 2): S.add(mallet(ch[(s // 2) % 5] + 12, 0.055), bt(bar, s), [-0.4, 0.4][(s // 2) % 2], "keys")
# flute hook (bars 0-1 and 13)
HOOK = [(0, 76, 3), (3, 79, 3), (6, 81, 2), (8, 84, 4), (12, 83, 2), (14, 79, 2), (16, 81, 4), (20, 79, 2), (22, 76, 2), (24, 74, 4), (28, 76, 4)]
for start in (0, 17):
    for s, m, ln in HOOK:
        bar = start + s // 16
        if bar < BARS: S.add(flute(m, ln * S16 * 0.95, 0.085), bt(bar, s % 16), 0, "lead")
S.delay("lead", BEAT * 0.75, fb=0.4, mix=0.3); S.delay("keys", BEAT * 0.5, fb=0.35, mix=0.25)
# the events play the music
for i, t in enumerate(ev["sero"]): S.add(mallet([69, 72, 76, 74, 69, 72, 79, 76][i], 0.11), t, [-0.3, 0.3][i % 2], "keys")
S.add(swell(BAR, 0.04), lsd_lock - BAR); S.add(boom(0.55), lsd_lock, 0, "fx"); S.add(mallet(57, 0.16, 1.2), lsd_lock, 0, "keys")
for i, t in enumerate(ev["links"]): S.add(mallet([64, 67, 69, 71, 72, 74, 76, 79, 81, 83, 84, 86, 88, 91, 93, 95][i], 0.075), t, [-0.5, -0.2, 0.2, 0.5][i % 4], "keys")
for i, t in enumerate(ev["waves"]): S.add(mallet([81, 84, 88, 91][i % 4], 0.06, 0.9), t, [-0.6, 0.6][i % 2], "lead")
S.add(swell(BAR, 0.05, seed=8), bt(11, 8)); S.add(boom(0.4), bt(12, 8), 0, "fx"); S.add(boom(0.3), bt(3), 0, "fx"); S.add(boom(0.3), bt(9, 8), 0, "fx")
# every spike of the overfiring neuron (lock -> dive out) is a soft 16th blip
for k in range(int(round((bt(9, 8) - lsd_lock) / S16))): S.add(mallet([93, 88, 91, 86][k % 4], 0.028, 0.2), lsd_lock + k * S16, [-0.5, 0.5][k % 2], "keys")
S.sidechain("bass", kicks, 0.5); S.sidechain("pads", kicks, 0.55); S.sidechain("keys", kicks, 0.25)
S.reverb("keys", 0.3, 1.8, 21); S.reverb("pads", 0.35, 2.4, 31); S.reverb("lead", 0.3, 2.0, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.3, 1.5, 61)
S.save(ROOT / "public/videos/15-lsd/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.9, "pads": 0.8, "lead": 1.0, "fx": 0.9})
print(f"lsd: {DUR:.3f} s")
