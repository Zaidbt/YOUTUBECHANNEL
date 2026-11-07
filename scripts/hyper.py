"""Hyper (150 BPM-style) instruments and helpers on top of chiptune.py.

Four-on-the-floor kick, claps, hats, rolling 16th bass, supersaw chords, risers, impacts, snare rolls,
and a side-chain pump. Use two Songs: `main` (drums/leads/fx) and `sc` (pads + bass), then `pump_mix(main, sc)`.
"""
import numpy as np
from chiptune import SR, hz, mix, noise, pulse, tri, sweep, crash, hat


def saw(midi, dur, vol=0.1, det=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = (hz(midi + det) * t + np.random.default_rng(int(midi * 100 + det * 1000) % 9999).random()) % 1
    return (ph * 2 - 1) * vol

def supersaw(notes, dur, vol=0.03, attack=0.01, release=0.15):
    n = int(dur * SR); x = np.zeros(n)
    for m in notes:
        for d in (-0.18, -0.08, 0.0, 0.08, 0.18): x += saw(m, dur, vol, d)[:n]
    k = np.arange(n) / SR
    return x * np.clip(k / attack, 0, 1) * np.clip((dur - k) / release, 0, 1)

def big_kick(vol=1.0):
    n = int(0.3 * SR); t = np.arange(n) / SR
    f = 45 + 160 * np.exp(-t / 0.03)
    return mix(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18), noise(0.01, 0.6, 0.002, rate=44100, seed=1)) * vol

def clap(vol=0.35, seed=0):
    parts = [np.pad(noise(0.012, vol, 0.004, rate=22050, seed=seed + i), (int(i * 0.009 * SR), 0)) for i in range(3)]
    return mix(*parts, np.pad(noise(0.25, vol * 0.8, 0.06, rate=16000, seed=seed + 9), (int(0.027 * SR), 0)))

def impact(vol=0.8, seed=0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    zap = np.sin(2 * np.pi * np.cumsum(1800 * np.exp(-t / 0.05) + 80) / SR) * np.exp(-t / 0.15) * 0.4
    return mix(big_kick(1.0) * 0.9, crash(0.35, seed=seed)[: int(1.2 * SR)], zap) * vol

def zap(vol=0.06, f0=2600):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f0 * np.exp(-t / 0.02) + 300) / SR) * np.exp(-t / 0.03) * vol

def riser(dur, vol=0.18, seed=3):
    x = np.convolve(noise(dur, vol, 99, rate=44100, seed=seed), np.ones(6) / 6, mode="same")
    k = np.linspace(0, 1, len(x))
    return x * k ** 2.5 + sweep(200, 2400, dur, duty=0.25, vol=vol * 0.25, curve=2.0)[: len(x)] * k

def pluck(midi, dur=0.18, vol=0.08):
    """Bright chip pluck for melodic events."""
    return pulse(midi, dur, duty=0.25, vol=vol, decay=0.07, sustain=0.15)


class Hyper:
    def __init__(self, main, sc, prog, beat):
        self.main, self.sc, self.prog, self.beat = main, sc, prog, beat

    def ch(self, bar): return self.prog[bar % len(self.prog)]
    def kick(self, bar, which=(0, 1, 2, 3), vol=0.95):
        for b in which: self.main.add(big_kick(vol), self.main.t(bar, b))
    def hats(self, bar, closed16=False):
        for b in range(4):
            self.main.add(hat(0.16, open_=True, seed=bar * 4 + b), self.main.t(bar, b + 0.5))
            if closed16:
                for q in (0.25, 0.75): self.main.add(hat(0.1, seed=bar * 8 + b * 2 + int(q * 4)), self.main.t(bar, b + q))
    def claps(self, bar, which=(1, 3), vol=0.3):
        for b in which: self.main.add(clap(vol, seed=bar * 2 + b), self.main.t(bar, b))
    def bass(self, bar, vol=0.32):
        r = self.ch(bar)[0] - 12
        for i in range(16):
            self.sc.add(pulse(r + (12 if i % 2 else 0), self.beat / 4 * 0.9, duty=0.25, vol=vol, decay=0.08, sustain=0.5), self.sc.t(bar, i / 4))
    def chords(self, bar, vol=0.024):
        self.sc.add(supersaw([n + 12 for n in self.ch(bar)], 4 * self.beat, vol=vol), self.sc.t(bar))
    def pad(self, bar, vol=0.03):
        for n in self.ch(bar):
            x = tri(n + 12, 4 * self.beat, vol); k = np.linspace(0, 1, len(x))
            self.sc.add(x * np.clip(k / 0.3, 0, 1) * np.clip((1 - k) / 0.2, 0, 1), self.sc.t(bar))
    def arp(self, bar, vol=0.045):
        ns = [n + 24 for n in self.ch(bar)]
        for i in range(16): self.main.add(pulse(ns[i % 4], self.beat / 4 * 0.8, duty=0.125, vol=vol, decay=0.06, sustain=0.2), self.main.t(bar, i / 4))
    def snare_roll(self, start, bars, vol=0.28):
        steps = int(bars * 16)
        for i in range(steps):
            frac = i / steps
            if frac < 0.5 and i % 2: continue
            self.main.add(clap(vol * (0.35 + 0.65 * frac), seed=300 + i), start + i * self.beat / 4)
    def groove(self, bar, full=True, closed16=None):
        self.kick(bar); self.hats(bar, closed16=full if closed16 is None else closed16); self.claps(bar); self.bass(bar); self.arp(bar, 0.04)
        (self.chords if full else self.pad)(bar)


def pump_mix(main, sc, kick_times, depth=0.65, release=0.11):
    """Duck `sc` after every kick, then add it into `main`."""
    tt = np.arange(len(sc.buf)) / SR
    last = np.full(len(tt), -10.0)
    for k in sorted(kick_times): last[tt >= k] = k
    main.buf += sc.buf * (1 - depth * np.exp(-(tt - last) / release))
