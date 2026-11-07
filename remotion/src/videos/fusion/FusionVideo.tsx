/**
 * Video 007 · How does fusion power the Sun? — true pixel-art 3D, 48 s seamless loop @ 60 fps, 150 BPM.
 * Sun → cut-away to the core → plasma (protons repel) → the proton-proton chain (p+p→D, D+p→He-3, He-3+He-3→He-4)
 * → mass becomes energy (E = mc²) → fusion storm → a photon random-walks out → light reaches Earth → back to the Sun.
 * Event times from fusion.json (videos/07-fusion/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./fusion.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Pixels, Px, disc, ring, rect, rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const LW = (2 * Math.PI) / EV.duration; // every idle motion uses whole multiples of this (seamless loop)
const BEAT = 60 / EV.bpm;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const stepped = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 3) / 3;

export const SPACE_PALETTE = [
  "#05030a", "#0d0818", "#1a1030", "#2a1a4a", "#3f2a6b", "#5a1010", "#8f1a10", "#c23a10", "#e8621a", "#ff8c1f", "#ffb02e", "#ffd45a",
  "#ffef9a", "#fffbe6", "#ff3b6b", "#b81e4a", "#6b7fa8", "#a9b8d6", "#3ad6ff", "#1f7fa8", "#ff9ad6", "#ffffff", "#2b6bff", "#2fae5a",
];
const BG = "#05030a";

// ---------- shared ----------
const Cam: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
function useAssets() {
  return useMemo(() => {
    const toon = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 220, 220, 220, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
    toon.minFilter = toon.magFilter = THREE.NearestFilter; toon.needsUpdate = true;
    const W = 128, H = 64, d = new Uint8Array(W * H * 4);
    const cols = [[255, 140, 31], [255, 176, 46], [232, 98, 26], [255, 212, 90]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / 4), cy = Math.floor(y / 4), r = rnd(cx * 57 + cy * 13 + ((x + y) % 3 === 0 ? 1 : 0));
      const edge = x % 4 === 0 || y % 4 === 0;
      const c = edge ? [194, 58, 16] : cols[Math.floor(r * 4)];
      d.set([c[0], c[1], c[2], 255], (y * W + x) * 4);
    }
    const sun = new THREE.DataTexture(d, W, H, THREE.RGBAFormat);
    sun.magFilter = sun.minFilter = THREE.NearestFilter; sun.wrapS = THREE.RepeatWrapping; sun.colorSpace = THREE.SRGBColorSpace; sun.needsUpdate = true;
    return { toon, sun, glow: glowTexture() };
  }, []);
}
const Stars: React.FC<{ map: THREE.Texture }> = ({ map }) => (
  <>{Array.from({ length: 90 }, (_, i) => <Glow key={i} map={map} at={[(rnd(i) - 0.5) * 160, (rnd(i + 1) - 0.5) * 200, -60 - rnd(i + 2) * 30]} size={0.5 + rnd(i + 3) * 0.8} color="#fffbe6" opacity={0.5 + 0.5 * rnd(i + 4)} />)}</>
);

// ===================== the Sun (with cut-away) =====================
const SUN_R = 8;
const cutAt = (t: number) => (t < 24 ? ease((t - 3.4) / 1.6) : 1 - ease((t - 42) / 2.5));
const beatPulse = (t: number) => Math.exp(-((t % BEAT) / 0.12));
const Sun: React.FC<{ t: number; cut: number }> = ({ t, cut }) => {
  const a = useAssets();
  a.sun.offset.x = (t / EV.duration) % 1; // surface turns once per loop
  const gap = cut * Math.PI * 0.75;
  const layers: [number, string, boolean][] = [[SUN_R, "#ff8c1f", true], [SUN_R * 0.7, "#e8621a", false], [SUN_R * 0.3, "#fffbe6", false]];
  const pulse = beatPulse(t);
  return (
    <group>
      {layers.map(([r, color, textured], i) => (i === 0 || cut > 0.01) && (
        <mesh key={i} rotation={[0, 0, 0.1]}>
          <sphereGeometry args={[r, 40, 28, Math.PI / 2 + gap / 2, Math.PI * 2 - gap]} />
          <meshToonMaterial color={textured ? "#ffffff" : color} map={textured ? a.sun : null} gradientMap={a.toon} emissive={color} emissiveIntensity={i === 2 ? 1.2 : 0.55} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* solar flares on the limb pulse with the beat */}
      {[0.6, 2.2, 3.9, 5.2].map((ang, i) => (
        <mesh key={i} position={[Math.cos(ang) * SUN_R, Math.sin(ang) * SUN_R, 0]} rotation={[0, 0, ang - Math.PI / 2]} scale={1 + 0.25 * pulse}>
          <torusGeometry args={[1.2 + i * 0.2, 0.22, 6, 18, Math.PI]} /><meshToonMaterial color="#ffb02e" emissive="#ff8c1f" emissiveIntensity={0.9} gradientMap={a.toon} />
        </mesh>
      ))}
    </group>
  );
};
const SunGlow: React.FC<{ t: number; cut: number; map: THREE.Texture }> = ({ t, cut, map }) => (
  <>
    <Glow map={map} at={[0, 0, -2]} size={SUN_R * 3.6} color="#ff8c1f" opacity={0.55} />
    <Glow map={map} at={[0, 0, -1]} size={SUN_R * 2.6} color="#ffd45a" opacity={0.35 + 0.15 * beatPulse(t)} />
    {cut > 0.2 && <Glow map={map} at={[0, 0, 0]} size={SUN_R * 1.0} color="#fffbe6" opacity={0.8 * cut} />}
  </>
);
// photon random walk from the core to the surface (stays in the open wedge, toward the camera)
const WALK: V3[] = (() => {
  const pts: V3[] = [[0, 0, 0.5]];
  for (let k = 1; k < EV.bounces.length; k++) {
    const r = (k / (EV.bounces.length - 1)) * SUN_R * 1.02;
    const a = (rnd(k + 500) - 0.5) * 2.2 + 0.3;
    pts.push([Math.cos(a) * r * 0.55 + (rnd(k + 600) - 0.5) * 1.6, Math.sin(a) * r * 0.55 + (rnd(k + 700) - 0.5) * 1.6, 0.5 + r * 0.6]);
  }
  return pts;
})();
const EARTH: V3 = [30, -6, -12];

