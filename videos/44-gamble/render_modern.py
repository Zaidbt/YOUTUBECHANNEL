"""Video 044 · modern premium mobile-game look (no thick outlines): vibrant gradient backdrop with drifting bokeh
blobs, frosted-glass lanes (blurred backdrop), glossy 3D pill floors, shaded 3D spheres with specular + rim light and
soft contact shadows, gradient display type with soft shadows, a 3D gold coin. Same race logic as render.py.
usage: render_modern.py out.mp4 [f0 f1] | --still f ..."""
import math, subprocess, sys
from pathlib import Path
import numpy as np
import skia
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from sim import W, H, FPS, D, FLOORS, FY, START, LANES, TOP, BOTTOM, BR, BEAT, FLIPS
from render import TL, HP, POPS, frames, NF, WIN_T, WINNER, RESET0, lane_state, reset_k, ease, backout, fmt

FB = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/Poppins-ExtraBold.ttf"))
FS = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/Poppins-SemiBold.ttf"))
def c4(r, g, b, a=1.0): return skia.Color4f(r / 255, g / 255, b / 255, a).toColor()
LANEC = {"S": dict(a=(80, 200, 255), b=(60, 110, 255)), "G": dict(a=(255, 120, 200), b=(255, 80, 120))}
GOLD = dict(a=(255, 226, 120), b=(255, 160, 40))
SAMP = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
LW = 2 * math.pi / D

def sphere(col):
    S = 96; srf = skia.Surface(S, S); c = srf.getCanvas(); c.clear(skia.ColorTRANSPARENT); a, b = col["a"], col["b"]
    p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeRadial(skia.Point(S * 0.38, S * 0.33), S * 0.62,
        [c4(255, 255, 255), c4(*a), c4(*b), c4(b[0] * 0.45, b[1] * 0.45, b[2] * 0.55)], [0.0, 0.28, 0.72, 1.0]))
    c.drawCircle(S / 2, S / 2, S / 2 - 2, p)
    rim = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3); rim.setShader(skia.GradientShader.MakeLinear([skia.Point(0, S), skia.Point(S, 0)], [c4(255, 255, 255, 0.0), c4(255, 255, 255, 0.0), c4(*a, 0.9)], [0, 0.5, 1])); c.drawCircle(S / 2, S / 2, S / 2 - 3.5, rim)
    c.drawOval(skia.Rect(S * 0.26, S * 0.16, S * 0.48, S * 0.3), skia.Paint(AntiAlias=True, Color=c4(255, 255, 255, 0.9)))
    return srf.makeImageSnapshot()
BALL = {k: sphere(v) for k, v in LANEC.items()}
SHADOW = (lambda: (lambda s: (s.getCanvas().clear(skia.ColorTRANSPARENT), s.getCanvas().drawOval(skia.Rect(8, 20, 88, 44), skia.Paint(AntiAlias=True, Color=c4(20, 10, 60, 0.35), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 6))), s.makeImageSnapshot())[2])(skia.Surface(96, 64)))()
RNG = np.random.default_rng(9)
BLOBS = [(RNG.uniform(0, W), RNG.uniform(0, H), RNG.uniform(220, 420), RNG.choice([(255, 110, 200), (90, 160, 255), (140, 90, 255), (255, 170, 90), (90, 230, 220)]), RNG.uniform(0, 6.28), int(RNG.integers(1, 3))) for _ in range(9)]

def gtext(c, s, x, y, size, top, bot, font=FB, align="center", alpha=1.0, shadow=0.35):
    f = skia.Font(font, size); w = f.measureText(s); xx = x - w / 2 if align == "center" else (x - w if align == "right" else x)
    if shadow:
        sp = skia.Paint(AntiAlias=True, Color=c4(30, 10, 70, shadow * alpha), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, size * 0.06)); c.drawString(s, xx, y + size * 0.08, f, sp)
    p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, y - size * 0.8), skia.Point(0, y)], [c4(*top), c4(*bot)])); p.setAlphaf(alpha)
    c.drawString(s, xx, y, f, p); return w

