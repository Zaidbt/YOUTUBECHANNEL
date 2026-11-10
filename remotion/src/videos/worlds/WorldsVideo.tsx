/**
 * Video 022 · CHOOSE A WORLD TO SURVIVE ON FOR 1 YEAR — a "pick one and comment it" video (concept reference: Helmet
 * Simulations, "Choose a world to survive on for two years"), in our Kurzgesagt-flat pixel style, every line real science.
 * A game menu of 4 numbered worlds, then one quiet scene per world with three short typed lines and a stat card.
 * Facts: MARS — sunsets are blue (dust scatters blue forward), surface pressure ~0.006 bar (< 1 % of Earth), mean
 * -63 °C, 0.38 g, lasting liquid water ended ~3 billion years ago. VENUS at ~55 km — ~27 °C and ~0.5 bar (surface:
 * 465 °C, 92 bar), 0.90 g, sulfuric-acid rain evaporates before reaching the ground (virga). TITAN — -179 °C, 1.45 bar
 * (no pressure suit), 0.14 g, methane rain falling slowly (~1.6 m/s), a human with wings could fly. EUROPA — Jupiter
 * hangs fixed in the sky (tidal lock), ~5.4 Sv/day of radiation (lethal in about a day), -160 °C, 0.13 g, an ocean under
 * the ice with about twice the water of Earth's oceans.
 * 40 s loop, 90 BPM dreamy half-time synth (worlds.json + music.wav from videos/22-worlds/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./worlds.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar, BEAT = BAR / 4;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const W = EV.w as number[], END = EV.end, CAPS = EV.caps as number[][], CURSOR = EV.cursor as number[], DROPS = EV.drops as number[], GEIGER = EV.geiger as number[];
const FADE = 0.3;

export const WORLDS_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#9aa0b8", "#5a607a", "#3a3f5a",
];
const BG = "#090d2b";
const world = (t: number) => (t < W[0] || t >= END ? -1 : t < W[1] ? 0 : t < W[2] ? 1 : t < W[3] ? 2 : 3);
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 5);
const STARS = Array.from({ length: 90 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 14, y: (rnd(i + 501) - 0.5) * 16, s: 0.03 + rnd(i + 502) * 0.05, ph: rnd(i + 503) * 6 }));
const Stars: React.FC<{ t: number; z?: number }> = ({ t, z = -20 }) => <>{STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={z} seg={6} />)}</>;
const sky = (c: string, y0 = -9, y1 = 9, z = -19) => <Flat g={rrect(-9, y0, 9, y1, 0)} c={c} z={z} />;
const ground = (pts: P2[]) => blob([...pts, [pts[pts.length - 1][0], -9], [pts[0][0], -9]], 48);
const crescent = (r: number, k = 0.55) => blob([...Array.from({ length: 13 }, (_, i) => { const a = -Math.PI / 2 + (i / 12) * Math.PI; return [Math.cos(a) * r, Math.sin(a) * r] as P2; }), ...Array.from({ length: 11 }, (_, i) => { const a = Math.PI / 2 - ((i + 1) / 12) * Math.PI; return [Math.cos(a) * r * k, Math.sin(a) * r] as P2; })], 40);

/** a tiny astronaut for scale (front, back, or with strap-on wings) */
const Astro: React.FC<{ at: P2; s?: number; back?: boolean; wings?: number; z?: number; t: number }> = ({ at, s = 1, back, wings, z = 0.3, t }) => (
  <group position={[at[0], at[1], z]} scale={s}>
    {wings !== undefined && [-1, 1].map((sd) => <group key={sd} scale={[sd, 1, 1]} rotation={[0, 0, 0.5 * wings]}><Flat g={blob([[0.1, 0.25], [1.3, 0.75], [1.5, 0.35], [0.9, -0.05], [0.1, -0.1]], 16)} c="#c8cdf0" z={-0.01} /><Flat g={ribbon([[0.15, 0.2], [1.3, 0.6]], () => 0.035)} c="#7a88d6" z={-0.009} /></group>)}
    <Flat g={rrect(-0.3, -0.45, 0.3, 0.2, 0.12)} c="#9aa0b8" z={-0.002} p={[back ? 0 : 0.1, 0]} />
    <Flat g={rrect(-0.22, -0.5, 0.22, 0.15, 0.1)} c="#ffffff" />
    {[-0.12, 0.12].map((x, i) => <Flat key={i} g={rrect(x - 0.09, -0.82, x + 0.09, -0.45, 0.05)} c="#c8cdf0" />)}
    {[-1, 1].map((sd) => <Flat key={sd} g={rrect(-0.07, -0.3, 0.07, 0.1, 0.05)} c="#c8cdf0" p={[sd * 0.29, -0.05]} />)}
    <Disc at={[0, 0.42]} r={0.3} c="#ffffff" z={0.001} seg={20} />
    {back ? <Flat g={rrect(-0.2, -0.35, 0.2, 0.12, 0.06)} c="#9aa0b8" z={0.002} /> : <><Flat g={rrect(-0.2, 0.3, 0.2, 0.55, 0.11)} c="#1c2a6e" z={0.002} /><Disc at={[-0.09, 0.47]} r={0.045} c="#bfe6ff" z={0.003} seg={8} /></>}
    {!back && <Disc at={[0.12, -0.1]} r={0.045} c={Math.sin(t * 9) > 0 ? "#ff3a2a" : "#8a1414"} z={0.003} seg={8} />}
  </group>
);

