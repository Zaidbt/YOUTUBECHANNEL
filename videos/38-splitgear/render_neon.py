"""Video 038 · alternative B — NEON. Same simulation + same frame-accurate sound, new look:
glowing orbs with light trails and real bloom, neon-tube spinner, spark bursts on every split, a camera that starts
close on the first ball and pulls back as the arena fills, background tinted by the current colour wave, a starfield,
shockwave + shake on FULL, light streaks on the burst, Bebas Neue / Space Mono typography.
usage: python3 render_neon.py out.mp4 | --still f1 f2 ..."""
import colorsys, math, pickle, subprocess, sys
from pathlib import Path
import numpy as np
import skia
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from sim import W, H, FPS, D, FULL_T, CX, CY, RA, BR, GR, OMEGA, ARM_R, ARM_RAD, ARM_SPAN, NMAX, P0, WAVE_HUES, BAR

frames, full_frame = pickle.load(open(HERE / "sim.pkl", "rb"))
NF = len(frames)
BEBAS = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/BebasNeue-Regular.ttf"))
MONO = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/SpaceMono-Bold.ttf"))
BURST0, BURST1 = FULL_T + 0.9, FULL_T + 2.6
RESET = D - 0.45
LW = 2 * math.pi / D
WAVE = 2 * BAR

def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def hsv(h, s=0.85, v=1.0, a=1.0):
    r, g, b = colorsys.hsv_to_rgb(h % 1, s, v); return skia.Color4f(r, g, b, a).toColor()

# ---- glowing orb sprites ----
NH = 64; SPR = 64
def orb(h):
    s = skia.Surface(SPR, SPR); c = s.getCanvas(); c.clear(skia.ColorTRANSPARENT)
    p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeRadial(skia.Point(SPR / 2, SPR / 2), SPR / 2, [hsv(h, 0.15, 1.0), hsv(h, 0.75, 1.0), hsv(h, 0.95, 0.75), hsv(h, 1.0, 0.5, 0.0)], [0.0, 0.35, 0.8, 1.0]))
    c.drawCircle(SPR / 2, SPR / 2, SPR / 2, p)
    return s.makeImageSnapshot()
ORBS = [orb(i / NH) for i in range(NH)]
SAMP = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
STARS = [(np.random.default_rng(i).uniform(0, 1), np.random.default_rng(i + 99).uniform(150, 1100), np.random.default_rng(i + 7).uniform(0.6, 2.2), np.random.default_rng(i + 3).uniform(0, 6.28)) for i in range(160)]

# ---- camera ----
F0 = ((P0[0] + CX) / 2, (P0[1] + CY) / 2 + 20)
def camera(t):
    if t < 1.2: k = 0.0
    elif t < 13.0: k = ease((t - 1.2) / 11.8)
    elif t < BURST1: k = 1.0
    elif t < RESET: k = 1.0 - ease((t - BURST1) / (RESET - BURST1))
    else: k = 0.0
    z = 2.3 + (1.0 - 2.3) * k
    cx = F0[0] + (CX - F0[0]) * k; cy = F0[1] + (CY - F0[1]) * k
    sh = 0.0
    if FULL_T + 0.1 <= t < FULL_T + 0.7: sh = 14 * (1 - (t - FULL_T - 0.1) / 0.6)
    if BURST0 <= t < BURST0 + 0.5: sh = max(sh, 22 * (1 - (t - BURST0) / 0.5))
    ox = sh * math.sin(t * 91); oy = sh * math.cos(t * 77)
    return z, cx, cy - 60 / z, ox, oy

def ball_state(fi):
    """positions (with the burst displacement), hues, birth times, alpha"""
    fi = max(0, min(NF - 1, fi)); t = fi / FPS
    pos, hue, born = frames[fi]
    pos = pos.astype(np.float64).copy(); a = np.ones(len(pos))
    if t >= BURST0:
        b = ease((t - BURST0) / (BURST1 - BURST0))
        d = pos - np.array([CX, CY]); dist = np.linalg.norm(d, axis=1)[:, None] + 1e-6
        rnd = 0.6 + 0.4 * ((np.arange(len(pos)) * 7919) % 97) / 97
        pos += d / dist * (b ** 1.6 * 1100 * rnd)[:, None]; a = np.full(len(pos), 1 - b ** 2)
    return pos, hue, born, a

