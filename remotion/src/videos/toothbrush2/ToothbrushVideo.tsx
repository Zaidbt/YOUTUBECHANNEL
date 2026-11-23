/**
 * Video 041 · How does an electric toothbrush work? — capability test in the engineeredwithin1 FORMAT (own models,
 * own wording, own numbers), CelPixel look: cel-shaded 3D at 360x640 with navy outlines + pixel-drawn HUD.
 * Hook in a mouth with chocolate on the teeth → slow ×64 (LEFT! RIGHT!, it doesn't spin) → ① gear + crank turn
 * spinning into swinging → ② inside the motor (magnets + copper coils) → ③ switch + rechargeable cell →
 * ④ charging with no contacts (induction) → speed-up ×2 steps with a gauge → hook.
 * 32.7 s loop, 110 BPM boogie funk (toothbrush.json + music.wav from videos/41-toothbrush/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import EV from "./toothbrush.json";
import { CelPixelCanvas, PixelUI, Ctx, ptext, prect, pline, toon, CW } from "../../brand/CelPixel";
import { camAt, CamKey } from "../teasers/Majestic";
import { project } from "../../brand/Labels";

loadFont({ family: "AlfaSlab", url: staticFile("fonts/AlfaSlabOne-Regular.ttf") });
loadFont({ family: "Silk", url: staticFile("fonts/Silkscreen-Regular.ttf") });
export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type Seg = [number, number, number, number];
const D = EV.duration, BEAT = EV.beat;
const FOV = 30;
const L = EV.l as number[], SPEED = EV.speed as Seg[], STEPS = EV.steps as number[][];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const backOut = (x: number) => { const k = clamp01(x), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const slowAt = (t: number) => { const s = SPEED.find(([a, c]) => t >= a && t < c) ?? SPEED[SPEED.length - 1]; const u = clamp01((t - s[0]) / (s[1] - s[0])); return s[2] * Math.pow(s[3] / s[2], u); };
// swing phase: at ×64 one full LEFT-RIGHT cycle per beat (on the music), doubling with each ×2 step
const PH = (() => { const N = 8000, dt = D / N; let a = 0; const arr = [0]; for (let i = 0; i < N; i++) { a += (64 / slowAt(i * dt)) / BEAT * dt; arr.push(a); } return { arr, dt }; })();
const phase = (t: number) => PH.arr[Math.min(PH.arr.length - 1, Math.round(t / PH.dt))];
const freq = (t: number) => 64 / slowAt(t) / BEAT;
const SWING = 0.42;
const swingA = (t: number) => (freq(t) > 9 ? SWING * 0.8 * Math.sin(t * 2 * Math.PI * 23.3 + Math.sin(t * 91) * 2) : SWING * Math.sin(2 * Math.PI * phase(t)));
const motorA = (t: number) => 2 * Math.PI * phase(t) * 3;

// ================= materials =================
const M = {
  white: toon("#f7f8fc"), whiteT: toon("#f7f8fc", { transparent: true, opacity: 0.12 }), blue: toon("#2f6fe0"), blueT: toon("#2f6fe0", { transparent: true, opacity: 0.3 }), navy: toon("#1d2550"),
  bristle: toon("#ffffff"), bristleB: toon("#4aa3f0"), red: toon("#ff4f5f"), steel: toon("#c7ccd8"), gear: toon("#ffc23a"), lever: toon("#ff8a6a"), teal: toon("#2fd0c0"),
  magR: toon("#ff4f5f"), magB: toon("#4a7bff"), copper: toon("#e08a3c", { emissive: "#ff8a3c", ei: 0 }), cell: toon("#ffd23f"), cellTop: toon("#2a2f4a"), pcb: toon("#1f8a4a"), btn: toon("#ff4f5f"),
  tooth: toon("#fffaf0"), toothS: toon("#e9dcc6"), gum: toon("#ff8a9a"), mouth: toon("#5a1525"), tongue: toon("#e04a6a"), choc: toon("#6b3a1e"), chocD: toon("#4a2410"),
  base: toon("#e9ecf4"), field: toon("#7ff0ff", { transparent: true, opacity: 0.7 }), spark: toon("#ffffff", { emissive: "#ffffff", ei: 1 }),
};
const geo = { handle: new RoundedBoxGeometry(1.2, 6.2, 1.05, 6, 0.48), base: new RoundedBoxGeometry(1.9, 0.6, 1.7, 5, 0.25), tooth: new RoundedBoxGeometry(0.9, 1.25, 0.8, 4, 0.3) };

// ================= the brush (y up; head faces +z) =================
const HEAD_Y = 9.0;
const Brush: React.FC<{ t: number; xray: number; ghost: boolean }> = ({ t, xray, ghost }) => {
  const sw = swingA(t), shell = xray > 0.5 ? M.whiteT : M.white, grip = xray > 0.5 ? M.blueT : M.blue;
  const ang = motorA(t), pin: V3 = [0.32 + 0.12 * Math.cos(ang), 4.75, 0.12 * Math.sin(ang)];
  const Head = ({ a, g }: { a: number; g?: boolean }) => (
    <group position={[0, HEAD_Y, 0.18]} rotation={[0, 0, a]}>
      <mesh material={g ? M.whiteT : M.white} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.3, 24]} /></mesh>
      {!g && Array.from({ length: 13 }, (_, i) => { const r = i === 0 ? 0 : i < 5 ? 0.22 : 0.42, a2 = i === 0 ? 0 : i < 5 ? (i * Math.PI) / 2 : ((i - 5) * Math.PI) / 4 + 0.2; return (
        <mesh key={i} material={i % 3 === 0 ? M.bristleB : M.bristle} position={[r * Math.cos(a2), r * Math.sin(a2), 0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.1, 0.36, 8]} /></mesh>); })}
      <mesh material={M.blue} position={[0, 0, -0.17]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.58, 0.58, 0.05, 24]} /></mesh>
    </group>
  );
  return (
    <group>
      {/* handle + neck */}
      <mesh geometry={geo.handle} material={shell} position={[0, 3.1, 0]} />
      {xray < 0.5 && <mesh material={grip} position={[0, 2.2, 0.0]}><boxGeometry args={[1.25, 2.6, 1.1]} /></mesh>}
      <mesh material={M.btn} position={[0, 4.7, 0.53]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.08, 16]} /></mesh>
      <mesh material={shell} position={[0, 7.4, 0]}><cylinderGeometry args={[0.22, 0.42, 2.6, 16, 1, xray > 0.5]} /></mesh>
      <Head a={sw} />
      {ghost && <><Head a={SWING} g /><Head a={-SWING} g /></>}
      {/* ---- internals (x-ray) ---- */}
      {xray > 0.05 && <group>
        {/* drive shaft up the neck, twisting with the head */}
        <group rotation={[0, sw, 0]}>
          <mesh material={M.steel} position={[0, 6.8, 0]}><cylinderGeometry args={[0.07, 0.07, 4.2, 10]} /></mesh>
          <mesh material={M.teal} position={[0, 4.9, 0]}><cylinderGeometry args={[0.2, 0.2, 0.25, 14]} /></mesh>
          <mesh material={M.teal} position={[0.22, 4.9, 0]}><boxGeometry args={[0.45, 0.12, 0.16]} /></mesh>
        </group>
        {/* crank: gear with an off-centre pin + a lever that rocks the shaft */}
        <group position={[0.32, 4.6, 0]} rotation={[0, ang, 0]}>
          <mesh material={M.gear}><cylinderGeometry args={[0.3, 0.3, 0.12, 16]} /></mesh>
          {Array.from({ length: 12 }, (_, i) => <mesh key={i} material={M.gear} position={[0.33 * Math.cos((i * Math.PI) / 6), 0, 0.33 * Math.sin((i * Math.PI) / 6)]} rotation={[0, -(i * Math.PI) / 6, 0]}><boxGeometry args={[0.08, 0.12, 0.06]} /></mesh>)}
          <mesh material={M.red} position={[0.12, 0.12, 0]}><cylinderGeometry args={[0.05, 0.05, 0.14, 8]} /></mesh>
        </group>
        <mesh material={M.lever} position={[(pin[0] + 0.22) / 2 + 0.02, 4.8, pin[2] / 2]} rotation={[0, -Math.atan2(pin[2], pin[0] - 0.22), 0]}><boxGeometry args={[0.36, 0.08, 0.1]} /></mesh>
        <group position={[0.0, 4.35, 0]} rotation={[0, ang * 2, 0]}><mesh material={M.gear}><cylinderGeometry args={[0.13, 0.13, 0.14, 10]} /></mesh></group>
        {/* motor: magnets + spinning copper rotor */}
        <mesh material={toon("#c7ccd8", { transparent: true, opacity: 0.25 })} position={[0, 3.25, 0]}><cylinderGeometry args={[0.4, 0.4, 1.6, 20, 1, true]} /></mesh>
        {[-1, 1].map((sx, i) => <mesh key={i} material={i ? M.magB : M.magR} position={[sx * 0.36, 3.25, -0.05]}><boxGeometry args={[0.1, 1.4, 0.5]} /></mesh>)}
        <group position={[0, 3.25, 0]} rotation={[0, ang * 2, 0]}>
          {[0, 1, 2].map((k) => <mesh key={k} material={M.copper} rotation={[0, (k * 2 * Math.PI) / 3, 0]} position={[0.17 * Math.cos((k * 2 * Math.PI) / 3), 0, -0.17 * Math.sin((k * 2 * Math.PI) / 3)]}><boxGeometry args={[0.16, 1.3, 0.2]} /></mesh>)}
          <mesh material={M.steel}><cylinderGeometry args={[0.05, 0.05, 1.8, 8]} /></mesh>
        </group>
        {/* PCB + switch + cell + charging coil */}
        <mesh material={M.pcb} position={[0, 3.2, -0.42]}><boxGeometry args={[0.8, 3.6, 0.06]} /></mesh>
        <mesh material={M.cellTop} position={[0, 4.62, 0.42]}><boxGeometry args={[0.3, 0.2, 0.12]} /></mesh>
        <mesh material={M.cell} position={[0, 1.45, 0]}><cylinderGeometry args={[0.36, 0.36, 1.9, 18]} /></mesh>
        <mesh material={M.cellTop} position={[0, 2.44, 0]}><cylinderGeometry args={[0.14, 0.14, 0.08, 12]} /></mesh>
        <mesh material={M.blue} position={[0, 1.45, 0]}><cylinderGeometry args={[0.37, 0.37, 0.35, 18]} /></mesh>
        <mesh material={M.copper} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.32, 0.07, 8, 24]} /></mesh>
        <mesh material={M.copper} position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.32, 0.07, 8, 24]} /></mesh>
      </group>}
    </group>
  );
};
// ================= the mouth (hook) =================
const TEETH = Array.from({ length: 7 }, (_, i) => ({ x: (i - 3) * 1.0, z: -0.12 * (i - 3) ** 2 }));
const Mouth: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh material={M.mouth} position={[0, 0, -6]}><planeGeometry args={[60, 60]} /></mesh>
    <mesh material={M.tongue} position={[0, -3.6, -1.5]} scale={[4.5, 1.2, 3]}><sphereGeometry args={[1, 24, 12]} /></mesh>
    {[1, -1].map((s) => <group key={s} position={[0, s * 1.55, 0]}>
      <mesh material={M.gum} position={[0, s * 0.9, -0.4]} scale={[4.6, 0.7, 1.4]}><sphereGeometry args={[1, 28, 12]} /></mesh>
      {TEETH.map((th, i) => <group key={i} position={[th.x, 0, th.z]} rotation={[0, -0.12 * (i - 3), 0]}>
        <mesh geometry={geo.tooth} material={M.tooth} />
        <mesh material={M.toothS} position={[0, -s * 0.35, -0.15]} scale={[0.4, 0.2, 0.35]}><sphereGeometry args={[1, 10, 6]} /></mesh>
      </group>)}
    </group>)}
    {/* chocolate on two teeth */}
    {[[-1.0, 1.4], [0.05, 1.7], [1.0, -1.5]].map(([x, y], i) => <group key={i} position={[x, y, 0.42 + TEETH[Math.round(x) + 3].z]}>
      <mesh material={M.choc} scale={[0.35, 0.22, 0.08]}><sphereGeometry args={[1, 12, 8]} /></mesh>
      <mesh material={M.chocD} position={[0.12, -0.05, 0.03]} scale={[0.12, 0.08, 0.05]}><sphereGeometry args={[1, 8, 6]} /></mesh>
    </group>)}
    {/* the chocolate bar being eaten */}
    <group position={[-3.6, 3.4, 1.2]} rotation={[0.3, 0.6, -0.5 + 0.05 * Math.sin(t * 2)]}>
      <mesh material={M.choc}><boxGeometry args={[2.4, 0.35, 1.4]} /></mesh>
      {[-0.8, 0, 0.8].map((x, i) => <mesh key={i} material={M.chocD} position={[x, 0.2, 0]}><boxGeometry args={[0.65, 0.08, 1.2]} /></mesh>)}
    </group>
  </group>
);
// field lines for charging
const FieldLines: React.FC<{ t: number }> = ({ t }) => (
  <group position={[0, -0.6, 0]}>
    {[0.7, 1.1, 1.5].map((r, i) => <mesh key={i} material={M.field} position={[0, 0.6 + 0.15 * Math.sin(t * 6 + i), 0]} scale={[1, 1.6 + 0.2 * Math.sin(t * 4 + i), 1]}><torusGeometry args={[r, 0.03, 6, 40]} /></mesh>)}
    {Array.from({ length: 8 }, (_, k) => { const u = ((t * 0.8 + k / 8) % 1); return <mesh key={`p${k}`} material={M.spark} position={[0.32 * Math.cos(k), 0.2 + u * 1.2, 0.32 * Math.sin(k)]}><sphereGeometry args={[0.05, 6, 4]} /></mesh>; })}
  </group>
);

