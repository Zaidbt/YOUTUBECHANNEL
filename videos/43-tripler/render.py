"""Render video 043 (1 ball ×3 vs 100 balls ×2) with skia: two neon lanes (magenta ×2, lime ×3), 20 floors with HP
labels counting down live, shards when a floor breaks, glowing swarms, live counters, a finish line, WINNER stamp,
and a reset where the floors drop back in (loop). usage: python3 render.py out.mp4 [f0 f1] | --still f ..."""
import colorsys, json, math, pickle, subprocess, sys
from pathlib import Path
import numpy as np
import skia
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from sim import W, H, FPS, D, FLOORS, FY, HP, RATE, START, LANES, TOP, BOTTOM, BR, BEAT

TLJ = json.loads((HERE / "timeline.json").read_text()); TL = TLJ["TL"]
frames = pickle.load(open(HERE / "frames.pkl", "rb")); NF = len(frames)
BEBAS = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/BebasNeue-Regular.ttf"))
MONO = skia.Typeface.MakeFromFile(str(ROOT / "public/fonts/SpaceMono-Bold.ttf"))
COL = {"L": (0.88, 0.75), "R": (0.27, 0.8)}         # hue, sat
WIN_T = min(TL["L"]["finish"], TL["R"]["finish"]); WINNER = "L" if TL["L"]["finish"] < TL["R"]["finish"] else "R"
GAP = abs(TL["L"]["finish"] - TL["R"]["finish"])
RESET0, RESET1 = D - 2.6, D - 0.35
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def backout(x):
    k = min(1, max(0, x)); c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2
def hsv(h, s=0.85, v=1.0, a=1.0):
    r, g, b = colorsys.hsv_to_rgb(h % 1, s, v); return skia.Color4f(r, g, b, a).toColor()
SAMP = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
def orb(h, s):
    S = 48; srf = skia.Surface(S, S); c = srf.getCanvas(); c.clear(skia.ColorTRANSPARENT); p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeRadial(skia.Point(S / 2, S / 2), S / 2, [hsv(h, 0.1, 1.0), hsv(h, s, 1.0), hsv(h, 1.0, 0.7, 0.0)], [0.0, 0.45, 1.0]))
    c.drawCircle(S / 2, S / 2, S / 2, p); return srf.makeImageSnapshot()
ORB = {k: orb(*v) for k, v in COL.items()}
RNG = np.random.default_rng(7)
STARS = [(RNG.uniform(0, W), RNG.uniform(0, H), RNG.uniform(0.5, 1.8), RNG.uniform(0, 6.28)) for _ in range(120)]
SHARDS = {(nm, k): [(RNG.uniform(-1, 1), RNG.uniform(-1.2, -0.2), RNG.uniform(6, 16), RNG.uniform(-8, 8)) for _ in range(14)] for nm in "LR" for k in range(FLOORS)}

def fmt(n): return f"{int(round(n)):,}"
def text(c, s, x, y, size, color, font, glow=None, alpha=1.0, align="center"):
    f = skia.Font(font, size); w = f.measureText(s); xx = x - w / 2 if align == "center" else (x - w if align == "right" else x)
    if glow is not None:
        g = skia.Paint(AntiAlias=True, Color=glow); g.setAlphaf(0.75 * alpha); g.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, size * 0.12)); c.drawString(s, xx, y, f, g)
    p = skia.Paint(AntiAlias=True, Color=color); p.setAlphaf(alpha); c.drawString(s, xx, y, f, p)

def lane_state(nm, t):
    tl = TL[nm]; k = sum(1 for b in tl["brk"] if b <= t)
    if k >= FLOORS: return FLOORS, 0.0, tl["final"]
    cnt = tl["count"][k]; dmg = max(0.0, t - tl["arrive"][k]) * cnt * RATE if t >= tl["arrive"][k] else 0.0
    return k, max(0.0, HP[k] - dmg), cnt

def reset_k(t, k):
    """0 → floor gone, 1 → back in place (during the reset the floors drop back in from the top, staggered)"""
    if t < RESET0: return 0.0
    return ease((t - RESET0 - k * 0.05) / 0.45)

