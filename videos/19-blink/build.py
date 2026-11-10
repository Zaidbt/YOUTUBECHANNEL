"""Video 019 · STARING CONTEST: "don't blink, beat me" — 40 s seamless loop, 96 BPM dembow bounce (16 bars, 2.5 s each).
The challenge lasts exactly 30 s (bars 1-13). The music is the game: one earworm riff (marimba pluck + vocal chop) from
frame 0, and the tension climbs with the "urge to blink" gauge: each evaporating puff is a rising pluck, each dry spot a
rim hit + note, the nerve alarm is a two-note siren riff in key, then a snare roll + riser, a breath of silence, and the
DROP when the character blinks (32.5 s).

Timeline (bars): 0 hook · 1 GO (stopwatch starts) · 3 dive into the eye: the tear film (oil / water / mucus) · 6 no blink
→ the water evaporates → dry spots (7-8.25) · 8.5 dry spots trigger the cornea's nerve endings (alarm) · 11 back to the
face-off: "BLINK! BLINK!" · 13 the character blinks: you win · 15 hook again (loop).
Writes remotion/src/videos/blink/blink.json + public/videos/19-blink/music.wav.
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
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
rng = np.random.default_rng(19)

GO, IN, OUT, BLINK, HOOK2 = bt(1), bt(3), bt(11), bt(13), bt(15)
evap = [bt(5 + (2 * k) // 16, (2 * k) % 16) for k in range(28)]                    # a puff of vapour per 8th (bars 5-8.5)
dry = [bt(7, 0), bt(7, 8), bt(8, 0), bt(8, 4)]                                      # dry spots open
alarm = [bt(8 + (8 + 2 * k) // 16, (8 + 2 * k) % 16) for k in range(20)]            # nerve alarm, 8ths (bars 8.5-11)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "go": GO, "in": IN, "out": OUT, "blink": BLINK, "hook2": HOOK2,
      "evap": evap, "dry": dry, "alarm": alarm}
(ROOT / "remotion/src/videos/blink/blink.json").write_text(json.dumps(ev))

def lp(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def hp(x, cut): return x - lp(x, cut)
def reson(x, f, q):                                                              # 2-pole band-pass resonator
    w = 2 * np.pi * f / SR; r = np.exp(-w / (2 * q)); a1, a2 = 2 * r * np.cos(w), -r * r; g = (1 - r * r) * 0.5
    y = np.empty_like(x); y1 = y2 = 0.0
    for i in range(len(x)):
        v = g * x[i] + a1 * y1 + a2 * y2; y2 = y1; y1 = v; y[i] = v
    return y
_chop = {}
def chop(midi, dur, vowel="a", vol=0.5):
    """vocal-chop-like formant note (the earworm)"""
    key = (midi, round(dur, 3), vowel)
    if key not in _chop:
        n = int(dur * SR); t = np.arange(n) / SR
        f = hz(midi) * (1 + 0.012 * np.exp(-t / 0.03) + 0.004 * np.sin(2 * np.pi * 6 * t))
        ph = np.cumsum(f) / SR; src = (2 * (ph % 1) - 1) + 0.5 * (2 * ((ph * 1.005) % 1) - 1)
        F = {"a": (850, 1250, 2700), "o": (520, 920, 2500), "e": (600, 1900, 2600)}[vowel]
        x = reson(src, F[0], 7) * 1.0 + reson(src, F[1], 9) * 0.7 + reson(src, F[2], 10) * 0.25
        x *= np.clip(t / 0.008, 0, 1) * np.clip((dur - t) / 0.03, 0, 1) * (0.7 + 0.3 * np.exp(-t / 0.08))
        _chop[key] = x / (np.max(np.abs(x)) + 1e-9)
    return _chop[key] * vol
def kick(vol=1.0):
    n = int(0.42 * SR); t = np.arange(n) / SR
    out = np.sin(2 * np.pi * np.cumsum(48 + 115 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.22)
    c = hp(noise(0.005, 1.0, 0.002, rate=44100, seed=1), 2500); out[:len(c)] += c * 0.22
    return out * vol
def clap(vol=0.3, seed=0):
    n = int(0.22 * SR); t = np.arange(n) / SR
    nz = lp(hp(noise(0.22, 1.0, 0.22, rate=44100, seed=seed)[:n], 900), 6500)
    env = sum(np.exp(-np.clip(t - d, 0, None) / 0.012) * (t >= d) for d in (0, 0.011, 0.023)) * 0.4 + np.exp(-t / 0.08) * 0.5
    return nz * env * vol
def snr(vol=0.2, seed=0):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 200 * t) * np.exp(-t / 0.03) * 0.5 + lp(hp(noise(0.12, 1.0, 0.12, rate=44100, seed=seed)[:n], 1500), 7000) * np.exp(-t / 0.045)) * vol
def hat(vol, seed, long=False):
    d = 0.16 if long else 0.04; return lp(hp(noise(d, 1.0, d * 0.5, rate=44100, seed=seed), 7000), 12000) * vol
def tick(vol=0.16):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1500 * t) * np.exp(-t / 0.008) + 0.5 * np.sin(2 * np.pi * 2900 * t) * np.exp(-t / 0.004)) * vol
def logdrum(midi, dur, vol=0.42):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * (1 + 0.9 * np.exp(-t / 0.018))
    ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.3 * np.sin(2 * np.pi * 2 * ph) * np.exp(-t / 0.08) + 0.12 * np.sin(2 * np.pi * 3 * ph) * np.exp(-t / 0.04)
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / (dur * 0.6)) * np.clip((dur - t) / 0.02, 0, 1)
def blip(midi, vol=0.13, dur=0.28):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * np.sign(np.sin(2 * np.pi * f * t))
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.09)
def pluck(midi, vol=0.06, dur=0.4):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t + 1.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.06))
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.15)
def pad(notes, dur, vol=0.02):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.005, 0.005): x += np.sin(2 * np.pi * hz(m) * (1 + d) * t + rng.random() * 6) + 0.3 * np.sin(2 * np.pi * hz(m) * 2 * (1 + d) * t)
    return x * vol * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
def riser(dur, vol=0.07, seed=4):
    n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
    nz = noise(dur, 1.0, dur, rate=44100, seed=seed)[:n]
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (k * 2)) / SR) * 0.35
    return (hp(lp(nz, 9000), 1500) * 0.6 * k ** 2 + tone * k ** 1.5) * vol
def impact(vol=0.5):
    n = int(1.6 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.6) + lp(noise(1.6, 1.0, 1.6, rate=44100, seed=7)[:n], 2500) * np.exp(-t / 0.35) * 0.25) * vol

def marimba(midi, vol=0.1, dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.03) + 0.12 * np.sin(2 * np.pi * 10 * f * t) * np.exp(-t / 0.012)
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.2)
def snare(vol=0.26, seed=0):
    n = int(0.2 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(230 + 60 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.045) * 0.5
    nz = lp(hp(noise(0.2, 1.0, 0.2, rate=44100, seed=seed)[:n], 1500), 7500) * np.exp(-t / 0.06) * 0.7
    return (body + nz) * vol

S = StereoSong(BPM, BARS)
ROOTS = [38, 34, 41, 36]; CH = [[62, 65, 69], [58, 62, 65], [60, 65, 69], [60, 64, 67]]   # Dm - Bb - F - C
RIFF = [(0, 74, 2, "a"), (3, 77, 2, "a"), (6, 81, 2, "e"), (8, 79, 3, "a"), (11, 77, 2, "o"), (14, 74, 2, "a"),
        (16, 74, 2, "a"), (19, 77, 2, "a"), (22, 81, 2, "e"), (24, 84, 3, "a"), (27, 81, 2, "e"), (30, 79, 2, "o")]
def sec(b):
    return "hook" if b < 1 or b >= 15 else "go" if b < 3 else "film" if b < 6 else "evap" if b < 8 else "alarm" if b < 11 else "final" if b < 13 else "drop"
LVL = {"hook": 1.0, "go": 0.7, "film": 0.75, "evap": 0.85, "alarm": 0.95, "final": 1.0, "drop": 1.1}
kicks = []
for bar in range(BARS):
    s_ = sec(bar); r = ROOTS[bar % 4]; ch = CH[bar % 4]; lv = LVL[s_]
    final_last = bar == 12
    # the earworm: marimba riff, doubled by a vocal chop outside the quiet "go" section
    for s, m, ln, vw in RIFF:
        if s // 16 == bar % 2 and not (final_last and s % 16 >= 8):
            S.add(marimba(m, 0.11 * lv), bt(bar, s % 16), [-0.3, 0.3][(s // 2) % 2], "keys")
            if s_ not in ("go",): S.add(chop(m, ln * S16 * 0.95, vw, 0.3 * lv), bt(bar, s % 16), [0.25, -0.25][(s // 2) % 2], "chop")
    # dembow: kick on the beats, snares on 3, 6, 11, 14
    if not final_last:
        for s in (0, 4, 8, 12): S.add(kick(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
        for s in (3, 6, 11, 14): S.add(snare(0.24 * lv, seed=bar * 4 + s), bt(bar, s), [0.1, -0.1][s % 2], "drums")
        if s_ in ("hook", "drop", "alarm", "final"): S.add(clap(0.2, seed=bar), bt(bar, 12), 0, "drums")
    else:                                                                            # last bar of the challenge: roll, then a gap
        for s in (0, 4): S.add(kick(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
        for s in range(0, 8): S.add(snare(0.12 + s * 0.012, seed=60 + s), bt(bar, s), 0, "drums")
        for k in range(12): S.add(snare(0.2 + k * 0.01, seed=80 + k), bt(bar, 8) + k * S16 / 2, 0, "drums")
    if s_ != "go":
        for s in range(16): S.add(hat([0.035, 0.014, 0.026, 0.014][s % 4] * lv, seed=700 + bar * 16 + s, long=(s == 10 and bar % 2 == 1)), bt(bar, s), [-0.3, 0.3][s % 2], "drums")
    else:
        for s in range(0, 16, 2): S.add(tick(0.07), bt(bar, s), [-0.4, 0.4][(s // 2) % 2], "drums")   # the stopwatch
    # bass: log-drum following the dembow
    if not final_last:
        for s, m, ln in ((0, r, 3), (3, r, 2), (6, r + 12, 2), (8, r, 3), (11, r + 7, 2), (14, r + 12, 2)):
            S.add(logdrum(m, ln * S16 * 0.95, 0.36 * min(1, lv + 0.15)), bt(bar, s), 0, "bass")
    else: S.add(logdrum(r, BAR * 0.45, 0.36), bt(bar, 0), 0, "bass")
    S.add(pad(ch, BAR, 0.016 + 0.006 * lv), bt(bar), 0, "pads")
    if s_ in ("hook", "drop"):
        for s in (2, 6, 10, 14): S.add(pluck(ch[(s // 4) % 3] + 12, 0.04), bt(bar, s), [0.5, -0.5][(s // 4) % 2], "keys")
# the game sounds are part of the song
S.add(blip(86, 0.14, 0.5), GO, 0, "keys"); S.add(impact(0.3), GO, 0, "fx")
for L in (IN, bt(6), bt(8, 8)):
    for k, m in enumerate((74, 77, 81, 86)): S.add(blip(m, 0.1, 0.3), L + k * S16, [-0.3, 0.3][k % 2], "keys")
EV_SCALE = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84]
for i, t in enumerate(evap): S.add(pluck(EV_SCALE[(i // 3) % 10] + 12, 0.035 + i * 0.001, 0.25), t + S16, [-0.6, 0.6][i % 2], "keys")
for i, t in enumerate(dry): S.add(snr(0.2, seed=i), t, 0, "drums"); S.add(blip([69, 72, 74, 77][i], 0.13, 0.4), t, 0, "keys")
for i, t in enumerate(alarm): S.add(chop([81, 86][i % 2], S16 * 1.8, "e", 0.2 + i * 0.006), t, [-0.5, 0.5][i % 2], "chop")
S.add(riser(BAR * 2, 0.09), bt(11)); S.add(impact(0.6), BLINK, 0, "fx")
S.add(riser(BAR, 0.04, seed=9), bt(2)); S.add(riser(BAR, 0.05, seed=11), bt(10))
for k, m in enumerate((74, 77, 81, 86, 89)): S.add(blip(m, 0.12, 0.4), BLINK + k * S16, [-0.3, 0.3][k % 2], "keys")   # victory
S.delay("chop", BEAT * 0.75, fb=0.32, mix=0.2); S.delay("keys", BEAT * 0.5, fb=0.3, mix=0.18)
S.sidechain("bass", kicks, 0.35); S.sidechain("pads", kicks, 0.5); S.sidechain("chop", kicks, 0.15)
S.reverb("chop", 0.22, 1.4, 21); S.reverb("keys", 0.22, 1.5, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.1, 0.9, 51); S.reverb("fx", 0.3, 1.5, 61)
S.save(ROOT / "public/videos/19-blink/music.wav", gains={"drums": 1.0, "bass": 0.95, "chop": 0.95, "keys": 1.0, "pads": 0.8, "fx": 0.9})
print(f"blink: {DUR:.3f} s")
