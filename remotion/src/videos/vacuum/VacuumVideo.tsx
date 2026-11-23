/**
 * Video 039 · How does a cordless vacuum work? — @engineeredwithin1-style explainer through the SoftPixel pipeline
 * (lit 3D, soft shadows, AO, DOF, fine pixels): real-life hook (cereal on a wooden floor), speed HUD + RPM counter,
 * one question per step in a numbered banner, a cutaway toy-coloured vacuum (impeller, 14 cyclones, bin, filter,
 * battery, trigger), one continuous camera that rides up the wand, ×4 speed-up back to real speed.
 * Facts (manufacturer figures, "up to"): 125,000 rpm motor, 14 cyclones, up to 79,000 g.
 * 34.8 s loop, 124 BPM filter house (vacuum.json + music.wav from videos/39-vacuum/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import EV from "./vacuum.json";
import { SoftPixelCanvas } from "../../brand/SoftPixel";
import { camAt, CamKey } from "../teasers/Majestic";
import { project } from "../../brand/Labels";

loadFont({ family: "Pixelify", url: staticFile("fonts/PixelifySans.ttf"), weight: "400 700" });
loadFont({ family: "Silk", url: staticFile("fonts/Silkscreen-Regular.ttf") });
loadFont({ family: "SilkB", url: staticFile("fonts/Silkscreen-Bold.ttf") });
export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type Seg = [number, number, number, number];
const D = EV.duration, BEAT = EV.beat, BAR = EV.bar;
const LW = (2 * Math.PI) / D;
const FOV = 30;
const L = EV.l as number[], SPEED = EV.speed as Seg[], STEPS = EV.steps as number[][], POPS = EV.pops as number[], DELTA = EV.delta;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const backOut = (x: number) => { const k = clamp01(x), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;
const slowAt = (t: number) => { const s = SPEED.find(([a, c]) => t >= a && t < c) ?? SPEED[SPEED.length - 1]; const u = clamp01((t - s[0]) / (s[1] - s[0])); return s[2] * Math.pow(s[3] / s[2], u); };
const F0 = EV.rpm / 60;
const REV = (() => { const N = 8000, dt = D / N; let a = 0; const arr = [0]; for (let i = 0; i < N; i++) { a += Math.min(F0 / slowAt(i * dt), 30) * dt; arr.push(a); } return { arr, dt }; })();
const spinA = (t: number) => 2 * Math.PI * (REV.arr[Math.min(REV.arr.length - 1, Math.floor(t / REV.dt))] % 1);

// ================= materials =================
const M = {
  shell: new THREE.MeshPhysicalMaterial({ color: "#d9dce6", roughness: 0.35, metalness: 0.2, clearcoat: 0.6, transparent: true }),
  accent: new THREE.MeshStandardMaterial({ color: "#7b5cff", roughness: 0.35, metalness: 0.3 }),
  wand: new THREE.MeshStandardMaterial({ color: "#e0445e", roughness: 0.3, metalness: 0.5 }),
  steel: new THREE.MeshStandardMaterial({ color: "#c7ccd8", roughness: 0.25, metalness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: "#2c3044", roughness: 0.5, metalness: 0.3 }),
  bin: new THREE.MeshPhysicalMaterial({ color: "#e8f4ff", roughness: 0.05, transmission: 0.85, thickness: 0.2, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
  cyclone: new THREE.MeshStandardMaterial({ color: "#2fc4b2", roughness: 0.3, metalness: 0.2 }),
  copper: new THREE.MeshStandardMaterial({ color: "#e08a3c", roughness: 0.3, metalness: 0.8 }),
  magnet: new THREE.MeshStandardMaterial({ color: "#ff4f5f", roughness: 0.4 }),
  impeller: new THREE.MeshStandardMaterial({ color: "#ffd23f", roughness: 0.3, metalness: 0.5 }),
  filter: new THREE.MeshStandardMaterial({ color: "#a98bff", roughness: 0.6 }),
  battery: new THREE.MeshStandardMaterial({ color: "#ffd23f", roughness: 0.35 }),
  cellTop: new THREE.MeshStandardMaterial({ color: "#3a86d8", roughness: 0.3, metalness: 0.4 }),
  trigger: new THREE.MeshStandardMaterial({ color: "#ff4f5f", roughness: 0.35 }),
  brush: new THREE.MeshStandardMaterial({ color: "#ff4f5f", roughness: 0.6 }),
  cereal: new THREE.MeshStandardMaterial({ color: "#f0a03c", roughness: 0.7 }),
  dust: new THREE.MeshStandardMaterial({ color: "#9a8e80", roughness: 0.9 }),
  air: new THREE.MeshBasicMaterial({ color: "#bfe6ff", transparent: true, opacity: 0.8 }),
  wall: new THREE.MeshStandardMaterial({ color: "#2a2f55", roughness: 0.9 }),
  sofa: new THREE.MeshStandardMaterial({ color: "#5b4fc4", roughness: 0.8 }),
};
const woodTex = (() => {
  const W = 64, H = 64, d = new Uint8Array(W * H * 4), rp = [[122, 74, 42], [150, 94, 54], [178, 116, 66], [200, 138, 84]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const plank = Math.floor(y / 16); const g = Math.sin(x * 0.35 + plank * 4 + Math.sin(y * 0.7) * 1.4) * 0.5 + 0.5; const c = y % 16 === 0 ? [90, 54, 32] : rp[Math.min(3, Math.floor(g * 2.4 + (plank % 2)))]; d.set([c[0], c[1], c[2], 255], (y * W + x) * 4); }
  const t = new THREE.DataTexture(d, W, H); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
})();
const floorMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55 });

// ================= the vacuum (local frame: +x = toward the floor head) =================
const THETA = -1.2;
const GPOS: V3 = [-3.5, 9.45, 0];
const toWorld = (p: V3): V3 => [GPOS[0] + p[0] * Math.cos(THETA) - p[1] * Math.sin(THETA), GPOS[1] + p[0] * Math.sin(THETA) + p[1] * Math.cos(THETA), GPOS[2] + p[2]];
const WAND0 = 2.3, WAND1 = 9.3;
const P = { impeller: [-0.55, 0, 0] as V3, motor: [-1.1, 0, 0] as V3, cyclones: [0.15, 0, 0] as V3, bin: [1.25, 0, 0] as V3, filter: [-1.85, 0, 0] as V3, battery: [-0.55, -1.45, 0] as V3, trigger: [-1.05, -0.75, 0.0] as V3, head: [9.75, 0, 0] as V3 };
const W = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, toWorld(v)])) as Record<keyof typeof P, V3>;
const HEADW: V3 = [toWorld(P.head)[0], 0.3, 0];
const Vacuum: React.FC<{ t: number; xray: number }> = ({ t, xray }) => {
  const g = useMemo(() => ({ handle: new RoundedBoxGeometry(0.55, 1.7, 0.5, 4, 0.2), batt: new RoundedBoxGeometry(1.0, 1.25, 0.72, 4, 0.18), head: new RoundedBoxGeometry(0.9, 0.5, 2.4, 4, 0.16) }), []);
  M.shell.opacity = 1 - 0.82 * xray; M.shell.depthWrite = xray < 0.5;
  const a = spinA(t), slow = slowAt(t), blur = slow < 40;
  return (
    <group position={GPOS} rotation={[0, 0, THETA]}>
      {/* bin + cyclone pack */}
      <mesh material={M.bin} position={P.bin} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.9, 0.9, 2.2, 40, 1, true]} /></mesh>
      <mesh material={M.accent} position={[2.38, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.92, 0.92, 0.12, 40]} /></mesh>
      <mesh material={M.shell} position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.95, 0.85, 0.9, 40, 1, true]} /></mesh>
      {Array.from({ length: 14 }, (_, i) => { const ang = (i / 14) * Math.PI * 2; return (
        <group key={i} position={[0.15, 0.62 * Math.cos(ang), 0.62 * Math.sin(ang)]}>
          <mesh material={M.cyclone} rotation={[0, 0, -Math.PI / 2]} castShadow><coneGeometry args={[0.15, 0.8, 14, 1, true]} /></mesh>
        </group>); })}
      <mesh material={M.steel} position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 1.0, 24]} /></mesh>
      {/* motor + impeller */}
      <mesh material={M.shell} position={P.motor} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.6, 0.6, 1.3, 32, 1, xray > 0.5]} /></mesh>
      <group position={P.motor} rotation={[a, 0, 0]}>
        {[0, Math.PI].map((r) => <mesh key={r} material={M.magnet} rotation={[r, 0, 0]} position={[0, 0.18, 0]}><boxGeometry args={[0.9, 0.12, 0.3]} /></mesh>)}
      </group>
      {[0, 1, 2, 3].map((k) => <mesh key={k} material={M.copper} position={[P.motor[0], 0.38 * Math.cos(k * Math.PI / 2), 0.38 * Math.sin(k * Math.PI / 2)]} rotation={[k * Math.PI / 2, 0, 0]}><boxGeometry args={[0.85, 0.12, 0.2]} /></mesh>)}
      <group position={P.impeller} rotation={[a, 0, 0]}>
        {!blur && Array.from({ length: 9 }, (_, i) => <mesh key={i} material={M.impeller} rotation={[(i / 9) * Math.PI * 2, 0, 0]} position={[0, 0.2, 0]}><boxGeometry args={[0.08, 0.34, 0.06]} /></mesh>)}
        {blur && <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.38, 0.38, 0.08, 24]} /><meshStandardMaterial color="#ffd23f" transparent opacity={0.55} /></mesh>}
        <mesh material={M.steel} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.5, 12]} /></mesh>
      </group>
      {/* filter (rear) */}
      <mesh material={M.filter} position={P.filter} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.55, 0.55, 0.45, 28]} /></mesh>
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} material={M.accent} position={[P.filter[0], 0.56 * Math.cos(i * 0.628), 0.56 * Math.sin(i * 0.628)]} rotation={[i * 0.628, 0, 0]}><boxGeometry args={[0.47, 0.04, 0.08]} /></mesh>)}
      {/* handle, trigger, battery */}
      <mesh geometry={g.handle} material={M.shell} position={[-1.35, -1.1, 0]} rotation={[0, 0, 0.32]} castShadow />
      <mesh material={M.trigger} position={P.trigger} rotation={[0, 0, 0.3]} castShadow><boxGeometry args={[0.18, 0.42, 0.22]} /></mesh>
      <mesh geometry={g.batt} material={M.shell} position={P.battery} castShadow />
      {xray > 0.3 && [[-0.28, -0.2], [0.28, -0.2], [-0.28, 0.2], [0.28, 0.2]].map(([x, z], i) => <group key={i} position={[P.battery[0] + x * 0.9, P.battery[1], z]}>
        <mesh material={M.battery}><cylinderGeometry args={[0.17, 0.17, 1.05, 18]} /></mesh>
        <mesh material={M.cellTop} position={[0, 0.54, 0]}><cylinderGeometry args={[0.1, 0.1, 0.05, 12]} /></mesh>
      </group>)}
      {/* wand + floor head */}
      <mesh material={M.wand} position={[(WAND0 + WAND1) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.2, 0.2, WAND1 - WAND0, 24]} /></mesh>
      <group position={P.head} rotation={[0, 0, -THETA]}>
        <mesh geometry={g.head} material={M.dark} castShadow receiveShadow />
        <mesh material={M.accent} position={[0, 0.27, 0]}><boxGeometry args={[0.6, 0.06, 2.3]} /></mesh>
        <group position={[0.15, -0.12, 0]} rotation={[0, 0, -a * 0.02 - t * 9]}>
          <mesh material={M.brush} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 2.2, 16]} /></mesh>
          {Array.from({ length: 6 }, (_, i) => <mesh key={i} material={M.dark} rotation={[0, 0, (i / 6) * Math.PI * 2]} position={[0.2 * Math.cos((i / 6) * Math.PI * 2), 0.2 * Math.sin((i / 6) * Math.PI * 2), 0]}><boxGeometry args={[0.06, 0.06, 2.2]} /></mesh>)}
        </group>
      </group>
    </group>
  );
};
// ================= particles: cereal stream on the floor, dust up the wand, air through cyclones/motor/filter =================
const CER = 16;
const cerZ = (j: number) => ((((j % CER) * 7919) % 97) / 97 - 0.5) * 1.8;
const Cereal: React.FC<{ t: number }> = ({ t }) => {
  const g = useMemo(() => new THREE.TorusGeometry(0.16, 0.07, 8, 16), []);
  const j0 = Math.floor(t / DELTA) - 2, out: React.ReactElement[] = [];
  for (let j = j0; j < j0 + 14; j++) {
    const a = j * DELTA, dt = a - t;
    if (dt > 0) { const x = HEADW[0] - 0.6 - dt * 1.6; out.push(<mesh key={j} geometry={g} material={M.cereal} position={[x, 0.07, cerZ(j)]} rotation={[Math.PI / 2 + 0.3 * Math.sin(j), 0, j]} castShadow />); }
    else if (dt > -0.22) { const k = -dt / 0.22; out.push(<mesh key={j} geometry={g} material={M.cereal} position={[HEADW[0] - 0.6 + 0.5 * k, 0.07 + 0.35 * k, cerZ(j) * (1 - k)]} scale={1 - k * 0.8} rotation={[k * 6, j, 0]} />); }
  }
  return <>{out}</>;
};
const along = (pts: V3[], u: number): V3 => { const f = clamp01(u) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k), lerp(pts[i][2], pts[i + 1][2], k)]; };
const DUSTPATH: V3[] = [[WAND1, 0, 0], [WAND0 + 0.2, 0, 0], [2.0, 0.55, 0.3], [1.4, 0.6, -0.5], [0.9, -0.3, -0.6], [1.5, -0.6, 0.3], [1.9, -0.75, 0.1]];
const Dust: React.FC<{ t: number }> = ({ t }) => (
  <group position={GPOS} rotation={[0, 0, THETA]}>
    {Array.from({ length: 22 }, (_, k) => { const u = ((t * 0.18 + k / 22) % 1); const p = along(DUSTPATH, u); return <mesh key={k} material={k % 3 ? M.dust : M.cereal} position={p} scale={k % 3 ? 0.6 : 1}><sphereGeometry args={[0.07, 8, 6]} /></mesh>; })}
    {Array.from({ length: 30 }, (_, k) => <mesh key={`b${k}`} material={M.dust} position={[1.95 - (k % 3) * 0.12, -0.78 + (k % 2) * 0.06, ((k * 37) % 13) / 13 * 1.2 - 0.6]}><sphereGeometry args={[0.06, 6, 5]} /></mesh>)}
  </group>
);
const Air: React.FC<{ t: number; mode: "cyclone" | "motor" | "exhaust" }> = ({ t, mode }) => (
  <group position={GPOS} rotation={[0, 0, THETA]}>
    {Array.from({ length: mode === "cyclone" ? 28 : 18 }, (_, k) => {
      const u = ((t * 0.5 + k / 18) % 1);
      let p: V3;
      if (mode === "cyclone") { const c = k % 14, ang = (c / 14) * Math.PI * 2, sw = u * Math.PI * 6; const r = 0.13 * (1 - u * 0.7); p = [0.55 - u * 0.8, 0.62 * Math.cos(ang) + r * Math.cos(sw), 0.62 * Math.sin(ang) + r * Math.sin(sw)]; }
      else if (mode === "motor") { const ang = k * 2.4 + u * 4; p = [0.0 - u * 1.6, 0.3 * Math.cos(ang) * (1 - u * 0.3), 0.3 * Math.sin(ang)]; }
      else { const ang = k * 1.7; p = [-2.05 - u * 1.8, (0.2 + u * 0.8) * Math.cos(ang), (0.2 + u * 0.8) * Math.sin(ang)]; }
      return <mesh key={k} material={M.air} position={p} scale={[1, 0.5, 0.5]}><sphereGeometry args={[0.045, 6, 4]} /></mesh>;
    })}
  </group>
);
const Room: React.FC = () => (
  <group>
    <mesh material={floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow><planeGeometry args={[60, 40]} /></mesh>
    <mesh material={M.wall} position={[0, 10, -9]} receiveShadow><planeGeometry args={[60, 30]} /></mesh>
    <group position={[-7, 0, -6]}>
      <mesh material={M.sofa} position={[0, 1.2, 0]} castShadow><boxGeometry args={[7, 2.4, 2.6]} /></mesh>
      <mesh material={M.sofa} position={[0, 2.8, -1.0]} castShadow><boxGeometry args={[7, 2.4, 0.8]} /></mesh>
    </group>
    <mesh position={[6, 6, -8.8]}><planeGeometry args={[3, 4]} /><meshStandardMaterial color="#ffd27a" emissive="#ffb84a" emissiveIntensity={0.5} /></mesh>
  </group>
);
const woodScroll = (t: number) => { woodTex.offset.set((-t * 1.6) / 6, 0); woodTex.repeat.set(10, 7); };

// ================= camera =================
const HOOK = { p: [HEADW[0] + 8.0, 9.6, 25.0] as V3, l: [HEADW[0] - 2.4, 5.9, 0] as V3 };
const offs = (w: V3, d: V3, look: V3 = [0, 0, 0]) => ({ p: [w[0] + d[0], w[1] + d[1], w[2] + d[2]] as V3, l: [w[0] + look[0], w[1] + look[1], w[2] + look[2]] as V3 });
const WANDMID = toWorld([6, 0, 0]);
const CAM: CamKey[] = [
  { t: 0, ...HOOK }, { t: L[1], ...HOOK },
  { t: L[1] + 0.9, ...offs(HEADW, [3.0, 2.2, 6.0], [-0.8, 0.8, 0]) },
  { t: L[2] - 0.2, ...offs(WANDMID, [2.6, 1.8, 6.0]) },
  { t: L[2] + 0.6, ...offs(W.impeller, [2.6, 2.0, 6.0], [-0.3, -0.3, 0]) }, { t: L[3] - 0.2, ...offs(W.impeller, [2.8, 1.9, 6.2], [-0.3, -0.3, 0]) },
  { t: L[3] + 0.6, ...offs(W.cyclones, [3.0, 2.2, 6.0]) }, { t: L[4] - 0.2, ...offs(W.cyclones, [2.8, 2.4, 6.2]) },
  { t: L[4] + 0.6, ...offs(W.filter, [-2.6, 2.2, 6.4], [-0.6, -0.2, 0]) }, { t: L[5] - 0.2, ...offs(W.filter, [-2.9, 2.1, 6.6], [-0.6, -0.2, 0]) },
  { t: L[5] + 0.6, ...offs(W.battery, [2.0, 1.2, 6.2], [-0.2, 0.3, 0]) }, { t: L[6] - 0.2, ...offs(W.battery, [2.2, 1.1, 6.4], [-0.2, 0.3, 0]) },
  { t: L[6] + 1.0, p: [7.0, 7.5, 18.5], l: [-1.0, 4.6, 0] }, { t: L[7] + 0.8, p: [7.3, 7.4, 19.0], l: [-1.0, 4.6, 0] },
  { t: L[8], ...HOOK }, { t: D, ...HOOK },
];
const camFor = (t: number) => camAt(CAM, t) as { p: V3; l: V3 };
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

// ================= HUD + banners + tags =================
const C = { cream: "#fff6e0", ink: "#1b1d35", red: "#e2384d", green: "#5ef08a", navy: "#141a3a" };
const pix: React.CSSProperties = { fontFamily: "Pixelify", fontWeight: 700 };
const fmt = (n: number) => Math.round(n).toString().padStart(6, "0");
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const s = slowAt(t), real = s < 1.05, slowing = t >= L[1] && t < L[2];
  const segs = Math.round(8 * (1 - Math.log(s) / Math.log(1024)));
  return (
    <div style={{ position: "absolute", left: 30, right: 30, top: 54, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "stretch", border: `5px solid ${C.ink}`, boxShadow: "5px 6px 0 rgba(0,0,0,0.45)" }}>
        <div style={{ background: C.red, width: 52, display: "flex", alignItems: "center", justifyContent: "center", ...pix, color: "#fff", fontSize: 34 }}>◉</div>
        <div style={{ background: "#fff", color: real ? C.red : C.ink, ...pix, fontSize: 34, padding: "4px 14px 2px", minWidth: 250 }}>{real ? "REAL SPEED" : slowing ? "SLOWING..." : `${Math.round(s)}x SLOWER`}</div>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 4, height: 34, border: `5px solid ${C.ink}`, background: "#fff", padding: 3, boxShadow: "5px 6px 0 rgba(0,0,0,0.45)" }}>
        {Array.from({ length: 8 }, (_, i) => <div key={i} style={{ flex: 1, background: i < segs ? (i > 5 ? C.red : "#ffb03b") : "#c9cbe0" }} />)}
      </div>
      <div style={{ display: "flex", alignItems: "center", border: `5px solid ${C.ink}`, background: "#fff", boxShadow: "5px 6px 0 rgba(0,0,0,0.45)" }}>
        <div style={{ fontFamily: "SilkB", fontSize: 22, color: C.ink, padding: "0 10px", lineHeight: 1 }}>RPM</div>
        <div style={{ fontFamily: "SilkB", fontSize: 34, color: C.green, background: C.navy, padding: "4px 10px 0" }}>{fmt(EV.rpm / s)}</div>
      </div>
    </div>
  );
};
type Banner = { from: number; to: number; n?: number; title: [string, string?, string?]; sub?: string; hold?: boolean };
const HOOKB: Omit<Banner, "from" | "to"> = { title: ["HOW DOES A ", "CORDLESS VACUUM", " WORK?"], sub: "ITS MOTOR SPINS 125,000× A MINUTE", hold: true };
const BANNERS: Banner[] = [
  { from: 0, to: L[1], ...HOOKB },
  { from: L[2], to: L[3], n: 1, title: ["WHAT ", "SUCKS", " THE AIR?"], sub: "A TINY FAN SPINNING 2,000× A SECOND" },
  { from: L[3], to: L[4], n: 2, title: ["WHERE DOES THE ", "DUST", " GO?"], sub: "14 CYCLONES FLING IT OUT AT UP TO 79,000 G" },
  { from: L[4], to: L[5], n: 3, title: ["WHY ", "NO BAG", "?"], sub: "NOTHING TO CLOG, SO SUCTION STAYS STRONG" },
  { from: L[5], to: L[6], n: 4, title: ["WHAT ", "FEEDS", " IT?"], sub: "LITHIUM CELLS + ONE TRIGGER" },
  { from: L[6], to: L[8], title: ["BACK TO ", "REAL SPEED", ""], sub: "125,000 TURNS EVERY MINUTE" },
  { from: L[8], to: D + 0.01, ...HOOKB },
];
const stripe = `repeating-linear-gradient(45deg, ${C.red} 0 8px, #ffffff 8px 16px)`;
const BannerView: React.FC<{ t: number }> = ({ t }) => {
  const b = BANNERS.find((x) => t >= x.from && t < x.to); if (!b) return null;
  const k = b.hold ? 1 : backOut((t - b.from) / 0.3);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 150, transform: `scale(${k})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "stretch", border: `6px solid ${C.ink}`, background: C.cream, boxShadow: "8px 10px 0 rgba(0,0,0,0.45)" }}>
        <div style={{ width: 20, background: stripe }} />
        <div style={{ padding: "12px 26px 8px", textAlign: "center", ...pix, fontSize: 52, color: C.ink, lineHeight: 1.05 }}>{b.title[0]}<span style={{ color: C.red }}>{b.title[1]}</span>{b.title[2]}</div>
        <div style={{ width: 20, background: stripe }} />
        {b.n && <div style={{ position: "absolute", left: -30, top: -30, width: 64, height: 64, borderRadius: 32, background: C.red, border: `5px solid ${C.ink}`, ...pix, color: "#fff", fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{b.n}</div>}
      </div>
      {b.sub && <div style={{ marginTop: 14, background: C.red, border: `5px solid ${C.ink}`, padding: "6px 18px 4px", ...pix, fontSize: 36, color: "#fff", boxShadow: "6px 7px 0 rgba(0,0,0,0.4)" }}>{b.sub}</div>}
    </div>
  );
};
type Tag = { txt: string; at: V3; from: number; to: number; dx: number; dy: number; col: string };
const TAGS: Tag[] = [
  { txt: "IMPELLER", at: W.impeller, from: L[2] + 0.8, to: L[3], dx: 200, dy: -180, col: "#ffd23f" },
  { txt: "MOTOR", at: W.motor, from: L[2] + 1.4, to: L[3], dx: -180, dy: 220, col: "#ff4f5f" },
  { txt: "CYCLONES", at: toWorld([0.15, 0.7, 0.3]), from: L[3] + 0.8, to: L[4], dx: 190, dy: -200, col: "#2fc4b2" },
  { txt: "DUST BIN", at: toWorld([1.6, -0.8, 0.3]), from: L[3] + 1.6, to: L[4], dx: 160, dy: 220, col: "#bfe6ff" },
  { txt: "FILTER", at: W.filter, from: L[4] + 0.8, to: L[5], dx: -150, dy: -200, col: "#a98bff" },
  { txt: "CLEAN AIR OUT", at: toWorld([-2.9, 0.4, 0]), from: L[4] + 1.4, to: L[5], dx: 120, dy: 240, col: "#bfe6ff" },
  { txt: "BATTERY", at: W.battery, from: L[5] + 0.8, to: L[6], dx: 200, dy: 160, col: "#ffd23f" },
  { txt: "TRIGGER", at: W.trigger, from: L[5] + 1.4, to: L[6], dx: -200, dy: -150, col: "#ff4f5f" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    {TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(g.at, cam, FOV), k = ease((t - g.from) / 0.25); const w = g.txt.length * 26 + 50; const ex = Math.max(w / 2 + 20, Math.min(1060 - w / 2, x + g.dx)), ey = Math.max(520, Math.min(1780, y + g.dy)); return (
      <g key={i} opacity={k}>
        <line x1={x} y1={y} x2={ex} y2={ey} stroke="#ffffff" strokeWidth={3} />
        <rect x={x - 7} y={y - 7} width={14} height={14} fill="#fff" stroke={C.ink} strokeWidth={3} />
        <rect x={ex - w / 2} y={ey - 30} width={w} height={58} fill={C.cream} stroke={C.ink} strokeWidth={5} />
        <rect x={ex - w / 2} y={ey - 30} width={14} height={58} fill={g.col} stroke={C.ink} strokeWidth={5} />
        <text x={ex + 6} y={ey + 12} textAnchor="middle" style={{ fontFamily: "Pixelify", fontWeight: 700, fontSize: 36, fill: C.ink } as React.CSSProperties}>{g.txt}</text>
      </g>); })}
  </svg>
);
const Pops: React.FC<{ t: number }> = ({ t }) => {
  const p = POPS.filter((x, i) => i % 3 === 0 && t >= x && t < x + 0.5).pop(); if (p === undefined) return null;
  const k = (t - p) / 0.5, i = POPS.indexOf(p);
  return <div style={{ position: "absolute", left: 560 + ((i * 53) % 160) - 80, top: 1180 - k * 60, transform: `rotate(-8deg) scale(${backOut(k / 0.3)})`, opacity: 1 - k * k, ...pix, fontSize: 70, color: "#fff", WebkitTextStroke: `4px ${C.ink}`, fontStyle: "italic" }}>SHLURP!</div>;
};
const SpeedUp: React.FC<{ t: number }> = ({ t }) => {
  if (t < L[6] || t >= L[7] + 0.6) return null;
  const st = STEPS.filter(([a]) => a <= t).pop()!; const age = t - st[0];
  const s = slowAt(t), ang = -100 + 200 * (1 - Math.log(s) / Math.log(1024));
  return (
    <>
      <div style={{ position: "absolute", left: 44, top: 470, width: 300, background: "#fff", border: `5px solid ${C.ink}`, boxShadow: "6px 7px 0 rgba(0,0,0,0.45)", padding: 10 }}>
        <svg width={230} height={120} viewBox="0 0 230 120"><path d="M20 110 A95 95 0 0 1 210 110" fill="none" stroke="#c9cbe0" strokeWidth={14} /><path d="M160 30 A95 95 0 0 1 210 110" fill="none" stroke={C.red} strokeWidth={14} />
          <line x1={115} y1={110} x2={115 + 85 * Math.sin((ang * Math.PI) / 180)} y2={110 - 85 * Math.cos((ang * Math.PI) / 180)} stroke={C.ink} strokeWidth={7} /><circle cx={115} cy={110} r={10} fill={C.ink} /></svg>
        <div style={{ ...pix, fontSize: 34, color: C.ink, textAlign: "center" }}>{Math.round(EV.rpm / s / 60).toLocaleString("en-US")} TURNS/S</div>
      </div>
      {st[1] < 1024 && age < 0.45 && <div style={{ position: "absolute", left: 120, top: 760, transform: `scale(${backOut(age / 0.2)}) rotate(-6deg)`, ...pix, fontSize: 90, color: "#fff", WebkitTextStroke: `5px ${C.ink}`, fontStyle: "italic" }}>×4</div>}
    </>
  );
};

export const VacuumVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camFor(t);
  const xray = t >= L[1] + 0.5 && t < L[8] ? clamp01(Math.min((t - L[1] - 0.5) / 0.6, (L[8] - t) / 0.6)) : 0;
  woodScroll(t);
  const inHook = t < L[1] + 0.6 || t >= L[8] - 0.4;
  return (
    <AbsoluteFill style={{ background: "#141a3a" }}>
      <Audio src={staticFile("videos/39-vacuum/music.wav")} />
      <SoftPixelCanvas px={3} fov={FOV} bg="#141a3a" focus={Math.hypot(cam.p[0] - cam.l[0], cam.p[1] - cam.l[1], cam.p[2] - cam.l[2])} aperture={0.0016} bloom={0.28} exposure={0.85} env={0.35}>
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={0.18} color="#9fb3ff" />
        <directionalLight position={[8, 14, 8]} intensity={2.3} color="#fff1d6" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={16} shadow-camera-bottom={-4} shadow-bias={-0.0005} />
        <pointLight position={[-6, 8, 6]} intensity={30} distance={30} color="#7b5cff" />
        <pointLight position={[6, 3, 5]} intensity={18} distance={20} color="#ff9a5c" />
        <Room />
        <Vacuum t={t} xray={xray} />
        {inHook && <Cereal t={t} />}
        {t >= L[1] && t < L[5] && <Dust t={t} />}
        {t >= L[2] && t < L[3] && <Air t={t} mode="motor" />}
        {t >= L[3] && t < L[4] && <Air t={t} mode="cyclone" />}
        {t >= L[4] && t < L[5] && <Air t={t} mode="exhaust" />}
      </SoftPixelCanvas>
      <Hud t={t} />
      <BannerView t={t} />
      <TagsView t={t} cam={cam} />
      {inHook && <Pops t={t} />}
      <SpeedUp t={t} />
      <div style={{ position: "absolute", left: 30, bottom: 44, fontFamily: "SilkB", fontSize: 24, color: "rgba(255,255,255,0.8)", textShadow: "3px 3px 0 #000" }}>@HOWTOWITHZAY</div>
    </AbsoluteFill>
  );
};
