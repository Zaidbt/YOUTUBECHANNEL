/**
 * Video 014 · How does an air fryer actually work? — Kurzgesagt-style flat drawing + bouncy animation through our
 * pixel pipeline. 30 s seamless loop, 120 BPM nu-disco. Night kitchen hero (steam puffs on the snares) → "spoiler:
 * it doesn't fry" → dive into the drawer window → flat cross-section: FAN / HEATER / BASKET pop in, the heater climbs
 * to 200°C → the fan blows the hot air around (tornado loop) → the wind dries the fries' surface (droplets) → Maillard
 * reaction: a fry turns golden on every 8th → back out: "it's a mini turbo oven" + DING → hero (loop).
 * Timing from airfryer.json (videos/14-airfryer/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./airfryer.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, rrectLine, ribbon, curve, Flat, Disc } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;

export const AF_PALETTE = [
  "#0d0f2a", "#151833", "#1b1f4b", "#2a3170", "#3a4aa0",
  "#24263a", "#2a2d4a", "#3c4170", "#585f8c", "#8a92c0", "#c8cdf0", "#ffffff",
  "#c86a3a", "#ff9a5a", "#ff8a3d", "#ffb02e", "#ffd23f", "#fff3b0", "#ffe9a8", "#c86a1a", "#8a3a10",
  "#1f6f7a", "#185a63", "#3fd0c0", "#9bf0e0",
  "#ff7a9a", "#b48cff", "#4a9aff", "#bfe6ff",
  "#ff3a2a", "#05060f",
];
const BG = "#1b1f4b";
const C = (h: string) => new THREE.Color(h);
const mixHex = (a: string, c: string, k: number) => "#" + C(a).lerp(C(c), clamp01(k)).getHexString();

// ---------------- timing ----------------
const IN = b(3), OUT = b(11), FADE = 0.28;
const inside = (t: number) => t >= IN && t < OUT;
const temp = (t: number) => (t < b(3) + 0.5 ? 20 : 20 + 180 * ease((t - b(3) - 0.5) / (b(5) - b(3) - 0.8)));     // °C
const heat = (t: number) => (temp(t) - 20) / 180;
const partK = (t: number, i: number) => Math.max(0.001, backOut((t - EV.parts[i]) / 0.3));
const puffAge = (t: number) => { let a = 99; for (const p of EV.puffs) if (t >= p) a = Math.min(a, t - p); return a; };

// ---------------- the night kitchen (flat parallax layers) ----------------
const wallG = (() => { const g = new THREE.PlaneGeometry(90, 50, 1, 8); const c: number[] = []; const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = clamp01((p.getY(i) + 8) / 30); const col = C("#151833").lerp(C("#3a4aa0"), k); c.push(col.r, col.g, col.b); } g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); return g; })();
const tileG = rrect(-0.42, -0.42, 0.42, 0.42, 0.08);
const STARS = Array.from({ length: 18 }, (_, i) => ({ x: -5.2 + rnd(i + 10) * 3.4, y: 3.6 + rnd(i + 11) * 3.6, r: 0.03 + rnd(i + 12) * 0.05, ph: rnd(i + 13) * 6 }));
const leafG = blob([[0, 0], [0.9, 0.35], [2.0, 0], [0.9, -0.35]], 16);
const Kitchen: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => (
  <group>
    <mesh geometry={wallG} position={[0, 6, -30]}><meshBasicMaterial vertexColors /></mesh>
    {/* tiles behind the counter */}
    {Array.from({ length: 9 * 5 }, (_, i) => { const x = -4 + (i % 9), y = -1.4 + Math.floor(i / 9); return <Flat key={`t${i}`} g={tileG} c="#2a3170" z={-6} p={[x, y]} o={0.55} />; })}
    {/* window: night sky, moon with halo rings, stars */}
    <group position={[-3.6, 5.2, -8]}>
      <Flat g={rrect(-1.9, -2.0, 1.9, 2.0, 0.25)} c="#151833" />
      <Flat g={rrect(-1.7, -1.8, 1.7, 1.8, 0.18)} c="#2a3170" z={0.01} />
      {[1.3, 0.95, 0.7].map((r, i) => <Disc key={i} at={[0.5, 0.6]} r={r} c="#b48cff" z={0.02 + i * 0.005} o={0.12 + i * 0.08} seg={32} />)}
      <Disc at={[0.5, 0.6]} r={0.5} c="#fff3b0" z={0.04} />
      {STARS.map((s, i) => <Disc key={`st${i}`} at={[s.x + 3.6 - 1.6, s.y - 5.2 - 0.2]} r={s.r * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={0.03} seg={6} />)}
      <Flat g={rrect(-0.06, -1.8, 0.06, 1.8, 0.02)} c="#151833" z={0.05} />
      <Flat g={rrect(-1.7, -0.06, 1.7, 0.06, 0.02)} c="#151833" z={0.05} />
    </group>
    {/* shelf with jars */}
    <group position={[2.2, 3.4, -7]}>
      <Flat g={rrect(-2.4, -0.12, 2.4, 0.12, 0.05)} c="#c86a3a" />
      {[[-1.6, "#3fd0c0", 0.9], [-0.6, "#ff7a9a", 1.2], [0.4, "#ffd23f", 0.8], [1.4, "#9bf0e0", 1.05]].map(([x, c, h], i) => (
        <group key={i} position={[x as number, 0.12 + (h as number) / 2, 0.01]} scale={[1, 1 + 0.03 * Math.sin(4 * LW * t + i), 1]}>
          <Flat g={rrect(-0.35, -(h as number) / 2, 0.35, (h as number) / 2, 0.14)} c={c as string} />
          <Flat g={rrect(-0.38, (h as number) / 2 - 0.05, 0.38, (h as number) / 2 + 0.12, 0.05)} c="#c86a3a" z={0.01} />
          <Flat g={rrect(-0.24, -0.1, -0.14, (h as number) / 2 - 0.15, 0.04)} c="#ffffff" z={0.01} o={0.5} />
        </group>
      ))}
    </group>
    {/* plant */}
    <group position={[3.1, -1.9, -2]}>
      <Flat g={rrect(-0.45, 0, 0.45, 0.8, 0.12)} c="#ff7a9a" />
      {Array.from({ length: 5 }, (_, i) => <group key={i} position={[0, 0.8, 0.01]} rotation={[0, 0, 0.7 + i * 0.42 + 0.06 * Math.sin(2 * LW * t + i)]} scale={0.7}><Flat g={leafG} c={i % 2 ? "#1f6f7a" : "#3fd0c0"} /></group>)}
    </group>
    {/* counter + cabinets */}
    <Flat g={rrect(-30, -2.32, 30, -1.9, 0.04)} c="#c86a3a" z={-0.5} />
    <Flat g={rrect(-30, -2.0, 30, -1.9, 0.02)} c="#ff9a5a" z={-0.49} />
    <Flat g={rrect(-30, -14, 30, -2.32, 0.02)} c="#1f6f7a" z={-0.6} />
    {[-3.6, -1.2, 1.2, 3.6].map((x) => <React.Fragment key={x}><Flat g={rrectLine(x - 1.1, -6.5, x + 1.1, -2.6, 0.12, 0.06)} c="#185a63" z={-0.59} /><Disc at={[x + 0.8, -3.0]} r={0.08} c="#ffd23f" z={-0.58} /></React.Fragment>)}
  </group>
);

