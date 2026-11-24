"""Render video 042 (Galton board) with skia, neon look: glowing orbs coloured by release wave (strata in the bins),
pegs that flash when hit, neon board, bloom, the bell curve drawn over the pile, trap door that swings open.
usage: python3 render.py out.mp4 [f0 f1] | --still f1 f2 ..."""
import colorsys, math, pickle, subprocess, sys
from pathlib import Path
import numpy as np
import skia
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from sim import W, H, FPS, D, N, BR, PR, CX, PEGS, WALLS, NB, BIN_TOP, FLOOR, SPAWN, REVEAL, OPEN, RESET, BAR, PDX

frames, counts, rel = pickle.load(open(HERE / "sim.pkl", "rb"))
NF = len(frames)
BEBAS = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/BebasNeue-Regular.ttf"))
MONO = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/SpaceMono-Bold.ttf"))
WAVE = 2 * BAR
WAVE_HUES = [0.55, 0.92, 0.13, 0.78, 0.33, 0.02, 0.62, 0.45, 0.85]
HUE = np.array([WAVE_HUES[min(len(WAVE_HUES) - 1, int(r / WAVE))] for r in rel])
SC = 0.88
def X(x): return 540 + (x - 540) * SC
def Y(y): return 470 + (y - 300) * SC
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def hsv(h, s=0.85, v=1.0, a=1.0):
    r, g, b = colorsys.hsv_to_rgb(h % 1, s, v); return skia.Color4f(r, g, b, a).toColor()

NH = 64; SPR = 64
def orb(h):
    s = skia.Surface(SPR, SPR); c = s.getCanvas(); c.clear(skia.ColorTRANSPARENT); p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeRadial(skia.Point(SPR / 2, SPR / 2), SPR / 2, [hsv(h, 0.12, 1.0), hsv(h, 0.75, 1.0), hsv(h, 0.95, 0.8), hsv(h, 1.0, 0.5, 0.0)], [0.0, 0.4, 0.8, 1.0]))
    c.drawCircle(SPR / 2, SPR / 2, SPR / 2, p); return s.makeImageSnapshot()
ORBS = [orb(i / NH) for i in range(NH)]
SAMP = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
RNG = np.random.default_rng(5)
STARS = [(RNG.uniform(0, W), RNG.uniform(0, H), RNG.uniform(0.6, 2.0), RNG.uniform(0, 6.28)) for _ in range(140)]
LW = 2 * math.pi / D

# fitted bell curve (in sim coords): pile height per bin ≈ count / balls-per-layer * layer height
cnt = np.array(counts, float); xs = np.array([CX + (b - (NB - 1) / 2) * PDX for b in range(NB)])
mu = (cnt * xs).sum() / cnt.sum(); sd = math.sqrt((cnt * (xs - mu) ** 2).sum() / cnt.sum())
_p = frames[int(REVEAL * FPS) + 60][0]
def _top(x):
    ys = np.sort(_p[(_p[:, 1] > BIN_TOP) & (np.abs(_p[:, 0] - x) < PDX / 2), 1])
    return FLOOR - ys[min(len(ys) - 1, 6)] if len(ys) > 8 else 0.0
_tops = [_top(x) for x in xs]
peak = max(_tops) + BR
def curve_y(x): return FLOOR - peak * math.exp(-0.5 * ((x - mu) / sd) ** 2) * 1.04 - 6

def line(c, x0, y0, x1, y1, col, w):
    p = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=w, StrokeCap=skia.Paint.kRound_Cap, Color=col); c.drawLine(X(x0), Y(y0), X(x1), Y(y1), p)

def text(c, s, x, y, size, color, font, glow=None, alpha=1.0, spacing=0.0):
    f = skia.Font(font, size); w = f.measureText(s) + spacing * (len(s) - 1)
    def put(paint):
        xx = x - w / 2
        if spacing == 0: c.drawString(s, xx, y, f, paint); return
        for ch in s: c.drawString(ch, xx, y, f, paint); xx += f.measureText(ch) + spacing
    if glow is not None:
        g = skia.Paint(AntiAlias=True, Color=glow); g.setAlphaf(0.8 * alpha); g.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, size * 0.12)); put(g)
    p = skia.Paint(AntiAlias=True, Color=color); p.setAlphaf(alpha); put(p)