// ===================== the plasma =====================
const PLASMA = Array.from({ length: 80 }, (_, i) => ({ b: [(rnd(i + 10) - 0.5) * 30, (rnd(i + 20) - 0.5) * 22, -3 - rnd(i + 30) * 16] as V3, n: [8 + Math.floor(rnd(i + 40) * 10), 9 + Math.floor(rnd(i + 50) * 10), 7 + Math.floor(rnd(i + 60) * 10)], ph: rnd(i + 70) * 6 }));
const plasmaPos = (i: number, t: number): V3 => {
  const p = PLASMA[i];
  return [p.b[0] + 1.6 * Math.sin(p.n[0] * LW * t + p.ph), p.b[1] + 1.4 * Math.sin(p.n[1] * LW * t + p.ph * 2), p.b[2] + 1.2 * Math.cos(p.n[2] * LW * t + p.ph)];
};
const Nucleon: React.FC<{ p: V3; proton: boolean; s?: number }> = ({ p, proton, s = 1 }) => {
  const a = useAssets();
  return (
    <mesh position={p} scale={s}><sphereGeometry args={[0.45, 14, 10]} />
      <meshToonMaterial color={proton ? "#ff3b6b" : "#a9b8d6"} emissive={proton ? "#5a1010" : "#1a1030"} emissiveIntensity={0.6} gradientMap={a.toon} /></mesh>
  );
};
type Part = { p: V3; proton: boolean };
const cluster = (center: V3, kinds: boolean[], spin: number): Part[] => {
  const offs: V3[] = kinds.length === 2 ? [[-0.36, 0, 0], [0.36, 0, 0]] : kinds.length === 3 ? [[-0.38, -0.22, 0], [0.38, -0.22, 0], [0, 0.42, 0]] : [[-0.38, -0.25, -0.2], [0.38, -0.25, -0.2], [0, 0.42, -0.2], [0, 0, 0.42]];
  return kinds.map((proton, i) => {
    const o = offs[i], c = Math.cos(spin), s = Math.sin(spin);
    return { p: [center[0] + o[0] * c - o[2] * s, center[1] + o[1], center[2] + o[0] * s + o[2] * c] as V3, proton };
  });
};
/** The featured reactions at the centre of the stage. Returns nucleons to draw + glows (flashes, neutrino, positron, gamma). */
function stage(t: number): { parts: Part[]; glows: { at: V3; size: number; color: string; o: number }[] } {
  const parts: Part[] = [], glows: { at: V3; size: number; color: string; o: number }[] = [];
  const flash = (at: V3, t0: number, size = 4, color = "#ffd45a") => { const d = t - t0; if (d >= 0 && d < 0.6) { glows.push({ at, size: 0.55 * size * (1 - d / 0.6) + 0.4, color, o: 1 - d / 0.6 }); glows.push({ at, size: 0.25 * size * (1 - d / 0.6) + 0.3, color: "#fffbe6", o: 1 - d / 0.6 }); } };
  const spin = 3 * LW * t;
  // 1) two protons approach and bounce off (they repel)
  if (t >= 7.6 && t < 12) {
    const k = (t - EV.repel);
    const near = 0.75;
    const ap = (side: number): V3 => k < 0 ? [side * (near + (6 - near) * Math.pow(-k / 2.0, 1.4)), side * 0.25, 0] : [side * (near + 4 * Math.pow(k / 2.4, 0.7)), side * (0.25 + 3.2 * Math.pow(k / 2.4, 0.7)), 0];
    parts.push({ p: ap(-1), proton: true }, { p: ap(1), proton: true });
    flash([0, 0, 0.3], EV.repel, 2.2, "#3f2a6b");
  }
  // 2) p + p -> deuterium (+ positron + neutrino)
  if (t >= 12.8 && t < EV.r1) {
    if (t < EV.fuse) {
      const k = ease((t - 12.8) / (EV.fuse - 12.8));
      parts.push({ p: lerp3([-6, 0.3, 0], [-0.36, 0, 0], k), proton: true }, { p: lerp3([6, -0.3, 0], [0.36, 0, 0], k), proton: true });
    } else {
      parts.push(...cluster([0, 0, 0], [true, false], spin));
      const d = t - EV.fuse;
      glows.push({ at: [-0.4 - d * 3, 0.3 + d * 2.4, 0.4], size: 0.9, color: "#ff9ad6", o: 1 });                  // positron
      for (let s = 0; s < 5; s++) glows.push({ at: [d * 14 - s * 0.35, d * 3 - s * 0.07, d * 6], size: 0.7 - s * 0.1, color: "#3ad6ff", o: 1 - s * 0.18 }); // neutrino streak
    }
    flash([0, 0, 0.4], EV.fuse, 6);
  }
  // 3) D + p -> helium-3 (+ gamma ray)
  if (t >= EV.r1 - 1.6 && t < EV.r1 + 1.6) {
    if (t < EV.r1) {
      if (t >= EV.fuse) { /* deuterium already drawn above */ }
      parts.push({ p: lerp3([5, 2.4, 0], [0.4, 0.35, 0], ease((t - (EV.r1 - 1.6)) / 1.6)), proton: true });
    } else {
      const drift = ease((t - EV.r1) / 1.4);
      parts.push(...cluster([-3.4 * drift, 0, 0], [true, true, false], spin));
      const d = t - EV.r1;
      for (let s = 0; s < 8; s++) glows.push({ at: [0.2 + s * 0.15, d * 16 - s * 0.6, 0.6], size: 1.0 - s * 0.08, color: s === 0 ? "#ffffff" : "#ffef9a", o: Math.max(0, 1 - d * 0.8) * (1 - s * 0.1) });
    }
    flash([0, 0.2, 0.4], EV.r1, 6);
  }
  // 4) a second helium-3 forms on the right
  if (t >= EV.r2 && t < EV.r3) {
    const k = t < 19.2 ? 0 : ease((t - 19.2) / (EV.r3 - 19.2));
    parts.push(...cluster(lerp3([-3.4, 0, 0], [-0.5, 0, 0], k), [true, true, false], spin));
    parts.push(...cluster(lerp3([3.4, 0, 0], [0.5, 0, 0], k), [true, true, false], -spin));
  }
  if (t >= EV.r1 + 1.6 && t < EV.r2) parts.push(...cluster([-3.4, 0, 0], [true, true, false], spin));
  flash([3.4, 0, 0.4], EV.r2, 4.5);
  // 5) He-3 + He-3 -> helium-4 + 2 protons
  if (t >= EV.r3 && t < 25.6) {
    parts.push(...cluster([0, 0, 0], [true, true, false, false], spin * 1.5));
    const d = t - EV.r3;
    parts.push({ p: [-1 - d * 3.2, 0.6 + d * 2.2, 0], proton: true }, { p: [1 + d * 3.2, -0.6 - d * 2.2, 0], proton: true });
    glows.push({ at: [0, 0, 0.3], size: 2.6, color: "#ffd45a", o: 0.45 });
  }
  flash([0, 0, 0.4], EV.r3, 8);
  // 6) montage: a fusion on every beat around the stage; 7) the storm: one on every 16th
  EV.montage.forEach((m, k) => flash([(rnd(k + 900) - 0.5) * 14, (rnd(k + 910) - 0.5) * 9, (rnd(k + 920) - 0.5) * 6], m, 3.5));
  EV.storm.forEach((m, k) => flash([(rnd(k + 950) - 0.5) * 30, (rnd(k + 960) - 0.5) * 22, (rnd(k + 970) - 0.5) * 14 - 4], m, 4.5, k % 3 ? "#ffd45a" : "#fffbe6"));
  return { parts, glows };
}

