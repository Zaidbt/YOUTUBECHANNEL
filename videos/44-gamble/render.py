"""Render video 044 in a happy GAME look: sunny sky gradient + drifting clouds, chunky rounded panels with thick
dark outlines and drop shadows, candy-brick floors, glossy candy balls, Lilita One outlined text, a big spinning
coin for every gambler floor (HEADS ×3 gold / TAILS ÷2 red), stars + confetti. usage: render.py out.mp4 [f0 f1] | --still f.."""
import colorsys, json, math, pickle, subprocess, sys
from pathlib import Path
import numpy as np
import skia
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from sim import W, H, FPS, D, FLOORS, FY, START, LANES, TOP, BOTTOM, BR, BEAT, FLIPS, mult

TJ = json.loads((HERE / "timeline.json").read_text()); TL = TJ["TL"]; HP = TJ["HP"]; RATE = TJ["RATE"]
EV = json.loads((HERE / "events.json").read_text()); POPS = [e for e in EV if e[1] == "pop"]
frames = pickle.load(open(HERE / "frames.pkl", "rb")); NF = len(frames)
LIL = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/LilitaOne-Regular.ttf"))
INK = skia.ColorSetRGB(43, 35, 64)
COLS = {"S": ("#3fb8ff", "#1f6fd1", "#bfe8ff"), "G": ("#ff6fb1", "#d13f86", "#ffd0e6")}   # main, dark, light
WIN_T = TL["S"]["finish"] if TL["S"]["finish"] < TL["G"]["finish"] else TL["G"]["finish"]; WINNER = "S" if TL["S"]["finish"] < TL["G"]["finish"] else "G"
RESET0 = D - 2.6
def rgb(h): h = h.lstrip("#"); return skia.ColorSetRGB(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def backout(x):
    k = min(1, max(0, x)); c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2
SAMP = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
LW = 2 * math.pi / D

def candy(main, dark, light):
    S = 64; srf = skia.Surface(S, S); c = srf.getCanvas(); c.clear(skia.ColorTRANSPARENT)
    c.drawCircle(S / 2, S / 2, S / 2 - 1, skia.Paint(AntiAlias=True, Color=INK))
    p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeRadial(skia.Point(S * 0.4, S * 0.38), S * 0.55, [rgb(light), rgb(main), rgb(dark)], [0.0, 0.55, 1.0]))
    c.drawCircle(S / 2, S / 2, S / 2 - 6, p)
    c.drawOval(skia.Rect(S * 0.28, S * 0.2, S * 0.5, S * 0.34), skia.Paint(AntiAlias=True, Color=skia.Color4f(1, 1, 1, 0.85).toColor()))
    return srf.makeImageSnapshot()
BALL = {k: candy(*v) for k, v in COLS.items()}
BRICKS = ["#ff5a5f", "#ffb33f", "#ffe14a", "#5fd46a", "#3fb8ff", "#9b6bff"]
RNG = np.random.default_rng(3)
CLOUDS = [(RNG.uniform(-200, 1200), RNG.uniform(220, 620), RNG.uniform(0.7, 1.4), int(RNG.integers(1, 3))) for _ in range(6)]

def otext(c, s, x, y, size, fill, stroke=INK, sw=None, align="center", alpha=1.0, shadow=True):
    f = skia.Font(LIL, size); w = f.measureText(s); xx = x - w / 2 if align == "center" else (x - w if align == "right" else x)
    sw = sw if sw is not None else max(4, size * 0.12)
    if shadow:
        sp = skia.Paint(AntiAlias=True, Color=skia.Color4f(0.1, 0.07, 0.2, 0.35 * alpha).toColor()); c.drawString(s, xx + size * 0.04, y + size * 0.07, f, sp)
    st = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=sw, StrokeJoin=skia.Paint.kRound_Join, Color=stroke); st.setAlphaf(alpha); c.drawString(s, xx, y, f, st)
    fp = skia.Paint(AntiAlias=True, Color=fill); fp.setAlphaf(alpha); c.drawString(s, xx, y, f, fp)
    return w