def wave_hue(t): return WAVE_HUES[min(len(WAVE_HUES) - 1, int(min(t, 35.99) / WAVE))]

def draw_world(c, fi, t):
    pos, act, peg_last = frames[min(fi, NF - 1)]
    wh = wave_hue(t) if t < OPEN else WAVE_HUES[0]
    neon = hsv(0.6, 0.45, 1.0, 0.9)
    # funnel
    for s in (-1, 1):
        line(c, CX + s * 230, 300, CX + s * 22, 430, neon, 4); line(c, CX + s * 22, 430, CX + s * 22, 446, neon, 4)
    # board sides + bin walls
    line(c, WALLS[0], 430, WALLS[0], FLOOR, neon, 4); line(c, WALLS[-1], 430, WALLS[-1], FLOOR, neon, 4)
    for x in WALLS[1:-1]: line(c, x, BIN_TOP + 8, x, FLOOR, hsv(0.6, 0.35, 1.0, 0.55), 2.5)
    # trap door (two halves hinged at the sides)
    a = 0.0 if t < OPEN else ease((t - OPEN) / 0.35) * 1.45
    if t >= RESET - 0.8: a *= 1 - ease((t - RESET + 0.8) / 0.6)
    L = (WALLS[-1] - WALLS[0]) / 2
    for s, x0 in ((1, WALLS[0]), (-1, WALLS[-1])):
        x1 = x0 + s * L * math.cos(a); y1 = FLOOR + L * math.sin(a)
        line(c, x0, FLOOR, x1, y1, hsv(0.6, 0.3, 1.0), 6)
    # pegs (flash when hit)
    for k, (px, py) in enumerate(PEGS):
        age = t - float(peg_last[k]); f = max(0.0, 1 - age / 0.18) if age >= 0 else 0.0
        r = (PR + 2.5 * f) * SC
        c.drawCircle(X(px), Y(py), r + 2, skia.Paint(AntiAlias=True, Color=hsv(0.6, 0.5, 0.6 + 0.4 * f, 0.6)))
        c.drawCircle(X(px), Y(py), r, skia.Paint(AntiAlias=True, Color=skia.Color4f(0.8 + 0.2 * f, 0.88 + 0.12 * f, 1.0, 1.0).toColor()))
    # balls
    for i in range(len(pos)):
        if not act[i]: continue
        x, y = X(float(pos[i, 0])), Y(float(pos[i, 1])); r = BR * 1.55 * SC
        c.drawImageRect(ORBS[int(HUE[i] * NH) % NH], skia.Rect(x - r, y - r, x + r, y + r), SAMP, skia.Paint(AntiAlias=True))
    # the bell curve
    if REVEAL <= t < OPEN + 0.4:
        k = ease((t - REVEAL) / 1.1); alpha = 1.0 if t < OPEN else 1 - ease((t - OPEN) / 0.4)
        x0, x1 = WALLS[0] + 4, WALLS[-1] - 4; xe = x0 + (x1 - x0) * k
        pth = skia.Path(); n = 120
        for j in range(n + 1):
            x = x0 + (xe - x0) * j / n; (pth.moveTo if j == 0 else pth.lineTo)(X(x), Y(curve_y(x)))
        g = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=14, StrokeCap=skia.Paint.kRound_Cap, Color=hsv(0.14, 0.6, 1.0, 0.5 * alpha)); g.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 8)); c.drawPath(pth, g)
        p = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=6, StrokeCap=skia.Paint.kRound_Cap, Color=skia.Color4f(1, 0.95, 0.75, alpha).toColor()); c.drawPath(pth, p)
        if k < 1: c.drawCircle(X(xe), Y(curve_y(xe)), 11, skia.Paint(AntiAlias=True, Color=skia.ColorWHITE))