// ===================== the mass → energy diagram (pixel overlay) =====================
const MassDiagram: React.FC<{ t: number }> = ({ t }) => {
  const o = stepped(Math.min((t - 25.6) / 0.3, (32.0 - t) / 0.3));
  if (o <= 0) return null;
  const px: Px[] = [];
  const tiltK = ease((t - 26.0) / 0.8) * 0.12;
  const beamY = (x: number) => 166 + (x - 90) * tiltK;
  for (let x = 30; x <= 150; x++) px.push(rect(x, beamY(x), 1, 2, "#a9b8d6"));
  px.push(rect(88, 166, 4, 30, "#6b7fa8"), rect(76, 196, 28, 3, "#6b7fa8"));
  // left pan: 4 protons; right pan: 1 helium-4 (lighter, so it rises)
  [[34, 1], [42, 1], [50, 1], [38, -1]].forEach(([x], i) => px.push(...disc(x + (i === 3 ? 4 : 0), beamY(42) - 6 - (i === 3 ? 7 : 0), 4, "#ff3b6b"), ...ring(x + (i === 3 ? 4 : 0), beamY(42) - 6 - (i === 3 ? 7 : 0), 4, "#5a1010")));
  [[134, 0, true], [142, 0, true], [138, -7, false], [138, 3, false]].forEach(([x, dy, p]) => px.push(...disc(x as number, beamY(138) - 8 + (dy as number), 4, p ? "#ff3b6b" : "#a9b8d6")));
  const showE = t >= 28.8;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <AbsoluteFill style={{ background: "rgba(5,3,10,0.7)" }} />
      <svg viewBox="0 0 180 320" width={1080} height={1920} shapeRendering="crispEdges" style={{ position: "absolute" }}>
        <Pixels px={px} />
        <text x={42} y={176} fontFamily="PressStart2P" fontSize={4} fill="#fffbe6" textAnchor="middle" dominantBaseline="hanging">4 × 1.008</text>
        <text x={42} y={184} fontFamily="PressStart2P" fontSize={5} fill="#ff3b6b" textAnchor="middle" dominantBaseline="hanging">4.032</text>
        <text x={138} y={132} fontFamily="PressStart2P" fontSize={4} fill="#fffbe6" textAnchor="middle" dominantBaseline="hanging">HELIUM</text>
        <text x={138} y={140} fontFamily="PressStart2P" fontSize={5} fill="#ffd45a" textAnchor="middle" dominantBaseline="hanging">4.003</text>
        <text x={90} y={206} fontFamily="PressStart2P" fontSize={6} fill="#3ad6ff" textAnchor="middle" dominantBaseline="hanging">−0.7% MASS</text>
        {showE && <text x={90} y={226} fontFamily="PressStart2P" fontSize={16} fill="#ffd45a" textAnchor="middle" dominantBaseline="hanging">E=mc²</text>}
      </svg>
    </AbsoluteFill>
  );
};