def panel(c, r, fill, rad=26, sw=7, shadow=8):
    c.drawRoundRect(skia.Rect(r.left() + shadow * 0.5, r.top() + shadow, r.right() + shadow * 0.5, r.bottom() + shadow), rad, rad, skia.Paint(AntiAlias=True, Color=skia.Color4f(0.1, 0.07, 0.2, 0.25).toColor()))
    c.drawRoundRect(r, rad, rad, skia.Paint(AntiAlias=True, Color=fill))
    c.drawRoundRect(r, rad, rad, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=sw, Color=INK))
def fmt(n): return f"{int(round(n)):,}"

def lane_state(nm, t):
    tl = TL[nm]; k = sum(1 for b in tl["brk"] if b <= t)
    if k >= FLOORS: return FLOORS, 0.0, tl["final"]
    cnt = tl["count"][k]; dmg = max(0.0, t - tl["arrive"][k]) * cnt * RATE if t >= tl["arrive"][k] else 0.0
    return k, max(0.0, HP[k] - dmg), cnt
def reset_k(t, j): return 0.0 if t < RESET0 else ease((t - RESET0 - j * 0.06) / 0.45)

def draw_bg(c, t):
    p = skia.Paint(); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, 0), skia.Point(0, H)], [rgb("#7fd3ff"), rgb("#bfe9ff"), rgb("#ffe0f0")], [0, 0.5, 1])); c.drawRect(skia.Rect(0, 0, W, H), p)
    c.drawCircle(960, 140, 90, skia.Paint(AntiAlias=True, Color=rgb("#fff3a8"))); c.drawCircle(960, 140, 120, skia.Paint(AntiAlias=True, Color=skia.Color4f(1, 0.95, 0.6, 0.35).toColor()))
    for (x0, y, s, sp) in CLOUDS:
        x = (x0 + 1400 * sp * t / D) % 1500 - 200
        wp = skia.Paint(AntiAlias=True, Color=skia.Color4f(1, 1, 1, 0.9).toColor())
        for (dx, dy, r) in ((0, 0, 50), (55, -20, 62), (115, 0, 48), (60, 18, 52)): c.drawCircle(x + dx * s, y + dy * s, r * s, wp)

