/**
 * Video 034 · How a microwave heats food — format of 030-033 (real-life hook, HUD pills, notification step cards,
 * pinned callouts, stamps). A microwave running with a bowl of soup → dive into the water molecules (+/− ends) that
 * swing with every field flip → jostling = heat → back out to a cutaway: magnetron, waveguide, standing waves, hot and
 * cold spots on the turning soup, and the 1-2 cm penetration depth (stir it!).
 * 41.1 s loop, 140 BPM future bass (microwave.json + music.wav from videos/34-microwave/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./microwave.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Notif, Callouts, Card, Call, Pill, Stamp, ui } from "../../brand/HowCards";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BEAT = EV.beat;
const LW = (2 * Math.PI) / D;
const FOV = 30;
const L = EV.l as number[], FLIPS = EV.flips as number[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;

export const MW_PALETTE = [
  "#0c0b12", "#17151f", "#24212f", "#34303f", "#4a4558",
  "#e9e3d6", "#c9c0ae", "#8f8676", "#f6f1e6", "#ffffff",
  "#2a3042", "#3e465e", "#58627e", "#8c93b3", "#c8cdf0",
  "#0b1e3a", "#123a6b", "#1e66b0", "#4aa3f0", "#bfe6ff",
  "#7a3f12", "#b5651d", "#e08a3c", "#ffbf6a", "#fff3b0",
  "#c0283a", "#ff4f5f", "#ff8a8a", "#8a1a2a",
  "#ffd23f", "#fff08a", "#ff9a3c", "#3fcf6a", "#1f8a4a", "#b0ffc8",
  "#5a2fd0", "#8a3cff", "#e04a93", "#ff8ac0",
];
const BG = "#17151f";
const std = (c: string, r = 0.5, m = 0, e = "#000000", ei = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, emissive: e, emissiveIntensity: ei });

// ================= story helpers =================
const running = (t: number) => !(t >= EV.ding && t < L[9]);
const plateAng = (t: number) => LW * 3 * t;
const temp = (t: number) => (t < L[4] ? 20 : t < L[5] ? lerp(20, 70, ease((t - L[4]) / (L[5] - L[4]))) : 70);
const nFlips = (t: number) => FLIPS.filter((f) => f <= t).length;
// the standing-wave heat pattern inside the oven (world x/z, ~6 cm = 0.6 units apart here, drawn bigger: 1.2)
const heat = (x: number, z: number) => Math.pow(Math.cos((Math.PI * x) / 1.2) * Math.cos((Math.PI * z) / 1.2), 2);
const HEATC = ["#123a6b", "#1e66b0", "#8a3cff", "#e04a93", "#ff4f5f", "#ff9a3c", "#ffd23f"].map((c) => new THREE.Color(c));
const heatColor = (u: number, out: THREE.Color) => { const k = clamp01(u) * (HEATC.length - 1), i = Math.min(HEATC.length - 2, Math.floor(k)); return out.copy(HEATC[i]).lerp(HEATC[i + 1], k - i); };

// ================= the oven =================
const TILES = (() => { const a: [number, number][] = []; for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) { const x = i * 0.105, z = j * 0.105; if (x * x + z * z < 0.72 * 0.72) a.push([x, z]); } return a; })();
const Soup: React.FC<{ t: number; heatMap: number; cut: number }> = ({ t, heatMap, cut }) => {
  const ang = plateAng(t);
  const inst = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.02, 0.1), new THREE.MeshBasicMaterial(), TILES.length); return m; }, []);
  const c = new THREE.Color(), base = new THREE.Color("#e08a3c"), mtx = new THREE.Matrix4();
  TILES.forEach(([x, z], i) => {
    const wx = x * Math.cos(ang) + z * Math.sin(ang), wz = -x * Math.sin(ang) + z * Math.cos(ang);
    heatColor(heat(wx, wz + 0.3), c); c.lerpColors(base, c, heatMap);
    mtx.makeTranslation(x, 0, z); inst.setMatrixAt(i, mtx); inst.setColorAt(i, c);
  });
  inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  const core = new THREE.Color("#1e66b0").lerp(new THREE.Color("#e04a93"), clamp01((t - L[7] - 1.5) / 3.5));
  return (
    <group rotation={[0, ang, 0]}>
      <mesh position={[0, -1.32, 0]}><cylinderGeometry args={[1.8, 1.8, 0.06, 40]} /><meshStandardMaterial color="#bfe6ff" transparent opacity={0.75} roughness={0.1} /></mesh>
      {cut < 0.5 ? <group>
        <mesh position={[0, -0.95, 0]}><cylinderGeometry args={[0.9, 0.6, 0.7, 32, 1, true]} /><meshStandardMaterial color="#e9e3d6" roughness={0.4} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.7, 0]}><cylinderGeometry args={[0.8, 0.8, 0.02, 32]} /><meshStandardMaterial color="#e08a3c" roughness={0.3} /></mesh>
        <primitive object={inst} position={[0, -0.68, 0]} />
      </group> : <group rotation={[0, -ang, 0]}>
        {/* the bowl cut in half: hot outer layer, colder core */}
        <mesh position={[0, -0.95, 0]}><cylinderGeometry args={[0.9, 0.6, 0.7, 32, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#e9e3d6" roughness={0.4} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.95, 0]}><cylinderGeometry args={[0.82, 0.55, 0.62, 32, 1, false, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#ff4f5f" emissive="#ff4f5f" emissiveIntensity={0.25} roughness={0.4} /></mesh>
        <mesh position={[0, -0.97, 0.001]}><planeGeometry args={[1.4, 0.56]} /><meshBasicMaterial color="#ff4f5f" /></mesh>
        <mesh position={[0, -1.0, 0.004]}><planeGeometry args={[0.95, 0.4]} /><meshBasicMaterial color={core} /></mesh>
      </group>}
    </group>
  );
};
const Oven: React.FC<{ t: number; map: THREE.Texture; cut: number; waves: number; heatMap: number; bowlCut: number }> = ({ t, map, cut, waves, heatMap, bowlCut }) => {
  const m = useMemo(() => ({ body: std("#e9e3d6", 0.5), inner: std("#c9c0ae", 0.6), dark: std("#24212f", 0.5), glass: new THREE.MeshStandardMaterial({ color: "#24212f", roughness: 0.1, transparent: true, opacity: 0.22, depthWrite: false }),
    copper: std("#b5651d", 0.35, 0.8), guide: std("#8c93b3", 0.3, 0.8), panel: std("#34303f", 0.4) }), []);
  const on = running(t), lightI = on ? 1 : 0.15;
  const waveGeo = useMemo(() => [0, 1, 2, 3, 4].map(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(81 * 2 * 3), 3)); const idx: number[] = []; for (let i = 0; i < 80; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx); return g; }), []);
  if (waves > 0) waveGeo.forEach((g, w) => {
    const p = g.attributes.position as THREE.BufferAttribute, z = -1.6 + w * 0.8, y0 = 0.2 + 0.15 * w;
    for (let i = 0; i <= 80; i++) { const x = -2.4 + (4.8 * i) / 80; const y = y0 + 0.35 * Math.sin((Math.PI * x) / 1.2) * Math.cos(t * 9 + w); p.setXYZ(i * 2, x, y - 0.035, z); p.setXYZ(i * 2 + 1, x, y + 0.035, z); }
    p.needsUpdate = true;
  });
  return (
    <group>
      <ambientLight intensity={0.45} color="#fff3b0" />
      <directionalLight position={[-5, 6, 8]} intensity={1.0} color="#ffffff" />
      <pointLight position={[0, 1.2, 0]} intensity={14 * lightI} distance={6} color="#fff08a" />
      <pointLight position={[6, 2, 6]} intensity={14} distance={20} color="#4aa3f0" />
      {/* kitchen counter + wall */}
      <mesh position={[0, -2.25, 0]}><boxGeometry args={[30, 0.5, 10]} /><meshStandardMaterial color="#58627e" roughness={0.6} /></mesh>
      <mesh position={[0, 3, -4]}><planeGeometry args={[40, 16]} /><meshStandardMaterial color="#34303f" roughness={0.9} /></mesh>
      {/* cavity walls */}
      <mesh material={m.inner} position={[0, -1.6, 0]}><boxGeometry args={[5.2, 0.1, 4.6]} /></mesh>
      <mesh material={m.inner} position={[0, 0, -2.3]}><boxGeometry args={[5.2, 3.3, 0.1]} /></mesh>
      <mesh material={m.inner} position={[-2.6, 0, 0]}><boxGeometry args={[0.1, 3.3, 4.6]} /></mesh>
      <mesh material={m.inner} position={[2.6, 0, 0]}><boxGeometry args={[0.1, 3.3, 4.6]} /></mesh>
      {cut < 0.5 && <mesh material={m.inner} position={[0, 1.6, 0]}><boxGeometry args={[5.2, 0.1, 4.6]} /></mesh>}
      {/* outer body */}
      <mesh material={m.body} position={[0.8, -1.85, 0]}><boxGeometry args={[7.4, 0.4, 5.0]} /></mesh>
      <mesh material={m.body} position={[0.8, 0, -2.45]}><boxGeometry args={[7.4, 4.1, 0.2]} /></mesh>
      <mesh material={m.body} position={[-2.85, 0, 0]}><boxGeometry args={[0.3, 4.1, 5.0]} /></mesh>
      {cut < 0.5 && <mesh material={m.body} position={[4.35, 0, 0]}><boxGeometry args={[0.3, 4.1, 5.0]} /></mesh>}
      {cut < 0.5 && <mesh material={m.body} position={[0.8, 1.85, 0]}><boxGeometry args={[7.4, 0.4, 5.0]} /></mesh>}
      {cut < 0.5 && <mesh material={m.panel} position={[3.48, 0, 2.4]}><boxGeometry args={[1.6, 4.1, 0.2]} /></mesh>}
      {cut < 0.5 && <group>
        <mesh material={m.body} position={[0, 1.75, 2.45]}><boxGeometry args={[5.6, 0.6, 0.15]} /></mesh>
        <mesh material={m.body} position={[0, -1.7, 2.45]}><boxGeometry args={[5.6, 0.7, 0.15]} /></mesh>
        <mesh material={m.body} position={[-2.55, 0, 2.45]}><boxGeometry args={[0.5, 4.1, 0.15]} /></mesh>
        <mesh material={m.body} position={[2.35, 0, 2.45]}><boxGeometry args={[0.9, 4.1, 0.15]} /></mesh>
        <mesh material={m.glass} position={[-0.2, 0.05, 2.54]}><planeGeometry args={[4.2, 2.8]} /></mesh>
        <mesh material={m.dark} position={[2.1, 0, 2.6]}><boxGeometry args={[0.18, 2.6, 0.12]} /></mesh>
        <mesh position={[3.48, 1.3, 2.52]}><planeGeometry args={[1.2, 0.5]} /><meshBasicMaterial color="#0c0b12" /></mesh>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[3.18 + (i % 3) * 0.3, 0.5 - Math.floor(i / 3) * 0.32, 2.52]}><planeGeometry args={[0.22, 0.2]} /><meshBasicMaterial color="#8c93b3" /></mesh>)}
        <mesh position={[3.48, -1.2, 2.55]}><cylinderGeometry args={[0.3, 0.3, 0.12, 20]} /><meshStandardMaterial color="#c8cdf0" metalness={0.6} roughness={0.3} /></mesh>
      </group>}
      {/* magnetron + waveguide (in the side compartment) */}
      <group position={[3.5, 0.9, -0.2]}>
        <mesh material={m.copper}><cylinderGeometry args={[0.45, 0.45, 0.9, 20]} /></mesh>
        {[-0.3, -0.1, 0.1, 0.3].map((y, i) => <mesh key={i} material={m.guide} position={[0, y, 0]}><boxGeometry args={[1.25, 0.05, 1.25]} /></mesh>)}
        <mesh material={m.guide} position={[-0.65, 0.35, 0]}><boxGeometry args={[0.9, 0.35, 0.7]} /></mesh>
        {cut > 0.5 && <Glow map={map} at={[0, 0, 0.6]} size={1.8} color="#ff9a3c" opacity={0.6 * waves} />}
      </group>
      <Soup t={t} heatMap={heatMap} cut={bowlCut} />
      {waves > 0 && waveGeo.map((g, i) => <mesh key={i} geometry={g}><meshBasicMaterial color={i % 2 ? "#ff8ac0" : "#ffd23f"} transparent opacity={0.85 * waves} side={THREE.DoubleSide} /></mesh>)}
      {on && cut < 0.5 && <Glow map={map} at={[-0.2, 0.2, 1.8]} size={4} color="#fff08a" opacity={0.25} />}
    </group>
  );
};

