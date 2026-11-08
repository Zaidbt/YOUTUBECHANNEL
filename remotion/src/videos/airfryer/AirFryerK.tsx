/**
 * Video 014 · How does an air fryer actually work? — in the exact style of the loved Kurzgesagt chameleon
 * (ChameleonK.tsx): flat rounded shapes (meshBasic), indigo/teal/pink palette, night sky with stars + moon halo rings,
 * rounded silhouettes, framing leaves, fireflies, bouncy pop-ins, crisp colour wipes (clipping planes), flat infographic
 * insides with pop-in tags. Story: hero → "spoiler: it doesn't fry" → cutaway (fan, heater 200°C, hot air streams) →
 * dive into a fry (H2O blown off, crust wipes golden = Maillard) → back out, DING → loop. Music: music_v2.wav (stereo).
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
import { P2, clamp01, ease, backOut, lerp, blob, rrect, rrectLine, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const mix = (a: string, c: string, k: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(c), clamp01(k)).getHexString();

export const AFK_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f", "#ffbf6a",
  "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f", "#7a88d6", "#c8cdf0", "#3a3f66",
];
const BG = "#090d2b";

// ---------------- timing ----------------
const IN = b(3), MAC = b(7), OUT = b(11), FADE = 0.3;
const scene = (t: number) => (t < IN || t >= OUT ? "hero" : t < MAC ? "cut" : "macro");
const temp = (t: number) => (t < IN + 0.5 ? 20 : 20 + 180 * ease((t - IN - 0.5) / (b(5) - IN - 0.8)));
const heat = (t: number) => (temp(t) - 20) / 180;
const partK = (t: number, i: number) => Math.max(0.001, backOut((t - EV.parts[i]) / 0.3));
const wrapAge = (t: number, p: number) => (((t - p) % D) + D) % D;
const puffAge = (t: number) => Math.min(...EV.puffs.map((p) => wrapAge(t, p)));
const beatK = (t: number) => Math.exp(-((t % (BAR / 4)) / (BAR / 4)) * 6);

// ================= HERO: night kitchen with a big window (the chameleon's night world outside) =================
const sky = (() => { const g = new THREE.PlaneGeometry(200, 120, 1, 8); const c: number[] = []; const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = clamp01((p.getY(i) + 20) / 70); const col = new THREE.Color("#090d2b").lerp(new THREE.Color("#2b3f99"), k); c.push(col.r, col.g, col.b); } g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); return g; })();
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 90, y: 4 + rnd(i + 501) * 40, s: 0.06 + rnd(i + 502) * 0.12, ph: rnd(i + 503) * 6 }));
const clusters = (n: number, seed: number, y0: number, spread: number, rmin: number, rmax: number) => Array.from({ length: n }, (_, i) => ({ x: (rnd(seed + i) - 0.5) * spread, y: y0 + rnd(seed + i + 50) * 3, r: rmin + rnd(seed + i + 90) * (rmax - rmin) }));
const FAR = clusters(26, 600, -2, 120, 2.5, 5);
const MID = clusters(22, 700, -4, 80, 2, 3.6);
const leafG = blob([[0, 0], [0.9, 0.35], [2.0, 0], [0.9, -0.35]], 16);
const Leaf: React.FC<{ p: V3; r: number; s: number; c: string }> = ({ p, r, s, c }) => (
  <group position={p} rotation={[0, 0, r]} scale={s}><Flat g={leafG} c={c} /><mesh position={[1.0, 0, 0.01]}><planeGeometry args={[1.8, 0.05]} /><meshBasicMaterial color="#6ee6cf" /></mesh></group>
);
const frameG = (() => { const s = new THREE.Shape(); s.moveTo(-40, -30); s.lineTo(40, -30); s.lineTo(40, 40); s.lineTo(-40, 40); s.lineTo(-40, -30);
  const h = new THREE.Path(); const x0 = -4.2, x1 = 4.2, y0 = -1.9, y1 = 7.6, r = 1.2;
  h.moveTo(x0 + r, y0); h.lineTo(x1 - r, y0); h.quadraticCurveTo(x1, y0, x1, y0 + r); h.lineTo(x1, y1 - r); h.quadraticCurveTo(x1, y1, x1 - r, y1); h.lineTo(x0 + r, y1); h.quadraticCurveTo(x0, y1, x0, y1 - r); h.lineTo(x0, y0 + r); h.quadraticCurveTo(x0, y0, x0 + r, y0);
  s.holes.push(h); return new THREE.ShapeGeometry(s, 8); })();
const Kitchen: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => (
  <group>
    {/* outside: the same night as the chameleon */}
    <mesh geometry={sky} position={[0, 10, -60]}><meshBasicMaterial vertexColors /></mesh>
    {STARS.map((s, i) => <mesh key={`s${i}`} position={[s.x, s.y, -58]}><circleGeometry args={[s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph)), 6]} /><meshBasicMaterial color="#fff3b0" /></mesh>)}
    {[5.5, 4.2, 3.2].map((r, i) => <mesh key={`h${i}`} position={[-3.4, 7.6, -56 + i * 0.1]}><circleGeometry args={[r, 40]} /><meshBasicMaterial color="#b48cff" transparent opacity={0.07 + i * 0.05} /></mesh>)}
    <mesh position={[-3.4, 7.6, -55.5]}><circleGeometry args={[2.4, 40]} /><meshBasicMaterial color="#fff3b0" /></mesh>
    <mesh position={[-4.1, 8.2, -55.4]}><circleGeometry args={[0.5, 20]} /><meshBasicMaterial color="#fff08a" /></mesh>
    {FAR.map((c, i) => <mesh key={`f${i}`} position={[c.x, c.y, -40]}><circleGeometry args={[c.r, 24]} /><meshBasicMaterial color="#121a4a" /></mesh>)}
    {MID.map((c, i) => <mesh key={`m${i}`} position={[c.x + 0.2 * Math.sin(2 * LW * t + i), c.y, -22]}><circleGeometry args={[c.r, 24]} /><meshBasicMaterial color="#1c2a6e" /></mesh>)}
    {Array.from({ length: 16 }, (_, i) => <Glow key={`ff${i}`} map={map} at={[(rnd(i + 60) - 0.5) * 14 + 0.6 * Math.sin(3 * LW * t + i), 1 + rnd(i + 61) * 8 + 0.5 * Math.cos(2 * LW * t + i), -14]} size={0.6} color="#fff08a" opacity={0.4 + 0.6 * Math.max(0, Math.sin(5 * LW * t + i * 1.7))} />)}
    {/* the kitchen wall with a big rounded window */}
    <Flat g={frameG} c="#121a4a" z={-8} />
    <Flat g={rrectLine(-4.2, -1.9, 4.2, 7.6, 1.2, 0.22)} c="#7a88d6" z={-7.9} />
    <Flat g={rrect(-4.5, -2.0, 4.5, -1.75, 0.08)} c="#7a88d6" z={-7.8} />
    {/* hanging plant + vines + leaves framing the window */}
    {Array.from({ length: 4 }, (_, i) => <Flat key={`v${i}`} g={ribbon(curve([[-3.7 + i * 0.35, 7.6], [-3.9 + i * 0.35 + 0.2 * Math.sin(2 * LW * t + i), 5.5], [-3.5 + i * 0.3, 3.4 + i * 0.4]], 20), () => 0.08)} c="#1fb5a8" z={-7} />)}
    {[[-3.8, 6.4, -0.8, 0.5], [-3.2, 5.0, 2.6, 0.45], [-3.6, 4.1, -1.2, 0.4], [3.6, 6.6, 3.6, 0.55], [3.2, 5.6, 0.4, 0.45]].map(([x, y, r, s], i) => <Leaf key={`l${i}`} p={[x, y, -6.9]} r={r + 0.08 * Math.sin(2 * LW * t + i)} s={s} c={i % 2 ? "#1fb5a8" : "#0f6e6a"} />)}
    {/* counter */}
    <Flat g={rrect(-30, -2.35, 30, -1.9, 0.06)} c="#4a2a5a" z={-0.5} />
    <Flat g={rrect(-30, -1.98, 30, -1.9, 0.02)} c="#7a4a6a" z={-0.49} />
    <Flat g={rrect(-30, -20, 30, -2.35, 0.02)} c="#121a4a" z={-0.6} />
    {[-3.6, -1.2, 1.2, 3.6].map((x) => <React.Fragment key={x}><Flat g={rrectLine(x - 1.1, -7, x + 1.1, -2.65, 0.14, 0.06)} c="#1c2a6e" z={-0.59} /><Disc at={[x + 0.8, -3.0]} r={0.08} c="#ffd23f" z={-0.58} /></React.Fragment>)}
    {/* pink flower pot */}
    <group position={[2.9, -1.9, -0.3]}>
      <Flat g={rrect(-0.4, 0, 0.4, 0.7, 0.12)} c="#ff4f8b" />
      {[[-0.3, 1.0], [0.25, 1.25], [0.0, 1.5]].map(([x, y], i) => <group key={i} position={[x, y + 0.04 * Math.sin(4 * LW * t + i), 0.02]} scale={1 + 0.05 * beatK(t)}>
        {Array.from({ length: 5 }, (_, k) => <Disc key={k} at={[0.18 * Math.cos((k / 5) * Math.PI * 2), 0.18 * Math.sin((k / 5) * Math.PI * 2)]} r={0.14} c="#ff8a7a" />)}
        <Disc at={[0, 0]} r={0.1} c="#fff08a" z={0.01} />
      </group>)}
      {[[-0.15, 0.7, 1.9], [0.15, 0.7, 1.2]].map(([x, y, r], i) => <group key={`pl${i}`} position={[x, y, -0.01]} rotation={[0, 0, r]} scale={0.35}><Flat g={leafG} c="#0f6e6a" /></group>)}
    </group>
    {/* foreground framing leaves (parallax) */}
    <group position={[-4.4, -4.8, 4]} rotation={[0, 0, 0.7 + 0.04 * Math.sin(2 * LW * t)]} scale={2.4}><Flat g={leafG} c="#0f6e6a" /></group>
    <group position={[4.6, -4.4, 4]} rotation={[0, 0, 2.5 + 0.04 * Math.sin(2 * LW * t + 1)]} scale={2.2}><Flat g={leafG} c="#0f6e6a" /></group>
  </group>
);

