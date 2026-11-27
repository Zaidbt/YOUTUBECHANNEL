"""Video 045 · 1 ball vs a heart of bricks — every brick it breaks = +1 ball (numba physics).
Writes sim.pkl (per-frame balls + brick alive mask), events.json (brick breaks), meta.json."""
import json, math, pickle
from pathlib import Path
import numpy as np
from numba import njit

OUT = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 60
BPM = 132; BEAT = 60 / BPM; BAR = 4 * BEAT
D = 24 * BAR                          # 43.6 s
LAUNCH = 2 * BAR                      # 3.64 s: the ball launches after the hook
AX0, AX1, AY0, AY1 = 70.0, 1010.0, 560.0, 1780.0   # arena
BR = 7.0
SPEED = 520.0
CAP = 450
COLS, ROWS = 30, 26
BW, BH = (AX1 - AX0 - 40) / COLS, 20.0
BX0, BY0 = AX0 + 20, 640.0

def heart_mask():
    m = np.zeros((ROWS, COLS), bool)
    for r in range(ROWS):
        for c in range(COLS):
            x = (c + 0.5 - COLS / 2) / (COLS / 2) * 1.25; y = -(r + 0.5 - ROWS * 0.45) / (ROWS / 2) * 1.25
            if (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0: m[r, c] = True
    return m
MASK = heart_mask()
def depth_map():
    # distance (in bricks) from the outside of the heart
    d = np.where(MASK, 999, 0).astype(float)
    for _ in range(40):
        p = np.pad(d, 1); d = np.where(MASK, np.minimum(d, 1 + np.minimum.reduce([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]])), 0)
    return d
DEPTH = depth_map()
import os
HPK = float(os.environ.get("HPK", "0.5"))
HP0 = np.where(MASK, 1 + np.floor(HPK * (DEPTH - 1) ** 1.5), 0).astype(np.int64)

@njit(cache=True)
def step(pos, vel, n, alive, dt, hits):
    nh = 0
    for i in range(n):
        x = pos[i, 0] + vel[i, 0] * dt; y = pos[i, 1] + vel[i, 1] * dt
        if x < AX0 + BR: x = AX0 + BR; vel[i, 0] = abs(vel[i, 0])
        if x > AX1 - BR: x = AX1 - BR; vel[i, 0] = -abs(vel[i, 0])
        if y < AY0 + BR: y = AY0 + BR; vel[i, 1] = abs(vel[i, 1])
        if y > AY1 - BR: y = AY1 - BR; vel[i, 1] = -abs(vel[i, 1])
        c = int((x - BX0) / BW); r = int((y - BY0) / BH)
        done = False
        for rr in range(r - 1, r + 2):
            if done: break
            for cc in range(c - 1, c + 2):
                if rr < 0 or cc < 0 or rr >= ROWS or cc >= COLS or alive[rr, cc] <= 0: continue
                bx0 = BX0 + cc * BW + 1; bx1 = bx0 + BW - 2; by0 = BY0 + rr * BH + 1; by1 = by0 + BH - 2
                qx = min(max(x, bx0), bx1); qy = min(max(y, by0), by1)
                dx = x - qx; dy = y - qy
                if dx * dx + dy * dy < BR * BR:
                    if abs(dx) > abs(dy): vel[i, 0] = abs(vel[i, 0]) if dx > 0 else -abs(vel[i, 0])
                    else: vel[i, 1] = abs(vel[i, 1]) if dy > 0 else -abs(vel[i, 1])
                    alive[rr, cc] -= 1
                    if alive[rr, cc] == 0 and nh < hits.shape[0]: hits[nh, 0] = rr; hits[nh, 1] = cc; hits[nh, 2] = i; nh += 1
                    done = True; break
        pos[i, 0] = x; pos[i, 1] = y
    return nh

def run():
    rng = np.random.default_rng(45)
    alive = HP0.copy(); total = int(MASK.sum())
    pos = np.zeros((CAP + 8, 2)); vel = np.zeros((CAP + 8, 2)); born = np.zeros(CAP + 8)
    pos[0] = (540, 1700); a = math.radians(-84); vel[0] = (SPEED * math.cos(a), SPEED * math.sin(a)); n = 1
    hits = np.zeros((512, 3), np.int64)
    frames, events = [], []; clear_t = None
    SUB = 6; dt = 1 / (FPS * SUB); nf = int(round(D * FPS))
    for f in range(nf):
        t = f / FPS
        if t >= LAUNCH and clear_t is None:
            for s in range(SUB):
                ts = t + s * dt
                nh = step(pos, vel, n, alive, dt, hits)
                for k in range(nh):
                    rr, cc, i = hits[k]
                    events.append((round(ts, 4), int(rr), int(cc)))
                    if n < CAP:
                        ang = rng.uniform(0, 2 * math.pi); pos[n] = (BX0 + (cc + 0.5) * BW, BY0 + (rr + 0.5) * BH)
                        vel[n] = (SPEED * math.cos(ang), SPEED * math.sin(ang)); born[n] = ts; n += 1
                if not (alive > 0).any() and clear_t is None: clear_t = ts; break
        frames.append((pos[:n].astype(np.float32).copy(), born[:n].astype(np.float32).copy(), alive.copy()))
        if f % 300 == 0: print(f"t={t:5.1f} balls={n} bricks={int((alive > 0).sum())}/{total}", flush=True)
    return frames, events, clear_t, total

if __name__ == "__main__":
    frames, events, clear_t, total = run()
    with open(OUT / "sim.pkl", "wb") as fh: pickle.dump(frames, fh)
    (OUT / "events.json").write_text(json.dumps(events))
    (OUT / "meta.json").write_text(json.dumps({"clear": clear_t, "total": total, "D": D, "launch": LAUNCH, "hp0": HP0.tolist()}))
    print("clear at", clear_t, "bricks", total)
