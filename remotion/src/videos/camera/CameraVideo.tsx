/**
 * Video 013 · How does a camera take a photo? — true pixel-art 3D, 30 s seamless loop @ 60 fps, 128 BPM phonk.
 * One scene at a time, one smooth camera: hero shot of a camera on a table, flashing on the snares → glide + dive into
 * the lens → inside: the lens makes a tiny upside-down image (rays cross at the aperture) → the shutter opens on the
 * snares → the sensor cells fill up on the cowbell (the drop) → red/green/blue filters → out through the back: the
 * photo appears on the screen → orbit back to the hero shot (loop). Timing from camera.json (videos/13-camera/build.py).
 */
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./camera.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar, S16 = BAR / 16;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };

export const CAM_PALETTE = [
  "#07080c", "#12141c", "#1e2230", "#2e3446", "#4a5268", "#7a849e", "#b4bccf", "#e8ecf4", "#ffffff",
  "#2a1a10", "#4a2e1a", "#7a4a24", "#b0763a", "#e0a860",
  "#0e2a4a", "#1f5a8a", "#4aa0e0", "#a8e0ff",
  "#6a0e14", "#c8202a", "#ff5a4a", "#ff9a8a",
  "#1f6a2a", "#4ac04a", "#a8f07a",
  "#2040c0", "#4a7aff", "#ffd23f", "#fff2a8",
];
const BG_ROOM = "#2a1a10", BG_IN = "#07080c";

// ---------------- the photo (an apple) ----------------
const C = (h: string) => new THREE.Color(h);
function photoPix(u: number, v: number, asp = 1.5): THREE.Color {
  const k = asp < 1 ? asp / 1.05 : 1;                                   // shrink the apple to fit a portrait frame
  const X = ((u - 0.5) * asp) / k, Y = (v - 0.5) / k;
  const ax = X / 0.36, ay = (Y - 0.07) / 0.32, r = ax * ax + ay * ay;
  if (Math.abs(X) < 0.035 && Y > -0.34 && Y < -0.22) return C("#4a2e1a");
  const lx = (X - 0.15) / 0.15, ly = (Y + 0.3) / 0.055; if (lx * lx + ly * ly < 1) return C("#4ac04a");
  if (r < 1) return C(ax + ay < -0.7 ? "#ff5a4a" : ax + ay > 0.9 ? "#6a0e14" : "#c8202a");
  if (v > 0.82) return C("#7a4a24");
  return C(v < 0.4 ? "#4a2e1a" : "#2a1a10");
}
const GW = 8, GH = 12, CELL = 0.24, SENSOR_Z = -7.3, CURTAIN_Z = -6.95, APERTURE_Z = -1.9; // a portrait sensor, like a phone
/** sensor cell (col, row) → its colour: the image lands upside down */
const cellPix = (c: number, r: number) => photoPix((c + 0.5) / GW, (r + 0.5) / GH, GW / GH);
const cellXY = (c: number, r: number): [number, number] => [(c - (GW - 1) / 2) * CELL, ((GH - 1) / 2 - r) * CELL];
const bayer = (c: number, r: number) => (r % 2 === 0 ? (c % 2 === 0 ? 1 : 0) : (c % 2 === 0 ? 2 : 1)); // 0 R, 1 G, 2 B
const FILTER = ["#c8202a", "#4ac04a", "#2040c0"];

