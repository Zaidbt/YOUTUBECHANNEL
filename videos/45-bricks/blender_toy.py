"""Blender EEVEE still: video 045 frame in a modern 3D 'toy' mobile-game look — rounded plastic bricks (heart),
glossy balls, a soft rounded tray, soft studio light with real shadows + AO, bright clean background, gentle bloom.
usage: blender -b -P blender_toy.py -- frame.json out.png"""
import bpy, json, math, sys, colorsys
from mathutils import Vector
args = sys.argv[sys.argv.index("--") + 1:]
F = json.load(open(args[0])); OUT = args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
AX0, AX1, AY0, AY1 = 70.0, 1010.0, 560.0, 1780.0
COLS, ROWS = 30, 26; BW, BH = (AX1 - AX0 - 40) / COLS, 20.0; BX0, BY0 = AX0 + 20, 640.0
S = 0.01                                     # 1 px = 1 cm
def P(x, y, z=0.0): return Vector(((x - 540) * S, -(y - 1170) * S, z))

def mat(name, rgb, rough=0.35, spec=0.5, coat=0.0, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = coat
    if emit: b.inputs["Emission Color"].default_value = (*rgb, 1); b.inputs["Emission Strength"].default_value = emit
    return m
def srgb(h, s, v): r, g, b = colorsys.hsv_to_rgb(h, s, v); return tuple(c ** 2.2 for c in (r, g, b))

# tray: rounded base + walls
bpy.ops.mesh.primitive_cube_add(size=1, location=P(540, 1170, -0.12)); tray = bpy.context.object
tray.scale = ((AX1 - AX0 + 60) * S, (AY1 - AY0 + 60) * S, 0.2)
bv = tray.modifiers.new("b", "BEVEL"); bv.width = 0.25; bv.segments = 8
tray.data.materials.append(mat("tray", srgb(0.68, 0.62, 0.62), rough=0.55))
for (x0, y0, x1, y1) in ((AX0 - 30, AY0 - 30, AX1 + 30, AY0 - 6), (AX0 - 30, AY1 + 6, AX1 + 30, AY1 + 30), (AX0 - 30, AY0 - 30, AX0 - 6, AY1 + 30), (AX1 + 6, AY0 - 30, AX1 + 30, AY1 + 30)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=P((x0 + x1) / 2, (y0 + y1) / 2, 0.12)); w = bpy.context.object
    w.scale = ((x1 - x0) * S, (y1 - y0) * S, 0.3); b2 = w.modifiers.new("b", "BEVEL"); b2.width = 0.08; b2.segments = 6
    w.data.materials.append(mat("wall", srgb(0.64, 0.6, 1.0), rough=0.35, coat=0.5))
# bricks: one mesh per colour band, instanced cubes with bevel
mats = {}
alive = F["alive"]; hp0 = F["hp0"]; hpmax = max(max(r) for r in hp0)
bpy.ops.mesh.primitive_cube_add(size=1); proto = bpy.context.object; proto.scale = ((BW - 3) * S, (BH - 3) * S, 0.14)
bvp = proto.modifiers.new("b", "BEVEL"); bvp.width = 0.035; bvp.segments = 5; bpy.ops.object.modifier_apply(modifier="b")
bpy.ops.object.transform_apply(scale=True)
for r in range(ROWS):
    for c in range(COLS):
        hp = alive[r][c]
        if hp <= 0: continue
        tough = (hp - 1) / max(1, hpmax - 1)
        key = (r // 4, round(tough * 3))
        if key not in mats:
            h = [0.97, 0.03, 0.09, 0.14, 0.33, 0.55, 0.75][key[0] % 7]
            mats[key] = mat(f"b{key}", srgb(h, 0.78 + 0.07 * key[1], 1.0 - 0.1 * key[1]), rough=0.25, coat=0.7)
        o = proto.copy(); o.data = proto.data.copy(); scn.collection.objects.link(o)
        o.location = P(BX0 + (c + 0.5) * BW, BY0 + (r + 0.5) * BH, 0.07 + 0.02 * tough); o.data.materials.append(mats[key])
bpy.data.objects.remove(proto)
# balls
bm = mat("ball", srgb(0.0, 0.0, 1.0), rough=0.12, coat=1.0)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.085, segments=24, ring_count=12); ball = bpy.context.object; bpy.ops.object.shade_smooth(); ball.data.materials.append(bm)
for (x, y) in F["pos"]:
    o = ball.copy(); scn.collection.objects.link(o); o.location = P(x, y, 0.09)
bpy.data.objects.remove(ball)
# light + world + camera
bpy.ops.object.light_add(type="AREA", location=(-6, -8, 18)); key = bpy.context.object; key.data.energy = 9000; key.data.size = 6
key.rotation_euler = (Vector((0, 0, 0)) - key.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.light_add(type="AREA", location=(9, 5, 9)); fill = bpy.context.object; fill.data.energy = 2000; fill.data.size = 6; fill.data.color = (0.8, 0.9, 1.0)
fill.rotation_euler = (Vector((0, 0, 0)) - fill.location).to_track_quat("-Z", "Y").to_euler()
scn.world = bpy.data.worlds.new("w"); scn.world.use_nodes = True
bg = scn.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.55, 0.78, 1.0, 1); bg.inputs[1].default_value = 0.9
bpy.ops.object.camera_add(location=(0, -11.5, 27.0)); cam = bpy.context.object; scn.camera = cam; cam.data.lens = 55; cam.data.sensor_fit = 'VERTICAL'; cam.data.sensor_height = 36
cam.rotation_euler = (Vector((0, -1.6, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scn.render.engine = "BLENDER_EEVEE"; e = scn.eevee
e.taa_render_samples = 32; e.use_gtao = True; e.gtao_distance = 0.4; e.use_soft_shadows = True; e.use_bloom = True; e.bloom_intensity = 0.03
e.shadow_cube_size = "2048"; e.shadow_cascade_size = "2048"
scn.render.resolution_x, scn.render.resolution_y = 1080, 1920
scn.view_settings.view_transform = "Standard"; scn.view_settings.exposure = -0.55
scn.render.film_transparent = True
scn.render.filepath = OUT; bpy.ops.render.render(write_still=True); print("RENDERED", OUT)
