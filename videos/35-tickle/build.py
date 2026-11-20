"""Video 035 · Why you can't tickle yourself — LSD-style flat Kurzgesagt look, real neuroscience.
45 s seamless loop, 128 BPM UK funky / tribal house in F minor (24 bars). THE TICKLE IS THE PERCUSSION: an external
touch = a rolling bongo/conga run; a self-made touch = the same run cancelled (only a soft thud left); in the robot
experiment the roll comes back louder as the delay grows; in the force duel every turn hits 38 % harder.
Facts:
- Every movement command has a copy (efference copy) sent to the cerebellum, which predicts the touch and attenuates
  it (Blakemore, Wolpert & Frith, Nature Neurosci 1998: less somatosensory + anterior cingulate activity for
  self-tickle; cerebellum involved).
- Blakemore, Frith & Wolpert, J Cogn Neurosci 1999: robot interface; tickliness rose progressively as the delay
  between your movement and the touch went 0 → 100 → 200 ms (and with rotated trajectories).
- Shergill, Bays, Frith & Wolpert, Science 2003: self-made force feels about half as strong; in a tit-for-tat
  pressing game force escalated ~38 % per turn.
- Blakemore et al., Psychological Medicine 2000: people with auditory hallucinations / passivity experiences rated
  self-tickle as tickly as external tickle (the attenuation was gone).
Timeline (bars): 0-2.5 hook · 2.5-5 ① the copy · 5-7.5 ② predicted → subtracted · 7.5-10 ③ someone else → full
tickle · 10-15 ④ 1999 robot: 0 / 100 / 200 ms · 15-19 ⑤ force +38 %/turn · 19-22 ⑥ voices · 22-24 hook.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(35)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 128, 24
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
L = [bb(x) for x in (0, 2.5, 5, 7.5, 10, 15, 17, 19, 20.5, 22, 24)]
COPY = [bt(3, 0), bt(4, 0)]                                   # ① motor command + copy
SELF = [bt(5, 8), bt(6, 8)]                                   # ② self touches
EXT = [bt(8, 0), bt(9, 0)]                                    # ③ external touches
ROBOT = [(bt(11, 8), 0.0), (bt(12, 8), 0.1), (bt(13, 8), 0.2)]  # ④ (time of your movement, delay s)
TURNS = [bt(15, 8) + k * 2 * BEAT for k in range(7)]          # ⑤ tit-for-tat presses
FORCE = [round(1.0 * 1.38 ** k, 3) for k in range(7)]
VOICE = [bt(20, 8), bt(21, 0), bt(21, 8)]                     # ⑥ an inner voice that isn't tagged as "me"
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "l": L, "copy": COPY, "self": SELF, "ext": EXT,
      "robot": ROBOT, "turns": TURNS, "force": FORCE, "voice": VOICE}
(ROOT / "remotion/src/videos/tickle/tickle.json").write_text(json.dumps(ev))

def conga(midi, vol=0.2, dur=0.25, slap=False):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 0.25 * np.exp(-t / 0.01))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.06 if slap else 0.14))
    if slap: x += hp(noise(dur, 1.0, 0.02, rate=44100, seed=midi)[:n], 2000) * 0.5 * np.exp(-t / 0.02)
    return x * vol
def shaker(vol, seed):
    return lp(hp(noise(0.06, 1.0, 0.04, rate=44100, seed=seed), 5000), 11000) * vol
def roll(t0, dur, vol, S, pan=0.0):
    """the tickle: a fast bongo run up and down"""
    k = 0
    while k * S16 / 2 < dur:
        m = [72, 74, 77, 79, 77, 74][k % 6]
        S.add(conga(m, vol * (0.7 + 0.3 * (k % 2)), 0.12, slap=k % 3 == 0), t0 + k * S16 / 2, pan + (0.3 if k % 2 else -0.3), "tickle"); k += 1
def thud(vol=0.3):
    n = int(0.25 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.08) * vol
def ep(notes, dur, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += np.sin(2 * np.pi * f * t + 0.8 * np.exp(-t / 0.4) * np.sin(2 * np.pi * f * t)) * (1 + 0.15 * np.sin(2 * np.pi * 5 * t))
    return x / len(notes) * vol * 3 * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.9) * np.clip((dur - t) / 0.05, 0, 1)

S = StereoSong(BPM, BARS)
CH = [[53, 56, 60, 63, 67], [49, 53, 56, 60], [51, 55, 58, 62], [48, 51, 55, 58, 62]]; RT = [29, 25, 27, 24]
RIFF = [(0, 72), (3, 75), (6, 72), (8, 70), (10, 68), (11, 67), (14, 68)]
BASS = [(0, 0), (3, 12), (6, 0), (8, 7), (10, 12), (11, 10), (14, 7)]
def lightbar(b): return 10 <= b < 15 or 19 <= b < 22
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; lt = lightbar(bar)
    for s in range(16):
        t = bt(bar, s)
        if s % 4 == 0: S.add(tkick(0.75 if not lt else 0.6), t, 0, "drums"); kicks.append(t)
        if s in (4, 12): S.add(rim2(0.12, seed=bar + s), t, 0.15, "drums")
        if s == 12 and not lt: S.add(clap(0.16, seed=bar), t, -0.1, "drums")
        S.add(shaker(0.02 if s % 2 else 0.032, seed=400 + bar * 16 + s), t + (S16 * 0.15 if s % 2 else 0), 0.35 if s % 2 else -0.35, "drums")
        if s in (2, 7, 10, 14): S.add(conga([60, 63, 60, 65][[2, 7, 10, 14].index(s)], 0.09, 0.2, slap=s == 7), t, -0.45, "drums")
    for s, d in BASS: S.add(bassn(r + 12 + d, S16 * 1.6, 0.28) if False else k808(r + 12 + d, S16 * 1.8, 0.26), bt(bar, s), 0, "bass")
    for s in (0, 6, 10): S.add(ep(ch, S16 * (6 if s == 0 else 4), 0.045), bt(bar, s), -0.15, "keys")
    S.add(pad([m + 12 for m in ch[:3]], BAR, 0.011), bt(bar), 0.15, "pads")
    if not lt:
        for s, m in RIFF: S.add(chop(m, S16 * 1.8, "ao"[s % 2], 0.2), bt(bar, s), 0.1, "chop")
# ---- the mechanism plays the music ----
roll(bt(0, 0), 2.5 * BAR - S16, 0.13, S); roll(L[9], 2 * BAR - S16, 0.13, S)          # hook: feather
for t in COPY: S.add(blip(65, 0.08, 0.3), t, -0.3, "fx"); S.add(blip(77, 0.06, 0.3), t + 0.12, 0.3, "fx")
for t in SELF: S.add(thud(0.22), t, 0, "fx")                                           # self: cancelled → just a thud
for t in EXT: S.add(thud(0.22), t, 0, "fx"); roll(t, BAR * 0.75, 0.15, S)                # external: full roll
for (t, d), v in zip(ROBOT, (0.03, 0.08, 0.14)): S.add(thud(0.2), t + d, 0, "fx"); roll(t + d, BAR * 0.5, v, S)
for k, (t, f) in enumerate(zip(TURNS, FORCE)):
    S.add(tkick(min(0.95, 0.35 * f ** 0.6)), t, (-0.4, 0.4)[k % 2], "fx"); S.add(conga(53 + 2 * k, min(0.4, 0.12 * f ** 0.6), 0.3, slap=True), t, (-0.4, 0.4)[k % 2], "fx")
for t in VOICE: S.add(chop(79, BEAT * 0.9, "e", 0.22), t, 0.8, "fx")
S.add(riser(BAR / 2, 0.04, seed=3), L[1] - BAR / 2); S.add(impact(0.25), L[1], 0, "fx"); S.add(impact(0.22), L[9], 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("fx", BEAT * 0.75, fb=0.3, mix=0.2)
S.sidechain("bass", kicks, 0.2); S.sidechain("pads", kicks, 0.45); S.sidechain("keys", kicks, 0.2)
S.reverb("chop", 0.25, 1.6, 21); S.reverb("keys", 0.25, 1.6, 31); S.reverb("pads", 0.35, 2.4, 41); S.reverb("drums", 0.08, 0.8, 51); S.reverb("fx", 0.25, 1.4, 61); S.reverb("tickle", 0.15, 0.9, 71)
S.save(ROOT / "public/videos/35-tickle/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "pads": 0.8, "chop": 0.85, "fx": 1.0, "tickle": 1.0})
print(f"tickle: {DUR:.3f} s")
