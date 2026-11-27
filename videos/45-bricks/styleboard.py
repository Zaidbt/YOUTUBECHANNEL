"""Style board: the same moment of video 045 drawn in 4 very different looks, so the user can pick one."""
import colorsys, math, pickle, sys
from pathlib import Path
import numpy as np
import skia
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from sim import W, H, AX0, AX1, AY0, AY1, BR, COLS, ROWS, BW, BH, BX0, BY0, MASK, HP0
frames = pickle.load(open(HERE / "sim.pkl", "rb"))
FI = int(sys.argv[1]) if len(sys.argv) > 1 else 780
pos, born, alive = frames[FI]
FB = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/Poppins-ExtraBold.ttf"))
BEB = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/BebasNeue-Regular.ttf"))
PIX = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/PressStart2P-Regular.ttf"))
SAMP = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
def c4(r, g, b, a=1.0): return skia.Color4f(r / 255, g / 255, b / 255, a).toColor()
def hsv(h, s, v, a=1.0):
    r, g, b = colorsys.hsv_to_rgb(h % 1, s, v); return skia.Color4f(r, g, b, a).toColor()
def txt(c, s, x, y, size, color, font, glow=None, stroke=None, sw=0):
    f = skia.Font(font, size); w = f.measureText(s); xx = x - w / 2
    if glow is not None: c.drawString(s, xx, y, f, skia.Paint(AntiAlias=True, Color=glow, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, size * 0.15)))
    if stroke is not None: c.drawString(s, xx, y, f, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=sw, Color=stroke))
    if isinstance(color, skia.Shader): p = skia.Paint(AntiAlias=True); p.setShader(color)
    else: p = skia.Paint(AntiAlias=True, Color=color)
    c.drawString(s, xx, y, f, p)
nb, left = len(pos), int((alive > 0).sum())
HPMAX = HP0.max()

def bloom(surface, amt=(0.8, 0.5)):
    img = surface.makeImageSnapshot(); s = skia.Surface(W // 4, H // 4); s.getCanvas().drawImageRect(img, skia.Rect(0, 0, W // 4, H // 4), SAMP); si = s.makeImageSnapshot()
    c = surface.getCanvas()
    for sig, a in zip((2.5, 9.0), amt):
        p = skia.Paint(); p.setImageFilter(skia.ImageFilters.Blur(sig, sig)); p.setBlendMode(skia.BlendMode.kPlus); p.setAlphaf(a)
        c.saveLayer(None, None); c.scale(4, 4); c.drawImage(si, 0, 0, SAMP, p); c.restore()

def style_neon():
    s = skia.Surface(W, H); c = s.getCanvas(); c.clear(c4(6, 4, 18))
    world = skia.Surface(W, H); w = world.getCanvas(); w.clear(skia.ColorTRANSPARENT)
    w.drawRoundRect(skia.Rect(AX0 - 10, AY0 - 10, AX1 + 10, AY1 + 10), 30, 30, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=c4(120, 200, 255)))
    for r in range(ROWS):
        for cc in range(COLS):
            if alive[r, cc] <= 0: continue
            h = (0.83 + 0.3 * cc / COLS) % 1; x0, y0 = BX0 + cc * BW, BY0 + r * BH
            w.drawRoundRect(skia.Rect(x0 + 2, y0 + 2, x0 + BW - 2, y0 + BH - 2), 4, 4, skia.Paint(AntiAlias=True, Color=hsv(h, 0.75, 1.0)))
    for (x, y) in pos: w.drawCircle(float(x), float(y), BR * 1.3, skia.Paint(AntiAlias=True, Color=c4(255, 255, 255)))
    c.drawImage(world.makeImageSnapshot(), 0, 0); bloom(s)
    txt(c, "1 BALL vs 446 BRICKS", 540, 180, 110, skia.ColorWHITE, BEB, glow=c4(255, 80, 200))
    txt(c, f"{nb}", 300, 420, 120, c4(120, 220, 255), BEB, glow=c4(60, 160, 255)); txt(c, f"{left}", 780, 420, 120, c4(255, 120, 210), BEB, glow=c4(255, 60, 180))
    txt(c, "BALLS", 300, 470, 34, c4(180, 190, 230), FB); txt(c, "BRICKS", 780, 470, 34, c4(180, 190, 230), FB)
    return s