// ================= the molecules =================
const MOLS = (() => { const a: { x: number; y: number; z: number; b: number }[] = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 9; j++) a.push({ x: -2.5 + i * 1.0 + (j % 2) * 0.5, y: -4 + j * 1.0, z: (Math.sin(i * 7 + j * 3) * 0.5), b: Math.sin(i * 12.9 + j * 78.2) * 3.14 }); return a; })();
const molAngle = (t: number, b: number, k: number) => {
  if (t < L[3]) return b + 0.15 * Math.sin(t * 2 + k);
  const n = nFlips(t), dir = n % 2 === 0 ? Math.PI / 2 : -Math.PI / 2, prev = n % 2 === 0 ? -Math.PI / 2 : Math.PI / 2;
  const tf = n > 0 ? FLIPS[n - 1] : L[3];
  const startA = n === 0 ? b : prev;
  const target = n === 0 ? Math.PI / 2 : dir;
  const follow = startA + (target - startA) * (1 - Math.exp(-(t - tf) / 0.06));
  const jit = t >= L[4] ? 0.35 * Math.sin(t * 37 + k * 2.3) + 0.25 * Math.sin(t * 23 + k) : 0.08 * Math.sin(t * 11 + k);
  return (t >= L[4] ? (Math.PI / 2) * Math.cos((2 * Math.PI * t) / BEAT) : follow) + jit;
};
const Molecules: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const o = useMemo(() => std("#ff4f5f", 0.35, 0, "#ff4f5f", 0.15), []), h = useMemo(() => std("#ffffff", 0.35, 0, "#bfe6ff", 0.1), []);
  const hot = clamp01((t - L[4]) / (L[5] - L[4]));
  const fieldUp = t >= L[3] && nFlips(t) % 2 === 0, field = t >= L[3];
  const shake = (k: number): V3 => (t >= L[4] ? [0.06 * hot * Math.sin(t * 41 + k), 0.06 * hot * Math.cos(t * 37 + k * 1.3), 0] : [0, 0, 0]);
  return (
    <group>
      <ambientLight intensity={0.5} color="#bfe6ff" />
      <directionalLight position={[-3, 5, 6]} intensity={1.2} color="#fff3b0" />
      <pointLight position={[3, 0, 4]} intensity={12 + 20 * hot} distance={14} color={hot > 0.3 ? "#ff9a3c" : "#4aa3f0"} />
      <mesh position={[0, 0, -4]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color={new THREE.Color("#0b1e3a").lerp(new THREE.Color("#7a3f12"), hot)} roughness={1} /></mesh>
      {MOLS.map((q, k) => { const a = molAngle(t, q.b, k); return (
        <group key={k} position={[q.x + shake(k)[0], q.y + shake(k)[1], q.z]} rotation={[0, 0, a - Math.PI / 2]}>
          <mesh material={o}><sphereGeometry args={[0.32, 18, 14]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} material={h} position={[0.33 * Math.sin(s * 0.912), 0.33 * Math.cos(s * 0.912), 0]}><sphereGeometry args={[0.19, 14, 10]} /></mesh>)}
        </group>); })}
      {/* the field: big arrows on both sides */}
      {field && [-1.45, 1.45].map((x) => <group key={x} scale={0.5} position={[x, 0.2, 1.2]} rotation={[0, 0, fieldUp ? 0 : Math.PI]}>
        <mesh position={[0, -0.6, 0]}><boxGeometry args={[0.14, 2.6, 0.1]} /><meshBasicMaterial color="#ffd23f" /></mesh>
        <mesh position={[0, 1.1, 0]}><coneGeometry args={[0.5, 0.9, 4]} /><meshBasicMaterial color="#ffd23f" /></mesh>
      </group>)}
      {hot > 0.2 && <Glow map={map} at={[0, 0, 0]} size={9} color="#ff9a3c" opacity={0.25 * hot} />}
    </group>
  );
};

