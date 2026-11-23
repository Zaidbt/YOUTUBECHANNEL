"""Video 038 · "1 ball. 1 rule." — a satisfying generative physics simulation (original concept).
A circular arena, a spinning gear with two C-shaped arms. RULE: every ball that touches the gear splits in two.
Starts with ONE ball; a big counter + timer; colour lineages (a split keeps its colour, sometimes mutates) spread into
territories; when the arena is full it bursts and everything restarts from one ball (seamless loop).
Outputs: frames (skia) → frames/ , events.json (splits + bounces for the music), then build.py makes the music.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from numba import njit

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 60
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
D = 22 * BAR                     # 44.0 s
FULL_T = 20 * BAR                # 40.0 s: the arena is full
CX, CY, RA = 540.0, 1080.0, 470.0
BR = 7.0                          # ball radius
GR = 60.0                         # gear radius (tooth tips at GR + 9)
NMAX = 3600
SUB = 4
DT = 1.0 / (FPS * SUB)
V0 = 430.0
OMEGA = 2 * math.pi * 7 / D      # gear: 7 turns per loop (periodic)
ARM_R, ARM_RAD, ARM_SPAN = 120.0, 215.0, math.radians(200)
P0 = (CX + 180.0, CY - 260.0); V0VEC = (-260.0, 340.0)

WAVE_HUES = [0.55, 0.92, 0.13, 0.78, 0.33, 0.02, 0.62, 0.45, 0.85, 0.18]

def target(t):                    # pacing curve: count allowed at time t (1 → NMAX at FULL_T)
    u = min(1.0, max(0.0, t / FULL_T))
    return 1 + (NMAX - 1) * (math.exp(5.2 * u ** 1.15) - 1) / (math.exp(5.2) - 1)

@njit(cache=True)
def arm_segments(theta):
    """two C-arms as polylines (n segments each), attached to the gear, rotating with it"""
    n = 24
    segs = np.zeros((2 * n, 4))
    for a in range(2):
        base = theta + a * math.pi
        acx = CX + ARM_R * math.cos(base); acy = CY + ARM_R * math.sin(base)
        start = base + math.pi - ARM_SPAN / 2
        for i in range(n):
            a0 = start + ARM_SPAN * i / n; a1 = start + ARM_SPAN * (i + 1) / n
            segs[a * n + i, 0] = acx + ARM_RAD * math.cos(a0); segs[a * n + i, 1] = acy + ARM_RAD * math.sin(a0)
            segs[a * n + i, 2] = acx + ARM_RAD * math.cos(a1); segs[a * n + i, 3] = acy + ARM_RAD * math.sin(a1)
    return segs

@njit(cache=True)
def step(pos, vel, n, theta, segs, cool, hits):
    """one substep: move, walls, gear, arms, ball-ball (grid). returns number of gear touches recorded in hits[]"""
    nh = 0
    for i in range(n):
        pos[i, 0] += vel[i, 0] * DT; pos[i, 1] += vel[i, 1] * DT
        if cool[i] > 0: cool[i] -= DT
        # arena wall
        dx = pos[i, 0] - CX; dy = pos[i, 1] - CY; d = math.sqrt(dx * dx + dy * dy)
        if d > RA - BR:
            nx = dx / d; ny = dy / d
            pos[i, 0] = CX + nx * (RA - BR); pos[i, 1] = CY + ny * (RA - BR)
            vn = vel[i, 0] * nx + vel[i, 1] * ny
            if vn > 0: vel[i, 0] -= 2 * vn * nx; vel[i, 1] -= 2 * vn * ny
        # gear (a disc; teeth add a tangential kick)
        if d < GR + 9 + BR:
            nx = dx / max(d, 1e-6); ny = dy / max(d, 1e-6)
            pos[i, 0] = CX + nx * (GR + 9 + BR); pos[i, 1] = CY + ny * (GR + 9 + BR)
            vn = vel[i, 0] * nx + vel[i, 1] * ny
            if vn < 0: vel[i, 0] -= 2 * vn * nx; vel[i, 1] -= 2 * vn * ny
            vel[i, 0] += -ny * OMEGA * 60; vel[i, 1] += nx * OMEGA * 60
            if cool[i] <= 0 and nh < hits.shape[0]:
                hits[nh] = i; nh += 1
        # arms
        for s in range(segs.shape[0]):
            ax = segs[s, 0]; ay = segs[s, 1]; bx = segs[s, 2]; by = segs[s, 3]
            ex = bx - ax; ey = by - ay; L2 = ex * ex + ey * ey
            u = ((pos[i, 0] - ax) * ex + (pos[i, 1] - ay) * ey) / L2
            u = min(1.0, max(0.0, u))
            qx = ax + u * ex; qy = ay + u * ey
            rx = pos[i, 0] - qx; ry = pos[i, 1] - qy; rd = math.sqrt(rx * rx + ry * ry)
            if rd < BR + 6 and rd > 1e-6:
                nx = rx / rd; ny = ry / rd
                pos[i, 0] = qx + nx * (BR + 6); pos[i, 1] = qy + ny * (BR + 6)
                vn = vel[i, 0] * nx + vel[i, 1] * ny
                if vn < 0: vel[i, 0] -= 2 * vn * nx; vel[i, 1] -= 2 * vn * ny
                if cool[i] <= 0 and nh < hits.shape[0]:
                    hits[nh] = i; nh += 1; cool[i] = 0.05
        # keep speeds lively but bounded
        sp = math.sqrt(vel[i, 0] ** 2 + vel[i, 1] ** 2) + 1e-6
        k = 1.0 + 0.002 * (V0 / sp - 1.0)
        vel[i, 0] *= k; vel[i, 1] *= k
    # ball-ball collisions via a uniform grid
    cs = 2 * BR; gw = int(2 * RA / cs) + 2
    head = -np.ones(gw * gw, np.int64); nxt = -np.ones(n, np.int64)
    for i in range(n):
        gx = int((pos[i, 0] - CX + RA) / cs); gy = int((pos[i, 1] - CY + RA) / cs)
        gx = min(gw - 1, max(0, gx)); gy = min(gw - 1, max(0, gy))
        c = gy * gw + gx; nxt[i] = head[c]; head[c] = i
    for i in range(n):
        gx = int((pos[i, 0] - CX + RA) / cs); gy = int((pos[i, 1] - CY + RA) / cs)
        for oy in range(-1, 2):
            for ox in range(-1, 2):
                x2 = gx + ox; y2 = gy + oy
                if x2 < 0 or y2 < 0 or x2 >= gw or y2 >= gw: continue
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
                                vel[i, 0] += rv * nx; vel[i, 1] += rv * ny
                                vel[j, 0] -= rv * nx; vel[j, 1] -= rv * ny
                    j = nxt[j]
    return nh

def run():
    rng = np.random.default_rng(38)
    pos = np.zeros((NMAX + 8, 2)); vel = np.zeros((NMAX + 8, 2)); cool = np.zeros(NMAX + 8)
    hue = np.zeros(NMAX + 8); born = np.zeros(NMAX + 8)
    pos[0] = P0; vel[0] = V0VEC; hue[0] = 0.55; n = 1
    hits = np.zeros(4096, np.int64)
    frames = []; events = []
    nf = int(round(D * FPS)); full_frame = None
    for f in range(nf):
        t = f / FPS
        if t < FULL_T + 0.6:
            for s in range(SUB):
                ts = t + s * DT; theta = OMEGA * ts
                segs = arm_segments(theta)
                nh = step(pos, vel, n, theta, segs, cool, hits)
                for k in range(nh):
                    i = hits[k]
                    if n < NMAX and n < target(ts):
                        pos[n] = pos[i] + rng.normal(0, 1.5, 2); vel[n] = -vel[i] * 0.9 + rng.normal(0, 60, 2)
                        h = WAVE_HUES[int(ts / (2 * BAR)) % len(WAVE_HUES)]
                        hue[n] = h; born[n] = ts; cool[i] = 0.45; cool[n] = 0.45; n += 1
                        events.append((round(ts, 4), "split", float(h), float(pos[i, 0])))
                    else:
                        cool[i] = 0.2
            if n >= NMAX and full_frame is None: full_frame = f
        frames.append((pos[:n].astype(np.float32).copy(), hue[:n].astype(np.float32).copy(), born[:n].astype(np.float32).copy()))
        if f % 300 == 0: print(f"t={t:5.1f}s balls={n}", flush=True)
    np.save(OUT / "frames_n.npy", np.array([len(x[0]) for x in frames]))
    return frames, events, full_frame

if __name__ == "__main__":
    import pickle
    frames, events, ff = run()
    with open(OUT / "sim.pkl", "wb") as fh: pickle.dump((frames, ff), fh)
    (OUT / "events.json").write_text(json.dumps({"events": events, "full_frame": ff, "D": D, "bpm": BPM}))
    print("full at frame", ff, "events", len(events))