// ================= the menu: 4 worlds =================
const PL: P2[] = [[-1.25, 1.45], [1.25, 1.45], [-1.25, -1.1], [1.25, -1.1]], PR = 0.9;
const PCOL = ["#c85a10", "#ffbf6a", "#ff8a1f", "#c8cdf0"];
const cursorAt = (t: number) => { const end = t >= END, base = end ? END : 0, k = Math.min(5, Math.max(0, Math.floor((t - base) / BEAT))); return { i: (k + (end ? 2 : 3)) % 4, age: t - base - k * BEAT }; };
const Planet: React.FC<{ i: number; t: number }> = ({ i, t }) => {
  const sh = useMemo(() => crescent(PR, 0.45), []);
  return (
    <group rotation={[0, 0, 0.12 * Math.sin(2 * LW * t + i)]}>
      {i === 2 && <Disc at={[0, 0]} r={PR + 0.1} c="#c85a10" z={-0.01} seg={48} />}
      <Disc at={[0, 0]} r={PR} c={PCOL[i]} seg={48} />
      {i === 0 && <>
        <Flat g={blob([[-0.5, 0.15], [-0.1, 0.4], [0.35, 0.2], [0.1, -0.15], [-0.35, -0.2]], 16)} c="#8a1414" z={0.001} />
        <Flat g={blob([[0.1, -0.4], [0.5, -0.3], [0.4, -0.6], [0.05, -0.65]], 12)} c="#8a1414" z={0.001} />
        <Flat g={blob([[-0.35, 0.82], [0, 0.72], [0.35, 0.82], [0, 0.9]], 10)} c="#ffffff" z={0.002} />
      </>}
      {i === 1 && [[-0.4, 0.45, 0.3], [0.1, 0.05, -0.2], [-0.2, -0.4, 0.25]].map(([y0, y1, bend], j) => <Flat key={j} g={ribbon(curve([[-0.75, y0 as number], [0, (y1 as number) + (bend as number)], [0.75, (y0 as number) + 0.1]], 16), () => 0.09)} c={j % 2 ? "#ff8a1f" : "#fff08a"} z={0.001} />)}
      {i === 2 && <Flat g={ribbon(curve([[-0.8, 0.1], [0, -0.05], [0.8, 0.12]], 12), () => 0.12)} c="#ffbf6a" z={0.001} />}
      {i === 3 && [[[-0.7, 0.3], [0, 0.1], [0.7, 0.4]], [[-0.5, -0.5], [0.1, -0.1], [0.3, 0.6]], [[-0.2, 0.7], [0.2, 0.0], [0.6, -0.5]]].map((p, j) => <Flat key={j} g={ribbon(curve(p as P2[], 14), () => 0.03)} c={j % 2 ? "#7a4a6a" : "#8a1414"} z={0.001} />)}
      <Flat g={sh} c="#05060f" z={0.003} o={0.35} />
      <Disc at={[-0.35, 0.4]} r={0.13} c="#ffffff" z={0.004} o={0.5} seg={12} />
    </group>
  );
};
const Menu: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const cur = cursorAt(t), k = beatK(t);
  return (
    <group>
      <Stars t={t} />
      {[5.4, 4.2].map((r, i) => <Disc key={`h${i}`} at={[0, 0.2]} r={r * (1 + 0.02 * k)} c={["#121a4a", "#1c2a6e"][i]} z={-10 + i * 0.1} seg={56} />)}
      {PL.map((p, i) => { const sel = cur.i === i, pop = sel ? 1 + 0.14 * Math.exp(-cur.age / 0.12) : 1; return (
        <group key={`pl${i}`} position={[p[0], p[1] + 0.05 * Math.sin(3 * LW * t + i * 1.6), 0]} scale={pop}>
          <Glow map={map} at={[0, 0, -0.5]} size={sel ? 3.6 : 2.6} color={PCOL[i]} opacity={sel ? 0.75 : 0.3} />
          <Planet i={i} t={t} />
          {sel && <mesh position={[0, 0, 0.1]}><ringGeometry args={[PR + 0.16, PR + 0.24, 48]} /><meshBasicMaterial color="#ffffff" /></mesh>}
        </group>); })}
    </group>
  );
};

