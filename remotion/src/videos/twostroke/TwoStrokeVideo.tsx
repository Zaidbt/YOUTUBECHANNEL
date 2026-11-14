/**
 * Video 027 · How a 2-stroke engine works — pixel-art cross-section in the LSD / ChameleonK flat look.
 * One piston, no valves: three holes in the cylinder wall (exhaust port, transfer port, intake/reed into the crankcase).
 * Piston up: squeezes the fresh charge on top + sucks a new charge into the crankcase. Spark at the top: bang, power
 * stroke. Going down it uncovers the exhaust port (burnt gas out), then the transfer port (fresh charge, pushed out of
 * the pressurised crankcase, rushes up and scavenges). The expansion chamber sends a pressure wave back that pushes
 * escaping fresh charge back in before the port closes. One bang per revolution (a 4-stroke: one every two). The catch:
 * the crankcase is in the intake path, so oil is mixed into the fuel and burns → blue smoke. 10,000 rpm = 167 bangs/s.
 * 40.6 s loop, 130 BPM big beat; every ignition is a drum hit (twostroke.json + music.wav from videos/27-twostroke/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./twostroke.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type Sec = { name: string; t0: number; t1: number; r0: number; r1: number };
const D = EV.duration, BAR = EV.bar, BEAT = EV.beat;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const CRANK = EV.crank as Sec[], IGN = EV.ign as number[];
const secAt = (t: number) => CRANK.find((c) => t >= c.t0 && t < c.t1) ?? CRANK[CRANK.length - 1];
const revsAt = (t: number) => { const c = secAt(t); return c.r0 + ((Math.min(t, c.t1) - c.t0) / (c.t1 - c.t0)) * (c.r1 - c.r0); };
const thetaAt = (t: number) => ((revsAt(t) % 1) + 1) % 1 * 360;
const sec = (n: string) => CRANK.find((c) => c.name === n)!;

export const TS_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#9aa0b8", "#5a607a", "#3a3f5a",
];
const BG = "#090d2b";
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);
const STARS = Array.from({ length: 60 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));
const Wedge: React.FC<{ r: number; a0: number; da: number; c: string; z: number }> = ({ r, a0, da, c, z }) => (
  <mesh position={[0, 0, z]}><circleGeometry args={[r, 6, a0, da]} /><meshBasicMaterial color={c} /></mesh>
);

// ================= engine geometry (local units) =================
const C: P2 = [0, -1.7], CR = 0.62, ROD = 1.9;
const pinY = (th: number) => { const a = (th * Math.PI) / 180; return C[1] + CR * Math.cos(a) + Math.sqrt(ROD * ROD - CR * CR * Math.sin(a) ** 2); };
const crankPin = (th: number): P2 => { const a = (th * Math.PI) / 180; return [C[0] + CR * Math.sin(a), C[1] + CR * Math.cos(a)]; };
const topY = (th: number) => pinY(th) + 0.55;
const HEAD = 1.62, BORE = 0.8, WALL = 0.22;
const EXH: [number, number] = [0.62, 1.0], TRN: [number, number] = [0.25, 0.62];
const P_IN: P2[] = [[-2.75, -1.35], [-2.0, -1.35], [-1.45, -1.35], [-0.9, -1.15], [-0.4, -1.0]];
const P_TR: P2[] = [[-0.6, -0.75], [-1.12, -0.5], [-1.14, 0.1], [-1.08, 0.44], [-0.6, 0.6], [0.0, 1.05]];
const P_EX: P2[] = [[0.3, 0.95], [1.02, 0.82], [1.7, 0.78], [2.2, 0.35], [2.38, -0.5], [2.3, -1.5], [2.22, -2.45], [2.2, -3.1]];
const pathAt = (pts: P2[], u: number): P2 => { const L = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = L.reduce((a, c) => a + c, 0); let d = clamp01(u) * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i]) return [lerp(pts[i][0], pts[i + 1][0], d / L[i]), lerp(pts[i][1], pts[i + 1][1], d / L[i])]; d -= L[i]; } return pts[pts.length - 1]; };
const between = (th: number, a: number, c: number) => (a <= c ? th >= a && th < c : th >= a || th < c);
const win = (th: number, a: number, c: number, fade = 12) => (!between(th, a, c) ? 0 : Math.min(1, ((th - a + 360) % 360) / fade, ((c - th + 360) % 360) / fade));
const exhOpen = (th: number) => topY(th) < EXH[1], trOpen = (th: number) => topY(th) < TRN[1];
const chamberCol = (th: number) => (th < 22 ? "#fff08a" : th < 60 ? "#ff8a1f" : th < 95 ? "#c85a10" : th < 140 ? "#5a607a" : th < 250 ? "#1fb5a8" : th < 335 ? "#6ee6cf" : "#bfe6ff");
const caseCol = (th: number) => (th >= 200 ? "#1fb5a8" : th < 120 ? "#6ee6cf" : "#0f6e6a");
const EXP_BELLY: P2 = [2.3, -0.1];

const CASE = blob([[-1.35, -0.35], [1.35, -0.35], [1.45, -1.4], [1.2, -2.5], [0, -2.85], [-1.2, -2.5], [-1.45, -1.4]], 40);
const CASE_IN = blob([[-1.15, -0.45], [1.15, -0.45], [1.25, -1.4], [1.02, -2.33], [0, -2.62], [-1.02, -2.33], [-1.25, -1.4]], 40);
const PW = (u: number) => { const k = [0.22, 0.34, 0.62, 0.7, 0.5, 0.2, 0.13, 0.12], x = u * 7, i = Math.min(6, Math.floor(x)); return lerp(k[i], k[i + 1], x - i); };
const PIPE = ribbon(curve(P_EX.slice(1), 50), (u) => PW(u));
const PIPE_IN = ribbon(curve(P_EX.slice(1), 50), (u) => PW(u) * 0.7);
const TRCH = ribbon(curve(P_TR.slice(0, 5), 30), () => 0.26);
const TRCH_IN = ribbon(curve(P_TR.slice(0, 5), 30), () => 0.16);
const INTAKE = ribbon(P_IN.slice(0, 3), () => 0.36), INTAKE_IN = ribbon(P_IN.slice(0, 3), () => 0.24);

const Engine: React.FC<{ t: number; map: THREE.Texture; smoke: number; wave: number }> = ({ t, map, smoke, wave }) => {
  const th = thetaAt(t), pin = pinY(th), top = topY(th), cp = crankPin(th), k = beatK(t);
  const fire = win(th, 0, 70, 4), spark = th > 350 || th < 8;
  const intake = win(th, 200, 345), transfer = trOpen(th) ? 1 : 0, exhaust = exhOpen(th) ? 1 : 0, escape = win(th, 140, 225) * transfer;
  const reed = intake;
  const rodG = ribbon([cp, [0, pin]], () => 0.11);
  const parts = (pts: P2[], n: number, speed: number, act: number, col: string, size = 0.07, seed = 0) => act <= 0.02 ? null : Array.from({ length: n }, (_, i) => { const u = (i / n + t * speed + seed) % 1; const p = pathAt(pts, u); return <Disc key={`${seed}-${i}`} at={[p[0] + 0.04 * Math.sin(i * 3 + t * 9), p[1] + 0.04 * Math.cos(i * 2 + t * 7)]} r={size * (0.8 + 0.4 * rnd(i + seed * 13))} c={col} z={0.06} o={act} seg={8} />; });
  return (
    <group>
      {/* crankcase + intake tract + carb */}
      <Flat g={INTAKE} c="#5a607a" z={-0.06} /><Flat g={INTAKE_IN} c={intake > 0.1 ? "#1fb5a8" : "#1c2a6e"} z={-0.055} />
      <Flat g={rrect(-2.65, -1.8, -2.05, -0.9, 0.12)} c="#9aa0b8" z={-0.05} /><Flat g={rrect(-2.55, -1.7, -2.15, -1.0, 0.08)} c="#5a607a" z={-0.049} />
      <Flat g={blob([[-2.95, -0.85], [-2.65, -0.95], [-2.65, -1.75], [-2.95, -1.85], [-3.15, -1.35]], 16)} c="#ff8a1f" z={-0.048} />
      <Flat g={CASE} c="#9aa0b8" z={-0.05} />
      <Flat g={CASE_IN} c={caseCol(th)} z={-0.045} />
      {/* reed valve petals */}
      {[-1, 1].map((sd) => <group key={sd} position={[-1.38, -1.35 + sd * 0.16, -0.04]} rotation={[0, 0, sd * (0.15 + 0.6 * reed)]}><Flat g={rrect(0, -0.025, 0.36, 0.025, 0.02)} c="#05060f" /></group>)}
      {/* transfer channel */}
      <Flat g={TRCH} c="#9aa0b8" z={-0.035} /><Flat g={TRCH_IN} c={transfer ? "#6ee6cf" : caseCol(th)} z={-0.03} />
      {/* exhaust pipe with expansion chamber */}
      <Flat g={PIPE} c="#c85a10" z={-0.03} /><Flat g={PIPE_IN} c="#3a3f5a" z={-0.025} />
      {/* cylinder walls with fins */}
      {[-1, 1].map((sd) => <React.Fragment key={`w${sd}`}>
        <Flat g={rrect(-WALL / 2, -0.35, WALL / 2, sd > 0 ? EXH[0] : TRN[0], 0.02)} c="#9aa0b8" p={[sd * (BORE + WALL / 2), 0]} z={-0.02} />
        <Flat g={rrect(-WALL / 2, sd > 0 ? EXH[1] : TRN[1], WALL / 2, HEAD, 0.02)} c="#9aa0b8" p={[sd * (BORE + WALL / 2), 0]} z={-0.02} />
        {Array.from({ length: 6 }, (_, i) => { const y = 0.75 + i * 0.22; return sd < 0 && y < 0.8 ? null : <Flat key={i} g={rrect(0, -0.055, 0.42, 0.055, 0.03)} c={i % 2 ? "#c8cdf0" : "#9aa0b8"} p={[sd > 0 ? BORE + WALL : -(BORE + WALL) - 0.42, y + (sd > 0 ? 0.12 : 0)]} z={-0.021} />; })}
      </React.Fragment>)}
      {/* cylinder head + fins + spark plug */}
      <Flat g={blob([[-1.05, HEAD], [1.05, HEAD], [0.9, 2.05], [0, 2.18], [-0.9, 2.05]], 24)} c="#9aa0b8" z={-0.02} />
      {Array.from({ length: 3 }, (_, i) => <Flat key={`hf${i}`} g={rrect(-1.25 + i * 0.12, 0, 1.25 - i * 0.12, 0.09, 0.04)} c={i % 2 ? "#c8cdf0" : "#9aa0b8"} p={[0, 2.12 + i * 0.2]} z={-0.022} />)}
      <Flat g={rrect(-0.12, 1.85, 0.12, 2.35, 0.03)} c="#ffffff" z={-0.01} />
      <Flat g={rrect(-0.2, 2.35, 0.2, 2.6, 0.04)} c="#5a607a" z={-0.009} />
      <Flat g={rrect(-0.08, 2.6, 0.08, 2.85, 0.03)} c="#c8cdf0" z={-0.008} />
      {/* combustion chamber gas */}
      <Flat g={rrect(-BORE, top, BORE, HEAD, 0.02)} c={chamberCol(th)} z={-0.015} />
      {fire > 0.02 && <Glow map={map} at={[0, (top + HEAD) / 2, 0.2]} size={2.4 + 1.2 * fire} color="#ff8a1f" opacity={0.85 * fire} />}
      {spark && <><Glow map={map} at={[0, HEAD - 0.05, 0.25]} size={1.4} color="#ffffff" opacity={1} />{Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return <Flat key={i} g={ribbon([[0, HEAD - 0.05], [0.28 * Math.cos(a), HEAD - 0.05 + 0.28 * Math.sin(a)]], () => 0.035)} c="#fff08a" z={0.26} />; })}</>}
      {/* piston, rings, wrist pin */}
      <Flat g={rrect(-BORE + 0.02, pin - 0.4, BORE - 0.02, top, 0.06)} c="#c8cdf0" z={0.0} />
      <Flat g={rrect(BORE - 0.3, pin - 0.4, BORE - 0.02, top, 0.05)} c="#9aa0b8" z={0.001} />
      {[0.1, 0.22].map((d, i) => <Flat key={i} g={rrect(-BORE + 0.02, top - d - 0.035, BORE - 0.02, top - d, 0)} c="#5a607a" z={0.002} />)}
      <Flat g={rrect(-BORE + 0.12, top - 0.05, -0.25, top - 0.01, 0)} c="#ffffff" z={0.003} o={0.7} />
      <Disc at={[0, pin]} r={0.13} c="#5a607a" z={0.004} seg={14} />
      {/* con-rod + crank */}
      <Flat g={rodG} c="#7a88d6" z={0.01} />
      <Disc at={C} r={0.85} c="#5a607a" z={0.005} seg={40} />
      <group position={[C[0], C[1], 0.006]} rotation={[0, 0, -(th * Math.PI) / 180]}>
        <mesh rotation={[0, 0, Math.PI]}><circleGeometry args={[0.8, 32, Math.PI * 0.2, Math.PI * 0.6]} /><meshBasicMaterial color="#3a3f5a" /></mesh>
      </group>
      <Disc at={C} r={0.16} c="#c8cdf0" z={0.012} seg={14} />
      <Disc at={cp} r={0.15} c="#ffd23f" z={0.013} seg={14} />
      {/* gas flows */}
      {parts(P_IN, 10, 0.9, intake, "#6ee6cf", 0.07, 0)}
      {parts(P_TR, 10, 1.1, transfer, "#bfe6ff", 0.07, 0.3)}
      {parts(P_EX, 16, 0.8, exhaust, smoke > 0.5 ? "#4a9aff" : "#9aa0b8", 0.09, 0.6)}
      {parts(P_EX.slice(0, 4), 5, 0.7, escape, "#6ee6cf", 0.07, 0.9)}
      {/* the expansion chamber's return pressure wave */}
      {wave > 0.02 && between(th, 195, 262) && (() => { const u = 1 - clamp01((th - 195) / 67); const p = pathAt(P_EX.slice(0, 5), u); return <><mesh position={[p[0], p[1], 0.2]} scale={0.5 + 0.2 * Math.sin(t * 20)}><ringGeometry args={[0.7, 1, 24]} /><meshBasicMaterial color="#ffd23f" transparent opacity={wave} /></mesh><Glow map={map} at={[p[0], p[1], 0.25]} size={1.3} color="#ffd23f" opacity={wave} /></>; })()}
      {/* exhaust puffs at the pipe end */}
      {IGN.map((g, i) => { const a = t - g - 0.08; if (a < 0 || a > 1.2) return null; return <Disc key={`pf${i}`} at={[2.2 + a * 0.4, -3.1 - a * 0.9]} r={0.12 + a * 0.35} c={smoke > 0.5 ? "#4a9aff" : "#7a88d6"} z={0.05} o={0.75 * (1 - a / 1.2)} seg={16} />; })}
      {k > 0.5 && <Glow map={map} at={[0, -0.5, -0.5]} size={6} color="#7a4dff" opacity={0.15 * k} />}
    </group>
  );
};

