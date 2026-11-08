/**
 * Video 012 · Chameleon — Kurzgesagt-inspired remake in our pixel-art 3D (30 s, 144 BPM "funk 150", seamless loop).
 * Flat vivid colours, deep indigo night jungle with layered silhouettes, glows and rim light, no black outlines.
 * The inside explains step by step (with part tags): white light = all colours (waves) → the gap between crystal rows
 * picks the colour that bounces back → small gap: blue, through the yellow pigment = green → excited: the cell
 * stretches, big gap = red. Every light wave is a note (blue high, red low). Timing from c30k.json (build_k.py).
 */
import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import HK from "./c30k.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { Chameleon, STATE, setTimeline, stateAt, useAssets, Toon, cyl, Timeline } from "./ChameleonVideo";

export const FPS = 60;
export const DURATION = Math.round(HK.duration * FPS);
type V3 = [number, number, number];
const D = HK.duration, BAR = HK.bar;
const b = (n: number) => n * BAR;
const TL: Timeline = { colors: HK.colors, tongue: HK.tongue, flyBack: HK.tongue + 1.0, lw: (2 * Math.PI) / D, beamN: 30, dur: D };
const LW = (2 * Math.PI) / D;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;

export const K_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99",
  "#0f6e6a", "#1fb5a8", "#6ee6cf",
  "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a",
  "#1f8a4a", "#3fcf6a", "#9bf08a",
  "#c8a010", "#ffd23f", "#fff08a",
  "#c85a10", "#ff8a1f", "#ffbf6a",
  "#8a1414", "#ff3a2a", "#ff8a7a",
  "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
];
const BG = "#090d2b";

