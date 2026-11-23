"""Blender (EEVEE) hook still v2 — anime look: hard 2-tone cel shading with hue-shifted shadows, anime streak
highlights, Freestyle contour + crease lines, radial speed lines + sparkles, dutch-angle close-up, irregular shapes
(chocolate smears with drips, clustered foam, incisor-shaped teeth). 360x640, no AA, upscaled x3 nearest.
usage: blender -b -P blender_hook_anime.py -- out.png"""
import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix, noise

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/hook2.png"
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
random.seed(11)

def lin(h):
    h = h.lstrip("#"); return [(int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)] + [1.0]

def anime(name, shadow, base, hi=None, cut=0.42, spec_cut=0.72, emissive=False):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    if emissive:
        em.inputs[0].default_value = lin(base); nt.links.new(em.outputs[0], out.inputs[0]); return m
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); s2r = nt.nodes.new("ShaderNodeShaderToRGB"); nt.links.new(dif.outputs[0], s2r.inputs[0])
    bw = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(s2r.outputs[0], bw.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements; e[0].position = 0; e[0].color = lin(shadow); e[1].position = cut; e[1].color = lin(base)
    nt.links.new(bw.outputs[0], ramp.inputs[0]); col = ramp.outputs[0]
    if hi:
        gl = nt.nodes.new("ShaderNodeBsdfAnisotropic") if hasattr(bpy.types, "ShaderNodeBsdfAnisotropic") else nt.nodes.new("ShaderNodeBsdfGlossy")
        gl.inputs["Roughness"].default_value = 0.08
        s2 = nt.nodes.new("ShaderNodeShaderToRGB"); nt.links.new(gl.outputs[0], s2.inputs[0])
        b2 = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(s2.outputs[0], b2.inputs[0])
        th = nt.nodes.new("ShaderNodeMath"); th.operation = "GREATER_THAN"; th.inputs[1].default_value = spec_cut; nt.links.new(b2.outputs[0], th.inputs[0])
        mix = nt.nodes.new("ShaderNodeMixRGB"); mix.inputs[2].default_value = lin(hi); nt.links.new(th.outputs[0], mix.inputs[0]); nt.links.new(col, mix.inputs[1]); col = mix.outputs[0]
    nt.links.new(col, em.inputs[0]); nt.links.new(em.outputs[0], out.inputs[0]); return m

M = {
    "tooth": anime("tooth", "#b9a6c8", "#fff8ec", "#ffffff"), "gum": anime("gum", "#c2456a", "#ff8fa2", "#ffd0da"), "back": anime("back", "#1a0612", "#2e0a1c"),
    "tongue": anime("tongue", "#8a1f44", "#d94a68", "#ff9ab0"), "choc": anime("choc", "#2a1208", "#6b3418", "#c98a5a"),
    "white": anime("white", "#9aa3c8", "#f4f6ff", "#ffffff"), "blue": anime("blue", "#1a2f8a", "#3a6af0", "#a8c8ff"), "cyan": anime("cyan", "#1a6aa0", "#4ac8ff", "#e0f8ff"),
    "bristleA": anime("bristleA", "#8a96c0", "#eef2ff", "#ffffff"), "bristleB": anime("bristleB", "#1f4aa8", "#3a9af0", "#d8f0ff"),
    "foam": anime("foam", "#a8b8e0", "#ffffff", "#ffffff", cut=0.3), "red": anime("red", "#8a1030", "#ff3a5a", "#ffd0d8"),
    "line": anime("line", "#ffffff", "#ffffff", emissive=True), "spark": anime("spark", "#fff6c8", "#fff6c8", emissive=True),
    "lineD": anime("lineD", "#7a2a55", "#7a2a55", emissive=True),
}
def put(o, mat, smooth=True):
    o.data.materials.append(M[mat])
    if smooth and o.type == "MESH":
        for p in o.data.polygons: p.use_smooth = True
    return o
def sub(o, lv=2, bev=None, seg=3):
    if bev: b = o.modifiers.new("b", "BEVEL"); b.width = bev; b.segments = seg
    s = o.modifiers.new("s", "SUBSURF"); s.levels = lv; s.render_levels = lv
    return o
def displace(o, strength, size):
    tex = bpy.data.textures.new("n" + o.name, "CLOUDS"); tex.noise_scale = size
    d = o.modifiers.new("d", "DISPLACE"); d.texture = tex; d.strength = strength; return o

# ---------------- mouth back + speed lines ----------------
bpy.ops.mesh.primitive_plane_add(size=90, location=(0, 9, 0)); o = bpy.context.object; o.rotation_euler = (math.pi / 2, 0, 0); put(o, "back", False)
FOCUS = Vector((-0.3, 8.9, 1.0))
for k in range(46):
    a = k / 46 * 2 * math.pi + random.uniform(-0.05, 0.05); r0 = random.uniform(5.5, 9); r1 = r0 + random.uniform(8, 18); w = random.uniform(0.05, 0.22)
    p0 = FOCUS + Vector((r0 * math.cos(a), 0, r0 * math.sin(a))); p1 = FOCUS + Vector((r1 * math.cos(a), 0, r1 * math.sin(a))); n = Vector((-math.sin(a), 0, math.cos(a))) * w
    me = bpy.data.meshes.new("sl"); me.from_pydata([p0, p1 + n, p1 - n], [], [(0, 1, 2)]); ob = bpy.data.objects.new("sl", me); scn.collection.objects.link(ob)
    ob.data.materials.append(M["lineD"] if k % 3 else M["line"])
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, 4.5, -5.2)); o = bpy.context.object; o.scale = (6.5, 3.5, 1.6); sub(o, 1); put(o, "tongue")

