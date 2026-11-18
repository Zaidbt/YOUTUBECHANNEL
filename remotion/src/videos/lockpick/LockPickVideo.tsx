/**
 * Video 032 · How a lock gets picked — format of 030/031 (real-life hook, HUD pills, notification step cards, pinned
 * callouts, stamps). Hook: a front door with a pick and a tension wrench in the keyhole. Then a cutaway of a pin tumbler
 * cylinder: 5 pin stacks (key pin + driver pin + spring) across the shear line; the right key; tension → one pin binds;
 * lift → click (sets) ×5 → it turns; better locks use spool pins that fake a set.
 * 40.9 s loop, 88 BPM boom-bap heist (lockpick.json + music.wav from videos/32-lockpick/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./lockpick.json";
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
const L = EV.l as number[], SETS = EV.sets as number[], ORDER = EV.order as number[], K = EV.key, TURN = EV.turn as number[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;
const ramp = (t: number, a: number, c: number) => ease((t - a) / (c - a));

export const LOCK_PALETTE = [
  "#0c0a10", "#16121c", "#221a2a", "#2f2338", "#3d2f48",
  "#3b2418", "#5a3520", "#7a4a2a", "#9c6436", "#c08350", "#e0a870",
  "#5a3c08", "#8a6010", "#b8861a", "#e0ae2e", "#ffd25a", "#fff0a8",
  "#2a3042", "#3e465e", "#58627e", "#8c93b3", "#c8cdf0", "#eef0ff",
  "#0b1e3a", "#123a6b", "#1e66b0", "#4aa3f0", "#bfe6ff",
  "#1f8a4a", "#3fcf6a", "#b0ffc8", "#8a1a2a", "#c0283a", "#ff4f5f", "#ffb0b8",
  "#ff9a3c", "#ffffff", "#e9e3d6", "#6b1d4a", "#e04a93",
];
const BG = "#0c0a10";
const std = (c: string, r = 0.5, m = 0, e = "#000000", ei = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, emissive: e, emissiveIntensity: ei });

// ================= the cylinder geometry =================
const R = 1.1, X0 = -3.2, X1 = 3.2, REST = -0.35, DRV = 0.9, TOP = 3.45;
const PX = [-2.2, -1.1, 0, 1.1, 2.2];
const KL = [1.2, 0.95, 1.4, 1.05, 1.3];                       // key pin lengths
const H = KL.map((k) => R - k);                               // where the right key must lift each key pin's bottom
const keyTop = (x: number) => { if (x < -3.0 || x > 3.4) return -9; let m = -0.05; for (let i = 0; i < 5; i++) m = Math.min(m, H[i] + Math.max(0, Math.abs(x - PX[i]) - 0.1) * 1.1); return x < -2.6 ? Math.min(m, -0.72 + (x + 3.0) * 1.6) : m; };
const keyGeo = (() => {
  const s = new THREE.Shape(); s.moveTo(-3.0, -0.72);
  for (let i = 0; i <= 160; i++) { const x = -3.0 + (6.4 * i) / 160; s.lineTo(x, Math.max(-0.72, keyTop(x))); }
  s.lineTo(3.6, -0.05); s.lineTo(3.9, 0.7); s.lineTo(5.9, 0.7); s.lineTo(6.2, 0.3); s.lineTo(6.2, -1.3); s.lineTo(5.9, -1.7); s.lineTo(3.9, -1.7); s.lineTo(3.6, -0.72); s.lineTo(-3.0, -0.72);
  const hole = new THREE.Path(); hole.moveTo(5.2, -0.7); hole.lineTo(5.6, -0.7); hole.lineTo(5.6, -0.3); hole.lineTo(5.2, -0.3); hole.lineTo(5.2, -0.7); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: false }); g.translate(0, 0, -0.09); return g;
})();
const springGeo = (() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 81 }, (_, i) => { const u = i / 80, a = u * Math.PI * 2 * 8; return new THREE.Vector3(0.16 * Math.cos(a), u, 0.16 * Math.sin(a)); })), 240, 0.035, 5))();
const spoolGeo = (() => new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.2, 0.18], [0.11, 0.28], [0.11, 0.62], [0.2, 0.72], [0.2, DRV], [0, DRV]].map(([x, y]) => new THREE.Vector2(x, y)), 20))();
const plugGeo = (() => { const g = new THREE.CylinderGeometry(R, R, X1 - X0, 48, 1, true, Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); return g; })();

// ================= the story state =================
const keyX = (t: number) => (t >= K.in0 && t < K.out1 ? (t < K.in1 ? lerp(6.8, 0, ramp(t, K.in0, K.in1)) : t < K.out0 ? 0 : lerp(0, 6.8, ramp(t, K.out0, K.out1))) : 99);
const tension = (t: number) => t >= L[4] + 0.3 * (L[5] - L[4]) && t < L[7] ? 1 : t >= L[7] && t < L[8] ? 1 : 0;
const setTime = (i: number) => SETS[ORDER.indexOf(i)];
const plugRot = (t: number) => {
  if (t >= K.turn0 && t < K.out0) return t < K.back ? 1.0 * ramp(t, K.turn0, K.turn1) : 1.0 * (1 - ramp(t, K.back, K.back + 0.15));
  if (t >= L[2] + 1.6 && t < L[2] + 2.6) { const u = (t - L[2] - 1.6) / 1.0; return 0.06 * Math.abs(Math.sin(u * Math.PI * 3)); }   // tries to turn: blocked
  if (t >= TURN[0] && t < L[7]) return 0.04 + 1.1 * ramp(t, TURN[0], TURN[1]);
  if (t >= EV.spool && t < L[8]) return 0.04 + 0.16 * ramp(t, EV.spool, EV.spool + 0.12);
  return tension(t) ? 0.04 : 0;
};
type Pin = { kb: number; db: number; binding: boolean; set: boolean };
const pinAt = (t: number, i: number): Pin => {
  const kx = keyX(t);
  if (kx < 50) { const kb = Math.max(REST, keyTop(PX[i] - kx)); return { kb, db: kb + KL[i], binding: false, set: false }; }
  if (t >= L[5] && t < L[7]) {
    const st = setTime(i), lift = st - BEAT;
    if (t >= st) { const kb = lerp(H[i] + 0.03, REST, ramp(t, st + 0.05, st + 0.25)); return { kb, db: R + 0.02, binding: false, set: true }; }
    const kb = t >= lift ? lerp(REST, H[i] + 0.03, ramp(t, lift, st)) : REST;
    const prevSet = ORDER.indexOf(i) === 0 ? L[5] - 0.6 : SETS[ORDER.indexOf(i) - 1];
    return { kb, db: kb + KL[i], binding: t >= prevSet && t < st, set: false };
  }
  if (t >= L[4] + 0.3 * (L[5] - L[4]) && t < L[5]) return { kb: REST, db: REST + KL[i], binding: i === ORDER[0], set: false };
  if (t >= L[7] && t < L[8] && i === 2) { const k = ramp(t, EV.spool - BEAT, EV.spool); return { kb: lerp(REST, H[i] + 0.36, k), db: lerp(REST + KL[i], R - 0.33, k), binding: false, set: false }; }
  return { kb: REST, db: REST + KL[i], binding: false, set: false };
};
const pickAt = (t: number): { x: number; tip: number } | null => {
  if (t < L[5] || t >= TURN[0]) return null;
  const j = Math.min(4, SETS.filter((s) => s <= t - 0.25).length), i = ORDER[j], st = SETS[j];
  const prevX = j === 0 ? 3.0 : PX[ORDER[j - 1]];
  const x = lerp(prevX, PX[i], ramp(t, st - 1.6 * BEAT, st - 1.05 * BEAT));
  return { x, tip: Math.max(-0.5, pinAt(t, i).kb) };
};
const pinsSet = (t: number) => (t >= L[5] && t < L[7] ? SETS.filter((s) => s <= t).length : 0);

// ================= cutaway scene =================
const Cutaway: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const m = useMemo(() => ({ brass: (() => { const q = std("#e0ae2e", 0.35, 0.75); q.side = THREE.DoubleSide; return q; })(), brassFace: std("#b8861a", 0.5, 0.5), house: std("#8c93b3", 0.4, 0.7), houseFace: std("#58627e", 0.6, 0.4),
    slot: std("#16121c", 0.9), keyway: std("#221a2a", 0.9), kpin: std("#ffd25a", 0.3, 0.8), dpin: std("#c8cdf0", 0.25, 0.85), spring: std("#eef0ff", 0.25, 0.9),
    key: std("#eef0ff", 0.3, 0.6, "#8c93b3", 0.25), pick: std("#c8cdf0", 0.3, 0.6, "#4aa3f0", 0.35), wrench: std("#8c93b3", 0.4, 0.6, "#ff9a3c", 0.2) }), []);
  const rot = plugRot(t), pins = [0, 1, 2, 3, 4].map((i) => pinAt(t, i)), kx = keyX(t), pk = pickAt(t), tens = tension(t);
  const shearGlow = (t >= L[2] + 0.8 && t < L[4]) || (t >= L[5] && t < L[7]) ? 0.6 + 0.4 * Math.sin(t * 8) : 0.15;
  const spool = t >= L[7] && t < L[8];
  return (
    <group>
      <ambientLight intensity={0.4} color="#bfe6ff" />
      <directionalLight position={[4, 6, 8]} intensity={1.4} color="#fff0a8" />
      <pointLight position={[-4, 3, 4]} intensity={20} distance={14} color="#4aa3f0" />
      <pointLight position={[5, -2, 4]} intensity={14} distance={14} color="#ff9a3c" />
      <mesh position={[0, 0, -6]}><planeGeometry args={[60, 40]} /><meshStandardMaterial color="#16121c" roughness={1} /></mesh>
      {/* housing (cut in half): top block with chambers, bottom block, back wall */}
      <mesh material={m.house} position={[0, (R + 3.75) / 2, -0.7]}><boxGeometry args={[6.8, 3.75 - R, 1.4]} /></mesh>
      <mesh material={m.house} position={[0, (-R - 1.7) / 2, -0.7]}><boxGeometry args={[6.8, 1.7 - R, 1.4]} /></mesh>
      <mesh material={m.house} position={[0, 0, -1.35]}><boxGeometry args={[6.8, 2 * R, 0.1]} /></mesh>
      {PX.map((x, i) => <mesh key={`ch${i}`} material={m.slot} position={[x, (R + TOP) / 2, 0.003]}><planeGeometry args={[0.48, TOP - R]} /></mesh>)}
      {/* the plug (rotates) with its key pins and the key */}
      <group rotation={[rot, 0, 0]}>
        <mesh geometry={plugGeo} material={m.brass} />
        <mesh material={m.brassFace} position={[0, 0, 0.001]}><planeGeometry args={[X1 - X0, 2 * R]} /></mesh>
        <mesh material={m.keyway} position={[0, -0.4, 0.004]}><planeGeometry args={[X1 - X0, 0.7]} /></mesh>
        {PX.map((x, i) => <mesh key={`pc${i}`} material={m.slot} position={[x, (R - 0.05) / 2, 0.004]}><planeGeometry args={[0.48, R + 0.05]} /></mesh>)}
        {PX.map((x, i) => { const p = pins[i], len = KL[i]; return (
          <group key={`kp${i}`} position={[x, p.kb, 0]}>
            <mesh material={m.kpin} position={[0, 0.12 + (len - 0.12) / 2, 0]}><cylinderGeometry args={[0.2, 0.2, len - 0.12, 16]} /></mesh>
            <mesh material={m.kpin} position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.2, 0.12, 16]} /></mesh>
          </group>); })}
        {kx < 50 && <group position={[kx, 0, 0]}><mesh geometry={keyGeo} material={m.key} /></group>}
        {pk && <group>
          <mesh material={m.pick} position={[(pk.x + 7) / 2, -0.62, 0.05]}><boxGeometry args={[7 - pk.x, 0.09, 0.08]} /></mesh>
          <mesh material={m.pick} position={[pk.x, (pk.tip - 0.62) / 2, 0.05]}><boxGeometry args={[0.1, Math.max(0.05, pk.tip + 0.62), 0.08]} /></mesh>
        </group>}
        {tens > 0 && <group>
          <mesh material={m.wrench} position={[3.05, -0.7, 0.08]}><boxGeometry args={[1.1, 0.08, 0.1]} /></mesh>
          <mesh material={m.wrench} position={[3.65, -1.5, 0.08]}><boxGeometry args={[0.12, 1.65, 0.1]} /></mesh>
        </group>}
      </group>
      {/* driver pins + springs stay in the housing */}
      {PX.map((x, i) => { const p = pins[i], top = p.db + DRV; const isSpool = spool && i === 2; return (
        <group key={`dp${i}`}>
          {isSpool ? <mesh geometry={spoolGeo} material={m.dpin} position={[x, p.db, 0]} /> : <mesh material={m.dpin} position={[x, p.db + DRV / 2, 0]}><cylinderGeometry args={[0.2, 0.2, DRV, 16]} /></mesh>}
          <mesh geometry={springGeo} material={m.spring} position={[x, top, 0]} scale={[1, Math.max(0.1, TOP - top), 1]} />
          {(p.binding || p.set) && <Glow map={map} at={[x, R, 0.4]} size={1.5} color={p.set ? "#3fcf6a" : "#ff4f5f"} opacity={p.set ? 0.6 : 0.5 + 0.3 * Math.sin(t * 14)} />}
        </group>); })}
      {/* the shear line */}
      <mesh position={[0, R, 0.02]}><boxGeometry args={[6.9, 0.035, 0.02]} /><meshBasicMaterial color="#ff4f5f" transparent opacity={shearGlow} /></mesh>
    </group>
  );
};

