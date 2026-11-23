"""Render video 038 frames with skia from sim.pkl and pipe to ffmpeg (video only; mux with music after).
usage: python3 render.py [out.mp4] [first_frame] [last_frame]"""
import colorsys, math, pickle, subprocess, sys
from pathlib import Path
import numpy as np
import skia
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sim import W, H, FPS, D, FULL_T, CX, CY, RA, BR, GR, OMEGA, ARM_R, ARM_RAD, ARM_SPAN, NMAX, P0

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
frames, full_frame = pickle.load(open(HERE / "sim.pkl", "rb"))
NF = len(frames)
FONT_B = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/Poppins-ExtraBold.ttf"))
FONT_S = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/Poppins-SemiBold.ttf"))
BURST0, BURST1 = FULL_T + 0.9, FULL_T + 2.6
RESET = D - 0.45

# ---- ball sprites (64 hues), glossy ----
NH = 64; SPR = 48
def make_sprite(h):
    s = skia.Surface(SPR, SPR); c = s.getCanvas(); c.clear(skia.ColorTRANSPARENT)
    r, g, b = colorsys.hsv_to_rgb(h, 0.82, 1.0); rd, gd, bd = colorsys.hsv_to_rgb(h, 0.95, 0.55)
    p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeRadial(skia.Point(SPR * 0.38, SPR * 0.34), SPR * 0.62,
        [skia.Color4f(min(1, r + 0.35), min(1, g + 0.35), min(1, b + 0.35), 1).toColor(), skia.Color4f(r, g, b, 1).toColor(), skia.Color4f(rd, gd, bd, 1).toColor()], [0.0, 0.45, 1.0]))
    c.drawCircle(SPR / 2, SPR / 2, SPR / 2 - 1, p)
    hl = skia.Paint(AntiAlias=True, Color=skia.Color4f(1, 1, 1, 0.55).toColor()); c.drawCircle(SPR * 0.36, SPR * 0.32, SPR * 0.11, hl)
    return s.makeImageSnapshot()
SPRITES = [make_sprite(i / NH) for i in range(NH)]
SAMP = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)

def bg_paint():
    p = skia.Paint(); p.setShader(skia.GradientShader.MakeRadial(skia.Point(CX, CY - 100), 1300, [skia.ColorSetRGB(18, 22, 44), skia.ColorSetRGB(4, 5, 11)], [0.0, 1.0])); return p
BG = bg_paint()

def gear_path(theta):
    pth = skia.Path(); n = 16
    for i in range(n * 2):
        a0 = theta + (i / (n * 2)) * 2 * math.pi; a1 = theta + ((i + 1) / (n * 2)) * 2 * math.pi
        r = GR + 9 if i % 2 == 0 else GR
        x0, y0 = CX + r * math.cos(a0 + 0.04), CY + r * math.sin(a0 + 0.04); x1, y1 = CX + r * math.cos(a1 - 0.04), CY + r * math.sin(a1 - 0.04)
        if i == 0: pth.moveTo(x0, y0)
        else: pth.lineTo(x0, y0)
        pth.lineTo(x1, y1)
    pth.close(); return pth

def text(c, s, x, y, size, color, font=None, align="center", alpha=1.0):
    f = skia.Font(font or FONT_B, size); w = f.measureText(s)
    p = skia.Paint(AntiAlias=True, Color=color); p.setAlphaf(alpha)
    xx = x - w / 2 if align == "center" else x
    sh = skia.Paint(AntiAlias=True, Color=skia.ColorSetARGB(int(160 * alpha), 0, 0, 0)); c.drawString(s, xx + 4, y + 5, f, sh)
    c.drawString(s, xx, y, f, p)

def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)