// ================= scene =================
const ENG_POS: P2 = [0.1, -0.85], ENG_S = 0.88;
const W = (p: P2): V3 => [ENG_POS[0] + p[0] * ENG_S, ENG_POS[1] + p[1] * ENG_S, 0.5];
const Scene: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), s = secAt(t).name;
  const smoke = s === "smoke" ? 1 : 0, wave = s === "revB" && t > (sec("revB").t0 + sec("revB").t1) / 2 ? 1 : 0;
  const shake = s === "revup" ? 0.03 * Math.sin(t * 90) : 0;
  return (
    <group>
      {STARS.map((st, i) => <Disc key={`s${i}`} at={[st.x, st.y]} r={st.s * (0.7 + 0.3 * Math.sin(6 * LW * t + st.ph))} c="#fff3b0" z={-20} seg={6} />)}
      <group position={[0, 0, -12]}>{Array.from({ length: 12 }, (_, i) => <Wedge key={`w${i}`} r={12} a0={2 * LW * t + (i * Math.PI) / 6} da={Math.PI / 12} c="#121a4a" z={0} />)}</group>
      {[5.3, 4.2, 3.3].map((r, i) => <Disc key={`h${i}`} at={[0, -0.4]} r={r * (1 + 0.025 * k * (i + 1))} c={(s === "smoke" ? ["#121a4a", "#1c2a6e", "#1f4abf"] : s === "revup" ? ["#4a2a5a", "#8a1414", "#c85a10"] : ["#121a4a", "#1c2a6e", "#2b3f99"])[i]} z={-10 + i * 0.1} seg={56} />)}
      <group position={[ENG_POS[0] + shake, ENG_POS[1], 0]} scale={ENG_S * (1 + 0.012 * k)}><Engine t={t} map={map} smoke={smoke} wave={wave} /></group>
    </group>
  );
};