def draw_lane(c, ln, fi, t):
    nm = ln["name"]; x0, x1 = ln["x0"], ln["x1"]; main, dark, light = COLS[nm]; cx = (x0 + x1) / 2
    k, hp, cnt = lane_state(nm, t); resetting = t >= RESET0
    panel(c, skia.Rect(x0, TOP, x1, BOTTOM + 50), skia.Color4f(1, 1, 1, 0.55).toColor(), rad=34)
    for j in range(FLOORS):
        y = FY[j]
        if resetting:
            rk = reset_k(t, j)
            if rk <= 0: continue
            y = FY[j] - (1 - rk) * 1000
        elif j < k:
            age = t - TL[nm]["brk"][j]
            if age < 0.8:                                     # bricks fly apart
                for q in range(10):
                    bx = x0 + 22 + q * (x1 - x0 - 44) / 10; vx = (q - 4.5) * 60; vy = -250 - 60 * (q % 3)
                    px = bx + vx * age; py = y + vy * age + 1400 * age * age
                    c.save(); c.translate(px + 20, py); c.rotate((q - 4.5) * 90 * age)
                    pa = skia.Paint(AntiAlias=True, Color=rgb(BRICKS[(q + j) % 6])); c.drawRoundRect(skia.Rect(-20, -9, 20, 9), 5, 5, pa)
                    c.drawRoundRect(skia.Rect(-20, -9, 20, 9), 5, 5, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3, Color=INK)); c.restore()
            continue
        cur = j == k and not resetting
        nb = 10; bw = (x1 - x0 - 44) / nb
        for q in range(nb):
            r = skia.Rect(x0 + 22 + q * bw + 2, y, x0 + 22 + (q + 1) * bw - 2, y + 20)
            col = rgb(BRICKS[(q + j) % 6])
            if cur and hp < HP[j]: col = skia.Color4f(*[v / 255 for v in (skia.ColorGetR(col), skia.ColorGetG(col), skia.ColorGetB(col))], 1).toColor()
            c.drawRoundRect(r, 6, 6, skia.Paint(AntiAlias=True, Color=col))
            c.drawRoundRect(skia.Rect(r.left() + 4, r.top() + 3, r.right() - 4, r.top() + 7), 2, 2, skia.Paint(AntiAlias=True, Color=skia.Color4f(1, 1, 1, 0.5).toColor()))
            c.drawRoundRect(r, 6, 6, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3.5, Color=INK))
        if cur or j == 0 or (resetting and j == 0):
            val = hp if cur else HP[j]; lab = fmt(math.ceil(val))
            f = skia.Font(LIL, 34); w = f.measureText(lab) + 30
            panel(c, skia.Rect(cx - w / 2, y + 28, cx + w / 2, y + 72), skia.ColorWHITE, rad=20, sw=5, shadow=5)
            if cur:
                fill = hp / HP[j]
                c.drawRoundRect(skia.Rect(cx - w / 2 + 6, y + 64, cx - w / 2 + 6 + (w - 12) * fill, y + 68), 2, 2, skia.Paint(AntiAlias=True, Color=rgb("#5fd46a")))
            otext(c, lab, cx, y + 62, 34, INK, stroke=INK, sw=0.1, shadow=False)
    # goal flag strip
    gy = BOTTOM + 28
    for q in range(int((x1 - x0 - 30) / 22)):
        c.drawRect(skia.Rect(x0 + 15 + q * 22, gy, x0 + 26 + q * 22, gy + 11), skia.Paint(Color=INK if q % 2 == 0 else skia.ColorWHITE))
        c.drawRect(skia.Rect(x0 + 26 + q * 22, gy + 11, x0 + 37 + q * 22, gy + 22), skia.Paint(Color=INK if q % 2 == 0 else skia.ColorWHITE))
    # balls
    def balls(pos, a):
        p = skia.Paint(AntiAlias=True); p.setAlphaf(a); r = BR * 1.6
        for (x, y) in pos:
            if y > BOTTOM + 60: continue
            c.drawImageRect(BALL[nm], skia.Rect(x - r, y - r, x + r, y + r), SAMP, p)
    if not resetting: balls(frames[min(fi, NF - 1)][nm], 1.0)
    elif t < RESET0 + 0.3: balls(frames[min(fi, NF - 1)][nm], 1 - (t - RESET0) / 0.3)
    if resetting and t >= D - 0.6: balls(frames[0][nm], ease((t - D + 0.6) / 0.3))
    # popped balls (gambler losing half): little puffs
    for (tp, kind, pn, pts) in POPS:
        u = t - tp
        if pn == nm and 0 <= u < 0.45 and not resetting:
            for (x, y) in pts[:160]:
                c.drawCircle(x, y, BR * (1.2 + 2.5 * u), skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3, Color=skia.Color4f(1, 1, 1, 1 - u / 0.45).toColor()))

def coin(c, t):
    """the gambler's coin: spins for 0.45 s at every floor break, then shows ×3 (gold) or ÷2 (red)"""
    for k, b in enumerate(TL["G"]["brk"]):
        u = t - b
        if 0 <= u < 1.1 and t < RESET0:
            heads = FLIPS[k] == "H"; cx, cy = 800, 640
            spin = u < 0.45; sx = abs(math.cos(u * 26)) if spin else 1.0; jump = -160 * math.sin(math.pi * min(1, u / 0.45))
            a = 1 - max(0.0, (u - 0.85) / 0.25)
            c.save(); c.translate(cx, cy + jump); c.scale(max(0.08, sx) * (1.15 if not spin else 1.0), 1.15 if not spin else 1.0)
            face = rgb("#ffd34a") if (heads or spin) else rgb("#ff5a5f")
            pa = skia.Paint(AntiAlias=True, Color=face); pa.setAlphaf(a); c.drawCircle(0, 0, 78, pa)
            pr = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=8, Color=INK); pr.setAlphaf(a); c.drawCircle(0, 0, 78, pr)
            ri = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=skia.Color4f(1, 1, 1, 0.6 * a).toColor()); c.drawCircle(0, 0, 60, ri)
            if not spin: otext(c, "×3" if heads else "÷2", 0, 26, 74, skia.ColorWHITE, alpha=a)
            c.restore()
            if not spin and u < 0.9:
                otext(c, "HEADS!" if heads else "TAILS!", cx, cy - 110, 54, rgb("#ffd34a") if heads else rgb("#ff5a5f"), alpha=a)

