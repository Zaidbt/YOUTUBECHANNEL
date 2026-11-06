/**
 * Two 10 s teasers in the cinematic pixel-3D style: low-res 3D (216x384, 5x hard pixels), one mood palette,
 * glowing key elements, tiny pixel captions, music-driven (🎧). Timing + audio from videos/teasers/build.py.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import FF from "./fireflies.json";
import WT from "./watch.json";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { MovementScene, POS } from "../watch/Watch3D";
import { rnd } from "../../brand/pixels";

loadFont({ family: "PressStart2P", url: staticFile("fonts/PressStart2P-Regular.ttf") });

export const FPS = 30;
export const TEASER_FRAMES = 300;
const PX = 5, W = 1080 / PX, H = 1920 / PX;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

type Key = { t: number; v: number[] };
function track(keys: Key[], t: number): number[] {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[i + 1], k = ease((t - a.t) / (b.t - a.t));
  return a.v.map((x, j) => lerp(x, b.v[j], k));
}

// ---------- shared overlay ----------
const Caption: React.FC<{ t: number; cues: { t: number; lines: string[] }[]; color: string; glow: string }> = ({ t, cues, color, glow }) => {
  let cue = cues[0];
  for (const c of cues) if (t >= c.t) cue = c;
  const chars = Math.floor((t - cue.t) * 40); // quick typewriter
  let left = chars;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", fontFamily: "PressStart2P", fontSize: 44, lineHeight: 1.55, color, textShadow: `0 0 20px ${glow}, 5px 5px 0 #000` }}>
      {cue.lines.map((l, i) => {
        const shown = l.slice(0, Math.max(0, left));
        left -= l.length;
        return <div key={i} style={{ minHeight: 68 }}>{shown}</div>;
      })}
    </div>
  );
};
const EndTag: React.FC<{ t: number; color: string }> = ({ t, color }) => {
  const o = ease((t - 8.6) / 0.4);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, textAlign: "center", fontFamily: "PressStart2P", color, opacity: o, textShadow: "4px 4px 0 #000" }}>
      <div style={{ fontSize: 34 }}>FULL VIDEO SOON</div>
      <div style={{ fontSize: 24, marginTop: 22, opacity: 0.75 }}>HOW IT WORKS · WITH ZAY</div>
    </div>
  );
};
const SpeedTag: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <div style={{ position: "absolute", left: 50, top: 70, fontFamily: "PressStart2P", fontSize: 24, color, textShadow: "3px 3px 0 #000" }}>{text}</div>
);
const Pixelated: React.FC<{ bg: string; children: React.ReactNode; camera?: { fov: number } }> = ({ bg, children, camera = { fov: 50 } }) => (
  <AbsoluteFill style={{ imageRendering: "pixelated" }}>
    <div style={{ width: W, height: H, transform: `scale(${PX})`, transformOrigin: "top left" }}>
      <ThreeCanvas width={W} height={H} gl={{ antialias: false }} camera={{ fov: camera.fov, position: [0, 0, 0], near: 0.1, far: 200 }}>
        <color attach="background" args={[bg]} />
        {children}
      </ThreeCanvas>
    </div>
  </AbsoluteFill>
);
const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.8 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,${strength}) 100%)` }} />
);

// ===================== FIREFLIES =====================
const flashLevel = (fs: number[], t: number) => {
  let b = 0;
  for (const f of fs) {
    const d = t - f;
    if (d < -0.03 || d > 1.2) continue;
    b += d < 0 ? 1 + d / 0.03 : Math.exp(-d / 0.17);
  }
  return Math.min(1.4, b);
};

const Forest: React.FC = () => {
  const trees = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const x = side * (2.5 + rnd(i) * 15), z = 6 - rnd(i + 50) * 48;
    return { x, z, r: 0.25 + rnd(i + 9) * 0.35, h: 9 + rnd(i + 3) * 8, c: 1.6 + rnd(i + 7) * 1.4 };
  }), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#0b1d14" roughness={1} /></mesh>
      {trees.map((tr, i) => (
        <group key={i} position={[tr.x, 0, tr.z]}>
          <mesh position={[0, tr.h / 2, 0]}><cylinderGeometry args={[tr.r * 0.8, tr.r, tr.h, 6]} /><meshStandardMaterial color="#14110d" roughness={1} /></mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0, tr.h * 0.55 + k * 2.2, 0]}><coneGeometry args={[tr.c * (1.4 - k * 0.35), 3.4, 7]} /><meshStandardMaterial color="#0e2a1c" roughness={1} /></mesh>
          ))}
        </group>
      ))}
      {Array.from({ length: 60 }, (_, i) => (
        <mesh key={`g${i}`} position={[(rnd(i + 200) - 0.5) * 30, 0.25, 6 - rnd(i + 300) * 40]}><coneGeometry args={[0.18, 0.6 + rnd(i) * 0.6, 4]} /><meshStandardMaterial color="#173a26" roughness={1} /></mesh>
      ))}
    </group>
  );
};

const FirefliesScene: React.FC<{ t: number }> = ({ t }) => {
  const map = useMemo(glowTexture, []);
  const levels = FF.flashes.map((fs) => flashLevel(fs, t));
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  // camera: drift into the forest, then rise to see the whole swarm blink together
  const [cx, cy, cz, pitch, yaw] = track([
    { t: 0, v: [0, 2.0, 16, 0.02, 0.05] }, { t: 4, v: [0.5, 2.6, 9, 0.06, -0.04] }, { t: 7.5, v: [0, 3.6, 7, 0.1, 0.02] }, { t: 10, v: [0, 6.5, 12, -0.12, 0] },
  ], t);
  return (
    <Pixelated bg="#04080b">
      <fog attach="fog" args={["#05100d", 6, 42]} />
      <hemisphereLight args={["#7fa6ff", "#06140c", 0.25 + 2.4 * avg]} />
      <pointLight position={[0, 4, -6]} intensity={30 + 900 * avg} distance={40} color="#d8ff70" />
      <group rotation={[-pitch, -yaw, 0]}>
        <group position={[-cx, -cy, -cz]}>
          <Forest />
          {/* moon + stars beyond the trees */}
          <Glow map={map} at={[14, 34, -70]} size={30} color="#7f9cff" opacity={0.35} />
          {Array.from({ length: 40 }, (_, i) => <Glow key={i} map={map} at={[(rnd(i + 500) - 0.5) * 90, 18 + rnd(i + 600) * 30, -70]} size={0.5} color="#ffffff" opacity={0.6} />)}
          {FF.pos.map((p, i) => {
            const b = levels[i];
            const x = p[0] + 0.4 * Math.sin(t * 0.6 + i), y = p[1] + 0.3 * Math.sin(t * 0.9 + i * 2), z = p[2] + 0.3 * Math.cos(t * 0.5 + i);
            return (
              <group key={i}>
                <Glow map={map} at={[x, y, z]} size={0.5 + 2.6 * b} color="#d6ff5c" opacity={Math.min(1, 0.12 + 0.9 * b)} />
                <Glow map={map} at={[x, y, z]} size={0.18 + 0.4 * b} color="#ffffe0" opacity={Math.min(1, 0.3 + b)} />
              </group>
            );
          })}
        </group>
      </group>
    </Pixelated>
  );
};

