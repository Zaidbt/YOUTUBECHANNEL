/**
 * Video 014 · How does an air fryer actually work? — v2 ("one last try"): Kurzgesagt-faithful illustration and
 * animation, rendered through our pixel pipeline at 2x pixels (540x960) with a 48-colour palette.
 * Hero: a cinematic night kitchen (city window, clouds, moon, pendant lamp + light cone, utensils, bowl of fries,
 * foreground leaves) around a hero air fryer (cel-shadow, gloss, rim lights, glowing 200° display).
 * Inside: an infographic cutaway (heater bloom, fan blur, hot air as glowing comet trails).
 * Then a scale change Kurzgesagt-style: dive INTO a fry — water molecules get blown off the surface, then the crust
 * turns golden piece by piece (Maillard). Back out: DING. 30 s loop, 120 BPM stereo nu-disco (music_v2.wav).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./airfryer.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, blob, rrect, rrectLine, ribbon, curve, Disc } from "../../brand/flat";
import { G, Halo, CIRC, mixHex } from "../../brand/kz";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar, BT = BAR / 4;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;

export const AF2_PALETTE = [
  "#06071a", "#0a0b24", "#11143a", "#1a1f52", "#252d6e", "#33408f", "#4a5ab5", "#7a88d6",
  "#3a2466", "#5b3a8f", "#8a5ac0", "#c2457a", "#ff6f9c", "#ffb3c9",
  "#0b3a48", "#0e4a5a", "#14707a", "#1fa3a0", "#4fd6c4", "#a6f0e2",
  "#3a160f", "#5a1f1a", "#9a3a1f", "#d4602a", "#ff8a3d", "#ffb04a", "#ffd36a", "#fff1b0", "#fff8dc",
  "#ffe9a8", "#e8c46a", "#b07a2a", "#7a4a1a",
  "#2a2d4a", "#3a3f66", "#6a70a0", "#a9b0d8", "#e6e9ff", "#ffffff",
  "#1f7ab8", "#4a9aff", "#bfe6ff", "#05060f",
];
const BG = "#0a0b24";

// ---------------- timing ----------------
const IN = b(3), MAC = b(7), OUT = b(11), FADE = 0.3;
const scene = (t: number) => (t < IN || t >= OUT ? "hero" : t < MAC ? "cut" : "macro");
const temp = (t: number) => (t < IN + 0.5 ? 20 : 20 + 180 * ease((t - IN - 0.5) / (b(5) - IN - 0.8)));
const heat = (t: number) => (temp(t) - 20) / 180;
const partK = (t: number, i: number) => Math.max(0.001, backOut((t - EV.parts[i]) / 0.3));
const wrapAge = (t: number, p: number) => (((t - p) % D) + D) % D;                       // loops: a puff near the end carries over
const puffAge = (t: number) => Math.min(...EV.puffs.map((p) => wrapAge(t, p)));
const beatK = (t: number) => { const ph = (t % (BAR / 4)) / (BAR / 4); return Math.exp(-ph * 6); };   // kick on every beat

// ================= HERO: the night kitchen =================
const WALL = new THREE.PlaneGeometry(120, 80);
const TILE = rrect(-0.27, -0.27, 0.27, 0.27, 0.07), TILE_HI = rrect(-0.2, 0.17, 0.2, 0.22, 0.02);
const STARS = Array.from({ length: 26 }, (_, i) => ({ x: -1.9 + rnd(i + 10) * 3.8, y: -0.4 + rnd(i + 11) * 2.6, r: 0.02 + rnd(i + 12) * 0.04, ph: rnd(i + 13) * 6 }));
const CITY = Array.from({ length: 11 }, (_, i) => ({ x: -1.9 + i * 0.37, w: 0.3 + rnd(i + 30) * 0.08, h: 0.6 + rnd(i + 31) * 1.3 }));
const cloudG = blob([[-0.9, 0], [-0.6, 0.3], [-0.2, 0.42], [0.2, 0.55], [0.6, 0.35], [0.95, 0.05], [0.6, -0.12], [-0.5, -0.12]], 20);
const DUST = Array.from({ length: 40 }, (_, i) => ({ x: (rnd(i + 200) - 0.5) * 5, y: -1.5 + rnd(i + 201) * 6.5, r: 0.02 + rnd(i + 202) * 0.035, ph: rnd(i + 203) * 6 }));
const leafG = blob([[0, 0], [0.9, 0.4], [2.0, 0], [0.9, -0.4]], 18), leafVein = ribbon([[0.1, 0], [1.9, 0]], () => 0.035);
const coneG = blob([[-0.42, 5.2], [0.42, 5.2], [2.9, -1.9], [-2.9, -1.9]], 4);
const spatula = { stick: rrect(-0.04, -0.9, 0.04, 0.3, 0.03), head: rrect(-0.16, -1.25, 0.16, -0.85, 0.06) };
const ladle = { stick: rrect(-0.035, -0.8, 0.035, 0.3, 0.03), head: blob([[-0.2, -0.85], [0.2, -0.85], [0.15, -1.1], [0, -1.15], [-0.15, -1.1]], 12) };
const Kitchen: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <G g={WALL} c0="#06071a" c1="#33408f" rad={[0, 1.6, 9.5]} z={-30} />
    {/* backsplash tiles, brighter under the lamp */}
    {Array.from({ length: 14 * 9 }, (_, i) => { const cx = -3.9 + (i % 14) * 0.6, cy = -1.62 + Math.floor(i / 14) * 0.6, k = clamp01(1 - Math.hypot(cx * 0.45, (cy - 0.5) * 0.35) / 1.6); return (
      <group key={`t${i}`} position={[cx, cy, -6]}>
        <G g={TILE} c0={mixHex("#11143a", "#252d6e", k)} c1={mixHex("#1a1f52", "#4a5ab5", k)} a={[-0.27, 0.27]} />
        <G g={TILE_HI} c0="#7a88d6" z={0.01} o={0.12 + 0.3 * k} />
      </group>); })}
    {/* window: violet horizon, clouds, city, moon */}
    <group position={[-3.3, 4.9, -10]}>
      <G g={rrect(-2.15, -1.95, 2.15, 2.25, 0.4)} c0="#06071a" c1="#1a1f52" a={[-2, 2.2]} />
      <G g={rrect(-1.9, -1.7, 1.9, 2.0, 0.3)} c0="#c2457a" c1="#11143a" a={[-1.7, 1.2]} z={0.01} />
      {STARS.map((s, i) => <Disc key={i} at={[s.x, s.y]} r={s.r * (0.6 + 0.4 * Math.sin(6 * LW * t + s.ph))} c="#fff1b0" z={0.02} seg={6} />)}
      {[1.35, 1.0, 0.72].map((r, i) => <Disc key={`h${i}`} at={[0.8, 1.15]} r={r} c="#a9b0d8" z={0.03 + i * 0.002} o={0.06 + i * 0.05} seg={40} />)}
      <G g={CIRC} c0="#ffd36a" c1="#fff8dc" rad={[-0.3, 0.3, 1.1]} p={[0.8, 1.15]} s={0.48} z={0.04} />
      <Halo at={[0.8, 1.15]} r={1.4} c="#fff1b0" o={0.35} z={0.035} />
      {[[-0.6, 0.6, 0.0], [1.2, 0.2, 2.0], [-1.4, 1.5, 4.0]].map(([x, y, ph], i) => <G key={`cl${i}`} g={cloudG} c0="#3a2466" c1="#8a5ac0" a={[-0.12, 0.55]} p={[x + 0.25 * Math.sin(LW * t + ph), y]} s={0.9 - i * 0.15} z={0.05 + i * 0.002} o={0.9} />)}
      {CITY.map((c, i) => (
        <group key={`c${i}`} position={[c.x, -1.7, 0.08]}>
          <G g={rrect(-c.w / 2, 0, c.w / 2, c.h, 0.03)} c0="#06071a" c1="#11143a" a={[0, c.h]} />
          {Array.from({ length: Math.floor(c.h / 0.2) * 2 }, (_, k) => { const on = Math.sin(3 * LW * t + i * 3 + k * 1.7) > 0.2; return on && <Disc key={k} at={[(k % 2 ? 0.06 : -0.06), 0.14 + Math.floor(k / 2) * 0.2]} r={0.025} c="#ffd36a" z={0.01} seg={4} />; })}
        </group>
      ))}
      <G g={rrect(-0.06, -1.7, 0.06, 2.0, 0.03)} c0="#06071a" c1="#11143a" z={0.1} />
      <G g={rrect(-1.9, 0.12, 1.9, 0.24, 0.03)} c0="#06071a" c1="#11143a" z={0.1} />
      <G g={rrect(-2.3, -2.1, 2.3, -1.9, 0.06)} c0="#9a3a1f" c1="#ff8a3d" a={[-2.1, -1.9]} z={0.11} />
    </group>
    {/* shelf, jars, trailing plant, hanging utensils */}
    <group position={[2.5, 3.45, -7]}>
      <G g={rrect(-2.3, -0.13, 2.3, 0.13, 0.06)} c0="#9a3a1f" c1="#ffb04a" a={[-0.13, 0.13]} />
      {([[-1.5, "#0e4a5a", "#4fd6c4", 0.9], [-0.55, "#5b3a8f", "#ff6f9c", 1.2], [0.4, "#9a3a1f", "#ffd36a", 0.8]] as [number, string, string, number][]).map(([x, d, l, h], i) => (
        <group key={i} position={[x, 0.13 + h / 2, 0.01]} scale={[1, 1 + 0.03 * beatK(t) * (i === 1 ? 1 : 0.5), 1]}>
          <G g={rrect(-0.36, -h / 2, 0.36, h / 2, 0.16)} c0={d} c1={l} rad={[-0.15, h * 0.18, h * 0.85]} />
          <G g={rrect(-0.39, h / 2 - 0.05, 0.39, h / 2 + 0.13, 0.06)} c0="#9a3a1f" c1="#ffb04a" a={[h / 2 - 0.05, h / 2 + 0.13]} z={0.01} />
          <G g={blob([[-0.26, h / 2 - 0.18], [-0.16, h / 2 - 0.12], [-0.18, -h / 2 + 0.2], [-0.28, -h / 2 + 0.26]], 10)} c0="#ffffff" z={0.02} o={0.5} />
        </group>
      ))}
      <group position={[1.5, 0.13, 0.01]}>
        <G g={rrect(-0.32, 0, 0.32, 0.5, 0.1)} c0="#c2457a" c1="#ff6f9c" a={[0, 0.5]} />
        {[[-0.25, -1.0], [0.05, -1.4], [0.3, -0.8]].map(([x, y], i) => <G key={i} g={ribbon(curve([[x * 0.5, 0.05], [x, -0.3], [x + 0.1 * Math.sin(2 * LW * t + i), y]], 16), () => 0.045)} c0="#14707a" z={0.01} />)}
        {Array.from({ length: 9 }, (_, i) => { const x = [-0.25, 0.05, 0.3][i % 3], y = -0.25 - Math.floor(i / 3) * 0.33; return <group key={`lv${i}`} position={[x + 0.06 * Math.sin(2 * LW * t + i), y, 0.02]} rotation={[0, 0, -1.2 + (i % 2) * 2.4]} scale={0.14}><G g={leafG} c0="#14707a" c1="#4fd6c4" a={[-0.4, 0.4]} /></group>; })}
      </group>
      {[[-1.9, spatula], [-1.2, ladle]].map(([x, u], i) => (
        <group key={`u${i}`} position={[x as number, -0.15, -0.01]} rotation={[0, 0, 0.06 * Math.sin(3 * LW * t + i)]}>
          <G g={(u as typeof spatula).stick} c0="#3a3f66" c1="#a9b0d8" a={[-0.9, 0.3]} />
          <G g={(u as typeof spatula).head} c0="#6a70a0" c1="#e6e9ff" a={[-1.25, -0.85]} />
        </group>
      ))}
    </group>
    {/* pendant lamp + light cone */}
    <G g={rrect(-0.03, 5.7, 0.03, 12, 0.01)} c0="#06071a" z={-3} />
    <G g={blob([[-0.85, 5.15], [0.85, 5.15], [0.5, 5.8], [-0.5, 5.8]], 10)} c0="#d4602a" c1="#ffd36a" a={[5.15, 5.8]} z={-2.9} />
    <G g={rrect(-0.85, 5.1, 0.85, 5.2, 0.05)} c0="#fff1b0" z={-2.89} />
    <G g={coneG} c0="#ffd36a" c1="#fff8dc" a={[-1.9, 5.2]} z={-2.95} o={0.11 + 0.025 * Math.sin(4 * LW * t)} />
    <Halo at={[0, 5.1]} r={1.5} c="#ffd36a" o={0.8} z={-2.8} />
    {/* counter + bowl of raw fries + a potato */}
    <G g={rrect(-30, -2.36, 30, -1.9, 0.05)} c0="#7a4a1a" c1="#ffb04a" a={[-2.36, -1.9]} z={-0.5} />
    <G g={rrect(-30, -1.97, 30, -1.9, 0.02)} c0="#fff1b0" z={-0.49} />
    <G g={rrect(-30, -16, 30, -2.36, 0.02)} c0="#06071a" c1="#14707a" a={[-8, -2.36]} z={-0.6} />
    {[-3.6, -1.2, 1.2, 3.6].map((x) => <React.Fragment key={x}><G g={rrectLine(x - 1.1, -7, x + 1.1, -2.62, 0.14, 0.06)} c0="#0b3a48" c1="#1fa3a0" a={[-7, -2.6]} z={-0.59} /><G g={rrect(x + 0.6, -3.2, x + 0.95, -3.1, 0.04)} c0="#ffd36a" z={-0.58} /></React.Fragment>)}
    <group position={[-2.45, -1.9, 0.2]}>
      {[-0.22, -0.08, 0.06, 0.2, -0.15, 0.12].map((x, i) => <group key={i} position={[x, 0.45 + (i % 3) * 0.05, -0.01]} rotation={[0, 0, x * 1.2]}><G g={rrect(-0.05, -0.32, 0.05, 0.32, 0.04)} c0="#e8c46a" c1="#fff1b0" a={[-0.3, 0.3]} /></group>)}
      <G g={blob([[-0.6, 0.45], [0.6, 0.45], [0.42, 0.05], [0, -0.02], [-0.42, 0.05]], 16)} c0="#0b3a48" c1="#4fd6c4" a={[0, 0.45]} />
      <G g={rrect(-0.6, 0.4, 0.6, 0.48, 0.04)} c0="#a6f0e2" z={0.01} />
    </group>
    <group position={[2.4, -1.62, 0.2]} rotation={[0, 0, 0.2]}>
      <G g={blob([[-0.38, 0], [-0.2, 0.24], [0.25, 0.22], [0.4, 0], [0.2, -0.24], [-0.25, -0.22]], 16)} c0="#7a4a1a" c1="#e8c46a" rad={[-0.1, 0.1, 0.5]} />
      {[[-0.12, 0.05], [0.1, -0.08], [0.2, 0.1]].map(([x, y], i) => <Disc key={i} at={[x, y]} r={0.025} c="#7a4a1a" z={0.01} seg={6} />)}
    </group>
    {DUST.map((d, i) => <Disc key={`du${i}`} at={[d.x + 0.2 * Math.sin(2 * LW * t + d.ph), d.y + 0.25 * Math.sin(3 * LW * t + d.ph)]} r={d.r} c="#fff1b0" z={1} o={0.3 + 0.4 * Math.max(0, Math.sin(5 * LW * t + d.ph))} seg={8} />)}
    {/* foreground leaves (depth) */}
    <group position={[-3.2, -3.3, 5]} rotation={[0, 0, 0.9 + 0.04 * Math.sin(2 * LW * t)]} scale={1.6}><G g={leafG} c0="#06071a" c1="#0e4a5a" a={[-0.4, 0.4]} /><G g={leafVein} c0="#14707a" z={0.01} o={0.6} /></group>
    <group position={[3.4, -3.0, 5]} rotation={[0, 0, 2.3 + 0.04 * Math.sin(2 * LW * t + 1)]} scale={1.3}><G g={leafG} c0="#06071a" c1="#0e4a5a" a={[-0.4, 0.4]} /></group>
  </group>
);

