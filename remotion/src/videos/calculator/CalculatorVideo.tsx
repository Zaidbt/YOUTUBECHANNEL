/**
 * Video 023 · How does a calculator do maths when it only knows 0 and 1? — LSD-style explainer (flat Kurzgesagt drawing in
 * the pixel pipeline, one step at a time, slow enough to follow), with an infographic "lamp board" as the instrument.
 * Story: a finger types 2 + 3 = → dive into the chip → every number becomes lamps worth 4-2-1 (2 = 010, 3 = 011) → it
 * adds column by column like on paper → "1 + 1 = 10": write 0, carry the 1 → each adder is ~28 tiny switches
 * (transistors; the classic CMOS full adder) → 101 = 4 + 0 + 1 = 5 → the screen lights 5 of its 7 bars.
 * Facts: binary place values; full adder ≈ 28 transistors; a seven-segment "5" uses 5 segments; the first microprocessor
 * (Intel 4004, 1971, 2,300 transistors) was built for a calculator (Busicom 141-PF).
 * 40 s loop, 120 BPM robot electro-pop (calculator.json + music.wav from videos/23-calculator/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./calculator.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, rrect, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar, BEAT = BAR / 4;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const KEYS = EV.keys as number[], IN = EV.in, OUT = EV.out, AGAIN = EV.again, ABITS = EV.abits as number[], BBITS = EV.bbits as number[];
const COLS = EV.cols as number[], ZOOM = EV.zoom as number[], RESULT = EV.result, SEGS = EV.segs as number[];
const FADE = 0.3;

export const CALC_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#9aa0b8", "#5a607a", "#3a3f5a",
];
const BG = "#090d2b";
const scene = (t: number) => (t >= IN && t < OUT ? "chip" : "calc");
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);
const STARS = Array.from({ length: 60 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));
const Wedge: React.FC<{ r: number; a0: number; da: number; c: string; z: number }> = ({ r, a0, da, c, z }) => (
  <mesh position={[0, 0, z]}><circleGeometry args={[r, 8, a0, da]} /><meshBasicMaterial color={c} /></mesh>
);

// ================= the calculator =================
const CY = -0.4;                                                                   // the calculator sits a bit low (under the label)
const SEG: Record<string, string> = { "2": "abged", "3": "abgcd", "5": "afgcd" };
const DW = 0.4, DH = 0.78, TH = 0.085;
const SEGG: Record<string, [number, number, number, number]> = {
  a: [-DW / 2 + 0.04, DH / 2 - TH, DW / 2 - 0.04, DH / 2], g: [-DW / 2 + 0.04, -TH / 2, DW / 2 - 0.04, TH / 2], d: [-DW / 2 + 0.04, -DH / 2, DW / 2 - 0.04, -DH / 2 + TH],
  f: [-DW / 2, 0.03, -DW / 2 + TH, DH / 2 - 0.03], b: [DW / 2 - TH, 0.03, DW / 2, DH / 2 - 0.03], e: [-DW / 2, -DH / 2 + 0.03, -DW / 2 + TH, -0.03], c: [DW / 2 - TH, -DH / 2 + 0.03, DW / 2, -0.03],
};
const Glyph: React.FC<{ g: string; lit?: number }> = ({ g, lit = 9 }) => {
  if (g === "+") return <><Flat g={rrect(-0.19, -TH / 2, 0.19, TH / 2, 0.02)} c="#6ee6cf" /><Flat g={rrect(-TH / 2, -0.19, TH / 2, 0.19, 0.02)} c="#6ee6cf" /></>;
  if (g === "=") return <><Flat g={rrect(-0.19, 0.06, 0.19, 0.06 + TH, 0.02)} c="#6ee6cf" /><Flat g={rrect(-0.19, -0.06 - TH, 0.19, -0.06, 0.02)} c="#6ee6cf" /></>;
  return <>{"abcdefg".split("").map((s) => { const on = SEG[g].includes(s) && SEG[g].indexOf(s) < lit; const [x0, y0, x1, y1] = SEGG[s]; return <Flat key={s} g={rrect(x0, y0, x1, y1, 0.03)} c={on ? "#6ee6cf" : "#121a4a"} z={on ? 0.001 : 0} />; })}</>;
};
const KX = [-1.05, -0.35, 0.35, 1.05], KY = [0.55, -0.4, -1.35, -2.3];
const KLAB = [["7", "8", "9", "/"], ["4", "5", "6", "x"], ["1", "2", "3", "-"], ["0", ".", "=", "+"]];
const PRESS: [number, number][] = [[2, 1], [3, 3], [2, 2], [3, 2]];              // 2  +  3  =   as [row, col]
const keyPos = (r: number, c: number): P2 => [KX[c], KY[r] + CY];
const pressK = (t: number, i: number) => (t >= KEYS[i] ? Math.exp(-(t - KEYS[i]) / 0.12) : 0);
const fingerG = rrect(-0.3, -4.5, 0.3, 0, 0.3), nailG = rrect(-0.19, -0.5, 0.19, -0.08, 0.15);
const fingerAt = (t: number): P2 | null => {
  if (t < KEYS[0] - 0.7 || t > KEYS[3] + 0.5) return null;
  const off: P2 = [3.4, -5.5];
  if (t < KEYS[0]) { const k = ease((t - KEYS[0] + 0.7) / 0.7), p = keyPos(...PRESS[0]); return [lerp(off[0], p[0], k), lerp(off[1], p[1], k)]; }
  for (let i = 0; i < 3; i++) if (t < KEYS[i + 1]) { const a = keyPos(...PRESS[i]), c = keyPos(...PRESS[i + 1]), k = ease((t - KEYS[i] - 0.25) / (KEYS[i + 1] - KEYS[i] - 0.25)); return [lerp(a[0], c[0], k), lerp(a[1], c[1], k) + 0.35 * Math.sin(clamp01(k) * Math.PI)]; }
  const p = keyPos(...PRESS[3]), k = ease((t - KEYS[3] - 0.15) / 0.35); return [lerp(p[0], off[0], k), lerp(p[1], off[1], k)];
};
/** what the display shows: glyphs + how many bars of the final 5 are lit */
const displayAt = (t: number): { g: string[]; lit: number } => {
  if (t < KEYS[0] - 0.7 || t >= AGAIN) return { g: ["2", "+", "3", "=", "5"], lit: 9 };
  if (t < IN) return { g: ["2", "+", "3", "="].slice(0, KEYS.filter((k) => t >= k).length), lit: 9 };
  return { g: ["2", "+", "3", "=", "5"], lit: SEGS.filter((s) => t >= s).length };
};
const SYMS = Array.from({ length: 12 }, (_, i) => ({ x: (rnd(i + 30) - 0.5) * 5.6, y: (rnd(i + 31) - 0.5) * 9, k: i % 3, ph: rnd(i + 32) * 6 }));
const Calc: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), dsp = displayAt(t), fp = fingerAt(t);
  const done = t >= SEGS[4] && t < AGAIN;
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      <group position={[0, 0.2, -12]}>{Array.from({ length: 12 }, (_, i) => <Wedge key={`w${i}`} r={12} a0={2 * LW * t + (i * Math.PI) / 6} da={Math.PI / 12} c="#121a4a" z={0} />)}</group>
      {[5.2, 4.2, 3.3].map((r, i) => <Disc key={`h${i}`} at={[0, CY]} r={r * (1 + 0.03 * k * (i + 1))} c={["#121a4a", "#1c2a6e", "#2b3f99"][i]} z={-10 + i * 0.1} seg={56} />)}
      {/* floating maths symbols */}
      {SYMS.map((s, i) => <group key={`sy${i}`} position={[s.x + 0.15 * Math.sin(3 * LW * t + s.ph), s.y + 0.2 * Math.cos(2 * LW * t + s.ph), -5]} rotation={[0, 0, s.k === 2 ? Math.PI / 4 : 0]} scale={0.6}>
        <Flat g={rrect(-0.22, -0.05, 0.22, 0.05, 0.03)} c={["#ff4f8b", "#ffd23f", "#6ee6cf"][s.k]} />{s.k !== 1 && <Flat g={rrect(-0.05, -0.22, 0.05, 0.22, 0.03)} c={["#ff4f8b", "#ffd23f", "#6ee6cf"][s.k]} />}
      </group>)}
      <Glow map={map} at={[0, CY, -2]} size={9} color="#7a4dff" opacity={0.3 + 0.15 * k} />
      {/* body */}
      <group position={[0, CY, 0]} scale={1 + 0.012 * k}>
        <Flat g={rrect(-1.67, -3.45, 1.83, 2.75, 0.32)} c="#05060f" z={-0.02} o={0.5} />
        <Flat g={rrect(-1.75, -3.35, 1.75, 2.85, 0.32)} c="#0f6e6a" z={-0.01} />
        <Flat g={rrect(-1.75, -3.2, 1.75, 2.85, 0.32)} c="#1fb5a8" />
        <Flat g={rrect(-1.6, 2.55, -0.6, 2.68, 0.05)} c="#6ee6cf" z={0.001} />
        {/* display */}
        <Flat g={rrect(-1.47, 1.28, 1.47, 2.42, 0.14)} c="#0f6e6a" z={0.002} />
        <Flat g={rrect(-1.4, 1.35, 1.4, 2.35, 0.1)} c="#05060f" z={0.003} />
        {dsp.g.map((g, i) => <group key={`g${i}`} position={[-1.04 + i * 0.52, 1.85, 0.004]}><Glyph g={g} lit={i === 4 ? dsp.lit : 9} /></group>)}
        {dsp.g.length < 5 && Math.sin(t * 10) > 0 && <Flat g={rrect(-0.15, -0.39, 0.15, -0.31, 0)} c="#6ee6cf" p={[-1.04 + dsp.g.length * 0.52, 1.85]} z={0.004} />}
        {done && <Glow map={map} at={[1.04, 1.85, 0.1]} size={1.6 + 0.4 * k} color="#6ee6cf" opacity={0.6} />}
        {/* keys */}
        {KY.map((y, r) => KX.map((x, c) => { const pi = PRESS.findIndex(([pr, pc]) => pr === r && pc === c), pk = pi >= 0 ? pressK(t, pi) : 0, op = c === 3, eq = r === 3 && c === 2; return (
          <group key={`k${r}-${c}`} position={[x, y - 0.07 * pk, 0.002]}>
            <Flat g={rrect(-0.29, -0.36, 0.29, 0.29, 0.12)} c={eq ? "#8a1414" : op ? "#c85a10" : "#5a607a"} />
            <Flat g={rrect(-0.29, -0.29 + 0.05 * pk, 0.29, 0.29, 0.12)} c={pk > 0.3 ? "#ffffff" : eq ? "#ff4f8b" : op ? "#ff8a1f" : "#c8cdf0"} z={0.001} />
          </group>); }))}
      </group>
      {PRESS.map((pk, i) => { const a = t - KEYS[i]; if (a < 0 || a > 0.4) return null; const p = keyPos(...pk); return <mesh key={`rp${i}`} position={[p[0], p[1], 0.3]} scale={0.3 + a * 2.2}><ringGeometry args={[0.86, 1, 28]} /><meshBasicMaterial color="#fff08a" transparent opacity={1 - a / 0.4} /></mesh>; })}
      {fp && <group position={[fp[0] + 0.12, fp[1] - 0.2, 0.5]} rotation={[0, 0, 0.5]}>
        <Flat g={fingerG} c="#ffbf6a" /><Flat g={rrect(0.05, -4.5, 0.3, -0.3, 0.2)} c="#ff8a7a" z={0.001} o={0.5} /><Flat g={nailG} c="#fff3b0" z={0.002} />
      </group>}
    </group>
  );
};