// ================= hook scene: a front door =================
const woodTex = (() => {
  const W = 64, Hh = 128, d = new Uint8Array(W * Hh * 4), rp = [[59, 36, 24], [90, 53, 32], [122, 74, 42], [156, 100, 54]];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const g = Math.sin(x * 0.5 + Math.sin(y * 0.08 + x * 0.2) * 2.2) * 0.5 + 0.5; const c = x % 32 === 0 ? rp[0] : rp[1 + Math.min(2, Math.floor(g * 3))]; d.set([c[0], c[1], c[2], 255], (y * W + x) * 4); }
  const t = new THREE.DataTexture(d, W, Hh); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t;
})();
const keyholeGeo = (() => { const s = new THREE.Shape(); s.absarc(0, 0.12, 0.13, 0, Math.PI * 2, false); const g1 = new THREE.ShapeGeometry(s); return g1; })();
const Door: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const m = useMemo(() => ({ door: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 }), brass: std("#e0ae2e", 0.3, 0.8), dark: std("#0c0a10", 0.9), pick: std("#58627e", 0.3, 0.8), wrench: std("#2a3042", 0.4, 0.7), frame: std("#3d2f48", 0.8), wall: std("#2f2338", 0.95) }), []);
  const wig = 0.06 * Math.sin(LW * t * 24), wig2 = 0.03 * Math.sin(LW * t * 37);
  return (
    <group>
      <ambientLight intensity={0.6} color="#ffd25a" />
      <pointLight position={[-2.5, 3.5, 3]} intensity={30} distance={12} color="#ff9a3c" />
      <pointLight position={[3, -1, 3]} intensity={8} distance={10} color="#4aa3f0" />
      <mesh material={m.wall} position={[0, 0, -0.3]}><planeGeometry args={[30, 20]} /></mesh>
      <mesh material={m.door} position={[-1.6, 1.5, 0]}><boxGeometry args={[4.6, 11, 0.3]} /></mesh>
      <mesh material={m.frame} position={[0.85, 1.5, 0.1]}><boxGeometry args={[0.3, 11.4, 0.4]} /></mesh>
      <Glow map={map} at={[-2.5, 3.6, 1]} size={7} color="#ff9a3c" opacity={0.25} />
      {/* deadbolt cylinder */}
      <group position={[0, 0, 0.15]}>
        <mesh material={m.brass} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}><cylinderGeometry args={[0.62, 0.68, 0.2, 40]} /></mesh>
        <mesh material={m.brass} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.24]}><cylinderGeometry args={[0.42, 0.45, 0.1, 32]} /></mesh>
        <mesh geometry={keyholeGeo} material={m.dark} position={[0, 0, 0.3]} />
        <mesh material={m.dark} position={[0, -0.08, 0.3]}><planeGeometry args={[0.1, 0.36]} /></mesh>
        {/* tension wrench (hangs down) + pick (sticks out, wiggles) */}
        <group rotation={[0, 0, 0.02 + wig2]}>
          <mesh material={m.wrench} position={[0, -0.22, 0.42]}><boxGeometry args={[0.06, 0.04, 0.28]} /></mesh>
          <mesh material={m.wrench} position={[0, -0.7, 0.56]}><boxGeometry args={[0.06, 1.0, 0.05]} /></mesh>
        </group>
        <group position={[0, 0, 0.3]} rotation={[wig, -0.5 + wig2, 0]}>
          <mesh material={m.pick} position={[0, 0, 0.75]}><boxGeometry args={[0.04, 0.05, 1.5]} /></mesh>
          <mesh material={m.dark} position={[0, 0, 1.3]}><boxGeometry args={[0.09, 0.14, 0.6]} /></mesh>
        </group>
      </group>
      {/* the handle below */}
      <group position={[0, -2.4, 0.2]}>
        <mesh material={m.brass} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.38, 0.42, 0.15, 28]} /></mesh>
        <mesh material={m.brass} position={[-0.6, 0, 0.35]}><boxGeometry args={[1.5, 0.22, 0.2]} /></mesh>
      </group>
    </group>
  );
};