function useAssets() {
  return useMemo(() => {
    const toon = new THREE.DataTexture(new Uint8Array([80, 80, 80, 255, 160, 160, 160, 255, 225, 225, 225, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
    toon.minFilter = toon.magFilter = THREE.NearestFilter; toon.needsUpdate = true;
    const tex = (W: number, H: number, f: (x: number, y: number) => number, rx = 1, ry = 1) => {
      const d = new Uint8Array(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = f(x, y); d.set([v, v, v, 255], (y * W + x) * 4); }
      const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; return t;
    };
    const leather = tex(16, 16, (x, y) => ((x * 7 + y * 5) % 9 === 0 ? 150 : (x + y * 3) % 5 === 0 ? 205 : 235), 3, 3);
    const knurl = tex(32, 4, (x) => (x % 2 === 0 ? 150 : 245), 4, 1);
    const wood = tex(32, 32, (x, y) => 200 + 40 * Math.sin(y * 0.9 + Math.sin(x * 0.3) * 2) * (((x * 3 + y) % 11) === 0 ? 0.3 : 1), 4, 2);
    // the back-screen photo (24x16), revealed scan-line by scan-line
    const PW = 24, PH = 16, pd = new Uint8Array(PW * PH * 4);
    const photo = new THREE.DataTexture(pd, PW, PH, THREE.RGBAFormat); photo.magFilter = photo.minFilter = THREE.NearestFilter; photo.colorSpace = THREE.SRGBColorSpace;
    return { toon, leather, knurl, wood, photo, PW, PH, glow: glowTexture() };
  }, []);
}
const Toon: React.FC<{ c: string; map?: THREE.Texture | null; e?: number }> = ({ c, map, e = 0 }) => {
  const a = useAssets();
  return <meshToonMaterial color={c} map={map ?? null} gradientMap={a.toon} emissive={c} emissiveIntensity={e} />;
};
const RB: React.FC<{ s: V3; p: V3; r?: number; c: string; map?: THREE.Texture; e?: number }> = ({ s, p, r = 0.15, c, map, e }) => {
  const g = useMemo(() => new RoundedBoxGeometry(s[0], s[1], s[2], 3, r), [s[0], s[1], s[2], r]);
  return <mesh geometry={g} position={p}><Toon c={c} map={map} e={e} /></mesh>;
};
const Ring: React.FC<{ z: number; r: number; len: number; c: string; map?: THREE.Texture; e?: number }> = ({ z, r, len, c, map, e }) => (
  <mesh position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r, r, len, 32]} /><Toon c={c} map={map} e={e} /></mesh>
);

// ---------------- timing helpers ----------------
const flashK = (t: number) => { const k = Math.max(0, ...EV.flashes.map((f) => (t >= f ? Math.exp(-(t - f) / 0.09) : 0))); return k < 0.03 ? 0 : k; };
/** cells fill from the centre outwards (the apple appears first), 4 cells per cowbell hit */
const ORDER = Array.from({ length: 96 }, (_, k) => k).sort((p, q) => { const d = (k: number) => Math.hypot((k % 8) - 3.5, Math.floor(k / 8) - 5.5); return d(p) - d(q) || p - q; });
const RANK = ORDER.reduce((m, k, i) => { m[k] = i; return m; }, {} as Record<number, number>);
const cellLit = (k: number) => EV.cells[Math.floor(RANK[k] / 4)] ?? 1e9;
const IN = b(8), OUT = b(12), FADE = 0.28;                       // inside = the sensor close-up
const inside = (t: number) => t >= IN && t < OUT;
/** shutter curtains: c1 covers the sensor, opens downward on the snare; c2 drops to close; then both reset */
function curtains(t: number): [number, number] {
  if (t >= b(8) && t < OUT) return [-3.6, 3.6];                                // open: we look at the sensor
  let c1 = 0, c2 = 3.6;
  for (const [o, c] of EV.shutter) {
    if (t >= o && t < c) { c1 = -3.6 * ease((t - o) / 0.07); }
    else if (t >= c && t < c + 0.3) { c1 = -3.6 + 3.6 * ease((t - c - 0.12) / 0.12); c2 = 3.6 - 3.6 * ease((t - c) / 0.07) + 3.6 * ease((t - c - 0.2) / 0.1); }
  }
  return [c1, c2];
}
const shutterOpen = (t: number) => EV.shutter.some(([o, c]) => t >= o && t < c);

// ---------------- the camera (outside) ----------------
const LENS_FRONT = 2.2;
// ---------------- the cutaway: the near half of the camera is sliced off so we see inside ----------------
const APPLE: V3 = [0, -0.64, 5.2];
const CUT = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10);
const cutOpen = (t: number) => (t < b(4) ? 0 : t < b(13) ? ease((t - b(4)) / 0.7) : 1 - ease((t - b(13)) / 0.6));
const ClipOn: React.FC = () => { const { gl } = useThree(); gl.localClippingEnabled = true; return null; };
const SHUT_Z = 0.28, SENS_Z = -0.1, BOARD_Z = -0.3, CHIP: V3 = [0, -0.2, -0.4];
const bladeY = (t: number) => { let y = 0; for (const [o, c] of EV.shutter) if (t >= o && t < c + 0.1) y = -1.25 * (ease((t - o) / 0.07) - ease((t - c) / 0.07)); return y; };
const hl = (t: number, from: number, to: number) => (t >= from && t < to ? 0.5 + 0.5 * Math.sin(t * 8) : 0);
const along = (pts: V3[], u: number): V3 => {
  const L: number[] = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); L.push(d); tot += d; }
  let s = u * tot;
  for (let i = 1; i < pts.length; i++) { if (s <= L[i - 1]) { const k = s / L[i - 1]; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, pts[i - 1][2] + (pts[i][2] - pts[i - 1][2]) * k]; } s -= L[i - 1]; }
  return pts[pts.length - 1];
};
/** light from the apple: into the lens (bars 2-3), then focused onto the shutter, or the sensor while the door is open */
const Light: React.FC<{ t: number }> = ({ t }) => {
  const a = useAssets();
  if (t < b(2) || t >= b(8)) return null;
  const opened = cutOpen(t) > 0.5, through = EV.shutter.some(([o, c]) => t >= o + 0.03 && t < c);
  return <>{Array.from({ length: 8 }, (_, i) => {
    const yl = -0.5 + (i / 7) * 1.0, ya = APPLE[1] + 0.55 - (i / 7) * 0.9;
    const pts: V3[] = [[0, ya, APPLE[2] - 0.7], [0, yl, LENS_FRONT]];
    if (opened) pts.push(through ? [0, -0.45 * yl + 0.05, SENS_Z + 0.04] : [0, -0.45 * yl + 0.05, SHUT_Z + 0.05]);
    return Array.from({ length: 4 }, (_, k) => <Glow key={`${i}-${k}`} map={a.glow} at={along(pts, (k / 4 + t * 0.8 + i * 0.11) % 1)} size={0.22} color={i % 3 === 0 ? "#4ac04a" : i % 3 === 1 ? "#ff5a4a" : "#fff2a8"} opacity={0.95} />);
  })}</>;
};
const Interior: React.FC<{ t: number }> = ({ t }) => {
  const a = useAssets();
  const by = bladeY(t), lit = EV.shutter.some(([o, c]) => t >= o + 0.03 && t < c + 0.15);
  const hLens = hl(t, b(4), b(6)), hShut = hl(t, b(6), b(8)), hChip = hl(t, b(12), b(13.5));
  return (
    <group>
      {/* the lens: three glass elements */}
      {[2.0, 1.5, 1.0].map((z, i) => <mesh key={i} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.74 - i * 0.06, 0.74 - i * 0.06, 0.12, 24]} /><Toon c="#a8e0ff" e={0.15 + 0.6 * hLens} /></mesh>)}
      {/* the shutter: a tiny door (rails + a blade that drops on the snare) */}
      <mesh position={[0, 0.72, SHUT_Z]}><boxGeometry args={[1.5, 0.12, 0.14]} /><Toon c="#4a5268" /></mesh>
      <mesh position={[0, -0.72, SHUT_Z]}><boxGeometry args={[1.5, 0.12, 0.14]} /><Toon c="#4a5268" /></mesh>
      <mesh position={[0, by, SHUT_Z]}><boxGeometry args={[1.4, 1.3, 0.05]} /><Toon c={hShut > 0 ? "#ffd23f" : "#7a849e"} e={0.3 * hShut} /></mesh>
      {/* the sensor chip on its board, and the processor chip behind */}
      <mesh position={[0, 0.05, SENS_Z - 0.02]}><boxGeometry args={[1.45, 1.15, 0.04]} /><Toon c="#ffd23f" /></mesh>
      <mesh position={[0, 0.05, SENS_Z + 0.02]}><boxGeometry args={[1.25, 0.95, 0.04]} /><Toon c={lit ? "#fff2a8" : "#2040c0"} e={lit ? 1.0 : 0.25} /></mesh>
      {lit && <Glow map={a.glow} at={[0, 0.05, SENS_Z + 0.2]} size={1.8} color="#fff2a8" opacity={0.8} />}
      <mesh position={[0, 0.05, BOARD_Z]}><boxGeometry args={[1.6, 1.4, 0.05]} /><Toon c="#1f6a2a" /></mesh>
      <mesh position={CHIP}><boxGeometry args={[0.5, 0.5, 0.1]} /><Toon c="#12141c" /></mesh>
      {[-0.18, -0.06, 0.06, 0.18].map((d) => <React.Fragment key={d}><mesh position={[d, CHIP[1] + 0.29, CHIP[2]]}><boxGeometry args={[0.05, 0.08, 0.04]} /><Toon c="#ffd23f" /></mesh><mesh position={[d, CHIP[1] - 0.29, CHIP[2]]}><boxGeometry args={[0.05, 0.08, 0.04]} /><Toon c="#ffd23f" /></mesh></React.Fragment>)}
      {hChip > 0 && <Glow map={a.glow} at={[CHIP[0], CHIP[1], CHIP[2] - 0.1]} size={1.2 + 0.6 * hChip} color="#ffd23f" opacity={0.8} />}
      {/* the photo travels: sensor -> chip -> screen */}
      {t >= b(12) && t < b(13.6) && Array.from({ length: 8 }, (_, k) => <Glow key={`d${k}`} map={a.glow} at={along([[0, 0.05, SENS_Z], [CHIP[0], CHIP[1], CHIP[2]], [-0.3, 0.12, -0.6]], (k / 8 + t * 1.2) % 1)} size={0.16} color="#ffd23f" opacity={0.95} />)}
    </group>
  );
};
type Tag = { txt: string; at: V3; from: number; col: string };
const TAGS: Tag[] = [
  { txt: "LENS", at: [0, 1.0, 1.55], from: b(4) + 0.4, col: "#4aa0e0" },
  { txt: "SHUTTER", at: [0, -0.95, SHUT_Z], from: b(6), col: "#ffd23f" },
  { txt: "SENSOR", at: [0, 0.95, SENS_Z], from: b(6) + 0.5, col: "#e8ecf4" },
  { txt: "CHIP", at: [CHIP[0], CHIP[1] - 0.5, CHIP[2]], from: b(12), col: "#ffd23f" },
];
const Tags: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => {
  if (inside(t) || cutOpen(t) < 0.85) return null;
  return <>{TAGS.filter((g) => t >= g.from).map((g) => { const [x, y] = project(g.at, cam); return (
    <div key={g.txt} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -100%)", fontFamily: "PressStart2P", fontSize: 30, color: "#ffffff", background: "rgba(5,6,10,0.9)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #000", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>;
};

const CameraBody: React.FC<{ t: number }> = ({ t }) => {
  const a = useAssets();
  const ref = useRef<THREE.Group>(null);
  const co = cutOpen(t);
  CUT.constant = co > 0.001 ? 2.0 - 2.0 * co : 10;
  useLayoutEffect(() => { ref.current?.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && !m.clippingPlanes?.length) { m.clippingPlanes = [CUT]; m.side = THREE.DoubleSide; m.needsUpdate = true; } }); });
  const fk = flashK(t);
  // reveal the back-screen photo on the cowbell hits of bars 12-13 (scan lines)
  const hits = EV.screen.filter((s) => t >= s).length;
  const px = t >= b(13) && t < b(14.5) ? Math.round((hits / EV.screen.length) * a.PW * a.PH) : 0;
  const d = a.photo.image.data as Uint8Array;
  for (let i = 0; i < a.PW * a.PH; i++) {
    const x = i % a.PW, y = Math.floor(i / a.PW);
    const c = i < px ? photoPix((x + 0.5) / a.PW, (y + 0.5) / a.PH) : C("#07080c");
    const s = c.clone().convertLinearToSRGB();
    d.set([s.r * 255, s.g * 255, s.b * 255, 255], ((a.PH - 1 - y) * a.PW + x) * 4);
  }
  a.photo.needsUpdate = true;
  return (
    <group ref={ref}>
      <RB s={[3.4, 2.1, 1.3]} p={[0, 0.15, 0]} r={0.22} c="#1e2230" map={a.leather} />
      <RB s={[3.44, 0.42, 1.34]} p={[0, 1.08, 0]} r={0.14} c="#7a849e" />
      {/* viewfinder hump */}
      <mesh position={[0, 1.55, -0.05]} rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0.52, 0.78, 0.6, 4]} /><Toon c="#2e3446" /></mesh>
      {/* flash on the hot shoe */}
      <RB s={[0.7, 0.35, 0.55]} p={[0, 2.0, -0.05]} r={0.08} c="#12141c" />
      <RB s={[1.15, 0.6, 0.8]} p={[0, 2.45, 0.02]} r={0.1} c="#1e2230" />
      <mesh position={[0, 2.45, 0.43]}><planeGeometry args={[0.95, 0.42]} /><meshToonMaterial color="#e8ecf4" emissive="#ffffff" emissiveIntensity={0.15 + 1.5 * fk} gradientMap={a.toon} /></mesh>
      {/* grip */}
      <RB s={[0.75, 2.0, 1.75]} p={[1.42, 0.1, 0.22]} r={0.3} c="#12141c" map={a.leather} />
      <mesh position={[1.42, 1.3, 0.55]}><cylinderGeometry args={[0.2, 0.2, 0.12, 16]} /><Toon c="#c8202a" e={0.2} /></mesh>
      <mesh position={[-1.0, 1.36, 0]}><cylinderGeometry args={[0.36, 0.36, 0.2, 24]} /><Toon c="#4a5268" map={a.knurl} /></mesh>
      <mesh position={[-1.25, 0.85, 0.67]}><sphereGeometry args={[0.07, 8, 6]} /><Toon c="#c8202a" e={0.4} /></mesh>
      {[-1.72, 1.82].map((x) => <mesh key={x} position={[x, 0.85, 0]}><boxGeometry args={[0.12, 0.25, 0.3]} /><Toon c="#7a849e" /></mesh>)}
      {/* lens: mount, focus ring (knurled), zoom ring, front ring, glass */}
      <Ring z={0.72} r={1.02} len={0.16} c="#b4bccf" />
      <Ring z={1.12} r={0.98} len={0.64} c="#12141c" map={a.knurl} />
      <Ring z={1.72} r={0.95} len={0.55} c="#1e2230" />
      <Ring z={1.86} r={0.97} len={0.05} c="#c8202a" e={0.2} />
      <Ring z={2.1} r={0.9} len={0.22} c="#2e3446" />
      <mesh position={[0, 0, LENS_FRONT + 0.01]}><circleGeometry args={[0.78, 32]} /><Toon c="#0e2a4a" e={0.1} /></mesh>
      <mesh position={[0, 0, LENS_FRONT + 0.02]}><ringGeometry args={[0.45, 0.52, 32]} /><meshBasicMaterial color="#1f5a8a" /></mesh>
      <mesh position={[0, 0, LENS_FRONT + 0.02]}><ringGeometry args={[0.2, 0.24, 32]} /><meshBasicMaterial color="#4aa0e0" /></mesh>
      <Glow map={a.glow} at={[-0.3, 0.32, LENS_FRONT + 0.05]} size={0.35} color="#ffffff" opacity={0.9} />
      <Glow map={a.glow} at={[0.25, -0.2, LENS_FRONT + 0.05]} size={0.18} color="#a8e0ff" opacity={0.7} />
      {/* back: screen with the photo, buttons, eyepiece */}
      <mesh position={[-0.3, 0.12, -0.662]} rotation={[0, Math.PI, 0]}><planeGeometry args={[2.3, 1.45]} /><meshBasicMaterial map={a.photo} /></mesh>
      <mesh position={[-0.3, 0.12, -0.658]} rotation={[0, Math.PI, 0]}><planeGeometry args={[2.45, 1.6]} /><meshBasicMaterial color="#07080c" /></mesh>
      <RB s={[0.6, 0.45, 0.3]} p={[0, 1.45, -0.6]} r={0.1} c="#12141c" />
      {[[1.2, 0.6], [1.2, 0.15], [1.2, -0.3]].map(([x, y], i) => <mesh key={i} position={[x, y, -0.68]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.06, 12]} /><Toon c="#4a5268" /></mesh>)}
      {/* mini tripod */}
      <mesh position={[0, -0.95, 0]}><cylinderGeometry args={[0.25, 0.3, 0.2, 12]} /><Toon c="#2e3446" /></mesh>
      {[0, 2.1, 4.2].map((ang, i) => { const x = Math.cos(ang) * 0.9, z = Math.sin(ang) * 0.9; return <mesh key={i} position={[x / 2, -1.15, z / 2]} rotation={[z * 0.45, 0, -x * 0.45]}><cylinderGeometry args={[0.06, 0.06, 0.55, 6]} /><Toon c="#4a5268" /></mesh>; })}
      {/* the flash burst */}
      {fk > 0.02 && <><Glow map={a.glow} at={[0, 2.45, 0.9]} size={2 + 6 * fk} color="#ffffff" opacity={fk} /><pointLight position={[0, 2.45, 1.5]} intensity={40 * fk} distance={20} color="#ffffff" /></>}
    </group>
  );
};

