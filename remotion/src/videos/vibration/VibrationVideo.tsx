/**
 * Video 030 · How does your phone vibrate? — new format inspired by a strong pixel "how it works" reel:
 * - a real-life hook scene (a phone buzzing on a wooden table next to a mug, lamp light, incoming call on screen);
 * - a SPEED HUD that structures the story (REAL SPEED ↔ 512× SLOWER, RPM counter, a gauge);
 * - numbered steps following the chain, title cards themed as phone notifications, small pinned callouts;
 * - finer pixels (scale 2) with lit PBR materials quantised to a hand-made palette of material ramps;
 * - the object's own sound is the music (buzz = 196 Hz = G3; each halving of the slow-down = one octave).
 * Facts: an ERM vibration motor spins an off-centre weight (~10,000-12,000 rpm); the unbalanced spin pulls the motor —
 * and the phone — around in a circle ~200 times a second; the chip switches it on/off to make patterns; newer phones use
 * a linear resonant actuator (a magnet on springs pushed by a coil at its resonance, ~150-200 Hz) that starts and stops
 * in a few milliseconds → crisp taps.
 * 41.7 s loop, 92 BPM trap-soul in G minor (vibration.json + music.wav from videos/30-vibration/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import EV from "./vibration.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type Seg = [number, number, number, number];
const D = EV.duration, BEAT = EV.beat, F0 = EV.f0;
const LW = (2 * Math.PI) / D;
const FOV = 30;
const L = EV.l as number[], SPEED = EV.speed as Seg[], RING = EV.ring as number[][], CHIP = EV.chip as number[][], TAPS = EV.taps as number[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;
const slowAt = (t: number) => { const s = SPEED.find(([a, c]) => t >= a && t < c) ?? SPEED[SPEED.length - 1]; const u = clamp01((t - s[0]) / (s[1] - s[0])); return s[2] * Math.pow(s[3] / s[2], u); };
const buzzing = (t: number) => RING.some(([a, c]) => t >= a && t < c);
const chipOn = (t: number) => t < L[5] || t >= L[6] || CHIP.some(([a, c]) => t >= a && t < c);
// motor angle: integrate the slowed rotation (rev/s = F0 / slow), hidden when "real speed" (it's a blur)
const REV = (() => { const N = 6000, dt = D / N; let a = 0; const arr = [0]; for (let i = 0; i < N; i++) { const s = slowAt(i * dt); a += (s >= 30 && chipOn(i * dt) ? F0 / s : 0) * dt; arr.push(a); } return { arr, dt }; })();
const motorAngle = (t: number) => 2 * Math.PI * (REV.arr[Math.min(REV.arr.length - 1, Math.floor(t / REV.dt))] % 1);

export const VIB_PALETTE = [
  "#120c14", "#1e1420", "#2e1f2a", "#3b2418", "#5a3520", "#7a4a2a", "#9c6436", "#c08350", "#e0a870",
  "#0d0f17", "#1a1e2b", "#2a3042", "#3e465e", "#58627e", "#0b1e3a", "#123a6b", "#1e66b0", "#4aa3f0", "#bfe6ff",
  "#1f8a4a", "#3fcf6a", "#c0283a", "#ff4f5f", "#e9e3d6", "#c9c0ae", "#8f8676", "#7a3f12", "#b5651d", "#e08a3c", "#ffc07a",
  "#5a607a", "#8c93b3", "#c8cdf0", "#ffffff", "#8a6a10", "#c8a010", "#ffd23f", "#fff08a", "#0c3a26", "#14593a", "#1f8a55", "#ffbf6a", "#fff3b0",
];
const BG = "#120c14";
const std = (c: string, r = 0.6, m = 0, e = "#000000", ei = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, emissive: e, emissiveIntensity: ei });

// ================= the room + the phone =================
const woodTex = (() => {
  const W = 64, H = 64, d = new Uint8Array(W * H * 4), ramp = [[90, 53, 32], [122, 74, 42], [156, 100, 54], [192, 131, 80]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const plank = Math.floor(x / 16), seam = x % 16 === 0, g = Math.sin(y * 0.35 + plank * 7 + Math.sin(x * 0.7) * 1.2) * 0.5 + 0.5;
    const c = seam ? [59, 36, 24] : ramp[Math.min(3, Math.floor(g * 2.2 + (plank % 2)))];
    d.set([c[0], c[1], c[2], 255], (y * W + x) * 4);
  }
  const t = new THREE.DataTexture(d, W, H); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.needsUpdate = true; return t;
})();
const Phone: React.FC<{ t: number; xray: number; map: THREE.Texture }> = ({ t, xray, map }) => {
  const g = useMemo(() => ({ body: new RoundedBoxGeometry(2.3, 0.26, 4.7, 4, 0.28) }), []);
  const m = useMemo(() => ({ body: std("#1a1e2b", 0.35, 0.3), rim: std("#58627e", 0.25, 0.7), screen: new THREE.MeshStandardMaterial({ color: "#0b1e3a", emissive: "#123a6b", emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 1 }),
    batt: std("#3e465e", 0.5), pcb: std("#14593a", 0.6), chip: std("#0d0f17", 0.4), cam: std("#2a3042", 0.2, 0.5), motor: std("#c8cdf0", 0.25, 0.8), weight: std("#ffd23f", 0.3, 0.6) }), []);
  (m.screen as THREE.MeshStandardMaterial).opacity = 1 - 0.78 * xray;
  const ring = buzzing(t), k = (t % BEAT) / BEAT;
  return (
    <group>
      <mesh geometry={g.body} material={m.body} position={[0, 0.13, 0]} />
      <mesh position={[0, 0.13, 0]}><boxGeometry args={[2.32, 0.12, 4.5]} /><meshStandardMaterial color="#58627e" roughness={0.25} metalness={0.7} /></mesh>
      {/* internals (seen through the screen in x-ray) */}
      {xray > 0.02 && <group position={[0, 0.2, 0]}>
        <mesh material={m.batt} position={[0.05, 0, -0.35]}><boxGeometry args={[1.8, 0.08, 2.6]} /></mesh>
        <mesh material={m.pcb} position={[0, 0.0, 1.55]}><boxGeometry args={[1.9, 0.06, 0.9]} /></mesh>
        <mesh material={m.pcb} position={[0.7, 0.0, -1.9]}><boxGeometry args={[0.7, 0.06, 0.6]} /></mesh>
        {[[-0.3, 1.5], [0.3, 1.6], [0.55, 1.35]].map((p, i) => <mesh key={i} material={m.chip} position={[p[0], 0.05, p[1]]}><boxGeometry args={[0.32, 0.05, 0.32]} /></mesh>)}
        <mesh material={m.cam} position={[-0.6, 0.02, -1.85]}><cylinderGeometry args={[0.28, 0.28, 0.1, 18]} /></mesh>
        <group position={[-0.72, 0.05, 1.85]}>
          <mesh material={m.motor} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 0.42, 14]} /></mesh>
          <mesh material={m.weight} position={[0.26, 0, 0]} rotation={[motorAngle(t), 0, 0]}><boxGeometry args={[0.08, 0.2, 0.1]} /></mesh>
        </group>
        <Glow map={map} at={[-0.72, 0.2, 1.85]} size={1.4} color="#ffd23f" opacity={0.6 * xray} />
      </group>}
      {/* screen: incoming call */}
      <mesh material={m.screen} position={[0, 0.272, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.08, 4.45]} /></mesh>
      {xray < 0.5 && <group position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[0, 1.15, 0]}><circleGeometry args={[0.42, 24]} /><meshBasicMaterial color="#4aa3f0" /></mesh>
        <mesh position={[0, 1.27, 0.001]}><circleGeometry args={[0.15, 16]} /><meshBasicMaterial color="#bfe6ff" /></mesh>
        <mesh position={[0, 0.98, 0.001]}><circleGeometry args={[0.24, 16, 0, Math.PI]} /><meshBasicMaterial color="#bfe6ff" /></mesh>
        <mesh position={[0, 0.45, 0]}><planeGeometry args={[1.2, 0.16]} /><meshBasicMaterial color="#bfe6ff" /></mesh>
        <mesh position={[0, 0.2, 0]}><planeGeometry args={[0.7, 0.1]} /><meshBasicMaterial color="#4aa3f0" /></mesh>
        {[-0.55, 0.55].map((x, i) => <React.Fragment key={i}>
          <mesh position={[x, -1.55, 0]}><circleGeometry args={[0.3, 24]} /><meshBasicMaterial color={i ? "#3fcf6a" : "#ff4f5f"} /></mesh>
          {i === 1 && ring && <mesh position={[x, -1.55, -0.001]} scale={1 + k * 0.8}><ringGeometry args={[0.32, 0.36, 24]} /><meshBasicMaterial color="#3fcf6a" transparent opacity={1 - k} /></mesh>}
        </React.Fragment>)}
      </group>}
    </group>
  );
};
const Room: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const ring = buzzing(t), j = ring ? 1 : 0;
  const xray = clamp01((t - L[1] - 0.3) / 0.6) * (t < L[2] ? 1 : 0);
  const jit: V3 = [j * 0.035 * Math.sin(t * 157), 0, j * 0.03 * Math.cos(t * 131)];
  const mats = useMemo(() => ({ table: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }), mug: std("#e9e3d6", 0.4), coffee: std("#3b2418", 0.2), book: std("#c0283a", 0.6), page: std("#e9e3d6", 0.8), wall: std("#2e1f2a", 0.9) }), []);
  return (
    <group>
      <ambientLight intensity={0.35} color="#ffd9b0" />
      <pointLight position={[-3.5, 4.5, -2.5]} intensity={40} distance={14} color="#ffbf6a" />
      <pointLight position={[0, 1.2, 0.5]} intensity={ring ? 6 : 3} distance={4} color="#4aa3f0" />
      <directionalLight position={[3, 6, 4]} intensity={0.6} color="#bfe6ff" />
      <mesh material={mats.table} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[14, 14]} /></mesh>
      <mesh material={mats.wall} position={[0, 4, -6]}><planeGeometry args={[20, 10]} /></mesh>
      <Glow map={map} at={[-3.5, 3.2, -3.5]} size={6} color="#ffbf6a" opacity={0.35} />
      {/* mug + book */}
      <group position={[-2.5, 0, -1.3]}>
        <mesh material={mats.mug} position={[0, 0.55, 0]}><cylinderGeometry args={[0.55, 0.5, 1.1, 24]} /></mesh>
        <mesh material={mats.coffee} position={[0, 1.08, 0]}><cylinderGeometry args={[0.47, 0.47, 0.04, 20]} /></mesh>
        <mesh material={mats.mug} position={[0.62, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.25, 0.07, 8, 16]} /></mesh>
        {[0, 1, 2].map((i) => { const u = ((t * 0.35 + i / 3) % 1); return <mesh key={i} position={[0.1 * Math.sin(u * 9 + i), 1.2 + u * 1.4, 0]}><sphereGeometry args={[0.07 + u * 0.12, 8, 6]} /><meshBasicMaterial color="#c9c0ae" transparent opacity={0.4 * (1 - u)} /></mesh>; })}
      </group>
      <group position={[2.4, 0, -1.8]} rotation={[0, 0.4, 0]}>
        <mesh material={mats.book} position={[0, 0.15, 0]}><boxGeometry args={[2.0, 0.3, 2.7]} /></mesh>
        <mesh material={mats.page} position={[0.03, 0.15, 0]}><boxGeometry args={[1.9, 0.24, 2.62]} /></mesh>
      </group>
      {/* the phone, buzzing */}
      <group position={jit} rotation={[0, -0.12 + (j ? 0.02 * Math.sin(t * 97) : 0), 0]}><Phone t={t} xray={xray} map={map} /></group>
      {ring && [0, 1, 2].map((i) => { const u = (((t - RING[0][0]) * 2.2 + i / 3) % 1); return <mesh key={`bz${i}`} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, -0.12]} scale={[1.4 + u * 1.2, 2.6 + u * 1.2, 1]}><ringGeometry args={[0.97, 1, 48]} /><meshBasicMaterial color="#bfe6ff" transparent opacity={0.55 * (1 - u)} /></mesh>; })}
    </group>
  );
};