def style_pastel():
    s = skia.Surface(W, H); c = s.getCanvas(); c.clear(c4(253, 246, 236))
    c.drawRoundRect(skia.Rect(AX0 - 6, AY0 + 6, AX1 + 14, AY1 + 22), 40, 40, skia.Paint(AntiAlias=True, Color=c4(60, 40, 30, 0.08), MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 14)))
    c.drawRoundRect(skia.Rect(AX0 - 10, AY0 - 10, AX1 + 10, AY1 + 10), 40, 40, skia.Paint(AntiAlias=True, Color=c4(255, 255, 255)))
    pal = [(255, 179, 186), (255, 223, 186), (255, 255, 186), (186, 255, 201), (186, 225, 255), (210, 190, 255)]
    for r in range(ROWS):
        for cc in range(COLS):
            if alive[r, cc] <= 0: continue
            col = pal[(r // 4) % 6]; x0, y0 = BX0 + cc * BW, BY0 + r * BH
            c.drawRoundRect(skia.Rect(x0 + 2, y0 + 2, x0 + BW - 2, y0 + BH - 2), 6, 6, skia.Paint(AntiAlias=True, Color=c4(*col)))
    for (x, y) in pos:
        c.drawCircle(float(x) + 1.5, float(y) + 2.5, BR * 1.5, skia.Paint(AntiAlias=True, Color=c4(60, 40, 30, 0.12)))
        c.drawCircle(float(x), float(y), BR * 1.5, skia.Paint(AntiAlias=True, Color=c4(70, 80, 120)))
    txt(c, "1 ball vs 446 bricks", 540, 175, 84, c4(50, 45, 70), FB)
    txt(c, f"{nb}", 300, 420, 110, c4(70, 80, 120), FB); txt(c, f"{left}", 780, 420, 110, c4(235, 120, 140), FB)
    txt(c, "balls", 300, 470, 34, c4(140, 130, 150), FB); txt(c, "bricks left", 780, 470, 34, c4(140, 130, 150), FB)
    return s

def style_pixel():
    lo = skia.Surface(W // 4, H // 4); c = lo.getCanvas(); c.clear(c4(16, 12, 40)); c.scale(0.25, 0.25)
    for yy in range(0, H, 16): c.drawRect(skia.Rect(0, yy, W, yy + 8), skia.Paint(Color=c4(22, 18, 54)))
    c.drawRect(skia.Rect(AX0 - 12, AY0 - 12, AX1 + 12, AY1 + 12), skia.Paint(Style=skia.Paint.kStroke_Style, StrokeWidth=12, Color=c4(90, 220, 255)))
    pal = [(255, 72, 96), (255, 160, 60), (255, 230, 70), (90, 230, 110), (70, 170, 255), (180, 100, 255)]
    for r in range(ROWS):
        for cc in range(COLS):
            if alive[r, cc] <= 0: continue
            col = pal[(r // 4) % 6]; x0, y0 = BX0 + cc * BW, BY0 + r * BH
            c.drawRect(skia.Rect(x0 + 2, y0 + 2, x0 + BW - 2, y0 + BH - 2), skia.Paint(Color=c4(*col)))
            c.drawRect(skia.Rect(x0 + 2, y0 + 2, x0 + BW - 2, y0 + 6), skia.Paint(Color=c4(255, 255, 255, 0.5)))
    for (x, y) in pos: c.drawRect(skia.Rect(float(x) - 6, float(y) - 6, float(x) + 6, float(y) + 6), skia.Paint(Color=c4(255, 255, 255)))
    s = skia.Surface(W, H); C = s.getCanvas()
    C.drawImageRect(lo.makeImageSnapshot(), skia.Rect(0, 0, W, H), skia.SamplingOptions(skia.FilterMode.kNearest), skia.Paint())
    txt(C, "1 BALL VS 446", 540, 170, 56, c4(255, 230, 70), PIX, stroke=c4(0, 0, 0), sw=10)
    txt(C, "BRICKS", 540, 250, 56, c4(255, 230, 70), PIX, stroke=c4(0, 0, 0), sw=10)
    txt(C, f"{nb}", 300, 420, 64, c4(90, 220, 255), PIX); txt(C, f"{left}", 780, 420, 64, c4(255, 72, 96), PIX)
    txt(C, "BALLS", 300, 480, 28, skia.ColorWHITE, PIX); txt(C, "BRICKS", 780, 480, 28, skia.ColorWHITE, PIX)
    return s

def style_synth():
    s = skia.Surface(W, H); c = s.getCanvas()
    p = skia.Paint(); p.setShader(skia.GradientShader.MakeLinear([skia.Point(0, 0), skia.Point(0, H)], [c4(30, 10, 60), c4(120, 30, 120), c4(255, 110, 90), c4(255, 190, 90)], [0, 0.45, 0.8, 1])); c.drawRect(skia.Rect(0, 0, W, H), p)
    sun = skia.Paint(AntiAlias=True); sun.setShader(skia.GradientShader.MakeLinear([skia.Point(0, 1250), skia.Point(0, 1750)], [c4(255, 230, 120), c4(255, 80, 150)])); c.drawCircle(540, 1500, 260, sun)
    for k in range(8): c.drawRect(skia.Rect(260, 1450 + k * 34, 820, 1450 + k * 34 + 6 + k), skia.Paint(Color=c4(120, 30, 120)))
    for k in range(14): c.drawLine(540 + (k - 7) * 60, 1780, 540 + (k - 7) * 300, 1920, skia.Paint(AntiAlias=True, StrokeWidth=3, Color=c4(255, 120, 220, 0.7)))
    for k in range(6): c.drawLine(0, 1780 + k * k * 6, W, 1780 + k * k * 6, skia.Paint(StrokeWidth=3, Color=c4(255, 120, 220, 0.7)))
    for r in range(ROWS):
        for cc in range(COLS):
            if alive[r, cc] <= 0: continue
            x0, y0 = BX0 + cc * BW, BY0 + r * BH; q = skia.Paint(AntiAlias=True)
            q.setShader(skia.GradientShader.MakeLinear([skia.Point(0, y0), skia.Point(0, y0 + BH)], [c4(120, 255, 255), c4(255, 90, 220)])); c.drawRoundRect(skia.Rect(x0 + 2, y0 + 2, x0 + BW - 2, y0 + BH - 2), 3, 3, q)
    for (x, y) in pos: c.drawCircle(float(x), float(y), BR * 1.4, skia.Paint(AntiAlias=True, Color=c4(255, 255, 255)))
    chrome = skia.GradientShader.MakeLinear([skia.Point(0, 100), skia.Point(0, 200)], [c4(220, 250, 255), c4(120, 170, 255), c4(255, 255, 255), c4(255, 120, 220)], [0, 0.48, 0.52, 1])
    txt(c, "1 BALL vs 446 BRICKS", 540, 190, 110, chrome, BEB, glow=c4(255, 60, 200, 0.8))
    txt(c, f"{nb}", 300, 420, 120, c4(120, 255, 255), BEB, glow=c4(60, 200, 255)); txt(c, f"{left}", 780, 420, 120, c4(255, 140, 230), BEB, glow=c4(255, 60, 200))
    return s

tiles = [style_neon(), style_pastel(), style_pixel(), style_synth()]
board = skia.Surface(W * 4 // 2 + 60, H // 2 + 120); B = board.getCanvas(); B.clear(skia.ColorWHITE)
for i, (t, lab) in enumerate(zip(tiles, "ABCD")):
    B.drawImageRect(t.makeImageSnapshot(), skia.Rect(i * (W // 2 + 20), 100, i * (W // 2 + 20) + W // 2, 100 + H // 2), SAMP)
    txt(B, lab, i * (W // 2 + 20) + W // 4, 80, 70, c4(30, 30, 40), FB)
board.makeImageSnapshot().save(str(HERE / "styleboard.png")); print("ok")