// ---------------- the air fryer (flat, cel-shaded with flat shapes) ----------------
const segRects = (d: string, x: number, y: number, w: number, h: number) => {
  const on: Record<string, string> = { "0": "abcdef", "2": "abged" };
  const th = w * 0.24, S: Record<string, [number, number, number, number]> = { a: [x, y + h - th, x + w, y + h], g: [x, y + h / 2 - th / 2, x + w, y + h / 2 + th / 2], d: [x, y, x + w, y + th], f: [x, y + h / 2, x + th, y + h], b: [x + w - th, y + h / 2, x + w, y + h], e: [x, y, x + th, y + h / 2], c: [x + w - th, y, x + w, y + h / 2] };
  return [...(on[d] ?? "")].map((s) => { const [x0, y0, x1, y1] = S[s]; return rrect(x0, y0, x1, y1, th * 0.3); });
};
const AF = {
  body: rrect(-1.6, -1.9, 1.6, 1.9, 0.7), shade: rrect(-1.6, -1.9, 1.6, -0.9, 0.7), lid: rrect(-1.6, 1.2, 1.6, 1.9, 0.62),
  rim: ribbon(curve([[-1.35, 1.82], [0, 1.9], [1.35, 1.82]], 24), () => 0.07), rimL: ribbon(curve([[-1.56, 1.2], [-1.6, 0], [-1.54, -1.4]], 20), () => 0.06),
  panel: rrect(-1.2, 0.42, 1.2, 1.15, 0.32), display: rrect(-0.98, 0.56, 0.12, 1.02, 0.14),
  drawer: rrect(-1.4, -1.76, 1.4, 0.28, 0.48), window: rrect(-0.92, -1.26, 0.92, -0.2, 0.3), glow: rrect(-0.75, -1.15, 0.75, -0.42, 0.25),
  handle: rrect(-0.64, -0.03, 0.64, 0.21, 0.11), shine: blob([[-0.72, -0.3], [-0.5, -0.3], [-0.8, -1.12], [-0.88, -0.98]], 6),
  feet: [rrect(-1.25, -2.0, -0.75, -1.85, 0.06), rrect(0.75, -2.0, 1.25, -1.85, 0.06)],
  vents: [-0.6, -0.3, 0, 0.3, 0.6].map((x) => rrect(x - 0.09, 1.5, x + 0.09, 1.58, 0.03)),
  digits: [...segRects("2", -0.88, 0.64, 0.2, 0.3), ...segRects("0", -0.6, 0.64, 0.2, 0.3), ...segRects("0", -0.32, 0.64, 0.2, 0.3)],
};
const FRY_SIL = Array.from({ length: 7 }, (_, i) => ({ x: -0.62 + i * 0.205, r: (rnd(i + 70) - 0.5) * 0.9 }));
const fryS = rrect(-0.065, -0.3, 0.065, 0.3, 0.06);
const AirFryer: React.FC<{ t: number }> = ({ t }) => {
  const pa = puffAge(t), sq = (pa < 0.4 ? 0.06 * Math.exp(-pa / 0.09) : 0) + 0.012 * beatK(t);
  const drawer = t >= EV.ding && t < EV.ding + 1.4 ? backOut((t - EV.ding) / 0.35) * (1 - ease((t - EV.ding - 0.95) / 0.4)) : 0;
  const golden = t >= OUT && t < EV.ding + 1.4;
  return (
    <group>
      <mesh position={[0.25, -1.97, -0.25]} scale={[2.3, 0.15, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#05060f" transparent opacity={0.45} /></mesh>
      <group scale={[1 + sq * 0.6, 1 - sq, 1]} position={[0, -1.9 * sq, 0]}>
        {AF.feet.map((g, i) => <Flat key={i} g={g} c="#05060f" z={-0.01} />)}
        <Flat g={AF.body} c="#2b3f99" />
        <Flat g={AF.shade} c="#1c2a6e" z={0.004} />
        <Flat g={AF.lid} c="#4a9aff" z={0.006} o={0.35} />
        <Flat g={AF.rim} c="#bfe6ff" z={0.01} />
        <Flat g={AF.rimL} c="#6ee6cf" z={0.01} />
        {AF.vents.map((g, i) => <Flat key={`v${i}`} g={g} c="#121a4a" z={0.012} />)}
        <Flat g={AF.panel} c="#121a4a" z={0.015} />
        <Flat g={AF.display} c="#c85a10" z={0.02} />
        {AF.digits.map((g, i) => <Flat key={`dg${i}`} g={g} c="#fff08a" z={0.025} />)}
        <Disc at={[0.15, 0.95]} r={0.04} c="#fff08a" z={0.025} />
        <Disc at={[0.68, 0.8]} r={0.3} c="#c8cdf0" z={0.02} />
        <Disc at={[0.62, 0.86]} r={0.12} c="#ffffff" z={0.022} o={0.6} />
        <group position={[0.68, 0.8, 0.03]} rotation={[0, 0, -0.7 + 0.05 * Math.sin(4 * LW * t)]}><Flat g={rrect(-0.035, 0.05, 0.035, 0.25, 0.02)} c="#ff8a1f" /></group>
        <group position={[0, -0.11 * drawer, 0.05 + drawer * 0.6]} scale={1 + drawer * 0.06}>
          <Flat g={AF.drawer} c="#1f4abf" />
          <Flat g={AF.window} c="#c85a10" z={0.01} />
          <Flat g={AF.glow} c="#ff8a1f" z={0.012} />
          {FRY_SIL.map((f, i) => <group key={i} position={[f.x, -0.82, 0.02]} rotation={[0, 0, f.r]}><Flat g={fryS} c={golden ? "#ffbf6a" : "#fff08a"} /></group>)}
          <Flat g={AF.shine} c="#ffffff" z={0.03} o={0.3} />
          <Flat g={AF.handle} c="#bfe6ff" z={0.04} />
          <Flat g={rrect(-0.5, 0.13, 0.5, 0.17, 0.02)} c="#ffffff" z={0.05} />
        </group>
      </group>
      {EV.puffs.map((p, i) => { const a = wrapAge(t, p); if (a > 1.3) return null; const k = backOut(a / 0.3), up = a * 1.25, o = 1 - a / 1.3; return (
        <group key={`p${i}`} position={[(i % 2 ? 0.35 : -0.35) + 0.2 * Math.sin(a * 4), 1.95 + up, 0.3]} scale={k * (0.6 + a * 0.55)}>
          {[[-0.25, 0, 0.28], [0.15, 0.1, 0.34], [0.0, 0.32, 0.26], [0.32, 0.3, 0.2]].map(([x, y, r], j) => <Disc key={j} at={[x, y]} r={r} c={j === 1 ? "#ffffff" : "#c8cdf0"} z={j * 0.001} o={o * 0.9} />)}
        </group>); })}
    </group>
  );
};

// ================= CUTAWAY (flat infographic, like the chameleon's skin) =================
const SH = { x0: -2.6, x1: 2.6, y0: -3.0, y1: 3.4 };
const fanBlade = blob([[0, 0.09], [0.55, 0.2], [1.05, 0.0], [0.55, -0.13], [0, -0.09]], 12);
const COIL: P2[] = Array.from({ length: 91 }, (_, i) => [-1.7 + (i / 90) * 3.4, 1.9 + 0.18 * Math.sin((i / 90) * Math.PI * 14)]);
const coilG = ribbon(COIL, () => 0.14), coilCore = ribbon(COIL, () => 0.05);
const FRIES = Array.from({ length: 16 }, (_, i) => ({ x: -1.35 + (i % 8) * 0.38 + (rnd(i + 30) - 0.5) * 0.1, y: -1.25 + Math.floor(i / 8) * 0.55 + (rnd(i + 31) - 0.5) * 0.12, r: (rnd(i + 32) - 0.5) * 1.2 }));
const fryG = rrect(-0.1, -0.42, 0.1, 0.42, 0.08), fryHi = rrect(-0.06, -0.3, -0.015, 0.34, 0.022);
const loopPts = (s: number): P2[] => curve([[0, 2.25], [s * 1.6, 2.35], [s * 2.25, 1.6], [s * 2.3, -1.0], [s * 2.0, -2.45], [s * 0.9, -2.55], [s * 0.6, -1.7], [s * 0.7, -0.6], [s * 0.35, 0.8], [0, 2.0]], 200);
const LOOPS = [loopPts(1), loopPts(-1)];
const seg = (pts: P2[], u0: number, len: number): P2[] => { const n = pts.length - 1, out: P2[] = []; for (let k = 0; k <= 16; k++) { const u = (((u0 + (k / 16) * len) % 1) + 1) % 1; out.push(pts[Math.round(u * n)]); } return out; };
const arrowG = blob([[-0.12, 0.17], [0.2, 0], [-0.12, -0.17]], 4);
const Cutaway: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const h = heat(t), air = clamp01((t - b(5)) / 0.5), fanSpin = t * (4 + 16 * clamp01((t - b(4.5)) / 1)), tin = t - IN;
  const coil = h < 0.5 ? mix("#7a88d6", "#ff8a1f", h * 2) : mix("#ff8a1f", "#ffd23f", (h - 0.5) * 2);
  return (
    <group>
      <Disc at={[0, 0.3]} r={9} c="#121a4a" z={-6} seg={48} />
      <Disc at={[0, 0.3]} r={6} c="#1c2a6e" z={-5.9} o={0.6} seg={48} />
      {Array.from({ length: 26 }, (_, i) => <Disc key={`pa${i}`} at={[(rnd(i + 400) - 0.5) * 8 + 0.3 * Math.sin(2 * LW * t + i), (rnd(i + 410) - 0.5) * 10 + 0.3 * Math.cos(3 * LW * t + i)]} r={0.05 + 0.04 * rnd(i + 420)} c="#6ee6cf" z={-1} seg={8} />)}
      {/* shell */}
      <Flat g={rrect(SH.x0 - 0.25, SH.y0 - 0.25, SH.x1 + 0.25, SH.y1 + 0.25, 0.95)} c="#2b3f99" z={-0.55} />
      <Flat g={rrect(SH.x0, SH.y0, SH.x1, SH.y1, 0.75)} c="#090d2b" z={-0.5} />
      <Flat g={rrectLine(SH.x0 - 0.25, SH.y0 - 0.25, SH.x1 + 0.25, SH.y1 + 0.25, 0.95, 0.08)} c="#7a88d6" z={-0.45} />
      <Flat g={rrect(-0.65, 2.88, 0.65, 3.32, 0.12)} c="#1c2a6e" z={-0.4} />
      <Flat g={ribbon(curve([[-2.2, -2.55], [-1.1, -2.72], [0, -2.45], [1.1, -2.72], [2.2, -2.55]], 30), () => 0.14)} c="#3a3f66" z={-0.4} />
      {/* fan (pops in) */}
      <group position={[0, 2.55, -0.3]} scale={partK(t, 0)}>
        {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[0, 0, fanSpin + (i / 5) * Math.PI * 2]} scale={[1, 0.55, 1]}><Flat g={fanBlade} c={i % 2 ? "#bfe6ff" : "#c8cdf0"} /></group>)}
        <Disc at={[0, 0]} r={0.22} c="#2b3f99" z={0.02} />
        <Disc at={[-0.06, 0.06]} r={0.07} c="#bfe6ff" z={0.03} />
      </group>
      {/* heater (pops in, then glows) */}
      <group scale={[1, partK(t, 1), 1]} position={[0, 1.9 * (1 - partK(t, 1)), 0]}>
        <Flat g={coilG} c={coil} z={-0.2} />
        {h > 0.3 && <Flat g={coilCore} c="#fff08a" z={-0.19} o={clamp01((h - 0.3) * 2)} />}
        {h > 0.2 && Array.from({ length: 7 }, (_, i) => <Glow key={`cg${i}`} map={map} at={[-1.5 + i * 0.5, 1.9, -0.1]} size={0.8 * h + 0.2} color="#ff8a1f" opacity={0.6 * h} />)}
        {h > 0.5 && [-1.2, -0.4, 0.4, 1.2].map((x, i) => <Flat key={`sh${i}`} g={ribbon(curve([[x, 2.15], [x + 0.08 * Math.sin(t * 6 + i), 2.35], [x - 0.08 * Math.sin(t * 6 + i), 2.55]], 10), () => 0.05)} c="#ffbf6a" z={-0.18} o={0.8 * h} />)}
      </group>
      {/* hot air: flat flowing streams with arrow heads */}
      {air > 0 && LOOPS.map((pts, li) => Array.from({ length: 5 }, (_, k) => { const u0 = (k / 5 + t * 0.42) % 1, s = seg(pts, u0, 0.1), head = s[s.length - 1], prev = s[s.length - 3], ang = Math.atan2(head[1] - prev[1], head[0] - prev[0]); return (
        <group key={`st${li}-${k}`} scale={[1, 1, 1]}>
          <Flat g={ribbon(s, (u) => 0.16 * u * air)} c="#ff8a1f" z={0.2} />
          <Flat g={ribbon(s, (u) => 0.06 * u * air)} c="#fff08a" z={0.21} />
          <group position={[head[0], head[1], 0.22]} rotation={[0, 0, ang]} scale={air}><Flat g={arrowG} c="#ffbf6a" /></group>
        </group>); }))}
      {/* basket + fries (pop in row by row) */}
      <group scale={partK(t, 2)}>
        <Flat g={rrectLine(-1.75, -1.65, 1.75, 0.55, 0.28, 0.09)} c="#c8cdf0" z={-0.1} />
        {Array.from({ length: 12 }, (_, i) => <Flat key={`h${i}`} g={rrect(-1.6 + i * 0.29, -1.7, -1.45 + i * 0.29, -1.6, 0.02)} c="#090d2b" z={-0.09} />)}
        {FRIES.map((fr, i) => { const k = Math.max(0.001, backOut((t - EV.parts[2] - 0.15 - i * 0.03) / 0.3)), jig = air * 0.04 * Math.sin(t * 20 + i); return (
          <group key={`f${i}`} position={[fr.x, fr.y + jig, 0.05 + i * 0.002]} rotation={[0, 0, fr.r + jig]} scale={k}>
            <Flat g={fryG} c="#fff08a" />
            <Flat g={fryHi} c="#fff3b0" z={0.001} />
          </group>); })}
      </group>
      {/* thermometer */}
      <group position={[3.05, 0.4, 0]} scale={Math.max(0.001, backOut((tin - 0.8) / 0.3))}>
        <Flat g={rrect(-0.22, -1.8, 0.22, 1.8, 0.22)} c="#c8cdf0" />
        <Flat g={rrect(-0.11, -1.7, 0.11, -1.7 + 3.3 * (0.08 + 0.92 * h), 0.1)} c={mix("#ffd23f", "#ff3a2a", h)} z={0.01} />
        <Disc at={[0, -1.9]} r={0.33} c={mix("#ffd23f", "#ff3a2a", h)} z={0.02} />
        <Disc at={[-0.1, -1.8]} r={0.08} c="#ffffff" z={0.03} o={0.6} />
      </group>
    </group>
  );
};