SW_, SH_ = W // 4, H // 4
def draw(main, fi):
    t = fi / FPS; c = main.getCanvas()
    shk = 0.0
    for nm in TL:
        for b in TL[nm]["brk"]:
            if 0 <= t - b < 0.12: shk = max(shk, 5 * (1 - (t - b) / 0.12))
    if 0 <= t - WIN_T < 0.6: shk = max(shk, 20 * (1 - (t - WIN_T) / 0.6))
    draw_bg(c, t)
    c.save(); c.translate(shk * math.sin(t * 97), shk * math.cos(t * 83))
    for ln in LANES: draw_lane(c, ln, fi, t)
    resetting = t >= RESET0
    # ---- header (short, game-like) ----
    panel(c, skia.Rect(40, 40, 1040, 230), rgb("#fff7e0"), rad=40)
    otext(c, "STEADY", 250, 128, 76, rgb(COLS["S"][0])); otext(c, "VS", 540, 128, 60, skia.ColorWHITE); otext(c, "GAMBLER", 830, 128, 76, rgb(COLS["G"][0]))
    otext(c, "×1.5 EVERY FLOOR", 250, 192, 40, INK, stroke=skia.ColorWHITE, sw=6, shadow=False)
    otext(c, "COIN: ×3 OR ÷2", 830, 192, 40, INK, stroke=skia.ColorWHITE, sw=6, shadow=False)
    lead = None
    if START < t < WIN_T:
        kS = lane_state("S", t)[0]; kG = lane_state("G", t)[0]; lead = "S" if kS > kG else ("G" if kG > kS else None)
    for ln in LANES:
        nm = ln["name"]; cx = (ln["x0"] + ln["x1"]) / 2
        k, hp, cnt = lane_state(nm, t) if not resetting else (0, HP[0], ln["n0"])
        n = cnt if t < TL[nm]["finish"] or resetting else TL[nm]["final"]
        lastb = max([b for b in TL[nm]["brk"] if b <= t] or [-9]); pk = 1 + 0.2 * max(0.0, 1 - (t - lastb) / 0.18)
        if nm == "S" or not (any(0 <= t - b < 1.1 for b in TL["G"]["brk"]) and t < RESET0):
            c.save(); c.translate(cx, 385); c.scale(pk, pk); otext(c, fmt(n), 0, 0, 96, skia.ColorWHITE); c.restore()
            otext(c, f"FLOOR {min(k + 1, FLOORS)}/{FLOORS}", cx, 445, 40, rgb(COLS[nm][1]), stroke=skia.ColorWHITE, sw=6, shadow=False)
        if lead == nm:
            panel(c, skia.Rect(cx - 95, 246, cx + 95, 290), rgb("#ffd34a"), rad=22, sw=5, shadow=4); otext(c, "LEADER", cx, 281, 36, INK, sw=0.1, shadow=False)
    coin(c, t)
    # ---- callouts ----
    def banner(msg, u, dur, fill="#ffd34a", sub=None):
        if not (0 <= u < dur): return
        k3 = backout(u / 0.2) * (1 + 0.03 * math.sin(u * 2 * math.pi / (BEAT / 2))); a = 1 - max(0.0, (u - dur + 0.25) / 0.25)
        c.save(); c.translate(540, 1150); c.scale(k3, k3); c.rotate(-4)
        f = skia.Font(LIL, 130); w = f.measureText(msg) + 90
        panel(c, skia.Rect(-w / 2, -130, w / 2, 60 if not sub else 140), rgb(fill), rad=44)
        otext(c, msg, 0, 25, 130, skia.ColorWHITE, alpha=a)
        if sub: otext(c, sub, 0, 115, 60, INK, stroke=skia.ColorWHITE, sw=6, shadow=False, alpha=a)
        c.restore()
    if t < START - 2.1 or t >= D - 0.45:
        uu = 0.5 if t >= D - 0.45 else max(0.5, t)
        banner("PICK A SIDE!", uu, 99, sub="WHO WINS THE RACE?")
        for side, xx, col in ((-1, 120, COLS["S"][0]), (1, 960, COLS["G"][0])):
            on = (int(t / (BEAT / 2)) % 2 == (0 if side < 0 else 1)); sc = 1.15 if on else 0.9
            c.save(); c.translate(xx, 1420); c.scale(sc, sc)
            pth = skia.Path(); pth.moveTo(side * 55, 0); pth.lineTo(-side * 35, -55); pth.lineTo(-side * 35, 55); pth.close()
            c.drawPath(pth, skia.Paint(AntiAlias=True, Color=rgb(col))); c.drawPath(pth, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=7, StrokeJoin=skia.Paint.kRound_Join, Color=INK)); c.restore()
    for j, lab in enumerate(("3", "2", "1", "GO!")):
        u = t - (START - 2.1 + j * 0.7)
        if 0 <= u < 0.7:
            k4 = backout(u / 0.15); a = 1 - max(0.0, (u - 0.7 + 0.12) / 0.12)
            c.save(); c.translate(540, 1200); c.scale(k4, k4); otext(c, lab, 0, 0, 320, rgb("#ffd34a") if j == 3 else skia.ColorWHITE, sw=22, alpha=a); c.restore()
    G = TL["G"]["brk"]; S_ = TL["S"]["brk"]
    banner("LUCKY!!", t - (G[4] + 1.05), 0.95, fill="#ff6fb1")
    banner("OUCH!", t - (G[6] + 1.05), 1.0, fill="#ff5a5f")
    banner("UH OH...", t - (G[7] + 1.15), 1.6, fill="#9b6bff")
    banner("COMEBACK?", t - (G[8] + 1.1), 1.3, fill="#ff6fb1")
    ov = next(S_[k] for k in range(FLOORS) if sum(1 for b in G if b <= S_[k]) < k + 1 and S_[k] > G[6])
    banner("OVERTAKE!", t - ov, 1.5, fill="#3fb8ff")
    # ---- win ----
    if WIN_T <= t < RESET0:
        u = t - WIN_T; ln = LANES[0] if WINNER == "S" else LANES[1]; cx = (ln["x0"] + ln["x1"]) / 2
        for q in range(90):
            rq = np.random.default_rng(q); vx = rq.uniform(-320, 320); vy = rq.uniform(-1000, -450); sp = rq.uniform(6, 12)
            px = cx + vx * u; py = 1150 + vy * u + 800 * u * u
            if py < H + 20:
                c.save(); c.translate(px, py); c.rotate(u * 400 * (1 if q % 2 else -1)); c.drawRoundRect(skia.Rect(-sp, -sp / 2, sp, sp / 2), 3, 3, skia.Paint(AntiAlias=True, Color=rgb(BRICKS[q % 6]))); c.restore()
        k2 = backout(u / 0.25) * (1 + 0.04 * math.sin(u * 2 * math.pi / BEAT))
        c.save(); c.translate(cx, 1150); c.scale(k2, k2); c.rotate(-6)
        panel(c, skia.Rect(-215, -95, 215, 45), rgb("#5fd46a"), rad=36); otext(c, "WINNER!", 0, 15, 104, skia.ColorWHITE); c.restore()
        if u > 0.7:
            a5 = ease((u - 0.7) / 0.3); k5 = backout((u - 0.7) / 0.25)
            c.save(); c.translate(540, 1290); c.scale(k5, k5); panel(c, skia.Rect(-470, -62, 470, 34), rgb("#ff6fb1"), rad=30)
            otext(c, "6 HEADS, 6 TAILS... STILL LOST!", 0, 0, 56, skia.ColorWHITE, alpha=a5); c.restore()
        if u > 1.4: otext(c, "WHICH SIDE DID YOU PICK?", 540, 1870, 56, rgb("#ffd34a"), alpha=ease((u - 1.4) / 0.3))
    if not (WIN_T + 1.4 <= t < RESET0): otext(c, "@8BITLOOP", 540, 1878, 34, skia.ColorWHITE, sw=5, shadow=False)
    c.restore()

def main():
    out = sys.argv[1]; f0 = int(sys.argv[2]) if len(sys.argv) > 2 else 0; f1 = int(sys.argv[3]) if len(sys.argv) > 3 else NF - 1
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", out], stdin=subprocess.PIPE)
    m = skia.Surface(W, H)
    for fi in range(f0, f1 + 1):
        draw(m, fi); proc.stdin.write(m.makeImageSnapshot().toarray(colorType=skia.ColorType.kRGBA_8888_ColorType).tobytes())
    proc.stdin.close(); proc.wait()
if __name__ == "__main__":
    if sys.argv[1] == "--still":
        m = skia.Surface(W, H)
        for fi in map(int, sys.argv[2:]): draw(m, fi); m.makeImageSnapshot().save(str(HERE / f"still_{fi}.png"))
    else: main()
