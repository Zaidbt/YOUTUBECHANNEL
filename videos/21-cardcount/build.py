"""Video 021 · CAN YOU COUNT CARDS? — the viewer plays 3 levels of Hi-Lo card counting (2-6 = +1, 7-9 = 0, 10-A = -1).
40 s seamless loop, 126 BPM ELECTRO SWING (21 bars): swung 4-on-the-floor, walking bass + sub, brass stabs, a muted
"wah-wah" trumpet hook (formant synth), piano comping, ride pattern, fills, stop-time breaks before every reveal and a
brass fanfare + crash on the answer. You can HEAR the count: +1 cards are a high pizzicato, -1 cards a low brass "bwap",
0 cards a rim click.

Timeline (bars, 1.905 s): 0 hook · 1-2 the rules · 3-6 LEVEL 1 (a card every 2 beats, hints) · 7 "your count?" → reveal
· 8-10 LEVEL 2 (a card per beat, no hints) · 11 reveal · 12-14 why it works: low cards gone = the shoe is rich in tens
and aces → the edge swings ~1 % to the player · 15-17 LEVEL 3 casino speed (2 cards per beat) · 18 reveal · 19 "comment
your count" · 20 hook again (loop).
Writes remotion/src/videos/cardcount/cardcount.json + public/videos/21-cardcount/music.wav.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import hz, noise  # noqa: E402
from stereo import StereoSong, SR  # noqa: E402

BPM, BARS = 126, 21
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; S16 = BEAT / 4
SWING = {0: 0.0, 1: 0.1, 2: 0.55, 3: 0.3}
bt = lambda bar, step=0: round(bar * BAR + (step + SWING[step % 4]) * S16, 5)
rng = np.random.default_rng(21)

VAL = lambda r: 1 if r in "23456" else 0 if r in "789" else -1
SUITS = "SHDC"
def deal(ranks, times):
    return [{"t": t, "r": ("10" if r == "T" else r), "s": SUITS[(i * 3 + len(ranks)) % 4], "v": VAL(r)} for i, (r, t) in enumerate(zip(ranks, times))]
L1 = deal("5K392Q64", [bt(3 + k // 2, (k % 2) * 8) for k in range(8)])                       # every 2 beats
L2 = deal("T4A762J538K2", [bt(8 + k // 4, (k % 4) * 4) for k in range(12)])                  # every beat
L3 = deal("3KT52A796Q4J25T83K6A47Q", [bt(15 + k // 8, (k % 8) * 2) for k in range(23)])      # 2 per beat (casino speed)
levels = [{"cards": L, "count": sum(c["v"] for c in L)} for L in (L1, L2, L3)]
ASK = [bt(7), bt(11), bt(18)]; REVEAL = [bt(7, 8), bt(11, 8), bt(18, 8)]
shoe = [bt(12, 8) + k * BEAT for k in range(6)]                                              # explanation: 6 low cards leave the shoe
ev = {"duration": DUR, "bpm": BPM, "bar": BAR, "levels": levels, "ask": ASK, "reveal": REVEAL, "shoe": shoe,
      "rules": bt(1), "l": [bt(3), bt(8), bt(15)], "why": bt(12), "outro": bt(19), "again": bt(20)}
(ROOT / "remotion/src/videos/cardcount/cardcount.json").write_text(json.dumps(ev))
print("counts:", [l["count"] for l in levels])

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

def brass(notes, dur, vol=0.07, bright=1.0):
    """synth brass section stab: detuned saws, fast filter 'blat' envelope"""
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for dt in (-0.006, 0.0, 0.007):
            ph = np.cumsum(hz(m) * (1 + dt) * (1 - 0.02 * np.exp(-t / 0.02))) / SR + rng.random(); x += 2 * (ph % 1) - 1
    cut = 500 + 3800 * bright * np.exp(-t / 0.09) + 900 * bright
    y = np.empty(n); s = 0.0; s2 = 0.0
    for i in range(n):
        a = np.exp(-2 * np.pi * cut[i] / SR); s = (1 - a) * x[i] + a * s; s2 = (1 - a) * s + a * s2; y[i] = s2
    return y / (len(notes) * 1.5) * vol * 3 * np.clip(t / 0.006, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
def piano(notes, dur=0.5, vol=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        f = hz(m); x += np.sin(2 * np.pi * f * t + 0.9 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.08)) + 0.3 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.04)
    return x / len(notes) * vol * 3 * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.22) * np.clip((dur - t) / 0.03, 0, 1)
def upright(midi, dur, vol=0.36):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi) * (1 + 0.25 * np.exp(-t / 0.01)); ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.35 * np.sin(2 * np.pi * 2 * ph) * np.exp(-t / 0.12) + 0.12 * np.sin(2 * np.pi * 3 * ph) * np.exp(-t / 0.05)
    click = hp(noise(0.012, 1.0, 0.004, rate=44100, seed=3), 1500); x[:len(click)] += click * 0.25
    return x * vol * np.clip(t / 0.003, 0, 1) * np.exp(-t / (dur * 0.9)) * np.clip((dur - t) / 0.02, 0, 1)
def ride(vol=0.035, seed=0):
    n = int(0.3 * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((5200, 6700, 8100, 9300))) * 0.25 + hp(noise(0.3, 1.0, 0.3, rate=44100, seed=seed)[:n], 6000) * 0.5
    return x * vol * np.exp(-t / 0.09)
def crash(vol=0.12, seed=5):
    n = int(1.4 * SR); t = np.arange(n) / SR
    return hp(lp(noise(1.4, 1.0, 1.4, rate=44100, seed=seed)[:n], 10000), 3500) * vol * np.exp(-t / 0.45)
def pizz(midi, vol=0.13):
    n = int(0.3 * SR); t = np.arange(n) / SR; f = hz(midi)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.03) + 0.2 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.015)) * vol * np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.07)
def rimc(vol=0.1):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008) + 0.4 * np.sin(2 * np.pi * 800 * t) * np.exp(-t / 0.012)) * vol

S = StereoSong(BPM, BARS)
DM6, GM6, A7 = [62, 65, 69, 71], [58, 62, 64, 67], [57, 61, 64, 67]
PROG = [DM6, DM6, GM6, A7]; WALK = [[38, 41, 45, 47], [38, 45, 41, 40], [43, 46, 50, 52], [45, 49, 52, 43]]
chord = lambda b: A7 if b == 0 else PROG[(b - 1) % 4]
walk = lambda b: WALK[3] if b == 0 else WALK[(b - 1) % 4]
HOOK_A = [(0, 74, 2), (2, 77, 2), (4, 81, 2), (6, 77, 2), (8, 81, 2), (10, 84, 2), (12, 81, 4)]
HOOK_B = [(0, 82, 2), (2, 81, 2), (4, 77, 2), (6, 74, 2), (8, 76, 2), (10, 73, 2), (12, 74, 4)]
def sec(b):
    if b in (0, 20): return "hook"
    if b in (1, 2): return "rules"
    if b in (7, 11, 18): return "ask"
    if b < 7: return "l1"
    if b < 11: return "l2"
    if b < 15: return "why"
    if b < 18: return "l3"
    return "outro"
ENERGY = {"hook": 1.0, "rules": 0.55, "l1": 0.75, "l2": 0.9, "why": 0.6, "l3": 1.1, "ask": 0.0, "outro": 1.0}
kicks = []
for bar in range(BARS):
    s_ = sec(bar); ch = chord(bar); wk = walk(bar); en = ENERGY[s_]
    if s_ == "ask":
        # stop-time: two beats of suspense (ticking ride + a held note), then the fanfare on beat 3
        for s in (0, 2, 4, 6): S.add(ride(0.03, seed=bar + s), bt(bar, s), 0.3, "drums")
        S.add(upright(wk[0], BEAT * 1.8, 0.3), bt(bar, 0), 0, "bass")
        for k in range(8): S.add(snr(0.08 + k * 0.02, seed=90 + k), bt(bar, 4) + k * S16 / 2, 0, "drums")
        S.add(kick(), bt(bar, 8), 0, "drums", 1.0); kicks.append(bt(bar, 8)); S.add(crash(0.13, seed=bar), bt(bar, 8), 0, "drums")
        S.add(brass([m + 12 for m in ch], BEAT * 1.4, 0.085, 1.3), bt(bar, 8), 0, "brass"); S.add(brass([m + 12 for m in ch], BEAT * 0.5, 0.075, 1.3), bt(bar, 14), 0, "brass")
        S.add(upright(wk[2], BEAT * 0.9), bt(bar, 8), 0, "bass"); S.add(upright(wk[3], BEAT * 0.9), bt(bar, 12), 0, "bass")
        S.add(kick(), bt(bar, 12), 0, "drums", 0.9); kicks.append(bt(bar, 12)); S.add(clap(0.26, seed=bar), bt(bar, 12), 0, "drums")
        continue
    # drums: swung four-on-the-floor
    for s in (0, 4, 8, 12):
        if en > 0.6 or s in (0, 8): S.add(kick(), bt(bar, s), 0, "drums", 0.9); kicks.append(bt(bar, s))
    for s in (4, 12):
        if en > 0.6: S.add(clap(0.26 * min(1, en), seed=bar * 2 + s), bt(bar, s), 0.05, "drums")
        else: S.add(rimc(0.09), bt(bar, s), 0.2, "drums")
    for s in (0, 4, 6, 8, 12, 14): S.add(ride(0.035 * (0.6 + 0.4 * en), seed=bar * 16 + s), bt(bar, s), 0.35, "drums")   # ding, ding-a-ding
    if en > 0.85:
        for s in (2, 6, 10, 14): S.add(hat(0.03, seed=700 + bar * 16 + s, long=(s == 14)), bt(bar, s), -0.35, "drums")
    if bar in (6, 10, 14, 17, 19):                                                       # fill into the next section
        for k in range(6): S.add(snr(0.1 + k * 0.02, seed=50 + k + bar), bt(bar, 10) + k * S16, 0, "drums")
    # walking bass (+ sub on the downbeat in the big sections)
    for q in range(4): S.add(upright(wk[q], BEAT * 0.92, 0.36), bt(bar, q * 4), 0, "bass")
    if en > 0.85: S.add(logdrum(wk[0] - 12, BEAT * 1.5, 0.22), bt(bar, 0), 0, "bass")
    # piano comping + brass stabs on the off-beats
    for s, d in ((0, 0.35), (6, 0.25), (10, 0.3)): S.add(piano(ch, d, 0.045 * (0.6 + 0.4 * en)), bt(bar, s), -0.3, "keys")
    if en > 0.7:
        for s in (6, 14): S.add(brass([m + 12 for m in ch[1:]], BEAT * 0.45, 0.06 * en), bt(bar, s), 0.3, "brass")
    if s_ in ("hook", "outro", "l3"): S.add(brass(ch, BEAT * 0.9, 0.05), bt(bar, 0), -0.2, "brass")
    S.add(pad(ch, BAR, 0.012), bt(bar), 0, "pads")
    # the wah-wah trumpet hook (the earworm): full in hook / outro / why, answer phrases in the levels
    hk = HOOK_B if bar % 2 == 0 else HOOK_A
    if s_ in ("hook", "outro", "why", "rules") or (s_ in ("l1", "l2", "l3") and bar % 2 == 0):
        for i, (s, m, ln) in enumerate(hk):
            if s_ in ("l1", "l2", "l3") and s < 8: continue                              # leave room for the cards: only the tail phrase
            S.add(chop(m, ln * S16 * 0.9, "ao"[i % 2], 0.34 * (0.7 + 0.3 * en)), bt(bar, s), 0.1, "chop")
# every card is a note: +1 high pizzicato, -1 low brass bwap, 0 rim click
UP = [74, 77, 81, 84, 86, 89]; n_up = 0
for L in levels:
    for c in L["cards"]:
        if c["v"] > 0: S.add(pizz(UP[n_up % 6] + 12, 0.14), c["t"], 0.4, "keys"); n_up += 1
        elif c["v"] < 0: S.add(brass([50, 57], BEAT * 0.4, 0.07, 0.6), c["t"], -0.4, "brass")
        else: S.add(rimc(0.13), c["t"], 0, "drums")
for t in REVEAL: S.add(impact(0.45), t, 0, "fx"); [S.add(blip(m, 0.11, 0.35), t + k * S16, [-0.3, 0.3][k % 2], "keys") for k, m in enumerate((86, 89, 93, 98))]
for t in ev["l"]: S.add(crash(0.1, seed=int(t)), t, 0, "drums"); S.add(impact(0.35), t, 0, "fx")
for i, t in enumerate(shoe): S.add(pizz([74, 77, 81, 84, 86, 89][i] + 12, 0.12), t, [-0.4, 0.4][i % 2], "keys")
S.add(riser(BAR, 0.05, seed=3), bt(2)); S.add(riser(BAR, 0.06, seed=5), bt(14)); S.add(crash(0.12, seed=77), bt(19), 0, "drums")
S.delay("chop", BEAT * 0.75, fb=0.3, mix=0.18); S.delay("keys", BEAT * 0.5, fb=0.25, mix=0.12)
S.sidechain("bass", kicks, 0.3); S.sidechain("pads", kicks, 0.5); S.sidechain("brass", kicks, 0.2); S.sidechain("chop", kicks, 0.15)
S.reverb("chop", 0.22, 1.3, 21); S.reverb("keys", 0.2, 1.3, 31); S.reverb("pads", 0.35, 2.2, 41); S.reverb("drums", 0.12, 0.9, 51); S.reverb("brass", 0.2, 1.2, 71); S.reverb("fx", 0.25, 1.3, 61)
S.save(ROOT / "public/videos/21-cardcount/music.wav", gains={"drums": 1.0, "bass": 1.0, "chop": 1.0, "keys": 0.95, "pads": 0.7, "brass": 1.0, "fx": 0.85})
print(f"cardcount: {DUR:.3f} s")