// ================= inside the chip: the lamp board =================
const COLX = [-0.25, 0.9, 2.05], ROWY = { a: 1.25, b: 0.25, add: -0.9, sum: -2.05 };
const A = [0, 1, 0], B = [0, 1, 1], SUMB = [1, 0, 1];
const colTime = (i: number) => COLS[2 - i];                                        // lamp column i (4s, 2s, 1s) is computed 1s first
const Lamp: React.FC<{ at: P2; on: boolean; known: boolean; map: THREE.Texture; col?: string; pop?: number }> = ({ at, on, known, map, col = "#ffd23f", pop = 0 }) => (
  <group position={[at[0], at[1], 0.1]} scale={1 + 0.3 * pop}>
    <Disc at={[0, 0]} r={0.4} c="#05060f" seg={32} />
    <Disc at={[0, 0]} r={0.34} c={known ? (on ? col : "#1c2a6e") : "#121a4a"} z={0.001} seg={32} />
    {known && on && <><Disc at={[-0.1, 0.11]} r={0.09} c="#ffffff" z={0.002} o={0.8} seg={10} /><Glow map={map} at={[0, 0, 0.05]} size={1.5 + pop} color={col} opacity={0.75} /></>}
  </group>
);
const TRACES = Array.from({ length: 16 }, (_, i) => { const x = -3 + rnd(i + 200) * 6, y = -5 + rnd(i + 201) * 9, l = 0.5 + rnd(i + 202) * 1.4, v = i % 2 === 0; return { g: ribbon(v ? [[x, y], [x, y + l], [x + 0.3, y + l + 0.3]] : [[x, y], [x + l, y], [x + l + 0.3, y - 0.3]], () => 0.03), e: (v ? [x + 0.3, y + l + 0.3] : [x + l + 0.3, y - 0.3]) as P2 }; });
const SW = Array.from({ length: 28 }, (_, i) => ({ x: -0.3 + (i % 7) * 0.1, y: 0.17 - Math.floor(i / 7) * 0.11 }));
const Chip: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const tin = t - IN, pop = (d: number) => Math.max(0.001, backOut((tin - d) / 0.35));
  const inZoom = t >= ZOOM[0] - 0.4 && t < ZOOM[1] + 0.3, n16 = Math.floor(t / (BEAT / 4));
  const carry = t - (COLS[1] + BEAT / 2), carryPath = curve([[COLX[1] - 0.3, ROWY.add + 0.2], [COLX[1] - 0.75, 0.1], [COLX[0] - 0.62, 0.75]], 20);
  return (
    <group>
      <Flat g={rrect(-9, -9, 9, 9, 0)} c="#121a4a" z={-6} />
      {TRACES.map((tr, i) => <React.Fragment key={`tr${i}`}><Flat g={tr.g} c="#1c2a6e" z={-5} /><Disc at={tr.e} r={0.07} c={(i + Math.floor(t / BEAT)) % 5 === 0 ? "#c8a010" : "#2b3f99"} z={-4.9} seg={8} /></React.Fragment>)}
      {/* wires: lamps → adder → sum */}
      {COLX.map((x, i) => { const ct = colTime(i), flow = t >= ct - 0.3 && t < ct + 0.3, u = clamp01((t - ct + 0.3) / 0.3); return (
        <group key={`wr${i}`} scale={[1, pop(0.9), 1]}>
          <Flat g={rrect(x - 0.035, ROWY.sum, x + 0.035, ROWY.a, 0)} c={t >= ct ? "#c8a010" : "#2b3f99"} z={-1} />
          {flow && [ROWY.a, ROWY.b].map((y0, j) => <Disc key={j} at={[x, lerp(y0, ROWY.add, u)]} r={0.1} c="#ffffff" z={0.3} seg={10} />)}
        </group>); })}
      {/* rows: A = 2, B = 3 */}
      {COLX.map((x, i) => <React.Fragment key={`ab${i}`}>
        <group scale={pop(0.3 + i * 0.06)}><Lamp at={[x, ROWY.a]} on={!!A[i]} known={t >= ABITS[i]} map={map} pop={t >= ABITS[i] ? Math.exp(-(t - ABITS[i]) / 0.15) : 0} /></group>
        <group scale={pop(0.45 + i * 0.06)}><Lamp at={[x, ROWY.b]} on={!!B[i]} known={t >= BBITS[i]} map={map} col="#6ee6cf" pop={t >= BBITS[i] ? Math.exp(-(t - BBITS[i]) / 0.15) : 0} /></group>
      </React.Fragment>)}
      {/* adders (one per column) with their 28 switches */}
      {COLX.map((x, i) => { const ct = colTime(i), hit = t >= ct ? Math.exp(-(t - ct) / 0.12) : 0, busy = (inZoom && i === 1) || (t >= ct - 0.2 && t < ct + 0.4); return (
        <group key={`ad${i}`} position={[x, ROWY.add, 0.2]} scale={[pop(0.7 + i * 0.06) * (1 + 0.18 * hit), pop(0.7 + i * 0.06) * (1 - 0.14 * hit), 1]}>
          <Flat g={rrect(-0.47, -0.34, 0.47, 0.34, 0.1)} c="#5a2a9a" />
          <Flat g={rrect(-0.42, -0.29, 0.42, 0.29, 0.07)} c="#7a4dff" z={0.001} />
          {SW.map((s, j) => { const on = busy ? rnd(j * 7 + n16 * 13 + i) > 0.5 : (j + i) % 3 === 0; return (
            <group key={j} position={[s.x, s.y, 0.002]}>
              <Flat g={rrect(-0.035, -0.012, 0.035, 0.012, 0)} c={on ? "#fff08a" : "#5a2a9a"} />
              <Disc at={[-0.035, 0]} r={0.016} c={on ? "#ffffff" : "#b48cff"} seg={6} /><Disc at={[0.035, on ? 0 : 0.03]} r={0.016} c={on ? "#ffffff" : "#b48cff"} seg={6} />
            </group>); })}
          {hit > 0.05 && <Glow map={map} at={[0, 0, 0.1]} size={2.2} color="#b48cff" opacity={hit} />}
        </group>); })}
      {/* the carry: 1 + 1 = 10 → the extra 1 jumps to the next column */}
      {carry >= 0 && <>
        <Flat g={ribbon(carryPath.slice(0, Math.max(2, Math.floor(clamp01(carry / 0.5) * 20))), () => 0.035)} c="#ff4f8b" z={0.25} />
        {carry < 0.5 && <Glow map={map} at={[carryPath[Math.floor(clamp01(carry / 0.5) * 19)][0], carryPath[Math.floor(clamp01(carry / 0.5) * 19)][1], 0.4]} size={1.1} color="#ff4f8b" opacity={1} />}
        {carry >= 0.5 && <group scale={1}><Lamp at={[COLX[0] - 0.62, 0.75]} on known map={map} col="#ff4f8b" pop={Math.exp(-(carry - 0.5) / 0.15)} /></group>}
      </>}
      {/* the sum row */}
      {COLX.map((x, i) => { const st = colTime(i) + BEAT / 2; return <group key={`sm${i}`} scale={pop(1.0 + i * 0.06)}><Lamp at={[x, ROWY.sum]} on={!!SUMB[i]} known={t >= st} map={map} col="#ff8a1f" pop={t >= st ? Math.exp(-(t - st) / 0.15) : t >= RESULT ? 0 : 0} /></group>; })}
      {t >= RESULT && t - RESULT < 0.6 && <Glow map={map} at={[0.9, ROWY.sum, 0.5]} size={6} color="#fff08a" opacity={1 - (t - RESULT) / 0.6} />}
    </group>
  );
};