# ---------------- teeth (incisor shapes) + scalloped gums ----------------
def tooth(x, y, z, flip, w, h, rot):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w * (1.0 - 0.18 * (v.co.z * flip + 0.5)); v.co.y *= 0.62; v.co.z *= h
        v.co.y -= 0.12 * (v.co.x / w) ** 2 * 2          # front face slightly convex
    me = bpy.data.meshes.new("tooth"); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new("tooth", me); scn.collection.objects.link(ob)
    ob.location = (x, y, z); ob.rotation_euler = (0, 0, rot); sub(ob, 2, bev=0.12, seg=2); put(ob, "tooth"); return ob
ARCH = lambda i: (i * 1.08, 0.16 * i * i)
for zc, flip in ((1.55, 1), (-1.6, -1)):
    for i in range(-4, 5):
        x, y = ARCH(i); w = 1.0 if abs(i) < 2 else 0.92
        tooth(x, y, zc, flip, w, 1.35 if abs(i) < 2 else 1.2, -0.14 * i)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(x, y + 0.5, zc + flip * 0.92)); g = bpy.context.object
        g.scale = (0.62, 0.55, 0.42); sub(g, 1); put(g, "gum")
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 1.6, zc + flip * 1.6)); g = bpy.context.object; g.scale = (12, 1.6, 1.0); sub(g, 2, bev=0.3); put(g, "gum")

# ---------------- chocolate: smears with drips (irregular) ----------------
def smear(x, y, z, s, drips):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=12, location=(x, y - 0.38, z)); o = bpy.context.object
    o.scale = (s * 1.3, 0.12, s * 0.8); o.rotation_euler = (0, random.uniform(-0.4, 0.4), 0); displace(o, 0.25, 0.4); sub(o, 1); put(o, "choc")
    for d in range(drips):
        dx = random.uniform(-s, s); L = random.uniform(0.25, 0.6)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=L, location=(x + dx, y - 0.4, z - s * 0.5 - L / 2)); c = bpy.context.object; sub(c, 1); put(c, "choc")
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(x + dx, y - 0.4, z - s * 0.5 - L)); put(bpy.context.object, "choc")
x, y = ARCH(-1); smear(x, y, 1.45, 0.45, 2)
x, y = ARCH(1); smear(x, y, -1.4, 0.38, 1)
x, y = ARCH(-3); smear(x, y, -1.5, 0.3, 1)
# flying chocolate crumbs
for k in range(14):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=random.uniform(0.05, 0.12), subdivisions=1, location=(random.uniform(-1.6, 1.4), random.uniform(-2.5, -1.0), random.uniform(-0.6, 2.4)))
    o = bpy.context.object; o.rotation_euler = (random.random() * 3, random.random() * 3, 0); put(o, "choc", False)

# ---------------- the brush ----------------
brush = bpy.data.objects.new("brush", None); scn.collection.objects.link(brush)
def child(o): o.parent = brush; return o
# head: rounded disc with a raised blue rubber rim + a back plate
bpy.ops.mesh.primitive_cylinder_add(radius=0.62, depth=0.3, vertices=48, location=(0, 0, 0)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0); sub(o, 2, bev=0.1); put(o, "white")
bpy.ops.mesh.primitive_torus_add(major_radius=0.62, minor_radius=0.06, location=(0, 0.14, 0)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0); put(o, "blue")
# bristle tufts: tapered, slightly splayed, two colours
rings = [(0, 1)] + [(0.24, 5)] + [(0.47, 10)]
for r, n in rings:
    for k in range(n):
        a = k / n * 2 * math.pi + (0.3 if r > 0.3 else 0)
        bpy.ops.mesh.primitive_cone_add(radius1=0.11, radius2=0.075, depth=0.45, vertices=10, location=(r * math.cos(a), -0.38, r * math.sin(a)))
        o = child(bpy.context.object); o.rotation_euler = (math.pi / 2 + 0.15 * r * math.sin(a), 0, -0.15 * r * math.cos(a)); sub(o, 1, bev=0.03); put(o, "bristleB" if (k + int(r * 10)) % 3 == 0 else "bristleA")
