"""Video 032 · How a lock gets picked — pin tumbler lock, same format as 030/031.
40.9 s seamless loop, 88 BPM boom-bap heist (D minor, swung, Rhodes, upright bass, vibraphone). Every pin that SETS is
a click + a vibraphone note climbing D-F-A-C-D, the plug turning is a brass stab.
Facts: a pin tumbler cylinder (Linus Yale Jr., 1860s) has ~5 pin stacks: key pin + driver pin + spring. The drivers
cross the shear line (gap between plug and housing) so the plug can't turn. The right key lifts every gap exactly to the
shear line. Picking: a tension wrench twists the plug slightly; tiny machining errors make ONE pin bind at a time; the
pick lifts it until the driver clears the line and sits on the plug's ledge (click), then the next binds. 5 pins with up
to 10 heights = up to 100,000 keys. Better locks use spool (security) pins that fake a set.
Timeline (bars): 0-1.5 hook (door, pick + wrench) · 1.5-2 dive into the keyhole · 2-4 ① inside: 5 pin stacks ·
4-6 ② the right key → shear line → turns · 6-7.5 ③ no key: twist → one pin binds · 7.5-10.5 ④ lift, click ×5 ·
10.5-12 ⑤ it turns · 12-13 ⑥ spool pins fight back · 13-15 hook.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402
rng = np.random.default_rng(32)
src = (ROOT / "videos/30-vibration/build.py").read_text()
exec(src[src.index("def lp("):src.index("S = StereoSong")])

BPM, BARS = 88, 15
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
bt = lambda bar, step=0: round(bar * BAR + step * S16, 5)
bb = lambda x: bt(int(x), int(round((x - int(x)) * 16)))
SW = lambda bar, s: bt(bar, s) + (S16 * 0.2 if s % 2 else 0)                    # swing
L = [bb(x) for x in (0, 1.5, 2, 4, 6, 7.5, 10.5, 12, 13, 15)]
ORDER = [2, 4, 0, 3, 1]                                                          # binding order
SETS = [bb(x) for x in (8.0, 8.5, 9.0, 9.5, 10.0)]
KEY = {"in0": bb(4.25), "in1": bb(4.5), "turn0": bb(5.0), "turn1": bb(5.25), "back": bb(5.5), "out0": bb(5.625), "out1": bb(5.875)}
TURN = [bb(10.5), bb(10.75)]
SPOOL = bb(12.5)
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "beat": BEAT, "l": L, "order": ORDER, "sets": SETS, "key": KEY, "turn": TURN, "spool": SPOOL}
(ROOT / "remotion/src/videos/lockpick/lockpick.json").write_text(json.dumps(ev))

def bkick(vol=0.9):
    n = int(0.35 * SR); t = np.arange(n) / SR
    return lp(np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-t / 0.025)) / SR) * np.exp(-t / 0.16) + hp(noise(0.35, 1.0, 0.006, rate=44100, seed=3)[:n], 2000) * 0.3, 5000) * vol
def bsnare(vol=0.3, seed=0):
    return lp(snare(vol, seed), 6000)
def upright(midi, dur, vol=0.32):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi); ph = f * t
    x = np.sin(2 * np.pi * ph) + 0.3 * np.sin(4 * np.pi * ph) * np.exp(-t / 0.1) + 0.1 * np.sin(6 * np.pi * ph) * np.exp(-t / 0.04)
    return x * vol * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.5) * np.clip((dur - t) / 0.03, 0, 1)
def vib(midi, vol=0.14, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.05)) * (1 + 0.25 * np.sin(2 * np.pi * 5.5 * t))
    return x * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.45)
def click(vol=0.3):
    n = int(0.04 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.004) + hp(noise(0.04, 1.0, 0.006, rate=44100, seed=9)[:n], 4000) * 0.6) * vol
def brass(notes, dur, vol=0.1):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        ph = hz(m) * t; x += 2 * (ph % 1) - 1
    cut = 600 + 2500 * np.exp(-t / 0.15)
    y = lp(x, 2500) * (0.6 + 0.4 * np.exp(-t / 0.1))
    return y / len(notes) * vol * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)
def scratch(vol=0.06):
    n = int(0.25 * SR); t = np.arange(n) / SR
    return reson(noise(0.25, 1.0, 0.25, rate=44100, seed=11)[:n], 1100, 6) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * t)) * vol * 6

S = StereoSong(BPM, BARS)
# D minor heist: Dm9 - Bbmaj7 - Gm9 - A7(b9)
CH = [[50, 53, 57, 60, 64], [46, 50, 53, 57], [43, 46, 50, 53, 57], [45, 49, 52, 55, 58]]; RT = [38, 34, 31, 33]
MOT = [(0, 74), (3, 72), (4, 69), (8, 70), (11, 69), (12, 65)]                   # the heist motif (pizz/vib)
WALK = [(0, 0), (6, 7), (8, 12), (10, 10), (14, 7)]
def light(b): return 6 <= b < 10.5
kicks = []
for bar in range(BARS):
    ch, r = CH[bar % 4], RT[bar % 4]; lt = light(bar)
    for s in range(16):
        t = SW(bar, s)
        if s in (0, 10) or (s == 7 and bar % 2): S.add(bkick(0.85), t, 0, "drums"); kicks.append(t)
        if s in (4, 12) and not (lt and s == 4): S.add(bsnare(0.26, seed=bar + s), t, 0.05, "drums")
        if s % 2 == 0: S.add(hat(0.03 if not lt else 0.022, seed=700 + bar * 16 + s), t, 0.3, "drums")
    for s, d in WALK: S.add(upright(r + d, S16 * 2.2, 0.3), SW(bar, s), 0, "bass")
    S.add(keys(ch, BAR * 0.95, 0.05), bt(bar), -0.2, "keys")
    if not lt:
        for s, m in MOT: S.add(pluck(m, 0.07, 0.35), SW(bar, s), 0.25, "chop")
    if bar % 2 == 1 and not lt: S.add(scratch(0.05), bt(bar, 14), -0.3, "fx")
# events = notes
NOTES = [62, 65, 69, 72, 74]
for i, t in enumerate(SETS): S.add(click(0.3), t, 0, "fx"); S.add(vib(NOTES[i] + 12, 0.16), t, (-0.3, 0.3)[i % 2], "fx")
for t in SETS: S.add(rim2(0.12, seed=int(t * 10)), t - BEAT * 0.5, 0, "fx")          # the lift
S.add(click(0.25), KEY["turn0"], 0, "fx"); S.add(brass([62, 65, 69], BEAT * 1.5, 0.12), KEY["turn0"], 0, "fx")
S.add(brass([62, 66, 69, 74], BEAT * 2.5, 0.16), TURN[0], 0, "fx"); S.add(impact(0.3), TURN[0], 0, "fx")
S.add(click(0.3), SPOOL, 0, "fx"); S.add(vib(73, 0.14), SPOOL, 0, "fx"); S.add(click(0.2), SPOOL + BEAT, 0, "fx"); S.add(vib(68, 0.12), SPOOL + BEAT, 0, "fx")
S.add(riser(BAR / 2, 0.05, seed=3), L[1]); S.add(impact(0.3), L[2], 0, "fx"); S.add(impact(0.25), L[8], 0, "fx")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.2); S.delay("fx", BEAT * 0.5, fb=0.2, mix=0.12)
S.sidechain("bass", kicks, 0.15); S.sidechain("keys", kicks, 0.15)
S.reverb("chop", 0.25, 1.6, 21); S.reverb("keys", 0.25, 1.8, 31); S.reverb("drums", 0.1, 0.9, 51); S.reverb("fx", 0.25, 1.4, 61)
S.save(ROOT / "public/videos/32-lockpick/music.wav", gains={"drums": 1.0, "bass": 1.0, "keys": 0.95, "chop": 0.9, "fx": 1.0})
print(f"lockpick: {DUR:.3f} s")