// ---------------- the hero air fryer ----------------
const SEG: Record<string, P2[]> = {};
const segRects = (d: string, x: number, y: number, w: number, h: number) => {
  const on: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg" };
  const th = w * 0.22, out: THREE.ShapeGeometry[] = [];
  const S: Record<string, [number, number, number, number]> = { a: [x, y + h - th, x + w, y + h], g: [x, y + h / 2 - th / 2, x + w, y + h / 2 + th / 2], d: [x, y, x + w, y + th], f: [x, y + h / 2, x + th, y + h], b: [x + w - th, y + h / 2, x + w, y + h], e: [x, y, x + th, y + h / 2], c: [x + w - th, y, x + w, y + h / 2] };
  for (const s of on[d] ?? "") { const [x0, y0, x1, y1] = S[s]; out.push(rrect(x0, y0, x1, y1, th * 0.3)); }
  return out;
};
void SEG;
const AF = {
  body: rrect(-1.6, -1.9, 1.6, 1.9, 0.68), lid: rrect(-1.6, 1.25, 1.6, 1.9, 0.62), shade: blob([[0.7, 1.86], [1.42, 1.7], [1.6, 0], [1.42, -1.75], [0.7, -1.9], [0.95, 0]], 24),
  gloss: rrect(-1.38, -1.3, -1.2, 1.35, 0.09), gloss2: rrect(-1.12, 0.2, -1.04, 1.35, 0.04), panel: rrect(-1.2, 0.42, 1.2, 1.18, 0.32),
  display: rrect(-0.98, 0.56, 0.12, 1.04, 0.14), drawer: rrect(-1.4, -1.76, 1.4, 0.28, 0.48), window: rrect(-0.9, -1.25, 0.9, -0.2, 0.27),
  glare: blob([[-0.72, -0.28], [-0.48, -0.28], [-0.78, -1.12], [-0.88, -0.98]], 6), handle: rrect(-0.64, -0.03, 0.64, 0.21, 0.11), handleHi: rrect(-0.5, 0.14, 0.5, 0.18, 0.02),
  rimR: ribbon(curve([[1.5, 1.45], [1.6, 0], [1.5, -1.55]], 24), (u) => 0.08 * Math.sin(Math.PI * u) + 0.01),
  rimL: ribbon(curve([[-1.5, 1.45], [-1.6, 0], [-1.5, -1.55]], 24), (u) => 0.05 * Math.sin(Math.PI * u) + 0.01),
  feet: [rrect(-1.25, -2.0, -0.75, -1.85, 0.06), rrect(0.75, -2.0, 1.25, -1.85, 0.06)],
  vents: [-0.6, -0.3, 0, 0.3, 0.6].map((x) => rrect(x - 0.09, 1.52, x + 0.09, 1.6, 0.03)),
  digits: [...segRects("2", -0.88, 0.64, 0.2, 0.32), ...segRects("0", -0.6, 0.64, 0.2, 0.32), ...segRects("0", -0.32, 0.64, 0.2, 0.32)],
  deg: rrectLine(-0.07, 0.86, 0.01, 0.94, 0.03, 0.025),
};
const FRY_SIL = Array.from({ length: 7 }, (_, i) => ({ x: -0.62 + i * 0.205, r: (rnd(i + 70) - 0.5) * 0.9 }));
const fryS = rrect(-0.065, -0.3, 0.065, 0.3, 0.06);
const AirFryer: React.FC<{ t: number }> = ({ t }) => {
  const pa = puffAge(t), sq = (pa < 0.4 ? 0.06 * Math.exp(-pa / 0.09) : 0) + 0.012 * beatK(t);
  const drawer = t >= EV.ding && t < EV.ding + 1.4 ? backOut((t - EV.ding) / 0.35) * (1 - ease((t - EV.ding - 0.95) / 0.4)) : 0;
  const golden = t >= OUT && t < EV.ding + 1.4;                            // the cooked batch, then a fresh one (loop)
  const flick = 0.85 + 0.15 * Math.sin(12 * LW * t);
  return (
    <group>
      <mesh position={[0.3, -1.97, -0.25]} scale={[2.4, 0.17, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#05060f" transparent opacity={0.5} /></mesh>
      <group scale={[1 + sq * 0.6, 1 - sq, 1]} position={[0, -1.9 * sq, 0]}>
        {AF.feet.map((g, i) => <G key={i} g={g} c0="#05060f" c1="#11143a" a={[-2, -1.85]} z={-0.01} />)}
        <G g={AF.body} c0="#0a0b24" c1="#33408f" a={[-1.9, 1.9]} />
        <G g={AF.lid} c0="#252d6e" c1="#4a5ab5" a={[1.25, 1.9]} z={0.005} />
        <G g={AF.shade} c0="#05060f" z={0.01} o={0.35} />
        <G g={AF.gloss} c0="#ffffff" z={0.02} o={0.13} />
        <G g={AF.gloss2} c0="#ffffff" z={0.02} o={0.18} />
        <G g={AF.rimR} c0="#c2457a" c1="#ffb3c9" a={[-1.5, 1.4]} z={0.02} />
        <G g={AF.rimL} c0="#14707a" c1="#4fd6c4" a={[-1.5, 1.4]} z={0.02} o={0.8} />
        {AF.vents.map((g, i) => <G key={`v${i}`} g={g} c0="#05060f" z={0.02} />)}
        <G g={AF.panel} c0="#05060f" c1="#11143a" a={[0.42, 1.18]} z={0.02} />
        <G g={AF.display} c0="#3a160f" c1="#5a1f1a" a={[0.56, 1.04]} z={0.03} />
        {AF.digits.map((g, i) => <G key={`dg${i}`} g={g} c0="#ffb04a" c1="#fff1b0" a={[0.64, 0.96]} z={0.04} />)}
        <G g={AF.deg} c0="#ffd36a" z={0.04} />
        <Halo at={[-0.42, 0.8]} r={1.0} c="#ff8a3d" o={0.5 * flick} z={0.05} />
        {Array.from({ length: 9 }, (_, i) => { const a = -2.4 + (i / 8) * 4.8; return <G key={`tk${i}`} g={rrect(-0.012, 0.36, 0.012, 0.43, 0.005)} c0="#6a70a0" p={[0.68, 0.8]} r={a} z={0.03} />; })}
        <G g={CIRC} c0="#3a3f66" c1="#e6e9ff" rad={[-0.35, 0.35, 1.25]} p={[0.68, 0.8]} s={0.3} z={0.035} />
        <group position={[0.68, 0.8, 0.04]} rotation={[0, 0, -0.7 + 0.05 * Math.sin(4 * LW * t)]}><G g={rrect(-0.035, 0.05, 0.035, 0.25, 0.02)} c0="#ff8a3d" /></group>
        {/* drawer with a glowing window */}
        <group position={[0, -0.11 * drawer, 0.05 + drawer * 0.6]} scale={1 + drawer * 0.06}>
          <G g={AF.drawer} c0="#0a0b24" c1="#252d6e" a={[-1.76, 0.28]} />
          <G g={AF.window} c0="#3a160f" c1="#ff8a3d" rad={[0, -1.0, 1.1]} z={0.01} />
          {FRY_SIL.map((f, i) => <group key={i} position={[f.x, -0.82, 0.02]} rotation={[0, 0, f.r]}><G g={fryS} c0={golden ? "#b07a2a" : "#e8c46a"} c1={golden ? "#ffb04a" : "#fff1b0"} a={[-0.3, 0.3]} /></group>)}
          {[0, 1, 2].map((k) => { const u = ((t * 0.6 + k / 3) % 1); return <Disc key={`st${k}`} at={[-0.4 + k * 0.4 + 0.08 * Math.sin(u * 8), -0.75 + u * 0.45]} r={0.07 + u * 0.06} c="#ffd36a" z={0.025} o={0.35 * (1 - u)} seg={12} />; })}
          <Halo at={[0, -0.75]} r={1.1} c="#ff8a3d" o={0.4 * flick} z={0.03} />
          <G g={AF.glare} c0="#ffffff" z={0.04} o={0.2} />
          <G g={AF.handle} c0="#3a3f66" c1="#e6e9ff" a={[-0.03, 0.21]} z={0.05} />
          <G g={AF.handleHi} c0="#ffffff" z={0.06} o={0.7} />
        </group>
      </group>
      {/* steam puffs on the snares */}
      {EV.puffs.map((p, i) => { const a = wrapAge(t, p); if (a > 1.4) return null; const k = backOut(a / 0.3), up = a * 1.25, o = 1 - a / 1.4; return (
        <group key={`p${i}`} position={[(i % 2 ? 0.35 : -0.35) + 0.2 * Math.sin(a * 4), 1.95 + up, 0.3]} scale={k * (0.6 + a * 0.55)}>
          {[[-0.25, 0, 0.28], [0.15, 0.1, 0.34], [0.0, 0.32, 0.26], [0.32, 0.3, 0.2]].map(([x, y, r], j) => <G key={j} g={CIRC} c0="#7a88d6" c1="#ffffff" rad={[-0.35, 0.35, 1.5]} p={[x, y]} s={r} z={j * 0.001} o={o * 0.9} />)}
        </group>); })}
    </group>
  );
};

// ================= CUTAWAY =================
const SH = { x0: -2.6, x1: 2.6, y0: -3.0, y1: 3.4 };
const fanBlade = blob([[0, 0.09], [0.55, 0.2], [1.05, 0.0], [0.55, -0.13], [0, -0.09]], 12);
const COIL: P2[] = Array.from({ length: 91 }, (_, i) => [-1.7 + (i / 90) * 3.4, 1.9 + 0.18 * Math.sin((i / 90) * Math.PI * 14)]);
const coilG = ribbon(COIL, () => 0.14), coilCore = ribbon(COIL, () => 0.045);
const FRIES = Array.from({ length: 16 }, (_, i) => ({ x: -1.35 + (i % 8) * 0.38 + (rnd(i + 30) - 0.5) * 0.1, y: -1.25 + Math.floor(i / 8) * 0.55 + (rnd(i + 31) - 0.5) * 0.12, r: (rnd(i + 32) - 0.5) * 1.2 }));
const fryG = rrect(-0.1, -0.42, 0.1, 0.42, 0.08), fryHi = rrect(-0.06, -0.3, -0.015, 0.34, 0.022), fryTip = rrect(-0.1, 0.3, 0.1, 0.42, 0.08);
const loopPts = (s: number): P2[] => curve([[0, 2.25], [s * 1.6, 2.35], [s * 2.25, 1.6], [s * 2.3, -1.0], [s * 2.0, -2.45], [s * 0.9, -2.55], [s * 0.6, -1.7], [s * 0.7, -0.6], [s * 0.35, 0.8], [0, 2.0]], 160);
const LOOPS = [loopPts(1), loopPts(-1)];
const at = (pts: P2[], u: number): P2 => pts[Math.min(pts.length - 1, Math.max(0, Math.floor(((u % 1) + 1) % 1 * (pts.length - 1))))];
const Cutaway: React.FC<{ t: number }> = ({ t }) => {
  const h = heat(t), air = clamp01((t - b(5)) / 0.5), fanSpin = t * (4 + 16 * clamp01((t - b(4.5)) / 1)), tin = t - IN;
  return (
    <group>
      <G g={WALL} c0="#06071a" c1="#1a1f52" rad={[0, 0.5, 8]} z={-5} />
      {[2.2, 3.6, 5.0].map((r, i) => <G key={`ring${i}`} g={new THREE.RingGeometry(r - 0.02, r + 0.02, 64)} c0="#4a5ab5" z={-4.9} o={0.12} />)}
      <Halo at={[0, 2.0]} r={4 + 2.5 * h} c="#ff8a3d" o={0.12 + 0.35 * h} z={-4.5} />
      {Array.from({ length: 26 }, (_, i) => <Disc key={`pa${i}`} at={[(rnd(i + 400) - 0.5) * 7 + 0.2 * Math.sin(2 * LW * t + i), (rnd(i + 410) - 0.5) * 9 + 0.3 * Math.cos(3 * LW * t + i)]} r={0.03} c="#a9b0d8" z={-1} o={0.6} seg={6} />)}
      {/* shell: metal wall + chamber + highlighted cut edge */}
      <G g={rrect(SH.x0 - 0.25, SH.y0 - 0.25, SH.x1 + 0.25, SH.y1 + 0.25, 0.95)} c0="#0a0b24" c1="#33408f" a={[SH.y0, SH.y1]} z={-0.55} />
      <G g={rrect(SH.x0, SH.y0, SH.x1, SH.y1, 0.75)} c0="#05060f" c1="#1a1f52" a={[SH.y0, SH.y1]} z={-0.5} />
      <G g={rrectLine(SH.x0 - 0.25, SH.y0 - 0.25, SH.x1 + 0.25, SH.y1 + 0.25, 0.95, 0.06)} c0="#7a88d6" c1="#e6e9ff" a={[SH.y0, SH.y1]} z={-0.45} />
      <G g={rrect(-0.65, 2.88, 0.65, 3.32, 0.12)} c0="#252d6e" c1="#4a5ab5" a={[2.88, 3.32]} z={-0.4} />
      <G g={ribbon(curve([[-2.2, -2.55], [-1.1, -2.72], [0, -2.45], [1.1, -2.72], [2.2, -2.55]], 30), () => 0.14)} c0="#3a3f66" c1="#6a70a0" a={[-2.8, -2.4]} z={-0.4} />
      {/* fan + blur disc */}
      <group position={[0, 2.55, -0.3]} scale={partK(t, 0)}>
        <G g={CIRC} c0="#a9b0d8" c1="#e6e9ff" rad={[0, 0, 1]} s={[1.05, 0.58]} o={0.08 + 0.15 * clamp01((t - b(4.5)) / 1)} z={-0.02} />
        {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[0, 0, fanSpin + (i / 5) * Math.PI * 2]} scale={[1, 0.55, 1]}><G g={fanBlade} c0="#6a70a0" c1="#e6e9ff" a={[-0.13, 0.2]} /></group>)}
        <G g={CIRC} c0="#252d6e" c1="#7a88d6" rad={[-0.3, 0.3, 1.2]} s={0.22} z={0.02} />
      </group>
      {/* heater: glowing coil, white-hot core, bloom, rising sparks */}
      <group scale={[1, partK(t, 1), 1]} position={[0, 1.9 * (1 - partK(t, 1)), 0]}>
        <G g={coilG} c0={mixHex("#3a3f66", "#9a3a1f", h * 1.5)} c1={mixHex("#6a70a0", "#ff8a3d", h * 1.3)} a={[1.7, 2.1]} z={-0.2} />
        {h > 0.15 && <G g={coilCore} c0="#ffd36a" c1="#fff8dc" z={-0.19} o={clamp01(h * 1.4)} />}
        {h > 0.2 && Array.from({ length: 7 }, (_, i) => <Halo key={`cg${i}`} at={[-1.5 + i * 0.5, 1.9]} r={0.75 * h + 0.2} c="#ff8a3d" o={0.55 * h} z={-0.18} />)}
        {h > 0.4 && Array.from({ length: 10 }, (_, i) => { const u = (t * 0.9 + i * 0.137) % 1; return <Disc key={`sp${i}`} at={[-1.6 + ((i * 0.37) % 1) * 3.2 + 0.1 * Math.sin(u * 9), 2.0 + u * 0.7]} r={0.025} c="#ffd36a" z={-0.17} o={(1 - u) * h} seg={6} />; })}
      </group>
      {/* hot air: comet trails */}
      {air > 0 && LOOPS.map((pts, li) => Array.from({ length: 7 }, (_, k) => { const head = (k / 7 + t * 0.42) % 1; return (
        <group key={`cm${li}-${k}`}>
          {Array.from({ length: 14 }, (_, j) => { const q = at(pts, head - j * 0.009), f = 1 - j / 14; return <Disc key={j} at={q} r={(0.03 + 0.11 * f) * air} c={mixHex("#d4602a", "#fff1b0", f)} z={0.25 + f * 0.01} o={0.85 * f} seg={10} />; })}
          <Halo at={at(pts, head)} r={0.45 * air} c="#ffb04a" o={0.45} z={0.24} />
        </group>); }))}
      {/* basket */}
      <group scale={partK(t, 2)}>
        <G g={rrectLine(-1.75, -1.65, 1.75, 0.55, 0.28, 0.09)} c0="#6a70a0" c1="#e6e9ff" a={[-1.65, 0.55]} z={-0.1} />
        {Array.from({ length: 11 }, (_, i) => <G key={`mesh${i}`} g={rrect(-1.45 + i * 0.29, -1.6, -1.43 + i * 0.29, 0.5, 0.005)} c0="#6a70a0" z={-0.12} o={0.35} />)}
        {Array.from({ length: 12 }, (_, i) => <G key={`h${i}`} g={rrect(-1.6 + i * 0.29, -1.7, -1.45 + i * 0.29, -1.6, 0.02)} c0="#05060f" z={-0.09} />)}
        {FRIES.map((fr, i) => { const jig = air * 0.04 * Math.sin(t * 20 + i); return (
          <group key={`f${i}`} position={[fr.x, fr.y + jig, 0.05 + i * 0.002]} rotation={[0, 0, fr.r + jig]}>
            <G g={fryG} c0="#e8c46a" c1="#fff1b0" a={[-0.42, 0.42]} />
            <G g={fryTip} c0="#e8c46a" z={0.001} o={0.6} />
            <G g={fryHi} c0="#ffffff" z={0.002} o={0.45} />
          </group>); })}
      </group>
      {/* thermometer */}
      <group position={[3.05, 0.4, 0]} scale={Math.max(0.001, backOut((tin - 0.8) / 0.3))}>
        <G g={rrect(-0.22, -1.8, 0.22, 1.8, 0.22)} c0="#6a70a0" c1="#e6e9ff" a={[-1.8, 1.8]} o={0.9} />
        <G g={rrect(-0.11, -1.7, 0.11, -1.7 + 3.3 * (0.08 + 0.92 * h), 0.1)} c0={mixHex("#ffb04a", "#c2457a", h)} c1={mixHex("#ffd36a", "#ff6f9c", h)} a={[-1.7, 1.6]} z={0.01} />
        <G g={CIRC} c0={mixHex("#ff8a3d", "#c2457a", h)} c1={mixHex("#ffd36a", "#ffb3c9", h)} rad={[-0.3, 0.3, 1.3]} p={[0, -1.9]} s={0.33} z={0.02} />
        <Halo at={[0, -1.9]} r={0.9} c="#ff6f9c" o={0.3 + 0.4 * h} z={0.03} />
      </group>
    </group>
  );
};