// ================= poses + camera =================
// hook pose: brush lying across, head on the front teeth; studio pose: upright in the dark
type Pose = { p: V3; r: V3 };
const HOOK_R: V3 = [0.35, Math.PI - 0.35, -0.55], HOOK_HEAD: V3 = [0.45, 1.15, 1.25];
const HOOKPOSE: Pose = (() => { const v = new THREE.Vector3(0, HEAD_Y, 0.18).applyEuler(new THREE.Euler(...HOOK_R)); return { p: [HOOK_HEAD[0] - v.x, HOOK_HEAD[1] - v.y, HOOK_HEAD[2] - v.z], r: HOOK_R }; })();
const STUDIO: Pose = { p: [0, -4.5, 0], r: [0, -0.35, 0] };
const poseAt = (t: number): Pose => {
  let k = 0;
  if (t < L[1]) k = 0; else if (t < L[2]) k = ease((t - L[1]) / (L[2] - L[1])); else if (t < STEPS[0][0]) k = 1; else if (t < L[7] - 0.6) k = 1 - ease((t - STEPS[0][0]) / (L[7] - 0.6 - STEPS[0][0])); else k = 0;
  return { p: lerp3(HOOKPOSE.p, STUDIO.p, k), r: lerp3(HOOKPOSE.r, STUDIO.r, k) };
};
const mouthK = (t: number) => (t < L[1] + 0.4 ? 1 : t < L[2] ? 1 - ease((t - L[1] - 0.4) / (L[2] - L[1] - 0.4)) : t < L[6] + 0.5 ? 0 : t < L[7] - 0.5 ? ease((t - L[6] - 0.5) / 1.2) : 1);
const HOOKCAM = { p: [2.6, 1.2, 15.5] as V3, l: [0.6, 0.6, 0] as V3 };
// key points in the studio pose (world), for the camera + tags
const sp = (y: number, x = 0, z = 0): V3 => { const a = STUDIO.r[1]; return [STUDIO.p[0] + x * Math.cos(a) + z * Math.sin(a), STUDIO.p[1] + y, STUDIO.p[2] - x * Math.sin(a) + z * Math.cos(a)]; };
const CAM: CamKey[] = [
  { t: 0, ...HOOKCAM }, { t: L[1], ...HOOKCAM },
  { t: L[2] - 0.2, p: [1.6, sp(HEAD_Y)[1] + 0.6, 6.8], l: sp(HEAD_Y - 0.4) },
  { t: L[2] + 0.8, p: [3.4, sp(5.0)[1] + 1.8, 8.4], l: sp(4.9) }, { t: L[3] - 0.2, p: [3.0, sp(5.0)[1] + 1.9, 8.2], l: sp(4.9) },
  { t: L[3] + 0.6, p: [2.8, sp(3.3)[1] + 1.4, 7.4], l: sp(3.25) }, { t: L[4] - 0.2, p: [2.6, sp(3.3)[1] + 1.5, 7.6], l: sp(3.25) },
  { t: L[4] + 0.7, p: [3.6, sp(2.8)[1] + 1.0, 10.0], l: sp(2.9) }, { t: L[5] - 0.2, p: [3.4, sp(2.8)[1] + 1.1, 10.2], l: sp(2.9) },
  { t: L[5] + 0.6, p: [3.6, sp(0.6)[1] + 2.4, 9.6], l: sp(0.5) }, { t: L[6] - 0.2, p: [3.4, sp(0.6)[1] + 2.5, 9.8], l: sp(0.5) },
  { t: L[6] + 0.8, p: [3.4, 1.2, 17.5], l: [0.4, -0.4, 0] }, { t: L[7] - 0.6, p: [3.0, 1.2, 16.5], l: [0.5, 0.2, 0] },
  { t: L[7], ...HOOKCAM }, { t: D, ...HOOKCAM },
];
const camFor = (t: number) => camAt(CAM, t) as { p: V3; l: V3 };
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

