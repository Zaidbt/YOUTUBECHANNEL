/**
 * Video 023 (adult cut) · the calculator video restyled for grown-ups: a dark technical-drawing look (blueprint grid,
 * thin lines, ONE amber accent + a cool signal blue), finer pixels (scale 2), clean Inter typography in sentence case,
 * no emojis, no mascots, no bouncing: slow steady camera, things light up and travel with purpose. Dry copy.
 * Same timeline and facts as CalculatorVideo.tsx (calculator.json); music = music_dark.wav (videos/23-calculator/build_dark.py).
 */
import React from "react";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./calculator.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { camAt, CamKey } from "../teasers/Majestic";
import { project } from "../../brand/Labels";
import { P2, clamp01, ease, lerp, rrect, ribbon, Flat, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar, BEAT = BAR / 4;
const b = (n: number) => n * BAR;
const FOV = 20;
const KEYS = EV.keys as number[], IN = EV.in, OUT = EV.out, AGAIN = EV.again, ABITS = EV.abits as number[], BBITS = EV.bbits as number[];
const COLS = EV.cols as number[], RESULT = EV.result, SEGS = EV.segs as number[];

const C = { bg: "#0a0e1a", grid: "#121a2c", grid2: "#1a2540", body: "#111829", key: "#182136", line: "#3a4666", mid: "#8b96b5", hi: "#e8eaf2", amber: "#ffb000", amberD: "#6b4a00", amberK: "#2a1d00", blue: "#55c8ff", blueD: "#1d4a66", black: "#05070d" };
export const DARK_PALETTE = Object.values(C);
const scene = (t: number) => (t >= IN && t < OUT ? "chip" : "calc");
const box = (x0: number, y0: number, x1: number, y1: number, r: number, fill: string, edge: string, z = 0, w = 0.025) => (
  <><Flat g={rrect(x0 - w, y0 - w, x1 + w, y1 + w, r + w)} c={edge} z={z} /><Flat g={rrect(x0, y0, x1, y1, r)} c={fill} z={z + 0.001} /></>
);
const Grid: React.FC = () => (
  <>
    {Array.from({ length: 15 }, (_, i) => <Flat key={`gv${i}`} g={rrect(-0.008, -9, 0.008, 9, 0)} c={i % 4 === 3 ? C.grid2 : C.grid} p={[-3.5 + i * 0.5, 0]} z={-9} />)}
    {Array.from({ length: 37 }, (_, i) => <Flat key={`gh${i}`} g={rrect(-5, -0.008, 5, 0.008, 0)} c={i % 4 === 0 ? C.grid2 : C.grid} p={[0, -9 + i * 0.5]} z={-9} />)}
  </>
);

// ================= the calculator (a drawing, not a toy) =================
const CY = -1.25, K = 0.85;
const SEG: Record<string, string> = { "2": "abged", "3": "abgcd", "5": "afgcd" };
const DW = 0.4, DH = 0.78, TH = 0.07;
const SEGG: Record<string, [number, number, number, number]> = {
  a: [-DW / 2 + 0.05, DH / 2 - TH, DW / 2 - 0.05, DH / 2], g: [-DW / 2 + 0.05, -TH / 2, DW / 2 - 0.05, TH / 2], d: [-DW / 2 + 0.05, -DH / 2, DW / 2 - 0.05, -DH / 2 + TH],
  f: [-DW / 2, 0.04, -DW / 2 + TH, DH / 2 - 0.04], b: [DW / 2 - TH, 0.04, DW / 2, DH / 2 - 0.04], e: [-DW / 2, -DH / 2 + 0.04, -DW / 2 + TH, -0.04], c: [DW / 2 - TH, -DH / 2 + 0.04, DW / 2, -0.04],
};
const Glyph: React.FC<{ g: string; lit?: number }> = ({ g, lit = 9 }) => {
  if (g === "+") return <><Flat g={rrect(-0.17, -TH / 2, 0.17, TH / 2, 0)} c={C.amber} /><Flat g={rrect(-TH / 2, -0.17, TH / 2, 0.17, 0)} c={C.amber} /></>;
  if (g === "=") return <><Flat g={rrect(-0.17, 0.06, 0.17, 0.06 + TH, 0)} c={C.amber} /><Flat g={rrect(-0.17, -0.06 - TH, 0.17, -0.06, 0)} c={C.amber} /></>;
  return <>{"abcdefg".split("").map((s) => { const on = SEG[g].includes(s) && SEG[g].indexOf(s) < lit; const [x0, y0, x1, y1] = SEGG[s]; return <Flat key={s} g={rrect(x0, y0, x1, y1, 0.01)} c={on ? C.amber : C.amberK} z={on ? 0.001 : 0} />; })}</>;
};
const KX = [-1.05, -0.35, 0.35, 1.05], KY = [0.55, -0.4, -1.35, -2.3];
const KLAB = [["7", "8", "9", "÷"], ["4", "5", "6", "×"], ["1", "2", "3", "−"], ["0", ".", "=", "+"]];
const PRESS: [number, number][] = [[2, 1], [3, 3], [2, 2], [3, 2]];
const keyPos = (r: number, c: number): P2 => [KX[c] * K, KY[r] * K + CY];
const displayAt = (t: number): { g: string[]; lit: number } => {
  if (t < KEYS[0] - 0.7 || t >= AGAIN) return { g: ["2", "+", "3", "=", "5"], lit: 9 };
  if (t < IN) return { g: ["2", "+", "3", "="].slice(0, KEYS.filter((k) => t >= k).length), lit: 9 };
  return { g: ["2", "+", "3", "=", "5"], lit: SEGS.filter((s) => t >= s).length };
};
/** each key press sends one pulse down a trace to the chip */
const tracePath = (i: number): P2[] => { const p = keyPos(...PRESS[i]); return [[p[0], p[1] - 0.3 * K], [p[0], -3.05 * K + CY], [0, -3.05 * K + CY], [0, -3.2 * K + CY]]; };
const along = (pts: P2[], u: number): P2 => { const L = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = L.reduce((a, c) => a + c, 0); let d = clamp01(u) * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i]) return [lerp(pts[i][0], pts[i + 1][0], d / L[i]), lerp(pts[i][1], pts[i + 1][1], d / L[i])]; d -= L[i]; } return pts[pts.length - 1]; };
const Calc: React.FC<{ t: number }> = ({ t }) => {
  const dsp = displayAt(t);
  return (
    <group>
      <Grid />
      <group position={[0, CY, 0]} scale={K}>
        {box(-1.75, -3.3, 1.75, 2.85, 0.22, C.body, C.line, -0.02, 0.03)}
        <Flat g={rrect(-1.55, 2.62, -0.75, 2.66, 0)} c={C.line} />
        {box(-1.42, 1.3, 1.42, 2.4, 0.08, C.black, C.line, 0)}
        {dsp.g.map((g, i) => <group key={`g${i}`} position={[-1.04 + i * 0.52, 1.85, 0.004]}><Glyph g={g} lit={i === 4 ? dsp.lit : 9} /></group>)}
        {dsp.g.length < 5 && Math.sin(t * 9) > 0 && <Flat g={rrect(-0.14, -0.39, 0.14, -0.33, 0)} c={C.amber} p={[-1.04 + dsp.g.length * 0.52, 1.85]} z={0.004} />}
        {KY.map((y, r) => KX.map((x, c) => { const pi = PRESS.findIndex(([pr, pc]) => pr === r && pc === c), a = pi >= 0 ? t - KEYS[pi] : -1, hot = a >= 0 && a < 0.35, eq = r === 3 && c === 2, op = c === 3; return (
          <group key={`k${r}-${c}`} position={[x, y, 0.002]}>{box(-0.28, -0.28, 0.28, 0.28, 0.06, hot ? C.amber : eq ? C.amberK : C.key, hot ? C.amber : eq || op ? C.amberD : C.line, 0, 0.022)}</group>); }))}
        {/* traces from the keypad to the chip */}
        <Flat g={rrect(-1.4, -3.07, 1.4, -3.03, 0)} c={C.line} z={0.003} />
        {box(-0.32, -3.24, 0.32, -2.86, 0.04, C.black, C.amberD, 0.004, 0.02)}
      </group>
      {PRESS.map((_, i) => { const a = t - KEYS[i]; if (a < 0 || a > 0.5) return null; const pts = tracePath(i), p = along(pts, a / 0.45); return (
        <React.Fragment key={`pl${i}`}><Flat g={ribbon(pts, () => 0.018)} c={C.blueD} z={0.01} /><Flat g={rrect(-0.07, -0.07, 0.07, 0.07, 0.02)} c={C.blue} p={p} z={0.02} /></React.Fragment>); })}
    </group>
  );
};