// ================= macro: the vibration motor =================
const halfDisc = (() => { const s = new THREE.Shape(); s.moveTo(-0.9, 0); s.absarc(0, 0, 0.9, Math.PI, 0, true); s.lineTo(-0.9, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }); g.translate(0, 0, -0.275); return g; })();
const Motor: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const m = useMemo(() => ({ can: std("#c8cdf0", 0.25, 0.85), boot: std("#1a1e2b", 0.8), shaft: std("#8c93b3", 0.2, 0.9), weight: std("#ffd23f", 0.3, 0.7), pcb: std("#14593a", 0.7), trace: std("#c8a010", 0.3, 0.8), chip: std("#0d0f17", 0.4), cap: std("#7a4a2a", 0.5) }), []);
  const ang = motorAngle(t), step2 = t >= L[3] && t < L[4], sl = slowAt(t), fast = sl < 30;
  const cut = t >= L[4] - 0.2 && t < L[5] + 0.2 ? clamp01(Math.min((t - L[4] + 0.2) / 0.5, (L[5] + 0.2 - t) / 0.4)) : 0;
  (m.can as THREE.MeshStandardMaterial).transparent = cut > 0; (m.can as THREE.MeshStandardMaterial).opacity = 1 - 0.85 * cut; (m.can as THREE.MeshStandardMaterial).depthWrite = cut < 0.5;
  const on = chipOn(t) && t >= L[5] && t < L[6];
  const jit = fast ? 0.06 / Math.max(1, sl / 2) * 2 : 0;
  const shake: V3 = step2 ? [0, -0.15 * Math.cos(ang), -0.15 * Math.sin(ang)] : fast ? [0, jit * Math.sin(t * 173), jit * Math.cos(t * 151)] : [0, 0, 0];
  return (
    <group>
      <ambientLight intensity={0.35} color="#bfe6ff" />
      <directionalLight position={[-3, 5, 4]} intensity={1.3} color="#fff3b0" />
      <pointLight position={[3, 2, 3]} intensity={18} distance={10} color="#4aa3f0" />
      <pointLight position={[-3, -1, 2]} intensity={10} distance={10} color="#ffbf6a" />
      {/* the circuit board */}
      <mesh material={m.pcb} position={[0, -1.25, 0]}><boxGeometry args={[40, 0.15, 30]} /></mesh>
      {Array.from({ length: 14 }, (_, i) => <mesh key={`tr${i}`} material={m.trace} position={[-6 + i * 0.9, -1.16, (rnd(i + 5) - 0.5) * 6]}><boxGeometry args={[0.05, 0.02, 2 + rnd(i) * 3]} /></mesh>)}
      {[[-3.5, -2.5], [3.8, -2.2], [-4.2, 1.8], [4.5, 2.5]].map((p, i) => <mesh key={`ch${i}`} material={m.chip} position={[p[0], -0.95, p[1]]}><boxGeometry args={[1.2, 0.5, 1.2]} /></mesh>)}
      {[[-2.3, 2.6], [2.6, 3.0], [-5, -0.5]].map((p, i) => <mesh key={`cp${i}`} material={m.cap} position={[p[0], -0.85, p[1]]}><boxGeometry args={[0.5, 0.6, 0.3]} /></mesh>)}
      {/* the motor: can + rubber boot + shaft + the off-centre weight */}
      <group position={shake}>
        <mesh material={m.boot} position={[-0.4, -0.25, 0]}><boxGeometry args={[2.8, 0.5, 1.9]} /></mesh>
        <mesh material={m.can} position={[-0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.85, 0.85, 2.6, 32]} /></mesh>
        <mesh material={m.shaft} position={[-0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.87, 0.87, 0.18, 32]} /></mesh>
        <mesh material={m.shaft} position={[1.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.11, 0.11, 0.7, 12]} /></mesh>
        {cut > 0.05 && <group position={[-0.4, 0, 0]}>
          {[0, 1].map((i) => <mesh key={`mg${i}`} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.8, 0.8, 2.2, 24, 1, true, i * Math.PI + 0.3, Math.PI - 0.6]} /><meshStandardMaterial color={i ? "#1e66b0" : "#c0283a"} emissive={i ? "#1e66b0" : "#c0283a"} emissiveIntensity={0.5} side={THREE.DoubleSide} roughness={0.5} /></mesh>)}
          <group rotation={[ang, 0, 0]}>
            {[0, 1, 2].map((i) => <mesh key={`co${i}`} position={[0, 0.36 * Math.cos((i * 2 * Math.PI) / 3), 0.36 * Math.sin((i * 2 * Math.PI) / 3)]} rotation={[(i * 2 * Math.PI) / 3, 0, 0]}><boxGeometry args={[1.6, 0.2, 0.3]} /><meshStandardMaterial color="#b5651d" metalness={0.6} roughness={0.35} emissive="#e08a3c" emissiveIntensity={0.25 * (0.5 + 0.5 * Math.sin(ang * 3 + i * 2.1))} /></mesh>)}
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 2.4, 10]} /><meshStandardMaterial color="#8c93b3" metalness={0.9} roughness={0.2} /></mesh>
          </group>
          {[1, -1].map((sg) => <mesh key={`br${sg}`} position={[-1.15, sg * 0.2, 0]}><boxGeometry args={[0.18, 0.14, 0.14]} /><meshStandardMaterial color="#3e465e" /></mesh>)}
        </group>}
        <group position={[1.6, 0, 0]} rotation={[ang, 0, 0]}>
          {!fast && <group rotation={[0, Math.PI / 2, 0]}><mesh geometry={halfDisc} material={m.weight} /></group>}
          {fast && <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.93, 0.93, 0.6, 28]} /><meshStandardMaterial color="#ffd23f" transparent opacity={0.45} metalness={0.5} roughness={0.4} depthWrite={false} /></mesh>}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, 0.6, 14]} /><meshStandardMaterial color="#8c93b3" metalness={0.9} roughness={0.2} /></mesh>
        </group>
        {/* the pull: an arrow pointing where the heavy side is */}
        {step2 && <group position={[1.6, 0, 0]} rotation={[ang, 0, 0]}>
          <mesh position={[0, 1.55, 0]}><boxGeometry args={[0.12, 0.9, 0.12]} /><meshBasicMaterial color="#ff4f5f" /></mesh>
          <mesh position={[0, 2.1, 0]}><coneGeometry args={[0.25, 0.4, 12]} /><meshBasicMaterial color="#ff4f5f" /></mesh>
        </group>}
      </group>
      <Glow map={map} at={[1.6, 0, 0.6]} size={3} color="#ffd23f" opacity={0.25} />
      {/* the driver chip + its trace to the motor */}
      <mesh position={[-3.2, -0.95, 1.4]}><boxGeometry args={[1.2, 0.4, 1.2]} /><meshStandardMaterial color="#0d0f17" emissive="#4aa3f0" emissiveIntensity={on ? 1.2 : 0} roughness={0.4} /></mesh>
      <mesh position={[-2.1, -1.14, 1.0]}><boxGeometry args={[1.5, 0.04, 0.12]} /><meshStandardMaterial color="#c8a010" emissive="#fff08a" emissiveIntensity={on ? 1.5 : 0} /></mesh>
      {on && <Glow map={map} at={[-3.2, -0.4, 1.4]} size={3.2} color="#4aa3f0" opacity={0.8} />}
    </group>
  );
};

