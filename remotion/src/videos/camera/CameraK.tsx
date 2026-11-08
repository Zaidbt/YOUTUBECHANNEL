/**
 * Video 013 · How does a camera take a photo? — Kurzgesagt-style flat drawing + animation through our pixel pipeline.
 * 37.5 s, 128 BPM phonk, seamless loop. Side-on flat camera; it turns see-through (x-ray) and every part pops in with a
 * tag; then step by step: 1. the lens bends the light to focus it · 2. the shutter is a tiny door that blocks the light,
 * CLICK: it opens for 1/1000 s (slow motion, on the snares) · 3. dive into the sensor: light buckets fill up (cowbell),
 * red/green/blue filters drop on them · back out: the chip mixes it into the photo (bubble from the screen) · hero (loop).
 * Timing from camerak.json (videos/13-camera/build_k.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./camerak.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, rrectLine, ribbon, curve, Flat, Disc } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;

export const CAMK_PALETTE = [
  "#0b0f2e", "#151c4a", "#22306e", "#33469c",
  "#2b2f4a", "#3c4266", "#585f8c", "#8a92c0", "#c8cdf0",
  "#ff4f6d", "#ff8aa0",
  "#4ad0ff", "#a8ecff", "#1f7ab8",
  "#ff3a4a", "#ff8a8a", "#9a1a2a",
  "#3fcf6a", "#1f8a4a", "#9bf08a",
  "#ffd23f", "#fff3b0", "#ffb43d",
  "#7a4dff", "#b48cff",
  "#4a9aff", "#1f4abf",
  "#ffffff", "#05060f", "#6a3d2a", "#a0643a",
];
const BG = "#0b0f2e";

// ---------------- timing ----------------
const flashK = (t: number) => { const k = Math.max(0, ...EV.flashes.map((f) => (t >= f ? Math.exp(-(t - f) / 0.09) : 0))); return k < 0.03 ? 0 : k; };
const xray = (t: number) => (t < b(4) ? 0 : t < b(18) ? ease((t - b(4)) / 0.6) : 1 - ease((t - b(18)) / 0.6));
const IN = b(12), OUT = b(16), FADE = 0.28;
const inSensor = (t: number) => t >= IN && t < OUT;
/** the door: lowered (open) until bar 8, slides up to block the light, opens on each snare in bars 10-11 */
function doorY(t: number) {
  if (t < b(8)) return -1.45;
  let y = -1.45 + 1.45 * backOut((t - b(8)) / 0.45);
  for (const [o, c] of EV.shutter) if (t >= o && t < c + 0.15) y = -1.45 * (ease((t - o) / 0.06) - ease((t - c) / 0.06));
  return y;
}
const doorOpen = (t: number) => doorY(t) < -1.1;
const partK = (t: number, i: number) => backOut((t - EV.parts[i]) / 0.3);

// ---------------- the photo (an apple) ----------------
const C = (h: string) => new THREE.Color(h);
function photoPix(u: number, v: number): THREE.Color {           // u right, v down, 3:2
  const X = (u - 0.5) * 1.5, Y = v - 0.5;
  const ax = X / 0.36, ay = (Y - 0.07) / 0.32, r = ax * ax + ay * ay;
  if (Math.abs(X) < 0.035 && Y > -0.34 && Y < -0.22) return C("#6a3d2a");
  const lx = (X - 0.15) / 0.15, ly = (Y + 0.3) / 0.055; if (lx * lx + ly * ly < 1) return C("#3fcf6a");
  if (r < 1) return C(ax + ay < -0.7 ? "#ff8a8a" : ax + ay > 0.9 ? "#9a1a2a" : "#ff3a4a");
  if (v > 0.8) return C("#a0643a");
  return C(v < 0.4 ? "#22306e" : "#151c4a");
}

