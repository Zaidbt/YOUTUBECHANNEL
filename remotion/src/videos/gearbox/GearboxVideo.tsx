/**
 * Video 029 · What happens inside a manual gearbox — same slick 3D toon-pixel neon look as the Wankel video.
 * Model: input shaft (from the clutch) + constant-mesh pair to the layshaft; three gear pairs (1st, 2nd, 3rd) always in
 * mesh, the output-shaft gears spin FREE until a sliding collar (with a synchro cone) locks one of them to the output
 * shaft. The gear stick moves selector rails that slide the collars. Clutch = flywheel + disc that separate.
 * Ratios: input 0.55 → layshaft 0.95 (×1.73), 1st 0.5 → 1.0 (×2.0) ≈ 3.5 overall, 2nd 0.7 → 0.8, 3rd 0.9 → 0.6.
 * 40.3 s loop, 155 BPM Eurobeat; every shift is a hit, key changes on the full-send upshifts (gearbox.json + music.wav
 * from videos/29-gearbox/build.py). Rotations use a per-part correction so every angle lands back at the loop seam.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./gearbox.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type P2 = [number, number];
const D = EV.duration, BAR = EV.bar, BEAT = EV.beat;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 30;
const SHIFTS = EV.shifts as [number, number][], L = EV.l as number[], GRIND = EV.grind, CLUTCH = EV.clutch as number[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const backOut = (x: number) => { const k = clamp01(x), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;

export const GB_PALETTE = [
  "#05060f", "#0a0e24", "#121a4a", "#1c2a6e", "#2b3f99", "#262b45", "#3a3f5a", "#454b6a", "#5a607a", "#6e7596", "#8c93b3", "#aab1cf",
  "#c8cdf0", "#e0e6ff", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#6ee6cf", "#1fb5a8", "#0f6e6a", "#ff4f8b", "#d94a7a", "#ffb3c9",
  "#7a4dff", "#b48cff", "#5a2a9a", "#ff3a2a", "#8a1414", "#ff8a1f", "#c85a10", "#ffbf6a", "#ffd23f", "#fff08a", "#fff3b0", "#c8a010",
  "#4a2a5a", "#7a4a6a", "#3fcf6a", "#1f8a4a", "#ff8a7a",
];
const BG = "#05060f";
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);
const slowAt = (t: number) => t >= L[2] && t < L[9];

// ================= gear state =================
const gearAt = (t: number) => { let g = SHIFTS[0][1], at = 0; for (const [tt, gg] of SHIFTS) if (tt <= t) { g = gg; at = tt; } return { g, at }; };
const prevGear = (t: number) => { let p = SHIFTS[0][1], cur = SHIFTS[0][1]; for (const [tt, gg] of SHIFTS) if (tt <= t) { p = cur; cur = gg; } return p; };
const MOVE = (t: number) => (slowAt(t) ? 0.55 : 0.12);
/** collar offsets: A between 1st/2nd (+ → 1st, − → 2nd), B next to 3rd (+ → 3rd) */
const collarTarget = (g: number) => ({ a: g === 1 ? 1 : g === 2 ? -1 : 0, b: g === 3 ? 1 : 0 });
const collars = (t: number) => {
  const { g, at } = gearAt(t), p = prevGear(t), k = ease((t - at) / MOVE(t)), A = collarTarget(p), B = collarTarget(g);
  let a = lerp(A.a, B.a, k), c = lerp(A.b, B.b, k);
  const gr = t - GRIND; if (gr >= 0 && gr < BEAT * 1.6) { const bump = 0.35 * Math.abs(Math.sin(gr * 40)) * (1 - gr / (BEAT * 1.6)); c = Math.min(c, 0.55) - bump * 0; a = a; c = 0.55 - bump; }
  return { a, b: c, engaged: k > 0.92 ? g : 0, k, g };
};
// ================= kinematics (rev/s), loop-corrected angles =================
const RIN = 0.55, RLAY_IN = 0.95, PAIRS = [{ x: 1.6, out: 1.0, lay: 0.5, col: "#ff4f8b" }, { x: 0.65, out: 0.8, lay: 0.7, col: "#6ee6cf" }, { x: -0.55, out: 0.6, lay: 0.9, col: "#ffd23f" }];
const W_IN = 3.0;
const loopAngle = (w: number, t: number) => { const tot = w * D, fix = tot - Math.round(tot); return 2 * Math.PI * (w * t - fix * (t / D)); };
const W_LAY = -W_IN * RIN / RLAY_IN;
const wGear = (i: number) => -W_LAY * PAIRS[i].lay / PAIRS[i].out;
// output shaft: integrate the engaged gear speed (neutral → slow wheel-driven) with a loop fix
const OUT_STEPS = (() => { const N = 4000, dt = D / N; let a = 0; const arr: number[] = [0]; for (let i = 0; i < N; i++) { const t = i * dt, c = collars(t); const w = c.engaged ? wGear(c.engaged - 1) : 0.35; a += w * dt; arr.push(a); } return { arr, dt, tot: a }; })();
const outAngle = (t: number) => { const i = Math.min(OUT_STEPS.arr.length - 1, Math.max(0, Math.floor(t / OUT_STEPS.dt))); const a = OUT_STEPS.arr[i], fix = OUT_STEPS.tot - Math.round(OUT_STEPS.tot); return 2 * Math.PI * (a - fix * (t / D)); };

