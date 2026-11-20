/**
 * 5-second quality test shot for video 037 (car differential), matched to the @engineeredwithin1 reference level:
 * a properly lit 3D open differential (ring gear, pinion, carrier, spider gears, side gears, axles, wheels) through
 * the SoftPixel pipeline (soft shadows, AO, reflections, depth of field, fine pixels), themed sign panels.
 * Straight → turn: the carrier keeps turning, the spider gears start spinning, the two wheels split speeds.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { SoftPixelCanvas } from "../../brand/SoftPixel";
import { project } from "../../brand/Labels";

loadFont({ family: "AlfaSlab", url: staticFile("fonts/AlfaSlabOne-Regular.ttf") });
loadFont({ family: "Silkscreen", url: staticFile("fonts/Silkscreen-Regular.ttf") });
export const FPS = 60;
export const DURATION = 300;
type V3 = [number, number, number];
const FOV = 32;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };

// ---------- kinematics (8x slower) ----------
const CARRIER_RPS = 0.42;
const deltaRate = (t: number) => 0.22 * ease((t - 1.9) / 0.9);
const integ = (f: (t: number) => number, t: number) => { let a = 0; const n = 200; for (let i = 0; i < n; i++) a += f((t * (i + 0.5)) / n) * (t / n); return a; };
const carrierA = (t: number) => 2 * Math.PI * CARRIER_RPS * t;
const deltaA = (t: number) => 2 * Math.PI * integ(deltaRate, t);

// ---------- materials ----------
const M = {
  steel: new THREE.MeshStandardMaterial({ color: "#b9c0cc", metalness: 0.9, roughness: 0.32 }),
  dark: new THREE.MeshStandardMaterial({ color: "#454b5c", metalness: 0.8, roughness: 0.45 }),
  ring: new THREE.MeshStandardMaterial({ color: "#d9a43a", metalness: 0.85, roughness: 0.3 }),
  pinion: new THREE.MeshStandardMaterial({ color: "#e0703a", metalness: 0.6, roughness: 0.35 }),
  spider: new THREE.MeshStandardMaterial({ color: "#4fa3e0", metalness: 0.6, roughness: 0.3 }),
  side: new THREE.MeshStandardMaterial({ color: "#7fd18c", metalness: 0.55, roughness: 0.33 }),
  tire: new THREE.MeshStandardMaterial({ color: "#23252c", metalness: 0.0, roughness: 0.85 }),
  rim: new THREE.MeshStandardMaterial({ color: "#d8dde6", metalness: 0.95, roughness: 0.2 }),
  housing: new THREE.MeshStandardMaterial({ color: "#8a94b0", metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
  floor: new THREE.MeshStandardMaterial({ color: "#1a2034", metalness: 0.1, roughness: 0.8 }),
};
Object.values(M).forEach((m) => { (m as THREE.Material).shadowSide = THREE.FrontSide; });

/** bevel gear along local +y: a frustum with teeth on its cone face (teeth point toward +y = the apex side) */
const BevelGear: React.FC<{ r: number; n: number; h: number; mat: THREE.Material; bore?: number }> = ({ r, n, h, mat, bore = 0.15 }) => {
  const body = useMemo(() => new THREE.LatheGeometry([new THREE.Vector2(bore, 0), new THREE.Vector2(r * 1.02, 0), new THREE.Vector2(r * 1.02, h * 0.25), new THREE.Vector2(r * 0.62, h), new THREE.Vector2(bore, h)], 48), [r, h, bore]);
  const tooth = useMemo(() => new THREE.BoxGeometry((2 * Math.PI * r) / n * 0.5, Math.hypot(r * 0.4, h * 0.75), h * 0.22), [r, n, h]);
  const slope = Math.atan2(r * 0.4, h * 0.75);
  return (
    <group>
      <mesh geometry={body} material={mat} castShadow receiveShadow />
      {Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return (
        <group key={i} rotation={[0, a, 0]}>
          <group position={[0, h * 0.25 + h * 0.375, r * 0.82]} rotation={[-slope, 0, 0]}><mesh geometry={tooth} material={mat} position={[0, 0, h * 0.1]} castShadow /></group>
        </group>); })}
    </group>
  );
};
const Wheel: React.FC<{ ang: number }> = ({ ang }) => (
  <group rotation={[ang, 0, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]} material={M.tire} castShadow receiveShadow><torusGeometry args={[1.55, 0.55, 20, 48]} /></mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} material={M.rim} castShadow><cylinderGeometry args={[1.12, 1.12, 0.5, 40, 1, true]} /></mesh>
    {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[(i / 5) * Math.PI * 2, 0, 0]}><mesh material={M.rim} position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.18, 1.15, 0.28]} /></mesh></group>)}
    <mesh rotation={[0, 0, Math.PI / 2]} material={M.dark}><cylinderGeometry args={[0.3, 0.3, 0.6, 20]} /></mesh>
  </group>
);
const Diff: React.FC<{ t: number }> = ({ t }) => {
  const C = carrierA(t), d = deltaA(t), L = C + d, R = C - d, sp = d * (0.9 / 0.55);
  return (
    <group>
      {/* pinion + driveshaft coming from the front */}
      <group position={[-0.55, 0, 2.25]} rotation={[Math.PI / 2, 0, 0]}>
        <group rotation={[0, -C * (37 / 11), 0]}>
          <group rotation={[Math.PI, 0, 0]}><BevelGear r={0.62} n={11} h={0.55} mat={M.pinion} /></group>
          <mesh material={M.steel} position={[0, -1.6, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 2.6, 20]} /></mesh>
          <mesh material={M.dark} position={[0, -3.0, 0]} castShadow><cylinderGeometry args={[0.32, 0.32, 0.4, 20]} /></mesh>
        </group>
      </group>
      {/* carrier assembly (turns with the ring gear) */}
      <group rotation={[C, 0, 0]}>
        <group position={[-1.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><BevelGear r={2.05} n={37} h={0.6} mat={M.ring} bore={1.0} /></group>
        {[-1.05, 0.95].map((x) => <mesh key={x} material={M.dark} rotation={[0, Math.PI / 2, 0]} position={[x, 0, 0]} castShadow><torusGeometry args={[1.12, 0.09, 10, 40]} /></mesh>)}
        {[0, Math.PI].map((a) => <mesh key={a} material={M.dark} position={[-0.05, 1.12 * Math.cos(a + Math.PI / 2), 1.12 * Math.sin(a + Math.PI / 2)]} castShadow><boxGeometry args={[2.0, 0.16, 0.16]} /></mesh>)}
        <mesh material={M.steel} castShadow><cylinderGeometry args={[0.13, 0.13, 2.1, 16]} /></mesh>
        {[1, -1].map((s) => <group key={s} position={[0, s * 0.82, 0]} rotation={[s > 0 ? Math.PI : 0, s * sp, 0]}><BevelGear r={0.55} n={10} h={0.4} mat={M.spider} bore={0.14} /></group>)}
      </group>
      {/* side gears + axles + wheels (left = outside of the turn) */}
      {[{ x: -0.82, a: L, dir: 1 }, { x: 0.82, a: R, dir: -1 }].map(({ x, a, dir }) => (
        <group key={x} rotation={[a, 0, 0]}>
          <group position={[x, 0, 0]} rotation={[0, 0, dir > 0 ? -Math.PI / 2 : Math.PI / 2]}><BevelGear r={0.9} n={16} h={0.45} mat={M.side} bore={0.12} /></group>
          <mesh material={M.steel} rotation={[0, 0, Math.PI / 2]} position={[x - dir * 1.9, 0, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 3.6, 16]} /></mesh>
          <group position={[x - dir * 3.9, 0, 0]}><Wheel ang={0} /></group>
        </group>))}
      
    </group>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const camAt = (t: number): { p: V3; l: V3 } => { const k = ease(t / 5); return { p: [7.4 - 1.0 * k, 5.4 - 0.4 * k, 16.5 - 1.5 * k], l: [-0.4, -0.3, 0] }; };

const sign: React.CSSProperties = { fontFamily: "AlfaSlab", color: "#ffffff", textShadow: "0 3px 0 rgba(0,0,0,0.35)" };
const Tag: React.FC<{ at: V3; cam: { p: V3; l: V3 }; txt: string; dx: number; dy: number; col: string }> = ({ at, cam, txt, dx, dy, col }) => {
  const [x, y] = project(at, cam, FOV);
  const w = txt.length * 24 + 50, lx = Math.max(w / 2 + 24, Math.min(1056 - w / 2, x + dx)), ly = y + dy;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}><line x1={x} y1={y} x2={lx} y2={ly} stroke="#ffffff" strokeWidth={3} strokeDasharray="9 7" /><rect x={x - 7} y={y - 7} width={14} height={14} fill={col} stroke="#111" strokeWidth={3} /></svg>
      <div style={{ position: "absolute", left: lx, top: ly, transform: "translate(-50%, -50%)", fontFamily: "Silkscreen", fontSize: 30, color: "#111318", background: "#f4ecd8", border: `5px solid ${col}`, padding: "6px 14px 4px", boxShadow: "5px 5px 0 rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>{txt}</div>
    </>
  );
};
export const DiffTest: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camAt(t);
  const turn = ease((t - 1.9) / 0.9);
  const rpmL = Math.round(480 * (1 + 0.52 * turn)), rpmR = Math.round(480 * (1 - 0.52 * turn));
  return (
    <AbsoluteFill style={{ background: "#0e1220" }}>
      <SoftPixelCanvas px={3} fov={FOV} bg="#0e1220" focus={17.0} aperture={0.0014} bloom={0.3} exposure={1.05} env={0.3}>
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={0.12} color="#9fb3ff" />
        <directionalLight position={[-5, 9, 6]} intensity={2.4} color="#fff1d6" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-0.0005} />
        <pointLight position={[4, 2, -4]} intensity={40} distance={20} color="#4fa3e0" />
        <pointLight position={[-3, -1, 5]} intensity={18} distance={14} color="#ff9a5c" />
        <mesh material={M.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]} receiveShadow><planeGeometry args={[60, 60]} /></mesh>
        <Diff t={t} />
      </SoftPixelCanvas>
      {/* HUD: road-sign themed */}
      <div style={{ position: "absolute", left: 44, top: 64, ...sign, fontSize: 38, background: "#1f6fd1", border: "6px solid #ffffff", borderRadius: 14, padding: "8px 22px 4px", boxShadow: "0 0 0 5px #1f6fd1, 6px 10px 0 5px rgba(0,0,0,0.35)" }}>8× SLOWER</div>
      <div style={{ position: "absolute", right: 44, top: 60, display: "flex", gap: 14 }}>
        {[["L", rpmL, "#7fd18c"], ["R", rpmR, "#7fd18c"]].map(([s, v, c]) => (
          <div key={s as string} style={{ fontFamily: "Silkscreen", fontSize: 30, color: "#111", background: "#f4ecd8", border: "5px solid #111", padding: "6px 12px 2px", boxShadow: "5px 6px 0 rgba(0,0,0,0.4)" }}>{s} <span style={{ background: "#111", color: c as string, padding: "0 8px" }}>{String(v).padStart(4, "0")}</span></div>))}
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 168, background: "#0f6b3a", border: "7px solid #ffffff", borderRadius: 22, boxShadow: "0 0 0 7px #0f6b3a, 8px 14px 0 7px rgba(0,0,0,0.35)", padding: "22px 26px 18px", textAlign: "center" }}>
        <div style={{ position: "absolute", left: -34, top: -30, width: 76, height: 76, borderRadius: 38, background: "#ffd23f", border: "6px solid #111", ...sign, color: "#111", textShadow: "none", fontSize: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>1</div>
        <div style={{ ...sign, fontSize: 56, lineHeight: 1.05 }}>{turn < 0.5 ? "GOING STRAIGHT" : "IN A TURN"}</div>
        <div style={{ ...sign, fontSize: 32, color: "#ffe9a8", marginTop: 8 }}>{turn < 0.5 ? "BOTH WHEELS, SAME SPEED" : "THE OUTER WHEEL MUST GO FASTER"}</div>
      </div>
      <Tag at={[-1.2, 1.7, 0.6]} cam={cam} txt="RING GEAR" dx={-60} dy={-220} col="#d9a43a" />
      <Tag at={[-0.55, -0.4, 2.3]} cam={cam} txt="PINION" dx={-170} dy={230} col="#e0703a" />
      {turn > 0.3 && <Tag at={[0, 0.9, 0.4]} cam={cam} txt="SPIDER GEARS SPIN" dx={150} dy={-260} col="#4fa3e0" />}
      <Tag at={[0.9, -0.5, 0.5]} cam={cam} txt="SIDE GEAR → WHEEL" dx={120} dy={300} col="#7fd18c" />
      <div style={{ position: "absolute", left: 40, bottom: 56, fontFamily: "Silkscreen", fontSize: 24, color: "rgba(255,255,255,0.7)" }}>@HOWTOWITHZAY</div>
    </AbsoluteFill>
  );
};
