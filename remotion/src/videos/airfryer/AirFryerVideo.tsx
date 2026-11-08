/**
 * Video 014 · How does an air fryer actually work? — Kurzgesagt-style flat drawing + bouncy animation through our
 * pixel pipeline. 30 s seamless loop, 120 BPM nu-disco. Night kitchen hero (steam puffs on the snares) → "spoiler:
 * it doesn't fry" → dive into the drawer window → flat cross-section: FAN / HEATER / BASKET pop in, the heater climbs
 * to 200°C → the fan blows the hot air around (tornado loop) → the wind dries the fries' surface (droplets) → Maillard
 * reaction: a fry turns golden on every 8th → back out: "it's a mini turbo oven" + DING → hero (loop).
 * Timing from airfryer.json (videos/14-airfryer/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./airfryer.json";
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

export const AF_PALETTE = [
  "#0a0b24", "#11143a", "#1a1f52", "#252d6e", "#33408f", "#4a5ab5",
  "#5b3a8f", "#8a5ac0",
  "#0e4a5a", "#14707a", "#1fa3a0", "#4fd6c4", "#a6f0e2",
  "#5a1f1a", "#9a3a1f", "#d4602a", "#ff8a3d", "#ffb04a", "#ffd36a", "#fff1b0",
  "#c2457a", "#ff6f9c", "#ffb3c9",
  "#3a3f66", "#6a70a0", "#a9b0d8", "#e6e9ff",
  "#ffffff", "#05060f", "#bfe6ff",
];
const BG = "#0a0b24";
const C = (h: string) => new THREE.Color(h);
const mixHex = (a: string, c: string, k: number) => "#" + C(a).lerp(C(c), clamp01(k)).getHexString();

// ---------------- Kurzgesagt-style shading: every shape gets a gradient (linear or radial) ----------------
const GV = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GF = `uniform vec3 c0; uniform vec3 c1; uniform float y0; uniform float y1; uniform float op; uniform vec3 rad; uniform float useRad; uniform float pw; varying vec2 vP;
void main(){ float k = useRad > 0.5 ? 1.0 - smoothstep(0.0, rad.z, distance(vP, rad.xy)) : smoothstep(y0, y1, vP.y); k = pow(k, pw); gl_FragColor = vec4(mix(c0, c1, k), op); }`;
/** a shape filled with a gradient: c0 → c1 from y0 to y1 (local y), or radial (c1 at the centre) */
const G: React.FC<{ g: THREE.BufferGeometry; c0: string; c1: string; y?: [number, number]; rad?: [number, number, number]; z?: number; o?: number; p?: P2; s?: number; r?: number; add?: boolean; pw?: number }> = ({ g, c0, c1, y = [0, 1], rad, z = 0, o, p, s = 1, r = 0, add, pw = 1 }) => {
  const m = useMemo(() => new THREE.ShaderMaterial({ vertexShader: GV, fragmentShader: GF, side: THREE.DoubleSide,
    uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, y0: { value: 0 }, y1: { value: 1 }, op: { value: 1 }, rad: { value: new THREE.Vector3() }, useRad: { value: 0 }, pw: { value: 1 } } }), []);
  m.uniforms.c0.value.set(c0); m.uniforms.c1.value.set(c1); m.uniforms.y0.value = y[0]; m.uniforms.y1.value = y[1];
  m.uniforms.op.value = o ?? 1; m.uniforms.pw.value = pw; m.uniforms.useRad.value = rad ? 1 : 0; if (rad) m.uniforms.rad.value.set(...rad);
  m.transparent = o !== undefined || !!add; m.depthWrite = o === undefined && !add; m.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending;
  return <mesh geometry={g} material={m} position={[p?.[0] ?? 0, p?.[1] ?? 0, z]} scale={s} rotation={[0, 0, r]} />;
};
const CIRC = new THREE.CircleGeometry(1, 40);
/** a soft round glow (radial gradient to transparent, additive) */
const Halo: React.FC<{ at: P2; r: number; c: string; o?: number; z?: number }> = ({ at, r, c, o = 0.6, z = 0 }) => (
  <G g={CIRC} c0="#000000" c1={c} rad={[0, 0, 1]} p={at} s={r} z={z} o={o} add pw={2.6} />
);

