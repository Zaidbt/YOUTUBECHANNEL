"""Video 043 · "1 ball ×3 vs 100 balls ×2 — who breaks through first?"
Two lanes, 20 floors each with the same HP (10 × 2.64^k). Every ball deals ~2.26 damage a second while bouncing on a
floor; when a floor breaks, the swarm falls to the next one and multiplies (left ×2, right ×3).
Maths: left per-floor time ∝ (2.64/2)^k (grows), right ∝ (2.64/3)^k (shrinks) → the left lane rockets ahead, then
grinds; the right lane crawls, then accelerates and passes on the very last floor.
Writes timeline.json + frames.pkl (per-frame particle positions per lane) + events.json (bounces, breaks)."""
import json, math, pickle
from pathlib import Path
import numpy as np

OUT = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 60
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
D = 24 * BAR                       # 48 s
FLOORS = 20; G = 2.64; H0 = 10.0; RATE = 2.26
START = 4.5                        # race starts after the pick-a-side intro + 3-2-1-GO countdown
TRAVEL = 0.14                      # fall time between floors
LANES = [dict(name="L", n0=100, mult=2, x0=40, x1=520), dict(name="R", n0=1, mult=3, x0=560, x1=1040)]
TOP, BOTTOM = 640.0, 1790.0
FY = [TOP + 40 + k * (BOTTOM - TOP - 40) / FLOORS for k in range(FLOORS)]   # floor y
EXIT_Y = BOTTOM + 30
HP = [H0 * G ** k for k in range(FLOORS)]
CAP = 800                          # max particles drawn per lane
BR = 5.0

def timeline(lane):
    t = START; c = lane["n0"]; arr, brk, cnt = [], [], []
    for k in range(FLOORS):
        arr.append(t); cnt.append(c)
        t += HP[k] / (c * RATE); brk.append(t); c *= lane["mult"]; t += TRAVEL
    return arr, brk, cnt, c

def run():
    rng = np.random.default_rng(43)
    TL = {}
    for ln in LANES:
        a, b, c, final = timeline(ln); TL[ln["name"]] = dict(arrive=a, brk=b, count=c, final=final, finish=b[-1])
    lanes_state = {}
    for ln in LANES:
        n = min(ln["n0"], CAP)
        x = rng.uniform(ln["x0"] + 20, ln["x1"] - 20, n); y = FY[0] - BR - rng.uniform(0, 60, n)
        vx = rng.uniform(-90, 90, n); vy = rng.uniform(-200, 50, n); kick = rng.uniform(260, 420, n)
        lanes_state[ln["name"]] = dict(x=x, y=y, vx=vx, vy=vy, kick=kick, floor=0, last_break=-1)
    frames, events = [], []
    nf = int(round(D * FPS)); SUB = 4; dt = 1 / (FPS * SUB)
    for f in range(nf):
        t = f / FPS; snap = {}
        for ln in LANES:
            nm = ln["name"]; s = lanes_state[nm]; tl = TL[nm]
            for sub in range(SUB):
                ts = t + sub * dt
                # floor breaks
                while s["floor"] < FLOORS and ts >= tl["brk"][s["floor"]]:
                    events.append((round(ts, 4), "break", nm, s["floor"]))
                    s["floor"] += 1
                    # multiply the visible swarm
                    n = len(s["x"]); want = min(CAP, n * ln["mult"]) if n < CAP else n
                    if want > n:
                        idx = rng.integers(0, n, want - n)
                        s["x"] = np.concatenate([s["x"], s["x"][idx] + rng.normal(0, 3, want - n)])
                        s["y"] = np.concatenate([s["y"], s["y"][idx]])
                        s["vx"] = np.concatenate([s["vx"], rng.uniform(-160, 160, want - n)])
                        s["vy"] = np.concatenate([s["vy"], s["vy"][idx] + rng.uniform(-60, 0, want - n)])
                        s["kick"] = np.concatenate([s["kick"], rng.uniform(260, 420, want - n)])
                fy = FY[s["floor"]] if s["floor"] < FLOORS else 1e9
                s["vy"] += 2200 * dt; s["x"] += s["vx"] * dt; s["y"] += s["vy"] * dt
                lo, hi = ln["x0"] + BR + 6, ln["x1"] - BR - 6
                m = s["x"] < lo; s["x"][m] = lo; s["vx"][m] = np.abs(s["vx"][m])
                m = s["x"] > hi; s["x"][m] = hi; s["vx"][m] = -np.abs(s["vx"][m])
                hit = (s["y"] > fy - BR) & (s["vy"] > 0)
                if hit.any():
                    s["y"][hit] = fy - BR; s["vy"][hit] = -s["kick"][hit] * (0.8 + 0.4 * rng.random(hit.sum()))
                    s["vx"][hit] += rng.normal(0, 40, hit.sum())
                    if ts >= START:
                        for i in np.nonzero(hit)[0][:3]: events.append((round(ts, 4), "bounce", nm, float(s["x"][i])))
                # balls that fall out of the bottom after the last floor are recycled at the exit (drawn as gone)
            snap[nm] = np.stack([s["x"], s["y"]], 1).astype(np.float32)
        frames.append(snap)
        if f % 300 == 0: print(f"t={t:5.1f} L floor {lanes_state['L']['floor']} R floor {lanes_state['R']['floor']}", flush=True)
    return TL, frames, events

if __name__ == "__main__":
    TL, frames, events = run()
    (OUT / "timeline.json").write_text(json.dumps({"TL": TL, "FY": FY, "HP": HP, "D": D, "START": START, "RATE": RATE}))
    with open(OUT / "frames.pkl", "wb") as fh: pickle.dump(frames, fh)
    (OUT / "events.json").write_text(json.dumps(events))
    for k, v in TL.items(): print(k, "finish", round(v["finish"], 2), "final count", v["final"])