// ================= pixel UI =================
const INK = "#141833", CREAM = "#fff6e0", RED = "#e2384d", BLUE = "#2f6fe0", GREEN = "#5ef08a";
type Banner = { from: number; to: number; n?: number; a: string; key: string; b: string; sub?: string; hold?: boolean };
const HB = { a: "HOW DOES AN ", key: "ELECTRIC", b: " BRUSH WORK?", sub: "IT SWINGS ~8,800 TIMES A MINUTE", hold: true };
const BANNERS: Banner[] = [
  { from: 0, to: L[1], ...HB },
  { from: L[1] + 0.5, to: L[2], a: "IT DOESN'T ", key: "SPIN", b: "", sub: "IT SWINGS LEFT, RIGHT, LEFT..." },
  { from: L[2], to: L[3], n: 1, a: "WHAT ", key: "SWINGS", b: " IT?", sub: "A GEAR + CRANK TURN SPIN INTO SWING" },
  { from: L[3], to: L[4], n: 2, a: "WHAT ", key: "SPINS", b: " THE GEAR?", sub: "A MOTOR: MAGNETS PUSH COPPER COILS" },
  { from: L[4], to: L[5], n: 3, a: "WHAT ", key: "FEEDS", b: " IT?", sub: "A RECHARGEABLE CELL + ONE SWITCH" },
  { from: L[5], to: L[6], n: 4, a: "HOW DOES IT ", key: "CHARGE", b: "?", sub: "NO METAL CONTACTS: A MAGNETIC FIELD" },
  { from: L[6], to: L[7], a: "BACK TO ", key: "REAL SPEED", b: "", sub: "EVERY STEP: TWICE AS FAST" },
  { from: L[7], to: D + 0.01, ...HB },
];
type Tag = { txt: string; at: V3; from: number; to: number; dx: number; dy: number; col: string };
const TAGS: Tag[] = [
  { txt: "SHAFT", at: sp(7.0), from: L[2] + 0.6, to: L[3], dx: -70, dy: -40, col: "#c7ccd8" },
  { txt: "OFF-CENTRE PIN", at: sp(4.75, 0.44), from: L[2] + 1.2, to: L[3], dx: 60, dy: -60, col: RED },
  { txt: "LEVER", at: sp(4.8, 0.25), from: L[2] + 1.8, to: L[3], dx: -70, dy: 50, col: "#ff8a6a" },
  { txt: "MAGNETS", at: sp(3.25, -0.38, -0.05), from: L[3] + 0.6, to: L[4], dx: -70, dy: -50, col: "#4a7bff" },
  { txt: "COPPER COILS", at: sp(3.0, 0.15, 0.2), from: L[3] + 1.1, to: L[4], dx: 70, dy: 60, col: "#e08a3c" },
  { txt: "SWITCH", at: sp(4.62, 0, 0.45), from: L[4] + 0.6, to: L[5], dx: 70, dy: -50, col: RED },
  { txt: "CELL", at: sp(1.5, 0.36), from: L[4] + 1.1, to: L[5], dx: 70, dy: 50, col: "#ffd23f" },
  { txt: "COIL IN HANDLE", at: sp(0.35, 0.3), from: L[5] + 0.6, to: L[6], dx: 70, dy: -60, col: "#e08a3c" },
  { txt: "COIL IN BASE", at: sp(-0.6, 0.6), from: L[5] + 1.1, to: L[6], dx: -60, dy: 60, col: "#7ff0ff" },
];
const drawUI = (ctx: Ctx, t: number, cam: { p: V3; l: V3 }) => {
  const s = slowAt(t), real = s < 1.05, slowing = t >= L[1] && t < L[2];
  prect(ctx, 6, 8, 16, 16, BLUE, INK); ctx.fillStyle = "#fff"; ctx.fillRect(13, 11, 2, 9); ctx.fillRect(11, 11, 6, 3);
  prect(ctx, 22, 8, 86, 16, "#ffffff", INK); ptext(ctx, real ? "REAL SPEED" : slowing ? "SLOWING..." : `${Math.round(s)}x SLOWER`, 65, 21, 11, real ? RED : INK, { align: "center" });
  prect(ctx, 114, 10, 104, 12, "#ffffff", INK);
  const segs = Math.round(8 * (1 - Math.log(s) / Math.log(64)));
  for (let i = 0; i < 8; i++) prect(ctx, 117 + i * 12.4, 13, 10, 6, i < segs ? (i > 5 ? RED : "#ffb03b") : "#c9cbe0");
  prect(ctx, 224, 8, 130, 16, "#ffffff", INK); ptext(ctx, "SWINGS", 229, 15, 6, INK, { font: "Silk" }); ptext(ctx, "A MINUTE", 229, 22, 6, INK, { font: "Silk" });
  prect(ctx, 270, 10, 70, 12, INK); ptext(ctx, String(Math.round(8800 / s)).padStart(4, "0"), 305, 21, 11, GREEN, { align: "center" });
  prect(ctx, 341, 10, 11, 12, BLUE, INK);
  // banner
  const b = BANNERS.find((x) => t >= x.from && t < x.to);
  if (b) {
    const k = b.hold ? 1 : backOut((t - b.from) / 0.3);
    if (k > 0.05) {
      ctx.save(); ctx.translate(180, 52); ctx.scale(k, k); ctx.translate(-180, -52);
      ctx.font = "16px AlfaSlab"; const fs = Math.min(16, Math.floor(16 * 300 / ctx.measureText(b.a + b.key + b.b).width)); ctx.font = `${fs}px AlfaSlab`; const w = ctx.measureText(b.a + b.key + b.b).width + 36, x0 = Math.round(180 - w / 2);
      prect(ctx, x0 + 3, 41, w, 26, "rgba(0,0,0,0.35)"); prect(ctx, x0, 38, w, 26, CREAM, INK);
      for (let yy = 0; yy < 24; yy++) for (const xx of [x0 + 1, x0 + w - 9]) for (let q = 0; q < 8; q++) { ctx.fillStyle = ((q + yy) >> 2) % 2 ? RED : "#ffffff"; ctx.fillRect(xx + q, 39 + yy, 1, 1); }
      let xx = x0 + 14; xx += ptext(ctx, b.a, xx, 58, fs, INK) - 4; xx += ptext(ctx, b.key, xx, 58, fs, RED) - 4; if (b.b) ptext(ctx, b.b, xx, 58, fs, INK);
      if (b.n) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x0, 38, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(x0, 38, 7.5, 0, Math.PI * 2); ctx.fill(); ptext(ctx, String(b.n), x0, 44, 12, "#ffffff", { align: "center" }); }
      if (b.sub) { ctx.font = "8px Silk"; const sw = ctx.measureText(b.sub).width + 12; prect(ctx, Math.round(180 - sw / 2), 70, sw, 13, RED, INK); ptext(ctx, b.sub, 180, 80, 8, "#ffffff", { font: "Silk", align: "center" }); }
      ctx.restore();
    }
  }
  // tags
  for (const g of TAGS) {
    if (t < g.from || t >= g.to) continue;
    const [X, Y] = project(g.at, cam, FOV), x = X / 3, y = Y / 3;
    ctx.font = "11px AlfaSlab"; const w = Math.ceil(ctx.measureText(g.txt).width) + 14;
    const ex = Math.max(w / 2 + 4, Math.min(CW - w / 2 - 4, x + g.dx)), ey = Math.max(96, Math.min(600, y + g.dy));
    pline(ctx, x, y, ex, ey, "#ffffff"); prect(ctx, x - 1, y - 1, 3, 3, "#ffffff", INK);
    prect(ctx, ex - w / 2 + 2, ey - 8, w, 17, "rgba(0,0,0,0.35)"); prect(ctx, ex - w / 2, ey - 10, w, 17, CREAM, INK); prect(ctx, ex - w / 2, ey - 10, 5, 17, g.col, INK);
    ptext(ctx, g.txt, ex + 3, ey + 3, 11, INK, { align: "center" });
  }
  // LEFT! / RIGHT! in slow motion
  if (t >= L[1] + 0.6 && t < L[3]) { const ph = phase(t) % 1; const left = ph < 0.5; const u = (ph % 0.5) / 0.5; if (u < 0.45) ptext(ctx, left ? "LEFT!" : "RIGHT!", left ? 40 : 230, 330 - u * 20, 22, "#ffffff", { outline: INK, italic: true }); }
  // speed-up gauge + ×2
  if (t >= STEPS[0][0] && t < L[7]) {
    prect(ctx, 8, 92, 78, 56, "#ffffff", INK);
    const ang = -2.4 + 2.2 * (1 - Math.log(s) / Math.log(64));
    for (let i = 0; i <= 10; i++) { const a = -2.4 + (2.2 * i) / 10 - Math.PI / 2 + Math.PI / 2; pline(ctx, 47 + 26 * Math.cos(a - Math.PI / 2 + 0), 128 + 26 * Math.sin(a - Math.PI / 2), 47 + 30 * Math.cos(a - Math.PI / 2), 128 + 30 * Math.sin(a - Math.PI / 2), i > 7 ? RED : INK); }
    pline(ctx, 47, 128, 47 + 24 * Math.cos(ang - Math.PI / 2 + 0.7), 128 + 24 * Math.sin(ang - Math.PI / 2 + 0.7), RED);
    prect(ctx, 14, 134, 66, 11, INK); ptext(ctx, `${Math.round(8800 / 60 / s)} /S`, 47, 143, 8, GREEN, { font: "Silk", align: "center" });
    const st = STEPS.filter(([a]) => a <= t).pop()!; const age = t - st[0];
    if (st[1] < 64 && age < 0.4) ptext(ctx, "x2", 40, 200 - age * 30, 26, "#ffffff", { outline: INK, italic: true });
  }
  ptext(ctx, "@HOWTOWITHZAY", 6, 632, 8, "#ffffff", { font: "Silk", shadow: INK });
};