def draw_lane(c, ln, fi, t):
    nm = ln["name"]; x0, x1 = ln["x0"], ln["x1"]; h, s = COL[nm]; cx = (x0 + x1) / 2
    k, hp, cnt = lane_state(nm, t)
    resetting = t >= RESET0
    # lane frame
    fr = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=hsv(h, s, 1.0, 0.9)); c.drawRoundRect(skia.Rect(x0, TOP, x1, BOTTOM + 40), 14, 14, fr)
    # floors
    for j in range(FLOORS):
        y = FY[j]; broken = j < k and not resetting
        if resetting:
            rk = reset_k(t, j)
            if rk <= 0: continue
            y = FY[j] - (1 - rk) * 900
        elif broken:
            age = t - TL[nm]["brk"][j]
            if age < 0.7:
                for (dx, dy, sz, rot) in SHARDS[(nm, j)]:
                    px = cx + dx * (x1 - x0) * 0.45 + dx * 260 * age; py = y + dy * 300 * age + 900 * age * age
                    p = skia.Paint(AntiAlias=True, Color=hsv(h, 0.4, 1.0, 1 - age / 0.7)); c.save(); c.translate(px, py); c.rotate(rot * age * 60); c.drawRect(skia.Rect(-sz / 2, -3, sz / 2, 3), p); c.restore()
            continue
        cur = j == k and not resetting
        bar = skia.Paint(AntiAlias=True, Color=hsv(h, s * (1 if cur else 0.35), 1.0 if cur else 0.55, 1.0 if cur else 0.6))
        c.drawRoundRect(skia.Rect(x0 + 12, y, x1 - 12, y + (6 if cur else 3)), 3, 3, bar)
        val = hp if cur else HP[j]
        if j == k + 1 and not resetting:
            continue
        lab = fmt(math.ceil(val)); f = skia.Font(BEBAS, 34 if cur else 24); w = f.measureText(lab) + 22
        pill = skia.Paint(AntiAlias=True, Color=skia.Color4f(0.03, 0.03, 0.07, 0.95).toColor()); oy = 30 if cur else 0
        c.drawRoundRect(skia.Rect(cx - w / 2, y + oy - (22 if cur else 15), cx + w / 2, y + oy + (22 if cur else 15)), 10, 10, pill)
        if cur:
            fill = 1 - hp / HP[j]; c.drawRoundRect(skia.Rect(cx - w / 2, y + oy + 16, cx - w / 2 + w * (1 - fill), y + oy + 21), 2, 2, skia.Paint(AntiAlias=True, Color=hsv(h, s, 1.0)))
        text(c, lab, cx, y + oy + (12 if cur else 8), 34 if cur else 24, skia.ColorWHITE if cur else hsv(h, 0.25, 0.8), BEBAS)
    # finish line
    fy = BOTTOM + 22
    for q in range(int((x1 - x0 - 24) / 20)):
        c.drawRect(skia.Rect(x0 + 12 + q * 20, fy, x0 + 22 + q * 20, fy + 8), skia.Paint(Color=skia.ColorWHITE if q % 2 == 0 else skia.ColorSetRGB(40, 40, 50)))
    # balls
    if not resetting or t < RESET0 + 0.3:
        pos = frames[min(fi, NF - 1)][nm]; a = 1.0 if not resetting else 1 - (t - RESET0) / 0.3
        p = skia.Paint(AntiAlias=True); p.setAlphaf(a); r = BR * 1.8
        for (x, y) in pos:
            if y > BOTTOM + 60: continue
            c.drawImageRect(ORB[nm], skia.Rect(x - r, y - r, x + r, y + r), SAMP, p)
    if resetting and t >= RESET1 - 0.25:
        pos = frames[0][nm]; a = ease((t - RESET1 + 0.25) / 0.25); p = skia.Paint(AntiAlias=True); p.setAlphaf(a); r = BR * 1.8
        for (x, y) in pos: c.drawImageRect(ORB[nm], skia.Rect(x - r, y - r, x + r, y + r), SAMP, p)