// ================= camera, HUD, cards =================
const OVEN_CAM = { p: [7.5, 5.0, 23] as V3, l: [0.8, -0.5, 0] as V3 };
const camOven = (t: number): { p: V3; l: V3 } => {
  if (t >= L[1] && t < L[2]) { const k = ease((t - L[1]) / (L[2] - L[1])) ** 2; const tg: V3 = [0, -0.7, 0]; return { p: [lerp(OVEN_CAM.p[0], tg[0] + 0.3, k), lerp(OVEN_CAM.p[1], tg[1] + 1.0, k), lerp(OVEN_CAM.p[2], tg[2] + 1.0, k)], l: [lerp(OVEN_CAM.l[0], tg[0], k), lerp(OVEN_CAM.l[1], tg[1], k), lerp(OVEN_CAM.l[2], tg[2], k)] }; }
  const a = 0.12 * Math.sin(2 * LW * t); return { p: [OVEN_CAM.p[0] + a, OVEN_CAM.p[1], OVEN_CAM.p[2]], l: OVEN_CAM.l };
};
const MOL_CAM: CamKey[] = [{ t: L[2], p: [0.5, 0.5, 6], l: [0, 0, 0] }, { t: L[2] + 0.8, p: [1.2, 0.3, 12.5], l: [0, -0.3, 0] }, { t: L[4], p: [0.8, 0.2, 12.0], l: [0, -0.3, 0] }, { t: L[5], p: [-0.8, 0.4, 11.5], l: [0, -0.2, 0] }];
const CUT_CAM: CamKey[] = [
  { t: L[5], p: [8.0, 7.5, 14], l: [1.5, -0.2, 0] }, { t: L[6] - 0.3, p: [7.6, 7.2, 13.5], l: [1.5, -0.2, 0] },
  { t: L[6] + 0.8, p: [1.5, 7.5, 6.5], l: [0, -0.9, 0] }, { t: L[7] - 0.3, p: [1.8, 7.2, 6.2], l: [0, -0.9, 0] },
  { t: L[7] + 0.8, p: [0.9, 0.3, 7.0], l: [0, -0.95, 0] }, { t: L[8], p: [0.6, 0.4, 6.8], l: [0, -0.95, 0] },
];
const scene = (t: number) => (t < L[2] || t >= L[8] ? "oven" : t < L[5] ? "mol" : "cut");
const camFor = (t: number): { p: V3; l: V3 } => { const s = scene(t); if (s === "mol") return camAt(MOL_CAM, t) as { p: V3; l: V3 }; if (s === "cut") return camAt(CUT_CAM, t) as { p: V3; l: V3 }; if (t >= L[8] && t < L[8] + 0.6) { const k = ease((t - L[8]) / 0.6); const c0 = camAt(CUT_CAM, L[8] - 0.001); return { p: [lerp(c0.p[0], OVEN_CAM.p[0], k), lerp(c0.p[1], OVEN_CAM.p[1], k), lerp(c0.p[2], OVEN_CAM.p[2], k)], l: [lerp(c0.l[0], OVEN_CAM.l[0], k), lerp(c0.l[1], OVEN_CAM.l[1], k), lerp(c0.l[2], OVEN_CAM.l[2], k)] }; } return camOven(t); };
const HOOKC = { title: "Your microwave flips water 5 billion times a second", sub: "that's how it cooks your food", hold: true };
const CARDS: Card[] = [
  { from: 0, to: L[1], ...HOOKC },
  { from: L[1], to: L[2], title: "Let's zoom into the soup…", sub: "down to the water molecules" },
  { from: L[2], to: L[3], n: 1, title: "Water has a + end and a − end", sub: "like a tiny compass for electricity" },
  { from: L[3], to: L[4], n: 2, title: "The waves flip direction", sub: "4.9 billion times a second; water follows" },
  { from: L[4], to: L[5], n: 3, title: "All that jostling = heat", sub: "the water in your food heats itself" },
  { from: L[5], to: L[6], n: 4, title: "The waves come from a magnetron", sub: "it turns electricity into 2.45 GHz waves" },
  { from: L[6], to: L[7], n: 5, title: "They bounce: hot & cold spots", sub: "~6 cm apart, so the plate turns your food" },
  { from: L[7], to: L[8], n: 6, title: "They only reach 1-2 cm deep", sub: "the middle heats slowly → stir it!" },
  { from: L[8], to: L[9], title: "Ding.", sub: "now you know why the middle is still cold" },
  { from: L[9], to: D + 0.01, ...HOOKC },
];
const CALLS: Call[] = [
  { txt: "SOUP", at: [0, -0.7, 0.4], from: 0.4, to: L[1] - 0.1, dx: -160, dy: 260 },
  { txt: "OXYGEN (−)", at: [MOLS[22].x, MOLS[22].y, MOLS[22].z], from: L[2] + 0.9, to: L[3], dx: -150, dy: -260, color: "#ff4f5f" },
  { txt: "HYDROGEN (+)", at: [MOLS[31].x, MOLS[31].y + 0.3, MOLS[31].z], from: L[2] + 1.4, to: L[3], dx: 150, dy: 280, color: "#bfe6ff" },
  { txt: "ELECTRIC FIELD", at: [1.45, 0.5, 1.2], from: L[3] + 0.4, to: L[4], dx: -200, dy: -330, color: "#ffd23f" },
  { txt: "MAGNETRON", at: [3.5, 1.4, -0.2], from: L[5] + 0.8, to: L[6], dx: -60, dy: -300, color: "#ff9a3c" },
  { txt: "WAVEGUIDE", at: [2.85, 1.25, -0.2], from: L[5] + 1.3, to: L[6], dx: -250, dy: 330 },
  { txt: "HOT SPOT", at: [0, -0.66, 0], from: L[6] + 1.2, to: L[7], dx: -200, dy: -330, color: "#ff4f5f" },
  { txt: "COLD SPOT", at: [0.6, -0.66, 0.6], from: L[6] + 1.6, to: L[7], dx: 200, dy: 330, color: "#4aa3f0" },
  { txt: "HOT EDGE", at: [-0.65, -0.9, 0.05], from: L[7] + 1.0, to: L[8], dx: -150, dy: -330, color: "#ff4f5f" },
  { txt: "COLD MIDDLE", at: [0, -1.0, 0.05], from: L[7] + 1.4, to: L[8], dx: 150, dy: 330, color: "#4aa3f0" },
];
const timerAt = (t: number) => (t < L[2] ? 30 - Math.floor(t) : t >= L[9] ? 30 + Math.ceil(D - t) : t >= EV.ding ? 0 : null);
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const s = scene(t), tm = timerAt(t), slow = s === "mol";
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {tm !== null && s === "oven" ? <Pill bg="rgba(12,11,18,0.92)"><span style={{ color: "#3fcf6a" }}>⏱</span> 0:{String(tm).padStart(2, "0")}</Pill>
        : <Pill bg={temp(t) > 40 ? "#c0283a" : "#1e66b0"}>🌡 {Math.round(temp(t))}°C</Pill>}
      <Pill bg={slow ? "#5a2fd0" : "rgba(12,11,18,0.92)"}>{slow ? "1 BILLION× SLOWER" : "REAL SPEED"}</Pill>
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