// ===================== camera =====================
const SUN_HOME = { p: [0, -3, 46] as V3, l: [0, 3.8, 0] as V3 };
const SUN_CAM: CamKey[] = [
  { t: 0, ...SUN_HOME }, { t: 1.4, ...SUN_HOME },
  { t: 3.4, p: [2.5, -1, 36], l: [0, 2.2, 0] },
  { t: 5.0, p: [3.5, 1, 20], l: [0, 0, 0] },
  { t: 6.4, p: [1.0, 0.3, 6.5], l: [0, 0, 0] },        // dive into the core
  { t: 36.8, p: [4, 1.5, 28], l: [0, 1, 0] },          // back out: the photon's long walk
  { t: 40.0, p: [12, 2, 44], l: [10, -1.5, -4] },      // the Sun and the Earth
  { t: 42.6, p: [5, 0, 40], l: [2, 1.5, 0] },
  { t: 45.6, ...SUN_HOME }, { t: 48, ...SUN_HOME },
];
const PLASMA_CAM: CamKey[] = [
  { t: 6.4, p: [0, 3, 24], l: [0, 0, 0] },
  { t: 8.6, p: [0, 1.2, 12], l: [0, 0, 0] },
  { t: 11.2, p: [1.2, 1.4, 10.5], l: [0, 0.4, 0] },
  { t: 13.6, p: [0, 0.7, 8.6], l: [0, 0, 0] },
  { t: 16.4, p: [-0.6, 1.0, 8.4], l: [0, 0.2, 0] },
  { t: 19.4, p: [0, 2.2, 10.5], l: [0, 0, 0] },
  { t: 22.4, p: [2, 2, 12.5], l: [0, 0, 0] },
  { t: 25.6, p: [0, 1, 16], l: [0, 0, 0] },
  { t: 29, p: [-2, 2, 14], l: [0, 0, 0] },
  { t: 32, p: [0, 5, 27], l: [0, 0, 0] },
  { t: 36.8, p: [0, 8, 40], l: [0, 0, -2] },
];
const sceneAt = (t: number) => (t < 6.4 || t >= 36.8 ? "sun" : "plasma");
const flashAt = (t: number) => Math.max(...[6.4, 36.8].map((s) => Math.exp(-(((t - s) / 0.14) ** 2))));