SW, SH = W // 4, H // 4
def draw(main, layer, small, fi):
    t = fi / FPS; c = main.getCanvas()
    shk = 0.0
    for nm in TL:
        for b in TL[nm]['brk']:
            if 0 <= t - b < 0.12: shk = max(shk, 5 * (1 - (t - b) / 0.12))
    if 0 <= t - WIN_T < 0.6: shk = max(shk, 22 * (1 - (t - WIN_T) / 0.6))
    c.save(); c.translate(shk * math.sin(t * 97), shk * math.cos(t * 83))
    bg = skia.Paint(); bg.setShader(skia.GradientShader.MakeLinear([skia.Point(0, 0), skia.Point(0, H)], [skia.ColorSetRGB(8, 8, 22), skia.ColorSetRGB(3, 3, 10)])); c.drawRect(skia.Rect(0, 0, W, H), bg)
    for (x, y, s, ph) in STARS: c.drawCircle(x, y, s, skia.Paint(AntiAlias=True, Color=skia.Color4f(0.8, 0.85, 1, 0.3 + 0.3 * math.sin(t * 2 + ph)).toColor()))
    lc = layer.getCanvas(); lc.clear(skia.ColorTRANSPARENT)
    for ln in LANES: draw_lane(lc, ln, fi, t)
    img = layer.makeImageSnapshot()
    sc = small.getCanvas(); sc.clear(skia.ColorTRANSPARENT); sc.drawImageRect(img, skia.Rect(0, 0, SW, SH), SAMP); simg = small.makeImageSnapshot()
    for sigma, amt in ((2.0, 0.7), (8.0, 0.45)):
        p = skia.Paint(); p.setImageFilter(skia.ImageFilters.Blur(sigma, sigma)); p.setBlendMode(skia.BlendMode.kPlus); p.setAlphaf(amt)
        c.saveLayer(None, None); c.scale(4, 4); c.drawImage(simg, 0, 0, SAMP, p); c.restore()
    c.drawImage(img, 0, 0)
    # ---- header (short) ----
    resetting = t >= RESET0
    hL, sL = COL["L"]; hR, sR = COL["R"]
    f = skia.Font(BEBAS, 128); wl, wv, wr = f.measureText("100 ×2"), f.measureText("  VS  "), f.measureText("1 ×3")
    x = 540 - (wl + wv + wr) / 2
    text(c, "100 ×2", x, 170, 128, hsv(hL, sL, 1.0), BEBAS, glow=hsv(hL, sL, 1.0), align="left")
    text(c, "  VS  ", x + wl, 170, 128, skia.ColorWHITE, BEBAS, align="left")
    text(c, "1 ×3", x + wl + wv, 170, 128, hsv(hR, sR, 1.0), BEBAS, glow=hsv(hR, sR, 1.0), align="left")
    lead = None
    if START < t < WIN_T:
        kL = lane_state("L", t)[0]; kR = lane_state("R", t)[0]; lead = "L" if kL > kR else ("R" if kR > kL else None)
    for ln in LANES:
        nm = ln["name"]; h, s = COL[nm]; cx = (ln["x0"] + ln["x1"]) / 2
        k, hp, cnt = lane_state(nm, t) if not resetting else (0, HP[0], ln["n0"])
        if lead == nm: text(c, "LEADER", cx, 262, 38, skia.ColorSetRGB(255, 215, 90), BEBAS, glow=skia.ColorSetRGB(255, 150, 40))
        n = cnt if t < TL[nm]["finish"] or resetting else TL[nm]["final"]
        size = 104 if n < 1e8 else 80
        # the counter punches on every floor break
        lastb = max([b for b in TL[nm]["brk"] if b <= t] or [-9]); pk = 1 + 0.18 * max(0.0, 1 - (t - lastb) / 0.18)
        c.save(); c.translate(cx, 340); c.scale(pk, pk); text(c, fmt(n), 0, 0, size, skia.ColorWHITE, BEBAS, glow=hsv(h, s, 1.0)); c.restore()
        text(c, f"FLOOR {min(k + 1, FLOORS)}/{FLOORS}", cx, 400, 36, skia.ColorSetRGB(200, 205, 230), MONO)
    # ---- ×2 / ×3 popups on every break ----
    for ln in LANES:
        nm = ln["name"]; h, s = COL[nm]; cx = (ln["x0"] + ln["x1"]) / 2
        for j, b in enumerate(TL[nm]["brk"]):
            u = t - b
            if 0 <= u < 0.6 and not resetting:
                k3 = backout(u / 0.15); a = 1 - max(0.0, (u - 0.35) / 0.25)
                c.save(); c.translate(cx + (60 if j % 2 else -60), FY[j] - 30 - 120 * u); c.scale(k3, k3); c.rotate(-8 if j % 2 else 8)
                text(c, "×2" if nm == "L" else "×3", 0, 0, 84, skia.ColorWHITE, BEBAS, glow=hsv(h, s, 1.0), alpha=a); c.restore()
    # ---- hype ----
    def banner(msg, sub, u, dur, col=(255, 215, 90), glowc=(255, 120, 40)):
        if not (0 <= u < dur): return
        k3 = backout(u / 0.2) * (1 + 0.03 * math.sin(u * 2 * math.pi / (BEAT / 2))); a = 1 - max(0.0, (u - dur + 0.25) / 0.25)
        c.save(); c.translate(540, 1080); c.scale(k3, k3); c.rotate(-4)
        p = skia.Paint(AntiAlias=True, Color=skia.Color4f(0.02, 0.02, 0.06, 0.82 * a).toColor()); c.drawRoundRect(skia.Rect(-500, -120, 500, 70 if not sub else 140), 26, 26, p)
        text(c, msg, 0, 30, 150, skia.ColorSetRGB(*col), BEBAS, glow=skia.ColorSetRGB(*glowc), alpha=a)
        if sub: text(c, sub, 0, 115, 64, skia.ColorWHITE, BEBAS, alpha=a)
        c.restore()
    hook_u = t if t < 3.3 else (t - (D - 0.45) if t >= D - 0.45 else -1)
    if t < 3.3 or t >= D - 0.45:
        uu = 0.5 if t >= D - 0.45 else max(0.5, t)            # identical on frame 0 and the last frames (loop)
        banner("PICK A SIDE!", "THE ENDING IS CRAZY", uu, 99)
        for side, xx in ((-1, 150), (1, 930)):
            on = (int(t / (BEAT / 2)) % 2 == (0 if side < 0 else 1))
            pth = skia.Path(); pth.moveTo(xx + side * 50, 1300); pth.lineTo(xx - side * 30, 1250); pth.lineTo(xx - side * 30, 1350); pth.close()
            c.drawPath(pth, skia.Paint(AntiAlias=True, Color=hsv(COL["L" if side < 0 else "R"][0], 0.8, 1.0, 1.0 if on else 0.35)))
    banner("TOO EASY?", None, t - 9.0, 1.4)
    banner("IT'S OVER...", None, t - 23.4, 1.6)
    banner("...OR IS IT?", None, t - 26.8, 1.6, col=(190, 255, 120), glowc=(80, 200, 60))
    banner("HERE IT COMES!", None, t - 31.4, 1.6, col=(190, 255, 120), glowc=(80, 200, 60))
    banner("FASTER!!!", None, t - 35.0, 1.4, col=(190, 255, 120), glowc=(80, 200, 60))
    # ---- winner / finish ----
    if WIN_T <= t < RESET0:
        u = t - WIN_T; nm = WINNER; ln = LANES[0] if nm == "L" else LANES[1]; h, s = COL[nm]; cx = (ln["x0"] + ln["x1"]) / 2
        k2 = backout(u / 0.25) * (1 + 0.04 * math.sin(u * 2 * math.pi / BEAT))
        for q in range(70):
            rq = np.random.default_rng(q); vx = rq.uniform(-260, 260); vy = rq.uniform(-900, -400); hq = rq.random(); sp = rq.uniform(4, 9)
            px = cx + vx * u; py = 1140 + vy * u + 700 * u * u
            if py < H + 20:
                c.save(); c.translate(px, py); c.rotate(u * 400 * (1 if q % 2 else -1)); c.drawRect(skia.Rect(-sp, -sp / 2, sp, sp / 2), skia.Paint(AntiAlias=True, Color=hsv(hq, 0.7, 1.0))); c.restore()
        c.save(); c.translate(cx, 1140); c.scale(k2, k2); c.rotate(-6)
        c.drawRoundRect(skia.Rect(-210, -70, 210, 50), 22, 22, skia.Paint(AntiAlias=True, Color=hsv(h, s, 0.85)))
        c.drawRoundRect(skia.Rect(-210, -70, 210, 50), 22, 22, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=7, Color=skia.ColorWHITE))
        text(c, "WINNER!", 0, 28, 100, skia.ColorWHITE, BEBAS); c.restore()
        if u > 0.6: text(c, "×3 COMEBACK!", cx, 1275, 64, skia.ColorWHITE, BEBAS, glow=hsv(h, s, 1.0), alpha=ease((u - 0.6) / 0.3))
        if u > 1.2: text(c, "DID YOU CALL IT?", 540, 1880, 56, skia.ColorSetRGB(255, 215, 90), BEBAS, glow=skia.ColorSetRGB(255, 150, 40), alpha=ease((u - 1.2) / 0.3))
    if not (WIN_T + 1.2 <= t < RESET0):
        text(c, "@HOWTOWITHZAY", 540, 1880, 24, skia.ColorSetRGB(120, 128, 170), MONO)
    c.restore()

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