// ================= the newer kind: linear resonant actuator =================
const lraX = (t: number) => {
  if (t < L[8]) return 0.9 * Math.sin(2 * Math.PI * (F0 / 256) * (t - L[7])) * clamp01((t - L[7] - 0.4) / 0.6);
  const last = [...TAPS].reverse().find((x) => x <= t); if (last === undefined) return 0;
  const u = t - last; return 1.0 * Math.sin(2 * Math.PI * u * 2.6) * Math.exp(-u * 7);
};
const Spring: React.FC<{ x0: number; x1: number }> = ({ x0, x1 }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 73 }, (_, i) => { const u = i / 72, a = u * Math.PI * 2 * 7; return new THREE.Vector3(u, 0.4 * Math.sin(a), 0.4 * Math.cos(a)); })), 220, 0.06, 6), []);
  return <mesh geometry={geo} position={[x0, 0, 0]} scale={[x1 - x0, 1, 1]}><meshStandardMaterial color="#c8cdf0" metalness={0.85} roughness={0.25} /></mesh>;
};
const Lra: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const x = lraX(t), push = Math.cos(2 * Math.PI * (F0 / 256) * (t - L[7]));
  const coilOn = t < L[8] ? Math.abs(push) : Math.max(0, lraX(t)) / 1.0;
  return (
    <group>
      <ambientLight intensity={0.35} color="#bfe6ff" />
      <directionalLight position={[-3, 6, 5]} intensity={1.3} color="#fff3b0" />
      <pointLight position={[3, 3, 4]} intensity={18} distance={12} color="#4aa3f0" />
      <pointLight position={[-4, 1, 3]} intensity={10} distance={12} color="#ffbf6a" />
      <mesh position={[0, -1.25, 0]}><boxGeometry args={[40, 0.15, 30]} /><meshStandardMaterial color="#14593a" roughness={0.7} /></mesh>
      {/* housing (cut open): back wall, floor, end caps */}
      <mesh position={[0, -0.95, 0]}><boxGeometry args={[6.6, 0.15, 2.2]} /><meshStandardMaterial color="#8c93b3" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0, -1.05]}><boxGeometry args={[6.6, 2.0, 0.1]} /><meshStandardMaterial color="#58627e" metalness={0.7} roughness={0.35} /></mesh>
      {[-3.25, 3.25].map((px) => <mesh key={px} position={[px, 0, 0]}><boxGeometry args={[0.15, 2.0, 2.2]} /><meshStandardMaterial color="#8c93b3" metalness={0.8} roughness={0.3} /></mesh>)}
      {/* coil under the moving magnet */}
      <mesh position={[0, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.65, 0.2, 10, 28]} /><meshStandardMaterial color="#b5651d" metalness={0.6} roughness={0.35} emissive="#e08a3c" emissiveIntensity={1.2 * coilOn} /></mesh>
      <Glow map={map} at={[0, -0.3, 0.6]} size={2.6} color="#e08a3c" opacity={0.6 * coilOn} />
      {/* the moving magnet (the mass) + two springs */}
      <group position={[x, 0.15, 0]}>
        <mesh position={[-0.55, 0, 0]}><boxGeometry args={[1.1, 1.1, 1.5]} /><meshStandardMaterial color="#c0283a" emissive="#c0283a" emissiveIntensity={0.45} roughness={0.45} /></mesh>
        <mesh position={[0.55, 0, 0]}><boxGeometry args={[1.1, 1.1, 1.5]} /><meshStandardMaterial color="#1e66b0" emissive="#1e66b0" emissiveIntensity={0.45} roughness={0.45} /></mesh>
      </group>
      <group position={[0, 0.15, 0]}><Spring x0={-3.15} x1={x - 1.1} /><Spring x0={x + 1.1} x1={3.15} /></group>
      {Math.abs(x) > 0.5 && <Glow map={map} at={[Math.sign(x) * 3.3, 0.2, 0.4]} size={2.4} color="#fff08a" opacity={0.6 * (Math.abs(x) - 0.5)} />}
    </group>
  );
};