// ================= 01 MARS: a blue sunset =================
const Mars: React.FC<{ u: number; t: number; map: THREE.Texture }> = ({ u, t, map }) => (
  <group>
    {sky("#4a2a5a")}{sky("#7a4a6a", -9, 1.2, -18.9)}
    <Stars t={t} z={-18.8} />
    {[[2.3, "#2b3f99"], [1.5, "#4a9aff"], [0.85, "#bfe6ff"]].map(([r, c], i) => <Disc key={i} at={[-0.9, -0.55]} r={(r as number) * (1 + 0.02 * Math.sin(t * 2))} c={c as string} z={-18 + i * 0.01} seg={48} />)}
    <Disc at={[-0.9, -0.55]} r={0.3} c="#ffffff" z={-17.9} seg={24} />
    <Glow map={map} at={[-0.9, -0.55, -17]} size={4} color="#4a9aff" opacity={0.6} />
    <Flat g={ground([[-6, -0.9], [-3.4, -0.5], [-2.2, -0.75], [-0.6, -0.95], [1.2, -0.4], [2.2, -0.35], [3.2, -0.8], [6, -0.6]])} c="#8a1414" z={-10} />
    <Flat g={ground([[-6, -1.5], [-2.5, -1.2], [-0.5, -1.55], [1.5, -1.25], [3.5, -1.6], [6, -1.3]])} c="#c85a10" z={-6} />
    {/* dust devil far away */}
    <Flat g={ribbon(curve([[2.3 + 0.1 * Math.sin(t * 3), -1.3], [2.15 + 0.12 * Math.sin(t * 3 + 1), -0.7], [2.4 + 0.15 * Math.sin(t * 3 + 2), -0.1], [2.2, 0.4]], 16), (q) => 0.05 + 0.12 * q)} c="#ffbf6a" z={-5.5} o={0.45} />
    {/* habitat dome */}
    <group position={[1.35 - u * 0.03, -1.55, -4]}>
      <Disc at={[0, 0]} r={0.75} c="#c8cdf0" seg={32} /><Flat g={crescent(0.75, 0.5)} c="#7a88d6" z={0.001} />
      <Flat g={rrect(-0.25, 0.0, 0.1, 0.3, 0.08)} c="#ffd23f" z={0.002} /><Glow map={map} at={[-0.08, 0.15, 0.1]} size={1.1} color="#ffd23f" opacity={0.6} />
      <Flat g={rrect(0.45, 0.5, 0.49, 1.25, 0)} c="#9aa0b8" /><Disc at={[0.47, 1.28]} r={0.06} c={Math.sin(t * 5) > 0.3 ? "#ff3a2a" : "#8a1414"} seg={8} />
    </group>
    <Flat g={ground([[-6, -2.3], [-3, -1.95], [-0.8, -2.25], [1.0, -2.05], [3.2, -2.5], [6, -2.2]])} c="#8a1414" z={-2} />
    <Astro at={[-0.75, -1.38]} s={0.62} back t={t} z={-1.5} />
    <Flat g={ground([[-6, -3.5], [-2.5, -3.1], [0.5, -3.6], [3, -3.2], [6, -3.6]])} c="#4a2a5a" z={-1} />
    {Array.from({ length: 16 }, (_, i) => { const x = ((rnd(i + 20) * 9 + u * (0.5 + rnd(i + 21))) % 9) - 4.5; return <Disc key={`du${i}`} at={[x, -2.6 + rnd(i + 22) * 3.2 + 0.1 * Math.sin(u * 2 + i)]} r={0.03 + 0.02 * (i % 3)} c="#ffbf6a" z={0} seg={6} o={0.7} />; })}
  </group>
);