def gear_path(theta, r0, r1, n=16):
    pth = skia.Path()
    for i in range(n * 2):
        a0 = theta + (i / (n * 2)) * 2 * math.pi; a1 = theta + ((i + 1) / (n * 2)) * 2 * math.pi
        r = r1 if i % 2 == 0 else r0
        p0 = (CX + r * math.cos(a0 + 0.05), CY + r * math.sin(a0 + 0.05)); p1 = (CX + r * math.cos(a1 - 0.05), CY + r * math.sin(a1 - 0.05))
        (pth.moveTo if i == 0 else pth.lineTo)(*p0); pth.lineTo(*p1)
    pth.close(); return pth

def draw_world(c, fi, t):
    """everything that glows, in world coords"""
    wave = min(len(WAVE_HUES) - 1, int(min(t, FULL_T - 0.01) / WAVE)); wh = WAVE_HUES[wave]
    reset = t >= RESET
    pos, hue, born, alpha = ball_state(fi)
    n = len(pos)
    fillk = 0.0 if reset else (min(1.0, n / NMAX) if t < BURST0 else 1 - ease((t - BURST0) / (BURST1 - BURST0)))
    # arena: neon ring + progress
    ring = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3, Color=hsv(wh, 0.55, 1.0, 0.9)); c.drawCircle(CX, CY, RA + 8, ring)
    ring2 = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=1.5, Color=hsv(wh, 0.4, 1.0, 0.35)); c.drawCircle(CX, CY, RA + 22, ring2)
    if fillk > 0:
        pr = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=9, StrokeCap=skia.Paint.kRound_Cap)
        cols = [hsv(h, 0.8, 1.0) for h in WAVE_HUES[:wave + 1]] + [hsv(wh, 0.8, 1.0)]
        if len(cols) < 2: cols = cols * 2
        pr.setShader(skia.GradientShader.MakeSweep(CX, CY, cols, None, skia.TileMode.kClamp, -90, -90 + 360 * fillk))
        c.drawArc(skia.Rect(CX - RA - 8, CY - RA - 8, CX + RA + 8, CY + RA + 8), -90, 360 * fillk, False, pr)
    # shockwave on FULL
    if FULL_T + 0.1 <= t < FULL_T + 1.1:
        u = (t - FULL_T - 0.1) / 1.0
        sw = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=14 * (1 - u) + 2, Color=skia.Color4f(1, 1, 1, 0.9 * (1 - u)).toColor())
        c.drawCircle(CX, CY, RA + 8 + 420 * ease(u), sw)
    # spinner: neon arms + gear
    theta = OMEGA * t
    for a in range(2):
        base = theta + a * math.pi; acx = CX + ARM_R * math.cos(base); acy = CY + ARM_R * math.sin(base)
        start = math.degrees(base + math.pi - ARM_SPAN / 2); sweep = math.degrees(ARM_SPAN)
        rr = skia.Rect(acx - ARM_RAD, acy - ARM_RAD, acx + ARM_RAD, acy + ARM_RAD)
        tube = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=9, StrokeCap=skia.Paint.kRound_Cap, Color=hsv(0.75, 0.55, 1.0, 0.85)); c.drawArc(rr, start, sweep, False, tube)
        core = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=2.5, StrokeCap=skia.Paint.kRound_Cap, Color=skia.ColorWHITE); c.drawArc(rr, start, sweep, False, core)
    gp = gear_path(theta, GR, GR + 9)
    c.drawPath(gp, skia.Paint(AntiAlias=True, Color=skia.ColorSetRGB(12, 14, 26)))
    c.drawPath(gp, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=hsv(0.52, 0.5, 1.0)))
    c.drawCircle(CX, CY, GR * 0.45, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3, Color=hsv(0.52, 0.3, 1.0)))
    c.drawCircle(CX, CY, GR * 0.15, skia.Paint(AntiAlias=True, Color=skia.ColorWHITE))
    if reset:
        k = ease((t - RESET) / 0.3)
        p = skia.Paint(AntiAlias=True); p.setAlphaf(k); r = BR * 1.6
        c.drawImageRect(ORBS[int(WAVE_HUES[0] * NH) % NH], skia.Rect(P0[0] - r, P0[1] - r, P0[0] + r, P0[1] + r), SAMP, p)
        return
    # trails (from 5 frames back)
    ppos, _, _, _ = ball_state(fi - 5)
    m = min(len(ppos), n)
    tr = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeCap=skia.Paint.kRound_Cap, StrokeWidth=BR * 1.3)
    for i in range(m):
        x0, y0 = ppos[i]; x1, y1 = pos[i]
        if (x1 - x0) ** 2 + (y1 - y0) ** 2 < 9: continue
        tr.setShader(skia.GradientShader.MakeLinear([skia.Point(x0, y0), skia.Point(x1, y1)], [hsv(float(hue[i]), 0.9, 1.0, 0.0), hsv(float(hue[i]), 0.8, 1.0, 0.45 * alpha[i])]))
        c.drawLine(x0, y0, x1, y1, tr)
    # orbs + sparks
    sp = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeCap=skia.Paint.kRound_Cap, StrokeWidth=2)
    for i in range(n):
        x, y = pos[i]; age = t - float(born[i]); s = 1.0
        if i > 0 and age < 0.12: s = 0.4 + 0.75 * ease(age / 0.12)
        r = BR * 1.55 * s
        p = skia.Paint(AntiAlias=True); p.setAlphaf(float(alpha[i]))
        c.drawImageRect(ORBS[int(float(hue[i]) * NH) % NH], skia.Rect(x - r, y - r, x + r, y + r), SAMP, p)
        if i > 0 and age < 0.25 and t < BURST0:
            u = age / 0.25; sp.setColor(hsv(float(hue[i]), 0.3, 1.0, 1 - u))
            for k in range(6):
                a = k * math.pi / 3 + i
                r0, r1 = BR + 18 * u, BR + 6 + 34 * u
                c.drawLine(x + r0 * math.cos(a), y + r0 * math.sin(a), x + r1 * math.cos(a), y + r1 * math.sin(a), sp)

