"""Blender (EEVEE) hook still v3 — shonen anime look (dark-fantasy action anime vibe): full-res, no pixels;
hard 2-tone cel with very dark blue-tinted shadows, cyan rim light (fresnel), hard speculars, tapered ink lines
(Freestyle + along-stroke taper), glowing blue aura + lightning bolts + embers with bloom, radial speed lines,
low dramatic wide-angle camera, compositor glare + chromatic dispersion + vignette.
usage: blender -b -P blender_hook_shonen.py -- out.png"""
import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/hook3.png"
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
random.seed(21)

def lin(h, a=1.0):
    h = h.lstrip("#"); return [(int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)] + [a]

def cel(name, shadow, base, hi=None, rim="#7fe8ff", cut=0.45, spec_cut=0.8, rim_cut=0.72):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); s2r = nt.nodes.new("ShaderNodeShaderToRGB"); nt.links.new(dif.outputs[0], s2r.inputs[0])
    bw = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(s2r.outputs[0], bw.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements; e[0].position = 0; e[0].color = lin(shadow); e[1].position = cut; e[1].color = lin(base)
    nt.links.new(bw.outputs[0], ramp.inputs[0]); col = ramp.outputs[0]
    if hi:
        gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.06
        s2 = nt.nodes.new("ShaderNodeShaderToRGB"); nt.links.new(gl.outputs[0], s2.inputs[0])
        b2 = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(s2.outputs[0], b2.inputs[0])
        th = nt.nodes.new("ShaderNodeMath"); th.operation = "GREATER_THAN"; th.inputs[1].default_value = spec_cut; nt.links.new(b2.outputs[0], th.inputs[0])
        mix = nt.nodes.new("ShaderNodeMixRGB"); mix.inputs[2].default_value = lin(hi); nt.links.new(th.outputs[0], mix.inputs[0]); nt.links.new(col, mix.inputs[1]); col = mix.outputs[0]
    if rim:
        lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.5
        th = nt.nodes.new("ShaderNodeMath"); th.operation = "GREATER_THAN"; th.inputs[1].default_value = rim_cut; nt.links.new(lw.outputs["Facing"], th.inputs[0])
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; nt.links.new(th.outputs[0], mul.inputs[0]); nt.links.new(bw.outputs[0], mul.inputs[1])
        inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "LESS_THAN"; inv.inputs[1].default_value = cut; nt.links.new(bw.outputs[0], inv.inputs[0])
        andn = nt.nodes.new("ShaderNodeMath"); andn.operation = "MULTIPLY"; nt.links.new(th.outputs[0], andn.inputs[0]); nt.links.new(inv.outputs[0], andn.inputs[1])
        mix = nt.nodes.new("ShaderNodeMixRGB"); mix.inputs[2].default_value = lin(rim); nt.links.new(andn.outputs[0], mix.inputs[0]); nt.links.new(col, mix.inputs[1]); col = mix.outputs[0]
    nt.links.new(col, em.inputs[0]); nt.links.new(em.outputs[0], out.inputs[0]); return m

def glow(name, color, strength=6.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission"); em.inputs[0].default_value = lin(color); em.inputs[1].default_value = strength
    if alpha < 1.0:
        tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs[0].default_value = alpha
        nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs[0])
        m.blend_method = "BLEND"; m.shadow_method = "NONE"
    else:
        nt.links.new(em.outputs[0], out.inputs[0])
    return m

M = {
    "tooth": cel("tooth", "#3a3f6e", "#f2efe6", "#ffffff", cut=0.3), "gum": cel("gum", "#4a1238", "#d8506e", "#ffc0d0", rim="#ff9ac8"),
    "tongue": cel("tongue", "#2e0a26", "#a8304e", "#ff8aa8", rim="#ff6aa8"), "back": cel("back", "#04040c", "#0a0a1c", rim=None),
    "choc": cel("choc", "#120608", "#4a2410", "#d8a070", rim="#ff9a5a"), "white": cel("white", "#262c58", "#e8ecf8", "#ffffff"),
    "blue": cel("blue", "#0a1448", "#2a58e8", "#a8d0ff"), "cyan": cel("cyan", "#08345a", "#30b8f0", "#e0faff"),
    "bristleA": cel("bristleA", "#2a3060", "#dfe6ff", "#ffffff"), "bristleB": cel("bristleB", "#0a2a70", "#3a9af0", "#e0f4ff"),
    "foam": cel("foam", "#4a5a98", "#ffffff", "#ffffff", cut=0.35), "red": cel("red", "#3a0618", "#e8284a", "#ffd0d8"),
    "aura": glow("aura", "#3a8aff", 3.0, 0.12), "aura2": glow("aura2", "#9ad8ff", 4.0, 0.18), "bolt": glow("bolt", "#c8f0ff", 9.0),
    "ember": glow("ember", "#6ac8ff", 12.0), "speed": glow("speed", "#5a7aff", 2.5, 0.55), "speedW": glow("speedW", "#e0ecff", 4.0, 0.8),
}
def put(o, mat, smooth=True):
    o.data.materials.append(M[mat])
    if smooth and o.type == "MESH":
        for p in o.data.polygons: p.use_smooth = True
    return o
def sub(o, lv=2, bev=None, seg=3):
    if bev: b = o.modifiers.new("b", "BEVEL"); b.width = bev; b.segments = seg
    s = o.modifiers.new("s", "SUBSURF"); s.levels = lv; s.render_levels = lv; return o
def displace(o, strength, size):
    tex = bpy.data.textures.new("n" + o.name, "CLOUDS"); tex.noise_scale = size
    d = o.modifiers.new("d", "DISPLACE"); d.texture = tex; d.strength = strength; return o
def noline(o):
    o.visible_shadow = False
    return o

# ---------------- backdrop + radial speed lines ----------------
bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 12, 0)); o = bpy.context.object; o.rotation_euler = (math.pi / 2, 0, 0); put(o, "back", False)
FOCUS = Vector((0.2, 11.8, 1.6))
lines_col = bpy.data.collections.new("fx"); scn.collection.children.link(lines_col)
for k in range(90):
    a = k / 90 * 2 * math.pi + random.uniform(-0.03, 0.03); r0 = random.uniform(3.5, 7); r1 = r0 + random.uniform(10, 30); w = random.uniform(0.04, 0.3)
    p0 = FOCUS + Vector((r0 * math.cos(a), 0, r0 * math.sin(a))); p1 = FOCUS + Vector((r1 * math.cos(a), 0, r1 * math.sin(a))); n = Vector((-math.sin(a), 0, math.cos(a))) * w
    me = bpy.data.meshes.new("sl"); me.from_pydata([p0, p1 + n, p1 - n], [], [(0, 1, 2)]); ob = bpy.data.objects.new("sl", me); lines_col.objects.link(ob)
    ob.data.materials.append(M["speedW"] if k % 5 == 0 else M["speed"])
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, 5.0, -5.6)); o = bpy.context.object; o.scale = (7, 3.8, 1.7); sub(o, 1); put(o, "tongue")