// ================= 02 VENUS: a balloon city 55 km up =================
const cloudRow = (y: number, r: number, off: number) => Array.from({ length: 12 }, (_, i) => [-5.5 + i * 1.0 + off, y + 0.18 * Math.sin(i * 1.9)] as P2).map((p) => ({ p, r: r * (0.85 + 0.3 * Math.abs(Math.sin(p[0] * 2.3 + y))) }));
const Venus: React.FC<{ u: number; t: number; map: THREE.Texture }> = ({ u, t, map }) => {
  const bob = 0.08 * Math.sin(u * 1.3);
  return (
    <group>
      {sky("#ff8a1f")}{sky("#ffbf6a", -9, 2.2, -18.9)}{sky("#fff08a", -9, 0.2, -18.8)}
      <Disc at={[1.5, 3.2]} r={1.5} c="#fff3b0" z={-18.5} seg={40} /><Glow map={map} at={[1.5, 3.2, -18]} size={7} color="#fff08a" opacity={0.6} />
      {/* the upper acid deck and its rain that evaporates on the way down */}
      {cloudRow(4.6, 0.9, (u * 0.06) % 1).map((c, i) => <Disc key={`uc${i}`} at={c.p} r={c.r} c="#c85a10" z={-12} seg={20} />)}
      {Array.from({ length: 26 }, (_, i) => { const x = -3 + rnd(i + 40) * 6, q = (u * (0.35 + 0.2 * rnd(i + 41)) + rnd(i + 42)) % 1, y = 4.0 - q * 3.2; return <Flat key={`rn${i}`} g={rrect(-0.012, -0.16, 0.012, 0.16, 0)} c="#c8a010" p={[x, y]} z={-11} o={(1 - q) * 0.9} />; })}
      {/* cloud sea */}
      {cloudRow(-2.1, 0.75, -(u * 0.05) % 1).map((c, i) => <Disc key={`c1${i}`} at={c.p} r={c.r} c="#fff3b0" z={-8} seg={20} />)}
      <Flat g={rrect(-9, -9, 9, -2.2, 0)} c="#fff3b0" z={-8} />
      {[0, 1, 2].map((j) => GEIGER.length > 0 && Math.sin(u * 2.1 + j * 2.4) > 0.96 ? <Glow key={`lt${j}`} map={map} at={[-2 + j * 1.9, -2.9, -7.5]} size={2.2} color="#ffffff" opacity={0.9} /> : null)}
      {cloudRow(-2.9, 0.85, (u * 0.09) % 1).map((c, i) => <Disc key={`c2${i}`} at={c.p} r={c.r} c="#ffbf6a" z={-6} seg={20} />)}
      <Flat g={rrect(-9, -9, 9, -3.0, 0)} c="#ffbf6a" z={-6} />
      {/* the balloon habitat */}
      <group position={[0.15, 0.55 + bob, -4]}>
        {[-0.75, -0.25, 0.3, 0.8].map((x, i) => <Flat key={`cb${i}`} g={ribbon([[x * 1.2, 0.35], [x * 0.75 + 0.1, -1.05]], () => 0.018)} c="#5a607a" z={-0.01} />)}
        <Flat g={blob([[-1.35, 0.9], [-0.9, 1.6], [0, 1.85], [0.9, 1.6], [1.35, 0.9], [0.9, 0.3], [0, 0.1], [-0.9, 0.3]], 36)} c="#6ee6cf" />
        {[-0.6, 0, 0.6].map((x, i) => <Flat key={`st${i}`} g={ribbon(curve([[x * 0.9, 1.8 - 0.25 * Math.abs(x)], [x * 1.3, 0.95], [x * 0.9, 0.18 + 0.2 * Math.abs(x)]], 14), () => 0.035)} c="#1fb5a8" z={0.001} />)}
        <Flat g={blob([[-1.0, 1.15], [-0.7, 1.55], [-0.35, 1.68], [-0.7, 1.25]], 12)} c="#ffffff" z={0.002} o={0.7} />
        <Flat g={rrect(-0.6, -1.5, 0.95, -1.02, 0.14)} c="#c8cdf0" /><Flat g={rrect(-0.6, -1.5, 0.95, -1.36, 0.06)} c="#7a88d6" z={0.001} />
        {[-0.1, 0.3, 0.7].map((x, i) => <Flat key={`wd${i}`} g={rrect(x - 0.1, -1.3, x + 0.1, -1.12, 0.03)} c="#ffd23f" z={0.002} />)}
        <Flat g={rrect(-1.25, -1.5, -0.6, -1.44, 0)} c="#9aa0b8" /><Flat g={rrect(-1.25, -1.44, -1.21, -1.12, 0)} c="#9aa0b8" /><Flat g={rrect(-1.25, -1.16, -0.6, -1.12, 0)} c="#9aa0b8" />
        <Astro at={[-0.95, -0.98]} s={0.5} t={t} z={0.05} />
      </group>
      {cloudRow(-3.8, 1.0, -(u * 0.14) % 1).map((c, i) => <Disc key={`c3${i}`} at={c.p} r={c.r} c="#ff8a1f" z={-2} seg={20} />)}
      <Flat g={rrect(-9, -9, 9, -4.0, 0)} c="#ff8a1f" z={-2} />
    </group>
  );
};