// ================= parts =================
const gradTex = (() => { const d = new Uint8Array([60, 60, 60, 255, 150, 150, 150, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1); t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (c: string, emissive = "#000000", ei = 0) => new THREE.MeshToonMaterial({ color: c, gradientMap: gradTex, emissive, emissiveIntensity: ei });
const gearGeo = (r: number, w: number) => {
  const teeth = Math.max(10, Math.round(r * 22)), tooth = 0.085, pts: THREE.Vector2[] = [];
  for (let i = 0; i < teeth * 4; i++) { const a = (i / (teeth * 4)) * Math.PI * 2, rr = (i % 4 === 1 || i % 4 === 2) ? r + tooth : r; pts.push(new THREE.Vector2(rr * Math.cos(a), rr * Math.sin(a))); }
  const sh = new THREE.Shape(pts); sh.holes.push(new THREE.Path(Array.from({ length: 24 }, (_, i) => new THREE.Vector2(0.16 * Math.cos((i / 24) * Math.PI * 2), -0.16 * Math.sin((i / 24) * Math.PI * 2)))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); g.translate(0, 0, -w / 2); return g;
};
const Gear: React.FC<{ x: number; y: number; r: number; w?: number; ang: number; mat: THREE.Material; hub?: THREE.Material }> = ({ x, y, r, w = 0.32, ang, mat, hub }) => {
  const geo = useMemo(() => gearGeo(r, w), [r, w]);
  return (
    <group position={[x, y, 0]} rotation={[0, Math.PI / 2, 0]}>
      <group rotation={[0, 0, ang]}>
        <mesh geometry={geo} material={mat} />
        {r > 0.45 && [0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * r * 0.58, Math.sin((i / 5) * Math.PI * 2) * r * 0.58, w / 2 + 0.005]} material={hub ?? mat}><circleGeometry args={[r * 0.13, 12]} /></mesh>)}
      </group>
    </group>
  );
};
const Shaft: React.FC<{ x0: number; x1: number; y: number; r: number; mat: THREE.Material; ang: number }> = ({ x0, x1, y, r, mat, ang }) => (
  <group position={[(x0 + x1) / 2, y, 0]} rotation={[0, 0, Math.PI / 2]}>
    <mesh material={mat} rotation={[0, ang, 0]}><cylinderGeometry args={[r, r, x1 - x0, 16]} /></mesh>
    <mesh rotation={[0, ang, 0]} position={[0, 0, r * 0.9]}><boxGeometry args={[0.04, x1 - x0, 0.04]} /><meshBasicMaterial color="#05060f" /></mesh>
  </group>
);
const YO = 0.9, YL = -0.6;
const Box: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const m = useMemo(() => ({ steel: toon("#8c93b3"), dark: toon("#454b6a"), shaft: toon("#c8cdf0"), input: toon("#ff8a1f", "#c85a10", 0.2), lay: toon("#6e7596"),
    g: PAIRS.map((p) => toon(p.col, p.col, 0.15)), collar: toon("#ffffff", "#bfe6ff", 0.3), fly: toon("#5a607a"), disc: toon("#7a4dff", "#5a2a9a", 0.2), knob: toon("#05060f"), rail: toon("#aab1cf"), plate: toon("#1c2a6e") }), []);
  const aIn = loopAngle(W_IN, t), aLay = loopAngle(W_LAY, t), aOut = outAngle(t), c = collars(t);
  const clutchIn = t >= CLUTCH[0] && t < CLUTCH[1] ? Math.min(ease((t - CLUTCH[0]) / 0.3), ease((CLUTCH[1] - t) / 0.3)) : 0;
  const ax = 1.12 + c.a * 0.3, bx = -1.0 + c.b * 0.25;
  const lockFlash = (gi: number) => (c.engaged === gi && c.k < 1.4 ? 1 : 0);
  const { g, at } = gearAt(t), since = t - at;
  // stick: lean per gear (1 & 3 forward, 2 back), slight sideways for 3
  const lean = { 0: [0, 0], 1: [-0.38, -0.25], 2: [0.38, -0.25], 3: [-0.38, 0.25] } as Record<number, number[]>;
  const p = lean[prevGear(t)], q = lean[g], kk = ease(since / MOVE(t));
  const sl = [lerp(p[0], q[0], kk), lerp(p[1], q[1], kk)];
  return (
    <group>
      {/* back plate (casing cut-away) */}
      <mesh position={[0, 0.2, -1.25]} material={m.plate}><boxGeometry args={[6.2, 4.4, 0.08]} /></mesh>
      {/* clutch: flywheel (engine side) + disc */}
      <Gear x={-2.85} y={YO} r={1.1} w={0.22} ang={aIn} mat={m.fly} />
      <group position={[-2.55 + 0.25 * clutchIn, YO, 0]} rotation={[0, Math.PI / 2, 0]}><mesh material={m.disc} rotation={[0, 0, aIn * (1 - clutchIn)]}><cylinderGeometry args={[0.95, 0.95, 0.1, 32]} /></mesh></group>
      {/* shafts */}
      <Shaft x0={-2.6} x1={-1.25} y={YO} r={0.13} mat={m.input} ang={aIn} />
      <Shaft x0={-1.25} x1={3.2} y={YO} r={0.15} mat={m.shaft} ang={aOut} />
      <Shaft x0={-1.95} x1={2.0} y={YL} r={0.13} mat={m.lay} ang={aLay} />
      {/* constant-mesh input pair */}
      <Gear x={-1.5} y={YO} r={RIN} ang={aIn} mat={m.input} />
      <Gear x={-1.5} y={YL} r={RLAY_IN} ang={aLay} mat={m.lay} />
      {/* the three pairs: layshaft gears fixed, output gears FREE (spin at their own speed) */}
      {PAIRS.map((pr, i) => <React.Fragment key={i}>
        <Gear x={pr.x} y={YL} r={pr.lay} ang={aLay} mat={m.lay} />
        <Gear x={pr.x} y={YO} r={pr.out} ang={c.engaged === i + 1 ? aOut : loopAngle(wGear(i), t)} mat={m.g[i]} />
        {/* dog teeth ring on the side of each output gear */}
        <group position={[pr.x + (i === 2 ? -0.2 : i === 0 ? -0.2 : 0.2), YO, 0]} rotation={[0, 0, Math.PI / 2]}><mesh material={m.g[i]}><cylinderGeometry args={[0.3, 0.3, 0.08, 12]} /></mesh></group>
        {lockFlash(i + 1) > 0 && since < 0.6 && <Glow map={map} at={[pr.x, YO, 0.6]} size={2.4} color={pr.col} opacity={1 - since / 0.6} />}
      </React.Fragment>)}
      {/* sliding collars (synchro hubs) */}
      {[ax, bx].map((x, i) => <group key={`col${i}`} position={[x, YO, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={m.collar} rotation={[0, aOut, 0]}><cylinderGeometry args={[0.36, 0.36, 0.22, 16]} /></mesh>
        <mesh rotation={[0, aOut, 0]}><torusGeometry args={[0.36, 0.035, 6, 16]} /><meshBasicMaterial color="#4a9aff" /></mesh>
      </group>)}
      {/* selector forks + rails up to the stick */}
      {[ax, bx].map((x, i) => <React.Fragment key={`rl${i}`}>
        <mesh position={[x, YO + 0.62, 0]} material={m.rail}><boxGeometry args={[0.06, 0.55, 0.5]} /></mesh>
        <mesh position={[x + (i === 0 ? -0.9 : 0.75), YO + 0.95, i === 0 ? 0.15 : -0.15]} material={m.rail}><boxGeometry args={[1.8, 0.08, 0.08]} /></mesh>
      </React.Fragment>)}
      {/* the gear stick */}
      <group position={[0.15, YO + 1.05, 0]}>
        <mesh material={m.dark}><sphereGeometry args={[0.2, 16, 12]} /></mesh>
        <group rotation={[sl[1], 0, sl[0]]}>
          <mesh position={[0, 0.45, 0]} material={m.steel}><cylinderGeometry args={[0.05, 0.06, 0.9, 10]} /></mesh>
          <mesh position={[0, 0.98, 0]} material={m.knob}><sphereGeometry args={[0.24, 18, 14]} /></mesh>
          <mesh position={[0, 0.98, 0.235]}><circleGeometry args={[0.1, 12]} /><meshBasicMaterial color={g === 0 ? "#8c93b3" : PAIRS[g - 1].col} /></mesh>
        </group>
      </group>
      {/* grind sparks */}
      {t >= GRIND && t < GRIND + BEAT * 1.6 && Array.from({ length: 10 }, (_, i) => { const a = (t - GRIND) * 3 + i * 0.6, rr = 0.3 + ((a * 1.7) % 1) * 0.6; return <mesh key={`sp${i}`} position={[-0.75 + Math.cos(i * 2.1) * 0.1, YO + Math.sin(a * 6 + i) * rr, 0.4 + Math.cos(a * 5 + i) * rr]}><sphereGeometry args={[0.04, 4, 3]} /><meshBasicMaterial color={i % 2 ? "#ff3a2a" : "#ffd23f"} /></mesh>; })}
      {t >= GRIND && t < GRIND + BEAT * 1.6 && <Glow map={map} at={[-0.75, YO, 0.6]} size={2.0} color="#ff3a2a" opacity={0.8} />}
      {/* drive out to the wheels */}
      <Gear x={3.25} y={YO} r={0.35} w={0.2} ang={aOut} mat={m.dark} />
    </group>
  );
};

// ================= stage =================
const Stage: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), send = t >= L[9] && t < L[10];
  const ringCol = send ? "#ff3a2a" : "#ff4f8b";
  return (
    <group>
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 6]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-4, 1, 3]} intensity={18} distance={12} color="#4a9aff" />
      <pointLight position={[4, -1, 3]} intensity={18} distance={12} color="#ff4f8b" />
      <mesh position={[0, 0.2, -2.4]}><torusGeometry args={[3.3 + 0.06 * k, 0.06, 8, 96]} /><meshBasicMaterial color={ringCol} /></mesh>
      <mesh position={[0, 0.2, -2.5]}><torusGeometry args={[3.75, 0.03, 8, 96]} /><meshBasicMaterial color="#4a9aff" /></mesh>
      <Glow map={map} at={[0, 0.2, -2.8]} size={9} color={ringCol} opacity={0.18 + 0.12 * k} />
      {Array.from({ length: 13 }, (_, i) => <mesh key={`gx${i}`} position={[-6 + i, -2.6, -1]}><boxGeometry args={[0.02, 0.02, 8]} /><meshBasicMaterial color="#2b3f99" /></mesh>)}
      {Array.from({ length: 8 }, (_, i) => { const z = -5 + ((i + (t * (send ? 3 : 0.8)) % 1) % 8); return <mesh key={`gz${i}`} position={[0, -2.6, z]}><boxGeometry args={[12, 0.02, 0.02]} /><meshBasicMaterial color="#2b3f99" /></mesh>; })}
      {Array.from({ length: 24 }, (_, i) => <mesh key={`d${i}`} position={[(rnd(i + 1) - 0.5) * 9, (rnd(i + 2) - 0.5) * 9 + 0.2 * Math.sin(3 * LW * t + i), -3 - rnd(i + 3) * 3]}><sphereGeometry args={[0.025, 4, 3]} /><meshBasicMaterial color={i % 3 ? "#bfe6ff" : "#ffb3c9"} /></mesh>)}
      <group position={[0, -1.0, 0]} scale={1 + 0.01 * k}><Box t={t} map={map} /></group>
    </group>
  );
};