# neck: a swept tapered shape + handle with grip ridges + button
bpy.ops.mesh.primitive_cone_add(radius1=0.45, radius2=0.2, depth=3.0, vertices=32, location=(0, 0.22, -1.9)); o = child(bpy.context.object); sub(o, 2, bev=0.05); put(o, "white")
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.22, -6.6)); o = child(bpy.context.object); o.scale = (1.25, 1.1, 6.6); sub(o, 2, bev=0.5, seg=5); put(o, "white")
for k in range(6):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.36, -7.2 - k * 0.36)); o = child(bpy.context.object); o.scale = (0.9, 0.12, 0.16); sub(o, 2, bev=0.05); put(o, "cyan")
bpy.ops.mesh.primitive_cylinder_add(radius=0.24, depth=0.14, vertices=32, location=(0, -0.38, -4.4)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0); sub(o, 1, bev=0.04); put(o, "red")
b = Vector((0.55, 1.0, 0.25)).normalized(); h = Vector((0.75, -0.45, -0.65)); h = (h - h.dot(b) * b).normalized()
ly, lz = -b, -h; lx = ly.cross(lz)
brush.matrix_world = Matrix(((lx.x, ly.x, lz.x, 0.0), (lx.y, ly.y, lz.y, -1.05), (lx.z, ly.z, lz.z, 1.3), (0, 0, 0, 1)))

# ---------------- foam: clustered bubbles of mixed sizes + specks ----------------
for k in range(34):
    a = random.uniform(0, 2 * math.pi); r = random.uniform(0.75, 1.35)
    rad = random.choice([0.05, 0.07, 0.09, 0.12, 0.16])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=rad, segments=16, ring_count=8, location=(r * math.cos(a) - 0.1, -0.75 + random.uniform(-0.2, 0.1), 1.3 + 0.9 * r * math.sin(a)))
    put(bpy.context.object, "foam")
# sparkles (4-point stars)
def star(p, s):
    pts = [Vector((0, 0, 0))]; faces = []
    for k in range(8):
        a = k * math.pi / 4; r = s if k % 2 == 0 else s * 0.22
        pts.append(Vector((r * math.cos(a), 0, r * math.sin(a))))
    for k in range(8): faces.append((0, 1 + k, 1 + (k + 1) % 8))
    me = bpy.data.meshes.new("star"); me.from_pydata([p + v for v in pts], [], faces); ob = bpy.data.objects.new("star", me); scn.collection.objects.link(ob); ob.data.materials.append(M["spark"])
for p, s in ((Vector((-2.4, -0.9, 2.3)), 0.35), (Vector((2.6, -0.6, 0.4)), 0.25), (Vector((-1.0, -0.9, -2.6)), 0.2), (Vector((1.9, -0.8, 2.6)), 0.18)): star(p, s)

# ---------------- camera, light, render ----------------
bpy.ops.object.camera_add(location=(2.2, -10.5, 1.4)); cam = bpy.context.object; scn.camera = cam; cam.data.lens = 46
d = Vector((-0.1, 0.5, 0.7)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.rotation_euler.rotate_axis("Z", math.radians(-9))
bpy.ops.object.light_add(type="SUN", location=(-4, -8, 7)); sun = bpy.context.object; sun.data.energy = 4.5; sun.data.angle = 0.0
sun.rotation_euler = (Vector((0.5, 0, -0.5)) - sun.location).to_track_quat("-Z", "Y").to_euler()
scn.render.engine = "BLENDER_EEVEE"; scn.eevee.taa_render_samples = 1; scn.eevee.use_soft_shadows = False
scn.render.resolution_x, scn.render.resolution_y = 360, 640; scn.render.filter_size = 0.0
scn.view_settings.view_transform = "Standard"
scn.world = bpy.data.worlds.new("w"); scn.world.color = (0.02, 0.003, 0.01)
scn.render.use_freestyle = True; scn.render.line_thickness_mode = "ABSOLUTE"; scn.render.line_thickness = 1.25
fs = scn.view_layers[0].freestyle_settings; fs.crease_angle = math.radians(125)
ls = fs.linesets[0] if fs.linesets else fs.linesets.new("ls")
ls.select_by_visibility = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True; ls.select_contour = True
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("ink")
ls.linestyle.color = (0.05, 0.02, 0.09); ls.linestyle.thickness = 1.25
scn.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("RENDERED", OUT)