// ---------------- the room ----------------
const BOKEH = Array.from({ length: 16 }, (_, i) => ({ x: (rnd(i + 20) - 0.5) * 30, y: 1 + rnd(i + 21) * 12, r: 0.4 + rnd(i + 22) * 0.9, c: ["#ffd23f", "#ff8aa0", "#4ad0ff", "#b48cff"][i % 4] }));
const wall = (() => { const g = new THREE.PlaneGeometry(120, 60, 1, 8); const c: number[] = []; const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = clamp01((p.getY(i) + 10) / 40); const col = C("#0b0f2e").lerp(C("#33469c"), k); c.push(col.r, col.g, col.b); } g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); return g; })();
const tableG = rrect(-40, -9, 40, -2.2, 0.1), tableEdge = rrect(-40, -2.35, 40, -2.2, 0.02);
const leafG = blob([[0, 0], [0.9, 0.35], [2.0, 0], [0.9, -0.35]], 16);
const Room: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh geometry={wall} position={[0, 4, -40]}><meshBasicMaterial vertexColors /></mesh>
    {/* lamp glow + halo rings */}
    {[7, 5, 3.4].map((r, i) => <Disc key={i} at={[-7, 9]} r={r} c="#ffb43d" z={-38 + i * 0.1} o={0.05 + i * 0.05} seg={40} />)}
    <Disc at={[-7, 9]} r={1.6} c="#fff3b0" z={-37.5} seg={32} />
    {BOKEH.map((k, i) => <Disc key={`b${i}`} at={[k.x, k.y + 0.2 * Math.sin(2 * LW * t + i)]} r={k.r} c={k.c} z={-30} o={0.18} />)}
    {/* a plant in the back */}
    <group position={[-5.5, -2.2, -6]}>
      <Flat g={rrect(-0.6, 0, 0.6, 1.1, 0.15)} c="#a0643a" />
      {Array.from({ length: 6 }, (_, i) => <group key={i} position={[0, 1.1, 0.01]} rotation={[0, 0, 0.6 + i * 0.38 + 0.06 * Math.sin(2 * LW * t + i)]} scale={0.9}><Flat g={leafG} c={i % 2 ? "#1f8a4a" : "#3fcf6a"} /></group>)}
    </group>
    {/* table */}
    <Flat g={tableG} c="#6a3d2a" z={-1} />
    <Flat g={tableEdge} c="#a0643a" z={-0.99} />
  </group>
);