// ================= camera, tags, labels, HUD =================
type Tag = { txt: string; at: V3; from: number; to: number; col: string };
const Y0 = -1.0;
const TAGS: Tag[] = [
  { txt: "ENGINE", at: [-2.85, YO + Y0 + 1.25, 0], from: L[1] + 0.2, to: L[2], col: "#8c93b3" },
  { txt: "CLUTCH", at: [-2.4, YO + Y0 - 1.15, 0.4], from: L[1] + 0.6, to: L[2], col: "#b48cff" },
  { txt: "TO WHEELS", at: [3.0, YO + Y0 + 0.6, 0], from: L[1] + 1.0, to: L[2], col: "#c8cdf0" },
  { txt: "LOOSE GEARS", at: [0.6, YO + Y0 + 1.15, 0.5], from: L[2] + 0.4, to: L[3], col: "#6ee6cf" },
  { txt: "COLLAR", at: [1.12, YO + Y0 + 0.55, 0.6], from: L[3] + 0.3, to: L[4], col: "#ffffff" },
  { txt: "SYNCHRO CONE", at: [0.9, YO + Y0 + 0.55, 0.6], from: L[4] + 0.3, to: L[5], col: "#4a9aff" },
  { txt: "CLUTCH OPEN", at: [-2.4, YO + Y0 - 1.15, 0.4], from: L[7] + 0.3, to: L[8], col: "#b48cff" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: Math.max(150, Math.min(930, x)), top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 24, color: "#ffffff", background: "rgba(5,6,15,0.9)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #000", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [10.5, 3.6, 17] as V3, l: [0.1, -0.9, 0] as V3 };
const at = (x: number, y: number, z: number, lx = x, ly = y) => ({ p: [x, y - 0.6, z] as V3, l: [lx, ly - 0.6, 0] as V3 });
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: L[1], ...HOME }, { t: L[1] + 1.0, ...at(5.5, 2.2, 18.5, 0, -0.3) }, { t: L[2], ...at(5.5, 2.2, 18.5, 0, -0.3) },
  { t: L[2] + 1.0, ...at(9.5, 2.4, 14.5, 0.4, 0.0) }, { t: L[4], ...at(8, 1.8, 10.5, 0.9, 0.3) }, { t: L[5] - 0.4, ...at(8, 1.8, 10.5, 0.9, 0.3) },
  { t: L[5] + 0.8, ...at(10, 3.0, 16, 0.4, -0.2) }, { t: L[7], ...at(10, 3.0, 16, 0.4, -0.2) }, { t: L[7] + 1.0, ...at(5, 1.8, 12, -1.8, 0.3) },
  { t: L[8] + 0.8, ...at(7, 1.8, 11, -0.6, 0.4) }, { t: L[9] + 0.6, ...HOME }, { t: D, ...HOME },
];
const TOPZ: [number, number] = [540, 330];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "WHAT ACTUALLY" }], [{ t: "HAPPENS WHEN YOU", c: "#ff4f8b" }], [{ t: "SHIFT GEAR? ⚙️" }]];
const LABELS: LabelDef[] = [
  Lb(0, L[1], "#ff4f8b", HOOK, true),
  Lb(L[1], L[2], "#c8cdf0", [[{ t: "ENGINE → CLUTCH →" }], [{ t: "GEARBOX →", c: "#ffd23f" }], [{ t: "WHEELS" }]]),
  Lb(L[2], L[3], "#6ee6cf", [[{ t: "ALL GEARS SPIN" }], [{ t: "ALL THE TIME,", c: "#6ee6cf" }], [{ t: "BUT LOOSE ⚙️" }]]),
  Lb(L[3], L[4], "#ffffff", [[{ t: "THE STICK SLIDES" }], [{ t: "A COLLAR THAT", c: "#bfe6ff" }], [{ t: "LOCKS ONE GEAR" }]]),
  Lb(L[4], L[5], "#4a9aff", [[{ t: "A FRICTION CONE" }], [{ t: "MATCHES SPEEDS", c: "#4a9aff" }], [{ t: "FIRST → NO GRIND" }]]),
  Lb(L[5], L[6], "#ff4f8b", [[{ t: "1ST: SMALL DRIVES" }], [{ t: "BIG = 3.5X", c: "#ff4f8b" }], [{ t: "THE PUSH 💪" }]]),
  Lb(L[6], L[7], "#ffd23f", [[{ t: "TOP GEAR: BIG" }], [{ t: "DRIVES SMALL", c: "#ffd23f" }], [{ t: "→ CRUISE SPEED" }]]),
  Lb(L[7], L[8], "#b48cff", [[{ t: "THE CLUTCH UNPLUGS" }], [{ t: "THE ENGINE WHILE", c: "#b48cff" }], [{ t: "YOU SWITCH" }]]),
  Lb(L[8], L[9], "#ff3a2a", [[{ t: "THAT GRIND SOUND?" }], [{ t: "THE SYNCHRO", c: "#ff3a2a" }], [{ t: "LOST THE RACE 😬" }]]),
  Lb(L[9], L[10], "#ff3a2a", [[{ t: "FULL SEND 🏁" }], [{ t: "1 → 2 → 3", c: "#ffd23f" }]]),
  Lb(L[10], D + 0.01, "#ff4f8b", HOOK, true),
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const box: React.CSSProperties = { position: "absolute", left: 540, top: 1690, transform: "translate(-50%, -50%)", width: 960, background: "rgba(5,6,15,0.95)", border: "8px solid #ffffff", boxShadow: "8px 8px 0 #000", padding: "18px 24px 14px" };
  if (t >= L[4] && t < L[5]) {
    const sw = gearAt(t), conv = ease((t - sw.at) / 0.55), shaft = 0.6, gear = sw.g ? lerp(0.95, shaft, conv) : 0.95;
    return (<div style={box}>{[{ n: "GEAR", v: gear, c: "#6ee6cf" }, { n: "SHAFT", v: shaft, c: "#ffffff" }].map((r) => (
      <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}><div style={{ ...px, fontSize: 24, width: 160, color: r.c }}>{r.n}</div><div style={{ flex: 1, height: 28, background: "#0a0e24" }}><div style={{ width: `${r.v * 100}%`, height: "100%", background: r.c }} /></div><div style={{ ...px, fontSize: 22, width: 230, textAlign: "right", whiteSpace: "nowrap" }}>{Math.round(r.v * 4000)} RPM</div></div>))}</div>);
  }
  if (t >= L[5] && t < L[7]) {
    const first = t < L[6];
    return (<div style={box}>{[{ n: "PUSH", v: first ? 1 : 0.32, c: "#ff4f8b", txt: first ? "x3.5" : "x1.2" }, { n: "SPEED", v: first ? 0.28 : 0.85, c: "#ffd23f", txt: first ? "SLOW" : "FAST" }].map((r) => (
      <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}><div style={{ ...px, fontSize: 24, width: 160, color: r.c }}>{r.n}</div><div style={{ flex: 1, height: 28, background: "#0a0e24" }}><div style={{ width: `${r.v * 100}%`, height: "100%", background: r.c }} /></div><div style={{ ...px, fontSize: 22, width: 160, textAlign: "right" }}>{r.txt}</div></div>))}</div>);
  }
  return null;
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #000, -4px 0 0 #000, 0 -4px 0 #000" };

export const GearboxVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const cam = camAt(CAM, t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/29-gearbox/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={GB_PALETTE} outline outlineColor="#05060f" dither={0.04} scale={3}>
        <CamSet p={cam.p} l={cam.l} />
        <Stage t={t} map={glow} />
      </PixelArtCanvas>
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ff4f8b" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
      <Hud t={t} />
    </AbsoluteFill>
  );
};
void b;