// ---------------- timing ----------------
const IN = b(3), OUT = b(11), FADE = 0.28;
const inside = (t: number) => t >= IN && t < OUT;
const temp = (t: number) => (t < b(3) + 0.5 ? 20 : 20 + 180 * ease((t - b(3) - 0.5) / (b(5) - b(3) - 0.8)));     // °C
const heat = (t: number) => (temp(t) - 20) / 180;
const partK = (t: number, i: number) => Math.max(0.001, backOut((t - EV.parts[i]) / 0.3));
const wrapAge = (t: number, p: number) => (((t - p) % D) + D) % D;                       // loops: a puff near the end carries over
const puffAge = (t: number) => Math.min(...EV.puffs.map((p) => wrapAge(t, p)));

// ---------------- the night kitchen ----------------
const WALL = new THREE.PlaneGeometry(90, 60);
const STARS = Array.from({ length: 22 }, (_, i) => ({ x: -1.6 + rnd(i + 10) * 3.2, y: -1.7 + rnd(i + 11) * 3.4, r: 0.025 + rnd(i + 12) * 0.045, ph: rnd(i + 13) * 6 }));
const DUST = Array.from({ length: 34 }, (_, i) => ({ x: (rnd(i + 200) - 0.5) * 9, y: -1.5 + rnd(i + 201) * 8, r: 0.025 + rnd(i + 202) * 0.05, ph: rnd(i + 203) * 6 }));
const leafG = blob([[0, 0], [0.9, 0.38], [2.0, 0], [0.9, -0.38]], 16);
const coneG = blob([[-0.35, 5.25], [0.35, 5.25], [2.6, -1.9], [-2.6, -1.9]], 4);
const Kitchen: React.FC<{ t: number; map: THREE.Texture }> = ({ t }) => (
  <group>
    {/* deep blue wall, lit from the centre */}
    <G g={WALL} c0="#0a0b24" c1="#33408f" rad={[0, 1.6, 11]} z={-30} />
    <Halo at={[0, 1.4]} r={6} c="#4a5ab5" o={0.35} z={-29} />
    {/* window with the moon */}
    <group position={[-3.4, 5.0, -10]}>
      <G g={rrect(-1.95, -2.05, 1.95, 2.05, 0.35)} c0="#0a0b24" c1="#1a1f52" y={[-2, 2]} />
      <G g={rrect(-1.7, -1.8, 1.7, 1.8, 0.25)} c0="#1a1f52" c1="#4a5ab5" rad={[0.6, 0.7, 2.6]} z={0.01} />
      {STARS.map((s, i) => <Disc key={i} at={[s.x, s.y]} r={s.r * (0.6 + 0.4 * Math.sin(6 * LW * t + s.ph))} c="#fff1b0" z={0.02} seg={6} />)}
      {[1.5, 1.1, 0.8].map((r, i) => <Disc key={`h${i}`} at={[0.6, 0.7]} r={r} c="#a9b0d8" z={0.03 + i * 0.002} o={0.07 + i * 0.06} seg={40} />)}
      <G g={CIRC} c0="#ffd36a" c1="#fff1b0" rad={[-0.3, 0.3, 1.1]} p={[0.6, 0.7]} s={0.55} z={0.04} />
      <G g={rrect(-0.07, -1.8, 0.07, 1.8, 0.03)} c0="#0a0b24" c1="#11143a" z={0.05} />
      <G g={rrect(-1.7, -0.07, 1.7, 0.07, 0.03)} c0="#0a0b24" c1="#11143a" z={0.05} />
    </group>
    {/* shelf with glassy jars (white highlight crescents) */}
    <group position={[2.4, 3.3, -7]}>
      <G g={rrect(-2.4, -0.14, 2.4, 0.14, 0.06)} c0="#9a3a1f" c1="#d4602a" y={[-0.14, 0.14]} />
      {([[-1.6, "#14707a", "#4fd6c4", 0.9], [-0.6, "#c2457a", "#ff6f9c", 1.25], [0.4, "#d4602a", "#ffd36a", 0.8], [1.45, "#5b3a8f", "#8a5ac0", 1.05]] as [number, string, string, number][]).map(([x, d, l, h], i) => (
        <group key={i} position={[x, 0.14 + h / 2, 0.01]} scale={[1, 1 + 0.025 * Math.sin(4 * LW * t + i), 1]}>
          <G g={rrect(-0.36, -h / 2, 0.36, h / 2, 0.16)} c0={d} c1={l} rad={[-0.15, h * 0.15, h * 0.9]} />
          <G g={rrect(-0.39, h / 2 - 0.05, 0.39, h / 2 + 0.13, 0.06)} c0="#9a3a1f" c1="#ff8a3d" y={[h / 2 - 0.05, h / 2 + 0.13]} z={0.01} />
          <G g={blob([[-0.25, h / 2 - 0.2], [-0.15, h / 2 - 0.12], [-0.17, -h / 2 + 0.2], [-0.27, -h / 2 + 0.25]], 10)} c0="#ffffff" c1="#ffffff" z={0.02} o={0.55} />
        </group>
      ))}
    </group>
    {/* pendant lamp + its light cone onto the fryer */}
    <G g={rrect(-0.03, 5.6, 0.03, 9, 0.01)} c0="#11143a" c1="#11143a" z={-3} />
    <G g={blob([[-0.75, 5.2], [0.75, 5.2], [0.45, 5.75], [-0.45, 5.75]], 8)} c0="#d4602a" c1="#ffb04a" y={[5.2, 5.75]} z={-2.9} />
    <G g={coneG} c0="#ffd36a" c1="#fff1b0" y={[-1.9, 5.25]} z={-2.95} o={0.12 + 0.03 * Math.sin(4 * LW * t)} />
    <Halo at={[0, 5.2]} r={1.3} c="#ffd36a" o={0.7} z={-2.8} />
    {/* plant */}
    <group position={[3.15, -1.9, -2]}>
      <G g={rrect(-0.45, 0, 0.45, 0.8, 0.14)} c0="#c2457a" c1="#ff6f9c" y={[0, 0.8]} />
      {Array.from({ length: 5 }, (_, i) => <group key={i} position={[0, 0.8, 0.01]} rotation={[0, 0, 0.7 + i * 0.42 + 0.06 * Math.sin(2 * LW * t + i)]} scale={0.72}><G g={leafG} c0="#0e4a5a" c1="#4fd6c4" y={[-0.38, 0.38]} /></group>)}
    </group>
    {/* counter (warm wood) + teal cabinets */}
    <G g={rrect(-30, -2.34, 30, -1.9, 0.05)} c0="#9a3a1f" c1="#ffb04a" y={[-2.34, -1.9]} z={-0.5} />
    <G g={rrect(-30, -1.98, 30, -1.9, 0.02)} c0="#ffd36a" c1="#fff1b0" y={[-1.98, -1.9]} z={-0.49} />
    <G g={rrect(-30, -14, 30, -2.34, 0.02)} c0="#0a0b24" c1="#14707a" y={[-8, -2.34]} z={-0.6} />
    {[-3.6, -1.2, 1.2, 3.6].map((x) => <React.Fragment key={x}><G g={rrectLine(x - 1.1, -6.5, x + 1.1, -2.62, 0.14, 0.06)} c0="#0e4a5a" c1="#1fa3a0" y={[-6.5, -2.6]} z={-0.59} /><Disc at={[x + 0.8, -3.0]} r={0.08} c="#ffd36a" z={-0.58} /></React.Fragment>)}
    {/* floating dust in the lamp light */}
    {DUST.map((d, i) => <Disc key={`du${i}`} at={[d.x + 0.25 * Math.sin(2 * LW * t + d.ph), d.y + 0.3 * Math.sin(3 * LW * t + d.ph)]} r={d.r} c="#fff1b0" z={1} o={0.35 + 0.35 * Math.sin(5 * LW * t + d.ph)} seg={8} />)}
  </group>
);

