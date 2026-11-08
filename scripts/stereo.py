"""Stereo song buffer for richer productions: per-voice pan, loop wrap, stereo reverb send, ping-pong delay,
sidechain bus, two-pass loudnorm. Mono instruments from chiptune.py / hyper.py plug straight in."""
import json, subprocess, tempfile, wave
from pathlib import Path
import numpy as np

SR = 44100

class StereoSong:
    def __init__(self, bpm, bars):
        self.bpm, self.beat = bpm, 60 / bpm
        self.bar = 4 * self.beat
        self.n = int(round(bars * self.bar * SR))
        self.buses = {}                                   # name -> (2, n) array

    def bus(self, name):
        if name not in self.buses: self.buses[name] = np.zeros((2, self.n))
        return self.buses[name]

    def add(self, sig, at, pan=0.0, bus="main", gain=1.0):
        """equal-power pan: -1 left … +1 right; wraps past the end (seamless loop)"""
        b = self.bus(bus); i = int(round(at * SR))
        idx = (i + np.arange(len(sig))) % self.n
        a = (pan + 1) * np.pi / 4
        np.add.at(b[0], idx, sig * np.cos(a) * gain); np.add.at(b[1], idx, sig * np.sin(a) * gain)

    def sidechain(self, name, kicks, depth=0.6, release=0.13):
        t = np.arange(self.n) / SR; last = np.full(self.n, -10.0)
        for k in sorted(kicks): last[t >= k] = k
        self.bus(name)[:] *= 1 - depth * np.exp(-(t - last) / release)

    def delay(self, name, time, fb=0.35, mix=0.25):
        """ping-pong delay on a bus (loop-wrapped)"""
        b = self.bus(name); d = int(time * SR); out = np.zeros_like(b); x = b.copy()
        for k in range(1, 6):
            g = mix * fb ** (k - 1)
            ch = k % 2
            out[ch] += np.roll(x[0] + x[1], d * k) * 0.5 * g
        b += out

    def reverb(self, name, wet=0.2, decay=1.6, seed=11):
        b = self.bus(name); n = int(decay * 1.5 * SR); t = np.arange(n) / SR
        for ch in range(2):
            rng = np.random.default_rng(seed + ch)
            ir = rng.standard_normal(n) * np.exp(-t * 6.9 / decay); ir = np.convolve(ir, np.ones(10) / 10, mode="same")
            ir = np.concatenate([np.zeros(int(0.02 * SR)), ir]); ir /= np.sqrt(np.sum(ir ** 2))
            L = self.n + len(ir)
            y = np.fft.irfft(np.fft.rfft(b[ch], L) * np.fft.rfft(ir, L), L)
            tail = y[self.n:]; y = y[:self.n].copy(); y[:len(tail)] += tail[:self.n]
            b[ch] = b[ch] + wet * y * (np.std(b[ch]) / (np.std(y) + 1e-9))

    def mix(self, gains=None):
        out = np.zeros((2, self.n))
        for k, v in self.buses.items(): out += v * (gains or {}).get(k, 1.0)
        return out

    def save(self, path, lufs=-14, gains=None):
        x = self.mix(gains); x = np.tanh(x / (np.max(np.abs(x)) + 1e-9) * 1.1) * 0.85
        pcm = (x.T * 32767).astype(np.int16)
        tmp = Path(tempfile.mkdtemp()) / "raw.wav"
        with wave.open(str(tmp), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(tmp), "-af", f"loudnorm=I={lufs}:TP=-1.0:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
        m = json.loads(r.stderr[r.stderr.rindex("{"):])
        af = (f"loudnorm=I={lufs}:TP=-1.0:LRA=11:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
        subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(tmp), "-af", af, "-ar", "48000", "-t", f"{self.n / SR:.6f}", str(path)], check=True)
        print("Saved", path)
