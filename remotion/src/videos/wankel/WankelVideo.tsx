/**
 * Video 028 · How the Mazda rotary (Wankel) engine works — slicker look: real 3D parts (extruded epitrochoid housing,
 * Reuleaux-like rotor with internal ring gear, stationary pinion, eccentric shaft, spark plugs, ports), cel/toon shading
 * with outlines through the pixel pipeline at finer pixels (scale 3), dark studio with neon rim lights and a neon ring.
 * Kinematics: housing H(a) = (R sin a + e sin 3a, R cos a + e cos 3a); rotor centre orbits the shaft at e; rotor angle =
 * shaft angle / 3 (ring gear 0.78 : pinion 0.52 → e = 0.26). Each chamber does intake → compression → combustion (at
 * the plugs, right) → exhaust; 3 power pulses per rotor turn = 1 per shaft turn per rotor.
 * Facts: Felix Wankel, first running 1957; RX-7 13B: 2 rotors; apex seals wear, oil is injected on purpose; Mazda 787B
 * (4-rotor) won Le Mans 1991; redline ~9,000 rpm (RX-8).
 * 41.4 s loop, 116 BPM future funk (wankel.json + music.wav from videos/28-wankel/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./wankel.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type P2 = [number, number];
type Sec = { name: string; t0: number; t1: number; r0: number; r1: number };
const D = EV.duration, BEAT = EV.beat;
const LW = (2 * Math.PI) / D;
const FOV = 30;
const SHAFT = EV.shaft as Sec[], IGN = EV.ign as number[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const backOut = (x: number) => { const k = clamp01(x), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const secAt = (t: number) => SHAFT.find((c) => t >= c.t0 && t < c.t1) ?? SHAFT[SHAFT.length - 1];
const sec = (n: string) => SHAFT.find((c) => c.name === n)!;
const revsAt = (t: number) => { const c = secAt(t); return c.r0 + ((Math.min(t, c.t1) - c.t0) / (c.t1 - c.t0)) * (c.r1 - c.r0); };

export const WANKEL_PALETTE = [
  "#05060f", "#0a0e24", "#121a4a", "#1c2a6e", "#2b3f99", "#262b45", "#3a3f5a", "#454b6a", "#5a607a", "#6e7596", "#8c93b3", "#aab1cf",
  "#c8cdf0", "#e0e6ff", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#6ee6cf", "#1fb5a8", "#0f6e6a", "#ff4f8b", "#d94a7a", "#ffb3c9",
  "#7a4dff", "#b48cff", "#5a2a9a", "#ff3a2a", "#8a1414", "#ff8a1f", "#c85a10", "#ffbf6a", "#ffd23f", "#fff08a", "#fff3b0", "#c8a010",
  "#4a2a5a", "#7a4a6a", "#3fcf6a", "#1f8a4a", "#ff8a7a",
];
const BG = "#05060f";
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);

// ================= geometry =================
const R = 1.6, E = 0.26, RING = 0.78, PIN = 0.52, DEPTH = 0.5;
const H = (a: number): P2 => [R * Math.sin(a) + E * Math.sin(3 * a), R * Math.cos(a) + E * Math.cos(3 * a)];
const BULGE = 0.17;
const facePts = (A: P2, B: P2, c: P2, n = 18): P2[] => {
  const m: P2 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], nl = Math.hypot(m[0] - c[0], m[1] - c[1]), nx = (m[0] - c[0]) / nl, ny = (m[1] - c[1]) / nl;
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n, s = BULGE * Math.sin(Math.PI * u); return [lerp(A[0], B[0], u) + nx * s, lerp(A[1], B[1], u) + ny * s] as P2; });
};
const ROTOR_LOCAL: P2[] = (() => { const A = [0, 1, 2].map((i) => [R * Math.sin((2 * Math.PI * i) / 3), R * Math.cos((2 * Math.PI * i) / 3)] as P2); return [0, 1, 2].flatMap((i) => facePts(A[i], A[(i + 1) % 3], [0, 0]).slice(0, -1)); })();
const shapeOf = (pts: P2[]) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const gradTex = (() => { const d = new Uint8Array([60, 60, 60, 255, 150, 150, 150, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1); t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (c: string, emissive = "#000000", ei = 0) => new THREE.MeshToonMaterial({ color: c, gradientMap: gradTex, emissive, emissiveIntensity: ei });
const basic = (c: string, o?: number) => new THREE.MeshBasicMaterial({ color: c, transparent: o !== undefined, opacity: o ?? 1, depthWrite: o === undefined, side: THREE.DoubleSide });
const gearShape = (r: number, teeth: number, inner: boolean, tooth = 0.07) => {
  const pts: P2[] = [];
  for (let i = 0; i < teeth * 4; i++) { const a = (i / (teeth * 4)) * Math.PI * 2, out = (i % 4 === 1 || i % 4 === 2) ? tooth : 0; const rr = inner ? r - out : r + out; pts.push([rr * Math.sin(a), rr * Math.cos(a)]); }
  return pts;
};
/** chamber phase from its centre angle (degrees, clockwise from top; spark plugs at 90 = right) */
const phaseCol = (a: number) => (a < 80 ? "#6ee6cf" : a < 98 ? "#fff08a" : a < 135 ? "#ff8a1f" : a < 180 ? "#c85a10" : a < 270 ? "#6e7596" : "#1fb5a8");