// ---------------- the air fryer (flat, front view) ----------------
const AFG = {
  body: rrect(-1.6, -1.9, 1.6, 1.9, 0.6), top: rrect(-1.6, 1.25, 1.6, 1.9, 0.55), panel: rrect(-1.15, 0.45, 1.15, 1.15, 0.28),
  display: rrect(-0.85, 0.6, 0.1, 1.0, 0.14), drawer: rrect(-1.38, -1.72, 1.38, 0.28, 0.4), window: rrect(-0.85, -1.2, 0.85, -0.25, 0.22),
  handle: rrect(-0.6, 0.0, 0.6, 0.2, 0.08), rim: ribbon(curve([[1.52, 1.4], [1.58, 0], [1.5, -1.5]], 20), () => 0.06),
  topRim: ribbon(curve([[-1.0, 1.84], [0, 1.88], [1.0, 1.84]], 20), () => 0.06), feet: [rrect(-1.25, -2.0, -0.75, -1.85, 0.05), rrect(0.75, -2.0, 1.25, -1.85, 0.05)],
  vent: [-0.6, -0.3, 0, 0.3, 0.6].map((x) => rrect(x - 0.08, 1.62, x + 0.08, 1.7, 0.03)),
};
const FRY_SIL = Array.from({ length: 6 }, (_, i) => ({ x: -0.55 + i * 0.22, r: (rnd(i + 70) - 0.5) * 0.8 }));
const AirFryer: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const pa = puffAge(t), sq = pa < 0.4 ? 0.06 * Math.exp(-pa / 0.09) : 0;
  const hum = 0.012 * Math.sin(16 * LW * t);
  const drawer = t >= EV.ding && t < EV.ding + 1.4 ? backOut((t - EV.ding) / 0.35) * (1 - ease((t - EV.ding - 0.95) / 0.4)) : 0;
  const golden = t >= b(11);                                              // after the cook, the fries are golden
  return (
    <group position={[hum, 0, 0]}>
      <mesh position={[0, -1.95, -0.2]} scale={[1.9, 0.12, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#05060f" transparent opacity={0.4} /></mesh>
      <group scale={[1 + sq * 0.6, 1 - sq, 1]} position={[0, -1.9 * sq, 0]}>
        {AFG.feet.map((g, i) => <Flat key={i} g={g} c="#151833" z={-0.01} />)}
        <Flat g={AFG.body} c="#2a2d4a" />
        <Flat g={AFG.top} c="#3c4170" z={0.01} />
        <Flat g={AFG.rim} c="#ff7a9a" z={0.02} o={0.8} />
        <Flat g={AFG.topRim} c="#8a92c0" z={0.02} />
        {AFG.vent.map((g, i) => <Flat key={`v${i}`} g={g} c="#151833" z={0.02} />)}
        <Flat g={AFG.panel} c="#151833" z={0.02} />
        <Flat g={AFG.display} c="#ff8a3d" z={0.03} />
        {[0, 1, 2].map((i) => <Flat key={`d${i}`} g={rrect(-0.72 + i * 0.27, 0.68, -0.56 + i * 0.27, 0.92, 0.04)} c="#fff3b0" z={0.04} />)}
        <Disc at={[0.62, 0.8]} r={0.3} c="#c8cdf0" z={0.03} />
        <group position={[0.62, 0.8, 0.04]} rotation={[0, 0, -0.6 + 0.04 * Math.sin(4 * LW * t)]}><Flat g={rrect(-0.04, 0, 0.04, 0.24, 0.02)} c="#2a2d4a" /></group>
        {/* the drawer (slides out on the DING) with a window onto the fries */}
        <group position={[0, -0.9 * drawer * 0.12, 0.05 + drawer * 0.6]} scale={1 + drawer * 0.06}>
          <Flat g={AFG.drawer} c="#353a63" />
          <Flat g={AFG.window} c="#151833" z={0.01} />
          <mesh position={[0, -0.72, 0.02]} scale={[0.75, 0.35, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#ff8a3d" transparent opacity={0.35} /></mesh>
          {FRY_SIL.map((f, i) => <group key={i} position={[f.x, -0.75, 0.03]} rotation={[0, 0, f.r]}><Flat g={rrect(-0.06, -0.28, 0.06, 0.28, 0.05)} c={golden ? "#ffb02e" : "#ffe9a8"} /></group>)}
          <Flat g={AFG.handle} c="#8a92c0" z={0.04} />
        </group>
      </group>
      {/* steam puffs on the snares */}
      {EV.puffs.map((p, i) => { const a = t - p; if (a < 0 || a > 1.3) return null; const k = backOut(a / 0.3), up = a * 1.3, o = 1 - a / 1.3; return (
        <group key={`p${i}`} position={[(i % 2 ? 0.3 : -0.3) + 0.2 * Math.sin(a * 4), 1.95 + up, 0.3]} scale={k * (0.6 + a * 0.6)}>
          {[[-0.25, 0, 0.28], [0.15, 0.1, 0.34], [0.0, 0.32, 0.26]].map(([x, y, r], j) => <Disc key={j} at={[x, y]} r={r} c="#ffffff" o={o * 0.85} z={j * 0.001} />)}
        </group>); })}
      <Glow map={map} at={[-0.35, 0.8, 0.2]} size={1.4} color="#ff8a3d" opacity={0.5} />
    </group>
  );
};

// ---------------- inside: a flat cross-section ----------------
const SH = { x0: -2.6, x1: 2.6, y0: -3.0, y1: 3.4 };
const fanBlade = blob([[0, 0.08], [0.55, 0.18], [1.05, 0.0], [0.55, -0.12], [0, -0.08]], 12);
const coilPts = (): P2[] => { const p: P2[] = []; for (let i = 0; i <= 80; i++) { const x = -1.7 + (i / 80) * 3.4; p.push([x, 1.9 + 0.18 * Math.sin((i / 80) * Math.PI * 14)]); } return p; };
const coilG = ribbon(coilPts(), () => 0.11);
const FRIES = Array.from({ length: 16 }, (_, i) => ({ x: -1.35 + (i % 8) * 0.38 + (rnd(i + 30) - 0.5) * 0.1, y: -1.25 + Math.floor(i / 8) * 0.55 + (rnd(i + 31) - 0.5) * 0.12, r: (rnd(i + 32) - 0.5) * 1.2 }));
const fryG = rrect(-0.09, -0.42, 0.09, 0.42, 0.07), fryEdge = rrectLine(-0.09, -0.42, 0.09, 0.42, 0.07, 0.035);
/** the hot-air loop: out of the fan to the sides, down the walls, under the basket, up through it, back to the fan */
const loopPts = (s: number): P2[] => curve([[0, 2.25], [s * 1.6, 2.35], [s * 2.25, 1.6], [s * 2.3, -1.0], [s * 2.0, -2.45], [s * 0.9, -2.55], [s * 0.6, -1.7], [s * 0.7, -0.6], [s * 0.35, 0.8], [0, 2.0]], 90);
const LOOPS = [loopPts(1), loopPts(-1)];
const CHEV = blob([[-0.16, 0.13], [0.18, 0], [-0.16, -0.13], [-0.06, 0]], 4);
const along = (pts: P2[], u: number): P2 => pts[Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)))];
const Inside: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const h = heat(t), air = clamp01((t - b(5)) / 0.5), fanSpin = t * (4 + 14 * clamp01((t - b(4.5)) / 1));
  const coilCol = mixHex(mixHex("#585f8c", "#ff8a3d", h * 1.4), "#ffd23f", (h - 0.7) * 3);
  const tin = t - IN;
  return (
    <group>
      {/* backdrop glow + particles */}
      <Disc at={[0, 0.3]} r={7} c="#151833" z={-3} seg={40} />
      <Disc at={[0, 0.3]} r={4.6} c="#2a3170" z={-2.9} o={0.5} seg={40} />
      {Array.from({ length: 18 }, (_, i) => <Disc key={`pa${i}`} at={[(rnd(i + 400) - 0.5) * 7 + 0.2 * Math.sin(2 * LW * t + i), (rnd(i + 410) - 0.5) * 9 + 0.3 * Math.cos(3 * LW * t + i)]} r={0.04} c="#b48cff" z={-1} seg={6} />)}
      {/* the shell (cut open) */}
      <Flat g={rrect(SH.x0, SH.y0, SH.x1, SH.y1, 0.7)} c="#24263a" z={-0.5} />
      <Flat g={rrectLine(SH.x0, SH.y0, SH.x1, SH.y1, 0.7, 0.12)} c="#8a92c0" z={-0.45} />
      <Flat g={rrect(-0.55, 2.9, 0.55, 3.3, 0.1)} c="#3c4170" z={-0.4} />
      {/* bottom deflector */}
      <Flat g={ribbon(curve([[-2.2, -2.55], [-1.1, -2.7], [0, -2.45], [1.1, -2.7], [2.2, -2.55]], 30), () => 0.12)} c="#585f8c" z={-0.4} />
      {/* fan */}
      <group position={[0, 2.55, -0.3]} scale={partK(t, 0)}>
        {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[0, 0, fanSpin + (i / 5) * Math.PI * 2]} scale={[1, 0.55, 1]}><Flat g={fanBlade} c={i % 2 ? "#c8cdf0" : "#8a92c0"} /></group>)}
        <Disc at={[0, 0]} r={0.22} c="#3c4170" z={0.02} />
      </group>
      {/* heater coil */}
      <group scale={[1, partK(t, 1), 1]} position={[0, 1.9 * (1 - partK(t, 1)), 0]}>
        <Flat g={coilG} c={coilCol} z={-0.2} />
        {h > 0.3 && Array.from({ length: 9 }, (_, i) => <Glow key={`cg${i}`} map={map} at={[-1.6 + i * 0.4, 1.9, -0.1]} size={0.9 * h} color="#ff8a3d" opacity={0.55 * h} />)}
        {h > 0.5 && [-1.2, -0.4, 0.4, 1.2].map((x, i) => <Flat key={`sh${i}`} g={ribbon(curve([[x, 2.15], [x + 0.08 * Math.sin(t * 6 + i), 2.35], [x - 0.08 * Math.sin(t * 6 + i), 2.55]], 10), () => 0.04)} c="#ff9a5a" z={-0.19} o={0.6 * h} />)}
      </group>
      {/* hot-air loop */}
      {air > 0 && LOOPS.map((pts, li) => Array.from({ length: 22 }, (_, k) => { const u = (k / 22 + t * 0.55) % 1, q = along(pts, u), q2 = along(pts, Math.min(0.999, u + 0.012)), ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]); return (
        <group key={`ar${li}-${k}`} position={[q[0], q[1], 0.25]} rotation={[0, 0, ang]} scale={air}>
          <Flat g={CHEV} c={mixHex("#ff9a5a", "#fff3b0", Math.sin(u * Math.PI))} />
        </group>); }))}
      {/* basket with a perforated bottom */}
      <group scale={partK(t, 2)}>
        <Flat g={rrectLine(-1.75, -1.65, 1.75, 0.55, 0.25, 0.08)} c="#c8cdf0" z={-0.1} />
        {Array.from({ length: 12 }, (_, i) => <Flat key={`h${i}`} g={rrect(-1.6 + i * 0.29, -1.69, -1.45 + i * 0.29, -1.61, 0.02)} c="#151833" z={-0.09} />)}
        {/* fries: pale → golden on every 8th of the drop */}
        {FRIES.map((fr, i) => { const gt = EV.golden[i], gk = t >= gt ? backOut((t - gt) / 0.25) : 0, gold = Math.min(1, gk), pop = gk > 0 && t - gt < 0.4 ? 1 + 0.15 * Math.sin(clamp01((t - gt) / 0.4) * Math.PI) : 1; return (
          <group key={`f${i}`} position={[fr.x, fr.y, 0.05 + i * 0.002]} rotation={[0, 0, fr.r]} scale={pop}>
            <Flat g={fryG} c={mixHex("#ffe9a8", "#ffb02e", gold)} />
            <Flat g={fryEdge} c={mixHex("#ffd23f", "#c86a1a", gold)} z={0.001} />
            {gold > 0.5 && <Disc at={[0.02, 0.15]} r={0.03} c="#fff3b0" z={0.002} seg={6} />}
          </group>); })}
      </group>
      {/* moisture: droplets leave the fries and get blown away */}
      {EV.drops.map((dt, i) => { const a = t - dt; if (a < 0 || a > 1.2) return null; const fr = FRIES[(i * 5) % 16], u = a / 1.2; return (
        <group key={`w${i}`} position={[fr.x + u * (i % 2 ? 1.6 : -1.6), fr.y + 0.3 + u * 1.6, 0.4]} scale={backOut(a / 0.2) * (1 - u * 0.5)}>
          <Flat g={blob([[0, 0.14], [0.09, -0.03], [0, -0.1], [-0.09, -0.03]], 10)} c="#bfe6ff" o={1 - u} />
        </group>); })}
      {/* Maillard sparkle */}
      {EV.golden.map((gt, i) => { const a = t - gt; if (a < 0 || a > 0.5) return null; const fr = FRIES[i]; return <Glow key={`gl${i}`} map={map} at={[fr.x, fr.y, 0.5]} size={0.4 + a * 2} color="#ffd23f" opacity={1 - a / 0.5} />; })}
      {/* thermometer */}
      <group position={[3.05, 0.4, 0]} scale={Math.max(0.001, backOut((tin - 0.8) / 0.3))}>
        <Flat g={rrect(-0.2, -1.8, 0.2, 1.8, 0.2)} c="#c8cdf0" />
        <Flat g={rrect(-0.11, -1.7, 0.11, -1.7 + 3.3 * (0.08 + 0.92 * h), 0.1)} c={mixHex("#ffd23f", "#ff3a2a", h)} z={0.01} />
        <Disc at={[0, -1.9]} r={0.32} c={mixHex("#ffd23f", "#ff3a2a", h)} z={0.02} />
      </group>
    </group>
  );
};