export const FirefliesTeaser: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: "#04080b" }}>
      <Audio src={staticFile("videos/teasers/fireflies.wav")} />
      <FirefliesScene t={t} />
      <Vignette strength={0.7} />
      <Caption t={t} color="#f4ffd6" glow="rgba(200,255,100,0.5)" cues={[
        { t: 0, lines: ["WHY DO FIREFLIES", "BLINK TOGETHER?", "🎧"] },
        { t: 2, lines: ["EACH ONE HAS", "ITS OWN RHYTHM"] },
        { t: 4, lines: ["SEE A FLASH?", "SPEED UP A LITTLE"] },
        { t: 6, lines: ["AGAIN...", "AND AGAIN..."] },
        { t: 8, lines: ["UNTIL THE FOREST", "BLINKS AS ONE"] },
      ]} />
      <EndTag t={t} color="#f4ffd6" />
    </AbsoluteFill>
  );
};

// ===================== WATCH =====================
const tcAt = (t: number) => {
  const x = Math.max(0, Math.min(WT.tc.length - 1.001, t * WT.rate)), i = Math.floor(x);
  return WT.tc[i] + (WT.tc[i + 1] - WT.tc[i]) * (x - i);
};
const easeOut = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
function watchAngles(t: number) {
  const tc = tcAt(t), n = Math.floor(tc + 1e-6), f = tc - n;
  return {
    balanceA: 2.3 * Math.sin(Math.PI * tc),
    escA: -(Math.PI * 2) / 30 * (n + easeOut(f / 0.18)),
    forkA: 0.12 * (n % 2 === 0 ? 1 : -1) * (2 * easeOut(f / 0.12) - 1),
  };
}
const lastTickAge = (t: number) => {
  let age = 9;
  for (const k of WT.ticks) if (k <= t + 1e-6) age = t - k;
  return age;
};

const SwingTrail: React.FC<{ map: THREE.Texture; a0: number; a1: number; strength: number }> = ({ map, a0, a1, strength }) => {
  const from = Math.min(a0, a1), to = Math.max(a0, a1), span = Math.max(0.05, to - from);
  const c = POS.balance;
  const toLead = a1 >= a0; // brighter at the leading end
  return (
    <group position={[c.x, c.y, c.z + 0.45]}>
      <mesh rotation={[0, 0, from]}>
        <torusGeometry args={[2.95, 0.06, 6, 40, span]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.9 * strength} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const k = i / 7, a = from + span * k, lead = toLead ? k : 1 - k;
        return <Glow key={i} map={map} at={[Math.cos(a) * 2.95, Math.sin(a) * 2.95, 0]} size={0.6 + 1.8 * lead} color="#ffb347" opacity={(0.15 + 0.7 * lead) * strength} />;
      })}
    </group>
  );
};