// ================= camera, HUD, cards =================
const DOOR_CAM = { p: [4.2, 1.6, 12.5] as V3, l: [-0.5, -0.7, 0] as V3 };
const camDoor = (t: number): { p: V3; l: V3 } => {
  if (t >= L[1] && t < L[2]) { const k = ease((t - L[1]) / (L[2] - L[1])) ** 2; return { p: [lerp(DOOR_CAM.p[0], 0.05, k), lerp(DOOR_CAM.p[1], 0.05, k), lerp(DOOR_CAM.p[2], 0.75, k)], l: [lerp(DOOR_CAM.l[0], 0, k), lerp(DOOR_CAM.l[1], 0, k), lerp(DOOR_CAM.l[2], 0, k)] }; }
  const a = 0.08 * Math.sin(2 * LW * t); return { p: [DOOR_CAM.p[0] + a, DOOR_CAM.p[1], DOOR_CAM.p[2]], l: DOOR_CAM.l };
};
const CUT_CAM: CamKey[] = [
  { t: L[2], p: [9.0, 0.0, 7.0], l: [3.2, 0, 0] }, { t: L[2] + 1.0, p: [5.5, 3.0, 28.5], l: [0.9, 0.9, 0] }, { t: L[3], p: [5.2, 2.9, 28.0], l: [0.9, 0.9, 0] },
  { t: K.turn0 - 0.3, p: [11.5, 4.5, 26.0], l: [1.3, 0.6, 0] }, { t: K.out1, p: [11.3, 4.4, 26.2], l: [1.3, 0.6, 0] },
  { t: L[5], p: [4.6, 2.6, 26.5], l: [0.9, 0.9, 0] }, { t: TURN[0] - 0.2, p: [4.2, 2.5, 26.0], l: [0.9, 0.9, 0] },
  { t: TURN[1] + 0.3, p: [12.0, 5.0, 25.0], l: [1.0, 0.6, 0] }, { t: L[7], p: [12.0, 5.0, 25.2], l: [1.0, 0.6, 0] },
  { t: L[7] + 0.5, p: [3.0, 2.4, 19.0], l: [0.3, 1.0, 0] }, { t: L[8], p: [2.9, 2.4, 18.7], l: [0.3, 1.0, 0] },
];
const scene = (t: number) => (t < L[2] || t >= L[8] ? "door" : "cut");
const camFor = (t: number) => (scene(t) === "door" ? camDoor(t) : camAt(CUT_CAM, t));
const HOOKC = { title: "Your front door opens without the key", sub: "here's how a lock really gets picked", hold: true };
const CARDS: Card[] = [
  { from: 0, to: L[1], ...HOOKC },
  { from: L[1], to: L[2], title: "Let's cut the lock in half…", sub: "and look inside" },
  { from: L[2], to: L[3], n: 1, title: "5 pin stacks block it", sub: "the top pins cross the line, so it can't turn" },
  { from: L[3], to: L[4], n: 2, title: "The right key", sub: "lifts every gap exactly to the line → it turns" },
  { from: L[4], to: L[5], n: 3, title: "No key? Twist it slightly", sub: "no lock is perfect: ONE pin jams first" },
  { from: L[5], to: L[6], n: 4, title: "Lift the jammed pin… click", sub: "it stays up, then the next one jams" },
  { from: L[6], to: L[7], n: 5, title: "All 5 set → it turns", sub: "no key, just feel and patience" },
  { from: L[7], to: L[8], n: 6, title: "Good locks fight back", sub: "spool pins fake the click to fool you" },
  { from: L[8], to: D + 0.01, ...HOOKC },
];
const rotP = (p: V3, a: number): V3 => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
const CALLS: Call[] = [
  { txt: "PICK", at: [0.3, -0.1, 1.5], from: 0.5, to: L[1] - 0.1, dx: 120, dy: -260 },
  { txt: "TENSION WRENCH", at: [0, -1.1, 0.75], from: 0.9, to: L[1] - 0.1, dx: 60, dy: 300 },
  { txt: "SPRING", at: [-2.2, 3.0, 0.2], from: L[2] + 1.0, to: L[3], dx: -60, dy: -230 },
  { txt: "DRIVER PIN", at: [-1.1, 1.2, 0.2], from: L[2] + 1.3, to: L[3], dx: 300, dy: -420 },
  { txt: "KEY PIN", at: [1.1, 0.2, 0.2], from: L[2] + 1.6, to: L[3], dx: 120, dy: 360 },
  { txt: "SHEAR LINE", at: [2.9, R, 0.1], from: L[2] + 2.2, to: L[3], dx: 40, dy: 230, color: "#ff4f5f" },
  { txt: "PLUG CAN'T TURN", at: [-2.6, -0.6, 0.6], from: L[2] + 3.0, to: L[3], dx: 120, dy: 330, color: "#ff4f5f" },
  { txt: "ALL GAPS ON THE LINE", at: [0, R, 0.2], from: K.in1 + 0.1, to: K.out0, dx: 0, dy: -330, color: "#3fcf6a" },
  { txt: "BINDING PIN", at: [PX[ORDER[0]], R, 0.3], from: L[4] + 0.4 * (L[5] - L[4]), to: L[5], dx: 80, dy: -330, color: "#ff4f5f" },
  { txt: "TWIST", at: [3.65, -2.2, 0.2], from: L[4] + 0.5 * (L[5] - L[4]), to: L[5], dx: -160, dy: 230 },
  { txt: "SET ✓", at: [PX[ORDER[0]], R + 0.3, 0.2], from: SETS[0], to: SETS[1] - 0.2, dx: -60, dy: -330, color: "#3fcf6a" },
  { txt: "NEXT ONE JAMS", at: [PX[ORDER[1]], R, 0.2], from: SETS[0] + 0.3, to: SETS[1] - 0.2, dx: 60, dy: 330, color: "#ff4f5f" },
  { txt: "SPOOL PIN", at: (t) => [0, (pinAt(t, 2).db + 0.45), 0.2], from: L[7] + 0.3, to: L[8], dx: 160, dy: -330 },
  { txt: "FAKE CLICK", at: [0, R, 0.25], from: EV.spool, to: L[8], dx: -120, dy: 330, color: "#ff4f5f" },
];
void rotP;
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const n = pinsSet(t), open = (t >= TURN[0] && t < L[7]) || (t >= K.turn0 && t < K.back);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Pill bg="rgba(12,10,16,0.92)"><span style={{ color: "#ffd25a" }}>PINS SET</span> {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ color: i < n ? "#3fcf6a" : "#3e465e" }}>●</span>)} {n}/5</Pill>
      <Pill bg={open ? "#1f8a4a" : "#8a1a2a"}>{open ? "🔓 OPEN" : "🔒 LOCKED"}</Pill>
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

