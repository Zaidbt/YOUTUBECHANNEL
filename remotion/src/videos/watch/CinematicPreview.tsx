/**
 * Style test: "cinematic pixel-3D" — dark, one warm palette, glowing key element, low-res crisp pixels,
 * tiny pixel captions with no boxes. Same watch movement as video 002.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import { MovementScene, POS } from "./Watch3D";
import { rnd } from "../../brand/pixels";

loadFont({ family: "PressStart2P", url: staticFile("fonts/PressStart2P-Regular.ttf") });

const PX = 5; // render at 216x384, upscale 5x with hard pixels

export function glowTexture() {
  const n = 64, d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2);
    const a = Math.max(0, 1 - r) ** 2.2;
    const i = (y * n + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.needsUpdate = true; return t;
}

export const Glow: React.FC<{ map: THREE.Texture; at: [number, number, number]; size: number; color: string; opacity?: number }> = ({ map, at, size, color, opacity = 0.9 }) => (
  <sprite position={at} scale={[size, size, 1]}>
    <spriteMaterial map={map} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
  </sprite>
);

/** Glowing arc showing the balance wheel's swing (like a light trail). */
const SwingTrail: React.FC<{ map: THREE.Texture; from: number; to: number }> = ({ map, from, to }) => {
  const c = POS.balance;
  return (
    <group position={[c.x, c.y, c.z + 0.4]}>
      <mesh rotation={[0, 0, from]}>
        <torusGeometry args={[3.0, 0.07, 6, 48, to - from]} />
        <meshBasicMaterial color="#ffcc66" transparent opacity={0.95} blending={THREE.AdditiveBlending} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = from + ((to - from) * i) / 8;
        return <Glow key={i} map={map} at={[Math.cos(a) * 3, Math.sin(a) * 3, 0]} size={0.9 + (i / 8) * 1.6} color="#ffb347" opacity={0.25 + (i / 8) * 0.6} />;
      })}
    </group>
  );
};

const Dust: React.FC<{ map: THREE.Texture }> = ({ map }) => (
  <group>
    {Array.from({ length: 40 }, (_, i) => (
      <Glow key={i} map={map} at={[(rnd(i) - 0.5) * 22, (rnd(i + 40) - 0.5) * 34, 2 + rnd(i + 80) * 8]} size={0.25 + rnd(i + 9) * 0.35} color="#ffd9a0" opacity={0.25 + rnd(i + 3) * 0.4} />
    ))}
  </group>
);

const Scene: React.FC<{ dist: number; focus: [number, number]; tilt: number; trail?: [number, number]; balanceA: number; escA: number; forkA: number }> = ({ dist, focus, tilt, trail, ...ang }) => {
  const map = useMemo(glowTexture, []);
  const W = 1080 / PX, H = 1920 / PX;
  const jewels: [number, number, number][] = [
    [POS.balance.x, POS.balance.y, 1.4], [POS.fork.x, POS.fork.y, 1.0], [POS.escape.x, POS.escape.y, 0.7], [POS.fourth.x, POS.fourth.y, 0.3], [POS.barrel.x, POS.barrel.y, 0.7],
    [POS.fork.x - 3.6, POS.fork.y - 2.1, 0.9], [POS.fork.x - 0.8, POS.fork.y - 2.5, 0.9],
  ];
  return (
    <AbsoluteFill style={{ imageRendering: "pixelated" }}>
      <div style={{ width: W, height: H, transform: `scale(${PX})`, transformOrigin: "top left" }}>
        <ThreeCanvas width={W} height={H} gl={{ antialias: false }} camera={{ fov: 40, position: [0, 0, 40], near: 0.1, far: 300 }}>
          <color attach="background" args={["#0b0704"]} />
          <ambientLight intensity={0.12} color="#ffb070" />
          <spotLight position={[-10, 16, 22]} angle={0.42} penumbra={0.8} intensity={900} distance={80} decay={2} color="#ffc27a" />
          <pointLight position={[POS.balance.x, POS.balance.y, 4]} intensity={40} distance={14} color="#ff9a3c" />
          <group position={[-focus[0], -focus[1], 40 - dist]}>
            <group rotation={[tilt, 0, 0.08]}>
              <MovementScene look="cinema" tilt={0} {...ang} />
              {jewels.map((j, i) => <Glow key={i} map={map} at={j} size={1.3} color="#ff3355" opacity={0.8} />)}
              {trail && <SwingTrail map={map} from={trail[0]} to={trail[1]} />}
            </group>
          </group>
          <Dust map={map} />
        </ThreeCanvas>
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)" }} />
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ lines: string[]; size?: number; top?: number }> = ({ lines, size = 42, top = 230 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", fontFamily: "PressStart2P", fontSize: size, lineHeight: 1.5, color: "#f6e7c8", textShadow: "0 0 18px rgba(255,170,80,0.45), 4px 4px 0 #000" }}>
    {lines.map((l, i) => <div key={i}>{l}</div>)}
  </div>
);

const Shot0 = () => (
  <AbsoluteFill style={{ background: "#0b0704" }}>
    <Scene dist={30} focus={[0.6, -0.4]} tilt={-0.55} balanceA={0.9} escA={0.3} forkA={0.12} trail={[0.2, 2.4]} />
    <Caption lines={["HOW A WATCH", "TICKS"]} size={64} top={210} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontSize: 54 }}>🎧</div>
  </AbsoluteFill>
);
const Shot1 = () => (
  <AbsoluteFill style={{ background: "#0b0704" }}>
    <Scene dist={13} focus={[-1.2, -1.6]} tilt={-0.4} balanceA={-0.6} escA={0.55} forkA={-0.12} trail={[1.6, 3.6]} />
    <Caption lines={["IT LETS GO", "ONE TOOTH AT A TIME"]} />
  </AbsoluteFill>
);
const Shot2 = () => (
  <AbsoluteFill style={{ background: "#0b0704" }}>
    <Scene dist={22} focus={[2.0, 3.2]} tilt={-0.5} balanceA={2.2} escA={0.1} forkA={0.12} trail={[-0.6, 3.0]} />
    <Caption lines={["8 TIMES", "EVERY SECOND"]} />
  </AbsoluteFill>
);

const SHOTS = [Shot0, Shot1, Shot2];
export const CinematicPreview: React.FC<{ shot: number }> = ({ shot }) => {
  const S = SHOTS[shot] ?? Shot0;
  return <S />;
};