// ================= 03 TITAN: slow methane rain over a lake =================
const DROPG = blob([[0, 0.2], [0.1, -0.02], [0, -0.14], [-0.1, -0.02]], 12);
const Titan: React.FC<{ u: number; t: number; map: THREE.Texture }> = ({ u, t, map }) => {
  const fx = -1.4 + u * 0.3, fy = 0.9 + 0.25 * Math.sin(u * 1.6), flap = Math.sin(u * 6);
  return (
    <group>
      {sky("#4a2a5a")}{sky("#c85a10", -9, 2.6, -18.9)}{sky("#ff8a1f", -9, 0.4, -18.8)}
      <Disc at={[1.6, 2.3]} r={0.35} c="#ffbf6a" z={-18.5} seg={20} /><Glow map={map} at={[1.6, 2.3, -18]} size={3.5} color="#ffbf6a" opacity={0.5} />
      <Flat g={ground([[-6, -0.6], [-3.2, -0.2], [-1.8, -0.55], [0, -0.75], [1.6, -0.3], [3, -0.6], [6, -0.3]])} c="#7a4a6a" z={-12} />
      <Flat g={ground([[-6, -1.15], [-2.4, -0.95], [0.4, -1.2], [2.6, -0.95], [6, -1.15]])} c="#4a2a5a" z={-10} />
      {/* the methane lake */}
      <Flat g={rrect(-9, -9, 9, -1.3, 0)} c="#1c2a6e" z={-9} />
      {Array.from({ length: 9 }, (_, i) => <Flat key={`lk${i}`} g={rrect(-0.6, -0.02, 0.6, 0.02, 0.02)} c={i % 2 ? "#2b3f99" : "#7a4a6a"} p={[-3 + ((i * 1.37 + u * 0.08) % 6), -1.55 - i * 0.3]} z={-8.9} o={0.8} />)}
      {/* slow rain: each big drop that lands is a note */}
      {Array.from({ length: 14 }, (_, i) => { const q = (u * 0.11 + rnd(i + 60)) % 1; return <Flat key={`dr${i}`} g={DROPG} c="#ffbf6a" p={[-2.8 + rnd(i + 61) * 5.6, 3.6 - q * 5.2]} z={-5 - (i % 3)} o={0.75} />; })}
      {DROPS.map((d, i) => { const a = t - d, x = [-1.6, 0.9, -0.3, 1.8, -2.1][i], y = -2.0 - (i % 2) * 0.5; return (
        <React.Fragment key={`bd${i}`}>
          {a < 0 && a > -2.2 && <Flat g={DROPG} c="#fff08a" p={[x, y - a * 1.5]} z={-4} />}
          {a >= 0 && a < 1.6 && [0, 0.35].map((dl) => a > dl ? <mesh key={dl} position={[x, y, -4]} scale={[0.25 + (a - dl) * 0.9, 0.08 + (a - dl) * 0.28, 1]}><ringGeometry args={[0.86, 1, 28]} /><meshBasicMaterial color="#bfe6ff" transparent opacity={Math.max(0, 1 - (a - dl) / 1.2)} /></mesh> : null)}
          {a >= 0 && a < 0.3 && <Glow map={map} at={[x, y, -3.9]} size={1.0} color="#fff08a" opacity={1 - a / 0.3} />}
        </React.Fragment>); })}
      {/* you, flying with strap-on wings */}
      <group rotation={[0, 0, -0.12]}><Astro at={[fx, fy]} s={0.6} wings={flap} t={t} z={-3} /></group>
      {/* shore */}
      <Flat g={ground([[-6, -3.0], [-3.2, -2.75], [-1.6, -3.3], [-0.2, -3.9], [0.8, -4.6], [1.0, -9]])} c="#4a2a5a" z={-2} />
      {[[-2.6, -2.75, 0.22], [-1.9, -2.95, 0.15], [-3.1, -3.2, 0.3], [-1.1, -3.5, 0.18]].map(([x, y, r], i) => <Disc key={`pb${i}`} at={[x, y]} r={r} c={i % 2 ? "#7a4a6a" : "#5a607a"} z={-1.9} seg={14} />)}
    </group>
  );
};

