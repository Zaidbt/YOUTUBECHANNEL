/**
 * Video 012 · How does a chameleon change color? — true pixel-art 3D, 48 s seamless loop @ 60 fps, 130 BPM funk carioca.
 * Jungle → into the skin (nano-crystal lattice: tight = blue reflection + yellow pigment = green, spread = red)
 * → back to the jungle (it's to talk, not to hide) → tongue catch → back to the start.
 * The colour timeline drives the skin, the crystal spacing AND the chords. Timing from chameleon.json.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./chameleon.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const LW = (2 * Math.PI) / EV.duration;
const BAR = EV.bar, BEAT = BAR / 4;
const bt = (bar: number) => bar * BAR;
/** The active timeline (the 48 s video or a cut-down hook). Set at the top of a composition's render. */
export type Timeline = { colors: number[][]; tongue: number; flyBack: number; lw: number; beamN: number; dur: number };
const MAIN_TL: Timeline = { colors: EV.colors, tongue: EV.tongue, flyBack: bt(23), lw: LW, beamN: 48, dur: EV.duration };
let TL: Timeline = MAIN_TL;
export const setTimeline = (x: Timeline) => { TL = x; };
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const JUNGLE_PALETTE = [
  "#06110a", "#0c1f12", "#143020", "#1f4a2a", "#2e6a35", "#3f8f3a", "#6fbf4a", "#a8e05a",
  "#3a2414", "#5a3a1f", "#8a5a2a",
  "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f", "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a",
  "#1f4abf", "#4a9aff", "#bfe6ff", "#ffffff", "#fff8d0", "#05080a",
];
const BG = "#06110a";
export const STATE = [
  { name: "GREEN", mid: "#3fcf6a", light: "#9bf08a", dark: "#1f8a4a", s: 0, refl: "#4a9aff" },
  { name: "YELLOW", mid: "#ffd23f", light: "#fff08a", dark: "#c8a010", s: 0.4, refl: "#9bf08a" },
  { name: "ORANGE", mid: "#ff8a1f", light: "#ffbf6a", dark: "#c85a10", s: 0.7, refl: "#ffd23f" },
  { name: "RED", mid: "#ff3a2a", light: "#ff8a7a", dark: "#8a1414", s: 1, refl: "#ff3a2a" },
];
export const stateAt = (t: number) => { let s = 0, at = 0, prev = 0; for (const [tt, c] of TL.colors) if (tt <= t + 1e-6) { prev = s; s = c; at = tt; } return { s, at, prev }; };
const spacingAt = (t: number) => { const { s, at, prev } = stateAt(t); return lerp(STATE[prev].s, STATE[s].s, ease((t - at) / 0.15)); };
const changeFlash = (t: number) => { const at = stateAt(t).at; return at === 0 ? 0 : Math.exp(-(t - at) / 0.12); }; // t=0 is already green (loop seam)

export function useAssets() {
  return useMemo(() => {
    const toon = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 230, 230, 230, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
    toon.minFilter = toon.magFilter = THREE.NearestFilter; toon.needsUpdate = true;
    const W = 64, H = 32, d = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = y / H; // around the body (0 = dorsal ridge, 0.5 = belly)
      let c = 214;
      if (x % 16 < 4 && v > 0.08 && v < 0.92) c = 172;                       // dark vertical bands
      if (Math.abs(v - 0.32) < 0.035 || Math.abs(v - 0.68) < 0.035) c = 255;  // light lateral stripe
      if (Math.abs(v - 0.5) < 0.1) c = 240;                                   // pale belly
      if ((x * 5 + y * 3) % 7 === 0) c -= 30;                                 // scales
      if ((x * 3 + y * 11) % 13 === 0) c = 250;                               // tubercles
      d.set([c, c, c, 255], (y * W + x) * 4);
    }
    const skin = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); skin.magFilter = skin.minFilter = THREE.NearestFilter; skin.wrapS = skin.wrapT = THREE.RepeatWrapping; skin.needsUpdate = true;
    return { toon, skin, glow: glowTexture() };
  }, []);
}
export const Toon: React.FC<{ c: string; map?: THREE.Texture | null; e?: number; o?: number }> = ({ c, map, e = 0, o }) => {
  const a = useAssets();
  return <meshToonMaterial color={c} map={map ?? null} gradientMap={a.toon} emissive={c} emissiveIntensity={e} transparent={o !== undefined} opacity={o ?? 1} depthWrite={o === undefined} />;
};
const Cam: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
export const cyl = (a: V3, b: V3, r: number, c: string, map?: THREE.Texture) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return <mesh position={mid.toArray()} quaternion={q}><cylinderGeometry args={[r, r * 0.9, va.distanceTo(vb), 10]} /><Toon c={c} map={map} /></mesh>;
};