// ===================== captions =====================
type Cue = { t: number; a?: string; b: string; c?: string };
const OUT = "4px 4px 0 #05030a, -4px 0 0 #05030a, 0 -4px 0 #05030a, 4px 0 0 #05030a, 0 4px 0 #05030a";
const CUES: Cue[] = [
  { t: 2.4, a: "THE SUN IS", b: "NOT", c: "ON FIRE" },
  { t: 4.8, a: "DEEP IN ITS CORE", b: "15,000,000°C" },
  { t: 6.6, a: "SO HOT THAT ATOMS", b: "FALL APART", c: "INTO BARE PROTONS" },
  { t: 8.4, a: "PROTONS ARE POSITIVE", b: "THEY REPEL", c: "EACH OTHER" },
  { t: 11.2, a: "BUT IT'S SO HOT", b: "AND CROWDED", c: "THEY SLAM TOGETHER" },
  { t: 12.8, a: "ONCE IN A WHILE", b: "THEY TOUCH..." },
  { t: 14.4, a: "2 PROTONS FUSE", b: "DEUTERIUM", c: "+ A GHOSTLY NEUTRINO" },
  { t: 16.0, a: "ADD A PROTON", b: "HELIUM-3", c: "+ A FLASH OF LIGHT" },
  { t: 17.6, a: "IT HAPPENS", b: "AGAIN" },
  { t: 19.2, a: "TWO HELIUM-3", b: "COLLIDE" },
  { t: 20.8, a: "= HELIUM-4", b: "HELIUM-4", c: "+ 2 PROTONS SET FREE" },
  { t: 22.4, a: "4 PROTONS IN", b: "1 HELIUM", c: "OUT" },
  { t: 25.6, a: "BUT THE HELIUM IS", b: "0.7%", c: "LIGHTER" },
  { t: 27.2, a: "THE MISSING MASS", b: "BECOMES", c: "ENERGY" },
  { t: 28.8, a: "EINSTEIN:", b: "E = mc²" },
  { t: 30.4, a: "TINY MASS", b: "HUGE", c: "ENERGY" },
  { t: 32.0, a: "THE SUN FUSES", b: "600 MILLION", c: "TONNES EVERY SECOND" },
  { t: 33.6, a: "AND TURNS", b: "4 MILLION", c: "TONNES OF IT INTO ENERGY" },
  { t: 35.2, a: "EVERY", b: "SECOND" },
  { t: 36.8, a: "THAT LIGHT BOUNCES", b: "THOUSANDS", c: "OF YEARS TO GET OUT" },
  { t: 40.0, a: "THEN REACHES EARTH IN", b: "8 MINUTES" },
  { t: 41.6, a: "EVERY SUNBEAM", b: "STARTED", c: "AS FUSION" },
  { t: 43.2, a: "@HOWTOWITHZAY", b: "NOW YOU", c: "KNOW." },
  { t: 45.6, b: "" },
];
const CapBlock: React.FC<{ cue: Omit<Cue, "t">; o: number }> = ({ cue, o }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color: "#fffbe6", opacity: o, textShadow: OUT, lineHeight: 1.5 }}>
    {cue.a && <div style={{ fontSize: 32 }}>{cue.a}</div>}
    <div style={{ fontSize: 64, lineHeight: 1.3, color: "#ffd45a" }}>{cue.b}</div>
    {cue.c && <div style={{ fontSize: 32 }}>{cue.c}</div>}
  </div>
);