export const LockPickVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  const flash = [L[2], L[8]].reduce((a, x) => Math.max(a, Math.abs(t - x) < 0.22 ? 1 - Math.abs(t - x) / 0.22 : 0), 0);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/32-lockpick/music.wav")} />
      <PixelArtCanvas bg={s === "door" ? "#221a2a" : "#16121c"} fov={FOV} palette={LOCK_PALETTE} outline outlineColor="#0c0a10" dither={0.06} scale={2}>
        <CamSet p={cam.p} l={cam.l} />
        {s === "door" ? <Door t={t} map={glow} /> : <Cutaway t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#fff0a8", opacity: flash }} />
      <Hud t={t} />
      <Notif t={t} cards={CARDS} app="LOCKS · HOW IT WORKS" icon="🔐" grad="linear-gradient(160deg,#ffd25a,#b8861a)" />
      <Callouts t={t} cam={cam} fov={FOV} calls={CALLS} />
      {SETS.map((st, j) => <Stamp key={j} t={t} at={st} dur={0.55} color="#1f8a4a" big="CLICK" y={1450} />)}
      <Stamp t={t} at={TURN[0]} dur={L[7] - TURN[0] - 0.15} color="#1f8a4a" big="OPEN 🔓" small="5 pins × 10 heights = up to 100,000 keys" y={1420} />
      <div style={{ ...ui, position: "absolute", left: 56, bottom: 60, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 3 }}>@HOWTOWITHZAY</div>
    </AbsoluteFill>
  );
};