// ================= camera, HUD, cards, callouts =================
const ROOM_CAM = { p: [2.4, 13.5, 12.5] as V3, l: [-0.3, 0, 0.1] as V3 };
const camRoom = (t: number): { p: V3; l: V3 } => {
  if (t >= L[1] && t < L[2]) { const k = ease((t - L[1]) / (L[2] - L[1])); const tgt: V3 = [-0.72, 0.25, 1.85]; return { p: [lerp(ROOM_CAM.p[0], tgt[0] + 0.2, k * k), lerp(ROOM_CAM.p[1], tgt[1] + 0.8, k * k), lerp(ROOM_CAM.p[2], tgt[2] + 0.9, k * k)], l: [lerp(ROOM_CAM.l[0], tgt[0], k), lerp(ROOM_CAM.l[1], tgt[1], k), lerp(ROOM_CAM.l[2], tgt[2], k)] }; }
  const a = 0.06 * Math.sin(2 * LW * t); return { p: [ROOM_CAM.p[0] + a * 4, ROOM_CAM.p[1], ROOM_CAM.p[2]], l: ROOM_CAM.l };
};
const MOT_CAM: CamKey[] = [
  { t: L[2], p: [3.0, 1.6, 5.0], l: [1.4, 0, 0] }, { t: L[2] + 1.1, p: [6.5, 5.0, 15.5], l: [0.3, -0.3, 0] }, { t: L[3], p: [6.3, 4.8, 15.2], l: [0.3, -0.3, 0] },
  { t: L[3] + 0.9, p: [15.5, 3.5, 7.5], l: [0.9, 0.2, 0] }, { t: L[4], p: [15.3, 3.4, 7.8], l: [0.9, 0.2, 0] },
  { t: L[4] + 0.9, p: [3.5, 4.5, 12.5], l: [-0.4, -0.2, 0] }, { t: L[5], p: [3.8, 4.4, 12.4], l: [-0.4, -0.2, 0] },
  { t: L[5] + 0.8, p: [-0.6, 12, 16], l: [-1.0, -0.9, 0.6] }, { t: L[6], p: [-0.5, 11.8, 16.2], l: [-1.0, -0.9, 0.6] },
  { t: L[6] + 0.8, p: [7, 4.5, 15], l: [0.4, -0.2, 0] }, { t: L[7], p: [7.2, 4.4, 15.2], l: [0.4, -0.2, 0] },
];
const LRA_CAM: CamKey[] = [
  { t: L[7], p: [3.5, 8.0, 24], l: [0, -0.2, 0] }, { t: L[8], p: [-3.5, 8.5, 23.5], l: [0, -0.2, 0] }, { t: L[9], p: [-4.0, 9.5, 23], l: [0, -0.2, 0] },
];
const scene = (t: number) => (t < L[2] || t >= L[9] ? "room" : t >= L[7] ? "lra" : "motor");
const camFor = (t: number) => { const sc = scene(t); return sc === "room" ? camRoom(t) : sc === "lra" ? camAt(LRA_CAM, t) : camAt(MOT_CAM, t); };
const ui: React.CSSProperties = { fontFamily: "Inter, 'Inter Display', -apple-system, sans-serif" };
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const s = slowAt(t), real = s < 1.05, rpm = (F0 * 60) / s, g = 1 - Math.log2(s) / 9;
  const ang = -120 + 240 * g;
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ ...ui, fontWeight: 800, fontSize: 34, color: "#fff", background: real ? "#1f8a4a" : "#1e66b0", padding: "12px 24px", borderRadius: 999, boxShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>{real ? "REAL SPEED" : `${Math.round(s)}× SLOWER`}</div>
      <svg width={150} height={90} viewBox="0 0 150 90"><path d="M15 80 A60 60 0 0 1 135 80" fill="none" stroke="#ffffff" strokeWidth={10} strokeLinecap="round" opacity={0.85} /><path d="M100 30 A60 60 0 0 1 135 80" fill="none" stroke="#ff4f5f" strokeWidth={10} strokeLinecap="round" />
        <line x1={75} y1={80} x2={75 + 52 * Math.sin((ang * Math.PI) / 180)} y2={80 - 52 * Math.cos((ang * Math.PI) / 180)} stroke="#ffd23f" strokeWidth={6} strokeLinecap="round" /><circle cx={75} cy={80} r={9} fill="#ffd23f" /></svg>
      <div style={{ ...ui, fontWeight: 800, fontSize: 32, color: "#fff", background: "rgba(13,15,23,0.9)", padding: "12px 22px", borderRadius: 999, fontVariantNumeric: "tabular-nums", boxShadow: "0 6px 0 rgba(0,0,0,0.35)" }}><span style={{ color: "#ffd23f" }}>RPM</span> {fmt(rpm)}</div>
    </div>
  );
};
type Card = { from: number; to: number; n?: number; title: string; sub: string; hold?: boolean };
const HOOKC: Omit<Card, "from" | "to"> = { title: "How does your phone vibrate?", sub: "Something inside spins 11,760 times a minute", hold: true };
const CARDS: Card[] = [
  { from: 0, to: L[1], ...HOOKC },
  { from: L[1], to: L[2] + 0.2, title: "Let's slow it down…", sub: "and look inside" },
  { from: L[2] + 0.3, to: L[3], n: 1, title: "An off-center weight", sub: "a half-moon of metal on a tiny motor" },
  { from: L[3], to: L[4], n: 2, title: "Spinning, it yanks the phone", sub: "the heavy side pulls it around in circles" },
  { from: L[4], to: L[5], n: 3, title: "What spins it? A tiny motor", sub: "current flips, magnets push the coils round" },
  { from: L[5], to: L[6], n: 4, title: "The chip pulses it", sub: "on, off, on, off: bzz… bzz…" },
  { from: L[6], to: L[7], title: "Back to real speed", sub: "196 shakes every second" },
  { from: L[7], to: L[8], n: 5, title: "Newer phones: no spinning", sub: "a magnet on a spring, pushed by a coil" },
  { from: L[8], to: L[9], n: 6, title: "It stops in milliseconds", sub: "so it can 'tap' instead of buzz" },
  { from: L[9], to: D + 0.01, ...HOOKC },
];
const Notif: React.FC<{ t: number }> = ({ t }) => {
  const c = CARDS.find((x) => t >= x.from && t < x.to); if (!c) return null;
  const k = c.hold ? 1 : ease((t - c.from) / 0.3), o = c.hold ? 1 : Math.min(k, clamp01((c.to - t) / 0.2));
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 205, opacity: o, transform: `translateY(${(1 - k) * -40}px)`, background: "rgba(246,246,248,0.95)", borderRadius: 40, padding: "26px 30px", display: "flex", gap: 24, alignItems: "center", boxShadow: "0 18px 40px rgba(0,0,0,0.45)" }}>
      <div style={{ width: 104, height: 104, borderRadius: 26, background: "linear-gradient(160deg,#4aa3f0,#1e66b0)", display: "flex", alignItems: "center", justifyContent: "center", ...ui, fontWeight: 900, fontSize: 56, color: "#fff", flex: "0 0 auto" }}>{c.n ?? "📳"}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...ui, fontSize: 26, color: "#6b6f7a", fontWeight: 600, marginBottom: 6 }}><span>HOW IT WORKS · ZAY</span><span>now</span></div>
        <div style={{ ...ui, fontSize: 44, fontWeight: 800, color: "#111318", lineHeight: 1.1 }}>{c.title}</div>
        <div style={{ ...ui, fontSize: 32, fontWeight: 500, color: "#4a4f5c", marginTop: 6 }}>{c.sub}</div>
      </div>
    </div>
  );
};
type Call = { txt: string; at: V3; from: number; to: number; dx: number; dy: number };
const CALLS: Call[] = [
  { txt: "VIBRATION MOTOR", at: [-0.72, 0.3, 1.85], from: L[1] + 0.6, to: L[2], dx: 230, dy: -160 },
  { txt: "OFF-CENTER WEIGHT", at: [1.6, 0.6, 0.3], from: L[2] + 1.1, to: L[3], dx: 0, dy: -300 },
  { txt: "TINY DC MOTOR", at: [-0.9, -0.5, 0.8], from: L[2] + 1.6, to: L[3], dx: -100, dy: 300 },
  { txt: "HEAVY SIDE PULLS", at: [1.6, 1.8, 0], from: L[3] + 1.0, to: L[4], dx: -60, dy: -260 },
  { txt: "MAGNETS", at: [-0.4, 0.75, 0.3], from: L[4] + 1.0, to: L[5], dx: -120, dy: -300 },
  { txt: "COPPER COILS", at: [-0.4, 0, 0.5], from: L[4] + 1.4, to: L[5], dx: 160, dy: 330 },
  { txt: "DRIVER CHIP", at: [-3.2, -0.6, 1.4], from: L[5] + 0.8, to: L[6], dx: 100, dy: -250 },
  { txt: "MAGNET = THE MASS", at: [0, 0.6, 0], from: L[7] + 0.9, to: L[8], dx: 60, dy: -320 },
  { txt: "SPRING", at: [-2.2, 0.3, 0], from: L[7] + 1.4, to: L[8], dx: -60, dy: 300 },
  { txt: "COIL", at: [0, -0.5, 0.9], from: L[7] + 1.9, to: L[8], dx: 200, dy: 260 },
];
const Callouts: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    {CALLS.filter((c) => t >= c.from && t < c.to).map((c, i) => { const [x, y] = project(c.at, cam, FOV), k = ease((t - c.from) / 0.3), ex = Math.max(200, Math.min(880, x + c.dx)), ey = Math.max(470, Math.min(1780, y + c.dy)); return (
      <g key={i} opacity={Math.min(k, clamp01((c.to - t) / 0.2))}>
        <circle cx={x} cy={y} r={10} fill="#ffd23f" stroke="#120c14" strokeWidth={4} />
        <line x1={x} y1={y} x2={lerp(x, ex, k)} y2={lerp(y, ey, k)} stroke="#ffffff" strokeWidth={4} />
        <rect x={ex - 170} y={ey - 34} width={340} height={64} rx={32} fill="#120c14" stroke="#ffd23f" strokeWidth={4} />
        <text x={ex} y={ey + 10} textAnchor="middle" style={{ ...ui, fontWeight: 800, fontSize: 28, fill: "#ffffff", letterSpacing: 2 } as React.CSSProperties}>{c.txt}</text>
      </g>); })}
  </svg>
);
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

export const VibrationVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  const flash = [L[2], L[7], L[9]].reduce((a, x) => Math.max(a, Math.abs(t - x) < 0.25 ? 1 - Math.abs(t - x) / 0.25 : 0), 0);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/30-vibration/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={VIB_PALETTE} outline outlineColor="#120c14" dither={0.06} scale={2}>
        <CamSet p={cam.p} l={cam.l} />
        {s === "room" ? <Room t={t} map={glow} /> : s === "lra" ? <Lra t={t} map={glow} /> : <Motor t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#bfe6ff", opacity: flash }} />
      <Hud t={t} />
      <Notif t={t} />
      <Callouts t={t} cam={cam} />
      <div style={{ ...ui, position: "absolute", left: 56, bottom: 60, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 3 }}>@HOWTOWITHZAY</div>
    </AbsoluteFill>
  );
};
void CHIP; void TAPS;
