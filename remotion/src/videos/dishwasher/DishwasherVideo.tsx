/**
 * Video 040 · How does a dishwasher work? — the @engineeredwithin1 toothbrush format, in the CelPixel look
 * (360x640 cel-shaded 3D with navy outlines, pixel-drawn HUD/banners/tags).
 * Hook: a kitchen, the dishwasher running, x-ray window in its door. Steps: ① the spray arm has no motor, the angled
 * jets push it round · ② the same water is pumped round and round through a filter · ③ a heater + enzymes eat the gunk
 * · ④ rinse aid makes the water run off in a sheet (no spots). ~13 L a load vs ~100 L by hand.
 * 33.6 s loop, 100 BPM city pop (dishwasher.json + music.wav from videos/40-dishwasher/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import EV from "./dishwasher.json";
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
const LW = (2 * Math.PI) / D;
const FOV = 30;
const L = EV.l as number[], SPEED = EV.speed as Seg[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const backOut = (x: number) => { const k = clamp01(x), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;
const slowAt = (t: number) => { const s = SPEED.find(([a, c]) => t >= a && t < c) ?? SPEED[SPEED.length - 1]; const u = clamp01((t - s[0]) / (s[1] - s[0])); return s[2] * Math.pow(s[3] / s[2], u); };
// arm angle: real speed = 1 turn per beat (visual), integrated so slow-downs are smooth; whole turns over the loop
const ARM = (() => { const N = 6000, dt = D / N; let a = 0; const arr = [0]; for (let i = 0; i < N; i++) { a += (1 / BEAT) / slowAt(i * dt) * dt; arr.push(a); } const k = Math.round(a) / a; return { arr: arr.map((x) => x * k), dt }; })();
const armA = (t: number) => 2 * Math.PI * ARM.arr[Math.min(ARM.arr.length - 1, Math.round(t / ARM.dt))];
const sim = (t: number) => ARM.arr[Math.min(ARM.arr.length - 1, Math.round(t / ARM.dt))] * BEAT;   // "machine time" (slowed)

// ================= materials =================
const C = {
  steel: toon("#c4cee4"), steelD: toon("#8f9ab8"), door: toon("#dfe4ef"), dark: toon("#2a2f4a"), counter: toon("#e8b57a"), cab: toon("#f3ead8"), handle: toon("#9aa3bd"),
  tile: toon("#9fd3cf"), floor: toon("#e7d9c3"), plate: toon("#fbfbfd"), rim: toon("#7bc4ea"), sauce: toon("#e2443a"), sauceD: toon("#b02a2a"), rack: toon("#5a6488"),
  arm: toon("#3c4466"), nozzle: toon("#ffd23f"), glass: toon("#a8dcff", { transparent: true, opacity: 0.75 }), mug: toon("#ffb03b"), water: toon("#5ec8ff", { transparent: true, opacity: 0.75 }),
  drop: toon("#7fd6ff"), heater: toon("#ff6a2a", { emissive: "#ff3a00", ei: 0.0 }), pump: toon("#7b5cff"), filter: toon("#ffffff"), crumb: toon("#9a6a3a"), enzyme: toon("#5ef08a"),
  led: toon("#5ef08a", { emissive: "#5ef08a", ei: 1 }), sheet: toon("#7fd6ff", { transparent: true, opacity: 0.45 }), floorT: toon("#c4cee4", { transparent: true, opacity: 0.25 }),
};
const FLOOR_Y = 1.0, TOP_Y = 8.6;

// ================= kitchen + dishwasher shell =================
const Kitchen: React.FC = () => {
  const handle = useMemo(() => new RoundedBoxGeometry(1.6, 0.18, 0.18, 2, 0.08), []);
  return (
    <group>
      <mesh material={C.floor} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 40]} /></mesh>
      <mesh material={C.tile} position={[0, 12, -4.2]}><planeGeometry args={[60, 24]} /></mesh>
      {Array.from({ length: 14 }, (_, i) => <mesh key={`tl${i}`} material={C.steelD} position={[-21 + i * 3.2, 12, -4.15]}><boxGeometry args={[0.06, 24, 0.02]} /></mesh>)}
      {Array.from({ length: 8 }, (_, i) => <mesh key={`th${i}`} material={C.steelD} position={[0, 9.6 + i * 1.6, -4.15]}><boxGeometry args={[60, 0.06, 0.02]} /></mesh>)}
      <mesh material={C.counter} position={[0, 9.2, -0.5]}><boxGeometry args={[30, 0.5, 7.6]} /></mesh>
      {[-1, 1].map((s) => <group key={s}>
        <mesh material={C.cab} position={[s * 7.3, 4.5, -0.6]}><boxGeometry args={[7.4, 8.4, 7]} /></mesh>
        <mesh material={C.cab} position={[s * 5.45, 4.6, 2.95]}><boxGeometry args={[3.5, 8.0, 0.1]} /></mesh>
        <mesh material={C.cab} position={[s * 9.2, 4.6, 2.95]}><boxGeometry args={[3.5, 8.0, 0.1]} /></mesh>
        <mesh geometry={handle} material={C.handle} position={[s * 4.4, 7.4, 3.1]} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={handle} material={C.handle} position={[s * 8.1, 7.4, 3.1]} rotation={[0, 0, Math.PI / 2]} />
      </group>)}
      {/* a plant + a jar on the counter */}
      <mesh material={C.mug} position={[-6, 10.1, 0]}><cylinderGeometry args={[0.6, 0.5, 1.3, 16]} /></mesh>
      {Array.from({ length: 6 }, (_, i) => <mesh key={`lf${i}`} material={toon("#3fa463")} position={[-6 + 0.4 * Math.cos(i), 11.2 + 0.3 * Math.sin(i * 2), 0.4 * Math.sin(i)]} rotation={[0.5 * Math.sin(i), i, 0.5 * Math.cos(i)]} scale={[0.22, 0.7, 0.08]}><sphereGeometry args={[1, 10, 6]} /></mesh>)}
      <mesh material={C.glass} position={[6.5, 10.2, 0.3]}><cylinderGeometry args={[0.55, 0.55, 1.5, 16]} /></mesh>
    </group>
  );
};
const Door: React.FC<{ t: number }> = ({ t }) => {
  const shake = 0.012 * Math.sin(t * 60);
  return (
    <group position={[shake, 0, 0]}>
      {/* frame pieces around the x-ray window */}
      <mesh material={C.door} position={[0, 8.15, 3.2]}><boxGeometry args={[6.8, 0.9, 0.25]} /></mesh>
      <mesh material={C.dark} position={[0, 8.15, 3.34]}><boxGeometry args={[6.4, 0.5, 0.04]} /></mesh>
      {[-2.2, -1.6, -1.0].map((x, i) => <mesh key={i} material={C.steelD} position={[x, 8.15, 3.38]}><boxGeometry args={[0.35, 0.2, 0.05]} /></mesh>)}
      <mesh material={C.led} position={[2.3, 8.15, 3.38]}><boxGeometry args={[0.8, 0.22, 0.05]} /></mesh>
      <mesh material={C.door} position={[0, 0.65, 3.2]}><boxGeometry args={[6.8, 1.3, 0.25]} /></mesh>
      <mesh material={C.door} position={[-3.1, 4.4, 3.2]}><boxGeometry args={[0.6, 6.6, 0.25]} /></mesh>
      <mesh material={C.door} position={[3.1, 4.4, 3.2]}><boxGeometry args={[0.6, 6.6, 0.25]} /></mesh>
    </group>
  );
};
const Tub: React.FC<{ t: number; floorSeeThrough: boolean }> = ({ t, floorSeeThrough }) => (
  <group>
    <mesh material={C.steel} position={[0, (FLOOR_Y + TOP_Y) / 2, -3.0]}><boxGeometry args={[6.2, TOP_Y - FLOOR_Y, 0.1]} /></mesh>
    <mesh material={C.steelD} position={[-3.05, (FLOOR_Y + TOP_Y) / 2, 0]}><boxGeometry args={[0.1, TOP_Y - FLOOR_Y, 6]} /></mesh>
    <mesh material={C.steelD} position={[3.05, (FLOOR_Y + TOP_Y) / 2, 0]}><boxGeometry args={[0.1, TOP_Y - FLOOR_Y, 6]} /></mesh>
    <mesh material={C.steel} position={[0, TOP_Y, 0]}><boxGeometry args={[6.2, 0.1, 6]} /></mesh>
    <mesh material={floorSeeThrough ? C.floorT : C.steel} position={[0, FLOOR_Y, 0]}><boxGeometry args={[6.2, 0.1, 6]} /></mesh>
    {/* sump + filter + pump below the floor */}
    <mesh material={C.filter} position={[0, FLOOR_Y - 0.25, 0]}><cylinderGeometry args={[0.6, 0.6, 0.5, 20, 1, true]} /></mesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} material={C.steelD} position={[0.6 * Math.cos(i * 0.52), FLOOR_Y - 0.25, 0.6 * Math.sin(i * 0.52)]}><boxGeometry args={[0.04, 0.5, 0.04]} /></mesh>)}
    <group position={[0, 0.35, 0]}>
      <mesh material={C.pump}><cylinderGeometry args={[0.55, 0.55, 0.4, 20]} /></mesh>
      <group position={[0, 0.22, 0]} rotation={[0, armA(t) * 3, 0]}>{Array.from({ length: 6 }, (_, i) => <mesh key={i} material={C.nozzle} rotation={[0, (i * Math.PI) / 3, 0]} position={[0.2 * Math.cos((i * Math.PI) / 3), 0, -0.2 * Math.sin((i * Math.PI) / 3)]}><boxGeometry args={[0.36, 0.06, 0.06]} /></mesh>)}</group>
    </group>
    <mesh material={C.steelD} position={[0, 1.2, 0]}><cylinderGeometry args={[0.16, 0.16, 0.9, 12]} /></mesh>
    {/* heater loop on the floor */}
    <mesh material={C.heater} position={[0, FLOOR_Y + 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.1, 0.07, 6, 40, Math.PI * 1.6]} /></mesh>
    {/* pipe up the back to the upper arm */}
    <mesh material={C.steelD} position={[0, 3.3, -2.8]}><cylinderGeometry args={[0.14, 0.14, 4.6, 10]} /></mesh>
    <mesh material={C.steelD} position={[0, 5.5, -1.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 2.8, 10]} /></mesh>
  </group>
);
const Arm: React.FC<{ y: number; len: number; a: number; jets: boolean; t: number; jetLen: number }> = ({ y, len, a, jets, t, jetLen }) => {
  const nz = [-0.9, -0.55, -0.2, 0.25, 0.6, 0.95];
  return (
    <group position={[0, y, 0]} rotation={[0, a, 0]}>
      <mesh material={C.arm}><boxGeometry args={[len, 0.16, 0.42]} /></mesh>
      <mesh material={C.arm}><cylinderGeometry args={[0.3, 0.3, 0.22, 16]} /></mesh>
      {nz.map((u, i) => { const x = (u * len) / 2; return (
        <group key={i} position={[x, 0.1, 0]}>
          <mesh material={C.nozzle}><cylinderGeometry args={[0.06, 0.06, 0.08, 8]} /></mesh>
          {jets && <group rotation={[0, 0, -Math.sign(x) * 0.12]}>
            <mesh material={C.water} position={[0, jetLen / 2, 0.06 * Math.sign(x)]} rotation={[0.18 * Math.sign(x), 0, 0]}><cylinderGeometry args={[0.035, 0.06, jetLen, 6]} /></mesh>
            {[0, 1, 2].map((k) => { const u2 = ((t * 1.6 + k / 3 + i * 0.13) % 1); return <mesh key={k} material={C.drop} position={[0, u2 * jetLen, 0.06 * Math.sign(x) + u2 * jetLen * 0.18 * Math.sign(x)]}><sphereGeometry args={[0.07, 6, 4]} /></mesh>; })}
          </group>}
        </group>); })}
      {/* the tip jets point sideways: that's what pushes the arm round */}
      {[-1, 1].map((s) => <group key={s} position={[(s * len) / 2, 0, 0]}>
        <mesh material={C.nozzle} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -s * 0.2]}><cylinderGeometry args={[0.07, 0.07, 0.1, 8]} /></mesh>
        {jets && <mesh material={C.water} position={[0, 0, -s * 0.9]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.11, 1.3, 6]} /></mesh>}
      </group>)}
    </group>
  );
};
// plates: 2 columns × 4 rows, facing the door; the front two carry sauce that dissolves in ③
const PLATES = [-1.45, 1.45].flatMap((x) => [1.9, 1.3, 0.7].map((z, j) => ({ x, z, j })));
const sauceK = (t: number) => (t < L[4] + 0.8 ? 1 : t < L[5] - 0.4 ? 1 - ease((t - L[4] - 0.8) / (L[5] - L[4] - 1.6)) : t < L[6] - 0.5 ? 0 : ease((t - L[6] + 0.5) / 0.5));
const Racks: React.FC<{ t: number }> = ({ t }) => {
  const sk = sauceK(t), chew = t >= L[4] + 0.6 && t < L[5];
  const lowerOff = t >= L[2] - 0.1 && t < L[3];
  return (
    <group>
      {!lowerOff && <group>
      {/* lower rack wires */}
      {Array.from({ length: 7 }, (_, i) => <mesh key={`rx${i}`} material={C.rack} position={[-2.7 + i * 0.9, 2.05, 0]}><boxGeometry args={[0.05, 0.05, 5.6]} /></mesh>)}
      {Array.from({ length: 7 }, (_, i) => <mesh key={`rz${i}`} material={C.rack} position={[0, 2.05, -2.7 + i * 0.9]}><boxGeometry args={[5.6, 0.05, 0.05]} /></mesh>)}
      {PLATES.map(({ x, z, j }, i) => (
        <group key={i} position={[x, 3.1, z]}>
          <mesh material={C.plate} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.0, 1.0, 0.08, 28]} /></mesh>
          <mesh material={C.rim} position={[0, 0, 0.045]}><ringGeometry args={[0.82, 0.9, 28]} /></mesh>
          {j === 0 && sk > 0.02 && <group position={[0.1, -0.1, 0.06]} scale={sk}>
            <mesh material={C.sauce} scale={[0.5, 0.35, 0.05]}><sphereGeometry args={[1, 14, 8]} /></mesh>
            <mesh material={C.sauceD} position={[0.25, 0.15, 0.02]} scale={[0.18, 0.12, 0.04]}><sphereGeometry args={[1, 10, 6]} /></mesh>
            <mesh material={C.sauce} position={[-0.45, -0.25, 0]} scale={[0.15, 0.1, 0.04]}><sphereGeometry args={[1, 8, 6]} /></mesh>
          </group>}
          {j === 0 && chew && Array.from({ length: 5 }, (_, k) => { const a = k * 1.25 + t * 0.6, r = 0.55 * Math.max(0.3, sk); return (
            <group key={k} position={[0.1 + r * Math.cos(a), -0.1 + r * 0.7 * Math.sin(a), 0.14]} rotation={[0, 0, a + Math.PI]} scale={0.09 * (1 + 0.15 * Math.sin(t * 20 + k))}>
              <mesh material={C.enzyme}><sphereGeometry args={[1, 10, 6, 0.6 + 0.4 * Math.abs(Math.sin(t * 14 + k)), Math.PI * 2 - 1.2]} /></mesh>
            </group>); })}
        </group>))}
      </group>}
      {/* upper rack: glasses upside down + mugs */}
      {Array.from({ length: 7 }, (_, i) => <mesh key={`ux${i}`} material={C.rack} position={[-2.7 + i * 0.9, 5.75, 0]}><boxGeometry args={[0.05, 0.05, 5.6]} /></mesh>)}
      {[[-1.9, 1.2], [-0.6, 1.2], [0.7, 1.2], [1.9, 1.2], [-1.3, -0.4], [1.3, -0.4]].map(([x, z], i) => (
        <group key={`g${i}`} position={[x, 6.55, z]}>
          {i < 4 ? <mesh material={C.glass}><cylinderGeometry args={[0.42, 0.34, 1.5, 16, 1, true]} /></mesh> : <mesh material={C.mug}><cylinderGeometry args={[0.45, 0.45, 1.1, 16]} /></mesh>}
        </group>))}
    </group>
  );
};
// ④ the glass close-up: droplets that bead up → rinse aid → they merge into a sheet that slides off
const GLASS: V3 = [0.7, 6.55, 1.2];
const BEADS = Array.from({ length: 16 }, (_, i) => ({ a: (i * 0.37) % 1.3 - 0.65, y: -0.6 + ((i * 37) % 11) / 11 * 1.2, s: 0.035 + ((i * 13) % 5) * 0.008 }));
const RinseDemo: React.FC<{ t: number }> = ({ t }) => {
  if (t < L[5] - 0.3 || t >= L[6]) return null;
  const mid = (L[5] + L[6]) / 2, k = clamp01((t - mid) / 0.6), slide = clamp01((t - mid - 0.4) / 1.4);
  return (
    <group position={GLASS}>
      {k < 1 && BEADS.map((b, i) => <mesh key={i} material={C.drop} position={[0.43 * Math.sin(b.a), b.y, 0.43 * Math.cos(b.a)]} scale={b.s * (1 - k) / 0.06}><sphereGeometry args={[0.06, 8, 6]} /></mesh>)}
      {k > 0 && slide < 1 && <mesh material={C.sheet} position={[0, -slide * 1.6, 0]} scale={[1, 1 - slide * 0.7, 1]}><cylinderGeometry args={[0.45, 0.37, 1.4, 16, 1, true]} /></mesh>}
    </group>
  );
};
// ② the water loop: drips off the plates → sump → filter (food bits stay) → pump → up to the arm
const LOOP: V3[] = [[-1.45, 2.4, 1.6], [-1.3, 1.1, 1.0], [-0.3, 1.05, 0.3], [0, 0.7, 0], [0, 0.4, 0], [0.4, 0.45, 0.2], [0, 1.2, 0], [0, 1.6, 0], [1.6, 1.7, 0], [1.8, 2.8, 0.4]];
const along = (pts: V3[], u: number): V3 => { const f = clamp01(u) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), q = f - i; return [lerp(pts[i][0], pts[i + 1][0], q), lerp(pts[i][1], pts[i + 1][1], q), lerp(pts[i][2], pts[i + 1][2], q)]; };
const WaterLoop: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {Array.from({ length: 26 }, (_, k) => { const u = ((sim(t) * 0.22 + k / 26) % 1); const p = along(LOOP, u); return <mesh key={k} material={C.drop} position={p}><sphereGeometry args={[0.09, 6, 4]} /></mesh>; })}
    {Array.from({ length: 9 }, (_, k) => <mesh key={`c${k}`} material={C.crumb} position={[0.62 * Math.cos(k * 0.7 + 0.3), FLOOR_Y - 0.1 - (k % 3) * 0.12, 0.62 * Math.sin(k * 0.7 + 0.3)]}><boxGeometry args={[0.1, 0.08, 0.1]} /></mesh>)}
  </group>
);

