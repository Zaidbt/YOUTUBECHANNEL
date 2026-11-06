/**
 * Teasers v2 — "majestic" cinematic pixel-3D.
 * - 60 fps, continuous spline camera (no stop-and-go)
 * - geometry rendered at 360x640 and upscaled 3x with hard pixels
 * - glows rendered in a separate smooth layer (540x960, screen blend) with black occluders -> soft bloom over crisp pixels
 * - captions fade in/out with a small / BIG / small hierarchy
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import FF from "./fireflies2.json";
import WT from "./watch2.json";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { MovementScene, POS } from "../watch/Watch3D";
import { rnd } from "../../brand/pixels";

loadFont({ family: "PressStart2P", url: staticFile("fonts/PressStart2P-Regular.ttf") });

export const FPS60 = 60;
export const MAJESTIC_FRAMES = 600;

// ---------- smooth camera: Catmull-Rom through timed keys (continuous velocity, no stops) ----------
type CamKey = { t: number; p: [number, number, number]; l: [number, number, number] };
function catmull(p0: number, p1: number, p2: number, p3: number, u: number) {
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}
function camAt(keys: CamKey[], t: number) {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = Math.min(1, Math.max(0, (t - k1.t) / (k2.t - k1.t)));
  const f = (key: "p" | "l") => [0, 1, 2].map((j) => catmull(k0[key][j], k1[key][j], k2[key][j], k3[key][j], u)) as [number, number, number];
  return { p: f("p"), l: f("l") };
}
const CamRig: React.FC<{ p: [number, number, number]; l: [number, number, number] }> = ({ p, l }) => {
  const { camera } = useThree();
  camera.position.set(...p);
  camera.lookAt(...l);
  camera.updateMatrixWorld();
  return null;
};

// ---------- layers ----------
const PIX = 3;
const PixelLayer: React.FC<{ bg: string; fov: number; children: React.ReactNode }> = ({ bg, fov, children }) => (
  <AbsoluteFill style={{ imageRendering: "pixelated" }}>
    <div style={{ width: 1080 / PIX, height: 1920 / PIX, transform: `scale(${PIX})`, transformOrigin: "top left" }}>
      <ThreeCanvas width={1080 / PIX} height={1920 / PIX} gl={{ antialias: false }} camera={{ fov, near: 0.1, far: 300 }}>
        <color attach="background" args={[bg]} />
        {children}
      </ThreeCanvas>
    </div>
  </AbsoluteFill>
);
const GlowLayer: React.FC<{ fov: number; children: React.ReactNode }> = ({ fov, children }) => (
  <AbsoluteFill style={{ mixBlendMode: "screen" }}>
    <div style={{ width: 540, height: 960, transform: "scale(2)", transformOrigin: "top left" }}>
      <ThreeCanvas width={540} height={960} gl={{ antialias: true }} camera={{ fov, near: 0.1, far: 300 }}>
        <color attach="background" args={["#000000"]} />
        {children}
      </ThreeCanvas>
    </div>
  </AbsoluteFill>
);

// ---------- captions ----------
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
type Cue = { t: number; a?: string; b: string; c?: string };
const Captions: React.FC<{ t: number; cues: Cue[]; color: string; glow: string; end: number }> = ({ t, cues, color, glow, end }) => (
  <>
    {cues.map((cue, i) => {
      const until = i + 1 < cues.length ? cues[i + 1].t : end + 1;
      const o = Math.min(ease((t - cue.t) / 0.4), i + 1 < cues.length ? ease((until - t) / 0.35) : 1);
      if (o <= 0) return null;
      const lift = (1 - ease((t - cue.t) / 0.6)) * 14;
      return (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 200 + lift, textAlign: "center", fontFamily: "PressStart2P", color, opacity: o, textShadow: `0 0 26px ${glow}, 4px 4px 0 rgba(0,0,0,0.85)`, lineHeight: 1.6 }}>
          {cue.a && <div style={{ fontSize: 30 }}>{cue.a}</div>}
          <div style={{ fontSize: 64, lineHeight: 1.35 }}>{cue.b}</div>
          {cue.c && <div style={{ fontSize: 30 }}>{cue.c}</div>}
        </div>
      );
    })}
  </>
);
const EndTag: React.FC<{ t: number; color: string }> = ({ t, color }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, textAlign: "center", fontFamily: "PressStart2P", color, opacity: ease((t - 8.7) / 0.6), textShadow: "4px 4px 0 #000" }}>
    <div style={{ fontSize: 30 }}>FULL VIDEO SOON</div>
    <div style={{ fontSize: 22, marginTop: 20, opacity: 0.7 }}>HOW IT WORKS · WITH ZAY</div>
  </div>
);
const Vignette: React.FC<{ s?: number }> = ({ s = 0.75 }) => <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 42%, rgba(0,0,0,${s}) 100%)` }} />;

// ===================== FIREFLIES =====================
const level = (fs: number[], t: number) => {
  let b = 0;
  for (const f of fs) {
    const d = t - f;
    if (d < -0.04 || d > 1.4) continue;
    b += d < 0 ? 1 + d / 0.04 : Math.exp(-d / 0.2);
  }
  return Math.min(1.3, b);
};
const fireflyPos = (i: number, t: number): [number, number, number] => {
  const p = FF.pos[i];
  return [p[0] + 0.5 * Math.sin(t * 0.45 + i * 1.7), p[1] + 0.35 * Math.sin(t * 0.7 + i * 2.3), p[2] + 0.4 * Math.cos(t * 0.38 + i)];
};

const TREES = Array.from({ length: 80 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  return { x: side * (4.2 + rnd(i + 1) * 20), z: 4 - rnd(i + 50) * 62, r: 0.22 + rnd(i + 9) * 0.4, h: 10 + rnd(i + 3) * 10, c: 1.5 + rnd(i + 7) * 1.6, tone: rnd(i + 11) };
});
const GRASS = Array.from({ length: 260 }, (_, i) => ({ x: (rnd(i + 200) - 0.5) * 34, z: 10 - rnd(i + 300) * 50, h: 0.5 + rnd(i + 400) * 0.9, r: rnd(i + 500) * 3 }));

const Forest: React.FC<{ occ?: boolean }> = ({ occ }) => {
  const m = (c: string) => (occ ? <meshBasicMaterial color="#000000" /> : <meshStandardMaterial color={c} roughness={1} />);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}><planeGeometry args={[160, 160]} />{m("#0a1c13")}</mesh>
      {TREES.map((tr, i) => (
        <group key={i} position={[tr.x, 0, tr.z]}>
          <mesh position={[0, tr.h / 2, 0]}><cylinderGeometry args={[tr.r * 0.75, tr.r, tr.h, 7]} />{m("#15110c")}</mesh>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[0, tr.h * 0.5 + k * 2.0, 0]}><coneGeometry args={[tr.c * (1.5 - k * 0.3), 3.2, 8]} />{m(tr.tone > 0.5 ? "#0f2d1e" : "#0c2419")}</mesh>
          ))}
        </group>
      ))}
      {!occ && GRASS.map((g, i) => (
        <mesh key={i} position={[g.x, g.h * 0.3, g.z]} rotation={[0, g.r, 0.15 * Math.sin(g.r * 3)]}><coneGeometry args={[0.16, g.h * 0.6, 4]} /><meshStandardMaterial color="#1f5233" emissive="#0b2414" roughness={1} /></mesh>
      ))}
    </group>
  );
};

const FF_CAM: CamKey[] = [
  { t: 0, p: [0, 0.9, 13], l: [0, 1.5, 0] },
  { t: 3.3, p: [1.2, 1.7, 6.5], l: [-0.5, 2.6, -8] },
  { t: 6.6, p: [0.2, 4.0, 2.5], l: [0, 3.2, -14] },
  { t: 10, p: [0, 11, 9], l: [0, 2.6, -18] },
];

export const FirefliesMajestic: React.FC = () => {
  const t = useCurrentFrame() / FPS60;
  const map = useMemo(glowTexture, []);
  const cam = camAt(FF_CAM, t);
  const lv = FF.flashes.map((fs) => level(fs, t));
  const avg = lv.reduce((a, b) => a + b, 0) / lv.length;
  return (
    <AbsoluteFill style={{ background: "#03070a" }}>
      <Audio src={staticFile("videos/teasers/fireflies2.wav")} />
      <PixelLayer bg="#03080b" fov={52}>
        <CamRig {...cam} />
        <fog attach="fog" args={["#061410", 6, 55]} />
        <hemisphereLight args={["#6d8fff", "#061209", 0.22 + 2.2 * avg]} />
        <directionalLight position={[12, 30, -40]} intensity={0.35} color="#8aa2ff" />
        <pointLight position={[0, 4, -10]} intensity={40 + 900 * avg} distance={55} color="#d8ff70" />
        <Forest />
        {FF.pos.map((_, i) => <Glow key={i} map={map} at={fireflyPos(i, t)} size={0.12 + 0.12 * lv[i]} color="#fbffd0" opacity={Math.min(1, 0.35 + lv[i])} />)}
      </PixelLayer>
      <GlowLayer fov={52}>
        <CamRig {...cam} />
        <fog attach="fog" args={["#000000", 8, 60]} />
        <Forest occ />
        <Glow map={map} at={[18, 40, -90]} size={70} color="#3a55c0" opacity={0.35} />
        {FF.pos.map((_, i) => {
          const b = lv[i];
          return (
            <group key={i}>
              <Glow map={map} at={fireflyPos(i, t)} size={0.7 + 3.4 * b} color="#c9ff4f" opacity={Math.min(1, 0.1 + 0.85 * b)} />
              <Glow map={map} at={fireflyPos(i, t)} size={0.25 + 0.7 * b} color="#ffffe6" opacity={Math.min(1, 0.25 + b)} />
            </group>
          );
        })}
      </GlowLayer>
      <Vignette s={0.7} />
      <Captions t={t} end={10} color="#f2ffd8" glow="rgba(190,255,90,0.55)" cues={[
        { t: 0, a: "WHY DO", b: "FIREFLIES", c: "BLINK TOGETHER?  🎧" },
        { t: 2, a: "EACH ONE KEEPS", b: "ITS OWN", c: "RHYTHM" },
        { t: 4, a: "SEE A FLASH?", b: "SPEED UP", c: "A LITTLE" },
        { t: 6, a: "AGAIN", b: "AND AGAIN" },
        { t: 8, a: "UNTIL THE WHOLE FOREST", b: "BLINKS", c: "AS ONE" },
      ]} />
      <EndTag t={t} color="#f2ffd8" />
    </AbsoluteFill>
  );
};

// ===================== WATCH =====================
const tcAt = (t: number) => {
  const x = Math.max(0, Math.min(WT.tc.length - 1.001, t * WT.rate)), i = Math.floor(x);
  return WT.tc[i] + (WT.tc[i + 1] - WT.tc[i]) * (x - i);
};
const easeOut = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
function angles(t: number) {
  const tc = tcAt(t), n = Math.floor(tc + 1e-6), f = tc - n;
  return { balanceA: 2.3 * Math.sin(Math.PI * tc), escA: -(Math.PI * 2) / 30 * (n + easeOut(f / 0.2)), forkA: 0.12 * (n % 2 === 0 ? 1 : -1) * (2 * easeOut(f / 0.14) - 1) };
}
const tickAge = (t: number) => { let a = 9; for (const k of WT.ticks) if (k <= t + 1e-6) a = t - k; return a; };

const W_CAM: CamKey[] = [
  { t: 0, p: [0.6, -10, 31], l: [0.3, 0.2, 0] },
  { t: 2.6, p: [-2.6, -9.5, 13], l: [-1.7, -2.2, 0.4] },
  { t: 5.2, p: [1.4, -4.5, 12.5], l: [2.0, 3.0, 0.9] },
  { t: 7.6, p: [1.0, -9, 20], l: [0.7, 0.6, 0.4] },
  { t: 10, p: [0.2, -13.5, 36], l: [0.3, 0.0, 0] },
];

const Trail: React.FC<{ map: THREE.Texture; t: number }> = ({ map, t }) => {
  // a light point on the balance rim, with a fading trail of its recent positions
  const c = POS.balance, rimA = 0.6;
  const pts = Array.from({ length: 14 }, (_, k) => {
    const a = rimA + angles(Math.max(0, t - k * 0.018)).balanceA;
    return { at: [c.x + Math.cos(a) * 2.95, c.y + Math.sin(a) * 2.95, c.z + 0.45] as [number, number, number], k };
  });
  return <>{pts.map(({ at, k }) => <Glow key={k} map={map} at={at} size={(k === 0 ? 1.9 : 1.2) * (1 - k / 16)} color={k === 0 ? "#fff1c8" : "#ffb347"} opacity={(1 - k / 14) * 0.85} />)}</>;
};

export const WatchMajestic: React.FC = () => {
  const t = useCurrentFrame() / FPS60;
  const map = useMemo(glowTexture, []);
  const cam = camAt(W_CAM, t);
  const ang = angles(t);
  const tg = Math.exp(-tickAge(t) * 6);
  const jewels: [number, number, number, number][] = [
    [POS.balance.x, POS.balance.y, 1.4, 0.4], [POS.fork.x, POS.fork.y, 1.0, 0.5], [POS.escape.x, POS.escape.y, 0.7, 0.5], [POS.fourth.x, POS.fourth.y, 0.3, 0.3], [POS.barrel.x, POS.barrel.y, 0.7, 0.3],
    [POS.fork.x - 3.6, POS.fork.y - 2.1, 0.9, 1], [POS.fork.x - 0.8, POS.fork.y - 2.5, 0.9, 1],
  ];
  const b = t / 2;
  const tag = b < 1 || b >= 4 ? "▶ REAL SPEED" : b < 3 ? "❚❚ SLOW-MO 1/4" : "❚❚ SLOW-MO 1/2";
  return (
    <AbsoluteFill style={{ background: "#090503" }}>
      <Audio src={staticFile("videos/teasers/watch2.wav")} />
      <PixelLayer bg="#090503" fov={40}>
        <CamRig {...cam} />
        <hemisphereLight args={["#ffd9a0", "#1a0e05", 0.85]} />
        <directionalLight position={[-8, 14, 16]} intensity={2.4} color="#ffcf8a" />
        <directionalLight position={[10, -6, 5]} intensity={0.8} color="#ff7a2a" />
        <pointLight position={[POS.fork.x - 2, POS.fork.y - 2, 4]} intensity={15 + 120 * tg} distance={12} color="#ff8a3c" />
        <MovementScene look="cinema" tilt={0} {...ang} />
      </PixelLayer>
      <GlowLayer fov={40}>
        <CamRig {...cam} />
        {jewels.map(([x, y, z, k], i) => <Glow key={i} map={map} at={[x, y, z]} size={1.0 + 1.6 * k * tg} color="#ff2d55" opacity={0.35 + 0.55 * k * tg} />)}
        <Trail map={map} t={t} />
        <Glow map={map} at={[-6, 9, -2]} size={26} color="#ff9a3c" opacity={0.18} />
        {Array.from({ length: 50 }, (_, i) => (
          <Glow key={`d${i}`} map={map} at={[(rnd(i) - 0.5) * 22 + 0.4 * Math.sin(t * 0.35 + i), (rnd(i + 40) - 0.5) * 22 + 0.3 * Math.cos(t * 0.28 + i), 1.5 + rnd(i + 80) * 9]} size={0.12 + rnd(i + 9) * 0.22} color="#ffd9a0" opacity={0.25 + 0.4 * rnd(i + 3)} />
        ))}
      </GlowLayer>
      <Vignette s={0.82} />
      <div style={{ position: "absolute", left: 50, top: 70, fontFamily: "PressStart2P", fontSize: 22, color: "#f6e7c8", opacity: 0.85, textShadow: "3px 3px 0 #000" }}>{tag}</div>
      <Captions t={t} end={10} color="#f6e7c8" glow="rgba(255,160,70,0.5)" cues={[
        { t: 0, a: "HOW DOES A", b: "WATCH TICK?", c: "🎧" },
        { t: 2, a: "IT LETS GO", b: "ONE TOOTH", c: "AT A TIME" },
        { t: 4, a: "A TINY WHEEL", b: "SWINGS", c: "BACK AND FORTH" },
        { t: 6, a: "EVERY SWING", b: "ONE TICK" },
        { t: 8, a: "ABOUT", b: "8 TICKS", c: "EVERY SECOND" },
      ]} />
      <EndTag t={t} color="#f6e7c8" />
    </AbsoluteFill>
  );
};
