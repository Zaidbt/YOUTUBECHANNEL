/**
 * Video 010 · How does a baby form? — true pixel-art 3D, 48 s seamless loop @ 60 fps, 140 BPM jersey club / trap.
 * Egg in the tube → sperm race → fertilisation → 1→2→4→8→16→32 cells → blastocyst → implantation → heartbeat
 * (on the beat: 140 bpm) → growth with size comparisons (raspberry, lime, banana, watermelon) → head down → born
 * → "it all started as one cell" → back to the egg. Timing from baby.json (videos/10-baby/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./baby.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { rnd } from "../../brand/pixels";
import { Labels, LabelDef } from "../../brand/Labels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const LW = (2 * Math.PI) / EV.duration;
const BAR = EV.bar;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export const WOMB_PALETTE = [
  "#12060c", "#24091a", "#3d0f2a", "#5a1a3a", "#8a2a4a", "#b8456a", "#e0708f", "#ff9ab0", "#ffd0dc", "#fff2d6",
  "#ffd98a", "#e8b860", "#c08ae0", "#8a5ab8", "#e8f0ff", "#a9c8ff", "#ff3b4a", "#a81830", "#ffb8a0", "#e0907a",
  "#b86a5a", "#e0306a", "#7ad04a", "#3a8a2a", "#ffe04a", "#c8a020", "#2aa84a", "#ff4a5a", "#ffffff", "#05020a",
];
const BG = "#12060c";
const lastKickAge = (t: number) => { let a = 9; for (const k of EV.kicks) if (k <= t + 1e-6) a = t - k; return a; };
const heartPulse = (t: number) => Math.exp(-lastKickAge(t) / 0.12);

function useToon() {
  return useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([80, 80, 80, 255, 160, 160, 160, 255, 225, 225, 225, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
  }, []);
}
const Toon: React.FC<{ c: string; e?: number; o?: number; side?: THREE.Side }> = ({ c, e = 0, o, side }) => {
  const g = useToon();
  return <meshToonMaterial color={c} gradientMap={g} emissive={c} emissiveIntensity={e} transparent={o !== undefined} opacity={o ?? 1} depthWrite={o === undefined || o > 0.95} side={side} />;
};
const Cam: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const fib = (n: number, r: number, seed = 0): V3[] => Array.from({ length: n }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996 + seed;
  return [Math.cos(a) * rr * r, y * r, Math.sin(a) * rr * r];
});

// ===================== the egg, the race, the first divisions =====================
const sceneAt = (t: number) => (t < EV.toWomb || t >= EV.backToEgg ? "egg" : t < EV.birth ? "womb" : "born");
const flashAt = (t: number) => Math.max(...[EV.toWomb, EV.heart, EV.birth, EV.backToEgg].map((s) => Math.exp(-(((t - s) / 0.14) ** 2))));
const EGG_R = 3;
const cellCount = (t: number) => (t < EV.fertilise || t >= EV.backToEgg ? 1 : 2 ** EV.divisions.filter((d) => d <= t).length);
const layout = (n: number): V3[] => {
  if (n === 1) return [[0, 0, 0]];
  const r = EGG_R * 0.9 / Math.cbrt(n);
  if (n === 2) return [[-r, 0, 0], [r, 0, 0]];
  return fib(n, EGG_R * 0.92 - r, n);
};
const Cells: React.FC<{ t: number }> = ({ t }) => {
  const n = cellCount(t);
  if (t >= EV.blastocyst && t < EV.backToEgg) {
    // hollow ball of cells + the inner cell mass that becomes the baby
    const k = ease((t - EV.blastocyst) / 0.4);
    return (
      <group scale={0.9 + 0.1 * k}>
        {fib(60, EGG_R * 0.9, 1).map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.55, 10, 8]} /><Toon c="#e0708f" /></mesh>)}
        {fib(10, 0.9, 2).map((p, i) => <mesh key={`m${i}`} position={[p[0] - 1.4, p[1] + 0.6, p[2]]}><sphereGeometry args={[0.6, 10, 8]} /><Toon c="#c08ae0" /></mesh>)}
      </group>
    );
  }
  const cur = layout(n), prev = layout(Math.max(1, n / 2));
  const dLast = EV.divisions.filter((d) => d <= t).pop();
  const k = n === 1 || dLast === undefined ? 1 : ease((t - dLast) / 0.25);
  const r = n === 1 ? EGG_R : EGG_R * 0.9 / Math.cbrt(n);
  return (
    <group>
      {cur.map((p, i) => {
        const from = prev[Math.min(prev.length - 1, i >> 1)];
        return <mesh key={i} position={lerp3(from, p, k)}><sphereGeometry args={[r * (n === 1 ? 1 : 0.98), 18, 14]} /><Toon c={n === 1 ? "#fff2d6" : "#ffd0dc"} e={0.1} /></mesh>;
      })}
      {n === 1 && <mesh><sphereGeometry args={[0.9, 12, 10]} /><Toon c="#8a5ab8" /></mesh>}
    </group>
  );
};
const CORONA = fib(46, EGG_R * 1.32, 3);
const Egg: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const fert = t >= EV.fertilise && t < EV.backToEgg;
  const disperse = fert ? ease((t - EV.fertilise) / 1.2) : 0;
  return (
    <group rotation={[0, 2 * LW * t, 0.15]}>
      <Cells t={t} />
      <mesh><sphereGeometry args={[EGG_R * 1.1, 32, 24]} /><Toon c="#ff9ab0" o={0.28} /></mesh>
      {disperse < 1 && CORONA.map((p, i) => (
        <mesh key={i} position={[p[0] * (1 + disperse * 1.6), p[1] * (1 + disperse * 1.6), p[2] * (1 + disperse * 1.6)]} scale={1 - disperse}>
          <sphereGeometry args={[0.42, 8, 6]} /><Toon c="#ffd98a" />
        </mesh>
      ))}
      {fert && t - EV.fertilise < 0.7 && <Glow map={map} at={[0, 0, 0]} size={12 * (1 - (t - EV.fertilise) / 0.7)} color="#fff2d6" opacity={1 - (t - EV.fertilise) / 0.7} />}
    </group>
  );
};
const SPERM = Array.from({ length: 70 }, (_, i) => {
  const a = rnd(i + 11) * Math.PI * 2, rr = 2 + rnd(i + 12) * 8;
  const reach = i < 24; // a few hundred reach the egg (24 shown); one gets in
  const target: V3 = reach ? fib(24, EGG_R * 1.12, 5)[i] : [Math.cos(a) * rr * 1.4, -6 - rnd(i + 14) * 10, Math.sin(a) * rr];
  return { start: [Math.cos(a) * rr, -38 - rnd(i + 13) * 14, Math.sin(a) * rr] as V3, target, reach, delay: rnd(i + 15) * 1.2, dur: 4.4 + rnd(i + 16) * 1.6 };
});
const Sperm: React.FC<{ t: number }> = ({ t }) => {
  if (t < EV.race[0] || t > EV.fertilise + 0.9) return null;
  const fade = t > EV.fertilise ? 1 - (t - EV.fertilise) / 0.9 : 1;
  return (
    <group>
      {SPERM.map((s, i) => {
        const p = Math.min(1, Math.max(0, (t - EV.race[0] - s.delay) / s.dur));
        const k = 1 - (1 - p) * (1 - p);
        const head = lerp3(s.start, s.target, k);
        const dir = new THREE.Vector3(s.target[0] - s.start[0], s.target[1] - s.start[1], s.target[2] - s.start[2]).normalize();
        const side = new THREE.Vector3(1, 0, 0).cross(dir).normalize();
        if (i === 0 && t >= EV.fertilise) return null; // the one that got in
        const wig = p < 1 ? 1 : 0.4;
        return (
          <group key={i} scale={fade}>
            <mesh position={head} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)} scale={[0.34, 0.58, 0.34]}><sphereGeometry args={[1, 8, 6]} /><Toon c="#e8f0ff" e={0.2} /></mesh>
            {Array.from({ length: 7 }, (_, j) => {
              const back = (j + 1) * 0.32, w = Math.sin(t * 38 - j * 0.9 + i) * 0.12 * (j / 7) * wig;
              return <mesh key={j} position={[head[0] - dir.x * back + side.x * w, head[1] - dir.y * back + side.y * w, head[2] - dir.z * back + side.z * w]}><sphereGeometry args={[0.15 - j * 0.015, 6, 4]} /><Toon c="#a9c8ff" /></mesh>;
            })}
          </group>
        );
      })}
    </group>
  );
};
const Tube: React.FC = () => (
  <group>
    <mesh><cylinderGeometry args={[16, 16, 120, 40, 1, true]} /><Toon c="#8a2a4a" side={THREE.BackSide} /></mesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[0, -60 + i * 10, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[15.6, 0.8, 6, 40]} /><Toon c="#b8456a" /></mesh>)}
  </group>
);
const EGG_HOME = { p: [0, -2.5, 22] as V3, l: [0, -0.6, 0] as V3 };
const EGG_CAM: CamKey[] = [
  { t: 0, ...EGG_HOME }, { t: 1.4, ...EGG_HOME },
  { t: EV.race[0], p: [3, -6, 23], l: [0, -4, 0] },
  { t: 8.6, p: [5, -14, 28], l: [0, -9, 0] },
  { t: 10.6, p: [1.5, -4, 15], l: [0, -1, 0] },
  { t: EV.fertilise, p: [0, -2, 18], l: [0, -0.4, 0] },
  { t: EV.blastocyst, p: [0.5, -2, 17], l: [0, -0.4, 0] },
  { t: EV.toWomb, p: [0, 0, 8], l: [0, 0, 0] },
  { t: EV.backToEgg, p: [0, -2, 15], l: [0, -0.4, 0] },
  { t: 46.7, ...EGG_HOME }, { t: 48, ...EGG_HOME },
];

// ===================== the womb: implantation, heartbeat, growth =====================
const STAGE_CM = [1.6, 5.4, 25, 50]; // week 8, 12, 20, 40
const sizeCm = (t: number) => {
  if (t < EV.heart) return 0.4;
  const pts: [number, number][] = [[EV.heart, 0.5], ...EV.stages.map((s, i) => [s, STAGE_CM[i]] as [number, number])];
  let i = 0; while (i < pts.length - 1 && pts[i + 1][0] <= t) i++;
  if (i === pts.length - 1) return pts[i][1];
  const [t0, s0] = pts[i], [t1, s1] = pts[i + 1];
  const k = ease(Math.min(1, (t - t1 + BAR) / BAR)); // grow during the bar before each stage hit
  return Math.exp(lerp(Math.log(s0), Math.log(s1), t < t1 - BAR ? 0 : k)) * (t >= t0 ? 1 : 1);
};
const maturity = (S: number) => Math.max(0, Math.min(1, Math.log(S / 0.5) / Math.log(100)));
/** A curled baby, normalised to length 1. m: 0 = embryo, 1 = newborn. */
const Baby: React.FC<{ m: number; heart: number; map: THREE.Texture; eyesOpen?: boolean }> = ({ m, heart, map }) => {
  const headR = 0.3 - 0.11 * m;
  const skin = m < 0.25 ? "#ffb8a0" : "#ffb8a0";
  const limb = (a: V3, b: V3, r: number) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), mid = va.clone().add(vb).multiplyScalar(0.5), len = va.distanceTo(vb);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return <mesh position={mid.toArray()} quaternion={q}><cylinderGeometry args={[r, r * 0.85, len, 8]} /><Toon c={skin} /></mesh>;
  };
  return (
    <group>
      <mesh position={[0.02, 0.5 - headR, 0]}><sphereGeometry args={[headR, 18, 14]} /><Toon c={skin} /></mesh>
      <mesh position={[0.05, 0.05, 0]} rotation={[0, 0, -0.35]} scale={[0.2 + 0.05 * m, 0.3, 0.17 + 0.04 * m]}><sphereGeometry args={[1, 16, 12]} /><Toon c={skin} /></mesh>
      <mesh position={[0.0, -0.25, 0]}><sphereGeometry args={[0.15 + 0.05 * m, 12, 10]} /><Toon c={skin} /></mesh>
      {m < 0.15 && <mesh position={[-0.12, -0.42, 0]} rotation={[0, 0, 0.8]}><coneGeometry args={[0.07, 0.25, 8]} /><Toon c={skin} /></mesh>}
      {m > 0.12 && <>{limb([0.15, 0.12, 0.13], [0.22, 0.27, 0.14], 0.05 + 0.02 * m)}{limb([0.15, 0.12, -0.13], [0.22, 0.27, -0.14], 0.05 + 0.02 * m)}</>}
      {m > 0.16 && <>{limb([0.08, -0.25, 0.14], [0.3, -0.12, 0.16], 0.06 + 0.03 * m)}{limb([0.3, -0.12, 0.16], [0.2, -0.36, 0.18], 0.05 + 0.03 * m)}
        {limb([0.08, -0.25, -0.14], [0.3, -0.12, -0.16], 0.06 + 0.03 * m)}{limb([0.3, -0.12, -0.16], [0.2, -0.36, -0.18], 0.05 + 0.03 * m)}</>}
      <mesh position={[0.02 + headR * 0.75, 0.5 - headR * 0.95, headR * 0.55]}><sphereGeometry args={[headR * 0.12, 8, 6]} /><Toon c="#3d0f2a" /></mesh>
      <mesh position={[0.08, 0.05, 0.12]}><sphereGeometry args={[0.04, 8, 6]} /><Toon c="#ff3b4a" e={0.6} /></mesh>
      <Glow map={map} at={[0.09, 0.05, 0.2]} size={0.14 + 0.3 * heart} color="#ff3b4a" opacity={0.4 + 0.6 * heart} />
    </group>
  );
};
const FRUITS = [
  { name: "raspberry", cm: 1.8, node: () => <group>{fib(18, 0.38, 1).map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.16, 8, 6]} /><Toon c="#e0306a" /></mesh>)}</group> },
  { name: "lime", cm: 5.5, node: () => <mesh scale={[0.5, 0.42, 0.42]}><sphereGeometry args={[1, 16, 12]} /><Toon c="#7ad04a" /></mesh> },
  { name: "banana", cm: 20, node: () => <mesh rotation={[0, 0, 0.3]}><torusGeometry args={[0.6, 0.1, 8, 20, 1.6]} /><Toon c="#ffe04a" /></mesh> },
  { name: "watermelon", cm: 35, node: () => <mesh scale={[0.55, 0.42, 0.42]}><sphereGeometry args={[1, 18, 14]} /><Toon c="#2aa84a" /></mesh> },
];
const Womb: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const S = sizeCm(t), m = maturity(S), heart = t >= EV.heart ? heartPulse(t) : 0;
  const implanting = t < EV.heart;
  const headDown = ease((t - EV.headDown) / BAR) * Math.PI;
  const stage = EV.stages.filter((s) => s <= t).length - 1;
  const F = stage >= 0 ? FRUITS[stage] : null;
  if (implanting) {
    const k = ease((t - EV.toWomb) / (EV.implant - EV.toWomb));
    const sink = ease((t - EV.implant) / 1.2);
    return (
      <group>
        <mesh position={[0, 0, -1.2]} rotation={[0, 0, 0]}><boxGeometry args={[40, 40, 1.4]} /><Toon c="#b8456a" /></mesh>
        {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[(rnd(i) - 0.5) * 8, (rnd(i + 1) - 0.5) * 12, -0.5]}><sphereGeometry args={[0.5 + rnd(i + 2) * 0.6, 8, 6]} /><Toon c="#e0708f" /></mesh>)}
        <group position={[0, lerp(2.5, 0, k), lerp(2.2, -0.2, k) - sink * 0.9]} scale={0.32}>
          {fib(40, 2.6, 1).map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.55, 8, 6]} /><Toon c="#e0708f" /></mesh>)}
          {fib(8, 0.8, 2).map((p, i) => <mesh key={`m${i}`} position={[p[0] - 1.2, p[1] + 0.5, p[2]]}><sphereGeometry args={[0.55, 8, 6]} /><Toon c="#c08ae0" /></mesh>)}
        </group>
        {t >= EV.implant && t - EV.implant < 0.6 && <Glow map={map} at={[0, 0, 0.3]} size={5 * (1 - (t - EV.implant) / 0.6)} color="#ff9ab0" opacity={1 - (t - EV.implant) / 0.6} />}
      </group>
    );
  }
  return (
    <group>
      {/* the womb (cut away), placenta and cord */}
      <mesh><sphereGeometry args={[S * 1.05, 36, 24, Math.PI * 0.95, Math.PI * 1.1]} /><Toon c="#b8456a" side={THREE.DoubleSide} /></mesh>
      <mesh><sphereGeometry args={[S * 0.82, 28, 20]} /><Toon c="#ffd0dc" o={0.22} /></mesh>
      <mesh position={[-S * 0.78, S * 0.28, -S * 0.3]} scale={[0.25, 1, 1]}><sphereGeometry args={[S * 0.34, 16, 12]} /><Toon c="#a81830" /></mesh>
      <mesh><tubeGeometry args={[new THREE.CatmullRomCurve3([new THREE.Vector3(S * 0.08, -S * 0.1, S * 0.12), new THREE.Vector3(-S * 0.25, -S * 0.3, S * 0.25), new THREE.Vector3(-S * 0.5, S * 0.05, 0), new THREE.Vector3(-S * 0.7, S * 0.26, -S * 0.25)]), 24, S * 0.025, 6, false]} /><Toon c="#e0907a" /></mesh>
      <group scale={S} rotation={[0, -0.3, headDown]}><Baby m={m} heart={heart} map={map} /></group>
      {F && <group position={[S * 0.25, -S * 0.62 - F.cm * 0.32, S * 0.05]} scale={F.cm}>{F.node()}</group>}
    </group>
  );
};
const wombCam = (t: number): { p: V3; l: V3 } => {
  if (t < EV.heart) return { p: [0.4, 0.4, lerp(3.6, 2.2, ease((t - EV.toWomb) / 2))], l: [0, 0.2, -0.4] };
  const S = sizeCm(t), d = 2.7 * Math.pow(S, 0.96) + 2.6;
  return { p: [S * 0.1 + d * 0.1, d * 0.06 - S * 0.3, d], l: [S * 0.1, -S * 0.3, 0] };
};