// ================= inside the chip: a logic diagram =================
const COLX = [-0.35, 0.75, 1.85], ROWY = { a: 0.35, b: -0.65, add: -1.8, sum: -2.95 }, HEADY = 1.05, CARRYY = -0.15;
const A = [0, 1, 0], B = [0, 1, 1], SUMB = [1, 0, 1];
const colTime = (i: number) => COLS[2 - i];
const Cell: React.FC<{ at: P2; on: boolean; known: boolean; col?: string }> = ({ at, on, known, col = C.amber }) => (
  <group position={[at[0], at[1], 0.1]}>{box(-0.3, -0.3, 0.3, 0.3, 0.04, known && on ? col : C.black, known ? (on ? col : C.line) : C.grid2, 0, 0.024)}</group>
);
const Chip: React.FC<{ t: number }> = ({ t }) => {
  const tin = t - IN, show = (d: number) => tin >= d;
  const carry = t - (COLS[1] + BEAT / 2), cpath: P2[] = [[COLX[1] - 0.45, ROWY.add], [COLX[1] - 0.55, ROWY.add], [COLX[1] - 0.55, CARRYY], [COLX[0], CARRYY]];
  return (
    <group>
      <Grid />
      {COLX.map((x, i) => { const ct = colTime(i), u = clamp01((t - ct + 0.3) / 0.3), flow = t >= ct - 0.3 && t < ct + 0.02; return (
        <React.Fragment key={`c${i}`}>
          {show(0.9) && <Flat g={rrect(x - 0.012, ROWY.sum + 0.3, x + 0.012, ROWY.a - 0.3, 0)} c={t >= ct ? C.amberD : C.line} z={-1} />}
          {flow && [ROWY.a, ROWY.b].map((y0, j) => <Flat key={j} g={rrect(-0.06, -0.06, 0.06, 0.06, 0.02)} c={C.blue} p={[x, lerp(y0 - 0.3, ROWY.add + 0.3, u)]} z={0.3} />)}
          {show(0.3 + i * 0.08) && <Cell at={[x, ROWY.a]} on={!!A[i]} known={t >= ABITS[i]} />}
          {show(0.5 + i * 0.08) && <Cell at={[x, ROWY.b]} on={!!B[i]} known={t >= BBITS[i]} />}
          {show(0.8 + i * 0.08) && <group position={[x, ROWY.add, 0.2]}>{box(-0.42, -0.3, 0.42, 0.3, 0.03, t >= ct && t - ct < 0.25 ? C.blueD : C.body, t >= ct ? C.blue : C.line, 0, 0.024)}</group>}
          {show(1.0 + i * 0.08) && <Cell at={[x, ROWY.sum]} on={!!SUMB[i]} known={t >= ct + BEAT / 2} col={C.hi} />}
        </React.Fragment>); })}
      {carry >= 0 && <>
        <Flat g={ribbon(cpath.slice(0, 1).concat([along(cpath, 0.33 * Math.min(1, carry / 0.15)), ...(carry > 0.15 ? [cpath[2]] : []), ...(carry > 0.3 ? [along(cpath, clamp01(carry / 0.5))] : [])]), () => 0.016)} c={C.blue} z={0.25} />
        {carry < 0.5 && <Flat g={rrect(-0.07, -0.07, 0.07, 0.07, 0.02)} c={C.blue} p={along(cpath, carry / 0.5)} z={0.3} />}
      </>}
    </group>
  );
};