// ---------------- the air fryer (front view, gradients, rim light, glows) ----------------
const AFG = {
  body: rrect(-1.6, -1.9, 1.6, 1.9, 0.65), hiTop: blob([[-1.2, 1.78], [0, 1.88], [1.2, 1.78], [1.0, 1.62], [0, 1.7], [-1.0, 1.62]], 16),
  panel: rrect(-1.15, 0.45, 1.15, 1.15, 0.3), display: rrect(-0.85, 0.6, 0.1, 1.0, 0.14), drawer: rrect(-1.38, -1.74, 1.38, 0.28, 0.45),
  window: rrect(-0.88, -1.22, 0.88, -0.22, 0.25), glare: blob([[-0.7, -0.3], [-0.45, -0.3], [-0.75, -1.1], [-0.85, -0.95]], 6),
  handle: rrect(-0.62, -0.02, 0.62, 0.2, 0.1), rimR: ribbon(curve([[1.5, 1.45], [1.58, 0], [1.48, -1.55]], 20), (u) => 0.07 * Math.sin(Math.PI * u) + 0.01),
  rimL: ribbon(curve([[-1.5, 1.45], [-1.58, 0], [-1.48, -1.55]], 20), (u) => 0.05 * Math.sin(Math.PI * u) + 0.01),
  feet: [rrect(-1.25, -2.0, -0.75, -1.85, 0.06), rrect(0.75, -2.0, 1.25, -1.85, 0.06)],
  vent: [-0.6, -0.3, 0, 0.3, 0.6].map((x) => rrect(x - 0.09, 1.5, x + 0.09, 1.58, 0.03)),
};
const FRY_SIL = Array.from({ length: 6 }, (_, i) => ({ x: -0.55 + i * 0.22, r: (rnd(i + 70) - 0.5) * 0.8 }));
const fryS = rrect(-0.065, -0.3, 0.065, 0.3, 0.06);
const puffG = new THREE.CircleGeometry(1, 24);
const AirFryer: React.FC<{ t: number; map: THREE.Texture }> = ({ t }) => {
  const pa = puffAge(t), sq = pa < 0.4 ? 0.06 * Math.exp(-pa / 0.09) : 0;
  const hum = 0.012 * Math.sin(16 * LW * t);
  const drawer = t >= EV.ding && t < EV.ding + 1.4 ? backOut((t - EV.ding) / 0.35) * (1 - ease((t - EV.ding - 0.95) / 0.4)) : 0;
  const golden = t >= b(11) && t < EV.ding + 1.4;                          // the cooked batch, then a fresh one (loop)
  const flick = 0.85 + 0.15 * Math.sin(12 * LW * t);
  return (
    <group position={[hum, 0, 0]}>
      <mesh position={[0.25, -1.97, -0.25]} scale={[2.3, 0.16, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#05060f" transparent opacity={0.45} /></mesh>
      <group scale={[1 + sq * 0.6, 1 - sq, 1]} position={[0, -1.9 * sq, 0]}>
        {AFG.feet.map((g, i) => <G key={i} g={g} c0="#05060f" c1="#11143a" y={[-2, -1.85]} z={-0.01} />)}
        <G g={AFG.body} c0="#0a0b24" c1="#33408f" y={[-1.9, 1.9]} />
        <G g={AFG.hiTop} c0="#4a5ab5" c1="#a9b0d8" y={[1.62, 1.88]} z={0.01} />
        <G g={AFG.rimR} c0="#c2457a" c1="#ffb3c9" y={[-1.5, 1.4]} z={0.02} />
        <G g={AFG.rimL} c0="#14707a" c1="#4fd6c4" y={[-1.5, 1.4]} z={0.02} o={0.7} />
        {AFG.vent.map((g, i) => <G key={`v${i}`} g={g} c0="#05060f" c1="#11143a" z={0.02} />)}
        <G g={AFG.panel} c0="#05060f" c1="#11143a" y={[0.45, 1.15]} z={0.02} />
        <G g={AFG.display} c0="#d4602a" c1="#ffb04a" y={[0.6, 1.0]} z={0.03} />
        {[0, 1, 2].map((i) => <G key={`d${i}`} g={rrect(-0.72 + i * 0.27, 0.68, -0.56 + i * 0.27, 0.92, 0.04)} c0="#ffd36a" c1="#fff1b0" z={0.04} />)}
        <Halo at={[-0.38, 0.8]} r={0.9} c="#ff8a3d" o={0.45 * flick} z={0.05} />
        <G g={CIRC} c0="#6a70a0" c1="#e6e9ff" rad={[-0.35, 0.35, 1.2]} p={[0.62, 0.8]} s={0.3} z={0.03} />
        <group position={[0.62, 0.8, 0.04]} rotation={[0, 0, -0.6 + 0.04 * Math.sin(4 * LW * t)]}><G g={rrect(-0.04, 0, 0.04, 0.24, 0.02)} c0="#11143a" c1="#11143a" /></group>
        {/* drawer + glowing window onto the fries */}
        <group position={[0, -0.11 * drawer, 0.05 + drawer * 0.6]} scale={1 + drawer * 0.06}>
          <G g={AFG.drawer} c0="#0a0b24" c1="#252d6e" y={[-1.74, 0.28]} />
          <G g={AFG.window} c0="#5a1f1a" c1="#ff8a3d" rad={[0, -0.95, 1.05]} z={0.01} />
          {FRY_SIL.map((f, i) => <group key={i} position={[f.x, -0.78, 0.02]} rotation={[0, 0, f.r]}><G g={fryS} c0={golden ? "#d4602a" : "#ffb04a"} c1={golden ? "#ffd36a" : "#fff1b0"} y={[-0.3, 0.3]} /></group>)}
          <Halo at={[0, -0.75]} r={1.0} c="#ff8a3d" o={0.35 * flick} z={0.03} />
          <G g={AFG.glare} c0="#ffffff" c1="#ffffff" z={0.04} o={0.22} />
          <G g={AFG.handle} c0="#6a70a0" c1="#e6e9ff" y={[-0.02, 0.2]} z={0.05} />
        </group>
      </group>
      {/* steam puffs on the snares (soft round clouds) */}
      {EV.puffs.map((p, i) => { const a = wrapAge(t, p); if (a > 1.3) return null; const k = backOut(a / 0.3), up = a * 1.3, o = 1 - a / 1.3; return (
        <group key={`p${i}`} position={[(i % 2 ? 0.3 : -0.3) + 0.2 * Math.sin(a * 4), 1.95 + up, 0.3]} scale={k * (0.6 + a * 0.6)}>
          {[[-0.25, 0, 0.28], [0.15, 0.1, 0.34], [0.0, 0.32, 0.26]].map(([x, y, r], j) => <G key={j} g={puffG} c0="#a9b0d8" c1="#ffffff" rad={[-0.3, 0.3, 1.4]} p={[x, y]} s={r} z={j * 0.001} o={o * 0.9} />)}
        </group>); })}
    </group>
  );
};

// ---------------- inside: an infographic cross-section ----------------
const SH = { x0: -2.6, x1: 2.6, y0: -3.0, y1: 3.4 };
const fanBlade = blob([[0, 0.09], [0.55, 0.2], [1.05, 0.0], [0.55, -0.13], [0, -0.09]], 12);
const coilPts = (): P2[] => { const p: P2[] = []; for (let i = 0; i <= 90; i++) { const x = -1.7 + (i / 90) * 3.4; p.push([x, 1.9 + 0.18 * Math.sin((i / 90) * Math.PI * 14)]); } return p; };
const COIL = coilPts(), coilG = ribbon(COIL, () => 0.13), coilCore = ribbon(COIL, () => 0.045);
const FRIES = Array.from({ length: 16 }, (_, i) => ({ x: -1.35 + (i % 8) * 0.38 + (rnd(i + 30) - 0.5) * 0.1, y: -1.25 + Math.floor(i / 8) * 0.55 + (rnd(i + 31) - 0.5) * 0.12, r: (rnd(i + 32) - 0.5) * 1.2 }));
const fryG = rrect(-0.1, -0.42, 0.1, 0.42, 0.08), fryHi = rrect(-0.06, -0.3, -0.01, 0.34, 0.025);
const loopPts = (s: number): P2[] => curve([[0, 2.25], [s * 1.6, 2.35], [s * 2.25, 1.6], [s * 2.3, -1.0], [s * 2.0, -2.45], [s * 0.9, -2.55], [s * 0.6, -1.7], [s * 0.7, -0.6], [s * 0.35, 0.8], [0, 2.0]], 120);
const LOOPS = [loopPts(1), loopPts(-1)];
const CHEV = blob([[-0.16, 0.13], [0.18, 0], [-0.16, -0.13], [-0.06, 0]], 4);
const along = (pts: P2[], u: number): P2 => pts[Math.min(pts.length - 1, Math.max(0, Math.floor(u * (pts.length - 1))))];
const dropG = blob([[0, 0.15], [0.1, -0.03], [0, -0.11], [-0.1, -0.03]], 10);
const Inside: React.FC<{ t: number; map: THREE.Texture }> = ({ t }) => {
  const h = heat(t), air = clamp01((t - b(5)) / 0.5), fanSpin = t * (4 + 14 * clamp01((t - b(4.5)) / 1));
  const tin = t - IN;
  return (
    <group>
      {/* deep blue space, warmed from the top by the heater */}
      <G g={WALL} c0="#0a0b24" c1="#1a1f52" rad={[0, 0.5, 8]} z={-5} />
      <Halo at={[0, 2.0]} r={4 + 2 * h} c="#ff8a3d" o={0.15 + 0.35 * h} z={-4.5} />
      {Array.from({ length: 22 }, (_, i) => <Disc key={`pa${i}`} at={[(rnd(i + 400) - 0.5) * 7 + 0.2 * Math.sin(2 * LW * t + i), (rnd(i + 410) - 0.5) * 9 + 0.3 * Math.cos(3 * LW * t + i)]} r={0.035} c="#a9b0d8" z={-1} o={0.6} seg={6} />)}
      {/* the shell, cut open */}
      <G g={rrect(SH.x0, SH.y0, SH.x1, SH.y1, 0.75)} c0="#05060f" c1="#1a1f52" y={[SH.y0, SH.y1]} z={-0.5} />
      <G g={rrectLine(SH.x0, SH.y0, SH.x1, SH.y1, 0.75, 0.14)} c0="#3a3f66" c1="#a9b0d8" y={[SH.y0, SH.y1]} z={-0.45} />
      <G g={rrect(-0.6, 2.9, 0.6, 3.3, 0.12)} c0="#252d6e" c1="#4a5ab5" y={[2.9, 3.3]} z={-0.4} />
      <G g={ribbon(curve([[-2.2, -2.55], [-1.1, -2.72], [0, -2.45], [1.1, -2.72], [2.2, -2.55]], 30), () => 0.14)} c0="#3a3f66" c1="#6a70a0" y={[-2.8, -2.4]} z={-0.4} />
      {/* fan: silver blades + a motion-blur ghost */}
      <group position={[0, 2.55, -0.3]} scale={partK(t, 0)}>
        {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[0, 0, fanSpin + (i / 5) * Math.PI * 2]} scale={[1, 0.55, 1]}><G g={fanBlade} c0="#6a70a0" c1="#e6e9ff" y={[-0.13, 0.2]} /></group>)}
        {Array.from({ length: 5 }, (_, i) => <group key={`gh${i}`} rotation={[0, 0, fanSpin - 0.25 + (i / 5) * Math.PI * 2]} scale={[1, 0.55, 1]}><G g={fanBlade} c0="#a9b0d8" c1="#e6e9ff" o={0.25} z={-0.01} /></group>)}
        <G g={CIRC} c0="#252d6e" c1="#6a70a0" rad={[-0.3, 0.3, 1.2]} s={0.22} z={0.02} />
      </group>
      {/* heater: a glowing coil with a bright core and bloom */}
      <group scale={[1, partK(t, 1), 1]} position={[0, 1.9 * (1 - partK(t, 1)), 0]}>
        <G g={coilG} c0={mixHex("#3a3f66", "#9a3a1f", h * 1.5)} c1={mixHex("#6a70a0", "#ff8a3d", h * 1.3)} y={[1.7, 2.1]} z={-0.2} />
        {h > 0.15 && <G g={coilCore} c0="#ffd36a" c1="#fff1b0" z={-0.19} o={clamp01(h * 1.4)} />}
        {h > 0.2 && Array.from({ length: 7 }, (_, i) => <Halo key={`cg${i}`} at={[-1.5 + i * 0.5, 1.9]} r={0.7 * h + 0.2} c="#ff8a3d" o={0.5 * h} z={-0.18} />)}
        {h > 0.5 && [-1.2, -0.4, 0.4, 1.2].map((x, i) => <G key={`sh${i}`} g={ribbon(curve([[x, 2.15], [x + 0.08 * Math.sin(t * 6 + i), 2.35], [x - 0.08 * Math.sin(t * 6 + i), 2.55]], 10), () => 0.045)} c0="#ff8a3d" c1="#ffd36a" y={[2.15, 2.55]} z={-0.17} o={0.7 * h} />)}
      </group>
      {/* hot air: glowing chevrons with soft trails */}
      {air > 0 && LOOPS.map((pts, li) => Array.from({ length: 22 }, (_, k) => { const u = (k / 22 + t * 0.55) % 1, q = along(pts, u), q2 = along(pts, u + 0.012), ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]), warm = Math.sin(u * Math.PI); return (
        <group key={`ar${li}-${k}`} position={[q[0], q[1], 0.25]} rotation={[0, 0, ang]} scale={air}>
          <Halo at={[-0.05, 0]} r={0.32} c="#ff8a3d" o={0.35} z={-0.01} />
          <G g={CHEV} c0={mixHex("#ff8a3d", "#ffd36a", warm)} c1={mixHex("#ffd36a", "#fff1b0", warm)} y={[-0.13, 0.13]} />
        </group>); }))}
      {/* basket */}
      <group scale={partK(t, 2)}>
        <G g={rrectLine(-1.75, -1.65, 1.75, 0.55, 0.28, 0.09)} c0="#6a70a0" c1="#e6e9ff" y={[-1.65, 0.55]} z={-0.1} />
        {Array.from({ length: 12 }, (_, i) => <G key={`h${i}`} g={rrect(-1.6 + i * 0.29, -1.7, -1.45 + i * 0.29, -1.6, 0.02)} c0="#05060f" c1="#11143a" z={-0.09} />)}
        {/* fries: pale → golden on every 8th of the drop */}
        {FRIES.map((fr, i) => { const gt = EV.golden[i], gk = t >= gt ? backOut((t - gt) / 0.25) : 0, gold = Math.min(1, gk), pop = gk > 0 && t - gt < 0.4 ? 1 + 0.15 * Math.sin(clamp01((t - gt) / 0.4) * Math.PI) : 1; return (
          <group key={`f${i}`} position={[fr.x, fr.y, 0.05 + i * 0.002]} rotation={[0, 0, fr.r]} scale={pop}>
            <G g={fryG} c0={mixHex("#ffb04a", "#9a3a1f", gold)} c1={mixHex("#fff1b0", "#ffb04a", gold)} y={[-0.42, 0.42]} />
            <G g={fryHi} c0="#ffffff" c1="#ffffff" z={0.001} o={0.35 + 0.2 * gold} />
          </group>); })}
      </group>
      {/* moisture droplets blown away */}
      {EV.drops.map((dt, i) => { const a = t - dt; if (a < 0 || a > 1.2) return null; const fr = FRIES[(i * 5) % 16], u = a / 1.2; return (
        <group key={`w${i}`} position={[fr.x + u * (i % 2 ? 1.6 : -1.6), fr.y + 0.3 + u * 1.6, 0.4]} scale={backOut(a / 0.2) * (1 - u * 0.5)}>
          <G g={dropG} c0="#4a9aff" c1="#e6e9ff" y={[-0.11, 0.15]} o={1 - u} />
        </group>); })}
      {EV.golden.map((gt, i) => { const a = t - gt; if (a < 0 || a > 0.5) return null; const fr = FRIES[i]; return <Halo key={`gl${i}`} at={[fr.x, fr.y]} r={0.3 + a * 1.4} c="#ffd36a" o={1 - a / 0.5} z={0.5} />; })}
      {/* thermometer */}
      <group position={[3.05, 0.4, 0]} scale={Math.max(0.001, backOut((tin - 0.8) / 0.3))}>
        <G g={rrect(-0.22, -1.8, 0.22, 1.8, 0.22)} c0="#6a70a0" c1="#e6e9ff" y={[-1.8, 1.8]} o={0.9} />
        <G g={rrect(-0.11, -1.7, 0.11, -1.7 + 3.3 * (0.08 + 0.92 * h), 0.1)} c0={mixHex("#ffb04a", "#c2457a", h)} c1={mixHex("#ffd36a", "#ff6f9c", h)} y={[-1.7, 1.6]} z={0.01} />
        <G g={CIRC} c0={mixHex("#ff8a3d", "#c2457a", h)} c1={mixHex("#ffd36a", "#ff6f9c", h)} rad={[-0.3, 0.3, 1.3]} p={[0, -1.9]} s={0.33} z={0.02} />
        <Halo at={[0, -1.9]} r={0.9} c="#ff6f9c" o={0.3 + 0.4 * h} z={0.03} />
      </group>
    </group>
  );
};