// ================= tags, camera, labels, HUD =================
type Tag = { txt: string; at: V3; from: number; to: number; col: string };
const I = sec("intro"), A = sec("revA"), Bq = sec("revB"), CMP = sec("compare"), SM = sec("smoke"), RU = sec("revup"), H2 = sec("hook2");
const TAGS: Tag[] = [
  { txt: "EXHAUST PORT", at: W([1.05, EXH[1] + 0.05]), from: I.t0 + 0.3, to: A.t0, col: "#9aa0b8" },
  { txt: "TRANSFER PORT", at: W([-1.1, TRN[1] + 0.25]), from: I.t0 + 0.7, to: A.t0, col: "#6ee6cf" },
  { txt: "INTAKE", at: W([-2.3, -0.85]), from: I.t0 + 1.1, to: A.t0, col: "#1fb5a8" },
  { txt: "FUEL + AIR", at: W([0, 1.5]), from: A.t0 + (A.t1 - A.t0) * 0.55, to: A.t1, col: "#6ee6cf" },
  { txt: "CRANKCASE", at: W([0.9, -2.85]), from: A.t0 + (A.t1 - A.t0) * 0.6, to: A.t1, col: "#1fb5a8" },
  { txt: "EXPANSION CHAMBER", at: W([2.3, 0.45]), from: Bq.t0 + (Bq.t1 - Bq.t0) * 0.5, to: Bq.t1, col: "#ffd23f" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: Math.max(170, Math.min(910, x)), top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 24, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.4, 29] as V3, l: [0, 0.4, 0] as V3 };