export const MicrowaveVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  const flash = [L[2], L[5]].reduce((a, x) => Math.max(a, Math.abs(t - x) < 0.2 ? 1 - Math.abs(t - x) / 0.2 : 0), 0);
  const waves = t >= L[5] && t < L[7] ? clamp01(Math.min((t - L[5] - 0.6) / 0.5, (L[7] - t) / 0.3)) : 0;
  const heatMap = t >= L[6] && t < L[8] + 0.6 ? clamp01((t - L[6] - 0.5) / 0.6) : 0;
  const bowlCut = t >= L[7] && t < L[8] ? 1 : 0;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/34-microwave/music.wav")} />
      <PixelArtCanvas bg={s === "mol" ? "#0b1e3a" : "#24212f"} fov={FOV} palette={MW_PALETTE} outline outlineColor="#0c0b12" dither={0.06} scale={2}>
        <CamSet p={cam.p} l={cam.l} />
        {s === "mol" ? <Molecules t={t} map={glow} /> : <Oven t={t} map={glow} cut={s === "cut" || (t >= L[1] + 0.5 * (L[2] - L[1]) && t < L[2]) ? 1 : 0} waves={waves} heatMap={heatMap} bowlCut={bowlCut} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#fff3b0", opacity: flash }} />
      <Hud t={t} />
      <Notif t={t} cards={CARDS} app="MICROWAVE · HOW IT WORKS" icon="📡" grad="linear-gradient(160deg,#ff9a3c,#c0283a)" />
      <Callouts t={t} cam={cam} fov={FOV} calls={CALLS} />
      <Stamp t={t} at={L[3] + 1.2} dur={L[4] - L[3] - 1.4} color="#5a2fd0" big="4,900,000,000/s" small="flips every second" y={1500} />
      <Stamp t={t} at={L[6] + 2.2} dur={L[7] - L[6] - 2.4} color="#c0283a" big="~6 cm" small="between hot spots" y={1500} />
      <Stamp t={t} at={L[7] + 2.2} dur={L[8] - L[7] - 2.4} color="#1e66b0" big="STIR IT 🥄" y={1500} />
      <Stamp t={t} at={EV.ding} dur={L[9] - EV.ding - 0.2} color="#1f8a4a" big="DING!" y={1500} />
      <div style={{ ...ui, position: "absolute", left: 56, bottom: 60, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 3 }}>@HOWTOWITHZAY</div>
    </AbsoluteFill>
  );
};