// ================= MACRO: the surface of one fry =================
const MX = (i: number) => -4.2 + i * 0.56;                    // molecule i / crust piece i along the surface
const surfY = (x: number) => 0.06 * Math.sin(x * 4.1) + 0.04 * Math.sin(x * 9.3 + 1);
const SURF: P2[] = Array.from({ length: 161 }, (_, i) => { const x = -6 + i * 0.075; return [x, surfY(x)]; });
const fryBody = (() => { const s = new THREE.Shape(); s.moveTo(-6, -8); s.lineTo(6, -8); for (let i = SURF.length - 1; i >= 0; i--) s.lineTo(SURF[i][0], SURF[i][1]); s.lineTo(-6, -8); return new THREE.ShapeGeometry(s); })();
const crustSeg = (i: number) => { const x0 = MX(i) - 0.28, x1 = MX(i) + 0.28; const pts = SURF.filter(([x]) => x >= x0 - 0.04 && x <= x1 + 0.04).map(([x, y]) => [x, y - 0.14] as P2); return ribbon(pts, () => 0.32); };
const CRUST = Array.from({ length: 16 }, (_, i) => crustSeg(i));
const CELLS = Array.from({ length: 70 }, (_, i) => ({ x: -5.6 + (i % 14) * 0.8 + (Math.floor(i / 14) % 2) * 0.4, y: -0.75 - Math.floor(i / 14) * 0.62 }));
const cellG = blob([[-0.34, 0], [-0.18, 0.26], [0.18, 0.26], [0.34, 0], [0.18, -0.26], [-0.18, -0.26]], 12);
const WIND = Array.from({ length: 9 }, (_, i) => ({ y: 0.6 + (i % 5) * 0.42, len: 1.2 + rnd(i + 600) * 1.4, ph: rnd(i + 601) }));
const Macro: React.FC<{ t: number }> = ({ t }) => {
  const wind = clamp01((t - MAC) / 0.6);
  return (
    <group>
      <G g={WALL} c0="#11143a" c1="#9a3a1f" a={[-2, 7]} z={-6} />
      <Halo at={[0, 6]} r={7} c="#ff8a3d" o={0.35} z={-5.5} />
      {Array.from({ length: 30 }, (_, i) => <Disc key={`mp${i}`} at={[(rnd(i + 700) - 0.5) * 12 + 0.6 * Math.sin(2 * LW * t + i), 0.4 + rnd(i + 701) * 4.5]} r={0.03} c="#ffd36a" z={-1} o={0.5} seg={6} />)}
      {/* the fry: starchy inside + surface */}
      <G g={fryBody} c0="#e8c46a" c1="#fff1b0" a={[-4, 0]} z={-0.4} />
      {CELLS.map((c, i) => <G key={`ce${i}`} g={cellG} c0="#ffe9a8" c1="#fff8dc" rad={[-0.08, 0.08, 0.36]} p={[c.x, c.y]} z={-0.35} o={0.75} />)}
      <G g={ribbon(SURF, () => 0.08)} c0="#fff8dc" z={-0.3} />
      {/* crust pieces turning golden (Maillard) */}
      {CRUST.map((g, i) => { const gt = EV.golden[15 - i], k = t >= gt ? backOut((t - gt) / 0.3) : 0, gold = Math.min(1, k); return (
        <group key={`cr${i}`}>
          <G g={g} c0={mixHex("#ffe9a8", "#9a3a1f", gold)} c1={mixHex("#fff8dc", "#ffb04a", gold)} a={[-0.4, 0.1]} z={-0.28} />
          {gold > 0.3 && [0, 1, 2].map((j) => <Disc key={j} at={[MX(i) - 0.18 + j * 0.18, surfY(MX(i)) - 0.12 + (j % 2) * 0.06]} r={0.035 * gold} c="#7a4a1a" z={-0.27} seg={8} />)}
          {t >= gt && t - gt < 0.6 && <Halo at={[MX(i), surfY(MX(i))]} r={0.35 + (t - gt) * 1.6} c="#ffd36a" o={1 - (t - gt) / 0.6} z={0.3} />}
          {t >= gt && t - gt < 2.2 && [0, 1].map((j) => { const u = clamp01((t - gt) / 2.2); return <G key={`ar${j}`} g={ribbon(curve([[MX(i) + j * 0.15, 0.1], [MX(i) + 0.15 * Math.sin(u * 6 + j), 0.5 + u * 0.8], [MX(i) - 0.1 + j * 0.2, 0.9 + u * 1.6]], 12), () => 0.04)} c0="#ffb04a" c1="#ffd36a" a={[0, 2]} z={0.2} o={0.6 * (1 - u)} />; })}
        </group>); })}
      {/* hot wind streaks */}
      {WIND.map((w, i) => { const u = (t * 0.55 + w.ph) % 1, x = -7 + u * 14; return <G key={`wd${i}`} g={ribbon(curve([[x - w.len, w.y], [x - w.len / 2, w.y + 0.08 * Math.sin(i)], [x, w.y]], 16), (k) => 0.05 * k)} c0="#ffd36a" c1="#fff8dc" z={0.3} o={0.65 * wind} />; })}
      {/* water molecules: H2O — blown off on every 8th */}
      {Array.from({ length: 16 }, (_, i) => { const dt = EV.drops[i], a = t - dt, x0 = MX(i), y0 = surfY(x0) + 0.34;
        if (a > 1.6) return null;
        const fly = a > 0 ? a : 0, pop = a > 0 ? backOut(a / 0.25) : 1, wob = 0.03 * Math.sin(8 * LW * t * 3 + i);
        const x = x0 + fly * fly * 2.6, y = y0 + (a > 0 ? Math.sin(Math.min(a, 0.6) / 0.6 * Math.PI / 2) * 1.2 + fly * 0.4 : wob);
        const o = a > 0 ? 1 - clamp01((a - 0.8) / 0.8) : 1, rot = fly * 6;
        return (
          <group key={`m${i}`} position={[x, y, 0.1 + i * 0.002]} rotation={[0, 0, rot]} scale={a > 0 ? pop : 1}>
            <G g={CIRC} c0="#1f7ab8" c1="#bfe6ff" rad={[-0.3, 0.3, 1.2]} s={0.26} o={o} />
            <G g={CIRC} c0="#a9b0d8" c1="#ffffff" rad={[-0.3, 0.3, 1.2]} p={[-0.25, 0.2]} s={0.13} z={-0.01} o={o} />
            <G g={CIRC} c0="#a9b0d8" c1="#ffffff" rad={[-0.3, 0.3, 1.2]} p={[0.25, 0.2]} s={0.13} z={-0.01} o={o} />
            <Disc at={[-0.08, 0.09]} r={0.05} c="#ffffff" z={0.01} o={0.8 * o} seg={8} />
          </group>); })}
    </group>
  );
};