const BOKEH = Array.from({ length: 22 }, (_, i) => ({ p: [(rnd(i + 40) - 0.5) * 30, 0.5 + rnd(i + 41) * 9, -9 - rnd(i + 42) * 4] as V3, s: 0.6 + rnd(i + 43) * 1.4, c: ["#ffd23f", "#e0a860", "#fff2a8", "#b0763a"][i % 4] }));
const Room: React.FC<{ t: number }> = ({ t }) => {
  const a = useAssets();
  return (
    <group>
      <mesh position={[0, -1.5, 0]}><boxGeometry args={[34, 0.4, 18]} /><Toon c="#7a4a24" map={a.wood} /></mesh>
      <mesh position={[0, 4, -12]}><planeGeometry args={[60, 20]} /><Toon c="#2a1a10" /></mesh>
      {BOKEH.map((k, i) => <Glow key={i} map={a.glow} at={k.p} size={k.s * (1 + 0.12 * Math.sin(3 * LW * t + i))} color={k.c} opacity={0.5} />)}
      {/* the apple being photographed */}
      <group position={APPLE}>
        <mesh scale={[1, 0.92, 1]}><sphereGeometry args={[0.72, 18, 14]} /><Toon c="#c8202a" /></mesh>
        <mesh position={[0, 0.72, 0]} rotation={[0, 0, 0.2]}><cylinderGeometry args={[0.04, 0.05, 0.3, 6]} /><Toon c="#4a2e1a" /></mesh>
        <mesh position={[0.22, 0.78, 0]} rotation={[0, 0, -0.5]} scale={[0.3, 0.1, 0.16]}><sphereGeometry args={[1, 10, 6]} /><Toon c="#4ac04a" /></mesh>
      </group>
      {/* a little plant in the back for depth */}
      <group position={[5.5, -1.3, -4]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.6, 0.45, 1, 12]} /><Toon c="#b0763a" /></mesh>
        {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[Math.cos(i) * 0.5, 1.6 + (i % 3) * 0.4, Math.sin(i) * 0.4]} rotation={[0.3, i, 0.6 + 0.05 * Math.sin(2 * LW * t + i)]} scale={[0.7, 0.2, 0.35]}><sphereGeometry args={[1, 8, 6]} /><Toon c={i % 2 ? "#1f6a2a" : "#4ac04a"} /></mesh>)}
      </group>
    </group>
  );
};