const at = (x: number, y: number, z: number) => ({ p: [x, y, z] as V3, l: [x, y, 0] as V3 });
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: I.t0, ...HOME }, { t: I.t0 + 1.2, ...at(0, 0.1, 27) }, { t: A.t0, ...at(0, 0.1, 27) },
  { t: A.t0 + 1.0, ...at(0, 0.6, 21) }, { t: A.t1 - 0.6, ...at(0, 0.3, 22) }, { t: Bq.t0 + 0.8, ...at(0.5, -0.3, 25) }, { t: Bq.t1 - 0.5, ...at(0.9, -0.4, 24) },
  { t: CMP.t0 + 0.8, ...HOME }, { t: RU.t0, ...HOME }, { t: RU.t1 - 0.6, ...at(0, 0.2, 25) }, { t: H2.t0 + 0.8, ...HOME }, { t: D, ...HOME },
];
const TOPZ: [number, number] = [540, 330];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HALF THE PARTS," }], [{ t: "TWICE THE BANGS.", c: "#ff8a1f" }], [{ t: "HOW? 🏍️" }]];
const mid = (s: Sec) => (s.t0 + s.t1) / 2;
const LABELS: LabelDef[] = [
  Lb(0, I.t0, "#ff8a1f", HOOK, true),
  Lb(I.t0, A.t0, "#9aa0b8", [[{ t: "NO VALVES. JUST" }], [{ t: "3 HOLES IN THE", c: "#6ee6cf" }], [{ t: "CYLINDER WALL" }]]),
  Lb(A.t0, mid(A), "#ff8a1f", [[{ t: "SPARK → BANG →" }], [{ t: "THE PISTON", c: "#ff8a1f" }], [{ t: "SLAMS DOWN 💥" }]]),
  Lb(mid(A), A.t1, "#6ee6cf", [[{ t: "GOING UP: SQUEEZE" }], [{ t: "THE TOP, SUCK", c: "#6ee6cf" }], [{ t: "FUEL INTO BASE" }]]),
  Lb(Bq.t0, mid(Bq), "#bfe6ff", [[{ t: "GOING DOWN IT OPENS" }], [{ t: "THE HOLES: SMOKE", c: "#9aa0b8" }], [{ t: "OUT, FUEL IN", c: "#6ee6cf" }]]),
  Lb(mid(Bq), Bq.t1, "#ffd23f", [[{ t: "THE FAT PIPE BOUNCES" }], [{ t: "A WAVE BACK TO", c: "#ffd23f" }], [{ t: "PLUG THE EXIT" }]]),
  Lb(CMP.t0, CMP.t1, "#ff8a1f", [[{ t: "1 BANG EVERY TURN." }], [{ t: "A CAR ENGINE: 1", c: "#9aa0b8" }], [{ t: "EVERY 2 TURNS" }]]),
  Lb(SM.t0, SM.t1, "#4a9aff", [[{ t: "THE CATCH: OIL GOES" }], [{ t: "IN THE FUEL →", c: "#4a9aff" }], [{ t: "THAT BLUE SMOKE" }]]),
  Lb(RU.t0, H2.t0, "#ff3a2a", [[{ t: "AT 10,000 RPM:" }], [{ t: "167 BANGS", c: "#ff3a2a" }], [{ t: "A SECOND 🔥" }]]),
  Lb(H2.t0, D + 0.01, "#ff8a1f", HOOK, true),
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const s = secAt(t).name;
  if (s !== "compare" && s !== "revup") return null;
  const box: React.CSSProperties = { position: "absolute", left: 540, top: 1700, transform: "translate(-50%, -50%)", width: 960, background: "rgba(9,13,43,0.95)", border: "8px solid #ffffff", boxShadow: "8px 8px 0 #05060f", padding: "18px 24px 14px" };
  if (s === "compare") {
    const n = IGN.filter((g) => g >= CMP.t0 && g <= t).length, turns = n;
    return (
      <div style={box}>
        {[{ n: "2-STROKE", v: n, c: "#ff8a1f" }, { n: "4-STROKE", v: Math.floor(turns / 2), c: "#9aa0b8" }].map((r) => (
          <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{ ...px, fontSize: 24, width: 220, color: r.c }}>{r.n}</div>
            <div style={{ flex: 1, display: "flex", gap: 6 }}>{Array.from({ length: r.v }, (_, i) => <div key={i} style={{ width: 26, height: 26, background: r.c, border: "3px solid #05060f" }} />)}</div>
            <div style={{ ...px, fontSize: 24, width: 170, textAlign: "right" }}>{r.v} BANGS</div>
          </div>))}
      </div>
    );
  }
  const rpm = Math.round(lerp(2000, 10000, ease((t - RU.t0) / (RU.t1 - RU.t0 - 0.5))) / 100) * 100;
  return (
    <div style={{ ...box, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ ...px, fontSize: 26, color: "#ff3a2a" }}>RPM</div>
      <div style={{ flex: 1, height: 38, background: "#05060f", border: "4px solid #05060f" }}><div style={{ width: `${(rpm / 10000) * 100}%`, height: "100%", background: rpm > 8000 ? "#ff3a2a" : "#ff8a1f" }} /></div>
      <div style={{ ...px, fontSize: 30, width: 230, textAlign: "right" }}>{rpm.toLocaleString("en-US")}</div>
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const TwoStrokeVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const cam = camAt(CAM, t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/27-twostroke/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={TS_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        <Scene t={t} map={glow} />
      </PixelArtCanvas>
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ff8a1f" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
      <Hud t={t} />
    </AbsoluteFill>
  );
};
void b;