export const ToothbrushVideo: React.FC = () => {
  const frame = useCurrentFrame(), t = frame / FPS;
  const cam = camFor(t), pose = poseAt(t), mk = mouthK(t);
  const xray = t >= L[2] - 0.4 && t < L[7] - 0.4 ? clamp01(Math.min((t - L[2] + 0.4) / 0.5, (L[7] - 0.4 - t) / 0.5)) : 0;
  (M.copper as THREE.MeshToonMaterial).emissiveIntensity = t >= L[5] && t < L[6] ? 0.6 + 0.4 * Math.sin(t * 12) : 0;
  const bg = mk > 0.5 ? "#5a1525" : "#1b2350";
  return (
    <AbsoluteFill style={{ background: bg }}>
      <Audio src={staticFile("videos/41-toothbrush/music.wav")} />
      <CelPixelCanvas fov={FOV} bg={bg}>
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 12]} intensity={1.5} color="#fff4e0" />
        <directionalLight position={[-6, 3, -4]} intensity={0.7} color="#9fc8ff" />
        {mk > 0.01 && <group position={[0, (1 - mk) * -12, 0]}><Mouth t={t} /></group>}
        {mk > 0.5 && <group position={HOOK_HEAD}>
          {Array.from({ length: 14 }, (_, k) => { const u = (((t * 0.9 + k / 14) % 1) + 1) % 1, a = k * 2.4; return <mesh key={k} material={M.white} position={[0.75 * Math.cos(a) * (0.6 + u * 0.6), 0.6 * Math.sin(a) * (0.6 + u * 0.6), -0.35 + 0.1 * Math.sin(k)]} scale={(0.12 + 0.08 * Math.sin(k * 3)) * (u < 0.85 ? 1 : (1 - u) / 0.15)}><sphereGeometry args={[1, 8, 6]} /></mesh>; })}
        </group>}
        <group position={[pose.p[0] + (freq(t) > 9 ? 0.03 * Math.sin(t * 173) : 0), pose.p[1] + (freq(t) > 9 ? 0.03 * Math.cos(t * 151) : 0), pose.p[2]]} rotation={pose.r}>
          <Brush t={t} xray={xray} ghost={freq(t) > 9} />
          {t >= L[5] - 0.2 && t < L[6] && <group>
            <mesh geometry={geo.base} material={M.base} position={[0, -0.6, 0]} />
            <FieldLines t={t} />
          </group>}
        </group>
      </CelPixelCanvas>
      <PixelUI draw={(ctx) => drawUI(ctx, t, cam)} deps={[frame]} />
    </AbsoluteFill>
  );
};