// ---------------- inside the camera ----------------
const SPARKS = Array.from({ length: 30 }, (_, i) => { const c = (i * 3 + 1) % GW, r = (i * 5 + 2) % GH; return { c, r, col: "#" + cellPix(c, r).getHexString() }; });
const Inside: React.FC<{ t: number }> = ({ t }) => {
  const a = useAssets();
  const [c1, c2] = curtains(t);
  const filt = ease((t - b(10)) / 0.35);
  const open = shutterOpen(t);
  const showImage = t < b(8) && !open;
  return (
    <group>
      {/* the focused light: coloured sparks fly in from all around and land on their spot of the image */}
      {SPARKS.map((R, i) => {
        const [ex, ey] = cellXY(R.c, R.r), end = t >= b(8) || open ? SENSOR_Z + 0.15 : CURTAIN_Z + 0.04;
        const ang = i * 2.4, S: V3 = [Math.cos(ang) * 2.6, Math.sin(ang) * 3.4, -2.7];
        return Array.from({ length: 3 }, (_, k) => {
          const u = (k / 3 + t * 0.9 + i * 0.37) % 1, e = u * u;
          const P: V3 = [S[0] + (ex - S[0]) * e, S[1] + (ey - S[1]) * e, S[2] + (end - S[2]) * u];
          if (t >= b(8) && P[2] > -4.6) return null;
          return <Glow key={`${i}-${k}`} map={a.glow} at={P} size={0.2 + 0.12 * u} color={R.col} opacity={0.95} />;
        });
      })}
      {/* the image it forms, on the closed shutter */}
      {showImage && Array.from({ length: GW * GH }, (_, k) => { const c = k % GW, r = Math.floor(k / GW), [x, y] = cellXY(c, r); return <mesh key={`im${k}`} position={[x, y, CURTAIN_Z + 0.04]}><planeGeometry args={[CELL * 0.92, CELL * 0.92]} /><meshBasicMaterial color={"#" + cellPix(c, r).getHexString()} transparent opacity={0.9} /></mesh>; })}
      {/* shutter curtains */}
      <mesh position={[0, c1, CURTAIN_Z]}><boxGeometry args={[2.6, 3.6, 0.05]} /><Toon c="#1e2230" /></mesh>
      <mesh position={[0, c2, CURTAIN_Z + 0.08]}><boxGeometry args={[2.6, 3.6, 0.05]} /><Toon c="#2e3446" /></mesh>
      {[[-1.55, 0, 0.5, 7.4], [1.55, 0, 0.5, 7.4], [0, 3.05, 3.6, 0.5], [0, -3.05, 3.6, 0.5]].map(([x, y, w, h], i) => <mesh key={`fr${i}`} position={[x, y, CURTAIN_Z + 0.12]}><boxGeometry args={[w, h, 0.1]} /><Toon c="#12141c" /></mesh>)}
      {/* the sensor: 12x8 light buckets, then red/green/blue filters */}
      <mesh position={[0, 0, SENSOR_Z - 0.15]}><boxGeometry args={[GW * CELL + 0.4, GH * CELL + 0.4, 0.1]} /><Toon c="#2e3446" /></mesh>
      {Array.from({ length: GW * GH }, (_, k) => {
        const c = k % GW, r = Math.floor(k / GW), [x, y] = cellXY(c, r), lt = cellLit(k), fill = ease((t - lt) / 0.15);
        const pix = cellPix(c, r), sp = pix.clone().convertLinearToSRGB(), lum = 0.3 * sp.r + 0.6 * sp.g + 0.1 * sp.b;
        const grey = C("#2e3446").lerp(C("#ffffff"), Math.min(1, lum * 1.8)), ch = [pix.r, pix.g, pix.b][bayer(c, r)];
        const col = open && t < b(8) ? grey : fill <= 0 || t < b(8) ? C("#12141c") : filt > 0 ? grey.clone().lerp(C(FILTER[bayer(c, r)]).multiplyScalar(0.12 + 2.4 * Math.min(1, ch * 1.6)), filt) : grey;
        const hex = "#" + col.getHexString();
        return (
          <group key={`c${k}`} position={[x, y, SENSOR_Z]}>
            <mesh position={[0, 0, -0.06 + 0.06 * fill]} scale={[1, 1, 0.2 + 0.8 * fill]}><boxGeometry args={[CELL * 0.86, CELL * 0.86, 0.12]} /><Toon c={hex} e={fill > 0 && t >= b(8) ? 0.35 : 0} /></mesh>
            {filt > 0 && <mesh position={[0, 0, 0.12 + 0.8 * (1 - filt)]}><planeGeometry args={[CELL * 0.9, CELL * 0.9]} /><meshBasicMaterial color={FILTER[bayer(c, r)]} transparent opacity={0.35} /></mesh>}
          </group>
        );
      })}
      {open && <Glow map={a.glow} at={[0, 0, SENSOR_Z + 0.4]} size={3} color="#ffffff" opacity={0.35} />}
    </group>
  );
};