def backdrop(t):
    s = skia.Surface(W, H); c = s.getCanvas()
    p = skia.Paint(); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, 0), skia.Point(W, H)], [c4(58, 32, 140), c4(40, 70, 190), c4(110, 40, 160)], [0, 0.55, 1])); c.drawRect(skia.Rect(0, 0, W, H), p)
    for (x, y, r, col, ph, sp) in BLOBS:
        xx = x + 90 * math.sin(sp * LW * t + ph); yy = y + 70 * math.cos(sp * LW * t + ph * 1.3)
        q = skia.Paint(AntiAlias=True); q.setShader(skia.GradientShader.MakeRadial(skia.Point(xx, yy), r, [c4(*col, 0.55), c4(*col, 0.0)])); c.drawCircle(xx, yy, r, q)
    img = s.makeImageSnapshot()
    b = skia.Surface(W // 4, H // 4); bc = b.getCanvas(); bp = skia.Paint(); bp.setImageFilter(skia.ImageFilters.Blur(10, 10)); bc.drawImageRect(img, skia.Rect(0, 0, W // 4, H // 4), SAMP, bp)
    return img, b.makeImageSnapshot()

def glass(c, rect, rad, blurred, tint=0.14):
    c.drawRoundRect(skia.Rect(rect.left() + 4, rect.top() + 18, rect.right() + 4, rect.bottom() + 22), rad, rad, skia.Paint(AntiAlias=True, Color=c4(20, 8, 60, 0.28), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 18)))
    c.save(); rr = skia.RRect.MakeRectXY(rect, rad, rad); c.clipRRect(rr, skia.ClipOp.kIntersect, True)
    c.drawImageRect(blurred, skia.Rect(0, 0, W, H), SAMP)
    g = skia.Paint(); g.setShader(skia.GradientShader.MakeLinear([skia.Point(0, rect.top()), skia.Point(0, rect.bottom())], [c4(255, 255, 255, tint + 0.1), c4(255, 255, 255, tint)])); c.drawRect(rect, g)
    c.restore()
    c.drawRoundRect(rect, rad, rad, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=2.5, Color=c4(255, 255, 255, 0.45)))

def pill(c, rect, col, glow=0.0):
    rad = rect.height() / 2
    if glow > 0: c.drawRoundRect(rect, rad, rad, skia.Paint(AntiAlias=True, Color=c4(*col["a"], 0.6 * glow), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 14)))
    c.drawRoundRect(skia.Rect(rect.left(), rect.top() + 6, rect.right(), rect.bottom() + 6), rad, rad, skia.Paint(AntiAlias=True, Color=c4(20, 8, 60, 0.25), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 5)))
    p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, rect.top()), skia.Point(0, rect.bottom())], [c4(*col["a"]), c4(*col["b"])])); c.drawRoundRect(rect, rad, rad, p)
    c.drawRoundRect(skia.Rect(rect.left() + rad * 0.6, rect.top() + 2.5, rect.right() - rad * 0.6, rect.top() + rect.height() * 0.38), rad * 0.4, rad * 0.4, skia.Paint(AntiAlias=True, Color=c4(255, 255, 255, 0.45)))

def badge(c, cx, cy, s, size=30, col=(255, 255, 255), fg=(60, 40, 140)):
    f = skia.Font(FB, size); w = f.measureText(s) + size * 1.1; h = size * 1.45
    r = skia.Rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    c.drawRoundRect(skia.Rect(r.left(), r.top() + 6, r.right(), r.bottom() + 6), h / 2, h / 2, skia.Paint(AntiAlias=True, Color=c4(20, 8, 60, 0.3), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 6)))
    c.drawRoundRect(r, h / 2, h / 2, skia.Paint(AntiAlias=True, Color=c4(*col)))
    c.drawString(s, cx - f.measureText(s) / 2, cy + size * 0.36, f, skia.Paint(AntiAlias=True, Color=c4(*fg)))