// ================= camera =================
const HOOK = { p: [5.0, 7.4, 26.0] as V3, l: [0, 5.6, 0] as V3 };
const CAM: CamKey[] = [
  { t: 0, ...HOOK }, { t: L[1], ...HOOK },
  { t: L[2], p: [1.6, 7.6, 10.0], l: [0, 1.4, 0] }, { t: L[3] - 0.2, p: [-1.6, 7.8, 9.8], l: [0, 1.4, 0] },
  { t: L[3] + 0.7, p: [3.0, 3.4, 6.0], l: [0, 0.8, 0] }, { t: L[4] - 0.2, p: [3.2, 3.3, 6.2], l: [0, 0.8, 0] },
  { t: L[4] + 0.7, p: [0.2, 4.2, 7.4], l: [-1.3, 2.7, 1.9] }, { t: L[5] - 0.2, p: [0.3, 4.1, 7.2], l: [-1.3, 2.7, 1.9] },
  { t: L[5] + 0.7, p: [GLASS[0] + 0.8, GLASS[1] + 0.5, GLASS[2] + 4.2], l: [GLASS[0], GLASS[1] - 0.2, GLASS[2]] }, { t: L[6] - 0.6, p: [GLASS[0] + 0.6, GLASS[1] + 0.5, GLASS[2] + 4.1], l: [GLASS[0], GLASS[1] - 0.2, GLASS[2]] },
  { t: L[6] + 0.4, ...HOOK }, { t: D, ...HOOK },
];
const camFor = (t: number) => camAt(CAM, t) as { p: V3; l: V3 };
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

