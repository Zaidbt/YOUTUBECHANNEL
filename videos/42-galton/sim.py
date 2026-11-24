"""Video 042 · "Pure chance draws a perfect curve" — a Galton board simulation (numba physics).
1,000 balls fall one by one through 13 rows of pegs into 14 bins; each bounce is random, the pile becomes a bell
curve. Then the trap door opens, everything drains, and it restarts (seamless loop).
Writes sim.pkl (per-frame positions, hues, peg flash times), events.json (peg hits, bin landings) for render.py/build.py.
"""
import json, math, pickle
from pathlib import Path
import numpy as np
from numba import njit

OUT = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 60
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
D = 22 * BAR                          # 44 s
T0, T1 = 0.6, 33.0                    # release window
REVEAL = 18 * BAR                     # 36 s: curve lights up
OPEN = 20 * BAR + BEAT                # 40.5 s: trap door
RESET = D - 0.5
N = 1500
BR = 6.0                              # ball radius
PR = 5.0                              # peg radius
ROWS = 13
CX = 540.0
PY0, PDY, PDX = 470.0, 48.0, 56.0
NB = ROWS + 2                         # 15 bins (walls sit right under the last row of pegs)
BIN_TOP = PY0 + (ROWS - 1) * PDY + 40  # 1086
FLOOR = 1780.0
SPAWN = (CX, 390.0)
G = 2300.0
SUB = 8
DT = 1.0 / (FPS * SUB)

def pegs():
    p = []
    for r in range(ROWS):
        for k in range(r + 2):
            p.append((CX + (k - (r + 1) / 2) * PDX, PY0 + r * PDY))
    return np.array(p)
PEGS = pegs()
WALLS = np.array([CX + (k - NB / 2) * PDX for k in range(NB + 1)])   # 16 walls: CX + (k-7.5)*56
SIDE_L, SIDE_R = WALLS[0], WALLS[-1]

def release_time(i):
    return T0 + (T1 - T0) * (i / (N - 1)) ** (1 / 1.7)

@njit(cache=True)
def step(pos, vel, act, n, pegs, walls, floor_on, seed, hits, nh_max, land, binned):
    nh = 0; nl = 0
    for i in range(n):
        if not act[i]: continue
        vel[i, 1] += G * DT
        pos[i, 0] += vel[i, 0] * DT; pos[i, 1] += vel[i, 1] * DT
        x = pos[i, 0]; y = pos[i, 1]
        # funnel above the pegs: keep near the centre
        if y < 440.0:
            lim = 18.0 + (440.0 - y) * 0.9
            if x < CX - lim: pos[i, 0] = CX - lim; vel[i, 0] = abs(vel[i, 0]) * 0.3
            if x > CX + lim: pos[i, 0] = CX + lim; vel[i, 0] = -abs(vel[i, 0]) * 0.3
        # pegs (only the row near y)
        r0 = int((y - PY0) / PDY + 0.5)
        for r in range(max(0, r0 - 1), min(ROWS, r0 + 2)):
            base = r * (r + 3) // 2
            for k in range(r + 2):
                px = pegs[base + k, 0]; py = pegs[base + k, 1]
                dx = pos[i, 0] - px; dy = pos[i, 1] - py; d2 = dx * dx + dy * dy
                if d2 < (BR + PR) ** 2 and d2 > 1e-9:
                    d = math.sqrt(d2); nx = dx / d; ny = dy / d
                    pos[i, 0] = px + nx * (BR + PR); pos[i, 1] = py + ny * (BR + PR)
                    vn = vel[i, 0] * nx + vel[i, 1] * ny
                    if vn < 0:
                        vel[i, 0] -= 1.27 * vn * nx; vel[i, 1] -= 1.27 * vn * ny
                        # a ball landing dead-centre on a peg tips left or right at random
                        h = math.sin(seed * 12.9898 + i * 78.233 + r * 37.719) * 43758.5453
                        h = h - math.floor(h)
                        vel[i, 0] += (h - 0.5) * 60.0
                        if abs(nx) < 0.25: vel[i, 0] += (1 if h > 0.5 else -1) * 90.0
                        vel[i, 0] *= 0.82
                        if vel[i, 0] > 150.0: vel[i, 0] = 150.0
                        if vel[i, 0] < -150.0: vel[i, 0] = -150.0
                        if -vn > 120 and nh < nh_max:
                            hits[nh, 0] = base + k; hits[nh, 1] = -vn; hits[nh, 2] = i; nh += 1
        # terminal speed in the peg field (like a real board)
        if pos[i, 1] < BIN_TOP and vel[i, 1] > 430.0: vel[i, 1] = 430.0
        # side walls of the board
        if pos[i, 1] > 430.0:
            if pos[i, 0] < SIDE_L + BR: pos[i, 0] = SIDE_L + BR; vel[i, 0] = abs(vel[i, 0]) * 0.3
            if pos[i, 0] > SIDE_R - BR: pos[i, 0] = SIDE_R - BR; vel[i, 0] = -abs(vel[i, 0]) * 0.3
        # bin walls
        if pos[i, 1] > BIN_TOP:
            if binned[i] < 0:
                b = int((pos[i, 0] - walls[0]) / PDX)
                b = min(NB - 1, max(0, b)); binned[i] = b
                land[nl] = i; nl += 1
            b = binned[i]
            lo = walls[b] + BR + 1.5; hi = walls[b + 1] - BR - 1.5
            if pos[i, 0] < lo: pos[i, 0] = lo; vel[i, 0] = abs(vel[i, 0]) * 0.2
            if pos[i, 0] > hi: pos[i, 0] = hi; vel[i, 0] = -abs(vel[i, 0]) * 0.2
            vel[i, 0] *= 0.995
        # floor
        if floor_on and pos[i, 1] > FLOOR - BR:
            pos[i, 1] = FLOOR - BR
            if vel[i, 1] > 0: vel[i, 1] *= -0.15
            vel[i, 0] *= 0.9
        if pos[i, 1] > H + 60: act[i] = False
    # ball-ball (grid), 2 passes
    cs = 2 * BR; gw = int(W / cs) + 2; gh = int(H / cs) + 4
    for it in range(2):
        head = -np.ones(gw * gh, np.int64); nxt = -np.ones(n, np.int64)
        for i in range(n):
            if not act[i] or pos[i, 1] < BIN_TOP - 30: continue
            gx = min(gw - 1, max(0, int(pos[i, 0] / cs))); gy = min(gh - 1, max(0, int(pos[i, 1] / cs)))
            c = gy * gw + gx; nxt[i] = head[c]; head[c] = i
        for i in range(n):
            if not act[i] or pos[i, 1] < BIN_TOP - 30: continue
            gx = int(pos[i, 0] / cs); gy = int(pos[i, 1] / cs)
            for oy in range(-1, 2):
                for ox in range(-1, 2):
                    x2 = gx + ox; y2 = gy + oy
                    if x2 < 0 or y2 < 0 or x2 >= gw or y2 >= gh: continue
                    j = head[y2 * gw + x2]
                    while j != -1:
                        if j > i:
                            dx = pos[j, 0] - pos[i, 0]; dy = pos[j, 1] - pos[i, 1]; d2 = dx * dx + dy * dy
                            if d2 < 4 * BR * BR and d2 > 1e-9:
                                d = math.sqrt(d2); nx = dx / d; ny = dy / d; ov = 2 * BR - d
                                pos[i, 0] -= nx * ov * 0.5; pos[i, 1] -= ny * ov * 0.5
                                pos[j, 0] += nx * ov * 0.5; pos[j, 1] += ny * ov * 0.5
                                rv = (vel[j, 0] - vel[i, 0]) * nx + (vel[j, 1] - vel[i, 1]) * ny
                                if rv < 0:
                                    imp = -0.55 * rv
                                    vel[i, 0] -= imp * nx; vel[i, 1] -= imp * ny
                                    vel[j, 0] += imp * nx; vel[j, 1] += imp * ny
                        j = nxt[j]
    return nh, nl

