"""Video 036 · Your contactless card has no battery — what really happens in a tap. Dark 3D toon-neon look
(the gearbox/Wankel "slick" series) with field lines, an in-scene scope, and a dive into the chip.
40.9 s seamless loop, 94 BPM G-funk in C minor (16 bars): Moog-style bass, whiny portamento lead, laid-back swung
drums. THE DATA IS THE BEAT: in ③ every "1" bit the card sends (load modulation) is a rim click on the 16ths; the
one-time code scrambles as a blip arpeggio; APPROVED is a two-tone beep in key, DECLINED a low buzz.
Facts: NFC / ISO 14443 at 13.56 MHz, a few cm range; the card has no battery: the reader's coil makes an alternating
magnetic field that induces a current in the card's antenna coil (around the card edge) and powers the chip; the card
can't transmit, it answers by switching a load on and off (load modulation, an 847.5 kHz subcarrier) and the reader
senses the tiny dips; EMV: the chip holds a secret key that never leaves it and computes a one-time application
cryptogram from the amount, a random number sent by the reader (unpredictable number) and a transaction counter (ATC)
→ copying the card's readable data gives the number but not the key, and a replayed code is rejected (counter/random
changed); magnetic near field falls ~1/d³ → only works within a few cm. A tap takes well under a second.
Timeline (bars): 0-1.5 hook (tap → approved) · 1.5-2 x-ray · 2-3.5 ① coil + chip, no battery · 3.5-5 ② induction ·
5-7 ③ load modulation · 7-8.5 ④ secret key · 8.5-10 ④ one-time code · 10-11.5 ⑤ copying gets no key · 11.5-13 ⑤ replay
→ declined · 13-14.5 ⑥ 1/d³ · 14.5-16 hook.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(36)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 94, 16
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
SW = lambda bar, s: bt(bar, s) + (S16 * 0.18 if s % 2 else 0)
L = [bb(x) for x in (0, 1.5, 2, 3.5, 5, 7, 8.5, 10, 11.5, 13, 14.5, 16)]
BEEPS = [bt(0, 8), bt(15, 0)]
BYTES = [0x6F, 0xA2, 0x9C, 0x41]
BITS = [(bt(5 + i // 16, i % 16), (BYTES[i // 8] >> (7 - i % 8)) & 1) for i in range(32)]
SCRAMBLE = [bt(8, 8) + k * S16 for k in range(24)]
DECLINE = bt(12, 8)
LIFT = [bb(13.25), bb(13.75), bb(14.0), bb(14.4)]          # up start, up end, down start, down end
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "l": L, "beeps": BEEPS, "bits": BITS, "scramble": SCRAMBLE, "decline": DECLINE, "lift": LIFT}
(ROOT / "remotion/src/videos/contactless/contactless.json").write_text(json.dumps(ev))

def moog(midi, dur, vol=0.3, glide_from=None):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * np.ones(n)
    if glide_from is not None: f = hz(midi) + (hz(glide_from) - hz(midi)) * np.exp(-t / 0.04)
    ph = np.cumsum(f) / SR; x = 2 * (ph % 1) - 1 + 0.5 * (2 * ((ph * 0.5) % 1) - 1)
    return lp(lp(x, 700), 900) * vol * np.clip(t / 0.005, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
def whine(m0, m1, dur, vol=0.07):
    n = int(dur * SR); t = np.arange(n) / SR; k = np.clip(t / 0.12, 0, 1)
    f = (hz(m0) + (hz(m1) - hz(m0)) * k) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.25, 0, 1))
    ph = np.cumsum(f) / SR; x = np.sin(2 * np.pi * ph) + 0.12 * np.sin(4 * np.pi * ph)
    return x * vol * np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.06, 0, 1)
def rhodes(notes, dur, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += np.sin(2 * np.pi * f * t + 1.0 * np.exp(-t / 0.35) * np.sin(2 * np.pi * f * t)) * (1 + 0.2 * np.sin(2 * np.pi * 4.5 * t))
    return x / len(notes) * vol * 3 * np.clip(t / 0.004, 0, 1) * np.exp(-t / 1.4) * np.clip((dur - t) / 0.06, 0, 1)
def beep(vol=0.12):
    n = int(0.36 * SR); t = np.arange(n) / SR; f = np.where(t < 0.16, hz(84), hz(91))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR); env = np.clip(t / 0.005, 0, 1) * np.where(t < 0.16, np.clip((0.15 - t) / 0.01, 0, 1), np.clip((t - 0.17) / 0.005, 0, 1) * np.clip((0.35 - t) / 0.02, 0, 1))
    return x * env * vol
def err(vol=0.16):
    n = int(0.5 * SR); t = np.arange(n) / SR; f = np.where(t < 0.2, hz(43), hz(42)); x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    return lp(x, 1400) * vol * (np.clip((0.19 - t) / 0.01, 0, 1) + np.clip((t - 0.25) / 0.01, 0, 1) * np.clip((0.48 - t) / 0.02, 0, 1))

S = StereoSong(BPM, BARS)
CH = [[48, 51, 55, 58, 62], [53, 56, 60, 63, 67], [44, 48, 51, 55, 58], [43, 47, 50, 53, 56]]; RT = [36, 41, 32, 31]
BASS = [(0, 0, 3), (3, 0, 1), (6, 12, 2), (8, 7, 2), (10, 10, 2), (13, 7, 1), (14, 5, 2)]
LEAD = [(0, 79, 79, 6), (6, 77, 75, 2), (8, 72, 74, 6), (14, 72, 70, 2)]
def light(b): return 5 <= b < 7 or 8.5 <= b < 10
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; lt = light(bar)
    for s in range(16):
        t = SW(bar, s)
        if s in (0, 7, 10) or (s == 15 and bar % 2): S.add(bkick(0.85) if False else tkick(0.8), t, 0, "drums"); kicks.append(t)
        if s in (4, 12): S.add(snare(0.22, seed=bar + s), t, 0.05, "drums"); S.add(clap(0.12, seed=bar), t, -0.05, "drums")
        if s % 2 == 0 or not lt: S.add(hat(0.022 if s % 4 else 0.032, seed=600 + bar * 16 + s), t, 0.3, "drums")
    for s, d, ln in BASS: S.add(moog(r + d, S16 * ln * 1.1, 0.3, glide_from=r + d - 2 if s == 6 else None), SW(bar, s), 0, "bass")
    S.add(rhodes(ch, BAR * 0.9, 0.05), bt(bar), -0.2, "keys"); S.add(rhodes(ch[1:], S16 * 3, 0.03), SW(bar, 10), 0.2, "keys")
    S.add(pad([m + 12 for m in ch[:3]], BAR, 0.01), bt(bar), 0.15, "pads")
    if not lt:
        for s, m0, m1, ln in LEAD: S.add(whine(m0 - 2 if s == 0 else m0, m1, S16 * ln, 0.07), SW(bar, s), 0.1, "chop")
for t in BEEPS: S.add(beep(0.12), t, 0, "fx")
for t, bit in BITS:
    if bit: S.add(rim2(0.16, seed=int(t * 100)), t, (-0.25, 0.25)[int(t / S16) % 2], "fx"); S.add(blip(84, 0.04, 0.12), t, 0, "fx")
for k, t in enumerate(SCRAMBLE): S.add(blip([72, 75, 79, 84, 79, 75][k % 6] + 12 * (k % 2), 0.05, 0.15), t, (-0.4, 0.4)[k % 2], "fx")
S.add(err(0.16), DECLINE, 0, "fx")
S.add(pad([60, 67, 72, 79], BAR * 1.5, 0.018), L[3], 0, "pads")
S.add(riser(BAR / 2, 0.04, seed=3), L[1]); S.add(impact(0.25), L[2], 0, "fx"); S.add(impact(0.22), L[5], 0, "fx"); S.add(impact(0.22), L[10], 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.22); S.delay("fx", BEAT * 0.5, fb=0.2, mix=0.12)
S.sidechain("bass", kicks, 0.12); S.sidechain("pads", kicks, 0.35); S.sidechain("keys", kicks, 0.15)
S.reverb("chop", 0.3, 1.8, 21); S.reverb("keys", 0.25, 1.6, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.2, 1.2, 61)
S.save(ROOT / "public/videos/36-contactless/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "pads": 0.8, "chop": 0.9, "fx": 1.0})
print(f"contactless: {DUR:.3f} s")