// ===================== the chameleon =====================
const MOUTH: V3 = [3.72, 1.5, 0];
/** Side profile of a veiled chameleon, snout → tail base: [x, top, bottom, half-width]. Tall, laterally flat body,
 * a helmet-like casque on the head, a pointed snout. Lofted into one mesh with a dorsal ridge. */
const PROF: [number, number, number, number][] = [
  [3.8, 1.62, 1.42, 0.05], [3.45, 1.95, 1.22, 0.26], [3.0, 2.35, 1.08, 0.42], [2.5, 2.85, 1.02, 0.47], [2.05, 3.35, 1.05, 0.42],
  [1.7, 3.45, 1.08, 0.36], [1.42, 2.6, 1.05, 0.43], [1.15, 2.5, 0.95, 0.52], [0.5, 2.85, 0.55, 0.6], [-0.4, 2.95, 0.5, 0.62],
  [-1.3, 2.7, 0.72, 0.54], [-2.0, 2.15, 1.05, 0.38], [-2.5, 1.66, 1.2, 0.24],
];
const RINGS = 72, RS = 18;
const ring = (u: number) => {
  const k = Math.min(PROF.length - 1.0001, u * (PROF.length - 1)), i = Math.floor(k), f = k - i;
  const P = (j: number) => PROF[Math.max(0, Math.min(PROF.length - 1, j))];
  const cr = (c: number) => { const p0 = P(i - 1)[c], p1 = P(i)[c], p2 = P(i + 1)[c], p3 = P(i + 2)[c]; return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f); };
  return { x: cr(0), top: cr(1), bot: cr(2), hw: Math.max(0.03, cr(3)) };
};
const secPt = (r: ReturnType<typeof ring>, phi: number): V3 => {
  const cy = (r.top + r.bot) / 2, hh = (r.top - r.bot) / 2, c = Math.cos(phi);
  const narrow = 1 - 0.6 * Math.max(0, c) ** 2 - 0.2 * Math.max(0, -c) ** 2; // dorsal ridge + slight keel
  return [r.x, cy + hh * c, r.hw * Math.sin(phi) * narrow];
};
/** half-width of the body surface at (x, y) — to put eyes, lips and legs on the skin */
const surfZ = (x: number, y: number) => {
  let best = ring(0);
  for (let i = 0; i <= 200; i++) { const r = ring(i / 200); if (Math.abs(r.x - x) < Math.abs(best.x - x)) best = r; }
  const cy = (best.top + best.bot) / 2, hh = (best.top - best.bot) / 2, c = Math.max(-1, Math.min(1, (y - cy) / hh));
  return secPt(best, Math.acos(c))[2];
};
function bodyGeo() {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= RINGS; i++) {
    const r = ring(i / RINGS);
    for (let j = 0; j <= RS; j++) { pos.push(...secPt(r, (j / RS) * Math.PI * 2)); uv.push((i / RINGS) * 2.2, j / RS); }
  }
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < RS; j++) {
    const a = i * (RS + 1) + j, b = a + RS + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  for (const [i, flip] of [[0, false], [RINGS, true]] as [number, boolean][]) { // end caps
    const r = ring(i / RINGS), c = pos.length / 3; pos.push(r.x, (r.top + r.bot) / 2, 0); uv.push(0, 0.5);
    for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j; flip ? idx.push(c, a, a + 1) : idx.push(c, a + 1, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function tailGeo() {
  const pts: THREE.Vector3[] = [new THREE.Vector3(-2.45, 1.43, 0), new THREE.Vector3(-3.1, 1.25, 0), new THREE.Vector3(-3.7, 0.75, 0)];
  for (let i = 0; i <= 26; i++) { const th = (i / 26) * Math.PI * 2.5, r = 1.05 * (1 - i / 30); pts.push(new THREE.Vector3(-4.0 + Math.cos(th + 0.9) * r, -0.15 + Math.sin(th + 0.9) * r * 0.95, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts), SEG = 120, RAD = 10;
  const g = new THREE.TubeGeometry(curve, SEG, 1, RAD, false), p = g.attributes.position;
  for (let i = 0; i <= SEG; i++) {
    const c = curve.getPointAt(i / SEG), rad = 0.25 * (1 - i / SEG) ** 0.9 + 0.045;
    for (let j = 0; j <= RAD; j++) { const k = i * (RAD + 1) + j; p.setXYZ(k, c.x + (p.getX(k) - c.x) * rad, c.y + (p.getY(k) - c.y) * rad, c.z + (p.getZ(k) - c.z) * rad); }
  }
  g.computeVertexNormals();
  return g;
}
const branchY = (x: number) => -0.25 - 0.45 * (x + 16) / 34; // centre of the main branch (radius 0.55)
const flyPos = (t: number): V3 => [7.4 + 0.6 * Math.sin(6 * TL.lw * t), 3.2 + 0.5 * Math.sin(9 * TL.lw * t + 1), 0.3 * Math.cos(5 * TL.lw * t)];
const tongueLen = (t: number) => { const d = t - (TL.tongue - 0.12); if (d < 0 || d > 0.7) return 0; return d < 0.12 ? d / 0.12 : Math.max(0, 1 - (d - 0.12) / 0.5); };
const flyAlive = (t: number) => t < TL.tongue || t > TL.flyBack;
export const Chameleon: React.FC<{ t: number; map: THREE.Texture; state?: number; noFly?: boolean; gearEye?: boolean }> = ({ t, map, state, noFly }) => {
  const a = useAssets();
  const st = STATE[state ?? stateAt(t).s];
  const fl = changeFlash(t);
  const breathe = 1 + 0.05 * Math.sin(8 * TL.lw * t);
  const geo = useMemo(() => {
    const body = bodyGeo(), tail = tailGeo();
    const crest: [V3, number][] = [];
    for (let i = 0; i <= 200; i++) { const r = ring(i / 200); if (r.x < 1.35 && r.x > -2.25 && i % 7 === 0) crest.push([[r.x, r.top + 0.05, 0], 0.09 + 0.07 * Math.sin(((1.35 - r.x) / 3.6) * Math.PI)]); }
    const lip = (dy: number) => [3.55, 3.3, 3.0, 2.6, 2.3].map((x) => { const y = 1.5 - (3.72 - x) * 0.12 + dy; return [x, y, surfZ(x, y) - 0.02] as V3; });
    return { body, tail, crest, lipD: lip(0), lipL: lip(-0.1), eyeZ: surfZ(2.72, 2.15) };
  }, []);
  const tubeAlong = (pts: V3[], side: number, r: number, c: string, key: string) =>
    pts.slice(1).map((p, i) => <React.Fragment key={key + i}>{cyl([pts[i][0], pts[i][1], side * (pts[i][2] + 0.01)], [p[0], p[1], side * (p[2] + 0.01)], r, c)}</React.Fragment>);
  const eye = (side: number, k: number) => {
    const c: V3 = [2.72, 2.15, side * (geo.eyeZ - 0.05)];
    const yaw = 0.7 * Math.sin((7 + k * 3) * TL.lw * t + k), pitch = 0.35 * Math.sin((5 + k * 4) * TL.lw * t + 2 * k);
    const dir = new THREE.Vector3(Math.cos(pitch) * Math.sin(yaw) * 0.9, Math.sin(pitch), side * Math.max(0.35, Math.cos(pitch) * Math.cos(yaw))).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const at = (d: number): V3 => [c[0] + dir.x * d, c[1] + dir.y * d, c[2] + dir.z * d];
    return (
      <group key={side}>
        <mesh position={c}><sphereGeometry args={[0.36, 14, 10]} /><Toon c={st.mid} map={a.skin} /></mesh>
        <mesh position={at(0.3)} quaternion={q}><cylinderGeometry args={[0.12, 0.26, 0.2, 12]} /><Toon c={st.light} map={a.skin} /></mesh>
        <mesh position={at(0.4)}><sphereGeometry args={[0.1, 8, 6]} /><Toon c="#05080a" /></mesh>
        <mesh position={at(0.47)}><sphereGeometry args={[0.035, 4, 3]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
    );
  };
  const leg = (x: number, s: number, front: boolean, key: number) => {
    const by = branchY(x), hip: V3 = [x, front ? 1.15 : 1.05, s * 0.4], knee: V3 = [x + (front ? 0.45 : -0.45), 0.62, s * 0.82];
    const wrist: V3 = [x + (front ? 0.2 : -0.15), by + 0.66, s * 0.3];
    const toe = (ang: number, dx: number): V3 => [wrist[0] + dx, by + 0.62 * Math.cos(ang), s * 0.62 * Math.sin(ang)];
    return (
      <group key={key}>
        {cyl(hip, knee, 0.15, st.mid, a.skin)}{cyl(knee, wrist, 0.12, st.mid, a.skin)}
        <mesh position={knee}><sphereGeometry args={[0.15, 8, 6]} /><Toon c={st.mid} map={a.skin} /></mesh>
        {cyl(wrist, toe(1.0, 0.08), 0.085, st.dark)}{cyl(wrist, toe(-0.75, -0.08), 0.085, st.dark)}
      </group>
    );
  };
  const L = tongueLen(t);
  const fly = flyPos(t);
  const tip: V3 = [MOUTH[0] + (fly[0] - MOUTH[0]) * L, MOUTH[1] + (fly[1] - MOUTH[1]) * L, MOUTH[2] + (fly[2] - MOUTH[2]) * L];
  return (
    <group>
      <mesh geometry={geo.body} scale={[1, 1, breathe]}><Toon c={st.mid} map={a.skin} e={0.15 * fl} /></mesh>
      {geo.crest.map(([p, h], i) => <mesh key={i} position={p}><coneGeometry args={[h * 0.55, h * 2, 4]} /><Toon c={st.dark} /></mesh>)}
      {[1, -1].map((sd) => <group key={sd}>{tubeAlong(geo.lipL, sd, 0.05, st.light, "l")}{tubeAlong(geo.lipD, sd, 0.022, "#05080a", "d")}</group>)}
      {eye(1, 0)}{eye(-1, 1)}
      <mesh geometry={geo.tail}><Toon c={st.mid} map={a.skin} /></mesh>
      {leg(1.15, 1, true, 0)}{leg(1.15, -1, true, 1)}{leg(-1.3, 1, false, 2)}{leg(-1.3, -1, false, 3)}
      {L > 0 && <>{cyl(MOUTH, tip, 0.11, "#ff8a7a")}<mesh position={tip}><sphereGeometry args={[0.24, 10, 8]} /><Toon c="#ff3a2a" /></mesh></>}
      {!noFly && flyAlive(t) && (
        <group position={fly}>
          <mesh><sphereGeometry args={[0.2, 8, 6]} /><Toon c="#05080a" /></mesh>
          {[1, -1].map((s) => <mesh key={s} position={[0, 0.18, s * 0.18]} rotation={[s * (0.6 + 0.5 * Math.sin(t * 90)), 0, 0]}><planeGeometry args={[0.35, 0.18]} /><meshBasicMaterial color="#bfe6ff" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
        </group>
      )}
      <Glow map={map} at={[0.5, 1.8, -0.8]} size={9 + 3 * fl} color={st.mid} opacity={0.15 + 0.2 * fl} />
    </group>
  );
};

// ===================== the jungle =====================
const LEAVES = Array.from({ length: 46 }, (_, i) => ({
  p: [(rnd(i) - 0.5) * 50, (rnd(i + 1) - 0.4) * 34, -6 - rnd(i + 2) * 24] as V3,
  s: 1.6 + rnd(i + 3) * 2.6, r: rnd(i + 4) * Math.PI, c: ["#1f4a2a", "#2e6a35", "#3f8f3a", "#143020"][i % 4],
}));
export const Jungle: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => (
  <group>
    {cyl([-16, -0.25, 0], [18, -0.7, 0], 0.55, "#5a3a1f")}
    {cyl([7, -0.55, 0], [10.5, 1.4, -0.6], 0.25, "#5a3a1f")}
    {[[10.5, 1.4, -0.6], [-9, -0.3, 0.2]].map((p, i) => <mesh key={i} position={p as V3} rotation={[0.4, 0.3 * i, 0.6]} scale={[1.6, 0.25, 0.8]}><sphereGeometry args={[1, 10, 6]} /><Toon c="#6fbf4a" /></mesh>)}
    {LEAVES.map((l, i) => (
      <mesh key={i} position={l.p} rotation={[0.3, 0.2, l.r + 0.08 * Math.sin(2 * TL.lw * t + i)]} scale={[l.s, l.s * 0.38, 0.12]}><sphereGeometry args={[1, 10, 6]} /><Toon c={l.c} /></mesh>
    ))}
    {Array.from({ length: 7 }, (_, i) => cyl([-14 + i * 5, 16, -8 - i], [-13.4 + i * 5 + Math.sin(i) * 1.2, 2 + rnd(i) * 4, -8 - i], 0.12, "#2e6a35"))}
    {/* foreground framing leaves */}
    <mesh position={[-6.5, 7.5, 6]} rotation={[0.2, 0.3, -0.6]} scale={[4, 1.3, 0.2]}><sphereGeometry args={[1, 12, 6]} /><Toon c="#1f4a2a" /></mesh>
    <mesh position={[7.5, -4.5, 6]} rotation={[0.2, -0.3, 0.5]} scale={[4, 1.3, 0.2]}><sphereGeometry args={[1, 12, 6]} /><Toon c="#143020" /></mesh>
    <Glow map={map} at={[5, 9, -34]} size={30} color="#fff08a" opacity={0.35} />
    <Glow map={map} at={[5, 9, -33]} size={12} color="#fff8d0" opacity={0.5} />
    {/* lower canopy: bright leaves + a hanging flower vine below the branch */}
    {Array.from({ length: 14 }, (_, i) => (
      <mesh key={`lo${i}`} position={[-8 + i * 1.3 + rnd(i + 90) * 0.8, -2.2 - rnd(i + 91) * 3.8, 1 + rnd(i + 92) * 4]} rotation={[0.5, 0.3 * rnd(i + 93), (rnd(i + 94) - 0.5) * 2.4 + 0.06 * Math.sin(3 * TL.lw * t + i)]} scale={[2.0, 0.75, 0.15]}>
        <sphereGeometry args={[1, 10, 6]} /><Toon c={["#3f8f3a", "#2e6a35", "#6fbf4a", "#1f4a2a"][i % 4]} e={0.35} />
      </mesh>
    ))}
    {cyl([-2.6, -0.4, 0.6], [-2.2 + 0.3 * Math.sin(2 * TL.lw * t), -4.4, 1.2], 0.07, "#3f8f3a")}
    {cyl([4.6, -0.6, 0.6], [4.9 + 0.3 * Math.sin(2 * TL.lw * t + 1), -3.6, 1.2], 0.07, "#3f8f3a")}
    {[[-2.2, -4.5, 1.2, "#ff3a2a"], [4.9, -3.7, 1.2, "#ffd23f"], [-4.8, -2.6, 3, "#ff8a1f"], [5.2, -1.9, 2.6, "#ff3a2a"]].map(([x, y, z, c], i) => (
      <group key={`fl${i}`} position={[x as number, y as number, z as number]}>
        {Array.from({ length: 5 }, (_, k) => <mesh key={k} rotation={[0, 0, (k / 5) * Math.PI * 2 + 0.1 * Math.sin(2 * TL.lw * t)]} position={[0.35 * Math.cos((k / 5) * Math.PI * 2), 0.35 * Math.sin((k / 5) * Math.PI * 2), 0]} scale={[0.45, 0.22, 0.1]}><sphereGeometry args={[1, 8, 6]} /><Toon c={c as string} /></mesh>)}
        <mesh><sphereGeometry args={[0.18, 8, 6]} /><Toon c="#fff08a" /></mesh>
      </group>
    ))}
    {/* god rays + dust */}
    {[[-4, 10, -10], [3, 12, -12], [9, 11, -14]].map((p, i) => (
      <sprite key={i} position={p as V3} scale={[3.2, 26, 1]}>
        <spriteMaterial map={map} color="#fff8d0" transparent opacity={0.28 + 0.06 * Math.sin(4 * TL.lw * t + i)} rotation={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    ))}
    {Array.from({ length: 36 }, (_, i) => <Glow key={i} map={map} at={[(rnd(i + 50) - 0.5) * 26 + 0.8 * Math.sin(3 * TL.lw * t + i), (rnd(i + 60) - 0.3) * 16 + 0.6 * Math.cos(2 * TL.lw * t + i), (rnd(i + 70) - 0.5) * 10]} size={0.25} color="#fff8d0" opacity={0.7} />)}
  </group>
);

// ===================== inside the skin =====================
export const Skin: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const sp = spacingAt(t), st = STATE[stateAt(t).s], fl = changeFlash(t);
  const gap = 0.62 + 0.75 * sp;
  const crystals: V3[] = [];
  for (let i = -6; i <= 6; i++) for (let j = 0; j < 4; j++) for (let k = -1; k <= 0; k++) crystals.push([i * gap + (j % 2) * gap * 0.5, 1.0 + (j - 1.5) * gap * 0.8, k * gap]);
  const refl = STATE.find((x) => Math.abs(x.s - sp) < 0.2)?.refl ?? st.refl;
  const beam = (a: V3, b: V3, color: string, n = 26, phase = 0) =>
    Array.from({ length: n }, (_, i) => { const u = ((i / n + TL.beamN * t / TL.dur + phase) % 1); return <Glow key={`${color}${i}`} map={map} at={[a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]} size={0.75} color={color} opacity={0.95} />; });
  return (
    <group>
      {/* skin surface (shows the final colour) and the yellow pigment layer */}
      <mesh position={[0, 4.6, 0]}><boxGeometry args={[14, 0.5, 4]} /><Toon c={st.mid} e={0.3 + 0.4 * fl} /></mesh>
      <mesh position={[0, 3.55, 0]}><boxGeometry args={[14, 1.2, 4]} /><Toon c="#ffd23f" o={0.55} /></mesh>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-6 + i * 1.5, 3.55, 0.6]}><sphereGeometry args={[0.38, 10, 8]} /><Toon c="#fff08a" /></mesh>)}
      {/* the iridophore cell with its crystal lattice */}
      <mesh position={[0, 1.0, -0.4]}><boxGeometry args={[14, 4.4, 3.2]} /><Toon c="#0c1f12" o={0.6} /></mesh>
      {crystals.map((p, i) => <mesh key={i} position={p}><octahedronGeometry args={[0.24, 0]} /><meshBasicMaterial color={i % 3 === 0 ? "#ffffff" : "#bfe6ff"} /></mesh>)}
      {/* melanophores (dark pigment) underneath */}
      <mesh position={[0, -2.6, -0.4]}><boxGeometry args={[14, 1.4, 3.2]} /><Toon c="#3a2414" /></mesh>
      {Array.from({ length: 7 }, (_, i) => <mesh key={`m${i}`} position={[-6 + i * 2, -2.3, 1.0]} scale={[0.8, 0.45, 0.3]}><sphereGeometry args={[1, 10, 6]} /><Toon c="#5a3a1f" /></mesh>)}
      {/* white light in, coloured light out */}
      {beam([-7, 9, 1.2], [0, 0.6, 1.2], "#ffffff")}
      {beam([0, 0.6, 1.2], [7, 9, 1.2], refl, 26, 0.5)}
      <Glow map={map} at={[0, 0.6, 1.4]} size={2.4 + 2 * fl} color={refl} opacity={0.8} />
      {/* spacing indicator */}
      <mesh position={[-gap / 2, -0.75, 1.3]}><boxGeometry args={[0.08, 0.6, 0.08]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[gap / 2, -0.75, 1.3]}><boxGeometry args={[0.08, 0.6, 0.08]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[0, -0.75, 1.3]}><boxGeometry args={[gap, 0.08, 0.08]} /><meshBasicMaterial color={refl} /></mesh>
    </group>
  );
};

// ===================== camera, labels, composition =====================
const HOME = { p: [0.6, 3.4, 21] as V3, l: [0.2, 2.6, 0] as V3 };
const JCAM: CamKey[] = [
  { t: 0, ...HOME }, { t: 1.4, ...HOME },
  { t: bt(3.6), p: [2.6, 2.4, 8.5], l: [1.2, 1.6, 0] },
  { t: bt(4), p: [2.4, 2.2, 6.5], l: [1.2, 1.6, 0] },
  { t: bt(16), p: [3, 2.8, 12], l: [1.5, 1.6, 0] },
  { t: bt(18), p: [-1, 2.6, 15], l: [0.5, 1.5, 0] },
  { t: bt(19.6), p: [4.2, 3, 18], l: [4.2, 2.6, 0] }, { t: bt(21), p: [4.2, 3, 17], l: [4.2, 2.6, 0] },
  { t: bt(22), p: [1.5, 3.4, 19], l: [0.8, 1.4, 0] },
  { t: 46.2, ...HOME }, { t: 48, ...HOME },
];
const SCAM: CamKey[] = [
  { t: bt(4), p: [0, 2.2, 12.5], l: [0, 1.6, 0] },
  { t: bt(6), p: [-2, 2.6, 11], l: [-0.5, 1.5, 0] },
  { t: bt(8), p: [0, 1.6, 10], l: [0, 1.0, 0] },
  { t: bt(12), p: [2, 2, 12], l: [0, 1.4, 0] },
  { t: bt(16), p: [0, 2.2, 13], l: [0, 1.6, 0] },
];
const sceneAt = (t: number) => (t >= bt(4) && t < bt(16) ? "skin" : "jungle");
const flashAt = (t: number) => Math.max(...[bt(4), bt(16)].map((s) => Math.exp(-(((t - s) / 0.13) ** 2))));
const S = STATE;
const HOOK = [[{ t: "HOW DOES A" }], [{ t: "CHAMELEON", c: S[0].mid }], [{ t: "CHANGE COLOR? 🎧" }]];
const LABELS: LabelDef[] = [
  { from: 0, to: bt(2), anchor: [1.5, 3.4, 0], border: S[0].mid, lines: HOOK, hold: true },
  { from: bt(2), to: bt(4), anchor: [1.2, 2.9, 0], border: "#ffffff", lines: [[{ t: "NOT JUST PAINT..." }], [{ t: "IT'S LIGHT", c: "#fff08a" }]] },
  { from: bt(4), to: bt(6), anchor: [0, 3.0, 0], border: "#bfe6ff", lines: [[{ t: "ITS SKIN HAS" }], [{ t: "TINY CRYSTALS", c: "#bfe6ff" }]] },
  { from: bt(6), to: bt(8), anchor: [-1.5, 5.4, 0], border: "#ffffff", lines: [[{ t: "LIGHT BOUNCES" }], [{ t: "OFF THEM", c: "#fff08a" }]] },
  { from: bt(8), to: bt(10), anchor: [0, 5.4, 0], border: S[0].mid, lines: [[{ t: "CRYSTALS CLOSE" }], [{ t: "BLUE", c: "#4a9aff" }, { t: " + " }, { t: "YELLOW", c: "#ffd23f" }], [{ t: "= GREEN", c: S[0].mid }]] },
  { from: bt(10), to: bt(12), anchor: [0, 5.4, 0], border: S[3].mid, lines: [[{ t: "CRYSTALS SPREAD" }], [{ t: "= RED", c: S[3].mid }]] },
  { from: bt(12), to: bt(14), anchor: [0, 5.4, 0], border: "#ffffff", lines: [[{ t: "CALM", c: S[0].mid }, { t: " → GREEN" }], [{ t: "EXCITED", c: S[3].mid }, { t: " → RED" }]] },
  { from: bt(16), to: bt(18), anchor: [1.5, 3.3, 0], border: S[0].mid, lines: [[{ t: "NOT TO HIDE..." }]] },
  { from: bt(18), to: bt(20), anchor: [1.0, 3.4, 0], border: S[3].mid, lines: [[{ t: "IT'S TO TALK", c: S[3].mid }], [{ t: "TO RIVALS" }], [{ t: "& MATES" }]] },
  { from: bt(20), to: bt(22), anchor: [4.2, 4.6, 0], border: "#ff8a7a", lines: [[{ t: "BONUS: ITS TONGUE" }], [{ t: "UP TO 2X", c: "#ff8a7a" }], [{ t: "ITS BODY" }]] },
  { from: bt(22), to: bt(25), anchor: [1.2, 3.4, 0], border: "#fff08a", lines: [[{ t: "NOW YOU KNOW." }], [{ t: "@HOWTOWITHZAY", c: "#fff08a" }]] },
  { from: bt(25), to: 48.01, anchor: [1.5, 3.4, 0], border: S[0].mid, lines: HOOK, hold: true },
];

export const ChameleonVideo: React.FC = () => {
  setTimeline(MAIN_TL);
  const t = useCurrentFrame() / FPS;
  const a = useAssets();
  const sc = sceneAt(t);
  const cam = sc === "skin" ? camAt(SCAM, t) : camAt(JCAM, t);
  const st = STATE[stateAt(t).s];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/12-chameleon/music.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={JUNGLE_PALETTE} outlineColor="#05080a">
        <Cam p={cam.p} l={cam.l} />
        <ambientLight intensity={sc === "skin" ? 0.8 : 0.5} color={sc === "skin" ? "#ffffff" : "#a8e05a"} />
        <directionalLight position={[-6, 14, 10]} intensity={1.9} color="#fff8d0" />
        <directionalLight position={[8, -2, -6]} intensity={0.6} color="#4a9aff" />
        {sc === "jungle" ? (<><Jungle t={t} map={a.glow} /><Chameleon t={t} map={a.glow} /></>) : <Skin t={t} map={a.glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#fff8d0", opacity: Math.round(flashAt(t) * 3) / 3 }} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: st.mid, textShadow: "4px 4px 0 #05080a, -4px 0 0 #05080a, 0 -4px 0 #05080a" }}>● {st.name}</div>
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};