// ===================== born =====================
const Born: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => (
  <group>
    <mesh position={[0, -0.5, -0.2]}><boxGeometry args={[3.4, 0.25, 2.4]} /><Toon c="#ff9ab0" /></mesh>
    <mesh position={[0, -0.32, -0.2]}><boxGeometry args={[3.0, 0.12, 2.0]} /><Toon c="#ffd0dc" /></mesh>
    <group rotation={[0, 0, Math.PI / 2 - 0.2]} position={[0.1, 0.05, 0]}><Baby m={1} heart={heartPulse(t)} map={map} /></group>
    {Array.from({ length: 10 }, (_, i) => <Glow key={i} map={map} at={[(rnd(i) - 0.5) * 4, 0.6 + rnd(i + 1) * 1.6 + 0.2 * Math.sin(4 * LW * t + i), 0.4]} size={0.25} color="#fff2d6" opacity={0.9} />)}
    <Glow map={map} at={[0, 0.2, -1]} size={6} color="#ffd98a" opacity={0.45} />
  </group>
);
const bornCam = (t: number): { p: V3; l: V3 } => {
  const k = ease((t - EV.oneCell) / (EV.backToEgg - EV.oneCell));
  return { p: [lerp(0.4, 0.15, k), lerp(0.5, 0.15, k), lerp(2.6, 0.5, k)], l: [0.1, 0.05, 0] };
};