// ---------------- the camera (flat, side-on, lens pointing right) ----------------
const G = {
  body: rrect(-1.5, -1.1, 0.9, 1.1, 0.35), bodyShade: rrect(-1.5, -1.1, 0.9, -0.62, 0.3), top: rrect(-1.5, 0.7, 0.9, 1.1, 0.3),
  hump: blob([[-0.8, 1.05], [0.4, 1.05], [0.2, 1.72], [-0.6, 1.72]], 12),
  flash: rrect(-0.7, 1.68, 0.3, 2.26, 0.12), flashWin: rrect(0.14, 1.78, 0.3, 2.14, 0.04),
  button: rrect(0.45, 1.08, 0.8, 1.26, 0.06), barrel: rrect(0.85, -0.86, 2.6, 0.86, 0.18),
  ring1: rrect(1.2, -0.92, 1.52, 0.92, 0.08), ring2: rrect(2.05, -0.89, 2.13, 0.89, 0.02),
  glass: blob([[2.6, -0.8], [2.8, 0], [2.6, 0.8], [2.52, 0]], 20), glint: blob([[2.65, 0.25], [2.73, 0.45], [2.67, 0.6], [2.62, 0.42]], 8),
  backScreen: rrect(-1.59, -0.6, -1.47, 0.5, 0.03), lug: rrect(-1.48, 0.86, -1.32, 1.0, 0.03),
  bodyLine: rrectLine(-1.5, -1.1, 0.9, 1.1, 0.35, 0.06), barrelLine: rrectLine(0.85, -0.86, 2.6, 0.86, 0.18, 0.05),
  legs: [ribbon([[-0.4, -1.1], [-1.2, -2.2]], () => 0.12), ribbon([[-0.2, -1.1], [0.6, -2.2]], () => 0.12), ribbon([[-0.3, -1.1], [-0.3, -2.2]], () => 0.12)],
  lens: [2.35, 1.85, 1.35].map((x) => blob([[x, -0.72], [x + 0.17, 0], [x, 0.72], [x - 0.17, 0]], 20)),
  pcb: rrect(-0.46, -0.82, -0.26, 0.82, 0.04), chip: rrect(-1.25, -0.7, -0.75, -0.2, 0.05),
  sensorFrame: rrect(-0.11, -0.68, 0.11, 0.68, 0.03), sensor: rrect(-0.06, -0.6, 0.06, 0.6, 0.02), screenIn: rrect(-1.47, -0.6, -1.36, 0.5, 0.02),
  rail1: rrect(0.24, 0.74, 0.46, 0.86, 0.02), rail2: rrect(0.24, -0.86, 0.46, -0.74, 0.02),
  wires: [ribbon(curve([[-0.3, -0.2], [-0.6, -0.35], [-0.75, -0.45]], 10), () => 0.04), ribbon(curve([[-1.25, -0.45], [-1.3, -0.2], [-1.36, 0]], 10), () => 0.04)],
};
const DOOR = rrect(0.28, -0.72, 0.42, 0.72, 0.03);
const APPLE: P2 = [3.95, -1.6];
const RAY_SRC: P2[] = [[3.75, -1.25], [3.95, -1.6], [4.15, -1.95]];
const RAY_LENS = [0.5, 0, -0.5];
/** rays: apple → lens front (outside), then bent by the first lens element toward the focus (sensor) — or stopped by the door */
function rayPath(i: number, t: number, inside: boolean): P2[] {
  const y = RAY_LENS[i], p: P2[] = [RAY_SRC[i], [2.68, y]];
  if (!inside) return p;
  const F: P2 = [0.02, 0], stop = !doorOpen(t) && t >= b(8);
  p.push([2.35, y * 0.96]);
  const end: P2 = stop ? [0.46, lerp(y * 0.96, 0, (2.35 - 0.46) / 2.33)] : F;
  p.push(end);
  return p;
}
const along = (pts: P2[], u: number): P2 => {
  const L: number[] = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  let s = u * tot;
  for (let i = 1; i < pts.length; i++) { if (s <= L[i - 1]) { const k = s / L[i - 1]; return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; } s -= L[i - 1]; }
  return pts[pts.length - 1];
};
const CameraFlat: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const xr = xray(t), o = 1 - xr * 0.92, fk = flashK(t);
  const dy = doorY(t), lit = t >= b(10) && doorOpen(t) && t < b(12);
  const hLens = t >= b(6) && t < b(8) ? 0.5 + 0.5 * Math.sin(t * 9) : 0, hDoor = t >= b(8) && t < b(12);
  const bob = 0.02 * Math.sin(8 * LW * t), sq = fk * 0.04;
  const showRays = t >= b(2);
  return (
    <group>
      {/* tripod + shadow */}
      {G.legs.map((g, i) => <Flat key={i} g={g} c="#3c4266" z={-0.2} />)}
      <mesh position={[0.4, -2.25, -0.9]} scale={[2.8, 0.12, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#05060f" transparent opacity={0.35} /></mesh>
      <group position={[0, bob, 0]} scale={[1 + sq, 1 - sq, 1]}>
        {/* outside (fades to a see-through shell) */}
        <Flat g={G.body} c="#2b2f4a" o={o} z={0} />
        <Flat g={G.bodyShade} c="#151c4a" o={o} z={0.01} />
        <Flat g={G.top} c="#3c4266" o={o} z={0.02} />
        <Flat g={G.hump} c="#3c4266" o={o} z={0.01} />
        <Flat g={G.flash} c="#2b2f4a" z={0.02} />
        <Flat g={G.flashWin} c={fk > 0 ? "#ffffff" : "#c8cdf0"} z={0.03} />
        <Flat g={G.button} c="#ff4f6d" z={0.03} />
        <Flat g={G.barrel} c="#2b2f4a" o={o} z={0.01} />
        <Flat g={G.ring1} c="#585f8c" o={o} z={0.02} />
        <Flat g={G.ring2} c="#ff4f6d" o={o} z={0.03} />
        <Flat g={G.glass} c="#4ad0ff" z={0.03} />
        <Flat g={G.glint} c="#ffffff" z={0.04} />
        <Flat g={G.backScreen} c="#4a9aff" z={0.03} />
        <Flat g={G.lug} c="#8a92c0" z={0.03} />
        <Disc at={[-1.2, 0.88]} r={0.07} c="#ff4f6d" z={0.04} o={o} />
        {/* x-ray: dark inside panel + light outline */}
        {xr > 0 && <>
          <Flat g={G.body} c="#0b0f2e" o={xr * 0.9} z={0.05} />
          <Flat g={G.barrel} c="#0b0f2e" o={xr * 0.9} z={0.05} />
          <Flat g={G.bodyLine} c="#8a92c0" o={xr} z={0.06} />
          <Flat g={G.barrelLine} c="#8a92c0" o={xr} z={0.06} />
          {/* parts, each popping in with its tag */}
          <group scale={[1, Math.max(0.001, partK(t, 0)), 1]}>{G.lens.map((g, i) => <React.Fragment key={i}><Flat g={g} c={hLens > 0 ? "#ffffff" : "#a8ecff"} o={0.85} z={0.1} /><Disc at={[[2.35, 1.85, 1.35][i] - 0.04, 0.35]} r={0.05} c="#ffffff" z={0.11} /></React.Fragment>)}</group>
          <group position={[0, 0, 0]} scale={[1, Math.max(0.001, partK(t, 1)), 1]}>
            <Flat g={G.rail1} c="#585f8c" z={0.1} /><Flat g={G.rail2} c="#585f8c" z={0.1} />
            <Flat g={DOOR} c={hDoor ? "#ff8aa0" : "#8a92c0"} z={0.11} p={[0, dy]} />
          </group>
          <group scale={[1, Math.max(0.001, partK(t, 2)), 1]}>
            <Flat g={G.pcb} c="#1f8a4a" z={0.08} />
            <Flat g={G.sensorFrame} c="#ffd23f" z={0.09} />
            <Flat g={G.sensor} c={lit ? "#fff3b0" : "#7a4dff"} z={0.1} />
          </group>
          <group scale={Math.max(0.001, partK(t, 3))} position={[-1.0 * (1 - partK(t, 3)), -0.45 * (1 - partK(t, 3)), 0]}><Flat g={G.chip} c="#05060f" z={0.1} />{[-1.15, -1.05, -0.95, -0.85].map((x) => <React.Fragment key={x}><Flat g={rrect(x - 0.02, -0.2, x + 0.02, -0.12, 0.01)} c="#ffd23f" z={0.1} /><Flat g={rrect(x - 0.02, -0.78, x + 0.02, -0.7, 0.01)} c="#ffd23f" z={0.1} /></React.Fragment>)}</group>
          <group scale={[1, Math.max(0.001, partK(t, 4)), 1]}><Flat g={G.screenIn} c="#4a9aff" z={0.1} /></group>
          {t >= EV.parts[3] && G.wires.map((g, i) => <Flat key={i} g={g} c="#ffd23f" o={0.7} z={0.09} />)}
          {lit && <Glow map={map} at={[0.05, 0, 0.3]} size={1.6} color="#fff3b0" opacity={0.85} />}
          {t >= b(16) && t < b(18) && Array.from({ length: 8 }, (_, k) => { const q = along([[0, 0], [-0.3, -0.2], [-1.0, -0.45], [-1.3, -0.2], [-1.4, 0]], (k / 8 + t * 1.2) % 1); return <Disc key={`d${k}`} at={q} r={0.05} c="#ffd23f" z={0.2} />; })}
        </>}
      </group>
      {/* light rays: soft beams + travelling photons */}
      {showRays && RAY_SRC.map((_, i) => {
        const inside = xr > 0.5, pts = rayPath(i, t, inside);
        return (
          <group key={`r${i}`}>
            <Flat g={ribbon(pts, () => 0.07)} c="#fff3b0" o={0.4} z={0.25} />
            {Array.from({ length: 5 }, (_, k) => { const q = along(pts, (k / 5 + t * 0.7 + i * 0.13) % 1); return <Disc key={k} at={q} r={0.07} c="#ffffff" z={0.26} />; })}
          </group>
        );
      })}
      {showRays && !doorOpen(t) && t >= b(8) && xr > 0.5 && <Glow map={map} at={[0.48, 0, 0.3]} size={0.9} color="#fff3b0" opacity={0.7} />}
      {fk > 0 && <Glow map={map} at={[0.45, 1.96, 0.3]} size={1.5 + 4 * fk} color="#ffffff" opacity={fk} />}
    </group>
  );
};
const Apple: React.FC<{ t: number }> = ({ t }) => (
  <group position={[APPLE[0], APPLE[1] + 0.02 * Math.sin(4 * LW * t), 0.1]}>
    <mesh position={[0, -0.6, -0.05]} scale={[0.75, 0.1, 1]}><circleGeometry args={[1, 20]} /><meshBasicMaterial color="#05060f" transparent opacity={0.35} /></mesh>
    <mesh scale={[1, 0.93, 1]}><circleGeometry args={[0.6, 32]} /><meshBasicMaterial color="#ff3a4a" /></mesh>
    <mesh position={[0.12, -0.08, 0.01]} scale={[0.75, 0.7, 1]}><circleGeometry args={[0.6, 24, -Math.PI / 2, Math.PI]} /><meshBasicMaterial color="#9a1a2a" transparent opacity={0.5} /></mesh>
    <Disc at={[-0.22, 0.22]} r={0.12} c="#ff8a8a" z={0.02} />
    <Flat g={ribbon([[0, 0.5], [0.05, 0.78]], () => 0.07)} c="#6a3d2a" z={0.02} />
    <group position={[0.08, 0.72, 0.03]} rotation={[0, 0, 0.3]} scale={0.25}><Flat g={leafG} c="#3fcf6a" /></group>
  </group>
);

// ---------------- inside the sensor: light buckets ----------------
const GW = 8, GH = 12, CS = 0.4;
const cellXY = (c: number, r: number): P2 => [(c - (GW - 1) / 2) * CS, ((GH - 1) / 2 - r) * CS];
const cellPix = (c: number, r: number) => photoPix((c + 0.5) / GW * 0.7 + 0.15, (r + 0.5) / GH);
const bayer = (c: number, r: number) => (r % 2 === 0 ? (c % 2 === 0 ? 1 : 0) : (c % 2 === 0 ? 2 : 1));
const FILTER = ["#ff3a4a", "#3fcf6a", "#4a9aff"];
const ORDER = Array.from({ length: GW * GH }, (_, k) => k).sort((p, q) => { const d = (k: number) => Math.hypot((k % GW) - 3.5, Math.floor(k / GW) - 5.5); return d(p) - d(q) || p - q; });
const RANK = ORDER.reduce((m, k, i) => { m[k] = i; return m; }, {} as Record<number, number>);
const cellLit = (k: number) => EV.cells[Math.floor(RANK[k] / 8)] ?? 1e9;
const bucketG = rrect(-0.17, -0.17, 0.17, 0.17, 0.05), bucketIn = rrect(-0.14, -0.14, 0.14, 0.14, 0.03), capG = rrect(-0.18, -0.18, 0.18, 0.18, 0.06);
const Sensor: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => (
  <group>
    <Disc at={[0, 0]} r={6} c="#151c4a" z={-3} seg={40} />
    <Flat g={rrect(-1.85, -2.65, 1.85, 2.65, 0.15)} c="#ffd23f" z={-0.2} />
    <Flat g={rrect(-1.75, -2.55, 1.75, 2.55, 0.12)} c="#22306e" z={-0.19} />
    {Array.from({ length: GW * GH }, (_, k) => {
      const c = k % GW, r = Math.floor(k / GW), [x, y] = cellXY(c, r);
      const fill = ease((t - cellLit(k)) / 0.2), pix = cellPix(c, r), sp = pix.clone().convertLinearToSRGB();
      const lum = Math.min(1, (0.3 * sp.r + 0.6 * sp.g + 0.1 * sp.b) * 1.5 + 0.15), level = lum * fill;
      const capT = EV.filters[r] ?? 1e9, cap = t >= capT ? backOut((t - capT) / 0.25) : 0, fi = bayer(c, r);
      const ch = [sp.r, sp.g, sp.b][fi];
      const liquid = cap > 0.5 ? "#" + C("#151c4a").lerp(C(FILTER[fi]), Math.min(1, ch * 1.4 + 0.1)).getHexString() : "#ffffff";
      const h = 0.28 * (cap > 0.5 ? Math.max(0.15, Math.min(1, ch * 1.3)) : level);
      return (
        <group key={k} position={[x, y, 0]}>
          <Flat g={bucketG} c="#33469c" z={0} />
          <Flat g={bucketIn} c="#0b0f2e" z={0.01} />
          {h > 0.005 && <mesh position={[0, -0.14 + h / 2, 0.02]}><planeGeometry args={[0.28, h]} /><meshBasicMaterial color={liquid} /></mesh>}
          {cap > 0 && <Flat g={capG} c={FILTER[fi]} o={0.45} z={0.03} p={[0, 0.6 * (1 - cap)]} />}
        </group>
      );
    })}
    {/* photons raining in while the buckets fill */}
    {t < b(14) && Array.from({ length: 24 }, (_, i) => { const u = (i / 24 + t * 0.9) % 1, c = (i * 3) % GW, r = (i * 5) % GH, [x, y] = cellXY(c, r); return <Disc key={`ph${i}`} at={[x + 0.6 * (1 - u), y + 3.2 * (1 - u)]} r={0.05} c="#fff3b0" z={0.2} o={u} />; })}
    {Array.from({ length: 20 }, (_, i) => <Disc key={`p${i}`} at={[(rnd(i + 300) - 0.5) * 8 + 0.3 * Math.sin(2 * LW * t + i), (rnd(i + 310) - 0.5) * 9 + 0.3 * Math.cos(3 * LW * t + i)]} r={0.04} c="#b48cff" z={-1} />)}
  </group>
);

// ---------------- the photo bubble from the back screen ----------------
const BUB: P2 = [-2.65, 1.9], BW = 2.1, BH = 1.4;
const bubbleG = rrect(-BW / 2 - 0.1, -BH / 2 - 0.1, BW / 2 + 0.1, BH / 2 + 0.1, 0.15), tailG = blob([[0.1, -0.8], [0.5, -0.8], [0.95, -1.6]], 6);
const PhotoBubble: React.FC<{ t: number }> = ({ t }) => {
  const tex = useMemo(() => { const W = 24, H = 16, d = new Uint8Array(W * H * 4); const x = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); x.magFilter = x.minFilter = THREE.NearestFilter; x.colorSpace = THREE.SRGBColorSpace; return x; }, []);
  const hits = EV.screen.filter((s) => t >= s).length, rows = Math.round((hits / EV.screen.length) * 16);
  const d = tex.image.data as Uint8Array;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) { const c = (y < rows ? photoPix((x + 0.5) / 24, (y + 0.5) / 16) : C("#0b0f2e")).clone().convertLinearToSRGB(); d.set([c.r * 255, c.g * 255, c.b * 255, 255], ((15 - y) * 24 + x) * 4); }
  tex.needsUpdate = true;
  const k = t >= b(16) + 0.4 && t < b(18) + 0.3 ? backOut((t - b(16) - 0.4) / 0.35) * (t > b(18) ? 1 - ease((t - b(18)) / 0.3) : 1) : 0;
  if (k <= 0.001) return null;
  return (
    <group position={[BUB[0], BUB[1], 0.6]} scale={k}>
      <Flat g={tailG} c="#c8cdf0" z={-0.01} />
      <Flat g={bubbleG} c="#c8cdf0" />
      <mesh position={[0, 0, 0.01]}><planeGeometry args={[BW, BH]} /><meshBasicMaterial map={tex} /></mesh>
    </group>
  );
};

