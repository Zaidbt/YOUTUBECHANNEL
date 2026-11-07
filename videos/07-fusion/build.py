"""Video 007 · How does fusion power the Sun? — 48 s seamless loop, 150 BPM (hyper), 30 bars of 1.6 s.

Events shared with the picture (fusion.json):
  repel   9.6 s            two protons bounce off each other
  fuse    14.4 s           first fusion (DROP 1)
  r1 16.0 / r2 17.6 / r3 20.8   p+p -> D, D+p -> He-3, He-3+He-3 -> He-4
  montage 22.4-25.6 s      a fusion on every beat
  storm   32.0-36.8 s      a fusion on every 16th (DROP 2)
  bounces 36.8-40.0 s      a photon random-walks out of the Sun (one note per bounce)
  beam    40.0 s           light leaves the Sun (8 minutes to Earth)
Music: four-on-the-floor kick, offbeat open hats, rolling 16th bass, supersaw chords side-chained to the kick,
snare-roll build-ups, risers, impacts on every fusion. Bars 26-29 mirror bars 0-3 so the loop is seamless.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from chiptune import *  # noqa: E402

BPM, BARS = 150, 30
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = BARS * BAR  # 48 s
r4 = lambda x: round(x, 4)
EV = {
    "repel": 9.6, "fuse": 14.4, "r1": 16.0, "r2": 17.6, "r3": 20.8, "beam": 40.0,
    "montage": [r4(22.4 + k * BEAT) for k in range(8)],
    "storm": [r4(32.0 + k * BEAT / 4) for k in range(48)],
    "bounces": [r4(36.8 + k * BEAT / 4) for k in range(32)],
}
(ROOT / "remotion/src/videos/fusion/fusion.json").write_text(json.dumps({"duration": DUR, "bpm": BPM, "bar": BAR, **EV}))
print("events written")

# ---------- extra instruments ----------
def saw(midi, dur, vol=0.1, det=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = (hz(midi + det) * t + np.random.default_rng(int(midi * 100 + det * 1000) % 9999).random()) % 1
    return (ph * 2 - 1) * vol

def supersaw(notes, dur, vol=0.03, attack=0.01, release=0.15):
    n = int(dur * SR)
    x = np.zeros(n)
    for m in notes:
        for d in (-0.18, -0.08, 0.0, 0.08, 0.18):
            x += saw(m, dur, vol, d)[:n]
    k = np.arange(n) / SR
    env = np.clip(k / attack, 0, 1) * np.clip((dur - k) / release, 0, 1)
    return x * env

def big_kick(vol=1.0):
    n = int(0.3 * SR); t = np.arange(n) / SR
    f = 45 + 160 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    click = noise(0.01, 0.6, 0.002, rate=44100, seed=1)
    return mix(body, click) * vol

def clap(vol=0.35, seed=0):
    parts = [np.pad(noise(0.012, vol, 0.004, rate=22050, seed=seed + i), (int(i * 0.009 * SR), 0)) for i in range(3)]
    return mix(*parts, np.pad(noise(0.25, vol * 0.8, 0.06, rate=16000, seed=seed + 9), (int(0.027 * SR), 0)))

def impact(vol=0.8, seed=0):
    """Fusion hit: boom + bright crash + a falling zap."""
    n = int(0.5 * SR); t = np.arange(n) / SR
    zap = np.sin(2 * np.pi * np.cumsum(1800 * np.exp(-t / 0.05) + 80) / SR) * np.exp(-t / 0.15) * 0.4
    return mix(big_kick(1.0) * 0.9, crash(0.35, seed=seed)[: int(1.2 * SR)], zap) * vol

def riser(dur, vol=0.18, seed=3):
    x = np.convolve(noise(dur, vol, 99, rate=44100, seed=seed), np.ones(6) / 6, mode="same")
    k = np.linspace(0, 1, len(x))
    return x * k ** 2.5 + sweep(200, 2400, dur, duty=0.25, vol=vol * 0.25, curve=2.0)[: len(x)] * k

def snare_roll(start, bars, s_, vol=0.25):
    steps = int(bars * 16)
    for i in range(steps):
        frac = i / steps
        if frac < 0.5 and i % 2: continue  # 8ths then 16ths
        s_.add(clap(vol * (0.35 + 0.65 * frac), seed=300 + i), start + i * BEAT / 4)

# ---------- arrangement ----------
main = Song(bpm=BPM, bars=BARS, loop=True)   # drums, lead, fx
sc = Song(bpm=BPM, bars=BARS, loop=True)     # pads + bass, side-chained to the kick
PROG = [[47, 54, 59, 62], [43, 50, 55, 59], [50, 57, 62, 66], [45, 52, 57, 61]]  # Bm G D A
ch = lambda bar: PROG[bar % 4]
LEAD = [[83, None, 81, 83, None, 86, None, 83], [79, None, 78, 79, None, 83, None, 79], [81, None, 78, 81, None, 86, 85, 83], [81, 78, None, 76, None, 78, 81, None]]

def kick_bar(bar, which=(0, 1, 2, 3)):
    for b in which: main.add(big_kick(0.95), main.t(bar, b))
def hats_bar(bar, open_off=True, closed16=False):
    for b in range(4):
        if open_off: main.add(hat(0.16, open_=True, seed=bar * 4 + b), main.t(bar, b + 0.5))
        if closed16:
            for q in (0.25, 0.75): main.add(hat(0.1, seed=bar * 8 + b * 2 + int(q * 4)), main.t(bar, b + q))
def claps_bar(bar):
    for b in (1, 3): main.add(clap(0.3, seed=bar * 2 + b), main.t(bar, b))
def bass_bar(bar, vol=0.32):
    r = ch(bar)[0] - 12
    for i in range(16):
        sc.add(pulse(r + (12 if i % 2 else 0), BEAT / 4 * 0.9, duty=0.25, vol=vol, decay=0.08, sustain=0.5), sc.t(bar, i / 4))
def chords_bar(bar, vol=0.024):
    sc.add(supersaw([n + 12 for n in ch(bar)], BAR, vol=vol), sc.t(bar))
def pad_bar(bar, vol=0.03):
    for n in ch(bar):
        x = tri(n + 12, BAR, vol); k = np.linspace(0, 1, len(x)); sc.add(x * np.clip(k / 0.3, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), sc.t(bar))
def arp_bar(bar, vol=0.05):
    ns = [n + 24 for n in ch(bar)]
    for i in range(16): main.add(pulse(ns[i % 4], BEAT / 4 * 0.8, duty=0.125, vol=vol, decay=0.06, sustain=0.2), main.t(bar, i / 4))
def lead_bar(bar, vol=0.07, up=0):
    for i, n in enumerate(LEAD[bar % 4]):
        if n: main.add(supersaw([n + up], BEAT / 2 * 0.95, vol=vol / 3, release=0.05), main.t(bar, i / 2))

def groove(bar, full=True, lead=False):
    kick_bar(bar); hats_bar(bar, closed16=full); claps_bar(bar); bass_bar(bar); arp_bar(bar, 0.04)
    if full: chords_bar(bar)
    else: pad_bar(bar)
    if lead: lead_bar(bar)

# 0-2 intro (the Sun) · 26-29 outro mirror it so the loop closes
for bar in (0, 1, 2): groove(bar, full=False, lead=True)
# 3 build into the dive
kick_bar(3, (0, 1)); pad_bar(3); arp_bar(3, 0.05); snare_roll(main.t(3), 1, main); main.add(riser(BAR, 0.16), main.t(3))
# 4-8 inside the core: half-time tension
for bar in range(4, 9):
    kick_bar(bar, (0, 2)); main.add(clap(0.28, seed=bar), main.t(bar, 2)); hats_bar(bar, open_off=True); pad_bar(bar, 0.035); bass_bar(bar, 0.2)
main.add(crash(0.3, seed=4), main.t(4))
main.add(mix(sweep(900, 120, 0.35, duty=0.5, vol=0.15), noise(0.2, 0.15, 0.05, seed=6)), EV["repel"])  # "boing": protons repel
snare_roll(main.t(8), 1, main, 0.3); main.add(riser(BAR, 0.2, seed=8), main.t(8))
# 9-15 DROP 1: fusion chain
for bar in range(9, 16): groove(bar, full=True, lead=bar >= 10)
for i, key in enumerate(("fuse", "r1", "r2", "r3")): main.add(impact(0.9, seed=20 + i), EV[key])
for k, t in enumerate(EV["montage"]): main.add(impact(0.45, seed=60 + k), t)
# 16-19 breakdown: mass -> energy, then build to drop 2
for bar in (16, 17): pad_bar(bar, 0.04); arp_bar(bar, 0.05); hats_bar(bar, open_off=True)
for k, n in enumerate([83, 86, 88, 90]): main.add(supersaw([n], BEAT * 0.9, vol=0.02), main.t(18, k))  # E = mc² stab
for bar in (18, 19): kick_bar(bar, (0, 1, 2, 3)); pad_bar(bar, 0.035); arp_bar(bar, 0.055)
snare_roll(main.t(18), 2, main, 0.32); main.add(riser(BAR * 2, 0.22, seed=11), main.t(18))
# 20-22 DROP 2: the storm, a zap on every 16th
for bar in (20, 21, 22): groove(bar, full=True, lead=True)
main.add(crash(0.4, seed=12), main.t(20))
for k, t in enumerate(EV["storm"]):
    n = int(0.08 * SR); tt = np.arange(n) / SR
    main.add(np.sin(2 * np.pi * np.cumsum(2600 * np.exp(-tt / 0.02) + 300) / SR) * np.exp(-tt / 0.03) * 0.06, t)
# 23-25 the photon escapes: half-time, a note per bounce, then the beam
for bar in (23, 24, 25):
    kick_bar(bar, (0, 2)); main.add(clap(0.25, seed=70 + bar), main.t(bar, 2)); pad_bar(bar, 0.035); hats_bar(bar, open_off=True)
PENTA = [83, 86, 88, 90, 93, 95, 98]
for k, t in enumerate(EV["bounces"]):
    main.add(pulse(PENTA[(k * 3) % len(PENTA)], 0.09, duty=0.25, vol=0.05, decay=0.05, sustain=0.0), t)
main.add(mix(sweep(300, 3000, 1.0, duty=0.25, vol=0.08, curve=1.2), crash(0.25, seed=13)), EV["beam"])
# 26-29 outro = intro (loop)
for bar in (26, 27, 28, 29): groove(bar, full=False, lead=True)

# side-chain pump: duck pads + bass after every kick
kicks = sorted({round(main.t(b, q), 4) for b in range(BARS) for q in range(4)})
tt = np.arange(len(sc.buf)) / SR
last = np.full(len(tt), -10.0)
for k in kicks: last[tt >= k] = k
pump = 1 - 0.65 * np.exp(-(tt - last) / 0.11)
main.buf += sc.buf * pump
main.lowpass(9000)
main.reverb(wet=0.18, decay=1.6)
main.save(ROOT / "public/videos/07-fusion/music.wav")
