"""Render video 045 (1 ball vs a heart of bricks) in the modern premium game look: gradient backdrop with bokeh,
frosted-glass arena, glossy bricks (tougher = deeper colour), shaded 3D spheres, shatter particles, gradient type.
usage: render.py out.mp4 [f0 f1] | --still f ..."""
import colorsys, json, math, pickle, subprocess, sys
from pathlib import Path
import numpy as np
import skia
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from sim import W, H, FPS, D, LAUNCH, AX0, AX1, AY0, AY1, BR, COLS, ROWS, BW, BH, BX0, BY0, MASK, HP0, BEAT

frames = pickle.load(open(HERE / "sim.pkl", "rb")); NF = len(frames)
EV = json.loads((HERE / "events.json").read_text()); META = json.loads((HERE / "meta.json").read_text())
CLEAR = META["clear"]; TOTAL = META["total"]
FB = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/Poppins-ExtraBold.ttf"))
FS = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/Poppins-SemiBold.ttf"))
SAMP = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
LW = 2 * math.pi / D
REBUILD0 = CLEAR + 1.8; REBUILD1 = D - 1.0
def c4(r, g, b, a=1.0): return skia.Color4f(r / 255, g / 255, b / 255, a).toColor()
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def backout(x):
    k = min(1, max(0, x)); c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2
GOLD = dict(a=(255, 226, 120), b=(255, 160, 40))

def sphere(a, b):
    S = 96; srf = skia.Surface(S, S); c = srf.getCanvas(); c.clear(skia.ColorTRANSPARENT)
    p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeRadial(skia.Point(S * 0.38, S * 0.33), S * 0.62, [c4(255, 255, 255), c4(*a), c4(*b), c4(b[0] * 0.45, b[1] * 0.45, b[2] * 0.55)], [0.0, 0.28, 0.72, 1.0]))
    c.drawCircle(S / 2, S / 2, S / 2 - 2, p); c.drawOval(skia.Rect(S * 0.26, S * 0.16, S * 0.48, S * 0.3), skia.Paint(AntiAlias=True, Color=c4(255, 255, 255, 0.9)))
    return srf.makeImageSnapshot()
BALL = sphere((255, 255, 255), (150, 220, 255))
# heart palette by row: pink → coral → orange at the bottom tip
def row_col(r, tough):
    h = (0.93 + 0.1 * r / ROWS) % 1.0; s = 0.62 + 0.33 * tough; v = 1.0 - 0.12 * tough
    rr, gg, bb = colorsys.hsv_to_rgb(h, s, v); return (rr * 255, gg * 255, bb * 255)
HPMAX = HP0.max()
RNG = np.random.default_rng(9)
BLOBS = [(RNG.uniform(0, W), RNG.uniform(0, H), RNG.uniform(220, 420), [(255, 110, 200), (90, 160, 255), (140, 90, 255), (255, 170, 90), (90, 230, 220)][i % 5], RNG.uniform(0, 6.28), int(RNG.integers(1, 3))) for i in range(9)]
BREAK_T = {}
for (t, r, c) in EV: BREAK_T[(r, c)] = t

def gtext(c, s, x, y, size, top, bot, font=FB, align="center", alpha=1.0, shadow=0.35):
    f = skia.Font(font, size); w = f.measureText(s); xx = x - w / 2 if align == "center" else (x - w if align == "right" else x)
    if shadow: c.drawString(s, xx, y + size * 0.08, f, skia.Paint(AntiAlias=True, Color=c4(30, 10, 70, shadow * alpha), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, size * 0.06)))
    p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, y - size * 0.8), skia.Point(0, y)], [c4(*top), c4(*bot)])); p.setAlphaf(alpha); c.drawString(s, xx, y, f, p); return w