// ---------------- camera moves, labels ----------------
const HOME = { p: [5.7, 2.3, 9.7] as V3, l: [-0.45, 0.45, 0] as V3 };
const SCREEN: V3 = [-0.3, 0.12, -0.66];
const SIDE = { p: [7.1, 1.5, 3.6] as V3, l: [0, 1.0, 0.75] as V3 };     // 3/4 side view of the cut-open camera
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [7.6, 2.0, 7.4], l: [-0.2, 0.55, 0.6] },
  { t: b(3.6), ...SIDE },
  { t: IN - 0.6, p: [6.7, 1.4, 3.3], l: [0, 0.95, 0.7] },
  { t: IN, p: [1.3, 0.1, 0.3], l: [0, 0.05, SENS_Z] },                 // push into the sensor
];
const CAM_I: CamKey[] = [
  { t: IN, p: [0, 0.4, -2.2], l: [0, 0.4, SENSOR_Z] },
  { t: b(11), p: [0, 0.4, -2.45], l: [0, 0.4, SENSOR_Z] },
  { t: OUT - 0.45, p: [0, 0.4, -2.75], l: [0, 0.4, SENSOR_Z] },
  { t: OUT, p: [0, 0, SENSOR_Z + 0.7], l: [0, 0, SENSOR_Z] },
];
const CAM_B: CamKey[] = [
  { t: OUT, p: [6.7, 1.4, 3.3], l: [0, 0.95, 0.7] },
  { t: b(13), p: [6.6, 1.4, 1.6], l: [0, 0.8, 0.1] },
  { t: b(13.6), p: [2.2, 1.1, -5.0], l: [SCREEN[0], SCREEN[1] + 0.5, SCREEN[2]] },
  { t: b(14.2), p: [1.8, 1.1, -5.1], l: [SCREEN[0], SCREEN[1] + 0.5, SCREEN[2]] },
  { t: b(15), p: [7.4, 1.9, 0.8], l: [0, 0.3, 0] },
  { t: 29.0, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : inside(t) ? camAt(CAM_I, t) : camAt(CAM_B, t));
const fillAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const fillColor = (_t: number) => "#12141c";

const TOPZ: [number, number] = [540, 420];
const L = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES A" }], [{ t: "CAMERA", c: "#ffd23f" }], [{ t: "TAKE A PHOTO? 📸" }]];
const LABELS: LabelDef[] = [
  L(0, b(2), "#ffd23f", HOOK, true),
  L(b(2), b(4), "#ff5a4a", [[{ t: "LIGHT BOUNCES OFF" }], [{ t: "THE APPLE", c: "#ff5a4a" }], [{ t: "INTO THE LENS" }]]),
  L(b(4), b(6), "#4aa0e0", [[{ t: "INSIDE, THE LENS" }], [{ t: "FOCUSES", c: "#4aa0e0" }], [{ t: "THE LIGHT" }]]),
  L(b(6), b(8), "#ffd23f", [[{ t: "THE SHUTTER:" }], [{ t: "A TINY DOOR", c: "#ffd23f" }], [{ t: "OPEN 1/1000 SEC" }]]),
  L(b(8), b(10), "#e8ecf4", [[{ t: "THE SENSOR:" }], [{ t: "MILLIONS OF", c: "#fff2a8" }], [{ t: "LIGHT CATCHERS" }]]),
  L(b(10), b(12), "#ffffff", [[{ t: "EACH ONE SEES" }], [{ t: "RED", c: "#ff5a4a" }, { t: ", " }, { t: "GREEN", c: "#4ac04a" }], [{ t: "OR " }, { t: "BLUE", c: "#4a7aff" }]]),
  L(b(12), b(14), "#ffd23f", [[{ t: "A CHIP TURNS IT" }], [{ t: "INTO YOUR" }], [{ t: "PHOTO 📸", c: "#ffd23f" }]]),
  L(b(14), D + 0.01, "#ffd23f", HOOK, true),
];

const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05080a, -4px 0 0 #05080a, 0 -4px 0 #05080a" };

export const CameraVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const ins = inside(t);
  const cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: ins ? BG_IN : BG_ROOM }}>
      <Audio src={staticFile("videos/13-camera/music.wav")} />
      <PixelArtCanvas bg={ins ? BG_IN : BG_ROOM} fov={42} palette={CAM_PALETTE} outlineColor="#05060a">
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={ins ? 0.7 : 0.55} color={ins ? "#e8ecf4" : "#e0a860"} />
        <directionalLight position={[-6, 9, 8]} intensity={1.8} color="#fff2a8" />
        <directionalLight position={[8, 3, -8]} intensity={0.9} color="#4aa0e0" />
        <ClipOn />
        {ins ? <Inside t={t} /> : <><Room t={t} /><CameraBody t={t} />{cutOpen(t) > 0 && <Interior t={t} />}<Light t={t} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: fillColor(t), opacity: fillAt(t) }} />
      <AbsoluteFill style={{ background: "#ffffff", opacity: ins ? 0 : 0.3 * flashK(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ffd23f" }}>@HOWTOWITHZAY</div>
      <Tags t={t} cam={cam} />
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};