// ================= the engine =================
const Engine: React.FC<{ t: number; map: THREE.Texture; explode: number }> = ({ t, map, explode }) => {
  const mats = useMemo(() => ({
    housing: toon("#454b6a"), housingRim: toon("#6e7596"), plate: toon("#1c2a6e"), rotor: toon("#c8cdf0"), rotorFace: toon("#aab1cf"),
    gold: toon("#ffd23f", "#c8a010", 0.25), steel: toon("#8c93b3"), seal: toon("#ff4f8b", "#ff4f8b", 0.6), plug: toon("#ffffff"), plugHex: toon("#5a607a"),
    intake: toon("#1fb5a8"), exhaust: toon("#c85a10"),
  }), []);
  const geo = useMemo(() => {
    const hole = Array.from({ length: 160 }, (_, i) => H((i / 160) * Math.PI * 2));
    const outer = new THREE.Shape(); const w = 2.05, h = 2.4, r = 0.55;
    outer.moveTo(-w + r, -h); outer.lineTo(w - r, -h); outer.quadraticCurveTo(w, -h, w, -h + r); outer.lineTo(w, h - r); outer.quadraticCurveTo(w, h, w - r, h); outer.lineTo(-w + r, h); outer.quadraticCurveTo(-w, h, -w, h - r); outer.lineTo(-w, -h + r); outer.quadraticCurveTo(-w, -h, -w + r, -h);
    outer.holes.push(new THREE.Path(hole.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y))));
    const housing = new THREE.ExtrudeGeometry(outer, { depth: 0.62, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 24 }); housing.translate(0, 0, -0.31);
    const rs = shapeOf(ROTOR_LOCAL); rs.holes.push(new THREE.Path(gearShape(RING, 18, true).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
    const rotor = new THREE.ExtrudeGeometry(rs, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }); rotor.translate(0, 0, -DEPTH / 2);
    const pinion = new THREE.ExtrudeGeometry(shapeOf(gearShape(PIN, 12, false)), { depth: 0.2, bevelEnabled: false }); pinion.translate(0, 0, 0.12);
    const plate = new THREE.ShapeGeometry(shapeOf(hole));
    return { housing, rotor, pinion, plate };
  }, []);
  const phi = revsAt(t) * Math.PI * 2, rho = phi / 3, P: P2 = [E * Math.sin(phi), E * Math.cos(phi)];
  const apex = (i: number): P2 => { const a = rho + (2 * Math.PI * i) / 3; return [P[0] + R * Math.sin(a), P[1] + R * Math.cos(a)]; };
  const chambers = [0, 1, 2].map((i) => {
    const a0 = rho + (2 * Math.PI * i) / 3, a1 = a0 + (2 * Math.PI) / 3;
    const hp = Array.from({ length: 25 }, (_, j) => H(lerp(a0, a1, j / 24)));
    const fp = facePts(apex(i), apex((i + 1) % 3), P).reverse();
    const ac = ((((a0 + a1) / 2) * 180) / Math.PI) % 360;
    return { g: new THREE.ShapeGeometry(shapeOf([...hp, ...fp])), col: phaseCol(ac), ac };
  });
  const fire = chambers.some((c) => c.ac > 84 && c.ac < 100);
  const ex = explode;
  return (
    <group>
      {/* back side-plate with the ports */}
      <mesh position={[0, 0, -0.34]} material={mats.plate}><boxGeometry args={[4.3, 5.0, 0.06]} /></mesh>
      {chambers.map((c, i) => <mesh key={`ch${i}`} geometry={c.g} position={[0, 0, -0.3]} material={basic(c.col)} />)}
      {fire && <Glow map={map} at={[1.0, 0, 0.1]} size={2.6} color="#ff8a1f" opacity={0.85} />}
      {/* housing (stays) */}
      <mesh geometry={geo.housing} material={mats.housing} position={[0, 0, -ex * 0.4]} />
      {[[-1.75, 2.1], [1.75, 2.1], [-1.75, -2.1], [1.75, -2.1], [-1.9, 0], [1.9, 0.9], [1.9, -0.9]].map((p, i) => <mesh key={`b${i}`} position={[p[0], p[1], 0.33 - ex * 0.4]} rotation={[Math.PI / 2, 0, 0]} material={mats.steel}><cylinderGeometry args={[0.09, 0.09, 0.06, 10]} /></mesh>)}
      {/* spark plugs (right), intake (upper left), exhaust (lower left) */}
      {[78, 102].map((d, i) => { const p = H((d * Math.PI) / 180); return (
        <group key={`sp${i}`} position={[p[0] + 0.25, p[1], -ex * 0.4]} rotation={[0, 0, -Math.PI / 2]}>
          <mesh material={mats.plugHex} position={[0, 0.15, 0]}><cylinderGeometry args={[0.13, 0.13, 0.18, 6]} /></mesh>
          <mesh material={mats.plug} position={[0, 0.42, 0]}><cylinderGeometry args={[0.08, 0.1, 0.38, 12]} /></mesh>
          <mesh material={mats.steel} position={[0, 0.66, 0]}><cylinderGeometry args={[0.035, 0.035, 0.14, 8]} /></mesh>
        </group>); })}
      {fire && [78, 102].map((d, i) => { const p = H((d * Math.PI) / 180); return <Glow key={`spk${i}`} map={map} at={[p[0] - 0.05, p[1], 0.35]} size={0.7} color="#ffffff" opacity={1} />; })}
      <mesh material={mats.intake} position={[-2.35, 1.05, -ex * 0.4]} rotation={[0, 0, Math.PI / 2 - 0.35]}><cylinderGeometry args={[0.24, 0.24, 1.1, 18]} /></mesh>
      <mesh material={mats.exhaust} position={[-2.35, -1.05, -ex * 0.4]} rotation={[0, 0, Math.PI / 2 + 0.35]}><cylinderGeometry args={[0.24, 0.3, 1.1, 18]} /></mesh>
      {/* stationary pinion (on the side plate) */}
      <mesh geometry={geo.pinion} material={mats.steel} position={[0, 0, -0.1 + ex * 0.2]} />
      {/* rotor */}
      <group position={[P[0], P[1], ex * 1.5]} rotation={[0, 0, -rho]}>
        <mesh geometry={geo.rotor} material={mats.rotor} />
        {[0, 1, 2].map((i) => { const a = (2 * Math.PI * i) / 3; return <mesh key={`se${i}`} position={[R * Math.sin(a) * 0.985, R * Math.cos(a) * 0.985, 0]} rotation={[0, 0, -a]} material={mats.seal}><boxGeometry args={[0.07, 0.07, DEPTH + 0.08]} /></mesh>; })}
        {[0, 1, 2].map((i) => { const a = (2 * Math.PI * i) / 3 + Math.PI / 3, rr = 1.02; return <mesh key={`dp${i}`} position={[rr * Math.sin(a), rr * Math.cos(a), DEPTH / 2 + 0.02]} rotation={[0, 0, -a]} material={mats.rotorFace}><boxGeometry args={[0.55, 0.12, 0.02]} /></mesh>; })}
      </group>
      {/* eccentric shaft: main journal + the eccentric lobe that drives the rotor */}
      <group position={[0, 0, ex * 2.6]}>
        <mesh material={mats.gold} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.6]}><cylinderGeometry args={[0.2, 0.2, 2.4, 20]} /></mesh>
        <mesh material={mats.gold} position={[P[0], P[1], 0.32]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.42, 0.42, 0.12, 28]} /></mesh>
        <mesh material={mats.steel} position={[P[0] * 1.6, P[1] * 1.6, 0.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 0.06, 10]} /></mesh>
      </group>
    </group>
  );
};