# ---------------- teeth + gums ----------------
def tooth(x, y, z, flip, w, h, rot):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w * (1.0 - 0.2 * (v.co.z * flip + 0.5)); v.co.y *= 0.62; v.co.z *= h; v.co.y -= 0.24 * (v.co.x / w) ** 2
    me = bpy.data.meshes.new("tooth"); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new("tooth", me); scn.collection.objects.link(ob)
    ob.location = (x, y, z); ob.rotation_euler = (0, 0, rot); sub(ob, 2, bev=0.12, seg=2); put(ob, "tooth"); return ob
ARCH = lambda i: (i * 1.08, 0.16 * i * i)
for zc, flip in ((1.6, 1), (-1.65, -1)):
    for i in range(-4, 5):
        x, y = ARCH(i)
        tooth(x, y, zc, flip, 1.0 if abs(i) < 2 else 0.92, 1.4 if abs(i) < 2 else 1.2, -0.14 * i)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(x, y + 0.5, zc + flip * 0.92)); g = bpy.context.object; g.scale = (0.62, 0.55, 0.42); sub(g, 1); put(g, "gum")
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 1.6, zc + flip * 1.6)); g = bpy.context.object; g.scale = (12, 1.6, 1.0); sub(g, 2, bev=0.3); put(g, "gum")
def smear(x, y, z, s, drips):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=12, location=(x, y - 0.38, z)); o = bpy.context.object
    o.scale = (s * 1.3, 0.12, s * 0.8); o.rotation_euler = (0, random.uniform(-0.4, 0.4), 0); displace(o, 0.25, 0.4); sub(o, 1); put(o, "choc")
    for d in range(drips):
        dx = random.uniform(-s, s); L = random.uniform(0.25, 0.6)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=L, location=(x + dx, y - 0.4, z - s * 0.5 - L / 2)); c = bpy.context.object; sub(c, 1); put(c, "choc")
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(x + dx, y - 0.4, z - s * 0.5 - L)); put(bpy.context.object, "choc")
for (i, z, s, d) in ((-1, 1.5, 0.45, 2), (1, -1.45, 0.38, 1), (-3, -1.55, 0.3, 1), (2, 1.4, 0.32, 1)):
    x, y = ARCH(i); smear(x, y, z, s, d)