// ================= camera + typography =================
const HOME = { p: [0, -0.1, 29] as V3, l: [0, -0.1, 0] as V3 };
const at = (x: number, y: number, z: number) => ({ p: [x, y, z] as V3, l: [x, y, 0] as V3 });
const CAM_A: CamKey[] = [{ t: 0, ...HOME }, { t: KEYS[0] - 0.8, ...at(0, -0.2, 28) }, { t: KEYS[3], ...at(0, -0.6, 25) }, { t: IN - 0.4, ...at(0, -2.6 * K + CY, 9) }, { t: IN, ...at(0, -3.05 * K + CY, 1.5) }];
const CAM_C: CamKey[] = [{ t: IN, ...at(0.3, -0.6, 7) }, { t: IN + 1.0, ...at(0.3, -0.1, 28) }, { t: RESULT, ...at(0.3, -0.3, 27.5) }, { t: OUT - 0.5, ...at(0.3, -0.4, 27) }, { t: OUT, ...at(0.75, ROWY.sum, 2) }];
const CAM_D: CamKey[] = [{ t: OUT, ...at(0.6 * K, 1.85 * K + CY, 5) }, { t: OUT + 0.9, ...at(0.2, 1.85 * K + CY + 1.1, 15) }, { t: SEGS[4] + 0.4, ...at(0.2, 1.85 * K + CY + 1.1, 15.5) }, { t: b(16.6), ...HOME }, { t: D, ...HOME }];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : t < OUT ? camAt(CAM_C, t) : camAt(CAM_D, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / 0.35) : 1 - Math.min(1, (t - x) / 0.45))));