// ================= 04 EUROPA: Jupiter, radiation, an ocean under the ice =================
const JR = 2.7, JC: P2 = [0.9, 2.5];
const jband = (h: number, th: number) => { const w = Math.sqrt(Math.max(0.01, JR * JR - h * h)) - 0.04; return rrect(-w, h - th, w, h + th, th); };
const Europa: React.FC<{ u: number; t: number; map: THREE.Texture }> = ({ u, t, map }) => (
  <group>
    {sky("#05060f")}
    <Stars t={t} z={-18.9} />
    <group position={[JC[0], JC[1], -15]} rotation={[0, 0, -0.18]}>
      <Disc at={[0, 0]} r={JR} c="#ffbf6a" seg={72} />
      {[[1.9, 0.22, "#c85a10"], [1.2, 0.16, "#fff3b0"], [0.55, 0.3, "#c85a10"], [-0.2, 0.14, "#fff3b0"], [-0.75, 0.26, "#7a4a6a"], [-1.5, 0.2, "#c85a10"], [-2.1, 0.14, "#fff3b0"]].map(([h, th, c], i) => <Flat key={`jb${i}`} g={jband(h as number, th as number)} c={c as string} z={0.001} p={[0.05 * Math.sin(u * 0.4 + i), 0]} />)}
      <Flat g={blob([[-1.2, -0.62], [-0.85, -0.42], [-0.5, -0.62], [-0.85, -0.85]], 16)} c="#ff3a2a" z={0.002} />
      <Flat g={crescent(JR, 0.5)} c="#05060f" z={0.003} o={0.4} />
    </group>
    <Glow map={map} at={[JC[0], JC[1], -14]} size={9} color="#ffbf6a" opacity={0.25} />
    {/* ice plain */}
    <Flat g={ground([[-6, -1.0], [-3, -0.8], [-1.2, -1.05], [0.6, -0.85], [2.4, -1.1], [6, -0.9]])} c="#7a88d6" z={-10} />
    <Flat g={ground([[-6, -1.45], [-2.8, -1.3], [-0.6, -1.5], [1.6, -1.3], [3.5, -1.5], [6, -1.35]])} c="#bfe6ff" z={-8} />
    {[[[-3, -1.5], [-1.4, -1.9], [0.2, -1.7], [2.9, -2.2]], [[-2.6, -2.3], [-0.8, -2.0], [0.9, -2.45], [3, -2.1]], [[-0.4, -1.45], [0.2, -2.0], [-0.3, -2.6]]].map((p, i) => <Flat key={`ck${i}`} g={ribbon(curve(p as P2[], 24), () => 0.035)} c={i % 2 ? "#7a4a6a" : "#8a1414"} z={-7.9} />)}
    {[[-2.3, -1.3, 0.5], [2.2, -1.3, 0.65], [1.5, -1.35, 0.35]].map(([x, y, h], i) => <Flat key={`sp${i}`} g={blob([[x - 0.16, y], [x, y + h], [x + 0.16, y]], 3)} c="#ffffff" z={-7.8} />)}
    <Astro at={[-0.95, -0.93]} s={0.55} t={t} z={-7} />
    {/* radiation: every Geiger click is a streak near you */}
    {GEIGER.map((g, i) => { const a = t - g; if (a < 0 || a > 0.22) return null; const x = -0.95 + (rnd(i + 80) - 0.5) * 4.4, y = -0.4 + (rnd(i + 81) - 0.3) * 3.2; return (
      <React.Fragment key={`gg${i}`}><Flat g={ribbon([[x - 0.25, y + 0.35], [x + 0.25, y - 0.35]], () => 0.025)} c={i % 3 ? "#ff4f8b" : "#ffffff"} z={-6} o={1 - a / 0.22} /><Glow map={map} at={[x, y, -5.9]} size={0.7} color="#ff4f8b" opacity={0.8 * (1 - a / 0.22)} /></React.Fragment>); })}
    {/* cut-away: ice shell, then the hidden ocean */}
    <Flat g={rrect(-9, -9, 9, -2.9, 0)} c="#7a88d6" z={-5} />
    <Flat g={ground([[-6, -4.3], [-3, -4.0], [-1, -4.5], [1, -4.1], [3, -4.6], [6, -4.2]])} c="#1f4abf" z={-4.9} />
    <Flat g={rrect(-9, -9, 9, -5.4, 0)} c="#1c2a6e" z={-4.8} />
    <Glow map={map} at={[0.3, -6.2, -4.5]} size={6} color="#1fb5a8" opacity={0.5 + 0.15 * Math.sin(u * 2)} />
    {Array.from({ length: 16 }, (_, i) => { const q = (u * (0.1 + 0.08 * rnd(i + 90)) + rnd(i + 91)) % 1; return <Disc key={`bb${i}`} at={[-2.8 + rnd(i + 92) * 5.6, -8 + q * 3.6]} r={0.04 + 0.03 * (i % 3)} c="#6ee6cf" z={-4.4} seg={8} o={0.8 * (1 - q)} />; })}
  </group>
);