// ===================== labels =====================
const HOOK = [[{ t: "HOW DOES A" }], [{ t: "BABY", c: "#ff9ab0" }], [{ t: "FORM? 🎧" }]];
const wombAnchor = (t: number): V3 => { const S = sizeCm(t); return [S * 0.1, S * 0.62, 0]; };
const LABELS: LabelDef[] = [
  { from: 0, to: EV.race[0], anchor: [0, 5, 0], border: "#ff9ab0", lines: HOOK, hold: true },
  { from: EV.race[0], to: 8.57, anchor: [0, -6, 0], border: "#a9c8ff", lines: [[{ t: "~250 MILLION" }], [{ t: "SPERM SET OFF", c: "#a9c8ff" }]] },
  { from: 8.57, to: EV.fertilise, anchor: [0, 4.4, 0], border: "#ffd98a", lines: [[{ t: "A FEW HUNDRED" }], [{ t: "REACH THE EGG", c: "#ffd98a" }]] },
  { from: EV.fertilise, to: EV.divisions[1], anchor: [0, 4.4, 0], border: "#fff2d6", lines: [[{ t: "ONLY" }], [{ t: "ONE GETS IN", c: "#fff2d6" }]] },
  { from: EV.divisions[1], to: EV.blastocyst, anchor: [0, 4.4, 0], border: "#ffd0dc", lines: [[{ t: "IT DIVIDES" }], [{ t: "1→2→4→8...", c: "#ff9ab0" }]] },
  { from: EV.blastocyst, to: EV.toWomb, anchor: [0, 4.4, 0], border: "#c08ae0", lines: [[{ t: "DAY 5" }], [{ t: "A HOLLOW BALL", c: "#c08ae0" }], [{ t: "OF ~100 CELLS" }]] },
  { from: EV.toWomb, to: EV.heart, anchor: [0, 1.2, 0], border: "#e0708f", lines: [[{ t: "IT SETTLES INTO" }], [{ t: "THE WOMB WALL", c: "#ff9ab0" }]] },
  { from: EV.heart, to: EV.heart + 1.5 * BAR, anchor: wombAnchor, border: "#ff3b4a", lines: [[{ t: "WEEK 6" }], [{ t: "A HEARTBEAT", c: "#ff3b4a" }]] },
  { from: EV.heart + 1.5 * BAR, to: EV.stages[0], anchor: wombAnchor, border: "#ff3b4a", lines: [[{ t: "~140 BEATS/MIN" }], [{ t: "THIS SONG'S TEMPO", c: "#ff3b4a" }]] },
  { from: EV.stages[0], to: EV.stages[1], anchor: wombAnchor, border: "#e0306a", lines: [[{ t: "WEEK 8 · ~1.6 CM" }], [{ t: "A RASPBERRY", c: "#e0306a" }]] },
  { from: EV.stages[1], to: EV.stages[2], anchor: wombAnchor, border: "#7ad04a", lines: [[{ t: "WEEK 12 · ~5 CM" }], [{ t: "A LIME", c: "#7ad04a" }]] },
  { from: EV.stages[2], to: EV.stages[3], anchor: wombAnchor, border: "#ffe04a", lines: [[{ t: "WEEK 20 · ~25 CM" }], [{ t: "A BANANA", c: "#ffe04a" }]] },
  { from: EV.stages[3], to: EV.birth, anchor: wombAnchor, border: "#2aa84a", lines: [[{ t: "WEEK 40 · 50 CM" }], [{ t: "~3.4 KG", c: "#2aa84a" }], [{ t: "HEAD DOWN, READY" }]] },
  { from: EV.birth, to: EV.oneCell, anchor: [0.1, 0.9, 0], border: "#ffd98a", lines: [[{ t: "HELLO," }], [{ t: "WORLD!", c: "#ffd98a" }]] },
  { from: EV.oneCell, to: 46.3, anchor: [0.1, 0.55, 0], border: "#ff9ab0", lines: [[{ t: "IT ALL STARTED" }], [{ t: "AS ONE CELL", c: "#ff9ab0" }], [{ t: "@HOWTOWITHZAY", c: "#ffd98a" }]] },
  { from: 46.3, to: 48.01, anchor: [0, 5, 0], border: "#ff9ab0", lines: HOOK, hold: true },
];