// ---------------- tags, camera, labels ----------------
type Tag = { txt: string; at: V3; from: number; to: number; col: string };
const TAGS: Tag[] = [
  { txt: "LENS", at: [1.85, 1.05, 0.5], from: EV.parts[0], to: b(18), col: "#4ad0ff" },
  { txt: "SHUTTER", at: [0.35, -1.15, 0.5], from: EV.parts[1], to: b(18), col: "#ff8aa0" },
  { txt: "SENSOR", at: [0.0, 1.05, 0.5], from: EV.parts[2], to: b(18), col: "#b48cff" },
  { txt: "CHIP", at: [-1.0, -0.95, 0.5], from: EV.parts[3], to: b(18), col: "#ffd23f" },
  { txt: "SCREEN", at: [-1.45, 1.05, 0.5], from: EV.parts[4], to: b(18), col: "#4a9aff" },
];
const SENSOR_TAGS: Tag[] = [
  { txt: "MORE LIGHT = FULLER", at: [0.4, -2.85, 0.5], from: IN + 1.0, to: b(14), col: "#fff3b0" },
  { txt: "COLOUR FILTERS", at: [0.4, -2.85, 0.5], from: b(14) + 0.3, to: OUT, col: "#3fcf6a" },
];
const HOME = { p: [1.25, -0.35, 33] as V3, l: [1.25, -0.35, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [1.7, -0.45, 30], l: [1.7, -0.45, 0] },
  { t: b(4), p: [0.6, 0.1, 25], l: [0.6, 0.1, 0] },
  { t: b(5.6), p: [0.55, 0.1, 24.5], l: [0.55, 0.1, 0] },
  { t: b(6.4), p: [1.2, 0.1, 18], l: [1.2, 0.1, 0] },
  { t: b(7.8), p: [1.15, 0.1, 17.5], l: [1.15, 0.1, 0] },
  { t: b(8.5), p: [0.45, 0.1, 14], l: [0.45, 0.1, 0] },
  { t: b(11.4), p: [0.3, 0.05, 12.5], l: [0.3, 0.05, 0] },
  { t: IN, p: [0.02, 0, 3.6], l: [0.02, 0, 0] },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0, 0.3, 5], l: [0, 0.3, 0] },
  { t: IN + 0.8, p: [0, 0.95, 20.5], l: [0, 0.95, 0] },
  { t: b(14), p: [0, 0.9, 20], l: [0, 0.9, 0] },
  { t: OUT - 0.3, p: [0, 0.3, 14], l: [0, 0.3, 0] },
  { t: OUT, p: [0, 0, 5], l: [0, 0, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, p: [0.02, 0, 3.6], l: [0.02, 0, 0] },
  { t: OUT + 0.9, p: [-1.7, 0.7, 22], l: [-1.7, 0.7, 0] },
  { t: b(18), p: [-1.7, 0.7, 22.5], l: [-1.7, 0.7, 0] },
  { t: b(19.2), ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : inSensor(t) ? camAt(CAM_S, t) : camAt(CAM_B, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES A" }], [{ t: "CAMERA", c: "#ffd23f" }], [{ t: "TAKE A PHOTO? 📸" }]];
const LABELS: LabelDef[] = [
  Lb(0, b(2), "#ffd23f", HOOK, true),
  Lb(b(2), b(4), "#ff3a4a", [[{ t: "LIGHT BOUNCES OFF" }], [{ t: "THE APPLE", c: "#ff3a4a" }], [{ t: "INTO THE LENS" }]]),
  Lb(b(4), b(6), "#ffffff", [[{ t: "INSIDE, 3 PARTS" }], [{ t: "DO THE MAGIC" }], [{ t: "LET'S SEE 👀", c: "#ffd23f" }]]),
  Lb(b(6), b(8), "#4ad0ff", [[{ t: "1. THE LENS" }], [{ t: "BENDS THE LIGHT", c: "#4ad0ff" }], [{ t: "TO FOCUS IT" }]]),
  Lb(b(8), b(10), "#ff8aa0", [[{ t: "2. THE SHUTTER:" }], [{ t: "A TINY DOOR", c: "#ff8aa0" }], [{ t: "BLOCKS THE LIGHT" }]]),
  Lb(b(10), b(12), "#ff8aa0", [[{ t: "CLICK! IT OPENS" }], [{ t: "FOR 1/1000", c: "#ffd23f" }], [{ t: "OF A SECOND" }]]),
  Lb(b(12), b(14), "#b48cff", [[{ t: "3. THE SENSOR:" }], [{ t: "MILLIONS OF", c: "#fff3b0" }], [{ t: "LIGHT BUCKETS" }]]),
  Lb(b(14), b(16), "#ffffff", [[{ t: "EACH ONE SEES" }], [{ t: "RED", c: "#ff3a4a" }, { t: ", " }, { t: "GREEN", c: "#3fcf6a" }], [{ t: "OR " }, { t: "BLUE", c: "#4a9aff" }]]),
  Lb(b(16), b(18), "#ffd23f", [[{ t: "A CHIP MIXES THEM" }], [{ t: "INTO YOUR" }], [{ t: "PHOTO 📸", c: "#ffd23f" }]]),
  Lb(b(18), D + 0.01, "#ffd23f", HOOK, true),
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[] }> = ({ t, cam, tags }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g) => { const [x, y] = project(g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={g.txt} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(11,15,46,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const CameraK: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const ins = inSensor(t);
  const cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/13-camera/camerak.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={CAMK_PALETTE} outline={false} dither={0.05}>
        <CamSet p={cam.p} l={cam.l} />
        {ins ? <Sensor t={t} map={glow} /> : <><Room t={t} /><Apple t={t} /><CameraFlat t={t} map={glow} /><PhotoBubble t={t} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#7a4dff", opacity: diveAt(t) }} />
      <AbsoluteFill style={{ background: "#ffffff", opacity: ins ? 0 : 0.25 * flashK(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ffd23f" }}>@HOWTOWITHZAY</div>
      {!ins && xray(t) > 0.8 && <TagsView t={t} cam={cam} tags={TAGS} />}
      {ins && <TagsView t={t} cam={cam} tags={SENSOR_TAGS} />}
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