// ================= camera, overlays, labels =================
const HOME = { p: [0, -0.1, 29] as V3, l: [0, -0.1, 0] as V3 };
const at = (x: number, y: number, z: number) => ({ p: [x, y, z] as V3, l: [x, y, 0] as V3 });
const EQ = keyPos(3, 2);
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: KEYS[0] - 0.8, ...HOME }, { t: KEYS[0], ...at(0.15, -1.3, 22) }, { t: KEYS[3], ...at(0.1, -1.5, 21) },
  { t: IN - 0.3, ...at(EQ[0], EQ[1], 7) }, { t: IN, ...at(EQ[0], EQ[1], 1.6) },
];
const CAM_C: CamKey[] = [
  { t: IN, ...at(0.4, -0.3, 6) }, { t: IN + 0.8, ...at(0.3, 0.2, 27) }, { t: COLS[0] - 0.5, ...at(0.3, 0.2, 27) },
  { t: COLS[0] + 0.5, ...at(0.3, -0.4, 27) }, { t: COLS[2], ...at(0.3, -0.4, 27) },
  { t: ZOOM[0], ...at(COLX[1], ROWY.add, 8) }, { t: ZOOM[1] - 0.25, ...at(COLX[1], ROWY.add, 7.4) },
  { t: RESULT + 0.5, ...at(0.3, -0.8, 27) }, { t: OUT - 0.5, ...at(0.3, -0.8, 27) }, { t: OUT - 0.25, ...at(0.9, -2.0, 9) }, { t: OUT, ...at(0.9, ROWY.sum, 2) },
];
const CAM_D: CamKey[] = [
  { t: OUT, ...at(0.6, 1.85 + CY, 5) }, { t: OUT + 0.7, ...at(0.3, 1.5 + CY, 13) }, { t: SEGS[4] + 0.4, ...at(0.3, 1.5 + CY, 13) },
  { t: b(16.4), ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : t < OUT ? camAt(CAM_C, t) : camAt(CAM_D, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - IN) < 1 ? "#ff4f8b" : "#ff8a1f");
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
const Overlays: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => {
  const unit = project([1, 0, 0], cam, FOV)[0] - project([0, 0, 0], cam, FOV)[0];
  const txt = (s: string, p: P2, size: number, col = "#ffffff", k = 1, key?: string) => { const [x, y] = project([p[0], p[1], 0.1], cam, FOV); return <div key={key ?? s + p[0] + p[1]} style={{ ...px, position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${k})`, fontSize: size, color: col, whiteSpace: "nowrap", textShadow: "4px 4px 0 #05060f" }}>{s}</div>; };
  if (scene(t) === "calc") return <>{KY.map((y, r) => KX.map((x, c) => txt(KLAB[r][c], [x, y + CY + 0.02], unit * 0.26, "#05060f", 1, `kl${r}${c}`)))}</>;
  const tin = t - IN, inZoom = t >= ZOOM[0] - 0.3 && t < ZOOM[1] + 0.2, head = clamp01((tin - 0.6) / 0.3) * (inZoom ? 0 : 1);
  return (
    <>
      {head > 0 && COLX.map((x, i) => txt(["4", "2", "1"][i], [x, 1.95], unit * 0.34, "#fff08a", head, `hd${i}`))}
      {head > 0 && txt("WORTH:", [-1.55, 1.95], unit * 0.2, "#9aa0b8", head)}
      {head > 0 && t >= ABITS[0] - 0.4 && txt("2 =", [-1.45, ROWY.a], unit * 0.34, "#ffd23f", backOut((t - ABITS[0] + 0.4) / 0.25))}
      {head > 0 && t >= BBITS[0] - 0.4 && txt("3 =", [-1.45, ROWY.b], unit * 0.34, "#6ee6cf", backOut((t - BBITS[0] + 0.4) / 0.25))}
      {!inZoom && COLX.map((x, i) => <React.Fragment key={`bt${i}`}>
        {t >= ABITS[i] && txt(String(A[i]), [x, ROWY.a - 0.02], unit * 0.3, A[i] ? "#05060f" : "#7a88d6", 1, `a${i}`)}
        {t >= BBITS[i] && txt(String(B[i]), [x, ROWY.b - 0.02], unit * 0.3, B[i] ? "#05060f" : "#7a88d6", 1, `b${i}`)}
        {t >= colTime(i) + BEAT / 2 && txt(String(SUMB[i]), [x, ROWY.sum - 0.02], unit * 0.3, SUMB[i] ? "#05060f" : "#7a88d6", 1, `s${i}`)}
        {tin > 1.2 && txt("+", [x, ROWY.add + 0.52], unit * 0.2, "#b48cff", 1, `p${i}`)}
      </React.Fragment>)}
      {!inZoom && t >= COLS[1] + BEAT / 2 + 0.5 && txt("1", [COLX[0] - 0.62, 0.73], unit * 0.3, "#05060f")}
      {!inZoom && t >= COLS[1] + BEAT / 2 + 0.5 && t < RESULT && txt("CARRY", [COLX[0] - 0.75, 0.2], unit * 0.16, "#ff4f8b")}
      {t >= RESULT + 0.3 && !inZoom && txt("4 + 0 + 1 = 5", [0.4, ROWY.sum - 0.95], unit * 0.28, "#fff08a", backOut((t - RESULT - 0.3) / 0.3))}
    </>
  );
};
const TOPZ: [number, number] = [540, 330];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "IT ONLY KNOWS" }], [{ t: "0 AND 1.", c: "#6ee6cf" }], [{ t: "SO HOW 2+3=5? 🤯" }]];
const LABELS: LabelDef[] = [
  Lb(0, KEYS[0] - 0.7, "#6ee6cf", HOOK, true),
  Lb(KEYS[0] - 0.7, IN, "#ffbf6a", [[{ t: "EACH KEY YOU PRESS" }], [{ t: "CLOSES A SWITCH", c: "#ffbf6a" }], [{ t: "→ INTO THE CHIP" }]]),
  Lb(IN, BBITS[0] - 0.3, "#ffd23f", [[{ t: "INSIDE: ONLY LAMPS," }], [{ t: "ON = 1, OFF = 0", c: "#ffd23f" }], [{ t: "WORTH 4, 2, 1" }]]),
  Lb(BBITS[0] - 0.3, COLS[0] - 0.5, "#6ee6cf", [[{ t: "SO 2 BECOMES 010" }], [{ t: "3 BECOMES 011", c: "#6ee6cf" }], [{ t: "(2+1 = 3)" }]]),
  Lb(COLS[0] - 0.5, COLS[1] - 0.3, "#b48cff", [[{ t: "IT ADDS COLUMN BY" }], [{ t: "COLUMN, LIKE YOU", c: "#b48cff" }], [{ t: "DO ON PAPER" }]]),
  Lb(COLS[1] - 0.3, ZOOM[0] - 0.2, "#ff4f8b", [[{ t: "1 + 1 = 10 HERE:" }], [{ t: "WRITE 0,", c: "#ff8a1f" }], [{ t: "CARRY THE 1", c: "#ff4f8b" }]]),
  Lb(ZOOM[0] - 0.2, RESULT, "#b48cff", [[{ t: "EACH ADDER IS JUST" }], [{ t: "~28 SWITCHES", c: "#fff08a" }], [{ t: "(TRANSISTORS)" }]]),
  Lb(RESULT, OUT, "#ff8a1f", [[{ t: "RESULT: 1 0 1" }], [{ t: "= 4 + 0 + 1", c: "#ff8a1f" }], [{ t: "= 5 ✅" }]]),
  Lb(OUT, b(16.2), "#6ee6cf", [[{ t: "THE SCREEN LIGHTS" }], [{ t: "5 OF ITS 7 BARS", c: "#6ee6cf" }], [{ t: "TO DRAW A 5" }]]),
  Lb(b(16.2), AGAIN, "#fff08a", [[{ t: "ALL IN MILLIONTHS" }], [{ t: "OF A SECOND ⚡", c: "#fff08a" }], [{ t: "(1971: 2,300 SW.)" }]]),
  Lb(AGAIN, D + 0.01, "#6ee6cf", HOOK, true),
];
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const CalculatorVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/23-calculator/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={CALC_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "calc" ? <Calc t={t} map={glow} /> : <Chip t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#6ee6cf" }}>@HOWTOWITHZAY</div>
      <Overlays t={t} cam={cam} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