// ================= tags, camera, labels =================
type Tag = { txt: string | ((t: number) => string); at: V3; from: number; to: number; col: string };
const TAGS: Tag[] = [
  { txt: "FAN", at: [-1.35, 3.15, 0.5], from: EV.parts[0], to: MAC, col: "#e6e9ff" },
  { txt: "HEATER", at: [-1.15, 2.45, 0.5], from: EV.parts[1], to: MAC, col: "#ff8a3d" },
  { txt: "BASKET", at: [1.2, 0.8, 0.5], from: EV.parts[2], to: MAC, col: "#4fd6c4" },
  { txt: (t) => `${Math.round(temp(t))}°C`, at: [2.95, 2.55, 0.5], from: IN + 1.0, to: MAC, col: "#ff6f9c" },
  { txt: "HOT AIR", at: [-2.25, -0.4, 0.5], from: b(5) + 0.3, to: MAC, col: "#ffb04a" },
  { txt: "WATER", at: [MX(1), 1.25, 0.5], from: MAC + 0.6, to: b(8), col: "#bfe6ff" },
  { txt: "CRUST", at: [MX(13), 0.75, 0.5], from: b(9) + 0.4, to: OUT, col: "#ffb04a" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(6,7,26,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{typeof g.txt === "function" ? g.txt(t) : g.txt}</div>); })}</>
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
  { t: b(9.1), p: [MX(15), 1.0, 22], l: [MX(15), 1.0, 0] },
  { t: OUT - 0.5, p: [MX(1), 0.9, 21], l: [MX(1), 0.9, 0] },
  { t: OUT, p: [MX(1), 0.1, 4], l: [MX(1), 0.1, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, ...WIN },
  { t: OUT + 0.4, p: [0, -0.5, 9], l: [0, -0.5, 0] },
  { t: OUT + 1.3, p: [0, 1.1, 22], l: [0, 1.1, 0] },
  { t: D - 2.6, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => { const s = scene(t); return s === "cut" ? camAt(CAM_C, t) : s === "macro" ? camAt(CAM_M, t) : t < IN ? camAt(CAM_A, t) : camAt(CAM_B, t); };
const diveAt = (t: number) => Math.max(...[IN, MAC, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - MAC) < 1 ? "#fff1b0" : Math.abs(t - OUT) < 1 ? "#ffd36a" : "#3a160f");

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES AN" }], [{ t: "AIR FRYER", c: "#ff8a3d" }], [{ t: "ACTUALLY WORK? 🍟" }]];
const LABELS: LabelDef[] = [
  Lb(0, b(2), "#ff8a3d", HOOK, true),
  Lb(b(2), IN + 0.3, "#ff6f9c", [[{ t: "SPOILER:" }], [{ t: "IT DOESN'T FRY 😮", c: "#ff6f9c" }]]),
  Lb(IN + 0.3, b(5), "#ff8a3d", [[{ t: "A HEATER GETS" }], [{ t: "SUPER HOT", c: "#ff8a3d" }], [{ t: "UP TO 200°C" }]]),
  Lb(b(5), MAC, "#ffb04a", [[{ t: "A FAN BLOWS" }], [{ t: "THE HOT AIR", c: "#ffb04a" }], [{ t: "AROUND, FAST 🌪️" }]]),
  Lb(MAC, b(9), "#bfe6ff", [[{ t: "THE HOT WIND" }], [{ t: "BLOWS THE WATER", c: "#bfe6ff" }], [{ t: "OFF THE SURFACE" }]]),
  Lb(b(9), OUT, "#ffb04a", [[{ t: "ABOVE ~140°C:" }], [{ t: "MAILLARD REACTION", c: "#ffb04a" }], [{ t: "= GOLDEN CRUNCH" }]]),
  Lb(OUT, b(13), "#4fd6c4", [[{ t: "SO IT'S NOT A FRYER" }], [{ t: "IT'S A MINI" }], [{ t: "TURBO OVEN!", c: "#4fd6c4" }]]),
  Lb(b(13), D + 0.01, "#ff8a3d", HOOK, true),
];
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const AirFryerV2: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/14-airfryer/music_v2.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={AF2_PALETTE} outline={false} dither={0.06} scale={2}>
        <CamSet p={cam.p} l={cam.l} />
        {s === "hero" && <><Kitchen t={t} /><AirFryer t={t} /></>}
        {s === "cut" && <Cutaway t={t} />}
        {s === "macro" && <Macro t={t} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ff8a3d" }}>@HOWTOWITHZAY</div>
      {s !== "hero" && <TagsView t={t} cam={cam} />}
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
