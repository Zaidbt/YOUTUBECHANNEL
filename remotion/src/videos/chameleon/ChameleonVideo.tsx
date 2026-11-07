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
    const W = 32, H = 16, d = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const band = y % 8 < 2 ? 255 : 228, dot = (x * 7 + y * 13) % 11 === 0 ? 165 : 0;
      const v = dot || band; d.set([v, v, v, 255], (y * W + x) * 4);
    }
    const skin = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); skin.magFilter = skin.minFilter = THREE.NearestFilter; skin.wrapS = skin.wrapT = THREE.RepeatWrapping; skin.repeat.set(3, 2); skin.needsUpdate = true;
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
const MOUTH: V3 = [3.35, 1.55, 0];
const flyPos = (t: number): V3 => [7.4 + 0.6 * Math.sin(6 * TL.lw * t), 3.2 + 0.5 * Math.sin(9 * TL.lw * t + 1), 0.3 * Math.cos(5 * TL.lw * t)];
const tongueLen = (t: number) => { const d = t - (TL.tongue - 0.12); if (d < 0 || d > 0.7) return 0; return d < 0.12 ? d / 0.12 : Math.max(0, 1 - (d - 0.12) / 0.5); };
const flyAlive = (t: number) => t < TL.tongue || t > TL.flyBack;
export const Chameleon: React.FC<{ t: number; map: THREE.Texture; state?: number; noFly?: boolean; gearEye?: boolean }> = ({ t, map, state, noFly, gearEye }) => {
  const a = useAssets();
  const st = STATE[state ?? stateAt(t).s];
  const fl = changeFlash(t);
  const breathe = 1 + 0.03 * Math.sin(8 * TL.lw * t);
  const tail = useMemo(() => {
    const pts: THREE.Vector3[] = [new THREE.Vector3(-1.9, 1.3, 0), new THREE.Vector3(-3.3, 0.9, 0)];
    for (let i = 0; i <= 26; i++) { const th = (i / 26) * Math.PI * 2.6, r = 1.25 * (1 - i / 32); pts.push(new THREE.Vector3(-4.3 + Math.cos(th + 1.2) * r, -0.3 + Math.sin(th + 1.2) * r, 0)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.26, 8, false);
  }, []);
  const eye = (side: number, k: number) => {
    const c: V3 = [2.8, 2.2, side * 0.55];
    const yaw = 0.8 * Math.sin((7 + k * 3) * TL.lw * t + k), pitch = 0.4 * Math.sin((5 + k * 4) * TL.lw * t + 2 * k);
    const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), side * Math.abs(Math.cos(pitch) * Math.sin(yaw)) + side * 0.4).normalize();
    return (
      <group key={side}>
        <mesh position={c}><sphereGeometry args={[0.4, 14, 10]} /><Toon c={st.mid} map={a.skin} /></mesh>
        <mesh position={[c[0] + dir.x * 0.36, c[1] + dir.y * 0.36, c[2] + dir.z * 0.36]}><sphereGeometry args={[gearEye ? 0.16 : 0.11, 8, 6]} /><Toon c={gearEye ? "#ffd23f" : "#05080a"} e={gearEye ? 0.4 : 0} /></mesh>
        {gearEye && <mesh position={[c[0] + dir.x * 0.47, c[1] + dir.y * 0.47, c[2] + dir.z * 0.47]}><sphereGeometry args={[0.07, 6, 4]} /><Toon c="#05080a" /></mesh>}
      </group>
    );
  };
  const L = tongueLen(t);
  const fly = flyPos(t);
  const tip: V3 = [MOUTH[0] + (fly[0] - MOUTH[0]) * L, MOUTH[1] + (fly[1] - MOUTH[1]) * L, MOUTH[2] + (fly[2] - MOUTH[2]) * L];
  return (
    <group>
      <group scale={[breathe, breathe, 1]}>
        <mesh position={[0, 1.5, 0]} scale={[2.2, 1.25, 0.95]}><sphereGeometry args={[1, 24, 16]} /><Toon c={st.mid} map={a.skin} e={0.15 * fl} /></mesh>
        {Array.from({ length: 11 }, (_, i) => <mesh key={i} position={[-1.8 + i * 0.36, 2.72 - 0.02 * (i - 5) ** 2 * 0.6, 0]}><coneGeometry args={[0.14, 0.34, 4]} /><Toon c={st.dark} /></mesh>)}
      </group>
      <mesh position={[2.45, 1.9, 0]} scale={[1.05, 0.9, 0.75]}><sphereGeometry args={[1, 18, 14]} /><Toon c={st.mid} map={a.skin} e={0.15 * fl} /></mesh>
      <mesh position={[1.95, 2.75, 0]} rotation={[0, 0, 0.6]}><coneGeometry args={[0.55, 1.3, 6]} /><Toon c={st.dark} /></mesh>
      <mesh position={[3.0, 1.45, 0]} scale={[0.5, 0.18, 0.6]}><sphereGeometry args={[1, 12, 8]} /><Toon c={st.light} /></mesh>
      <mesh position={[2.95, 1.62, 0]}><boxGeometry args={[0.9, 0.05, 1.0]} /><Toon c="#05080a" /></mesh>
      {eye(1, 0)}{eye(-1, 1)}
      <mesh geometry={tail}><Toon c={st.mid} map={a.skin} /></mesh>
      {/* legs gripping the branch */}
      {[[1.3, 1], [1.3, -1], [-1.2, 1], [-1.2, -1]].map(([x, s], i) => (
        <group key={i}>
          {cyl([x, 1.1, s * 0.55], [x + 0.35, 0.45, s * 0.75], 0.2, st.mid, a.skin)}
          {cyl([x + 0.35, 0.45, s * 0.75], [x + 0.1, 0.05, s * 0.35], 0.17, st.mid, a.skin)}
          <mesh position={[x + 0.1, 0.02, s * 0.32]}><sphereGeometry args={[0.2, 8, 6]} /><Toon c={st.dark} /></mesh>
        </group>
      ))}
      {L > 0 && <>{cyl(MOUTH, tip, 0.13, "#ff8a7a")}<mesh position={tip}><sphereGeometry args={[0.28, 10, 8]} /><Toon c="#ff3a2a" /></mesh></>}
      {!noFly && flyAlive(t) && (
        <group position={fly}>
          <mesh><sphereGeometry args={[0.2, 8, 6]} /><Toon c="#05080a" /></mesh>
          {[1, -1].map((s) => <mesh key={s} position={[0, 0.18, s * 0.18]} rotation={[s * (0.6 + 0.5 * Math.sin(t * 90)), 0, 0]}><planeGeometry args={[0.35, 0.18]} /><meshBasicMaterial color="#bfe6ff" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
        </group>
      )}
      <Glow map={map} at={[0.5, 1.8, -0.5]} size={9 + 3 * fl} color={st.mid} opacity={0.18 + 0.2 * fl} />
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
