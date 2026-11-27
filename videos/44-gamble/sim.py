"""Video 044 · STEADY ×1.5 vs GAMBLER (coin flip: ×3 or ÷2) — pick a side.
Both start with 100 balls, 12 floors (HP ×1.5 per floor). The gambler gets 6 heads and 6 tails — perfectly average
luck — yet ends far behind: 3 × ½ = 1.5 per PAIR of flips, but the steady side gets 1.5 per flip (volatility drag:
the typical outcome of a ×3/÷2 coin is √1.5 ≈ ×1.22 per flip).
Writes timeline.json, frames.pkl (per-frame particle positions), events.json."""
import json, pickle
from pathlib import Path
import numpy as np

OUT = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 60
BPM = 128; BEAT = 60 / BPM; BAR = 4 * BEAT
D = 26 * BAR                       # 48.75 s
START = 5.6
FLOORS = 12; G = 1.5
FLIPS = "HHTHHTTTHTHT"
assert FLIPS.count("H") == FLIPS.count("T") == 6
LANES = [dict(name="S", n0=100, x0=40, x1=520), dict(name="G", n0=100, x0=560, x1=1040)]
TOP, BOTTOM = 700.0, 1780.0
FY = [TOP + 50 + k * (BOTTOM - TOP - 50) / FLOORS for k in range(FLOORS)]
HP_UNIT = None
CAP = 900; BR = 7.0

def mult(name, k): return 1.5 if name == "S" else (3.0 if FLIPS[k] == "H" else 0.5)

def timeline():
    # HP so that the steady lane breaks one floor every RACE/FLOORS seconds
    RACE = 34.0; hp = [G ** k for k in range(FLOORS)]
    rate = sum(h / (100 * 1.5 ** k) for k, h in enumerate(hp)) / RACE      # damage per ball per second (normalised)
    HPd = [round(150 * h) for h in hp]                                      # displayed HP
    rate *= 150
    TL = {}
    for ln in LANES:
        t = START; c = float(ln["n0"]); arr, brk, cnt = [], [], []
        for k in range(FLOORS):
            arr.append(t); cnt.append(c); t += HPd[k] / (c * rate); brk.append(t); c *= mult(ln["name"], k)
        TL[ln["name"]] = dict(arrive=arr, brk=brk, count=cnt, final=c, finish=brk[-1])
    return TL, HPd, rate

def run():
    rng = np.random.default_rng(44)
    TL, HPd, rate = timeline()
    st = {}
    for ln in LANES:
        n = ln["n0"]
        st[ln["name"]] = dict(x=rng.uniform(ln["x0"] + 24, ln["x1"] - 24, n), y=FY[0] - BR - rng.uniform(0, 80, n), vx=rng.uniform(-90, 90, n),
                              vy=rng.uniform(-200, 50, n), kick=rng.uniform(280, 460, n), floor=0)
    frames, events = [], []
    nf = int(round(D * FPS)); SUB = 4; dt = 1 / (FPS * SUB)
    for f in range(nf):
        t = f / FPS; snap = {}
        for ln in LANES:
            nm = ln["name"]; s = st[nm]; tl = TL[nm]
            for sub in range(SUB):
                ts = t + sub * dt
                while s["floor"] < FLOORS and ts >= tl["brk"][s["floor"]]:
                    k = s["floor"]; events.append((round(ts, 4), "break", nm, k)); s["floor"] += 1
                    target = min(CAP, int(round(tl["count"][k] * mult(nm, k)))); n = len(s["x"])
                    if target > n:
                        idx = rng.integers(0, n, target - n)
                        for key, jitter in (("x", 3), ("y", 0)): s[key] = np.concatenate([s[key], s[key][idx] + rng.normal(0, jitter + 1e-9, target - n)])
                        s["vx"] = np.concatenate([s["vx"], rng.uniform(-170, 170, target - n)]); s["vy"] = np.concatenate([s["vy"], s["vy"][idx] - rng.uniform(0, 80, target - n)])
                        s["kick"] = np.concatenate([s["kick"], rng.uniform(280, 460, target - n)])
                    elif target < n:                                  # the coin took half: those balls pop
                        keep = rng.permutation(n)[:target]
                        gone = np.setdiff1d(np.arange(n), keep)
                        events.append((round(ts, 4), "pop", nm, [[float(s["x"][i]), float(s["y"][i])] for i in gone[:400]]))
                        for key in ("x", "y", "vx", "vy", "kick"): s[key] = s[key][keep]
                fy = FY[s["floor"]] if s["floor"] < FLOORS else 1e9
                s["vy"] += 2200 * dt; s["x"] += s["vx"] * dt; s["y"] += s["vy"] * dt
                lo, hi = ln["x0"] + BR + 10, ln["x1"] - BR - 10
                m = s["x"] < lo; s["x"][m] = lo; s["vx"][m] = np.abs(s["vx"][m])
                m = s["x"] > hi; s["x"][m] = hi; s["vx"][m] = -np.abs(s["vx"][m])
                hit = (s["y"] > fy - BR) & (s["vy"] > 0)
                if hit.any():
                    s["y"][hit] = fy - BR; s["vy"][hit] = -s["kick"][hit] * (0.8 + 0.4 * rng.random(hit.sum())); s["vx"][hit] += rng.normal(0, 40, hit.sum())
                    if ts >= START:
                        for i in np.nonzero(hit)[0][:2]: events.append((round(ts, 4), "bounce", nm, float(s["x"][i])))
            snap[nm] = np.stack([s["x"], s["y"]], 1).astype(np.float32)
        frames.append(snap)
    return TL, HPd, rate, frames, events

if __name__ == "__main__":
    TL, HPd, rate, frames, events = run()
    (OUT / "timeline.json").write_text(json.dumps({"TL": TL, "FY": FY, "HP": HPd, "RATE": rate, "D": D, "START": START, "FLIPS": FLIPS}))
    with open(OUT / "frames.pkl", "wb") as fh: pickle.dump(frames, fh)
    (OUT / "events.json").write_text(json.dumps(events))
    for k, v in TL.items(): print(k, [round(b, 1) for b in v["brk"]], "final", round(v["final"]))