def backdrop(t):
    s = skia.Surface(W, H); c = s.getCanvas()
    p = skia.Paint(); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, 0), skia.Point(W, H)], [c4(70, 30, 150), c4(40, 80, 200), c4(150, 50, 170)], [0, 0.55, 1])); c.drawRect(skia.Rect(0, 0, W, H), p)
    for (x, y, r, col, ph, sp) in BLOBS:
        xx = x + 90 * math.sin(sp * LW * t + ph); yy = y + 70 * math.cos(sp * LW * t + ph * 1.3)
        q = skia.Paint(AntiAlias=True); q.setShader(skia.GradientShader.MakeRadial(skia.Point(xx, yy), r, [c4(*col, 0.55), c4(*col, 0.0)])); c.drawCircle(xx, yy, r, q)
    img = s.makeImageSnapshot()
    b = skia.Surface(W // 4, H // 4); bp = skia.Paint(); bp.setImageFilter(skia.ImageFilters.Blur(10, 10)); b.getCanvas().drawImageRect(img, skia.Rect(0, 0, W // 4, H // 4), SAMP, bp)
    return img, b.makeImageSnapshot()
def glass(c, rect, rad, blurred, tint=0.14):
    c.drawRoundRect(skia.Rect(rect.left() + 4, rect.top() + 18, rect.right() + 4, rect.bottom() + 22), rad, rad, skia.Paint(AntiAlias=True, Color=c4(20, 8, 60, 0.28), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 18)))
    c.save(); c.clipRRect(skia.RRect.MakeRectXY(rect, rad, rad), skia.ClipOp.kIntersect, True); c.drawImageRect(blurred, skia.Rect(0, 0, W, H), SAMP)
    g = skia.Paint(); g.setShader(skia.GradientShader.MakeLinear([skia.Point(0, rect.top()), skia.Point(0, rect.bottom())], [c4(255, 255, 255, tint + 0.1), c4(255, 255, 255, tint)])); c.drawRect(rect, g); c.restore()
    c.drawRoundRect(rect, rad, rad, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=2.5, Color=c4(255, 255, 255, 0.45)))
def badge(c, cx, cy, s, size=30, col=(255, 255, 255), fg=(60, 40, 140)):
    f = skia.Font(FB, size); w = f.measureText(s) + size * 1.1; h = size * 1.45; r = skia.Rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    c.drawRoundRect(skia.Rect(r.left(), r.top() + 6, r.right(), r.bottom() + 6), h / 2, h / 2, skia.Paint(AntiAlias=True, Color=c4(20, 8, 60, 0.3), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 6)))
    c.drawRoundRect(r, h / 2, h / 2, skia.Paint(AntiAlias=True, Color=c4(*col))); c.drawString(s, cx - f.measureText(s) / 2, cy + size * 0.36, f, skia.Paint(AntiAlias=True, Color=c4(*fg)))

def brick(c, r, cc, x0, y0, tough, scale=1.0, alpha=1.0):
    col = row_col(r, tough); w, h = (BW - 3) * scale, (BH - 3) * scale; cx, cy = x0 + BW / 2, y0 + BH / 2
    rect = skia.Rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, rect.top()), skia.Point(0, rect.bottom())], [c4(min(255, col[0] + 40), min(255, col[1] + 40), min(255, col[2] + 40), alpha), c4(col[0] * 0.8, col[1] * 0.8, col[2] * 0.85, alpha)]))
    c.drawRoundRect(rect, 5 * scale, 5 * scale, p)
    c.drawRoundRect(skia.Rect(rect.left() + 3, rect.top() + 2, rect.right() - 3, rect.top() + h * 0.38), 3, 3, skia.Paint(AntiAlias=True, Color=c4(255, 255, 255, 0.45 * alpha)))