// ================= MACRO: inside one fry (flat, like the chameleon's skin layers) =================
const MX = (i: number) => -4.2 + i * 0.56;
const surfY = (x: number) => 0.06 * Math.sin(x * 4.1) + 0.04 * Math.sin(x * 9.3 + 1);
const SURF: P2[] = Array.from({ length: 161 }, (_, i) => { const x = -6 + i * 0.075; return [x, surfY(x)]; });
const fryBody = (() => { const s = new THREE.Shape(); s.moveTo(-6, -8); s.lineTo(6, -8); for (let i = SURF.length - 1; i >= 0; i--) s.lineTo(SURF[i][0], SURF[i][1]); s.lineTo(-6, -8); return new THREE.ShapeGeometry(s); })();
const crustG = ribbon(SURF.map(([x, y]) => [x, y - 0.16] as P2), () => 0.36);
const CELLS = Array.from({ length: 70 }, (_, i) => ({ x: -5.6 + (i % 14) * 0.8 + (Math.floor(i / 14) % 2) * 0.4, y: -0.85 - Math.floor(i / 14) * 0.62 }));
const cellG = blob([[-0.66, 0], [-0.3, 0.38], [0.35, 0.36], [0.68, 0.02], [0.32, -0.36], [-0.34, -0.35]], 20);
const WIND = Array.from({ length: 8 }, (_, i) => ({ y: 0.7 + (i % 4) * 0.5, len: 1.4 + rnd(i + 600) * 1.2, ph: rnd(i + 601) }));
const GOLD = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), GOLD_EDGE = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
const Macro: React.FC<{ t: number }> = ({ t }) => {
  const wind = clamp01((t - MAC) / 0.6), tin = t - MAC;
  // the golden wipe: each golden event pushes the crust edge one piece further (left → right), with a bounce
  const done = EV.golden.filter((g) => t >= g).length, lastG = EV.golden[Math.max(0, done - 1)];
  const edge = done === 0 ? -6.5 : lerp(MX(done - 1) - 0.28, MX(done - 1) + 0.28, Math.min(1.15, backOut((t - lastG) / 0.25)));
  GOLD.constant = done >= 16 ? 99 : edge; GOLD_EDGE.constant = -(edge - 0.18);
  return (
    <group>
      <Disc at={[0, 1]} r={9} c="#121a4a" z={-6} seg={48} />
      <Disc at={[0, 4]} r={6} c="#c85a10" z={-5.9} o={0.18} seg={48} />
      {Array.from({ length: 26 }, (_, i) => <Disc key={`mp${i}`} at={[(rnd(i + 700) - 0.5) * 12 + 0.5 * Math.sin(2 * LW * t + i), 0.5 + rnd(i + 701) * 4.5 + 0.2 * Math.cos(3 * LW * t + i)]} r={0.05} c="#ffbf6a" z={-1} seg={8} />)}
      {/* the fry: pale inside with starch cells (pop in), surface rim */}
      <Flat g={fryBody} c="#ffd23f" z={-0.4} />
      {CELLS.map((c, i) => { const k = Math.max(0.001, backOut((tin - 0.3 - (i % 14) * 0.02) / 0.3)); return (
        <group key={`ce${i}`} position={[c.x, c.y, -0.35]} scale={[0.5 * k, 0.42 * k, 1]}>
          <Flat g={cellG} c="#fff08a" />
          <Disc at={[0.15, 0.05]} r={0.14} c="#ffbf6a" z={0.01} />
        </group>); })}
      {/* crust: pale, then golden wipe (Maillard) with a bright edge */}
      <Flat g={crustG} c="#fff3b0" z={-0.3} />
      <Flat g={crustG} c="#ff8a1f" z={-0.29} clip={[GOLD]} />
      {done > 0 && done < 16 && <Flat g={crustG} c="#fff08a" z={-0.28} clip={[GOLD, GOLD_EDGE]} />}
      {Array.from({ length: done }, (_, i) => [0, 1, 2].map((j) => <Disc key={`bb${i}-${j}`} at={[MX(i) - 0.18 + j * 0.18, surfY(MX(i)) - 0.14 + (j % 2) * 0.07]} r={0.04 * Math.min(1, backOut((t - EV.golden[i]) / 0.3))} c="#c85a10" z={-0.27} seg={8} />))}
      {EV.golden.map((gt, i) => { const a = t - gt; if (a < 0 || a > 2.0) return null; const u = a / 2; return [0, 1].map((j) => <Flat key={`ar${i}-${j}`} g={ribbon(curve([[MX(i) + j * 0.15, 0.15], [MX(i) + 0.15 * Math.sin(u * 6 + j), 0.5 + u * 0.8], [MX(i) - 0.1 + j * 0.2, 0.9 + u * 1.5]], 12), () => 0.05)} c="#ffbf6a" z={0.2} o={0.8 * (1 - u)} />); })}
      {/* hot wind streaks */}
      {WIND.map((w, i) => { const u = (t * 0.55 + w.ph) % 1, x = -7 + u * 14; const pts: P2[] = Array.from({ length: 20 }, (_, k) => [x - w.len + (k / 19) * w.len, w.y + 0.07 * Math.sin(k * 0.8 + t * 6)]); return <Flat key={`wd${i}`} g={ribbon(pts, (k) => 0.07 * k)} c="#bfe6ff" z={0.3} o={0.8 * wind} />; })}
      {/* water molecules (H2O), blown off one per 8th */}
      {Array.from({ length: 16 }, (_, i) => { const dt = EV.drops[i], a = t - dt, x0 = MX(i), y0 = surfY(x0) + 0.36;
        if (a > 1.6) return null;
        const appear = Math.max(0.001, backOut((tin - 0.4 - i * 0.03) / 0.3));
        const fly = Math.max(0, a), up = a > 0 ? Math.sin(Math.min(a, 0.6) / 0.6 * Math.PI / 2) * 1.2 + fly * 0.4 : 0.03 * Math.sin(24 * LW * t + i);
        const o = a > 0 ? 1 - clamp01((a - 0.8) / 0.8) : 1;
        return (
          <group key={`m${i}`} position={[x0 + fly * fly * 2.6, y0 + up, 0.1 + i * 0.002]} rotation={[0, 0, fly * 6]} scale={a > 0 ? backOut(a / 0.25) : appear}>
            <Disc at={[-0.25, 0.2]} r={0.13} c="#ffffff" z={-0.01} o={o} />
            <Disc at={[0.25, 0.2]} r={0.13} c="#ffffff" z={-0.01} o={o} />
            <Disc at={[0, 0]} r={0.26} c="#4a9aff" o={o} />
            <Disc at={[-0.08, 0.08]} r={0.08} c="#bfe6ff" z={0.01} o={o} />
          </group>); })}
    </group>
  );
};