type Cap = { from: number; to: number; step: string; head: string; sub?: string; hold?: boolean };
const HOOK: Omit<Cap, "from" | "to"> = { step: "How it works", head: "Your calculator can't\ncount past 1.", sub: "So how does it know 2 + 3 = 5?", hold: true };
const CAPS: Cap[] = [
  { from: 0, to: KEYS[0] - 0.7, ...HOOK },
  { from: KEYS[0] - 0.7, to: IN - 0.2, step: "01  Input", head: "Each key closes\none switch.", sub: "No numbers yet. Just a pulse to the chip." },
  { from: IN + 0.3, to: BBITS[0] - 0.3, step: "02  Encoding", head: "Inside, a number is a\nrow of on/off cells.", sub: "Each cell is worth 4, 2 or 1.  So 2 is off-on-off." },
  { from: BBITS[0] - 0.3, to: COLS[0] - 0.5, step: "02  Encoding", head: "3 is off-on-on.", sub: "2 + 1. That is the whole alphabet: on and off." },
  { from: COLS[0] - 0.5, to: COLS[1] - 0.3, step: "03  Addition", head: "It adds one column\nat a time.", sub: "Right to left, exactly as you do on paper." },
  { from: COLS[1] - 0.3, to: RESULT, step: "03  Addition", head: "On + on doesn't fit\nin one cell.", sub: "Write off, carry one to the left. Each adder: about 28 transistors." },
  { from: RESULT, to: OUT - 0.2, step: "04  Result", head: "on-off-on\n= 4 + 0 + 1 = 5", sub: "Nothing here ever knew what a 5 is." },
  { from: OUT + 0.3, to: b(16.4), step: "05  Display", head: "Five of seven bars\nlight up.", sub: "You read it as a 5." },
  { from: b(16.4), to: AGAIN, step: "05  Display", head: "Start to finish:\nmillionths of a second.", sub: "The first calculator chip (1971) had 2,300 switches." },
  { from: AGAIN, to: D + 0.01, ...HOOK },
];
const inter: React.CSSProperties = { fontFamily: "Inter, 'Inter Display', Helvetica, Arial, sans-serif", color: C.hi };
const Caption: React.FC<{ t: number }> = ({ t }) => (
  <>{CAPS.filter((c) => t >= c.from && t < c.to).map((c) => { const k = c.hold && c.from === 0 ? 1 : ease((t - c.from) / 0.4), out = c.to > D ? 1 : clamp01((c.to - t) / 0.25); return (
    <div key={c.from} style={{ position: "absolute", left: 76, top: 230, width: 930, opacity: Math.min(k, out), transform: `translateY(${(1 - k) * 14}px)` }}>
      <div style={{ width: 84, height: 5, background: C.amber, marginBottom: 26 }} />
      <div style={{ ...inter, fontSize: 30, fontWeight: 500, letterSpacing: 5, textTransform: "uppercase", color: C.amber, marginBottom: 20 }}>{c.step}</div>
      <div style={{ ...inter, fontSize: 74, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1.5, whiteSpace: "pre-line" }}>{c.head}</div>
      {c.sub && <div style={{ ...inter, fontSize: 38, fontWeight: 400, lineHeight: 1.3, color: C.mid, marginTop: 22 }}>{c.sub}</div>}
    </div>); })}</>
);
const Overlays: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => {
  const unit = project([1, 0, 0], cam, FOV)[0] - project([0, 0, 0], cam, FOV)[0];
  const txt = (s: string, p: P2, size: number, col: string, key: string, w = 500, o = 1) => { const [x, y] = project([p[0], p[1], 0.1], cam, FOV); return <div key={key} style={{ ...inter, position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", fontSize: size, fontWeight: w, color: col, whiteSpace: "nowrap", opacity: o, fontVariantNumeric: "tabular-nums" }}>{s}</div>; };
  if (scene(t) === "calc") return <>{KY.map((y, r) => KX.map((x, c) => { const pi = PRESS.findIndex(([pr, pc]) => pr === r && pc === c), hot = pi >= 0 && t >= KEYS[pi] && t - KEYS[pi] < 0.35; return txt(KLAB[r][c], keyPos(r, c), unit * 0.23, hot ? C.black : c === 3 || (r === 3 && c === 2) ? C.amber : C.mid, `kl${r}${c}`); }))}</>;
  const tin = t - IN, o = clamp01((tin - 0.7) / 0.4);
  return (
    <>
      {COLX.map((x, i) => txt(["4", "2", "1"][i], [x, HEADY], unit * 0.26, C.mid, `hd${i}`, 500, o))}
      {txt("worth", [-1.4, HEADY], unit * 0.17, C.line, "worth", 400, o)}
      {t >= ABITS[0] - 0.4 && txt("2", [-1.4, ROWY.a], unit * 0.34, C.amber, "ra", 600, clamp01((t - ABITS[0] + 0.4) / 0.3))}
      {t >= BBITS[0] - 0.4 && txt("3", [-1.4, ROWY.b], unit * 0.34, C.amber, "rb", 600, clamp01((t - BBITS[0] + 0.4) / 0.3))}
      {COLX.map((x, i) => <React.Fragment key={`b${i}`}>
        {t >= ABITS[i] && txt(String(A[i]), [x, ROWY.a], unit * 0.3, A[i] ? C.black : C.line, `a${i}`, 600)}
        {t >= BBITS[i] && txt(String(B[i]), [x, ROWY.b], unit * 0.3, B[i] ? C.black : C.line, `bb${i}`, 600)}
        {t >= colTime(i) + BEAT / 2 && txt(String(SUMB[i]), [x, ROWY.sum], unit * 0.3, SUMB[i] ? C.black : C.line, `s${i}`, 600)}
        {tin > 1.3 && txt("add", [x, ROWY.add], unit * 0.15, t >= colTime(i) ? C.blue : C.mid, `ad${i}`, 500, clamp01((tin - 1.3) / 0.3))}
      </React.Fragment>)}
      {t >= COLS[1] + BEAT / 2 + 0.3 && t < RESULT + 2 && txt("carry", [COLX[0] + 0.55, CARRYY + 0.14], unit * 0.14, C.blue, "carry", 500)}
      {t >= RESULT + 0.2 && txt("=  5", [-1.3, ROWY.sum], unit * 0.34, C.hi, "five", 600, clamp01((t - RESULT - 0.2) / 0.3))}
    </>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

export const CalculatorDark: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("videos/23-calculator/music_dark.wav")} />
      <PixelArtCanvas bg={C.bg} fov={FOV} palette={DARK_PALETTE} outline={false} dither={0} scale={2}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "calc" ? <Calc t={t} /> : <Chip t={t} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: C.bg, opacity: diveAt(t) }} />
      <div style={{ ...inter, position: "absolute", left: 76, top: 96, fontSize: 26, fontWeight: 500, letterSpacing: 4, color: C.line }}>HOW IT WORKS WITH ZAY</div>
      <Overlays t={t} cam={cam} />
      <Caption t={t} />
    </AbsoluteFill>
  );
};