// ===================== composition =====================
export const BabyVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const map = useMemo(glowTexture, []);
  const sc = sceneAt(t);
  const cam = sc === "egg" ? camAt(EGG_CAM, t) : sc === "womb" ? wombCam(t) : bornCam(t);
  const tag = sc === "egg" ? (t < EV.fertilise || t >= EV.backToEgg ? "⌕ THE EGG · 0.1 MM" : "⌕ DAY 1-5") : sc === "womb" ? (t < EV.heart ? "⌕ DAY ~7" : "▶ WEEKS 6-40") : "♥ BIRTH";
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/10-baby/music.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={WOMB_PALETTE} outlineColor="#12060c">
        <Cam p={cam.p} l={cam.l} />
        <ambientLight intensity={0.55} color="#ffd0dc" />
        <directionalLight position={[-6, 10, 12]} intensity={1.7} color="#fff2d6" />
        <directionalLight position={[8, -4, -6]} intensity={0.7} color="#c08ae0" />
        {sc === "egg" && (
          <>
            <Tube />
            <Egg t={t} map={map} />
            <Sperm t={t} />
            {Array.from({ length: 30 }, (_, i) => <Glow key={i} map={map} at={[(rnd(i) - 0.5) * 24, (rnd(i + 1) - 0.5) * 40 + 1.5 * Math.sin(2 * LW * t + i), (rnd(i + 2) - 0.5) * 18]} size={0.4} color="#ff9ab0" opacity={0.6} />)}
          </>
        )}
        {sc === "womb" && <Womb t={t} map={map} />}
        {sc === "born" && <Born t={t} map={map} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#fff2d6", opacity: Math.round(flashAt(t) * 3) / 3 }} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: "#ffd0dc", textShadow: "4px 4px 0 #12060c, -4px 0 0 #12060c, 0 -4px 0 #12060c" }}>{tag}</div>
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};