// ================= tags, camera, labels =================
type Tag = { txt: string | ((t: number) => string); at: V3; from: number; to: number; col: string };
const TAGS: Tag[] = [
  { txt: "FAN", at: [-1.35, 3.15, 0.5], from: EV.parts[0], to: MAC, col: "#bfe6ff" },
  { txt: "HEATER", at: [-1.15, 2.45, 0.5], from: EV.parts[1], to: MAC, col: "#ff8a1f" },
  { txt: "BASKET", at: [1.2, 0.8, 0.5], from: EV.parts[2], to: MAC, col: "#6ee6cf" },
  { txt: (t) => `${Math.round(temp(t))}°C`, at: [2.95, 2.55, 0.5], from: IN + 1.0, to: MAC, col: "#ff4f8b" },
  { txt: "HOT AIR", at: [-2.25, -0.4, 0.5], from: b(5) + 0.3, to: MAC, col: "#ffbf6a" },
  { txt: "WATER", at: [MX(1), 1.3, 0.5], from: MAC + 0.6, to: b(8), col: "#4a9aff" },
  { txt: "CRUST", at: [MX(13), 0.8, 0.5], from: b(9) + 0.4, to: OUT, col: "#ff8a1f" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{typeof g.txt === "function" ? g.txt(t) : g.txt}</div>); })}</>
);
const HOME = { p: [0, 1.35, 24] as V3, l: [0, 1.35, 0] as V3 };
const WIN = { p: [0, -0.72, 2.6] as V3, l: [0, -0.72, 0] as V3 };
const FRY5 = FRIES[5];
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [0.15, 0.9, 20], l: [0.15, 0.9, 0] },
  { t: IN - 0.4, p: [0, -0.5, 9], l: [0, -0.5, 0] },
  { t: IN, ...WIN },
];
const CAM_C: CamKey[] = [
  { t: IN, p: [0, -0.8, 6], l: [0, -0.8, 0] },
  { t: IN + 0.9, p: [0.3, 0.45, 33], l: [0.3, 0.45, 0] },
  { t: b(5), p: [0.3, 0.35, 32.5], l: [0.3, 0.35, 0] },
  { t: b(6.5), p: [0.2, 0.25, 31], l: [0.2, 0.25, 0] },
  { t: MAC - 0.45, p: [FRY5.x, FRY5.y, 6], l: [FRY5.x, FRY5.y, 0] },
  { t: MAC, p: [FRY5.x, FRY5.y, 1.2], l: [FRY5.x, FRY5.y, 0] },
];
const CAM_M: CamKey[] = [
  { t: MAC, p: [MX(0), 0.2, 5], l: [MX(0), 0.2, 0] },
  { t: MAC + 0.8, p: [MX(1), 1.0, 22], l: [MX(1), 1.0, 0] },
  { t: b(8.9), p: [MX(14), 1.0, 22], l: [MX(14), 1.0, 0] },
  { t: b(9.1), p: [MX(1), 1.0, 22], l: [MX(1), 1.0, 0] },
  { t: OUT - 0.5, p: [MX(15), 0.9, 21], l: [MX(15), 0.9, 0] },
  { t: OUT, p: [MX(15), 0.1, 4], l: [MX(15), 0.1, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, ...WIN },
  { t: OUT + 0.4, p: [0, -0.5, 9], l: [0, -0.5, 0] },
  { t: OUT + 1.3, p: [0, 1.1, 22], l: [0, 1.1, 0] },
  { t: D - 2.6, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => { const s = scene(t); return s === "cut" ? camAt(CAM_C, t) : s === "macro" ? camAt(CAM_M, t) : t < IN ? camAt(CAM_A, t) : camAt(CAM_B, t); };
const diveAt = (t: number) => Math.max(...[IN, MAC, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - MAC) < 1 ? "#fff08a" : Math.abs(t - OUT) < 1 ? "#ff8a1f" : "#c85a10");

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES AN" }], [{ t: "AIR FRYER", c: "#ff8a1f" }], [{ t: "ACTUALLY WORK? 🍟" }]];
const LABELS: LabelDef[] = [
  Lb(0, b(2), "#ff8a1f", HOOK, true),
  Lb(b(2), IN + 0.3, "#ff4f8b", [[{ t: "SPOILER:" }], [{ t: "IT DOESN'T FRY 😮", c: "#ff4f8b" }]]),
  Lb(IN + 0.3, b(5), "#ff8a1f", [[{ t: "A HEATER GETS" }], [{ t: "SUPER HOT", c: "#ff8a1f" }], [{ t: "UP TO 200°C" }]]),
  Lb(b(5), MAC, "#ffbf6a", [[{ t: "A FAN BLOWS" }], [{ t: "THE HOT AIR", c: "#ffbf6a" }], [{ t: "AROUND, FAST 🌪️" }]]),
  Lb(MAC, b(9), "#4a9aff", [[{ t: "THE HOT WIND" }], [{ t: "BLOWS THE WATER", c: "#4a9aff" }], [{ t: "OFF THE SURFACE" }]]),
  Lb(b(9), OUT, "#ff8a1f", [[{ t: "ABOVE ~140°C:" }], [{ t: "MAILLARD REACTION", c: "#ff8a1f" }], [{ t: "= GOLDEN CRUNCH" }]]),
  Lb(OUT, b(13), "#6ee6cf", [[{ t: "SO IT'S NOT A FRYER" }], [{ t: "IT'S A MINI" }], [{ t: "TURBO OVEN!", c: "#6ee6cf" }]]),
  Lb(b(13), D + 0.01, "#ff8a1f", HOOK, true),
];
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const AirFryerK: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/14-airfryer/music_v2.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={AFK_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "hero" && <><Kitchen t={t} map={glow} /><AirFryer t={t} /></>}
        {s === "cut" && <Cutaway t={t} map={glow} />}
        {s === "macro" && <Macro t={t} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#fff08a" }}>@HOWTOWITHZAY</div>
      {s !== "hero" && <TagsView t={t} cam={cam} />}
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