# chocolate chunks blasted away
for k in range(18):
    p = Vector((random.uniform(-2.2, 2.6), random.uniform(-4.0, -1.0), random.uniform(-0.6, 3.4)))
    bpy.ops.mesh.primitive_ico_sphere_add(radius=random.uniform(0.06, 0.18), subdivisions=1, location=p); o = bpy.context.object; o.rotation_euler = (random.random() * 3, random.random() * 3, 0); put(o, "choc", False)

# ---------------- the brush ----------------
brush = bpy.data.objects.new("brush", None); scn.collection.objects.link(brush)
def child(o): o.parent = brush; return o
bpy.ops.mesh.primitive_cylinder_add(radius=0.62, depth=0.3, vertices=48, location=(0, 0, 0)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0); sub(o, 2, bev=0.1); put(o, "white")
bpy.ops.mesh.primitive_torus_add(major_radius=0.62, minor_radius=0.06, location=(0, 0.14, 0)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0); put(o, "blue")
for r, n in [(0, 1), (0.24, 5), (0.47, 10)]:
    for k in range(n):
        a = k / n * 2 * math.pi + (0.3 if r > 0.3 else 0)
        bpy.ops.mesh.primitive_cone_add(radius1=0.11, radius2=0.075, depth=0.45, vertices=10, location=(r * math.cos(a), -0.38, r * math.sin(a)))
        o = child(bpy.context.object); o.rotation_euler = (math.pi / 2 + 0.15 * r * math.sin(a), 0, -0.15 * r * math.cos(a)); sub(o, 1, bev=0.03); put(o, "bristleB" if (k + int(r * 10)) % 3 == 0 else "bristleA")
bpy.ops.mesh.primitive_cone_add(radius1=0.45, radius2=0.2, depth=3.0, vertices=32, location=(0, 0.22, -1.9)); o = child(bpy.context.object); sub(o, 2, bev=0.05); put(o, "white")
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.22, -6.6)); o = child(bpy.context.object); o.scale = (1.25, 1.1, 6.6); sub(o, 2, bev=0.5, seg=5); put(o, "white")
for k in range(6):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.36, -7.2 - k * 0.36)); o = child(bpy.context.object); o.scale = (0.9, 0.12, 0.16); sub(o, 2, bev=0.05); put(o, "cyan")
bpy.ops.mesh.primitive_cylinder_add(radius=0.24, depth=0.14, vertices=32, location=(0, -0.38, -4.4)); o = child(bpy.context.object); o.rotation_euler = (math.pi / 2, 0, 0); sub(o, 1, bev=0.04); put(o, "red")
HEADP = Vector((0.0, -1.05, 1.35))
b = Vector((0.45, 1.0, 0.3)).normalized(); h = Vector((0.7, -0.5, -0.6)); h = (h - h.dot(b) * b).normalized()
ly, lz = -b, -h; lx = ly.cross(lz)
brush.matrix_world = Matrix(((lx.x, ly.x, lz.x, HEADP.x), (lx.y, ly.y, lz.y, HEADP.y), (lx.z, ly.z, lz.z, HEADP.z), (0, 0, 0, 1)))

# ---------------- aura, lightning, embers, foam ----------------
for k, (sc, mat) in enumerate(((1.25, "aura2"), (1.8, "aura"))):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=32, ring_count=16, location=HEADP); o = bpy.context.object
    o.scale = (sc, sc * 0.35, sc); displace(o, 0.3 * sc, 0.5); put(o, mat); o.visible_shadow = False
    lines_col.objects.link(o); scn.collection.objects.unlink(o)
def bolt(p0, d, n=9, step=0.32, jitter=0.35, width=0.035):
    pts = [p0.copy()]
    for k in range(n):
        q = pts[-1] + d.normalized() * step + Vector((random.uniform(-jitter, jitter), random.uniform(-0.1, 0.1), random.uniform(-jitter, jitter)))
        pts.append(q)
    cd = bpy.data.curves.new("bolt", "CURVE"); cd.dimensions = "3D"; cd.bevel_depth = width; cd.bevel_resolution = 1
    sp = cd.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for i, q in enumerate(pts): sp.points[i].co = (q.x, q.y, q.z, 1)
    ob = bpy.data.objects.new("bolt", cd); lines_col.objects.link(ob); cd.materials.append(M["bolt"])
for k in range(8):
    a = k / 8 * 2 * math.pi + random.uniform(-0.3, 0.3)
    bolt(HEADP + Vector((0.9 * math.cos(a), -0.1, 0.9 * math.sin(a))), Vector((math.cos(a), random.uniform(-0.4, 0.2), math.sin(a))), n=random.randint(5, 10))