// ================= pixel UI =================
const INK = "#141833", CREAM = "#fff6e0", RED = "#e2384d", BLUE = "#3aa8e8", GREEN = "#5ef08a";
type Banner = { from: number; to: number; n?: number; a: string; key: string; b: string; sub?: string; hold?: boolean };
const HB = { a: "HOW DOES A ", key: "DISHWASHER", b: " WORK?", sub: "~13 L A LOAD. BY HAND: ~100 L", hold: true };
const BANNERS: Banner[] = [
  { from: 0, to: L[1], ...HB },
  { from: L[2], to: L[3], n: 1, a: "WHAT ", key: "SPINS", b: " THE ARM?", sub: "NO MOTOR: ITS OWN JETS PUSH IT ROUND" },
  { from: L[3], to: L[4], n: 2, a: "WHERE'S THE ", key: "WATER", b: " FROM?", sub: "THE SAME WATER, FILTERED + PUMPED AGAIN" },
  { from: L[4], to: L[5], n: 3, a: "WHAT EATS THE ", key: "GUNK", b: "?", sub: "HOT WATER + ENZYMES THAT CHEW FOOD" },
  { from: L[5], to: L[6], n: 4, a: "WHY NO ", key: "SPOTS", b: "?", sub: "RINSE AID: WATER SLIDES OFF IN A SHEET" },
  { from: L[6], to: D + 0.01, ...HB },
];
type Tag = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; dx: number; dy: number; col: string };
const TAGS: Tag[] = [
  { txt: "SPRAY ARM", at: [0, 1.75, 0], from: L[2] + 0.6, to: L[3], dx: 40, dy: 50, col: "#ffd23f" },
  { txt: "SIDE JETS", at: (t) => { const a = armA(t); return [-2.6 * Math.cos(a), 1.65, 2.6 * Math.sin(a)]; }, from: L[2] + 1.4, to: L[3], dx: -10, dy: -80, col: BLUE },
  { txt: "FILTER", at: [0.55, FLOOR_Y - 0.2, 0.3], from: L[3] + 0.8, to: L[4], dx: 60, dy: -60, col: "#ffffff" },
  { txt: "PUMP", at: [0, 0.35, 0.5], from: L[3] + 1.4, to: L[4], dx: -60, dy: 50, col: "#7b5cff" },
  { txt: "ENZYMES", at: [-0.9, 3.4, 2.1], from: L[4] + 0.9, to: L[5], dx: 40, dy: -70, col: GREEN },
  { txt: "HEATER", at: [-1.6, FLOOR_Y + 0.15, 1.3], from: L[4] + 1.5, to: L[5], dx: -20, dy: 60, col: "#ff6a2a" },
  { txt: "BEADS = SPOTS", at: [GLASS[0] + 0.3, GLASS[1] + 0.2, GLASS[2] + 0.4], from: L[5] + 0.7, to: (L[5] + L[6]) / 2, dx: 30, dy: -70, col: BLUE },
  { txt: "SHEET = NO SPOTS", at: [GLASS[0], GLASS[1] - 0.4, GLASS[2] + 0.45], from: (L[5] + L[6]) / 2 + 0.3, to: L[6], dx: 10, dy: 70, col: GREEN },
];
const drawUI = (ctx: Ctx, t: number, cam: { p: V3; l: V3 }) => {
  const s = slowAt(t), real = s < 1.05, slowing = t >= L[1] && t < L[2];
  // ---- top HUD ----
  prect(ctx, 6, 8, 16, 16, RED, INK); ctx.fillStyle = "#ffffff"; ctx.fillRect(12, 12, 4, 2); ctx.fillRect(11, 14, 6, 6); ctx.fillStyle = RED; ctx.fillRect(12, 15, 2, 2);
  prect(ctx, 22, 8, 84, 16, "#ffffff", INK); ptext(ctx, real ? "REAL SPEED" : slowing ? "SLOWING..." : `${Math.round(s)}x SLOWER`, 64, 21, 11, real ? RED : INK, { align: "center" });
  prect(ctx, 112, 10, 112, 12, "#ffffff", INK);
  const heat = t >= L[4] && t < L[5] ? 0.4 + 0.6 * ease((t - L[4]) / 2) : 0.85;
  for (let i = 0; i < 9; i++) prect(ctx, 115 + i * 12, 13, 10, 6, i / 9 < heat ? (i > 6 ? RED : "#ffb03b") : "#c9cbe0");
  prect(ctx, 230, 8, 124, 16, "#ffffff", INK); ptext(ctx, "WATER", 236, 20, 8, INK, { font: "Silk" }); prect(ctx, 274, 10, 78, 12, INK); ptext(ctx, "13 L", 313, 21, 11, GREEN, { align: "center" });
  // ---- banner ----
  const b = BANNERS.find((x) => t >= x.from && t < x.to);
  if (b) {
    const k = b.hold ? 1 : backOut((t - b.from) / 0.3);
    if (k > 0.05) {
      ctx.save(); ctx.translate(180, 52); ctx.scale(k, k); ctx.translate(-180, -52);
      ctx.font = "16px AlfaSlab"; const w = ctx.measureText(b.a + b.key + b.b).width + 36, x0 = Math.round(180 - w / 2);
      prect(ctx, x0 + 3, 41, w, 26, "rgba(0,0,0,0.35)"); prect(ctx, x0, 38, w, 26, CREAM, INK);
      for (let yy = 0; yy < 24; yy++) for (const xx of [x0 + 1, x0 + w - 9]) for (let q = 0; q < 8; q++) { ctx.fillStyle = ((q + yy) >> 2) % 2 ? BLUE : "#ffffff"; ctx.fillRect(xx + q, 39 + yy, 1, 1); }
      let xx = x0 + 14; xx += ptext(ctx, b.a, xx, 58, 16, INK) - 4; xx += ptext(ctx, b.key, xx, 58, 16, RED) - 4; ptext(ctx, b.b, xx, 58, 16, INK);
      if (b.n) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x0, 38, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(x0, 38, 7.5, 0, Math.PI * 2); ctx.fill(); ptext(ctx, String(b.n), x0, 44, 12, "#ffffff", { align: "center" }); }
      if (b.sub) { ctx.font = "8px Silk"; const sw = ctx.measureText(b.sub).width + 12; prect(ctx, Math.round(180 - sw / 2), 70, sw, 13, RED, INK); ptext(ctx, b.sub, 180, 80, 8, "#ffffff", { font: "Silk", align: "center" }); }
      ctx.restore();
    }
  }
  // ---- tags ----
  for (const g of TAGS) {
    if (t < g.from || t >= g.to) continue;
    const [X, Y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV), x = X / 3, y = Y / 3, k = ease((t - g.from) / 0.2);
    if (k < 0.5) continue;
    ctx.font = "11px AlfaSlab"; const w = Math.ceil(ctx.measureText(g.txt).width) + 14;
    const ex = Math.max(w / 2 + 4, Math.min(CW - w / 2 - 4, x + g.dx)), ey = Math.max(95, Math.min(600, y + g.dy));
    pline(ctx, x, y, ex, ey, "#ffffff"); prect(ctx, x - 1, y - 1, 3, 3, "#ffffff", INK);
    prect(ctx, ex - w / 2 + 2, ey - 8, w, 17, "rgba(0,0,0,0.35)"); prect(ctx, ex - w / 2, ey - 10, w, 17, CREAM, INK); prect(ctx, ex - w / 2, ey - 10, 5, 17, g.col, INK);
    ptext(ctx, g.txt, ex + 3, ey + 3, 11, INK, { align: "center" });
  }
  // ---- pop words ----
  const inside = t >= L[2] && t < L[6];
  if (!inside) { const ph = (t % (2 * BEAT)) / (2 * BEAT); if (ph < 0.35) ptext(ctx, "PSSHH!", 250 + (Math.floor(t / (2 * BEAT)) % 2) * -150, 300 - ph * 30, 22, "#ffffff", { outline: INK, italic: true }); }
  if (t >= L[2] && t < L[3]) { const ph = (t % BEAT) / BEAT; if (ph < 0.3) ptext(ctx, Math.floor(t / BEAT) % 2 ? "WHOOSH!" : "PUSH!", 70, 470, 18, "#ffffff", { outline: INK, italic: true }); }
  ptext(ctx, "@HOWTOWITHZAY", 6, 632, 8, "#ffffff", { font: "Silk", shadow: INK });
};