def lane(c, ln, fi, t, blurred):
    nm = ln["name"]; x0, x1 = ln["x0"], ln["x1"]; col = LANEC[nm]; cx = (x0 + x1) / 2
    k, hp, cnt = lane_state(nm, t); resetting = t >= RESET0
    glass(c, skia.Rect(x0, TOP, x1, BOTTOM + 50), 44, blurred)
    for j in range(FLOORS):
        y = FY[j]
        if resetting:
            rk = reset_k(t, j)
            if rk <= 0: continue
            y = FY[j] - (1 - rk) * 1000
        elif j < k:
            age = t - TL[nm]["brk"][j]
            if age < 0.7:
                for q in range(14):
                    rq = np.random.default_rng(q + 31 * j); vx = rq.uniform(-420, 420); vy = rq.uniform(-520, -160); s = rq.uniform(7, 15)
                    px = cx + rq.uniform(-180, 180) + vx * age; py = y + vy * age + 1500 * age * age; a = 1 - age / 0.7
                    p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(px, py - s), skia.Point(px, py + s)], [c4(*col["a"], a), c4(*col["b"], a)])); c.drawCircle(px, py, s * (1 - 0.4 * age), p)
                ring = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=6 * (1 - age / 0.7), Color=c4(255, 255, 255, 0.8 * (1 - age / 0.7)))
                c.drawRoundRect(skia.Rect(x0 + 24 - 60 * age, y - 60 * age, x1 - 24 + 60 * age, y + 18 + 60 * age), 30, 30, ring)
            continue
        cur = j == k and not resetting
        pill(c, skia.Rect(x0 + 24, y, x1 - 24, y + 18), col if cur or resetting or j > k else col, glow=1.0 if cur else 0.0)
        if cur or j == 0:
            val = hp if cur else HP[j]; badge(c, cx, y + 46, fmt(math.ceil(val)), size=26 if cur else 22, col=(255, 255, 255), fg=(70, 45, 150))
            if cur:
                fr = hp / HP[j]; c.drawRoundRect(skia.Rect(x0 + 40, y + 6, x0 + 40 + (x1 - x0 - 80) * fr, y + 10), 2, 2, skia.Paint(AntiAlias=True, Color=c4(255, 255, 255, 0.7)))
    # goal line
    gy = BOTTOM + 26
    g = skia.Paint(AntiAlias=True); g.setShader(skia.GradientShader.MakeLinear([skia.Point(x0, 0), skia.Point(x1, 0)], [c4(*GOLD["a"], 0.0), c4(*GOLD["a"]), c4(*GOLD["a"], 0.0)])); c.drawRoundRect(skia.Rect(x0 + 30, gy, x1 - 30, gy + 6), 3, 3, g)
    def balls(pos, a):
        r = BR * 1.75; ps = skia.Paint(AntiAlias=True); ps.setAlphaf(0.8 * a); p = skia.Paint(AntiAlias=True); p.setAlphaf(a)
        fy = FY[k] if k < FLOORS and not resetting else None
        for (x, y) in pos:
            if y > BOTTOM + 60: continue
            if fy is not None and fy - y < 60: c.drawImageRect(SHADOW, skia.Rect(x - r * 1.1, fy - r * 0.5, x + r * 1.1, fy + r * 0.3), SAMP, ps)
        for (x, y) in pos:
            if y > BOTTOM + 60: continue
            c.drawImageRect(BALL[nm], skia.Rect(x - r, y - r, x + r, y + r), SAMP, p)
    if not resetting: balls(frames[min(fi, NF - 1)][nm], 1.0)
    elif t < RESET0 + 0.3: balls(frames[min(fi, NF - 1)][nm], 1 - (t - RESET0) / 0.3)
    if resetting and t >= D - 0.6: balls(frames[0][nm], ease((t - D + 0.6) / 0.3))
    for (tp, kind, pn, pts) in POPS:
        u = t - tp
        if pn == nm and 0 <= u < 0.45 and not resetting:
            for (x, y) in pts[:160]:
                c.drawCircle(x, y, BR * (1.3 + 3 * u), skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=2.5, Color=c4(255, 255, 255, 0.9 * (1 - u / 0.45))))

def coin(c, t):
    for k, b in enumerate(TL["G"]["brk"]):
        u = t - b
        if 0 <= u < 1.1 and t < RESET0:
            heads = FLIPS[k] == "H"; cx, cy = 800, 600; spin = u < 0.45
            sx = abs(math.cos(u * 24)) if spin else 1.0; jump = -170 * math.sin(math.pi * min(1, u / 0.45)); a = 1 - max(0.0, (u - 0.85) / 0.25)
            sc = (1.0 if spin else backout((u - 0.45) / 0.2) * 1.1)
            c.save(); c.translate(cx, cy + jump); c.scale(max(0.1, sx) * sc, sc)
            col = GOLD if (heads or spin) else dict(a=(255, 140, 150), b=(220, 50, 80))
            c.drawCircle(0, 10, 80, skia.Paint(AntiAlias=True, Color=c4(*col["b"], 0.9 * a)))           # edge thickness
            p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(-60, -80), skia.Point(60, 80)], [c4(255, 250, 220, a), c4(*col["a"], a), c4(*col["b"], a)], [0, 0.4, 1])); c.drawCircle(0, 0, 80, p)
            c.drawCircle(0, 0, 62, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=c4(255, 255, 255, 0.5 * a)))
            if not spin: gtext(c, "×3" if heads else "÷2", 0, 26, 72, (255, 255, 255), (255, 240, 220), alpha=a, shadow=0.25)
            c.restore()
            if not spin and u < 0.95:
                badge(c, cx, cy - 125, "HEADS!" if heads else "TAILS!", size=34, col=GOLD["a"] if heads else (255, 110, 140), fg=(90, 40, 0) if heads else (255, 255, 255))