// ================= camera, overlays =================
const HOME = { p: [0, 0.2, 29] as V3, l: [0, 0.2, 0] as V3 };
const mix3 = (a: V3, c: V3, k: number): V3 => [lerp(a[0], c[0], k), lerp(a[1], c[1], k), lerp(a[2], c[2], k)];
const WCAM: [V3, V3][] = [[[0.3, -0.5, 27], [-0.25, -0.8, 21]], [[-0.2, 0.0, 28], [0.15, 0.3, 22]], [[0.3, -0.4, 28], [-0.1, 0.0, 23]], [[0, 0.5, 28], [0, 0.2, 25]]];
const camFor = (t: number): { p: V3; l: V3 } => {
  const w = world(t);
  if (w < 0) { if (t < W[0] && t > W[0] - 0.7) { const k = ease((t - W[0] + 0.7) / 0.7), p = mix3(HOME.p, [PL[0][0], PL[0][1], 3], k * k); return { p, l: [p[0], p[1], 0] }; } return HOME; }
  const u = (t - W[w]) / (3 * BAR);
  let p = mix3(WCAM[w][0], WCAM[w][1], ease(u));
  if (w === 3 && u > 0.6) p = mix3(p, [0, -3.6, 23], ease((u - 0.6) / 0.25));                // Europa: tilt down to the ocean
  return { p, l: [p[0], p[1], 0] };
};
const DIVES = [...W, END], DCOL = ["#c85a10", "#ffbf6a", "#ff8a1f", "#c8cdf0", BG];
const diveAt = (t: number) => Math.max(...DIVES.map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => DCOL[DIVES.reduce((best, x, i) => (Math.abs(t - x) < Math.abs(t - DIVES[best]) ? i : best), 0)];
const NAMES = ["MARS", "VENUS (55 KM UP)", "TITAN", "EUROPA"];
const STATS: [string, string, string][] = [["-63°C", "0.38 G", "0.006 BAR"], ["+27°C", "0.90 G", "0.5 BAR"], ["-179°C", "0.14 G", "1.45 BAR"], ["-160°C", "0.13 G", "NONE"]];
const WBORDER = ["#ff8a1f", "#fff08a", "#ffbf6a", "#bfe6ff"];
const LINES: string[][] = [
  ["THE SUNSETS HERE\nARE BLUE.", "THE AIR IS LESS THAN\n1% OF EARTH'S.", "IT LAST RAINED\n3 BILLION YEARS AGO."],
  ["55 KM ABOVE A 465°C\nHELL, IT IS 27°C.", "NO PRESSURE SUIT.\nJUST AN AIR MASK.", "THE ACID RAIN\nNEVER LANDS."],
  ["IT RAINS HERE.\nIN SLOW MOTION.", "IT ISN'T WATER.\nIT'S METHANE, AT -179°C.", "STRAP ON WINGS\nAND YOU CAN FLY."],
  ["JUPITER NEVER\nLEAVES THE SKY.", "ITS RADIATION\nKILLS IN A DAY.", "UNDER THE ICE: TWICE\nEARTH'S OCEANS."],
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
const TOPZ: [number, number] = [540, 330];
const HOOK = [[{ t: "CHOOSE A WORLD" }], [{ t: "TO SURVIVE ON", c: "#ffd23f" }], [{ t: "FOR 1 YEAR 🪐" }]];
const LABELS: LabelDef[] = [
  { from: 0, to: W[0] - 0.4, anchor: [0, 0, 0], screen: TOPZ, border: "#ffd23f", lines: HOOK, hold: true },
  { from: END + 0.2, to: D + 0.01, anchor: [0, 0, 0], screen: TOPZ, border: "#ffd23f", lines: HOOK, hold: true },
];
const Overlays: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => {
  const w = world(t), menu = w < 0 && !(t < W[0] && t > W[0] - 0.4) && !(t >= END && t < END + 0.2);
  const ci = w >= 0 ? CAPS[w].filter((c) => t >= c).length - 1 : -1;
  const line = ci >= 0 && t < CAPS[w][ci] + BAR - 0.15 ? LINES[w][ci] : null;
  const shown = line ? line.slice(0, Math.ceil(clamp01((t - CAPS[w][ci]) / 0.75) * line.length)) : "";
  const hin = w >= 0 ? backOut((t - W[w] - 0.15) / 0.3) : 0;
  return (
    <>
      {menu && PL.map((p, i) => { const [x, y] = project([p[0], p[1] - PR - 0.32, 0], cam, FOV), sel = cursorAt(t).i === i; return <div key={i} style={{ ...px, position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", fontSize: sel ? 44 : 34, color: sel ? "#ffd23f" : "#c8cdf0", textShadow: "5px 5px 0 #05060f" }}>0{i + 1}</div>; })}
      {menu && <div style={{ position: "absolute", left: 540, top: 1540, transform: "translate(-50%, -50%)", width: 940, background: "rgba(9,13,43,0.95)", border: "8px solid #ffffff", boxShadow: "8px 8px 0 #05060f", padding: "24px 20px 18px", textAlign: "center" }}>
        <div style={{ ...px, fontSize: 30, marginBottom: 14 }}>COMMENT YOUR WORLD 👇</div>
        <div style={{ ...px, fontSize: 44, color: "#ffd23f", letterSpacing: 6 }}>01  02  03  04</div>
      </div>}
      {w >= 0 && <>
        <div style={{ ...px, position: "absolute", left: 60, top: 150, fontSize: 40, transform: `scale(${hin})`, transformOrigin: "0 50%", background: "rgba(9,13,43,0.92)", border: `8px solid ${WBORDER[w]}`, boxShadow: "8px 8px 0 #05060f", padding: "18px 20px 10px" }}><span style={{ color: WBORDER[w] }}>0{w + 1}</span> {NAMES[w]}</div>
        {line && <div style={{ ...px, position: "absolute", left: 540, top: 420, transform: "translate(-50%, -50%)", width: 940, fontSize: 36, lineHeight: 1.7, textAlign: "center", whiteSpace: "pre-line", background: "rgba(9,13,43,0.88)", border: `6px solid ${WBORDER[w]}`, boxShadow: "8px 8px 0 #05060f", padding: "26px 16px 14px" }}>{shown}<span style={{ opacity: Math.sin(t * 14) > 0 ? 1 : 0 }}>_</span></div>}
        <div style={{ position: "absolute", left: 540, top: 1540, transform: `translate(-50%, -50%) scale(${hin})`, width: 960, background: "rgba(9,13,43,0.95)", border: `8px solid ${WBORDER[w]}`, boxShadow: "8px 8px 0 #05060f", padding: "18px 20px 14px", display: "flex", justifyContent: "space-between" }}>
          {["TEMP", "GRAVITY", "AIR"].map((n, i) => <div key={n} style={{ textAlign: "center", flex: 1 }}><div style={{ ...px, fontSize: 22, color: "#9aa0b8", marginBottom: 12 }}>{n}</div><div style={{ ...px, fontSize: 30, color: WBORDER[w] }}>{STATS[w][i]}</div></div>)}
        </div>
      </>}
    </>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const WorldsVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const w = world(t), cam = camFor(t), u = w >= 0 ? t - W[w] : 0;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/22-worlds/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={WORLDS_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {w < 0 ? <Menu t={t} map={glow} /> : w === 0 ? <Mars u={u} t={t} map={glow} /> : w === 1 ? <Venus u={u} t={t} map={glow} /> : w === 2 ? <Titan u={u} t={t} map={glow} /> : <Europa u={u} t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ffd23f" }}>@HOWTOWITHZAY</div>
      <Overlays t={t} cam={cam} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
void CURSOR;