export const DishwasherVideo: React.FC = () => {
  const frame = useCurrentFrame(), t = frame / FPS;
  const cam = camFor(t);
  const a = armA(t), jets = true, see = t >= L[3] && t < L[4];
  const heat = t >= L[4] && t < L[5] ? ease((t - L[4]) / 1.2) : 0;
  (C.heater as THREE.MeshToonMaterial).emissiveIntensity = 0.2 + 1.2 * heat;
  return (
    <AbsoluteFill style={{ background: "#9fd3cf" }}>
      <Audio src={staticFile("videos/40-dishwasher/music.wav")} />
      <CelPixelCanvas fov={FOV} bg="#9fd3cf">
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 12, 10]} intensity={1.6} color="#fff4e0" />
        <directionalLight position={[-8, 4, -6]} intensity={0.6} color="#9fc8ff" />
        <pointLight position={[0, 4, 2]} intensity={6 + 10 * heat} distance={9} color={heat > 0 ? "#ffb37a" : "#cfe8ff"} />
        <Kitchen />
        <Door t={t} />
        <Tub t={t} floorSeeThrough={see} />
        <Arm y={1.65} len={5.2} a={a} jets={jets} t={t} jetLen={1.3} />
        <Arm y={5.35} len={4.2} a={-a * 1.1} jets={jets && !(t >= L[5] - 0.3 && t < L[6])} t={t} jetLen={0.8} />
        <Racks t={t} />
        <RinseDemo t={t} />
        {see && <WaterLoop t={t} />}
      </CelPixelCanvas>
      <PixelUI draw={(ctx) => drawUI(ctx, t, cam)} deps={[frame]} />
    </AbsoluteFill>
  );
};
