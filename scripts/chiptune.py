"""Tiny NES-style chiptune synth: pulse, triangle, noise channels + drums.

Import it from a song script:  from chiptune import Song
All sounds are synthesized from scratch, so the music is 100% original and royalty-free.
"""
import numpy as np, subprocess, tempfile, wave
from pathlib import Path

SR = 44100

def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

def _env(n, attack=0.003, release=0.03, decay=None, sustain=1.0):
    t = np.arange(n) / SR
    e = np.ones(n)
    a = max(1, int(attack * SR)); e[:a] = np.linspace(0, 1, a)
    if decay:
        e *= sustain + (1 - sustain) * np.exp(-t / decay)
    r = min(n, max(1, int(release * SR))); e[-r:] *= np.linspace(1, 0, r)
    return e

def pulse(midi, dur, duty=0.5, vol=0.3, decay=None, sustain=1.0, vibrato=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(midi) * (1 + vibrato * np.sin(2 * np.pi * 6 * t) * np.clip(t * 4 - 0.5, 0, 1))
    ph = np.cumsum(f) / SR % 1
    return np.where(ph < duty, 1.0, -1.0) * vol * _env(n, decay=decay, sustain=sustain)

def tri(midi, dur, vol=0.5, decay=None, sustain=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    x = 2 * np.abs(2 * (hz(midi) * t % 1) - 1) - 1
    x = np.round(x * 7.5) / 7.5  # 4-bit stepped triangle like the NES
    return x * vol * _env(n, decay=decay, sustain=sustain)

def noise(dur, vol=0.3, decay=0.05, rate=11025, seed=0):
    n = int(dur * SR); rng = np.random.default_rng(seed)
    hold = max(1, SR // rate)
    x = np.repeat(rng.choice([-1.0, 1.0], n // hold + 1), hold)[:n]
    return x * vol * np.exp(-np.arange(n) / SR / decay)

def sweep(f0, f1, dur, duty=0.5, vol=0.3, curve=2.0):
    """Pitch glide (risers, revs, zaps)."""
    n = int(dur * SR); s = np.linspace(0, 1, n) ** curve
    f = f0 * (f1 / f0) ** s
    ph = np.cumsum(f) / SR % 1
    return np.where(ph < duty, 1.0, -1.0) * vol * _env(n)

def mix(*sigs):
    """Sum signals of different lengths."""
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs: out[:len(x)] += x
    return out

def kick(vol=0.9):
    n = int(0.16 * SR); t = np.arange(n) / SR
    f = 40 + 140 * np.exp(-t / 0.025)
    x = 2 * np.abs(2 * (np.cumsum(f) / SR % 1) - 1) - 1
    return np.round(x * 7.5) / 7.5 * vol * np.exp(-t / 0.07)

def snare(vol=0.5, seed=1):
    return mix(noise(0.18, vol, 0.06, rate=22050, seed=seed), tri(55, 0.06, vol * 0.6, decay=0.03))

def hat(vol=0.18, open_=False, seed=2):
    x = noise(0.25 if open_ else 0.05, vol, 0.09 if open_ else 0.012, rate=44100, seed=seed)
    return np.diff(x, prepend=0)  # crude high-pass

def crash(vol=0.4, seed=3):
    return np.diff(noise(1.6, vol, 0.45, rate=44100, seed=seed), prepend=0)

def boom(vol=0.9, seed=4):
    """Explosion: low noise burst + dropping kick."""
    return mix(noise(0.9, vol * 0.8, 0.25, rate=4000, seed=seed), kick(vol))


class Song:
    def __init__(self, bpm, bars, tail=1.5):
        self.bpm, self.beat = bpm, 60 / bpm
        self.bar = 4 * self.beat
        self.buf = np.zeros(int((bars * self.bar + tail) * SR))

    def t(self, bar, beat=0.0):
        """Time in seconds of (bar, beat), both 0-based; beat may be fractional."""
        return bar * self.bar + beat * self.beat

    def add(self, sig, at):
        i = int(at * SR)
        if i >= len(self.buf): return
        sig = sig[: len(self.buf) - i]
        self.buf[i:i + len(sig)] += sig

    def tape_stop(self, start, dur, end_rate=0.12):
        """Slow the already-mixed audio down like a tape machine losing power."""
        a, n = int(start * SR), int(dur * SR)
        seg = self.buf[a:a + n].copy()
        rate = 1 - (1 - end_rate) * np.linspace(0, 1, n) ** 0.8
        pos = np.cumsum(rate)
        out = np.interp(pos, np.arange(n), seg) * np.clip(np.linspace(1.6, 0, n), 0, 1)
        self.buf[a:a + n] = out

    def save(self, path, lufs=-14):
        x = self.buf / (np.max(np.abs(self.buf)) + 1e-9) * 0.8
        pcm = (x * 32767).astype(np.int16)
        tmp = Path(tempfile.mkdtemp()) / "raw.wav"
        with wave.open(str(tmp), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(tmp),
                        "-af", f"loudnorm=I={lufs}:TP=-1.0:LRA=9", "-ar", "48000", "-ac", "2", str(path)], check=True)
        print("Saved", path)
