"""Blender (EEVEE) test still: the toothbrush hook shot, cel-shaded (3 tones via Shader-to-RGB + constant ramp),
Freestyle navy outlines, rendered at 360x640 without anti-aliasing, then upscaled x3 with nearest neighbour.
usage: blender -b -P blender_hook.py -- out.png"""
import bpy, math, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/hook.png"
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

def hexrgb(h, a=1.0):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x ** 2.2 for x in c] + [a]

def toon(name, dark, mid, light, spec=None):
    """diffuse -> Shader to RGB -> constant ramp (3 bands) -> emission; optional hard specular dot"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = nt.nodes.new("ShaderNodeShaderToRGB"); nt.links.new(dif.outputs[0], s2r.inputs[0])
    bw = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(s2r.outputs[0], bw.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements; e[0].position = 0.0; e[0].color = hexrgb(dark); e[1].position = 0.18; e[1].color = hexrgb(mid)
    e3 = e.new(0.55); e3.color = hexrgb(light)
    nt.links.new(bw.outputs[0], ramp.inputs[0])
    col = ramp.outputs[0]
    if spec:
        gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.15
        s2 = nt.nodes.new("ShaderNodeShaderToRGB"); nt.links.new(gl.outputs[0], s2.inputs[0])
        bw2 = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(s2.outputs[0], bw2.inputs[0])
        th = nt.nodes.new("ShaderNodeMath"); th.operation = "GREATER_THAN"; th.inputs[1].default_value = 0.6; nt.links.new(bw2.outputs[0], th.inputs[0])
        mix = nt.nodes.new("ShaderNodeMixRGB"); mix.inputs[2].default_value = hexrgb(spec)
        nt.links.new(th.outputs[0], mix.inputs[0]); nt.links.new(ramp.outputs[0], mix.inputs[1]); col = mix.outputs[0]
    em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(col, em.inputs[0])
    nt.links.new(em.outputs[0], out.inputs[0])
    return m

MAT = {
    "tooth": toon("tooth", "#c9b89a", "#efe6d2", "#fffaf0", "#ffffff"),
    "gum": toon("gum", "#b8485e", "#e8707f", "#ff9aa6"),
    "mouth": toon("mouth", "#2a0810", "#4a1020", "#5e1628"),
    "tongue": toon("tongue", "#9a2a40", "#d0485e", "#ee6a7e"),
    "choc": toon("choc", "#2e160a", "#5a2e14", "#7a4220", "#c08a5a"),
    "white": toon("white", "#a9b2c8", "#dfe4ef", "#ffffff", "#ffffff"),
    "blue": toon("blue", "#14307a", "#2a5ad0", "#4a86f0", "#bfe0ff"),
    "bristle": toon("bristle", "#9aa8c8", "#e6ecf8", "#ffffff"),
    "bristleB": toon("bristleB", "#1f5ab0", "#3a8ae8", "#7ab8ff"),
    "red": toon("red", "#9a1830", "#e2384d", "#ff6a7a", "#ffffff"),
    "foam": toon("foam", "#b8c8e0", "#eef3fb", "#ffffff"),
}

def add(obj, mat):
    obj.data.materials.append(MAT[mat]); return obj

def bevel_sub(obj, width=0.1, seg=3, sub=2):
    b = obj.modifiers.new("bev", "BEVEL"); b.width = width; b.segments = seg
    s = obj.modifiers.new("sub", "SUBSURF"); s.levels = sub; s.render_levels = sub
    bpy.context.view_layer.objects.active = obj; bpy.ops.object.shade_smooth()

# ---------------- mouth ----------------
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -6)); bpy.context.object.rotation_euler = (math.pi / 2, 0, 0)
bpy.context.object.location = (0, 8, 0); add(bpy.context.object, "mouth")
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, 3.0, -4.6)); o = bpy.context.object; o.scale = (5.2, 3.0, 1.4); add(o, "tongue"); bpy.ops.object.shade_smooth()
ARCH = lambda i: (i * 1.02, 0.12 * i * i, 0.0)
for row, zc, flip in ((0, 1.6, 1), (1, -1.6, -1)):
    # gums: a smooth arch made of overlapping ellipsoids
    for gx in [k * 0.9 for k in range(-5, 6)]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(gx, 0.12 * (gx / 1.02) ** 2 + 0.55, zc + flip * 1.05)); g = bpy.context.object
        g.scale = (0.85, 0.75, 0.62); bpy.ops.object.shade_smooth(); add(g, "gum")
    for i in range(-3, 4):
        x, y, _ = ARCH(i)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, zc)); t = bpy.context.object
        w = 0.9 if abs(i) < 2 else 0.85
        t.scale = (w, 0.75, 1.25); t.rotation_euler = (0, 0, -0.12 * i)
        bevel_sub(t, 0.18, 3, 2); add(t, "tooth")
# chocolate smudges on teeth
for (i, zc, sc) in ((-1, 1.45, 0.42), (0, 1.75, 0.3), (1, -1.5, 0.38)):
    x, y, _ = ARCH(i)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(x + 0.05, y - 0.42, zc)); o = bpy.context.object
    o.scale = (sc, 0.08, sc * 0.65); add(o, "choc"); bpy.ops.object.shade_smooth()
# a chocolate bar top-left
bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.4, -1.8, 3.6)); o = bpy.context.object; o.scale = (2.6, 1.4, 0.4); o.rotation_euler = (0.4, 0.2, 0.5)
bevel_sub(o, 0.06, 2, 1); add(o, "choc")
for k in range(3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.4 + (k - 1) * 0.85, -1.8, 3.85)); o = bpy.context.object; o.scale = (0.7, 1.2, 0.12); o.rotation_euler = (0.4, 0.2, 0.5); bevel_sub(o, 0.04, 2, 1); add(o, "choc")

# ---------------- toothbrush (local: head at origin, handle going down/out) ----------------
brush = bpy.data.objects.new("brush", None); scn.collection.objects.link(brush)
def child(o): o.parent = brush; return o
bpy.ops.mesh.primitive_cylinder_add(radius=0.62, depth=0.32, vertices=40, location=(0, 0, 0)); h = child(bpy.context.object); h.rotation_euler = (math.pi / 2, 0, 0)
bevel_sub(h, 0.08, 3, 1); add(h, "white")
bpy.ops.mesh.primitive_cylinder_add(radius=0.66, depth=0.06, vertices=40, location=(0, 0.17, 0)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0); add(o, "blue")
# bristle tufts (face -y, toward the teeth)
import random; random.seed(3)
tufts = [(0, 0)] + [(0.24 * math.cos(a), 0.24 * math.sin(a)) for a in [k * math.pi / 2 for k in range(4)]] + [(0.46 * math.cos(a), 0.46 * math.sin(a)) for a in [k * math.pi / 4 + 0.2 for k in range(8)]]
for k, (x, z) in enumerate(tufts):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.42, vertices=10, location=(x, -0.36, z)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0)
    bevel_sub(o, 0.04, 2, 1); add(o, "bristleB" if k % 3 == 0 else "bristle")
# neck + handle
bpy.ops.mesh.primitive_cone_add(radius1=0.42, radius2=0.22, depth=2.8, vertices=32, location=(0, 0.25, -1.9)); o = child(bpy.context.object); o.rotation_euler = (0, 0, 0)
bevel_sub(o, 0.05, 2, 1); add(o, "white")
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.25, -6.4)); o = child(bpy.context.object); o.scale = (1.2, 1.05, 6.4); bevel_sub(o, 0.45, 5, 2); add(o, "white")
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.25, -7.6)); o = child(bpy.context.object); o.scale = (1.26, 1.1, 2.4); bevel_sub(o, 0.45, 5, 2); add(o, "blue")
bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=0.12, vertices=24, location=(0, -0.3, -4.1)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0); bevel_sub(o, 0.03, 2, 1); add(o, "red")
# pose the brush: head on the upper-left teeth, handle coming toward the camera, bottom-right
from mathutils import Matrix
b = Vector((0.75, 1.0, 0.1)).normalized()                 # bristles point into the teeth
h = Vector((0.6, -0.55, -0.75)); h = (h - h.dot(b) * b).normalized()   # handle comes down-right toward camera
ly, lz = -b, -h; lx = ly.cross(lz)
brush.matrix_world = Matrix(((lx.x, ly.x, lz.x, 0.35), (lx.y, ly.y, lz.y, -1.05), (lx.z, ly.z, lz.z, 1.25), (0, 0, 0, 1)))
# foam: metaballs around the head
random.seed(7)
for k in range(30):
    a = random.uniform(0, 2 * math.pi); r = random.uniform(0.55, 1.1)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(0.1, 0.22), location=(0.35 + r * math.cos(a), -0.75 + random.uniform(-0.25, 0.1), 1.25 + 0.85 * r * math.sin(a)))
    bpy.ops.object.shade_smooth(); add(bpy.context.object, "foam")

# ---------------- camera, light, render ----------------
bpy.ops.object.camera_add(location=(2.4, -15.0, 0.9)); cam = bpy.context.object; scn.camera = cam
cam.data.lens = 58
d = Vector((0.4, 0.4, 0.2)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.light_add(type="SUN", location=(4, -6, 8)); sun = bpy.context.object; sun.data.energy = 4.0
sun.rotation_euler = (Vector((0, 0, 0)) - sun.location).to_track_quat("-Z", "Y").to_euler()
scn.render.engine = "BLENDER_EEVEE"
scn.eevee.taa_render_samples = 1
scn.render.resolution_x, scn.render.resolution_y = 360, 640
scn.render.filter_size = 0.0
scn.view_settings.view_transform = "Standard"
scn.world = bpy.data.worlds.new("w"); scn.world.color = (0.03, 0.005, 0.01)
scn.render.use_freestyle = True; scn.render.line_thickness_mode = "ABSOLUTE"; scn.render.line_thickness = 1.0
ls = scn.view_layers[0].freestyle_settings.linesets[0] if scn.view_layers[0].freestyle_settings.linesets else scn.view_layers[0].freestyle_settings.linesets.new("ls")
ls.select_by_visibility = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("navy")
ls.linestyle.color = (0.06, 0.07, 0.17); ls.linestyle.thickness = 1.0
scn.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("RENDERED", OUT)
