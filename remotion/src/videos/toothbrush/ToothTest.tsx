/**
 * 5-second hook test for video 037 (electric toothbrush), matched to the @engineeredwithin1 level: a sunny bathroom,
 * a sonic toothbrush buzzing on its charger and spraying droplets onto the mirror, through the SoftPixel pipeline.
 * Facts (sonic brushes, e.g. Sonicare): ~31,000 brush strokes a minute ≈ 260 back-and-forth cycles a second → the
 * hum is ≈ 260 Hz, a middle C (261.6 Hz).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SoftPixelCanvas } from "../../brand/SoftPixel";
import { project } from "../../brand/Labels";

loadFont({ family: "AlfaSlab", url: staticFile("fonts/AlfaSlabOne-Regular.ttf") });
loadFont({ family: "Silkscreen", url: staticFile("fonts/Silkscreen-Regular.ttf") });
export const FPS = 60;
export const DURATION = 300;
type V3 = [number, number, number];
const FOV = 30;
const D = 5;
const LW = (2 * Math.PI) / D;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const tileTex = (() => {
  const W = 64, d = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const g = x % 32 < 2 || y % 32 < 2; const c = g ? [120, 160, 158] : [150 + (((x >> 5) + (y >> 5)) % 2) * 10, 205, 198]; d.set([c[0], c[1], c[2], 255], (y * W + x) * 4); }
  const t = new THREE.DataTexture(d, W, W); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 5); t.magFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
})();
const M = {
  counter: new THREE.MeshStandardMaterial({ color: "#efeae3", roughness: 0.22, metalness: 0.0 }),
  wall: new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.35 }),
  mirror: new THREE.MeshStandardMaterial({ color: "#cfe7f0", roughness: 0.15, metalness: 0.25, emissive: "#9fc8d8", emissiveIntensity: 0.15 }),
  frame: new THREE.MeshStandardMaterial({ color: "#2f8f86", roughness: 0.4 }),
  brush: new THREE.MeshPhysicalMaterial({ color: "#fbfbfd", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 }),
  teal: new THREE.MeshStandardMaterial({ color: "#1fb5a8", roughness: 0.3, metalness: 0.2 }),
  bristle: new THREE.MeshStandardMaterial({ color: "#e9f6ff", roughness: 0.5 }),
  bristle2: new THREE.MeshStandardMaterial({ color: "#5ad0f0", roughness: 0.5 }),
  base: new THREE.MeshStandardMaterial({ color: "#d9dde3", roughness: 0.3, metalness: 0.3 }),
  water: new THREE.MeshPhysicalMaterial({ color: "#9fd8ff", roughness: 0.05, transmission: 0.6, thickness: 0.2, transparent: true, opacity: 0.85 }),
  glass: new THREE.MeshPhysicalMaterial({ color: "#d8f0ff", roughness: 0.05, transmission: 0.8, thickness: 0.3, transparent: true, opacity: 0.45 }),
  tube: new THREE.MeshStandardMaterial({ color: "#ff5a6e", roughness: 0.35 }),
  cap: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 }),
  pot: new THREE.MeshStandardMaterial({ color: "#e6a36a", roughness: 0.6 }),
  leaf: new THREE.MeshStandardMaterial({ color: "#3fa463", roughness: 0.55 }),
  splat: new THREE.MeshBasicMaterial({ color: "#e8f6ff", transparent: true, opacity: 0.7 }),
};
const HEAD: V3 = [0.25, 4.55, 0.35];
const Brush: React.FC<{ t: number }> = ({ t }) => {
  const g = useMemo(() => ({ handle: new RoundedBoxGeometry(0.62, 3.1, 0.6, 6, 0.28), head: new RoundedBoxGeometry(0.42, 0.78, 0.24, 4, 0.1) }), []);
  const amp = 0.09;
  const Head = ({ a, ghost }: { a: number; ghost?: boolean }) => (
    <group rotation={[0, 0, a]}>
      <mesh material={ghost ? undefined : M.brush} position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.08, 0.13, 1.1, 16]} />{ghost && <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} />}</mesh>
      <mesh geometry={g.head} material={ghost ? undefined : M.brush} position={[0, 1.4, 0]} castShadow>{ghost && <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} />}</mesh>
      {!ghost && Array.from({ length: 21 }, (_, i) => { const cx = (i % 3) - 1, cy = Math.floor(i / 3); return <mesh key={i} material={(cx + cy) % 2 ? M.bristle2 : M.bristle} position={[cx * 0.12, 1.08 + cy * 0.1, 0.24]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.045, 0.05, 0.3, 6]} /></mesh>; })}
    </group>
  );
  const jit = 0.02 * Math.sin(t * 157);
  return (
    <group position={[HEAD[0], 0, HEAD[2]]}>
      <mesh material={M.base} position={[0, 0.13, 0]} castShadow receiveShadow><cylinderGeometry args={[0.55, 0.62, 0.26, 40]} /></mesh>
      <mesh material={M.teal} position={[0, 0.27, 0]}><torusGeometry args={[0.5, 0.025, 8, 40]} /></mesh>
      <group position={[jit * 0.3, 0, 0]}>
        <mesh geometry={g.handle} material={M.brush} position={[0, 1.83, 0]} castShadow receiveShadow />
        <mesh material={M.teal} position={[0, 2.6, 0]}><cylinderGeometry args={[0.32, 0.32, 0.12, 32]} /></mesh>
        <mesh material={M.teal} position={[0, 1.9, 0.31]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.04, 20]} /></mesh>
        <mesh material={M.teal} position={[0, 1.55, 0.305]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.03, 12]} /></mesh>
        <group position={[0, 3.38, 0]}>
          <Head a={jit} />
          <Head a={amp} ghost /><Head a={-amp} ghost />
        </group>
      </group>
    </group>
  );
};
// droplets fly off the head in bursts; a few land on the mirror and stay
const DROPS = Array.from({ length: 26 }, (_, i) => ({ ph: rnd(i), ang: (rnd(i + 40) - 0.5) * 2.6, up: 1.5 + rnd(i + 80) * 2.2, back: -1.2 - rnd(i + 120) * 1.4, s: 0.04 + rnd(i + 160) * 0.05 }));
const Drops: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {DROPS.map((d, i) => { const u = ((t / 1.25 + d.ph) % 1), tt = u * 1.0; const x = HEAD[0] + Math.sin(d.ang) * 2.2 * tt, z = HEAD[2] + d.back * tt * 1.4, y = HEAD[1] + 0.9 + d.up * tt - 4.2 * tt * tt;
      return <mesh key={i} material={M.water} position={[x, y, Math.max(-1.9, z)]} scale={d.s / 0.05}><sphereGeometry args={[0.05, 8, 6]} /></mesh>; })}
  </group>
);
const SPLATS = Array.from({ length: 18 }, (_, i) => ({ x: -1.6 + rnd(i + 200) * 3.6, y: 4.0 + rnd(i + 240) * 1.9, r: 0.03 + rnd(i + 280) * 0.07, at: rnd(i + 320) * 4.5 }));
const Scene: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <ambientLight intensity={0.12} color="#cfe8ff" />
    <directionalLight position={[-6, 8, 5]} intensity={2.2} color="#ffe6c4" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
    <pointLight position={[3.5, 4, 3]} intensity={10} distance={12} color="#9fd8ff" />
    <spotLight position={[-5, 6, 3]} angle={0.45} penumbra={0.8} intensity={25} distance={20} color="#ffd9a8" target-position={[0.5, 3.5, -2]} />
    <mesh material={M.counter} position={[0, -0.3, 0]} receiveShadow castShadow><boxGeometry args={[14, 0.6, 4.4]} /></mesh>
    <mesh material={M.wall} position={[0, 4.5, -2.2]} receiveShadow><planeGeometry args={[16, 10]} /></mesh>
    <group position={[0.1, 4.6, -2.15]}>
      <mesh material={M.frame}><boxGeometry args={[4.6, 3.9, 0.08]} /></mesh>
      <mesh material={M.mirror} position={[0, 0, 0.05]}><planeGeometry args={[4.3, 3.6]} /></mesh>
      {SPLATS.filter((s) => t >= s.at).map((s, i) => <mesh key={i} material={M.splat} position={[s.x - 0.1, s.y - 4.6, 0.06]}><circleGeometry args={[s.r * Math.min(1, (t - s.at) / 0.15 + 0.4), 10]} /></mesh>)}
    </group>
    <Brush t={t} />
    <Drops t={t} />
    {/* props: glass, toothpaste, plant */}
    <mesh material={M.glass} position={[-1.7, 0.75, -0.4]} castShadow><cylinderGeometry args={[0.45, 0.38, 1.5, 32, 1, true]} /></mesh>
    <group position={[1.9, 0.18, 0.9]} rotation={[0, 0.5, Math.PI / 2]}>
      <mesh material={M.tube} scale={[1, 1, 0.55]} castShadow><cylinderGeometry args={[0.28, 0.32, 1.7, 24]} /></mesh>
      <mesh material={M.cap} position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.32, 16]} /></mesh>
    </group>
    <group position={[-2.9, 0, -1.0]}>
      <mesh material={M.pot} position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.5, 0.38, 0.9, 24]} /></mesh>
      {Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2; return <mesh key={i} material={M.leaf} position={[0.35 * Math.cos(a), 1.3 + 0.25 * Math.sin(i * 2), 0.35 * Math.sin(a)]} rotation={[0.6 * Math.sin(a), a, 0.6 * Math.cos(a)]} scale={[0.25, 0.7, 0.08]} castShadow><sphereGeometry args={[1, 12, 8]} /></mesh>; })}
    </group>
  </group>
);
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const camAt = (t: number): { p: V3; l: V3 } => ({ p: [3.6 + 0.25 * Math.sin(LW * t), 6.2, 17.0], l: [0.1, 4.6, 0] });
const slab: React.CSSProperties = { fontFamily: "AlfaSlab" };
export const ToothTest: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camAt(t);
  const [hx, hy] = project([HEAD[0] + 0.25, HEAD[1] + 0.3, HEAD[2] + 0.3], cam, FOV);
  const n = Math.min(31000, Math.round(31000 * Math.min(1, t / 0.6)));
  return (
    <AbsoluteFill style={{ background: "#dfeeea" }}>
      <Audio src={staticFile("videos/37-toothbrush/test.wav")} />
      <SoftPixelCanvas px={3} fov={FOV} bg="#dfeeea" focus={17.0} aperture={0.0012} bloom={0.2} exposure={0.62} env={0.22}>
        <CamSet p={cam.p} l={cam.l} />
        <Scene t={t} />
      </SoftPixelCanvas>
      {/* HUD */}
      <div style={{ position: "absolute", left: 40, top: 60, ...slab, fontSize: 36, color: "#fff", background: "#e2384d", border: "5px solid #fff", borderRadius: 12, padding: "8px 20px 2px", boxShadow: "0 0 0 5px #e2384d, 6px 10px 0 5px rgba(0,0,0,0.25)" }}>REAL SPEED</div>
      <div style={{ position: "absolute", right: 40, top: 60, fontFamily: "Silkscreen", fontSize: 28, color: "#14313a", background: "#fffaf0", border: "5px solid #14313a", padding: "8px 12px 4px", boxShadow: "6px 8px 0 rgba(0,0,0,0.25)" }}>MOVES/MIN <span style={{ background: "#14313a", color: "#5ad0f0", padding: "0 8px" }}>{String(n).padStart(5, "0")}</span></div>
      {/* title: a mirror-sticker / bathroom tile sign */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 160, textAlign: "center", background: "#fffaf0", border: "8px solid #1fb5a8", borderRadius: 18, padding: "16px 20px 20px", boxShadow: "0 0 0 6px #fffaf0, 0 0 0 12px #14313a, 10px 16px 0 12px rgba(0,0,0,0.22)" }}>
        <div style={{ ...slab, fontSize: 46, color: "#14313a", lineHeight: 1.05 }}>YOUR TOOTHBRUSH</div>
        <div style={{ ...slab, fontSize: 54, color: "#1fb5a8", lineHeight: 1.1 }}>MOVES 31,000×</div>
        <div style={{ ...slab, fontSize: 46, color: "#14313a", lineHeight: 1.05 }}>A MINUTE 🤯</div>
      </div>
      <div style={{ position: "absolute", left: 140, right: 140, top: 395, textAlign: "center", ...slab, fontSize: 30, color: "#fff", background: "#e2384d", padding: "10px 0 6px", clipPath: "polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%, 4% 50%)" }}>THAT'S 260 TIMES EVERY SECOND</div>
      {/* fun micro-fact pinned to the head */}
      {t > 1.2 && <>
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}><line x1={hx} y1={hy} x2={hx + 200} y2={hy + 260} stroke="#14313a" strokeWidth={4} strokeDasharray="10 8" /><rect x={hx - 8} y={hy - 8} width={16} height={16} fill="#5ad0f0" stroke="#14313a" strokeWidth={4} /></svg>
        <div style={{ position: "absolute", left: Math.min(800, hx + 200), top: hy + 260, transform: "translate(-50%, -50%)", fontFamily: "Silkscreen", fontSize: 30, color: "#14313a", background: "#fffaf0", border: "5px solid #5ad0f0", padding: "8px 14px 4px", boxShadow: "5px 6px 0 rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>♪ ITS HUM IS A "C"</div>
      </>}
      <div style={{ position: "absolute", left: 40, bottom: 50, fontFamily: "Silkscreen", fontSize: 24, color: "rgba(20,49,58,0.7)" }}>@HOWTOWITHZAY</div>
    </AbsoluteFill>
  );
};