// ---------------- tags, camera, labels ----------------
type Tag = { txt: string | ((t: number) => string); at: V3; from: number; to: number; col: string };
const TAGS: Tag[] = [
  { txt: "FAN", at: [-1.35, 3.1, 0.5], from: EV.parts[0], to: OUT, col: "#c8cdf0" },
  { txt: "HEATER", at: [-1.15, 2.45, 0.5], from: EV.parts[1], to: OUT, col: "#ff8a3d" },
  { txt: "BASKET", at: [1.2, 0.8, 0.5], from: EV.parts[2], to: OUT, col: "#3fd0c0" },
  { txt: (t) => `${Math.round(temp(t))}°C`, at: [2.95, 2.55, 0.5], from: IN + 1.0, to: OUT, col: "#ff3a2a" },
  { txt: "HOT AIR", at: [-2.25, -0.4, 0.5], from: b(5) + 0.3, to: b(7), col: "#ff9a5a" },
  { txt: "WATER", at: [0.0, 0.95, 0.5], from: b(7) + 0.3, to: b(9), col: "#bfe6ff" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(10,11,36,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{typeof g.txt === "function" ? g.txt(t) : g.txt}</div>); })}</>
);
const HOME = { p: [0, 1.4, 24] as V3, l: [0, 1.4, 0] as V3 };
const WIN = { p: [0, -0.72, 2.6] as V3, l: [0, -0.72, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [0, 0.9, 21], l: [0, 0.9, 0] },
  { t: IN - 0.4, p: [0, -0.5, 9], l: [0, -0.5, 0] },
  { t: IN, ...WIN },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0, -0.8, 6], l: [0, -0.8, 0] },
  { t: IN + 0.9, p: [0.3, 0.45, 33], l: [0.3, 0.45, 0] },
  { t: b(5), p: [0.3, 0.35, 32.5], l: [0.3, 0.35, 0] },
  { t: b(6.6), p: [0.2, 0.25, 31], l: [0.2, 0.25, 0] },
  { t: b(7.4), p: [0, -0.3, 15], l: [0, -0.3, 0] },
  { t: b(8.8), p: [0, -0.35, 14.5], l: [0, -0.35, 0] },
  { t: b(9.3), p: [0, -0.2, 18], l: [0, -0.2, 0] },
  { t: OUT - 0.4, p: [0, -0.6, 9], l: [0, -0.6, 0] },
  { t: OUT, p: [0, -0.8, 6], l: [0, -0.8, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, ...WIN },
  { t: OUT + 0.4, p: [0, -0.5, 9], l: [0, -0.5, 0] },
  { t: OUT + 1.3, p: [0, 1.1, 22], l: [0, 1.1, 0] },
  { t: D - 2.6, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : inside(t) ? camAt(CAM_S, t) : camAt(CAM_B, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES AN" }], [{ t: "AIR FRYER", c: "#ff8a3d" }], [{ t: "ACTUALLY WORK? 🍟" }]];
const LABELS: LabelDef[] = [
  Lb(0, b(2), "#ff8a3d", HOOK, true),
  Lb(b(2), b(3) + 0.3, "#ff7a9a", [[{ t: "SPOILER:" }], [{ t: "IT DOESN'T FRY 😮", c: "#ff7a9a" }]]),
  Lb(b(3) + 0.3, b(5), "#ff8a3d", [[{ t: "A HEATER GETS" }], [{ t: "SUPER HOT", c: "#ff8a3d" }], [{ t: "UP TO 200°C" }]]),
  Lb(b(5), b(7), "#ff9a5a", [[{ t: "A FAN BLOWS" }], [{ t: "THE HOT AIR", c: "#ff9a5a" }], [{ t: "AROUND, FAST 🌪️" }]]),
  Lb(b(7), b(9), "#bfe6ff", [[{ t: "THE WIND DRIES" }], [{ t: "THE SURFACE", c: "#bfe6ff" }], [{ t: "OF THE FRIES" }]]),
  Lb(b(9), b(11), "#ffb02e", [[{ t: "ABOVE ~140°C:" }], [{ t: "MAILLARD REACTION", c: "#ffb02e" }], [{ t: "= GOLDEN CRUNCH" }]]),
  Lb(b(11), b(13), "#3fd0c0", [[{ t: "SO IT'S NOT A FRYER" }], [{ t: "IT'S A MINI" }], [{ t: "TURBO OVEN!", c: "#3fd0c0" }]]),
  Lb(b(13), D + 0.01, "#ff8a3d", HOOK, true),
];

const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const AirFryerVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const ins = inside(t);
  const cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/14-airfryer/music_v2.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={AF_PALETTE} outline={false} dither={0.07}>
        <CamSet p={cam.p} l={cam.l} />
        {ins ? <Inside t={t} map={glow} /> : <><Kitchen t={t} map={glow} /><AirFryer t={t} map={glow} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#1a1f52", opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ff8a3d" }}>@HOWTOWITHZAY</div>
      {ins && <TagsView t={t} cam={cam} />}
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
