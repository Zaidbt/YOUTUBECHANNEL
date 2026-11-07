"""Profile picture for @howtowithzay (Instagram / YouTube / TikTok): "Zbot", a pixel inventor robot with a gear
antenna and a Z on its chest. 72x72 pixel grid, upscaled 15x to 1080x1080 with hard pixels. Circle-safe."""
import math, sys
from pathlib import Path
from PIL import Image

N = 72
OUT = Path(__file__).resolve().parents[1] / "social" / "profile-howtowithzay.png"
C = dict(
    bg0="#0d1030", bg1="#16205a", bg2="#21308a", glow="#2f4fc0",
    ink="#0a0a1a", g0="#8a4a10", g1="#d07a18", g2="#f5a623", g3="#ffd23f", g4="#fff2a8",
    s0="#0b1026", s1="#141c40", eye="#4af0ff", eye2="#bffcff", cheek="#ff6a8a",
    m0="#3a4470", m1="#6a78a8", m2="#a8b4d8", w="#ffffff", red="#ff3a4a",
)
bg = [[None] * N for _ in range(N)]
spr = [[None] * N for _ in range(N)]

OY = -3  # lift the whole sprite so the Z badge sits inside the circle crop
def put(x, y, c, layer=spr):
    if layer is spr: y += OY
    if 0 <= x < N and 0 <= y < N: layer[y][x] = C[c]
def rect(x0, y0, x1, y1, c):  # inclusive
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(x, y, c)
def rrect(x0, y0, x1, y1, r, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx = max(x0 + r - x, 0, x - (x1 - r)); dy = max(y0 + r - y, 0, y - (y1 - r))
            if dx * dx + dy * dy <= r * r + r * 0.6: put(x, y, c)

# ---- background: dithered radial glow ----
cx = cy = (N - 1) / 2
for y in range(N):
    for x in range(N):
        d = math.hypot(x - cx, y - cy - 2) / (N / 2)
        chk = (x + y) % 2 == 0
        c = "bg0"
        if d < 1.0: c = "bg1" if chk else "bg0"
        if d < 0.85: c = "bg1"
        if d < 0.72: c = "bg2" if chk else "bg1"
        if d < 0.6: c = "bg2"
        if d < 0.5: c = "glow" if chk else "bg2"
        put(x, y, c, bg)
# little orbiting gears / sparkles in the background
for (sx, sy) in [(10, 18), (61, 14), (8, 50), (63, 46)]:
    for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0), (0, 0)]: put(sx + dx, sy + dy, "g4" if (dx, dy) == (0, 0) else "g3", bg)

# ---- body / shoulders with the Z badge ----
rrect(15, 55, 56, 75, 6, "g2")
rect(15, 66, 56, 75, "g1"); rrect(15, 55, 56, 58, 3, "g3")
rrect(25, 57, 46, 74, 3, "s1")                 # chest plate
Z = ["############",
     "############",
     "       #### ",
     "      ####  ",
     "     ####   ",
     "    ####    ",
     "   ####     ",
     "  ####      ",
     "############",
     "############"]
zx, zy = 30, 60
for j, row in enumerate(Z):
    for i, ch in enumerate(row):
        if ch == "#":
            put(zx + i + 1, zy + j + 1, "ink")
for j, row in enumerate(Z):
    for i, ch in enumerate(row):
        if ch == "#": put(zx + i, zy + j, "w" if j < 2 else "g3" if j < 8 else "g2")
rect(18, 61, 20, 63, "m1"); rect(51, 61, 53, 63, "m1")  # bolts
put(18, 61, "m2"); put(51, 61, "m2")
rect(32, 52, 39, 55, "m0"); rect(32, 52, 39, 52, "m1")  # neck

# ---- antenna + gear ----
rect(35, 11, 36, 19, "m1"); rect(36, 11, 36, 19, "m0")
gx, gy = 35.5, 8.5
for y in range(-1, 19):
    for x in range(26, 46):
        dx, dy = x - gx, y - gy; rr = math.hypot(dx, dy); a = math.atan2(dy, dx)
        ph = (a / (2 * math.pi) * 8 + 8.25) % 1
        if (2.0 <= rr <= 5.2) or (5.2 < rr <= 7.4 and abs(ph - 0.5) < 0.2):
            put(x, y, "g4" if (dx + dy) < -5 else "g3" if (dx + dy) < 1 else "g2" if (dx + dy) < 5 else "g1")
            if 4.6 < rr <= 5.2 and (dx + dy) > 2: put(x, y, "g1")

# ---- head ----
rrect(13, 19, 58, 53, 7, "g2")
rrect(13, 19, 58, 25, 6, "g3"); rect(16, 21, 26, 22, "g4")      # top light + shine
rect(13, 47, 58, 53, "g1"); rrect(13, 49, 58, 53, 5, "g1")
for x in range(14, 58):                                           # bottom shade edge
    if spr[53][x]: put(x, 53, "g0")
# ear bolts
for ex in (8, 59):
    rrect(ex, 30, ex + 4, 41, 2, "m1"); rect(ex + 1, 32, ex + 3, 33, "m2"); rect(ex, 39, ex + 4, 41, "m0")
# screen face
rrect(18, 26, 53, 48, 5, "s0")
for y in range(27, 48, 2):
    for x in range(19, 53):
        if spr[y][x] == C["s0"] and (x + y) % 4 == 0: put(x, y, "s1")
# eyes: left open, right winking
rrect(23, 30, 30, 39, 2, "eye"); rect(24, 31, 26, 33, "eye2"); put(24, 31, "w")
for i, (x, y) in enumerate([(40, 36), (41, 35), (42, 34), (43, 34), (44, 34), (45, 34), (46, 35), (47, 36)]):
    rect(x, y, x, y + 1, "eye")                                     # ^ wink
# cheeks + smile
rect(20, 41, 22, 42, "cheek"); rect(49, 41, 51, 42, "cheek")
for x, y in [(30, 41), (31, 42), (32, 43), (33, 43), (34, 43), (35, 43), (36, 43), (37, 43), (38, 43), (39, 43), (40, 42), (41, 41)]:
    put(x, y, "eye")
put(34, 44, "red"); put(35, 44, "red"); put(36, 44, "red"); put(37, 44, "red")   # tongue
# ---- outline pass (1-px ink around the sprite) ----
out = [row[:] for row in spr]
for y in range(N):
    for x in range(N):
        if spr[y][x] is None and any(0 <= x + dx < N and 0 <= y + dy < N and spr[y + dy][x + dx] is not None
                                     for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            out[y][x] = C["ink"]

img = Image.new("RGB", (N, N))
for y in range(N):
    for x in range(N):
        img.putpixel((x, y), Image.new("RGB", (1, 1), out[y][x] or bg[y][x]).getpixel((0, 0)))
img = img.resize((1080, 1080), Image.NEAREST)
dst = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT
img.save(dst); print("saved", dst)