// ================= stage =================
const Stage: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), s = secAt(t).name;
  const ps = sec("parts"), u = clamp01((t - ps.t0) / (ps.t1 - ps.t0)), explode = s === "parts" ? Math.sin(Math.PI * ease(u)) : 0;
  const ringCol = s === "lemans" ? "#3fcf6a" : s === "revup" ? "#ff3a2a" : "#ff4f8b";
  return (
    <group>
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 6]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-4, 1, 3]} intensity={18} distance={12} color="#4a9aff" />
      <pointLight position={[4, -1, 3]} intensity={18} distance={12} color="#ff4f8b" />
      {/* neon ring + grid floor + dust */}
      <mesh position={[0, -0.2, -2.2]}><torusGeometry args={[3.1 + 0.06 * k, 0.06, 8, 96]} /><meshBasicMaterial color={ringCol} /></mesh>
      <mesh position={[0, -0.2, -2.3]}><torusGeometry args={[3.55, 0.03, 8, 96]} /><meshBasicMaterial color="#4a9aff" /></mesh>
      <Glow map={map} at={[0, -0.2, -2.6]} size={9} color={ringCol} opacity={0.18 + 0.12 * k} />
      {Array.from({ length: 13 }, (_, i) => <mesh key={`gx${i}`} position={[-6 + i, -3.2, -1]}><boxGeometry args={[0.02, 0.02, 8]} /><meshBasicMaterial color="#2b3f99" /></mesh>)}
      {Array.from({ length: 8 }, (_, i) => { const z = -5 + ((i + (t * 0.8) % 1) % 8); return <mesh key={`gz${i}`} position={[0, -3.2, z]}><boxGeometry args={[12, 0.02, 0.02]} /><meshBasicMaterial color="#2b3f99" /></mesh>; })}
      {Array.from({ length: 24 }, (_, i) => <mesh key={`d${i}`} position={[(rnd(i + 1) - 0.5) * 9, (rnd(i + 2) - 0.5) * 9 + 0.2 * Math.sin(3 * LW * t + i), -3 - rnd(i + 3) * 3]}><sphereGeometry args={[0.025, 4, 3]} /><meshBasicMaterial color={i % 3 ? "#bfe6ff" : "#ffb3c9"} /></mesh>)}
      <group position={[0, -0.25, 0]} rotation={[0, 0, 0]} scale={1 + 0.012 * k}><Engine t={t} map={map} explode={explode} /></group>
    </group>
  );
};

