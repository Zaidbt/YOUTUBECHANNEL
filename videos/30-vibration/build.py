"""Video 030 · How does your phone vibrate? — new format (inspired by a well-performing pixel "how it works" reel):
a real-life hook scene, a SPEED HUD (real speed ↔ 512x slower, RPM counter) that structures the story, numbered steps
following the chain, topic-themed title cards (phone notifications), and the object's own sound as the music.
41.7 s seamless loop, 92 BPM chill trap-soul in G minor (16 bars, 2.609 s each).
THE SOUND IS THE MECHANISM: an ERM vibration motor spins ~11,760 rpm = 196 rev/s = G3. Slowed 512x it turns exactly once
per beat; 128x → 4 per beat; every halving of the slowdown raises the buzz by an octave (G0 → G1 → G2 → G3), so the
speed-up section is literally an octave riser in key.

Timeline (bars): 0-1.5 hook: a phone buzzing on a table (ring pattern) · 1.5-2 dive into the phone (slow-down) ·
2-3.5 ① an off-centre weight (512x) · 3.5-5 ② spinning, it yanks the phone around (128x) · 5-7 ③ what spins it? a tiny
motor (cut-away, 512x) · 7-8 ④ the chip pulses it on/off (bzz bzz) · 8-9.5 speed-up 8x → 4x → 2x → real = 196 shakes a
second · 9.5-11.5 ⑤ newer phones: no spinning, a magnet on a spring (linear motor) · 11.5-13 ⑥ it starts & stops in
milliseconds → crisp taps · 13-16 hook again (loop).
Writes remotion/src/videos/vibration/vibration.json + public/videos/30-vibration/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 92, 16
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
F0 = 196.0                                                                       # real buzz = 196 Hz (G3) = 11,760 rpm
rng = np.random.default_rng(30)

L = [bb(x) for x in (0, 1.5, 2, 3.5, 5, 7, 8, 9.5, 11.5, 13, 16)]
# speed plan: (t0, t1, slow factor at t0, slow factor at t1) — geometric ramps
SPEED = [(L[0], L[1], 1, 1), (L[1], L[2], 1, 512), (L[2], L[3], 512, 512), (L[3], L[4], 128, 128), (L[4], L[5], 512, 512),
         (L[5], L[6], 32, 32), (L[6], bb(8.375), 8, 8), (bb(8.375), bb(8.75), 4, 4), (bb(8.75), bb(9.125), 2, 2), (bb(9.125), L[7], 1, 1),
         (L[7], L[8], 256, 256), (L[8], L[9], 256, 256), (L[9], L[10], 1, 1)]
# the phone's ring pattern in the hook: buzz 3 beats, rest 1 (real speed)
ring = [(bt(b, 0), bt(b, 12)) for b in (0,)] + [(bt(1, 0), bt(1, 8))] + [(bt(b, 0), bt(b, 12)) for b in (13, 14, 15)]
chip = [(bt(7, s), bt(7, s + 2)) for s in (0, 4, 8, 12)]                       # ④ on/off pulses
taps = [bt(11, 8) + k * BEAT for k in range(6)]                                  # ⑥ crisp taps
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "f0": F0, "l": L, "speed": SPEED, "ring": ring, "chip": chip, "taps": taps}
(ROOT / "remotion/src/videos/vibration/vibration.json").write_text(json.dumps(ev))

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

def k808(midi, dur, vol=0.4):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 1.0 * np.exp(-t / 0.015)); ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) + 0.15 * np.sin(4 * np.pi * ph)) * vol * np.clip(t / 0.002, 0, 1) * np.clip((dur - t) / 0.04, 0, 1) * (0.7 + 0.3 * np.exp(-t / 0.3))
def tkick(vol=0.8):
    n = int(0.3 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(55 + 140 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.12) + hp(noise(0.3, 1.0, 0.004, rate=44100, seed=2)[:n], 3000) * 0.25) * vol
def rim2(vol=0.12, seed=0):
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.01) * 0.6 + hp(noise(0.06, 1.0, 0.012, rate=44100, seed=seed), 2500)[:n] * 0.4) * vol
def keys(notes, dur, vol=0.045):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes: f = hz(m); x += np.sin(2 * np.pi * f * t + 1.3 * np.exp(-t / 0.3) * np.sin(2 * np.pi * f * t)) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.5)
    x *= 1 + 0.1 * np.sin(2 * np.pi * 4.8 * t)
    return x / len(notes) * vol * 3 * np.clip(t / 0.005, 0, 1) * np.exp(-t / 1.3) * np.clip((dur - t) / 0.08, 0, 1)
def buzz(f, dur, vol=0.12):
    """the vibration motor: an unbalanced rotation = a pulse train at the rotation rate, with a slight rattle"""
    n = int(dur * SR); t = np.arange(n) / SR; ph = (f * t) % 1
    if f < 18:                                                                     # slow: one 'thump' per turn
        x = np.exp(-ph / (0.06 / max(f, 0.5))) * np.sin(2 * np.pi * 70 * t)
    else:
        x = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) + 0.25 * np.sign(np.sin(2 * np.pi * f * t)) + 0.08 * hp(noise(dur, 1.0, dur, rate=44100, seed=int(f))[:n], 3000)
    return lp(x, 2400) * vol * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.015, 0, 1)
def tap(vol=0.35):
    n = int(0.06 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 170 * t) * np.exp(-t / 0.008) * vol + np.sin(2 * np.pi * 340 * t) * np.exp(-t / 0.004) * vol * 0.4

S = StereoSong(BPM, BARS)
# G minor trap-soul: Gm9 - Ebmaj7 - Cm9 - D7(b9)
CH = [[55, 58, 62, 65, 69], [51, 55, 58, 62], [48, 51, 55, 58, 62], [50, 54, 57, 60, 63]]; RT = [31, 27, 24, 26]
MEL = [(0, 74), (3, 77), (6, 74), (8, 70), (11, 72), (14, 69)]
def sec(b):
    return "hook" if b < 1.5 or b >= 13 else "slow" if b < 8 or (9.5 <= b < 13) else "rise"
kicks = []
for bar in range(BARS):
    ch = CH[bar % 4]; r = RT[bar % 4]
    for s in range(16):
        t = bt(bar, s); s_ = sec(bar + s / 16); full = s_ != "slow"
        if s in (0, 10) or (full and s == 7): S.add(tkick(0.75), t, 0, "drums"); kicks.append(t)
        if s in (0, 10): S.add(k808(r - 12 + 12, BEAT * (2.4 if s == 0 else 1.4), 0.36 if full else 0.3), t, 0, "bass")
        if s == 8: S.add(clap(0.22 if full else 0.16, seed=bar), t, 0.05, "drums")
        if s % 2 == 0: S.add(hat(0.03 if full else 0.02, seed=900 + bar * 16 + s), t, 0.3, "drums")
        if full and s in (13, 14, 15) and bar % 2: S.add(hat(0.022, seed=1300 + bar * 16 + s), t, -0.3, "drums")
        if s in (3, 15): S.add(rim2(0.1, seed=bar + s), t, -0.3, "drums")
    S.add(keys(ch, BAR * 0.95, 0.045), bt(bar), -0.2, "keys")
    S.add(pad([m + 12 for m in ch[:3]], BAR, 0.012), bt(bar), 0.2, "pads")
    if sec(bar) != "slow" or bar % 2 == 0:
        for s, m in MEL: S.add(chop(m, S16 * 2.2, "ao"[s % 2], 0.24), bt(bar, s), 0.1, "chop")
# the mechanism IS the lead: the buzz at its real (or slowed) rate
for t0, t1 in ring: S.add(buzz(F0, t1 - t0, 0.11), t0, 0, "buzz")
for t0, t1 in chip: S.add(buzz(F0 / 32 * 4, t1 - t0, 0.12), t0, 0, "buzz")            # 32x slow, shown as 6 Hz → G-ish rumble
for (t0, t1, a, b2) in SPEED:
    if L[2] <= t0 < L[5] and a == b2: S.add(buzz(F0 / a, t1 - t0, 0.1), t0, 0, "buzz")
for i, (t0, t1, a, b2) in enumerate(SPEED):
    if L[6] <= t0 < L[7]: S.add(buzz(F0 / a, t1 - t0, 0.1 + 0.01 * i), t0, 0, "buzz")   # octave riser G0 → G1 → G2 → G3
for t in taps: S.add(tap(0.35), t, 0, "fx")
S.add(riser(BAR / 2, 0.05, seed=3), L[1]); S.add(impact(0.35), L[2], 0, "fx"); S.add(impact(0.4), L[7], 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.32, mix=0.22); S.delay("keys", BEAT * 0.75, fb=0.25, mix=0.12)
S.sidechain("bass", kicks, 0.2); S.sidechain("pads", kicks, 0.45); S.sidechain("keys", kicks, 0.15)
S.reverb("chop", 0.28, 1.8, 21); S.reverb("keys", 0.25, 1.8, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.1, 0.9, 51); S.reverb("buzz", 0.12, 0.8, 71); S.reverb("fx", 0.2, 1.0, 61)
S.save(ROOT / "public/videos/30-vibration/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "pads": 0.8, "chop": 0.95, "buzz": 1.0, "fx": 1.0})
print(f"vibration: {DUR:.3f} s")