def run():
    rel = np.array([release_time(i) for i in range(N)])
    pos = np.zeros((N, 2)); vel = np.zeros((N, 2)); act = np.zeros(N, np.bool_); binned = -np.ones(N, np.int64)
    rng = np.random.default_rng(42)
    hits = np.zeros((4096, 3)); land = np.zeros(4096, np.int64)
    peg_last = np.full(len(PEGS), -9.0)
    frames = []; ev_hits = []; ev_land = []
    n = 0; nf = int(round(D * FPS))
    for f in range(nf):
        t = f / FPS
        for s in range(SUB):
            ts = t + s * DT
            while n < N and rel[n] <= ts:
                pos[n] = (SPAWN[0] + rng.uniform(-1.5, 1.5), SPAWN[1]); vel[n] = (rng.uniform(-8, 8), 0.0); act[n] = True; n += 1
            nh, nl = step(pos, vel, act, n, PEGS, WALLS, ts < OPEN, f * SUB + s, hits, 4096, land, binned)
            for k in range(nh):
                p = int(hits[k, 0]); peg_last[p] = ts; ev_hits.append((round(ts, 4), p, float(hits[k, 1])))
            for k in range(nl):
                i = int(land[k]); ev_land.append((round(ts, 4), int(binned[i])))
        frames.append((pos[:n].astype(np.float32).copy(), act[:n].copy(), peg_last.astype(np.float32).copy()))
        if f % 300 == 0: print(f"t={t:5.1f} released={n} active={int(act[:n].sum())}", flush=True)
    counts = np.bincount(binned[binned >= 0], minlength=NB)
    return frames, ev_hits, ev_land, counts, rel

if __name__ == "__main__":
    frames, hits, lands, counts, rel = run()
    with open(OUT / "sim.pkl", "wb") as fh: pickle.dump((frames, counts, rel), fh)
    (OUT / "events.json").write_text(json.dumps({"hits": hits, "lands": lands, "counts": counts.tolist()}))
    print("bins:", counts.tolist(), "hits", len(hits))