// ===================== composition =====================
export const FusionVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const a = useAssets();
  const sc = sceneAt(t);
  const cam = sc === "sun" ? camAt(SUN_CAM, t) : camAt(PLASMA_CAM, t);
  const cut = cutAt(t);
  const st = sc === "plasma" ? stage(t) : null;
  const walkK = t >= 36.8 && t < 41.6 ? EV.bounces.filter((b) => b <= t).length : 0;
  const tag = sc === "sun" ? (t < 3.4 || t > 43 ? "☀ THE SUN · 1.4 MILLION KM WIDE" : t < 36.8 ? "☀ CORE · 15,000,000°C" : "☀ THE LONG WAY OUT") : t < 32 ? "⌕ INSIDE THE CORE · SLOW-MO" : "⌕ INSIDE THE CORE · REAL SPEED";
  let ci = -1; CUES.forEach((c, i) => { if (t >= c.t) ci = i; });
  const cue = ci >= 0 ? CUES[ci] : null;
  const nextT = ci + 1 < CUES.length ? CUES[ci + 1].t : 99;
  const cueO = cue ? stepped(Math.min((t - cue.t) / 0.25, (nextT - t) / 0.25)) : 0;
  const hook = t < 2.4 ? stepped((2.4 - t) / 0.3) : stepped((t - 46.4) / 0.5);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/07-fusion/music.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={SPACE_PALETTE} outlineColor="#05030a">
        <Cam p={cam.p} l={cam.l} />
        <Stars map={a.glow} />
        {sc === "sun" ? (
          <>
            <ambientLight intensity={0.4} color="#3f2a6b" />
            <directionalLight position={[-10, 12, 16]} intensity={1.6} color="#ffd45a" />
            <Sun t={t} cut={cut} />
            <SunGlow t={t} cut={cut} map={a.glow} />
            {walkK > 0 && WALK.slice(0, walkK).map((p, k) => <Glow key={k} map={a.glow} at={p} size={k === walkK - 1 ? 1.6 : 0.55} color={k === walkK - 1 ? "#ffffff" : "#ffef9a"} opacity={k === walkK - 1 ? 1 : 0.4 + 0.6 * (k / walkK)} />)}
            {t >= 38 && (
              <group>
                <mesh position={EARTH}><sphereGeometry args={[1.3, 20, 14]} /><meshToonMaterial color="#2b6bff" gradientMap={a.toon} /></mesh>
                <mesh position={[EARTH[0] - 0.4, EARTH[1] + 0.4, EARTH[2] + 0.9]}><sphereGeometry args={[0.6, 10, 8]} /><meshToonMaterial color="#2fae5a" gradientMap={a.toon} /></mesh>
              </group>
            )}
            {t >= EV.beam && t < 43 && Array.from({ length: 14 }, (_, k) => {
              const u = ((t - EV.beam) * 0.9 + k / 14) % 1;
              return <Glow key={`b${k}`} map={a.glow} at={lerp3([SUN_R * 0.9, -1.2, -1], EARTH, u)} size={0.9} color="#fffbe6" opacity={0.9} />;
            })}
          </>
        ) : (
          <>
            <ambientLight intensity={0.45} color="#3f2a6b" />
            <directionalLight position={[-6, 10, 12]} intensity={1.8} color="#ffd45a" />
            <pointLight position={[0, 0, 4]} intensity={25} distance={14} color="#ff8c1f" />
            {PLASMA.map((_, i) => <Nucleon key={i} p={plasmaPos(i, t)} proton s={0.8} />)}
            {Array.from({ length: 50 }, (_, i) => (
              <Glow key={`e${i}`} map={a.glow} at={[(rnd(i + 300) - 0.5) * 28 + 1.5 * Math.sin((20 + (i % 9)) * LW * t + i), (rnd(i + 310) - 0.5) * 20 + 1.5 * Math.cos((22 + (i % 7)) * LW * t + i), (rnd(i + 320) - 0.5) * 16 - 4]} size={0.4} color="#3ad6ff" opacity={0.8} />
            ))}
            <Glow map={a.glow} at={[0, 0, -20]} size={40} color="#8f1a10" opacity={0.22} />
            {st!.parts.map((p, i) => <Nucleon key={`s${i}`} p={p.p} proton={p.proton} />)}
            {st!.glows.map((g, i) => <Glow key={`g${i}`} map={a.glow} at={g.at} size={g.size} color={g.color} opacity={g.o} />)}
          </>
        )}
      </PixelArtCanvas>
      <MassDiagram t={t} />
      <AbsoluteFill style={{ background: "#fffbe6", opacity: stepped(flashAt(t)) }} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: "#fffbe6", textShadow: OUT }}>{tag}</div>
      {cue && cue.b && <CapBlock cue={cue} o={cueO} />}
      {hook > 0 && <CapBlock cue={{ a: "HOW DOES", b: "FUSION", c: "POWER THE SUN? 🎧" }} o={hook} />}
    </AbsoluteFill>
  );
};