const WatchScene: React.FC<{ t: number }> = ({ t }) => {
  const map = useMemo(glowTexture, []);
  const ang = watchAngles(t);
  const prev = watchAngles(Math.max(0, t - 0.14));
  const tickAge = lastTickAge(t);
  const tickGlow = Math.exp(-tickAge * 7);
  const [dist, fx, fy, tilt, roll] = track([
    { t: 0, v: [36, 0.4, -0.2, -0.55, -0.08] }, { t: 1.6, v: [30, 0.2, -0.6, -0.55, -0.04] }, { t: 2.6, v: [15, -1.7, -2.6, -0.42, 0.02] },
    { t: 4.2, v: [17, 1.9, 3.0, -0.5, 0.06] }, { t: 6.2, v: [21, 0.8, 0.9, -0.5, 0.0] }, { t: 8.2, v: [29, 0.4, -0.2, -0.55, -0.05] }, { t: 10, v: [38, 0.4, -0.2, -0.58, -0.09] },
  ], t);
  const rim = 0.6;
  const jewels: [number, number, number, number][] = [
    [POS.balance.x, POS.balance.y, 1.4, 0.4], [POS.fork.x, POS.fork.y, 1.0, 0.4], [POS.escape.x, POS.escape.y, 0.7, 0.4], [POS.fourth.x, POS.fourth.y, 0.3, 0.3], [POS.barrel.x, POS.barrel.y, 0.7, 0.3],
    [POS.fork.x - 3.6, POS.fork.y - 2.1, 0.9, 1], [POS.fork.x - 0.8, POS.fork.y - 2.5, 0.9, 1],
  ];
  const fp = new THREE.Vector3(fx, fy, 0.6).applyEuler(new THREE.Euler(tilt, 0, roll));
  return (
    <Pixelated bg="#0a0604" camera={{ fov: 40 }}>
      <hemisphereLight args={["#ffd9a0", "#1a0e05", 0.9]} />
      <directionalLight position={[-8, 14, 16]} intensity={2.6} color="#ffcf8a" />
      <directionalLight position={[10, -6, 5]} intensity={0.9} color="#ff7a2a" />
      <pointLight position={[POS.fork.x - 2, POS.fork.y - 2, 4]} intensity={20 + 140 * tickGlow} distance={12} color="#ff8a3c" />
      <group position={[-fp.x, -fp.y, -dist - fp.z]}>
        <group rotation={[tilt, 0, roll]}>
          <MovementScene look="cinema" tilt={0} {...ang} />
          {jewels.map(([x, y, z, k], i) => <Glow key={i} map={map} at={[x, y, z]} size={0.9 + 1.4 * k * tickGlow} color="#ff3355" opacity={0.45 + 0.5 * k * tickGlow} />)}
          <SwingTrail map={map} a0={rim + prev.balanceA} a1={rim + ang.balanceA} strength={0.5 + 0.5 * Math.min(1, Math.abs(ang.balanceA - prev.balanceA) / 1.5)} />
          {/* dust in the light */}
          {Array.from({ length: 36 }, (_, i) => (
            <Glow key={`d${i}`} map={map} at={[(rnd(i) - 0.5) * 18 + 0.3 * Math.sin(t * 0.4 + i), (rnd(i + 40) - 0.5) * 18 + 0.2 * Math.cos(t * 0.3 + i), 2 + rnd(i + 80) * 6]} size={0.2 + rnd(i + 9) * 0.25} color="#ffd9a0" opacity={0.2 + 0.3 * rnd(i + 3)} />
          ))}
        </group>
      </group>
    </Pixelated>
  );
};

export const WatchTeaser: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const b = t / 2;
  const tag = b < 1 || b >= 4 ? "▶ REAL SPEED" : b < 3 ? "❚❚ SLOW-MO 1/4" : "❚❚ SLOW-MO 1/2";
  return (
    <AbsoluteFill style={{ background: "#0a0604" }}>
      <Audio src={staticFile("videos/teasers/watch.wav")} />
      <WatchScene t={t} />
      <Vignette strength={0.85} />
      <SpeedTag text={tag} color="#f6e7c8" />
      <Caption t={t} color="#f6e7c8" glow="rgba(255,170,80,0.5)" cues={[
        { t: 0, lines: ["HOW A WATCH", "TICKS", "🎧"] },
        { t: 2, lines: ["IT LETS GO", "ONE TOOTH AT A TIME"] },
        { t: 4, lines: ["A TINY WHEEL", "SWINGS BACK AND FORTH"] },
        { t: 6, lines: ["EVERY SWING", "IS ONE TICK"] },
        { t: 8, lines: ["8 TICKS", "EVERY SECOND"] },
      ]} />
      <EndTag t={t} color="#f6e7c8" />
    </AbsoluteFill>
  );
};
