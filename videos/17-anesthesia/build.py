"""Video 017 · How does anesthesia switch you off? — 40 s seamless loop, 96 BPM lo-fi / neo-soul boom bap (16 bars,
Rhodes, round bass, swung drums, a whistle-synth hook), clean stereo (scripts/stereo.py).
The music goes under with the patient: a master low-pass closes while propofol floods the neuron (bars 6-7.5), the
groove turns half-time and muffled while the brain is under (EEG slow waves = sub-bass pulses), and opens into the drop
when the drip stops (bar 14). Every visual event is a musical note in the groove (GABA door = Rhodes stab, chloride
flood = falling arp, thalamus links going dark = descending notes, waking links = rising notes).

Story (bars, 2.5 s each): 0-1.5 hook: a syringe of milky propofol · 1.5-3 zoom callout: the propofol molecule ("milk of
amnesia") · 3 DIVE into a neuron: awake = fires nonstop · 4.5 GABA opens a chloride door → a pause · 6 propofol jams it
open → chloride floods · 7.5 below threshold → silence · 9 out to the brain: fast chatter → slow waves (EEG) ·
10.5 the thalamus relay goes quiet · 12 not sleep: closer to a reversible coma · 13.5 stop the drip → awake · 15 hook.
Writes remotion/src/videos/anesthesia/anesthesia.json + public/videos/17-anesthesia/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 96, 16
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
SW = S16 * 0.2                                                                   # lo-fi swing
bt = lambda bar, step=0: round(bar * BAR + step * S16 + (SW if step % 2 == 1 else 0), 5)
rng = np.random.default_rng(17)

spikes = [bt(3 + k // 16, k % 16) for k in range(48) if (k % 16) not in (3, 11)]   # awake: fires on the 16ths
gaba = [bt(4, 8), bt(5, 0), bt(5, 6), bt(5, 12)]                                     # GABA opens the door (a pause)
spikes = [s for s in spikes if not any(0 <= s - g < 0.45 for g in gaba)]
prop_in, prop_lock = bt(6, 0), bt(6, 8)
ions = [bt(6 + (8 + k) // 16, (8 + k) % 16) for k in range(16)]                     # chloride flood (bars 6.5-7.5)
slow = [bt(9 + k // 2, (k % 2) * 8) for k in range(9)]                              # EEG slow waves (bars 9-13.5)
dark = [bt(10 + (8 + 2 * k) // 16, (8 + 2 * k) % 16) for k in range(8)]             # thalamus links go dark (10.5-11.5)
wake = [bt(13, 8 + k) if k < 8 else bt(14, k - 8) for k in range(8)]                 # links back on (13.5-14)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "spikes": spikes, "gaba": gaba, "propIn": prop_in, "propLock": prop_lock,
      "ions": ions, "slow": slow, "dark": dark, "wake": wake}
(ROOT / "remotion/src/videos/anesthesia/anesthesia.json").write_text(json.dumps(ev))

def lp(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def hp(x, cut): return x - lp(x, cut)
def kick(vol=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(46 + 95 * np.exp(-t / 0.035)) / SR) * np.exp(-t / 0.28)
    c = hp(noise(0.005, 1.0, 0.002, rate=44100, seed=1), 2500); out[:len(c)] += c * 0.2
    return out * vol
def snare(vol=0.3, seed=0):
    n = int(0.3 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(210 + 40 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.06) * 0.55
    nz = lp(hp(noise(0.3, 1.0, 0.3, rate=44100, seed=seed)[:n], 1200), 6000) * np.exp(-t / 0.09) * 0.7
    return (body + nz) * vol
def hat(vol, seed, open_=False):
    d = 0.18 if open_ else 0.045; x = noise(d, 1.0, d * 0.5, rate=44100, seed=seed); return lp(hp(x, 6500), 11000) * vol
def rim(vol=0.12, seed=0):
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.01) * 0.6 + hp(noise(0.06, 1.0, 0.012, rate=44100, seed=seed), 2500)[:n] * 0.4) * vol
def rhodes(midi, dur, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    idx = 1.8 * np.exp(-t / 0.25) + 0.25
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.4)
    x *= 1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)                                        # tremolo
    return x * vol * np.clip(t / 0.004, 0, 1) * np.exp(-t / 1.4) * np.clip((dur - t) / 0.06, 0, 1)
def chord(notes, dur, vol=0.05, strum=0.012):
    n = int((dur + strum * len(notes)) * SR); out = np.zeros(n)
    for i, m in enumerate(notes):
        s = rhodes(m, dur, vol); o = int(i * strum * SR); out[o:o + len(s)] += s
    return out
def bass(midi, dur, vol=0.34, glide_from=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * np.ones(n)
    if glide_from is not None: f = hz(midi) + (hz(glide_from) - hz(midi)) * np.exp(-t / 0.04)
    ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.25 * np.sin(2 * np.pi * 2 * ph) + 0.1 * (2 * np.abs(2 * (ph % 1) - 1) - 1)
    return x * vol * np.clip(t / 0.005, 0, 1) * np.clip((dur - t) / 0.03, 0, 1) * (0.75 + 0.25 * np.exp(-t / 0.15))
def sub_pulse(midi, dur, vol=0.45):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * hz(midi) * t) * vol * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
def whistle(midi, dur, vol=0.075, slide=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * np.ones(n)
    if slide is not None: f = hz(midi) + (hz(slide) - hz(midi)) * np.exp(-t / 0.05)
    f = f * (1 + 0.009 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.12) / 0.2, 0, 1))
    ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.12 * np.sin(2 * np.pi * 2 * ph) + 0.05 * np.sin(2 * np.pi * 3 * ph)
    return x * vol * np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)
def pad(notes, dur, vol=0.02):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.006, 0.006): x += np.sin(2 * np.pi * hz(m) * (1 + d) * t + rng.random() * 6)
    return x * vol * np.clip(t / 0.5, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)
def swell(dur, vol=0.04, seed=4):
    x = noise(dur, 1.0, dur, rate=44100, seed=seed); k = np.linspace(0, 1, len(x))
    return (lp(x, 600) * (1 - k) + lp(x, 6000) * k) * k ** 2.5 * vol
def tape_stop(dur=0.6, vol=0.3):                                                    # downward whoosh into "under"
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(220 * (1 - t / dur) ** 2 + 30) / SR) * vol * (1 - t / dur)

S = StereoSong(BPM, BARS)
# Gm9 - C13 - Fmaj9 - Dm9 (ii-V-I-vi in F), neo-soul voicings
CH = [[55, 58, 62, 65, 69], [52, 58, 62, 64, 69], [53, 57, 60, 64, 67], [50, 53, 60, 64, 69]]
RT = [43, 36, 41, 38]
sec = lambda b: "hook" if b < 3 or b >= 15 else "awake" if b < 6 else "fall" if b < 9 else "under" if b < 13 else "wake" if b < 14 else "drop"
kicks = []
for bar in range(BARS):
    s_ = sec(bar); ch = CH[bar % 4]; r = RT[bar % 4]
    if s_ in ("hook", "awake", "drop", "fall"):
        kpat = (0, 7, 10) if bar % 2 == 0 else (0, 3, 10)                              # boom-bap kicks
        for s in kpat: S.add(kick(), bt(bar, s), 0, "drums", 0.85); kicks.append(bt(bar, s))
        for s in (4, 12): S.add(snare(0.3, seed=bar * 2 + s), bt(bar, s), 0.05, "drums")
        for s in range(0, 16, 2 if s_ != "awake" else 1):
            S.add(hat([0.05, 0.02, 0.035, 0.02][s % 4] * (0.8 if s % 2 else 1), seed=900 + bar * 16 + s, open_=(s == 14 and bar % 2 == 1)), bt(bar, s), [-0.25, 0.25][(s // 2) % 2], "drums")
        if bar % 2 == 1: S.add(rim(0.1, seed=bar), bt(bar, 15), -0.3, "drums")
    elif s_ in ("under", "wake"):                                                    # half-time, heartbeat-ish
        for s in (0,): S.add(kick(0.8), bt(bar, s), 0, "drums"); kicks.append(bt(bar, s))
        S.add(snare(0.18, seed=bar), bt(bar, 8), 0.05, "drums")
        S.add(hat(0.025, seed=40 + bar), bt(bar, 4), 0.3, "drums"); S.add(hat(0.025, seed=60 + bar), bt(bar, 12), -0.3, "drums")
    # Rhodes comping: chord on 1 and an anticipation on the "and" of 2
    S.add(chord(ch, BEAT * 1.6, 0.05), bt(bar, 0), -0.2, "keys")
    if s_ not in ("under",): S.add(chord(ch[1:], BEAT * 0.9, 0.035), bt(bar, 6), 0.2, "keys")
    else: S.add(chord(ch, BEAT * 2.5, 0.03), bt(bar, 8), 0.2, "keys")
    # bassline
    if s_ in ("under", "wake"): S.add(bass(r, BEAT * 3.5, 0.3), bt(bar, 0), 0, "bass")
    else:
        for s, m, ln, gl in ((0, r, 5, None), (6, r + 12, 2, None), (8, r + 7, 3, None), (11, r + 10, 2, r + 12), (14, r + 12, 2, None)):
            S.add(bass(m, ln * S16 * 0.92, 0.32, gl), bt(bar, s), 0, "bass")
    S.add(pad([n + 12 for n in ch[:3]], BAR, 0.012 if s_ != "under" else 0.02), bt(bar), 0, "pads")
# whistle hook: bars 0-1 and 15 (+ answer phrase in the drop, bar 14)
HOOK = [(0, 74, 2, None), (2, 77, 2, 76), (4, 81, 4, None), (8, 79, 2, None), (10, 77, 2, None), (12, 76, 4, 74),
        (16, 74, 2, None), (18, 72, 2, None), (20, 74, 3, None), (24, 69, 6, 67)]
for start, phrase in ((0, HOOK), (15, HOOK[:6]), (14, HOOK[6:])):
    for s, m, ln, sl in phrase:
        s2 = s - (16 if start == 14 else 0)
        if 0 <= s2 < 32: S.add(whistle(m, ln * S16 * 0.95, slide=sl), bt(start + s2 // 16, s2 % 16), 0.1, "lead")
S.add(whistle(76, BAR * 0.45), bt(15, 8), 0.1, "lead")                             # hook answer (flows into bar 0)
S.delay("lead", BEAT * 0.75, fb=0.38, mix=0.28); S.delay("keys", BEAT * 0.75, fb=0.3, mix=0.15)
# the events play the music
for i, g in enumerate(gaba): S.add(chord([69, 72, 76], BEAT * 0.6, 0.06), g, [-0.4, 0.4][i % 2], "keys")
S.add(tape_stop(0.6, 0.25), prop_lock - 0.2, 0, "fx")
FALL = [81, 79, 77, 76, 74, 72, 69, 67, 65, 64, 62, 60, 57, 55, 53, 50]
for i, t in enumerate(ions): S.add(rhodes(FALL[i], BEAT * 0.5, 0.06), t, [-0.5, 0.5][i % 2], "keys")
for i, t in enumerate(slow): S.add(sub_pulse(RT[(int(t / BAR)) % 4] - 12 + 12, BEAT * 1.8, 0.4), t, 0, "sub")
for i, t in enumerate(dark): S.add(rhodes([72, 69, 67, 65, 64, 62, 60, 57][i], BEAT * 0.8, 0.055), t, [-0.4, 0.4][i % 2], "keys")
for i, t in enumerate(wake): S.add(rhodes([60, 62, 65, 67, 69, 72, 74, 77][i], BEAT * 0.5, 0.06), t, [-0.4, 0.4][i % 2], "keys")
S.add(swell(BAR / 2, 0.05), bt(13, 8))
S.sidechain("bass", kicks, 0.4); S.sidechain("pads", kicks, 0.4); S.sidechain("keys", kicks, 0.15)
S.reverb("keys", 0.28, 1.8, 21); S.reverb("pads", 0.35, 2.4, 31); S.reverb("lead", 0.32, 2.2, 41); S.reverb("drums", 0.1, 0.9, 51); S.reverb("fx", 0.3, 1.5, 61)

# the music goes under: a master low-pass (2 x one-pole) over everything but the sub
G = {"drums": 1.0, "bass": 0.9, "keys": 0.9, "pads": 0.8, "lead": 1.0, "fx": 0.9}
mixb = sum(S.buses[k] * g for k, g in G.items() if k in S.buses)
tt = np.arange(S.n) / SR
def cutoff(t):
    if t < bt(6, 4): return 16000.0
    if t < bt(7, 8): return 16000 * (800 / 16000) ** ((t - bt(6, 4)) / (bt(7, 8) - bt(6, 4)))
    if t < bt(13, 8): return 800.0
    if t < bt(14): return 800 * (16000 / 800) ** ((t - bt(13, 8)) / (bt(14) - bt(13, 8)))
    return 16000.0
cuts = np.array([cutoff(x) for x in tt[::64]]); cuts = np.repeat(cuts, 64)[:S.n]
acoef = np.exp(-2 * np.pi * cuts / SR)
for ch in range(2):
    x = mixb[ch]; y1 = np.empty(S.n); y2 = np.empty(S.n); s1 = s2 = 0.0
    for i in range(S.n):
        a = acoef[i]; s1 = (1 - a) * x[i] + a * s1; s2 = (1 - a) * s1 + a * s2; y2[i] = s2
    mixb[ch] = y2
S.buses = {"music": mixb, "sub": S.buses["sub"]}
S.save(ROOT / "public/videos/17-anesthesia/music.wav", gains={"music": 1.0, "sub": 0.9})
print(f"anesthesia: {DUR:.3f} s")