for k in range(60):
    a = random.uniform(0, 2 * math.pi); r = random.uniform(0.8, 4.5)
    p = HEADP + Vector((r * math.cos(a), random.uniform(-1.5, 0.5), r * math.sin(a) * 1.3))
    bpy.ops.mesh.primitive_ico_sphere_add(radius=random.uniform(0.02, 0.06), subdivisions=1, location=p); o = bpy.context.object; put(o, "ember", False)
    lines_col.objects.link(o); scn.collection.objects.unlink(o)
for k in range(26):
    a = random.uniform(0, 2 * math.pi); r = random.uniform(0.8, 1.3)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.choice([0.05, 0.07, 0.09, 0.12, 0.15]), segments=16, ring_count=8,
                                         location=HEADP + Vector((r * math.cos(a), random.uniform(-0.15, 0.2), 0.9 * r * math.sin(a))))
    put(bpy.context.object, "foam")

# ---------------- camera (low, wide, dutch), sun, render settings ----------------
bpy.ops.object.camera_add(location=(3.0, -10.5, -1.9)); cam = bpy.context.object; scn.camera = cam; cam.data.lens = 26
d = Vector((-0.2, 1.0, 1.3)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.rotation_euler.rotate_axis("Z", math.radians(-12))
bpy.ops.object.light_add(type="SUN", location=(-5, -6, 8)); sun = bpy.context.object; sun.data.energy = 4.5; sun.data.angle = 0.0; sun.data.shadow_buffer_bias = 2.0
sun.rotation_euler = (Vector((0.5, 0, -0.5)) - sun.location).to_track_quat("-Z", "Y").to_euler()
scn.render.engine = "BLENDER_EEVEE"; scn.eevee.taa_render_samples = 16; scn.eevee.use_soft_shadows = False; scn.eevee.shadow_cascade_size = '4096'
scn.eevee.use_bloom = True; scn.eevee.bloom_threshold = 0.9; scn.eevee.bloom_intensity = 0.07; scn.eevee.bloom_radius = 6.0; scn.eevee.bloom_color = (0.55, 0.8, 1.0)
scn.render.resolution_x, scn.render.resolution_y = 1080, 1920
scn.view_settings.view_transform = "Standard"; scn.view_settings.look = "None"
scn.world = bpy.data.worlds.new("w"); scn.world.color = (0.003, 0.004, 0.012)
# ink lines: tapered, only on the solid objects (not fx)
scn.render.use_freestyle = True; scn.render.line_thickness_mode = "ABSOLUTE"
fs = scn.view_layers[0].freestyle_settings; fs.crease_angle = math.radians(125)
ls = fs.linesets[0] if fs.linesets else fs.linesets.new("ls")
ls.select_by_visibility = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True; ls.select_contour = True
ls.select_by_collection = True; ls.collection = lines_col; ls.collection_negation = "EXCLUSIVE"
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("ink")
st = ls.linestyle; st.color = (0.01, 0.01, 0.03); st.thickness = 7.0
tm = st.thickness_modifiers.new("taper", "ALONG_STROKE"); tm.mapping = "CURVE"; cm = tm.curve; pts = cm.curves[0].points
pts[0].location = (0, 0.35); pts[1].location = (1, 0.35); pts.new(0.5, 1.0); cm.update()
st.caps = "ROUND"
# compositor: glare + chromatic dispersion + vignette
scn.use_nodes = True; nt = scn.node_tree; nt.nodes.clear()
rl = nt.nodes.new("CompositorNodeRLayers"); comp = nt.nodes.new("CompositorNodeComposite")
gl = nt.nodes.new("CompositorNodeGlare"); gl.glare_type = "FOG_GLOW"; gl.quality = "HIGH"; gl.threshold = 0.85; gl.size = 8; gl.mix = -0.55
ld = nt.nodes.new("CompositorNodeLensdist"); ld.inputs["Dispersion"].default_value = 0.018
mask = nt.nodes.new("CompositorNodeEllipseMask"); mask.width = 0.95; mask.height = 0.75
blur = nt.nodes.new("CompositorNodeBlur"); blur.size_x = 260; blur.size_y = 260
mix = nt.nodes.new("CompositorNodeMixRGB"); mix.blend_type = "MULTIPLY"; mix.inputs[0].default_value = 0.65
inv = nt.nodes.new("CompositorNodeMath"); inv.operation = "ADD"; inv.inputs[1].default_value = 0.25
nt.links.new(rl.outputs["Image"], gl.inputs[0]); nt.links.new(gl.outputs[0], ld.inputs[0])
nt.links.new(mask.outputs[0], blur.inputs[0]); nt.links.new(blur.outputs[0], inv.inputs[0])
nt.links.new(ld.outputs[0], mix.inputs[1]); nt.links.new(inv.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], comp.inputs[0])
scn.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("RENDERED", OUT)