SW, SH = W // 4, H // 4
def draw(main, layer, small, fi):
    t = fi / FPS; wh = wave_hue(t) if t < OPEN else WAVE_HUES[0]
    c = main.getCanvas()
    bg = skia.Paint(); bg.setShader(skia.GradientShader.MakeRadial(skia.Point(540, 1100), 1300, [hsv(wh, 0.7, 0.14), hsv(wh, 0.8, 0.05), skia.ColorSetRGB(2, 2, 6)], [0.0, 0.55, 1.0])); c.drawRect(skia.Rect(0, 0, W, H), bg)
    for (x, y, s, ph) in STARS:
        tw = 0.35 + 0.65 * (0.5 + 0.5 * math.sin(18 * LW * t + ph))
        c.drawCircle(x, y, s, skia.Paint(AntiAlias=True, Color=skia.Color4f(0.8, 0.85, 1, 0.45 * tw).toColor()))
    lc = layer.getCanvas(); lc.clear(skia.ColorTRANSPARENT); draw_world(lc, fi, t); img = layer.makeImageSnapshot()
    sc = small.getCanvas(); sc.clear(skia.ColorTRANSPARENT); sc.drawImageRect(img, skia.Rect(0, 0, SW, SH), SAMP); simg = small.makeImageSnapshot()
    for sigma, amt in ((2.5, 0.85), (9.0, 0.5)):
        p = skia.Paint(); p.setImageFilter(skia.ImageFilters.Blur(sigma, sigma)); p.setBlendMode(skia.BlendMode.kPlus); p.setAlphaf(amt)
        c.saveLayer(None, None); c.scale(4, 4); c.drawImage(simg, 0, 0, SAMP, p); c.restore()
    c.drawImage(img, 0, 0)
    # HUD
    pos, act, _ = frames[min(fi, NF - 1)]; on = int(act.sum())
    text(c, "B A L L S", 540, 118, 28, skia.ColorSetRGB(170, 180, 220), MONO)
    text(c, f"{on:,}", 540, 300, 190, skia.ColorWHITE, BEBAS, glow=hsv(wh, 0.8, 1.0))
    gold, goldg = skia.ColorSetRGB(255, 215, 90), skia.ColorSetRGB(255, 150, 40)
    if t < 4.0 or t >= RESET - 0.3:
        text(c, "WHAT SHAPE WILL THEY MAKE?", 540, 380, 70, gold, BEBAS, glow=goldg)
    elif REVEAL <= t < OPEN:
        k = ease((t - REVEAL - 0.9) / 0.3)
        text(c, "A PERFECT BELL CURVE", 540, 384, 80, gold, BEBAS, glow=goldg, alpha=k)
    elif t >= OPEN:
        text(c, "AGAIN?", 540, 384, 80, gold, BEBAS, glow=goldg)
    else:
        text(c, "EVERY BOUNCE IS PURE CHANCE", 540, 378, 52, hsv(0.52, 0.45, 1.0), BEBAS, glow=hsv(0.52, 0.9, 1.0))
    text(c, "@HOWTOWITHZAY", 540, 1880, 24, skia.ColorSetRGB(120, 128, 170), MONO)

def surfaces(): return skia.Surface(W, H), skia.Surface(W, H), skia.Surface(SW, SH)
def main():
    out = sys.argv[1]; f0 = int(sys.argv[2]) if len(sys.argv) > 2 else 0; f1 = int(sys.argv[3]) if len(sys.argv) > 3 else NF - 1
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", out], stdin=subprocess.PIPE)
    m, l, s = surfaces()
    for fi in range(f0, f1 + 1):
        draw(m, l, s, fi); proc.stdin.write(m.makeImageSnapshot().toarray(colorType=skia.ColorType.kRGBA_8888_ColorType).tobytes())
        if fi % 300 == 0: print("frame", fi, flush=True)
    proc.stdin.close(); proc.wait()
if __name__ == "__main__":
    if sys.argv[1] == "--still":
        m, l, s = surfaces()
        for fi in map(int, sys.argv[2:]): draw(m, l, s, fi); m.makeImageSnapshot().save(str(HERE / f"still_{fi}.png"))
    else: main()
