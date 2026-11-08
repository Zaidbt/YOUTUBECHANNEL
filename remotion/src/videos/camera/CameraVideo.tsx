/**
 * Video 013 · How does a camera take a photo? — true pixel-art 3D, 30 s seamless loop @ 60 fps, 128 BPM phonk.
 * One scene at a time, one smooth camera: hero shot of a camera on a table, flashing on the snares → glide + dive into
 * the lens → inside: the lens makes a tiny upside-down image (rays cross at the aperture) → the shutter opens on the
 * snares → the sensor cells fill up on the cowbell (the drop) → red/green/blue filters → out through the back: the
 * photo appears on the screen → orbit back to the hero shot (loop). Timing from camera.json (videos/13-camera/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./camera.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef } from "../../brand/Labels";
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
const IN = b(4), OUT = b(12), FADE = 0.28;
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
const CameraBody: React.FC<{ t: number }> = ({ t }) => {
  const a = useAssets();
  const fk = flashK(t);
  // reveal the back-screen photo on the cowbell hits of bars 12-13 (scan lines)
  const hits = EV.screen.filter((s) => t >= s).length, shown = t >= b(14) || t < b(12) ? (t < b(4) || t >= b(14) ? 0 : 0) : Math.round((hits / EV.screen.length) * a.PW * a.PH);
  const px = t >= b(12) && t < b(14) ? shown : 0;
  const d = a.photo.image.data as Uint8Array;
  for (let i = 0; i < a.PW * a.PH; i++) {
    const x = i % a.PW, y = Math.floor(i / a.PW);
    const c = i < px ? photoPix((x + 0.5) / a.PW, (y + 0.5) / a.PH) : C("#07080c");
    const s = c.clone().convertLinearToSRGB();
    d.set([s.r * 255, s.g * 255, s.b * 255, 255], ((a.PH - 1 - y) * a.PW + x) * 4);
  }
  a.photo.needsUpdate = true;
  return (
    <group>
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
      <group position={[-2.7, -0.62, 4.0]}>
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
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [4.8, 2.0, 9.2], l: [-0.3, 0.45, 0] },
  { t: IN - 0.35, p: [0.6, 0.35, 4.0], l: [0, 0.1, LENS_FRONT] },
  { t: IN, p: [0, 0.05, LENS_FRONT + 0.5], l: [0, 0, 0] },
];
const CAM_I: CamKey[] = [
  { t: IN, p: [0, 0.4, 1.2], l: [0, 0.4, CURTAIN_Z] },          // one straight, slow push, always front-on
  { t: b(6), p: [0, 0.4, -0.6], l: [0, 0.4, CURTAIN_Z] },
  { t: b(8), p: [0, 0.4, -2.2], l: [0, 0.4, SENSOR_Z] },
  { t: b(11), p: [0, 0.4, -2.45], l: [0, 0.4, SENSOR_Z] },
  { t: OUT - 0.45, p: [0, 0.4, -2.75], l: [0, 0.4, SENSOR_Z] },
  { t: OUT, p: [0, 0, SENSOR_Z + 0.7], l: [0, 0, SENSOR_Z] },
];
const CAM_B: CamKey[] = [
  { t: OUT, p: [SCREEN[0], SCREEN[1], -1.3], l: SCREEN },
  { t: OUT + 0.9, p: [0.6, 0.7, -4.4], l: [SCREEN[0], SCREEN[1] + 0.5, SCREEN[2]] },
  { t: b(14), p: [1.6, 1.0, -5.0], l: [SCREEN[0], SCREEN[1] + 0.5, SCREEN[2]] },
  { t: b(15), p: [7.4, 1.9, 0.8], l: [0, 0.3, 0] },
  { t: 29.0, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : inside(t) ? camAt(CAM_I, t) : camAt(CAM_B, t));
const fillAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const fillColor = (t: number) => (Math.abs(t - IN) < 1 ? "#0e2a4a" : "#07080c");

const TOPZ: [number, number] = [540, 420];
const L = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES A" }], [{ t: "CAMERA", c: "#ffd23f" }], [{ t: "TAKE A PHOTO? 📸" }]];
const LABELS: LabelDef[] = [
  L(0, b(2), "#ffd23f", HOOK, true),
  L(b(2), b(4), "#ff5a4a", [[{ t: "LIGHT BOUNCES OFF" }], [{ t: "THE APPLE", c: "#ff5a4a" }], [{ t: "INTO THE LENS" }]]),
  L(b(4), b(6), "#4aa0e0", [[{ t: "THE LENS FOCUSES" }], [{ t: "THE LIGHT", c: "#4aa0e0" }], [{ t: "INTO AN IMAGE" }]]),
  L(b(6), b(8), "#ffffff", [[{ t: "THE SHUTTER OPENS" }], [{ t: "FOR 1/1000", c: "#ffd23f" }], [{ t: "OF A SECOND" }]]),
  L(b(8), b(10), "#e8ecf4", [[{ t: "MILLIONS OF" }], [{ t: "LIGHT SENSORS", c: "#fff2a8" }], [{ t: "CATCH IT" }]]),
  L(b(10), b(12), "#ffffff", [[{ t: "EACH ONE SEES" }], [{ t: "RED", c: "#ff5a4a" }, { t: ", " }, { t: "GREEN", c: "#4ac04a" }], [{ t: "OR " }, { t: "BLUE", c: "#4a7aff" }]]),
  L(b(12), b(14), "#ffd23f", [[{ t: "A CHIP MIXES THEM" }], [{ t: "INTO YOUR" }], [{ t: "PHOTO 📸", c: "#ffd23f" }]]),
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
        {ins ? <Inside t={t} /> : <><Room t={t} /><CameraBody t={t} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: fillColor(t), opacity: fillAt(t) }} />
      <AbsoluteFill style={{ background: "#ffffff", opacity: ins ? 0 : 0.3 * flashK(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ffd23f" }}>@HOWTOWITHZAY</div>
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};