// ===================== the night jungle (flat layered silhouettes) =====================
const FAR = Array.from({ length: 12 }, (_, i) => ({ x: -33 + i * 6 + rnd(i + 1) * 3, y: 2 + rnd(i + 2) * 5, s: 3 + rnd(i + 3) * 2.5 }));
const MID = Array.from({ length: 14 }, (_, i) => ({ x: -26 + i * 4 + rnd(i + 11) * 2, y: -1 + rnd(i + 12) * 9, s: 1.8 + rnd(i + 13) * 1.6, r: rnd(i + 14) * 3 }));
const NEAR = Array.from({ length: 16 }, (_, i) => ({ p: [(rnd(i + 21) - 0.5) * 24, (rnd(i + 22) - 0.35) * 16, -2 - rnd(i + 23) * 5] as V3, s: 1.5 + rnd(i + 24) * 1.8, r: rnd(i + 25) * Math.PI, c: i % 3 === 0 ? "#1fb5a8" : "#0f6e6a" }));
const KJungle: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => (
  <group>
    {/* sky glow + moon */}
    <Glow map={map} at={[0, 6, -40]} size={60} color="#2b3f99" opacity={0.35} />
    <Glow map={map} at={[7, 9, -34]} size={18} color="#fff3b0" opacity={0.3} />
    <mesh position={[7, 9, -35]}><circleGeometry args={[2.2, 32]} /><meshBasicMaterial color="#fff3b0" /></mesh>
    {/* far + mid silhouettes */}
    {FAR.map((f, i) => <mesh key={`f${i}`} position={[f.x, f.y, -28]} scale={[f.s, f.s * 2.6, 1]}><sphereGeometry args={[1, 14, 10]} /><meshBasicMaterial color="#121a4a" /></mesh>)}
    {MID.map((m, i) => <mesh key={`m${i}`} position={[m.x, m.y, -15]} rotation={[0, 0, m.r]} scale={[m.s * 1.6, m.s * 0.7, 0.3]}><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#1c2a6e" /></mesh>)}
    {/* the branch (same place as the chameleon's grip) */}
    {cyl([-16, -0.25, 0], [18, -0.7, 0], 0.55, "#4a2a5a")}
    {cyl([7, -0.55, 0], [10.5, 1.4, -0.6], 0.25, "#4a2a5a")}
    {/* near leaves with rim light, vines, flowers */}
    {NEAR.map((l, i) => <mesh key={`n${i}`} position={l.p} rotation={[0.3, 0.2, l.r + 0.08 * Math.sin(2 * LW * t + i)]} scale={[l.s, l.s * 0.4, 0.12]}><sphereGeometry args={[1, 10, 6]} /><Toon c={l.c} /></mesh>)}
    {Array.from({ length: 6 }, (_, i) => cyl([-10 + i * 4, 14, -4 - i * 0.5], [-9.6 + i * 4 + 0.4 * Math.sin(2 * LW * t + i), 1.5 + rnd(i + 40) * 3, -4 - i * 0.5], 0.08, "#1fb5a8"))}
    {[[-2.4, -3.6, 1.6], [4.8, -2.6, 1.8], [-6, -1.6, 0.6]].map(([x, y, z], i) => (
      <group key={`fl${i}`} position={[x, y, z]}>
        {Array.from({ length: 5 }, (_, k) => <mesh key={k} rotation={[0, 0, (k / 5) * Math.PI * 2 + 0.1 * Math.sin(2 * LW * t)]} position={[0.32 * Math.cos((k / 5) * Math.PI * 2), 0.32 * Math.sin((k / 5) * Math.PI * 2), 0]} scale={[0.42, 0.2, 0.1]}><sphereGeometry args={[1, 8, 6]} /><Toon c="#ff4f8b" e={0.3} /></mesh>)}
        <mesh><sphereGeometry args={[0.16, 8, 6]} /><Toon c="#fff08a" e={0.4} /></mesh>
      </group>
    ))}
    {/* fireflies */}
    {Array.from({ length: 22 }, (_, i) => <Glow key={`ff${i}`} map={map} at={[(rnd(i + 60) - 0.5) * 22 + 0.7 * Math.sin(3 * LW * t + i), (rnd(i + 61) - 0.3) * 12 + 0.5 * Math.cos(2 * LW * t + i), -1 + (rnd(i + 62) - 0.5) * 6]} size={0.35} color="#fff08a" opacity={0.5 + 0.5 * Math.max(0, Math.sin(5 * LW * t + i * 1.7))} />)}
  </group>
);

// ===================== inside the skin, explained =====================
const SURF_Y = 4.4, PIG_Y = 3.5, ROW0 = 2.2, NROWS = 5;
const WCOL = ["#4a9aff", "#3fcf6a", "#ffd23f", "#ff3a2a"];       // blue, green, yellow, red
const WLEN = [0.5, 0.62, 0.75, 0.95];                              // short wave → long wave
const REFL_IDX = [0, 1, 2, 3];                                      // skin state G/Y/O/R reflects blue/green/yellow/red
const DIR = new THREE.Vector2(0.62, -1).normalize();
const E: [number, number] = [-0.9, SURF_Y], H: [number, number] = [-0.9 + (SURF_Y - ROW0) * 0.62, ROW0], X: [number, number] = [H[0] + (SURF_Y - ROW0) * 0.62, SURF_Y];
const S0: [number, number] = [E[0] - DIR.x * 4.5, E[1] - DIR.y * 4.5], O: [number, number] = [X[0] + DIR.x * 4.5, X[1] - DIR.y * 4.5];
const T0: [number, number] = [H[0] + DIR.x * 5, H[1] + DIR.y * 5];
/** a travelling sine wave of glowing dots from a to c */
const Wave: React.FC<{ a: [number, number]; c: [number, number]; lam: number; color: string; t: number; map: THREE.Texture; z?: number; off?: number; fade?: boolean; amp?: number; dim?: boolean; big?: boolean }> = ({ a, c, lam, color, t, map, z = 1.2, off = 0, fade = false, amp = 0.2, dim = false, big = false }) => {
  const dx = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const n = Math.floor(len / 0.085);
  return <>{Array.from({ length: n }, (_, i) => {
    const s = (i / n) * len, w = amp * Math.sin(2 * Math.PI * (s / lam - t * 1.6)) + off;
    return <Glow key={i} map={map} at={[a[0] + ux * s + px * w, a[1] + uy * s + py * w, z]} size={dim ? 0.16 : big ? 0.36 : 0.26} color={color} opacity={(fade ? Math.max(0, 1 - i / n) : 0.95) * (dim ? 0.35 : 1)} />;
  })}</>;
};
const KSkin: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const { s: cur, prev, at } = stateAt(t);
  const k = ease((t - at) / 0.15), sp = lerp(STATE[prev].s, STATE[cur].s, k);
  const gap = 0.5 + 0.45 * sp;
  const ri = REFL_IDX[cur], st = STATE[cur];
  const step = t < b(5) ? 1 : t < b(7) ? 2 : 3;
  const noteAge = Math.min(9, ...HK.waves.filter(([wt]) => t >= wt).map(([wt]) => t - wt));
  const lastNote = HK.waves.filter(([wt]) => t >= wt).slice(-1)[0];
  const rows = Array.from({ length: NROWS }, (_, r) => ROW0 - r * gap);
  return (
    <group>
      {/* depth: soft glows behind, floating particles */}
      <Glow map={map} at={[0, 2.5, -4]} size={16} color="#1c2a6e" opacity={0.5} />
      <Glow map={map} at={[0, ROW0 - 2 * gap, -2]} size={6} color={WCOL[ri]} opacity={0.12} />
      {Array.from({ length: 24 }, (_, i) => <Glow key={`p${i}`} map={map} at={[(rnd(i + 300) - 0.5) * 12 + 0.3 * Math.sin(2 * LW * t + i), (rnd(i + 310) - 0.5) * 9 + 2 + 0.3 * Math.cos(3 * LW * t + i), -0.5]} size={0.12} color="#6ee6cf" opacity={0.5} />)}
      {/* skin surface (shows the colour we see) */}
      <mesh position={[0, SURF_Y + 0.2, 0]}><boxGeometry args={[18, 0.4, 3]} /><Toon c={st.mid} e={0.35} /></mesh>
      {Array.from({ length: 18 }, (_, i) => <mesh key={`sc${i}`} position={[-8.5 + i, SURF_Y + 0.42, 0.6]} scale={[0.5, 0.2, 0.5]}><sphereGeometry args={[1, 10, 6]} /><Toon c={st.light} e={0.2} /></mesh>)}
      {/* yellow pigment cells */}
      {Array.from({ length: 10 }, (_, i) => (
        <group key={`y${i}`} position={[-6.75 + i * 1.5, PIG_Y + 0.05 * Math.sin(3 * LW * t + i), 0.3]}>
          <mesh scale={[0.66, 0.38, 0.4]}><sphereGeometry args={[1, 14, 10]} /><Toon c="#ffd23f" e={step === 3 ? 0.35 : 0.15} /></mesh>
          <mesh position={[0.15, 0.04, 0.3]}><sphereGeometry args={[0.11, 8, 6]} /><Toon c="#c85a10" /></mesh>
        </group>
      ))}
      {/* crystal rows (guanine nanocrystals) */}
      {rows.map((y, r) => Array.from({ length: 21 }, (_, i) => {
        const x = -6 + i * 0.6, tw = Math.max(0, Math.sin((11 + ((i + r) % 7)) * LW * t + i * 2.1 + r)) ** 24;
        return (
          <group key={`c${r}-${i}`} position={[x, y, 0]}>
            <mesh rotation={[Math.PI / 2 + 0.2, 0.25 * Math.sin(i * 1.3 + r), 0]}><cylinderGeometry args={[0.17, 0.17, 0.05, 6]} /><Toon c="#2b3f99" e={0.1} /></mesh>
            {tw > 0.05 && <Glow map={map} at={[0.06, 0.06, 0.15]} size={0.2 + 0.4 * tw} color="#ffffff" opacity={tw} />}
          </group>
        );
      }))}
      {/* melanophores at the bottom: they soak up the light that goes through */}
      {Array.from({ length: 6 }, (_, i) => <mesh key={`m${i}`} position={[-6.25 + i * 2.5, rows[NROWS - 1] - 0.9, 0.2]} scale={[0.85, 0.42, 0.35]}><sphereGeometry args={[1, 12, 8]} /><Toon c="#4a2a5a" /></mesh>)}
      {/* the gap gauge between the first two rows */}
      {step >= 2 && <>
        <mesh position={[1.95, rows[0], 0.6]}><boxGeometry args={[0.5, 0.06, 0.06]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <mesh position={[1.95, rows[1], 0.6]}><boxGeometry args={[0.5, 0.06, 0.06]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <mesh position={[1.95, (rows[0] + rows[1]) / 2, 0.6]}><boxGeometry args={[0.08, gap, 0.06]} /><meshBasicMaterial color={WCOL[ri]} /></mesh>
      </>}
      {/* light: white in → all colours inside → only the colour that fits the gap bounces back */}
      <Wave a={S0} c={E} lam={0.55} color="#ffffff" t={t} map={map} amp={0.16} />
      {WCOL.map((col, i) => (step === 1 || i !== ri) && <Wave key={`d${i}`} a={E} c={step === 1 ? T0 : H} lam={WLEN[i]} color={col} t={t} map={map} off={(i - 1.5) * 0.16} amp={0.12} fade={step === 1} dim={step >= 2} />)}
      {step >= 2 && WCOL.map((col, i) => i !== ri && <Wave key={`th${i}`} a={H} c={T0} lam={WLEN[i]} color={col} t={t} map={map} off={(i - 1.5) * 0.16} amp={0.12} fade dim />)}
      {step >= 2 && <Wave a={E} c={H} lam={WLEN[ri]} color={WCOL[ri]} t={t} map={map} amp={0.16} big />}
      {step >= 2 && <Wave a={H} c={[lerp(H[0], X[0], (PIG_Y - 0.4 - ROW0) / (SURF_Y - ROW0)), PIG_Y - 0.4]} lam={WLEN[ri]} color={WCOL[ri]} t={t} map={map} amp={0.2} big />}
      {step >= 2 && <Wave a={[lerp(H[0], X[0], (PIG_Y + 0.4 - ROW0) / (SURF_Y - ROW0)), PIG_Y + 0.4]} c={O} lam={0.62} color={step >= 3 ? st.mid : WCOL[ri]} t={t} map={map} amp={0.2} big />}
      {step >= 2 && <Glow map={map} at={[H[0], H[1], 1.3]} size={1.2 + 0.8 * Math.exp(-(t - at) / 0.2)} color={WCOL[ri]} opacity={0.8} />}
      {/* a pulse where the light enters, on every note */}
      {lastNote && noteAge < 0.3 && <Glow map={map} at={[E[0], E[1], 1.3]} size={0.6 + noteAge * 4} color={WCOL[lastNote[1]]} opacity={1 - noteAge / 0.3} />}
    </group>
  );
};
type Tag = { txt: string; at: (t: number) => V3; from: number; to: number; col: string };
const gapAt = (t: number) => { const { s: cur, prev, at } = stateAt(t); return 0.5 + 0.45 * lerp(STATE[prev].s, STATE[cur].s, ease((t - at) / 0.15)); };
const TAGS: Tag[] = [
  { txt: "WHITE LIGHT", at: () => [E[0] + 1.0, E[1] + 0.75, 1.2], from: b(3) + 0.6, to: b(5), col: "#ffffff" },
  { txt: "CRYSTALS", at: (t) => [1.35, ROW0 - 3 * gapAt(t) - 0.1, 0.5], from: b(5), to: b(11), col: "#bfe6ff" },
  { txt: "GAP", at: () => [1.95, ROW0 + 0.22, 0.6], from: b(5) + 0.3, to: b(11), col: "#ffffff" },
  { txt: "YELLOW PIGMENT", at: () => [-1.0, PIG_Y + 0.5, 0.5], from: b(7), to: b(9), col: "#ffd23f" },
];
const Tags: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g) => { const [x, y] = project(g.at(t), cam); return (
    <div key={g.txt} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -100%)", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);

// ===================== camera, labels =====================
const IN = b(3), OUT = b(11), FADE = 0.28;
const inSkin = (t: number) => t >= IN && t < OUT;
const HOME = { p: [8.5, 3.1, 12.5] as V3, l: [0.2, 2.0, 0] as V3 };
const FLANK = { p: [0.0, 1.8, 1.3] as V3, l: [-0.2, 1.75, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [6.5, 2.9, 12.0], l: [0.1, 1.6, 0] },
  { t: IN - 0.3, p: [1.6, 2.2, 5.6], l: [-0.1, 1.7, 0] },
  { t: IN, ...FLANK },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0, 4.9, 4.0], l: [0, 4.5, 0] },
  { t: IN + 1.0, p: [0.3, 4.2, 12.0], l: [0.3, 3.9, 0] },
  { t: b(5) + 0.4, p: [0.5, 3.9, 11.2], l: [0.5, 3.7, 0] },
  { t: b(7) + 0.4, p: [0.5, 4.1, 11.6], l: [0.5, 3.9, 0] },
  { t: b(9) + 0.2, p: [0.5, 3.9, 12.0], l: [0.5, 3.7, 0] },
  { t: OUT - 0.7, p: [0.4, 4.0, 11.8], l: [0.4, 3.8, 0] },
  { t: OUT, p: [0, 4.9, 4.0], l: [0, 4.5, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, ...FLANK },
  { t: OUT + 0.35, p: [1.6, 2.2, 5.6], l: [-0.1, 1.7, 0] },
  { t: OUT + 1.3, p: [7.0, 3.0, 12.5], l: [0.2, 1.6, 0] },
  { t: b(12.6), p: [4.4, 3, 15.5], l: [4.4, 2.5, 0] },
  { t: b(14.6), p: [4.4, 3, 15.0], l: [4.4, 2.5, 0] },
  { t: 28.4, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : inSkin(t) ? camAt(CAM_S, t) : camAt(CAM_B, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));

const S = STATE;
const TOPZ: [number, number] = [540, 420];
const L = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES A" }], [{ t: "CHAMELEON", c: S[0].mid }], [{ t: "CHANGE COLOR? 🤯" }]];
const RAINBOW = [{ t: "A", c: "#ff3a2a" }, { t: "L", c: "#ff8a1f" }, { t: "L", c: "#ffd23f" }, { t: " " }, { t: "C", c: "#3fcf6a" }, { t: "O", c: "#1fb5a8" }, { t: "L", c: "#4a9aff" }, { t: "O", c: "#7a4dff" }, { t: "R", c: "#ff4f8b" }, { t: "S", c: "#ff3a2a" }];
const LABELS: LabelDef[] = [
  L(0, b(2), S[0].mid, HOOK, true),
  L(b(2), b(3) + 0.3, S[0].mid, [[{ t: "THE SECRET IS" }], [{ t: "IN ITS SKIN 👀", c: S[0].mid }]]),
  L(b(3) + 0.3, b(5), "#ffffff", [[{ t: "LIGHT IS A MIX" }], [{ t: "OF " }, ...RAINBOW]]),
  L(b(5), b(7), "#bfe6ff", [[{ t: "THE GAP BETWEEN" }], [{ t: "CRYSTAL ROWS", c: "#bfe6ff" }], [{ t: "PICKS ONE COLOR" }]]),
  L(b(7), b(9), S[0].mid, [[{ t: "SMALL GAP → " }, { t: "BLUE", c: "#4a9aff" }], [{ t: "+ " }, { t: "YELLOW", c: "#ffd23f" }, { t: " PIGMENT" }], [{ t: "= " }, { t: "GREEN", c: S[0].mid }]]),
  L(b(9), b(11), S[3].mid, [[{ t: "EXCITED:" }], [{ t: "IT STRETCHES" }], [{ t: "BIG GAP → " }, { t: "RED", c: S[3].mid }]]),
  L(b(11), b(13), S[3].mid, [[{ t: "NOT TO HIDE..." }], [{ t: "IT'S TO TALK", c: S[3].mid }], [{ t: "TO RIVALS, MATES" }]]),
  L(b(13), b(15), "#ff8a7a", [[{ t: "BONUS: ITS TONGUE" }], [{ t: "UP TO 2X", c: "#ff8a7a" }], [{ t: "ITS BODY" }]]),
  L(b(15), D + 0.01, S[0].mid, HOOK, true),
];

const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const ChameleonK: React.FC = () => {
  setTimeline(TL);
  const t = useCurrentFrame() / FPS;
  const a = useAssets();
  const skin = inSkin(t);
  const cam = camFor(t);
  const st = STATE[stateAt(t).s];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/12-chameleon/c30k.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={K_PALETTE} outlineColor="#090d2b" dither={0.05}>
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={0.6} color="#9aa8ff" />
        <directionalLight position={[8, 10, 6]} intensity={1.7} color="#fff3b0" />
        <directionalLight position={[-8, 3, -8]} intensity={1.1} color="#ff4f8b" />
        <directionalLight position={[6, -4, -6]} intensity={0.7} color="#1fb5a8" />
        {skin ? <KSkin t={t} map={a.glow} /> : <><KJungle t={t} map={a.glow} /><Chameleon t={t} map={a.glow} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: st.mid, opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", left: 48, top: 60, color: st.mid }}>● {st.name}</div>
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#fff08a" }}>@HOWTOWITHZAY</div>
      {skin && <Tags t={t} cam={cam} />}
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};