def draw(c, fi):
    t = fi / FPS
    c.drawRect(skia.Rect(0, 0, W, H), BG)
    pos, hue, born = frames[min(fi, NF - 1)]
    n = len(pos)
    burst = 0.0 if t < BURST0 else ease((t - BURST0) / (BURST1 - BURST0))
    reset = t >= RESET
    fillk = min(1.0, n / NMAX) if not reset else 0.0
    if burst > 0 and not reset: fillk = 1.0 - burst
    # arena rim = progress ring
    rim = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=skia.Color4f(1, 1, 1, 0.22).toColor())
    c.drawCircle(CX, CY, RA + 6, rim)
    if fillk > 0:
        pr = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=10, StrokeCap=skia.Paint.kRound_Cap)
        pr.setShader(skia.GradientShader.MakeSweep(CX, CY, [skia.ColorSetRGB(80, 220, 255), skia.ColorSetRGB(190, 90, 255), skia.ColorSetRGB(255, 80, 150), skia.ColorSetRGB(255, 210, 60), skia.ColorSetRGB(80, 220, 255)]))
        c.drawArc(skia.Rect(CX - RA - 6, CY - RA - 6, CX + RA + 6, CY + RA + 6), -90, 360 * fillk, False, pr)
    full_flash = max(0.0, 1 - abs(t - FULL_T - 0.1) / 0.35) if full_frame else 0.0
    if full_flash > 0:
        g = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=30, Color=skia.Color4f(1, 1, 1, 0.5 * full_flash).toColor()); g.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 18)); c.drawCircle(CX, CY, RA + 6, g)
    # arms + gear (rotate continuously, periodic)
    theta = OMEGA * t
    arm = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=12, StrokeCap=skia.Paint.kRound_Cap, Color=skia.Color4f(0.78, 0.8, 0.86, 0.9).toColor())
    armhl = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3, StrokeCap=skia.Paint.kRound_Cap, Color=skia.Color4f(1, 1, 1, 0.6).toColor())
    for a in range(2):
        base = theta + a * math.pi; acx = CX + ARM_R * math.cos(base); acy = CY + ARM_R * math.sin(base)
        start = math.degrees(base + math.pi - ARM_SPAN / 2); sweep = math.degrees(ARM_SPAN)
        rr = skia.Rect(acx - ARM_RAD, acy - ARM_RAD, acx + ARM_RAD, acy + ARM_RAD)
        c.drawArc(rr, start, sweep, False, arm)
        rr2 = skia.Rect(acx - ARM_RAD + 3, acy - ARM_RAD + 3, acx + ARM_RAD - 3, acy + ARM_RAD - 3); c.drawArc(rr2, start, sweep, False, armhl)
    gp = skia.Paint(AntiAlias=True); gp.setShader(skia.GradientShader.MakeLinear([skia.Point(CX - GR, CY - GR), skia.Point(CX + GR, CY + GR)], [skia.ColorSetRGB(245, 247, 252), skia.ColorSetRGB(150, 158, 175)]))
    c.drawPath(gear_path(theta), gp)
    hub = skia.Paint(AntiAlias=True, Color=skia.ColorSetRGB(60, 66, 82)); c.drawCircle(CX, CY, GR * 0.42, hub)
    c.drawCircle(CX, CY, GR * 0.18, skia.Paint(AntiAlias=True, Color=skia.ColorSetRGB(220, 224, 235)))
    # balls
    if not reset:
        for i in range(n):
            x, y = float(pos[i, 0]), float(pos[i, 1])
            s = 1.0
            age = t - float(born[i])
            if i > 0 and age < 0.14: s = 0.35 + 0.65 * ease(age / 0.14) * 1.08
            a = 1.0
            if burst > 0:
                dx, dy = x - CX, y - CY; d = math.hypot(dx, dy) + 1e-6
                push = burst ** 1.6 * 900 * (0.6 + 0.4 * ((i * 7919) % 97) / 97)
                x += dx / d * push; y += dy / d * push; a = 1 - burst ** 2; s *= 1 - 0.3 * burst
            r = BR * s
            img = SPRITES[int(float(hue[i]) * NH) % NH]
            p = skia.Paint(AntiAlias=True); p.setAlphaf(a)
            c.drawImageRect(img, skia.Rect(x - r, y - r, x + r, y + r), SAMP, p)
            if i > 0 and age < 0.18 and burst == 0:
                ring = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=2.5, Color=skia.Color4f(1, 1, 1, 0.8 * (1 - age / 0.18)).toColor())
                c.drawCircle(x, y, BR + 14 * age / 0.18, ring)
    else:
        k = ease((t - RESET) / 0.3)
        p = skia.Paint(AntiAlias=True); p.setAlphaf(k)
        c.drawImageRect(SPRITES[int(0.55 * NH)], skia.Rect(P0[0] - BR, P0[1] - BR, P0[0] + BR, P0[1] + BR), SAMP, p)
    # HUD
    count = 1 if reset else (n if burst == 0 else int(round(n * (1 - burst) ** 1.5)))
    hook = t < 3.2 or t >= RESET - 0.05
    text(c, "BALLS", W / 2, 205, 40, skia.ColorSetRGB(150, 160, 190), FONT_S)
    big = f"{count:,}"
    pulse = 1.0
    text(c, big, W / 2, 360, 170 * pulse, skia.ColorWHITE)
    if t >= BURST1 and not reset:
        text(c, "AGAIN?", W / 2, 455, 56, skia.ColorSetRGB(255, 210, 60))
    elif t >= FULL_T and t < BURST1:
        k = ease((t - FULL_T) / 0.2)
        text(c, "FULL!  40.0 SECONDS", W / 2, 455, 56, skia.ColorSetRGB(255, 210, 60), alpha=k)
    elif hook:
        text(c, "HOW LONG UNTIL IT'S FULL?", W / 2, 455, 56, skia.ColorSetRGB(255, 210, 60))
    else:
        secs = min(t, FULL_T)
        text(c, f"{secs:4.1f} S", W / 2, 455, 56, skia.ColorSetRGB(120, 220, 255))
    text(c, "1 RULE: EVERY BALL THAT TOUCHES", W / 2, 1650, 40, skia.ColorSetRGB(225, 230, 245), FONT_S)
    text(c, "THE SPINNER SPLITS IN TWO", W / 2, 1705, 40, skia.ColorSetRGB(225, 230, 245), FONT_S)
    text(c, "@HOWTOWITHZAY", W / 2, 1850, 28, skia.ColorSetRGB(110, 118, 150), FONT_S)

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else str(HERE / "video.mp4")
    f0 = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    f1 = int(sys.argv[3]) if len(sys.argv) > 3 else NF - 1
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", out], stdin=subprocess.PIPE)
    surf = skia.Surface(W, H)
    for fi in range(f0, f1 + 1):
        c = surf.getCanvas(); draw(c, fi)
        arr = surf.makeImageSnapshot().toarray(colorType=skia.ColorType.kRGBA_8888_ColorType)
        proc.stdin.write(arr.tobytes())
        if fi % 300 == 0: print("frame", fi, flush=True)
    proc.stdin.close(); proc.wait()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--still":
        surf = skia.Surface(W, H)
        for fi in map(int, sys.argv[2:]):
            draw(surf.getCanvas(), fi); surf.makeImageSnapshot().save(str(HERE / f"still_{fi}.png"))
    else:
        main()