// ---------------- tags, camera, labels ----------------
type Tag = { txt: string | ((t: number) => string); at: V3; from: number; to: number; col: string };
const TAGS: Tag[] = [
  { txt: "FAN", at: [-1.35, 3.1, 0.5], from: EV.parts[0], to: OUT, col: "#c8cdf0" },
  { txt: "HEATER", at: [-1.15, 2.45, 0.5], from: EV.parts[1], to: OUT, col: "#ff8a3d" },
  { txt: "BASKET", at: [1.2, 0.8, 0.5], from: EV.parts[2], to: OUT, col: "#3fd0c0" },
  { txt: (t) => `${Math.round(temp(t))}°C`, at: [2.95, 2.55, 0.5], from: IN + 1.0, to: OUT, col: "#ff3a2a" },
  { txt: "HOT AIR", at: [-2.25, -0.4, 0.5], from: b(5) + 0.3, to: b(7), col: "#ff9a5a" },
  { txt: "WATER", at: [0.0, 0.95, 0.5], from: b(7) + 0.3, to: b(9), col: "#bfe6ff" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(13,15,42,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{typeof g.txt === "function" ? g.txt(t) : g.txt}</div>); })}</>
);
const HOME = { p: [0, 1.4, 24] as V3, l: [0, 1.4, 0] as V3 };
const WIN = { p: [0, -0.72, 2.6] as V3, l: [0, -0.72, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [0, 0.9, 21], l: [0, 0.9, 0] },
  { t: IN - 0.4, p: [0, -0.5, 9], l: [0, -0.5, 0] },
  { t: IN, ...WIN },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0, -0.8, 6], l: [0, -0.8, 0] },
  { t: IN + 0.9, p: [0.3, 0.45, 33], l: [0.3, 0.45, 0] },
  { t: b(5), p: [0.3, 0.35, 32.5], l: [0.3, 0.35, 0] },
  { t: b(6.6), p: [0.2, 0.25, 31], l: [0.2, 0.25, 0] },
  { t: b(7.4), p: [0, -0.3, 15], l: [0, -0.3, 0] },
  { t: b(8.8), p: [0, -0.35, 14.5], l: [0, -0.35, 0] },
  { t: b(9.3), p: [0, -0.2, 18], l: [0, -0.2, 0] },
  { t: OUT - 0.4, p: [0, -0.6, 9], l: [0, -0.6, 0] },
  { t: OUT, p: [0, -0.8, 6], l: [0, -0.8, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, ...WIN },
  { t: OUT + 0.4, p: [0, -0.5, 9], l: [0, -0.5, 0] },
  { t: OUT + 1.3, p: [0, 1.1, 22], l: [0, 1.1, 0] },
  { t: D - 2.6, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : inside(t) ? camAt(CAM_S, t) : camAt(CAM_B, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES AN" }], [{ t: "AIR FRYER", c: "#ff8a3d" }], [{ t: "ACTUALLY WORK? 🍟" }]];
const LABELS: LabelDef[] = [
  Lb(0, b(2), "#ff8a3d", HOOK, true),
  Lb(b(2), b(3) + 0.3, "#ff7a9a", [[{ t: "SPOILER:" }], [{ t: "IT DOESN'T FRY 😮", c: "#ff7a9a" }]]),
  Lb(b(3) + 0.3, b(5), "#ff8a3d", [[{ t: "A HEATER GETS" }], [{ t: "SUPER HOT", c: "#ff8a3d" }], [{ t: "UP TO 200°C" }]]),
  Lb(b(5), b(7), "#ff9a5a", [[{ t: "A FAN BLOWS" }], [{ t: "THE HOT AIR", c: "#ff9a5a" }], [{ t: "AROUND, FAST 🌪️" }]]),
  Lb(b(7), b(9), "#bfe6ff", [[{ t: "THE WIND DRIES" }], [{ t: "THE SURFACE", c: "#bfe6ff" }], [{ t: "OF THE FRIES" }]]),
  Lb(b(9), b(11), "#ffb02e", [[{ t: "ABOVE ~140°C:" }], [{ t: "MAILLARD REACTION", c: "#ffb02e" }], [{ t: "= GOLDEN CRUNCH" }]]),
  Lb(b(11), b(13), "#3fd0c0", [[{ t: "SO IT'S NOT A FRYER" }], [{ t: "IT'S A MINI" }], [{ t: "TURBO OVEN!", c: "#3fd0c0" }]]),
  Lb(b(13), D + 0.01, "#ff8a3d", HOOK, true),
];

const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const AirFryerVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const ins = inside(t);
  const cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/14-airfryer/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={AF_PALETTE} outline={false} dither={0.05}>
        <CamSet p={cam.p} l={cam.l} />
        {ins ? <Inside t={t} map={glow} /> : <><Kitchen t={t} map={glow} /><AirFryer t={t} map={glow} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#151833", opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ff8a3d" }}>@HOWTOWITHZAY</div>
      {ins && <TagsView t={t} cam={cam} />}
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