def draw(main, fi):
    t = fi / FPS; c = main.getCanvas()
    img, blurred = backdrop(t); c.drawImage(img, 0, 0)
    shk = 0.0
    for nm in TL:
        for b in TL[nm]["brk"]:
            if 0 <= t - b < 0.12: shk = max(shk, 4 * (1 - (t - b) / 0.12))
    if 0 <= t - WIN_T < 0.6: shk = max(shk, 16 * (1 - (t - WIN_T) / 0.6))
    c.save(); c.translate(shk * math.sin(t * 97), shk * math.cos(t * 83))
    for ln in LANES: lane(c, ln, fi, t, blurred)
    resetting = t >= RESET0
    # header card
    glass(c, skia.Rect(40, 50, 1040, 250), 48, blurred, tint=0.18)
    gtext(c, "STEADY", 270, 140, 74, (190, 235, 255), (80, 170, 255)); gtext(c, "vs", 540, 136, 50, (255, 255, 255), (220, 215, 255))
    gtext(c, "GAMBLER", 810, 140, 74, (255, 210, 235), (255, 100, 170))
    badge(c, 270, 200, "×1.5 every floor", size=26, col=(255, 255, 255), fg=(50, 100, 220)); badge(c, 810, 200, "coin: ×3 or ÷2", size=26, col=(255, 255, 255), fg=(220, 60, 130))
    lead = None
    if START < t < WIN_T:
        kS = lane_state("S", t)[0]; kG = lane_state("G", t)[0]; lead = "S" if kS > kG else ("G" if kG > kS else None)
    for ln in LANES:
        nm = ln["name"]; cx = (ln["x0"] + ln["x1"]) / 2; col = LANEC[nm]
        k, hp, cnt = lane_state(nm, t) if not resetting else (0, HP[0], ln["n0"])
        n = cnt if t < TL[nm]["finish"] or resetting else TL[nm]["final"]
        lastb = max([b for b in TL[nm]["brk"] if b <= t] or [-9]); pk = 1 + 0.2 * max(0.0, 1 - (t - lastb) / 0.18)
        coin_on = nm == "G" and any(0 <= t - b < 1.1 for b in TL["G"]["brk"]) and t < RESET0
        if not coin_on:
            c.save(); c.translate(cx, 395); c.scale(pk, pk); gtext(c, fmt(n), 0, 0, 100, (255, 255, 255), (225, 220, 255)); c.restore()
            gtext(c, f"FLOOR {min(k + 1, FLOORS)}/{FLOORS}", cx, 455, 34, (255, 255, 255), (230, 225, 255), font=FS, shadow=0.2)
        if lead == nm: badge(c, cx, 290, "LEADER", size=28, col=GOLD["a"], fg=(110, 50, 0))
    coin(c, t)
    def banner(msg, u, dur, col, sub=None):
        if not (0 <= u < dur): return
        k3 = backout(u / 0.2) * (1 + 0.025 * math.sin(u * 2 * math.pi / (BEAT / 2))); a = 1 - max(0.0, (u - dur + 0.25) / 0.25)
        c.save(); c.translate(540, 1160); c.scale(k3, k3); c.rotate(-3)
        f = skia.Font(FB, 120); w = f.measureText(msg) + 110; hgt = 210 if not sub else 290
        r = skia.Rect(-w / 2, -150, w / 2, -150 + hgt)
        c.drawRoundRect(skia.Rect(r.left(), r.top() + 14, r.right(), r.bottom() + 14), 60, 60, skia.Paint(AntiAlias=True, Color=c4(20, 8, 60, 0.35 * a), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 18)))
        p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, r.top()), skia.Point(0, r.bottom())], [c4(*col["a"]), c4(*col["b"])])); p.setAlphaf(a); c.drawRoundRect(r, 60, 60, p)
        c.drawRoundRect(skia.Rect(r.left() + 30, r.top() + 10, r.right() - 30, r.top() + 50), 20, 20, skia.Paint(AntiAlias=True, Color=c4(255, 255, 255, 0.3 * a)))
        gtext(c, msg, 0, 0, 120, (255, 255, 255), (255, 245, 235), alpha=a)
        if sub: gtext(c, sub, 0, 95, 50, (255, 255, 255), (255, 240, 250), font=FS, alpha=a, shadow=0.2)
        c.restore()
    PURPLE = dict(a=(170, 120, 255), b=(110, 70, 230)); PINK = dict(a=(255, 140, 200), b=(240, 70, 140)); BLUE = dict(a=(110, 200, 255), b=(60, 120, 255)); RED = dict(a=(255, 130, 130), b=(230, 60, 90))
    if t < START - 2.1 or t >= D - 0.45:
        uu = 0.5 if t >= D - 0.45 else max(0.5, t)
        banner("PICK A SIDE!", uu, 99, PURPLE, sub="who wins the race?")
        for side, xx, cn in ((-1, 140, "S"), (1, 940, "G")):
            on = (int(t / (BEAT / 2)) % 2 == (0 if side < 0 else 1)); sc = 1.15 if on else 0.9
            c.save(); c.translate(xx, 1450); c.scale(sc, sc)
            pth = skia.Path(); pth.moveTo(side * 55, 0); pth.lineTo(-side * 30, -50); pth.lineTo(-side * 30, 50); pth.close()
            p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, -50), skia.Point(0, 50)], [c4(*LANEC[cn]["a"]), c4(*LANEC[cn]["b"])])); c.drawPath(pth, p); c.restore()
    for j, lab in enumerate(("3", "2", "1", "GO!")):
        u = t - (START - 2.1 + j * 0.7)
        if 0 <= u < 0.7:
            k4 = backout(u / 0.15); a = 1 - max(0.0, (u - 0.58) / 0.12)
            c.save(); c.translate(540, 1240); c.scale(k4, k4); gtext(c, lab, 0, 0, 300, GOLD["a"] if j == 3 else (255, 255, 255), GOLD["b"] if j == 3 else (220, 215, 255), alpha=a); c.restore()
    G = TL["G"]["brk"]; S_ = TL["S"]["brk"]
    banner("LUCKY!!", t - (G[4] + 1.05), 0.95, PINK)
    banner("OUCH!", t - (G[6] + 1.05), 1.0, RED)
    banner("UH OH...", t - (G[7] + 1.15), 1.6, PURPLE)
    banner("COMEBACK?", t - (G[8] + 1.1), 1.3, PINK)
    ov = next(S_[k] for k in range(FLOORS) if sum(1 for x in G if x <= S_[k]) < k + 1 and S_[k] > G[6])
    banner("OVERTAKE!", t - ov, 1.5, BLUE)
    if WIN_T <= t < RESET0:
        u = t - WIN_T; ln = LANES[0] if WINNER == "S" else LANES[1]; cx = (ln["x0"] + ln["x1"]) / 2
        for q in range(110):
            rq = np.random.default_rng(q); vx = rq.uniform(-360, 360); vy = rq.uniform(-1100, -450); sp = rq.uniform(6, 12); colq = [LANEC["S"], LANEC["G"], GOLD][q % 3]
            px = cx + vx * u; py = 1160 + vy * u + 850 * u * u
            if py < H + 20:
                c.save(); c.translate(px, py); c.rotate(u * 420 * (1 if q % 2 else -1)); c.drawRoundRect(skia.Rect(-sp, -sp / 2.4, sp, sp / 2.4), 3, 3, skia.Paint(AntiAlias=True, Color=c4(*colq["a"]))); c.restore()
        banner("WINNER!", u, 99, dict(a=(120, 235, 160), b=(40, 190, 120)))
        if u > 0.7:
            a5 = ease((u - 0.7) / 0.3); c.save(); c.translate(540, 1420); k5 = backout((u - 0.7) / 0.25); c.scale(k5, k5)
            badge(c, 0, 0, "6 heads, 6 tails... still lost!", size=42, col=(255, 255, 255), fg=(220, 60, 130)); c.restore()
        if u > 1.4: gtext(c, "which side did you pick?", 540, 1880, 50, GOLD["a"], GOLD["b"], alpha=ease((u - 1.4) / 0.3))
    if not (WIN_T + 1.4 <= t < RESET0): gtext(c, "@8BITLOOP", 540, 1880, 30, (255, 255, 255), (230, 225, 255), font=FS, shadow=0.2)
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
        for fi in map(int, sys.argv[2:]): draw(m, fi); m.makeImageSnapshot().save(str(HERE / f"modern_{fi}.png"))
    else: main()