// ================= camera, tags, labels =================
type Tag = { txt: string; at: V3; from: number; to: number; col: string };
const PS = sec("parts"), CY = sec("cycle"), TH = sec("three"), GE = sec("gears"), CA = sec("catch"), LM = sec("lemans"), RU = sec("revup"), H2 = sec("hook2");
const TAGS: Tag[] = [
  { txt: "HOUSING", at: [-1.6, 2.35, 0], from: PS.t0 + 0.6, to: PS.t1 - 0.4, col: "#8c93b3" },
  { txt: "ROTOR", at: [0.6, 1.4, 1.5], from: PS.t0 + 0.9, to: PS.t1 - 0.4, col: "#c8cdf0" },
  { txt: "ECCENTRIC SHAFT", at: [0, 0.5, 3.0], from: PS.t0 + 1.2, to: PS.t1 - 0.4, col: "#ffd23f" },
  { txt: "INTAKE", at: [-1.15, 1.5, 0.4], from: CY.t0 + 0.4, to: CY.t1, col: "#1fb5a8" },
  { txt: "SQUEEZE", at: [1.15, 1.6, 0.4], from: CY.t0 + 1.0, to: CY.t1, col: "#6ee6cf" },
  { txt: "BANG", at: [1.6, -0.15, 0.4], from: CY.t0 + 1.6, to: CY.t1, col: "#ff8a1f" },
  { txt: "EXHAUST", at: [-1.1, -1.75, 0.4], from: CY.t0 + 2.2, to: CY.t1, col: "#8c93b3" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project([g.at[0], g.at[1] - 0.25, g.at[2]], cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: Math.max(150, Math.min(930, x)), top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 24, color: "#ffffff", background: "rgba(5,6,15,0.9)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #000", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [1.9, 0.7, 19.5] as V3, l: [0, -0.6, 0] as V3 };
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: PS.t0, ...HOME },
  { t: PS.t0 + 1.4, p: [10.5, 3.2, 15.5], l: [0, -0.4, 1.2] }, { t: PS.t1 - 1.0, p: [10.0, 2.8, 16.0], l: [0, -0.4, 1.0] },
  { t: CY.t0 + 0.6, p: [0.4, 0.1, 18], l: [0, -0.6, 0] }, { t: CY.t1 - 0.4, p: [0.4, 0.1, 17.5], l: [0, -0.6, 0] },
  { t: GE.t0 + 0.8, p: [0.2, -0.3, 9.5], l: [0, -0.4, 0] }, { t: GE.t1 - 0.6, p: [0.3, -0.3, 10], l: [0, -0.4, 0] },
  { t: CA.t0 + 0.8, ...HOME }, { t: RU.t0, ...HOME }, { t: RU.t1 - 0.6, p: [-1.6, 0.5, 17], l: [0, -0.6, 0] },
  { t: H2.t0 + 0.9, ...HOME }, { t: D, ...HOME },
];
const TOPZ: [number, number] = [540, 330];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "NO PISTONS." }], [{ t: "JUST A SPINNING", c: "#ff4f8b" }], [{ t: "TRIANGLE 🔺" }]];
const mid = (s: Sec) => (s.t0 + s.t1) / 2;
const LABELS: LabelDef[] = [
  Lb(0, PS.t0, "#ff4f8b", HOOK, true),
  Lb(PS.t0, CY.t0, "#ffd23f", [[{ t: "NO VALVES, NO RODS." }], [{ t: "JUST A ROTOR", c: "#c8cdf0" }], [{ t: "+ A SHAFT", c: "#ffd23f" }]]),
  Lb(CY.t0, mid(CY), "#6ee6cf", [[{ t: "THE TRIANGLE MAKES" }], [{ t: "3 CHAMBERS", c: "#6ee6cf" }], [{ t: "GROW & SHRINK" }]]),
  Lb(mid(CY), CY.t1, "#ff8a1f", [[{ t: "EACH ONE SUCKS," }], [{ t: "SQUEEZES, BANGS", c: "#ff8a1f" }], [{ t: "& BLOWS, NONSTOP" }]]),
  Lb(TH.t0, TH.t1, "#ff8a1f", [[{ t: "3 BANGS EVERY" }], [{ t: "TURN OF THE", c: "#ff8a1f" }], [{ t: "TRIANGLE 💥" }]]),
  Lb(GE.t0, GE.t1, "#ffd23f", [[{ t: "THE SHAFT SPINS" }], [{ t: "3X FASTER", c: "#ffd23f" }], [{ t: "THAN THE ROTOR" }]]),
  Lb(CA.t0, CA.t1, "#ff4f8b", [[{ t: "THE CATCH: THE TIP" }], [{ t: "SEALS WEAR &", c: "#ff4f8b" }], [{ t: "IT BURNS OIL" }]]),
  Lb(LM.t0, LM.t1, "#3fcf6a", [[{ t: "1991: A 4-ROTOR" }], [{ t: "MAZDA WON", c: "#3fcf6a" }], [{ t: "LE MANS 🏁" }]]),
  Lb(RU.t0, H2.t0, "#ff3a2a", [[{ t: "AND IT REVS TO" }], [{ t: "9,000 RPM", c: "#ff3a2a" }], [{ t: "LISTEN 🔊" }]]),
  Lb(H2.t0, D + 0.01, "#ff4f8b", HOOK, true),
];
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #000, -4px 0 0 #000, 0 -4px 0 #000" };

export const WankelVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const cam = camAt(CAM, t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/28-wankel/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={WANKEL_PALETTE} outline outlineColor="#05060f" dither={0.04} scale={3}>
        <CamSet p={cam.p} l={cam.l} />
        <Stage t={t} map={glow} />
      </PixelArtCanvas>
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ff4f8b" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
void IGN;