def text(c, s, x, y, size, color, font, glow=None, alpha=1.0, spacing=0.0):
    f = skia.Font(font, size); w = f.measureText(s) + spacing * (len(s) - 1)
    def put(paint):
        if spacing == 0: c.drawString(s, x - w / 2, y, f, paint); return
        xx = x - w / 2
        for ch in s: c.drawString(ch, xx, y, f, paint); xx += f.measureText(ch) + spacing
    if glow is not None:
        g = skia.Paint(AntiAlias=True, Color=glow); g.setAlphaf(0.8 * alpha); g.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, size * 0.12)); put(g)
    p = skia.Paint(AntiAlias=True, Color=color); p.setAlphaf(alpha); put(p)

SMALL_W, SMALL_H = W // 4, H // 4
def draw(main, layer, small, fi):
    t = fi / FPS
    wave = min(len(WAVE_HUES) - 1, int(min(t, FULL_T - 0.01) / WAVE)); wh = WAVE_HUES[wave]
    c = main.getCanvas()
    bg = skia.Paint(); bg.setShader(skia.GradientShader.MakeRadial(skia.Point(CX, CY), 1250, [hsv(wh, 0.7, 0.16), hsv(wh, 0.8, 0.05), skia.ColorSetRGB(2, 2, 6)], [0.0, 0.55, 1.0])); c.drawRect(skia.Rect(0, 0, W, H), bg)
    for (a0, rr, s, ph) in STARS:
        a = a0 * 2 * math.pi + LW * t; tw = 0.4 + 0.6 * (0.5 + 0.5 * math.sin(6 * LW * t * 3 + ph))
        c.drawCircle(CX + rr * math.cos(a), CY + rr * math.sin(a) * 1.05, s, skia.Paint(AntiAlias=True, Color=skia.Color4f(0.8, 0.85, 1, 0.5 * tw).toColor()))
    # glowing world into the layer
    lc = layer.getCanvas(); lc.clear(skia.ColorTRANSPARENT)
    z, cx, cy, ox, oy = camera(t)
    lc.save(); lc.translate(W / 2 + ox, H / 2 + 40 + oy); lc.scale(z, z); lc.translate(-cx, -cy)
    draw_world(lc, fi, t); lc.restore()
    img = layer.makeImageSnapshot()
    # bloom: downscale, blur, add back
    sc = small.getCanvas(); sc.clear(skia.ColorTRANSPARENT); sc.drawImageRect(img, skia.Rect(0, 0, SMALL_W, SMALL_H), SAMP)
    simg = small.makeImageSnapshot()
    for sigma, amt in ((2.5, 0.9), (9.0, 0.55)):
        p = skia.Paint(); p.setImageFilter(skia.ImageFilters.Blur(sigma, sigma)); p.setBlendMode(skia.BlendMode.kPlus); p.setAlphaf(amt)
        c.saveLayer(None, None); c.scale(4, 4); c.drawImage(simg, 0, 0, SAMP, p); c.restore()
    c.drawImage(img, 0, 0)
    # HUD
    pos = frames[min(fi, NF - 1)][0]; n = len(pos); reset = t >= RESET
    count = 1 if reset else (n if t < BURST0 else int(round(n * (1 - ease((t - BURST0) / (BURST1 - BURST0))) ** 1.5)))
    text(c, "B A L L S", W / 2, 150, 30, skia.ColorSetRGB(170, 180, 220), MONO)
    text(c, f"{count:,}", W / 2, 345, 210, skia.ColorWHITE, BEBAS, glow=hsv(wh, 0.8, 1.0))
    if FULL_T <= t < BURST1:
        k = ease((t - FULL_T) / 0.15)
        text(c, "FULL!", W / 2, 470, 110, skia.ColorSetRGB(255, 215, 90), BEBAS, glow=skia.ColorSetRGB(255, 150, 40), alpha=k)
    elif BURST1 <= t < RESET:
        text(c, "AGAIN?", W / 2, 460, 90, skia.ColorSetRGB(255, 215, 90), BEBAS, glow=skia.ColorSetRGB(255, 150, 40))
    elif t < 3.2 or reset:
        text(c, "HOW LONG UNTIL IT'S FULL?", W / 2, 455, 76, skia.ColorSetRGB(255, 215, 90), BEBAS, glow=skia.ColorSetRGB(255, 150, 40))
    else:
        text(c, f"{min(t, FULL_T):04.1f} S", W / 2, 450, 54, hsv(0.52, 0.5, 1.0), MONO, glow=hsv(0.52, 0.9, 1.0))
    text(c, "ONE RULE", W / 2, 1640, 30, skia.ColorSetRGB(170, 180, 220), MONO, spacing=4)
    text(c, "TOUCH THE SPINNER = SPLIT IN TWO", W / 2, 1712, 64, skia.ColorWHITE, BEBAS, glow=hsv(0.75, 0.6, 1.0))
    text(c, "@HOWTOWITHZAY", W / 2, 1850, 24, skia.ColorSetRGB(120, 128, 170), MONO)

def surfaces():
    return skia.Surface(W, H), skia.Surface(W, H), skia.Surface(SMALL_W, SMALL_H)

def main():
    out = sys.argv[1]
    f0 = int(sys.argv[2]) if len(sys.argv) > 2 else 0; f1 = int(sys.argv[3]) if len(sys.argv) > 3 else NF - 1
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", out], stdin=subprocess.PIPE)
    m, l, s = surfaces()
    for fi in range(f0, f1 + 1):
        draw(m, l, s, fi)
        proc.stdin.write(m.makeImageSnapshot().toarray(colorType=skia.ColorType.kRGBA_8888_ColorType).tobytes())
        if fi % 300 == 0: print("frame", fi, flush=True)
    proc.stdin.close(); proc.wait()

if __name__ == "__main__":
    if sys.argv[1] == "--still":
        m, l, s = surfaces()
        for fi in map(int, sys.argv[2:]):
            draw(m, l, s, fi); m.makeImageSnapshot().save(str(HERE / f"neon_{fi}.png"))
    else:
        main()