def draw(main, fi):
    t = fi / FPS; c = main.getCanvas()
    img, blurred = backdrop(t); c.drawImage(img, 0, 0)
    pos, born, alive = frames[min(fi, NF - 1)]
    clear = CLEAR is not None and t >= CLEAR
    shk = 3.0 * max(0.0, 1 - min([t - bt for (bt, r, cc) in EV[-1:]] + [9]) / 0.1) if False else 0.0
    if clear and t - CLEAR < 0.7: shk = 16 * (1 - (t - CLEAR) / 0.7)
    c.save(); c.translate(shk * math.sin(t * 97), shk * math.cos(t * 83))
    glass(c, skia.Rect(AX0 - 10, AY0 - 10, AX1 + 10, AY1 + 10), 46, blurred)
    # bricks
    rebuilding = t >= REBUILD0
    for r in range(ROWS):
        for cc in range(COLS):
            if not MASK[r, cc]: continue
            x0, y0 = BX0 + cc * BW, BY0 + r * BH; tough = (HP0[r, cc] - 1) / max(1, HPMAX - 1)
            if rebuilding:
                k = ease((t - REBUILD0 - (ROWS - 1 - r) * 0.06) / 0.35)
                if k > 0: brick(c, r, cc, x0, y0 - (1 - k) * 60, tough, scale=backout(k), alpha=min(1, k * 2))
                continue
            hp = alive[r, cc]
            if hp > 0:
                cur = (hp - 1) / max(1, HPMAX - 1)
                brick(c, r, cc, x0, y0, cur)
            else:
                bt = BREAK_T.get((r, cc), -9); age = t - bt
                if 0 <= age < 0.5:
                    col = row_col(r, 0.3)
                    for q in range(6):
                        rq = np.random.default_rng(r * 100 + cc * 7 + q); vx = rq.uniform(-220, 220); vy = rq.uniform(-300, 60); s = rq.uniform(3, 6)
                        c.drawCircle(x0 + BW / 2 + vx * age, y0 + BH / 2 + vy * age + 900 * age * age, s * (1 - age / 0.5), skia.Paint(AntiAlias=True, Color=c4(*col, 1 - age / 0.5)))
                    c.drawCircle(x0 + BW / 2, y0 + BH / 2, 6 + 40 * age, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3, Color=c4(255, 255, 255, 0.8 * (1 - age / 0.5))))
    # balls
    if t < LAUNCH or (rebuilding and t >= REBUILD0 + 1.9):
        a = 1.0 if t < LAUNCH else ease((t - REBUILD0 - 1.9) / 0.3); pl = skia.Paint(AntiAlias=True); pl.setAlphaf(a); rb = BR * 1.8
        yb = 1700 - 60 * abs(math.sin(math.pi * t / BEAT)); c.drawImageRect(BALL, skia.Rect(540 - rb, yb - rb, 540 + rb, yb + rb), SAMP, pl)
    elif not rebuilding:
        a = 1.0 if not clear else max(0.0, 1 - (t - CLEAR - 1.0) / 0.6)
        if a > 0:
            p = skia.Paint(AntiAlias=True); p.setAlphaf(a)
            for i in range(len(pos)):
                x, y = float(pos[i, 0]), float(pos[i, 1]); age = t - float(born[i]); rb = BR * 2.1 * (backout(age / 0.15) if i > 0 and age < 0.15 else 1.0)
                c.drawImageRect(BALL, skia.Rect(x - rb, y - rb, x + rb, y + rb), SAMP, p)
    # header
    glass(c, skia.Rect(40, 50, 1040, 270), 48, blurred, tint=0.18)
    gtext(c, f"1 BALL  vs  {TOTAL} BRICKS", 540, 150, 76, (255, 255, 255), (230, 220, 255))
    badge(c, 540, 222, "every brick it breaks = +1 ball", size=30, col=(255, 255, 255), fg=(200, 60, 130))
    nb = 1 if (t < LAUNCH or rebuilding) else len(pos); left = TOTAL if (t < LAUNCH or rebuilding) else int((alive > 0).sum())
    for cx, lab, val, col in ((280, "BALLS", nb, ((255, 255, 255), (200, 235, 255))), (800, "BRICKS LEFT", left, ((255, 220, 235), (255, 120, 170)))):
        gtext(c, lab, cx, 345, 34, (255, 255, 255), (230, 225, 255), font=FS, shadow=0.2)
        gtext(c, f"{val:,}", cx, 450, 100, *col)
    # callouts
    def banner(msg, u, dur, col, sub=None):
        if not (0 <= u < dur): return
        k3 = backout(u / 0.2) * (1 + 0.025 * math.sin(u * 2 * math.pi / (BEAT / 2))); a = 1 - max(0.0, (u - dur + 0.25) / 0.25)
        c.save(); c.translate(540, 1300); c.scale(k3, k3); c.rotate(-3)
        f = skia.Font(FB, 120); w = f.measureText(msg) + 110; hgt = 210 if not sub else 290; rr = skia.Rect(-w / 2, -150, w / 2, -150 + hgt)
        c.drawRoundRect(skia.Rect(rr.left(), rr.top() + 14, rr.right(), rr.bottom() + 14), 60, 60, skia.Paint(AntiAlias=True, Color=c4(20, 8, 60, 0.35 * a), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 18)))
        p = skia.Paint(AntiAlias=True); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, rr.top()), skia.Point(0, rr.bottom())], [c4(*col["a"]), c4(*col["b"])])); p.setAlphaf(a); c.drawRoundRect(rr, 60, 60, p)
        c.drawRoundRect(skia.Rect(rr.left() + 30, rr.top() + 10, rr.right() - 30, rr.top() + 50), 20, 20, skia.Paint(AntiAlias=True, Color=c4(255, 255, 255, 0.3 * a)))
        gtext(c, msg, 0, 0, 120, (255, 255, 255), (255, 245, 235), alpha=a)
        if sub: gtext(c, sub, 0, 95, 50, (255, 255, 255), (255, 240, 250), font=FS, alpha=a, shadow=0.2)
        c.restore()
    PURPLE = dict(a=(170, 120, 255), b=(110, 70, 230)); PINK = dict(a=(255, 140, 200), b=(240, 70, 140)); BLUE = dict(a=(110, 200, 255), b=(60, 120, 255)); GREEN = dict(a=(120, 235, 160), b=(40, 190, 120))
    if t < LAUNCH - 0.15 or t >= REBUILD0 + 2.0:
        banner("WATCH THIS", 0.5 + (t % (2 * BEAT)), 99, PURPLE, sub="how long to clear it?")
    def first(n):
        return next((i / FPS for i in range(NF) if len(frames[i][0]) >= n), None)
    for n, col in ((100, BLUE), (300, PINK)):
        tn = FIRST.get(n)
        if tn: banner(f"{n} BALLS!", t - tn, 1.2, col)
    if T5: banner("LAST 5...", t - T5, 1.4, PURPLE)
    if clear and t < REBUILD0 + 0.6:
        u = t - CLEAR
        for q in range(120):
            rq = np.random.default_rng(q); vx = rq.uniform(-420, 420); vy = rq.uniform(-1150, -450); sp = rq.uniform(6, 12); colq = [(255, 140, 200), (110, 200, 255), GOLD["a"], (120, 235, 160)][q % 4]
            px = 540 + vx * u; py = 1100 + vy * u + 850 * u * u
            if py < H + 20: c.save(); c.translate(px, py); c.rotate(u * 420 * (1 if q % 2 else -1)); c.drawRoundRect(skia.Rect(-sp, -sp / 2.4, sp, sp / 2.4), 3, 3, skia.Paint(AntiAlias=True, Color=c4(*colq))); c.restore()
        banner("CLEAR!", u, REBUILD0 + 0.6 - CLEAR, GREEN, sub=f"in {CLEAR - LAUNCH:.1f} seconds")
    gtext(c, "@8BITLOOP", 540, 1885, 30, (255, 255, 255), (230, 225, 255), font=FS, shadow=0.2)
    c.restore()

FIRST = {n: next((i / FPS for i in range(NF) if len(frames[i][0]) >= n), None) for n in (100, 300)}
T5 = next((i / FPS for i in range(NF) if i / FPS > LAUNCH and int((frames[i][2] > 0).sum()) <= 5), None)

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
