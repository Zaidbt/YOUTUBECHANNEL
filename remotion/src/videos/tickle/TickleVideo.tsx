/**
 * Video 035 · Why you can't tickle yourself — the LSD reference look (flat Kurzgesagt shapes through the pixel
 * pipeline, space backdrop with halo rings, Labels at the top, pinned tags, a live oscilloscope instrument).
 * Real neuroscience: efference copy → cerebellar forecast → the touch is subtracted (Blakemore 1998), the 1999 robot
 * delay experiment, force escalation +38 %/turn (Shergill 2003, Science), and self-tickle in people with auditory
 * hallucinations / passivity experiences (Blakemore 2000).
 * 45 s loop, 128 BPM UK funky (tickle.json + music.wav from videos/35-tickle/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./tickle.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, rrectLine, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";
import { BRAIN, SHADE, CEREB, STEM, RIM, FOLDS, CB_FOLDS, STARS } from "../lsd/LsdVideo";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar, BEAT = EV.beat, S16 = BEAT / 4;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const L = EV.l as number[];
const COPY = EV.copy as number[], SELF = EV.self as number[], EXT = EV.ext as number[], ROBOT = EV.robot as number[][];
const TURNS = EV.turns as number[], FORCE = EV.force as number[], VOICE = EV.voice as number[];

export const TICKLE_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#e8a070", "#d07a58", "#ffd8b0",
];
const BG = "#090d2b";
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 5);

// ================= the hand (palm up, seen from above, fingers up) =================
const SKIN = { mid: "#ffbf6a", dark: "#e8a070", deep: "#d07a58", light: "#ffd8b0" };
const PALM = blob([[-1.0, 0.85], [-1.1, 0.0], [-0.98, -0.85], [-0.55, -1.35], [0.25, -1.42], [0.85, -1.05], [1.05, -0.2], [1.02, 0.85], [0.45, 1.08], [-0.45, 1.08]], 36);
const THENAR = blob([[-1.05, 0.1], [-0.55, 0.15], [-0.25, -0.5], [-0.45, -1.15], [-0.95, -0.9]], 24);
const WRIST = rrect(-0.72, -2.7, 0.78, -1.15, 0.3), SLEEVE = rrect(-0.95, -4.2, 1.0, -2.45, 0.25), CUFF = rrect(-0.95, -2.62, 1.0, -2.42, 0.08);
const LINES = [curve([[-0.95, 0.55], [-0.2, 0.42], [0.9, 0.62]], 20), curve([[-0.95, 0.2], [-0.35, -0.05], [0.35, 0.05]], 20), curve([[-0.6, 0.35], [-0.45, -0.4], [-0.15, -1.05]], 20)].map((p) => ribbon(p, () => 0.035));
const FING = [{ x: -0.72, len: 1.5, r: 0.13 }, { x: -0.24, len: 1.78, r: 0.04 }, { x: 0.24, len: 1.68, r: -0.04 }, { x: 0.7, len: 1.25, r: -0.15 }];
const fingerG = FING.map((f) => rrect(-0.21, 0, 0.21, f.len, 0.21)), padG = FING.map((f) => rrect(-0.16, f.len - 0.48, 0.16, f.len - 0.08, 0.16));
const creaseG = FING.map((f) => [0.36, 0.66].map((u) => ribbon([[-0.15, f.len * u], [0.15, f.len * u]], () => 0.025)));
const THUMB = rrect(-0.23, 0, 0.23, 1.25, 0.23), THUMBPAD = rrect(-0.17, 0.75, 0.17, 1.17, 0.17);
const Hand: React.FC<{ at: P2; s: number; curl: number; z?: number }> = ({ at, s, curl, z = 0 }) => (
  <group position={[at[0], at[1], z]} scale={s}>
    <Flat g={SLEEVE} c="#2b3f99" z={-0.02} /><Flat g={CUFF} c="#7a88d6" z={-0.015} />
    <Flat g={WRIST} c={SKIN.dark} z={-0.01} />
    {FING.map((f, i) => (
      <group key={i} position={[f.x, 0.88, 0]} rotation={[0, 0, f.r + curl * (i % 2 ? 0.05 : -0.05)]} scale={[1, 1 - curl * 0.12, 1]}>
        <Flat g={fingerG[i]} c={SKIN.mid} z={0} />
        <Flat g={padG[i]} c={SKIN.light} z={0.002} />
        {creaseG[i].map((g, j) => <Flat key={j} g={g} c={SKIN.deep} z={0.003} o={0.7} />)}
      </group>))}
    <group position={[-0.95, -0.45, 0]} rotation={[0, 0, 0.95 - curl * 0.15]}>
      <Flat g={THUMB} c={SKIN.mid} z={0.001} /><Flat g={THUMBPAD} c={SKIN.light} z={0.003} />
    </group>
    <Flat g={PALM} c={SKIN.mid} z={0.004} />
    <Flat g={THENAR} c={SKIN.light} z={0.005} o={0.6} />
    {LINES.map((g, i) => <Flat key={i} g={g} c={SKIN.deep} z={0.006} o={0.75} />)}
  </group>
);
// ================= a feather =================
const QUILL = ribbon(curve([[0, -0.2], [0.05, 1.0], [0.25, 2.6]], 24), (u) => 0.05 * (1 - u * 0.6));
const VANE = blob([[0.02, 0.15], [-0.32, 0.8], [-0.3, 1.7], [0.05, 2.55], [0.45, 1.85], [0.48, 0.9], [0.18, 0.25]], 30);
const BARBS = Array.from({ length: 7 }, (_, i) => { const y = 0.5 + i * 0.28, x = 0.05 + (y / 2.6) * 0.2; return ribbon([[x, y], [x - 0.28, y + 0.22]], () => 0.022); });
const Feather: React.FC<{ at: P2; rot: number; s: number; z?: number }> = ({ at, rot, s, z = 0.3 }) => (
  <group position={[at[0], at[1], z]} rotation={[0, 0, rot]} scale={s}>
    <Flat g={VANE} c="#b48cff" />
    <Flat g={blob([[0.05, 0.3], [0.4, 0.9], [0.4, 1.8], [0.08, 2.45]], 20)} c="#c8cdf0" z={0.002} o={0.7} />
    {BARBS.map((g, i) => <Flat key={i} g={g} c="#7a4dff" z={0.004} o={0.6} />)}
    <Flat g={QUILL} c="#fff3b0" z={0.006} />
  </group>
);
// ================= hook scene =================
const featherAt = (t: number): { at: P2; rot: number } => ({ at: [0.2 + 0.45 * Math.sin(8 * LW * t), -0.35 + 0.3 * Math.sin(16 * LW * t + 1)], rot: -0.55 + 0.25 * Math.sin(8 * LW * t + 0.6) });
const Hero: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const f = featherAt(t), k = beatK(t), wig = Math.abs(Math.sin((t / (S16 / 2)) * Math.PI));
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      {[5.0, 4.0, 3.2].map((r, i) => <Disc key={`h${i}`} at={[0, -0.2]} r={r * (1 + 0.03 * k * (i + 1))} c="#ff4f8b" z={-10 + i * 0.1} o={0.07 + i * 0.05} seg={56} />)}
      <Glow map={map} at={[0, -0.2, -2]} size={7} color="#7a4dff" opacity={0.35 + 0.2 * k} />
      <group rotation={[0, 0, 0.02 * wig]}><Hand at={[0, -0.6]} s={1} curl={0.4 + 0.25 * wig} /></group>
      {/* tickle marks around the feather tip */}
      {[0, 1, 2].map((i) => { const a = i * 2.1 + t * 9, r = 0.35 + 0.1 * wig; return <Flat key={i} g={ribbon(curve([[0, 0], [0.12, 0.08], [0.22, 0]], 6), () => 0.03)} c="#fff08a" z={0.25} o={0.5 + 0.5 * wig} p={[f.at[0] + r * Math.cos(a), f.at[1] + r * Math.sin(a)]} />; })}
      <Feather at={f.at} rot={f.rot} s={1.05} />
      <Glow map={map} at={[f.at[0], f.at[1], 0.4]} size={1.2} color="#fff08a" opacity={0.5 + 0.3 * wig} />
    </group>
  );
};

// ================= lab: brain + pathways + hand + oscilloscope =================
const BP: P2 = [0, 0.75], BS = 0.78;
const W = (p: P2): P2 => [BP[0] + p[0] * BS, BP[1] + p[1] * BS];
const MOTOR = W([0.25, 2.62]), SENS = W([1.0, 2.38]), CBM = W([-1.7, -0.72]), AUD = W([-0.2, 0.9]);
const HANDP: P2 = [1.55, -1.35];
const PATH_DOWN = curve([MOTOR, W([0.0, 1.4]), W([-0.6, -0.4]), W([-0.75, -1.7]), [0.2, -1.55], [HANDP[0] - 0.15, HANDP[1] + 0.25]], 60);
const PATH_UP = curve([[HANDP[0] + 0.1, HANDP[1] + 0.3], [1.9, -0.5], W([2.1, 0.6]), W([1.6, 1.9]), SENS], 60);
const PATH_COPY = curve([MOTOR, W([-0.7, 1.6]), W([-1.5, 0.4]), CBM], 40);
const PATH_PRED = curve([CBM, W([-1.0, -0.3]), W([0.4, 0.6]), W([0.9, 1.6]), SENS], 50);
const along = (pts: P2[], u: number): P2 => { const f = clamp01(u) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; };
const TRAVEL = 0.45;
// the events: [command time | null, touch time, kind]
type Ev = { cmd: number | null; touch: number; delay: number };
const EVENTS: Ev[] = [
  ...COPY.map((c) => ({ cmd: c, touch: c + TRAVEL, delay: 0 })),
  ...SELF.map((s) => ({ cmd: s - TRAVEL, touch: s, delay: 0 })),
  ...EXT.map((e) => ({ cmd: null, touch: e, delay: 0 })),
  ...ROBOT.map(([m, d]) => ({ cmd: m - TRAVEL, touch: m + d, delay: d })),
];
const bump = (dt: number, w = 0.07) => Math.exp(-(dt * dt) / (2 * w * w));
const touchSig = (tt: number) => EVENTS.reduce((a, e) => Math.max(a, bump(tt - e.touch)), 0);
const predSig = (tt: number) => EVENTS.reduce((a, e) => (e.cmd === null ? a : Math.max(a, bump(tt - (e.cmd + TRAVEL)))), 0);
const felt = (tt: number) => Math.max(0, touchSig(tt) - 0.92 * predSig(tt));
const Scope: React.FC<{ t: number }> = ({ t }) => {
  const X0 = -2.35, X1 = 2.35, Y = -3.95, WIN = 1.6, N = 200;
  const tr = (f: (x: number) => number, y0: number, h: number): P2[] => Array.from({ length: N + 1 }, (_, i) => { const tt = t - WIN + (i / N) * WIN; return [X0 + (i / N) * (X1 - X0), y0 + h * f(tt)]; });
  const a = tr(touchSig, Y + 0.5, 0.6), p = tr(predSig, Y + 0.5, 0.6), fl = tr(felt, Y - 0.35, 0.6);
  return (
    <group>
      <Flat g={rrect(X0 - 0.15, Y - 0.6, X1 + 0.15, Y + 1.3, 0.1)} c="#090d2b" z={0.08} o={0.8} />
      <Flat g={rrectLine(X0 - 0.15, Y - 0.6, X1 + 0.15, Y + 1.3, 0.1, 0.035)} c="#6ee6cf" z={0.09} o={0.7} />
      <Flat g={ribbon([[X0, Y + 0.08], [X1, Y + 0.08]], () => 0.015)} c="#2b3f99" z={0.09} />
      <Flat g={ribbon(p, () => 0.04)} c="#ff4f8b" z={0.1} />
      <Flat g={ribbon(a, () => 0.03)} c="#6ee6cf" z={0.11} />
      <Flat g={ribbon(fl, () => 0.045)} c="#ffd23f" z={0.11} />
      <Disc at={a[N]} r={0.06} c="#ffffff" z={0.12} seg={8} />
    </group>
  );
};
const pulses = (t: number) => {
  const out: { at: P2; c: string; r: number }[] = [];
  for (const e of EVENTS) {
    if (e.cmd !== null) {
      const u = (t - e.cmd) / TRAVEL; if (u >= 0 && u <= 1) { out.push({ at: along(PATH_DOWN, u), c: "#ffd23f", r: 0.12 }); out.push({ at: along(PATH_COPY, u * 1.6), c: "#ff4f8b", r: 0.11 }); }
      const v = (t - e.cmd - TRAVEL * 0.62) / (TRAVEL * 0.38); if (v >= 0 && v <= 1) out.push({ at: along(PATH_PRED, v), c: "#ff4f8b", r: 0.11 });
    }
    const w = (t - e.touch) / 0.3; if (w >= 0 && w <= 1) out.push({ at: along(PATH_UP, w), c: "#6ee6cf", r: 0.12 });
  }
  return out;
};
const sensGlow = (t: number) => EVENTS.reduce((a, e) => { const dt = t - e.touch - 0.3; if (dt < 0 || dt > 0.6) return a; const strength = e.cmd === null ? 1 : Math.min(1, 0.12 + e.delay * 4); return Math.max(a, strength * (1 - dt / 0.6)); }, 0);
const robotOn = (t: number) => t >= L[4] && t < L[5];
const duelOn = (t: number) => t >= L[5] && t < L[7];
const voiceOn = (t: number) => t >= L[7] && t < L[9];
const RBASE = rrect(-0.5, -0.3, 0.5, 0.2, 0.1);
const Robot: React.FC<{ t: number }> = ({ t }) => {
  const ev = ROBOT.map(([m, d]) => m + d).filter((x) => x - 0.3 <= t).pop(), u = ev === undefined ? 0 : clamp01(1 - Math.abs(t - ev) / 0.25);
  const tip: P2 = [HANDP[0] + 0.15, HANDP[1] + 0.15 + 0.35 * (1 - u)];
  const elbow: P2 = [2.45, -0.6];
  return (
    <group>
      <group position={[2.55, -2.55, 0.15]}><Flat g={RBASE} c="#7a88d6" /></group>
      <Flat g={ribbon([[2.55, -2.4], elbow], () => 0.14)} c="#c8cdf0" z={0.16} />
      <Flat g={ribbon([elbow, tip], () => 0.11)} c="#c8cdf0" z={0.17} />
      <Disc at={elbow} r={0.16} c="#7a88d6" z={0.18} />
      <Disc at={tip} r={0.13} c="#ff8a7a" z={0.19} />
    </group>
  );
};
const Duel: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const n = TURNS.filter((x) => x <= t).length;
  return (
    <group>
      <Flat g={ribbon([[-1.9, -3.4], [1.9, -3.4]], () => 0.04)} c="#7a88d6" z={0.1} />
      {TURNS.map((x, i) => { if (i >= n) return null; const k = backOut((t - x) / 0.25), h = 0.3 * FORCE[i] * k, cx = -1.5 + i * 0.5, you = i % 2 === 0; return (
        <React.Fragment key={i}>
          <Flat g={rrect(cx - 0.19, -3.37, cx + 0.19, -3.37 + h, 0.08)} c={you ? "#ff4f8b" : "#6ee6cf"} z={0.12} />
          {t - x < 0.4 && <Glow map={map} at={[cx, -3.37 + h, 0.3]} size={1.0} color="#fff08a" opacity={1 - (t - x) / 0.4} />}
        </React.Fragment>); })}
    </group>
  );
};
const Lab: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), sg = sensGlow(t), broken = voiceOn(t);
  const extTouch = EXT.find((e) => t >= e - 0.5 && t < e + 0.5);
  const fe: P2 = extTouch !== undefined ? [HANDP[0] + 0.55 - 0.4 * clamp01(1 - Math.abs(t - extTouch) / 0.3), HANDP[1] + 0.25] : [0, 0];
  const vk = VOICE.reduce((a, v) => Math.max(a, t >= v && t < v + 0.6 ? 1 - (t - v) / 0.6 : 0), 0);
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      {[4.6, 3.7, 2.9].map((r, i) => <Disc key={`h${i}`} at={[BP[0], BP[1] + 1.0]} r={r * (1 + 0.025 * k * (i + 1))} c="#b48cff" z={-10 + i * 0.1} o={0.06 + i * 0.04} seg={56} />)}
      {/* the brain (side view) */}
      <group position={[BP[0], BP[1], 0]} scale={BS * (1 + 0.015 * k)}>
        <Flat g={STEM} c="#d94a7a" z={-0.05} /><Flat g={CEREB} c={broken ? "#7a4a6a" : "#ff8a7a"} z={-0.02} />
        {CB_FOLDS.map((g, i) => <Flat key={`cb${i}`} g={g} c="#d94a7a" z={-0.01} />)}
        <Flat g={BRAIN} c="#ff8a7a" z={0} /><Flat g={SHADE} c="#ff4f8b" z={0.01} />
        {FOLDS.map((g, i) => <Flat key={`f${i}`} g={g} c="#d94a7a" z={0.02} />)}
        <Flat g={RIM} c="#ffb3c9" z={0.03} />
      </group>
      {/* pathways */}
      <Flat g={ribbon(PATH_DOWN, () => 0.035)} c="#ffd23f" z={0.05} o={0.35} />
      <Flat g={ribbon(PATH_UP, () => 0.035)} c="#6ee6cf" z={0.05} o={0.35} />
      <Flat g={ribbon(PATH_COPY, () => 0.035)} c="#ff4f8b" z={0.05} o={broken ? 0.15 : 0.45} />
      <Flat g={ribbon(PATH_PRED, () => 0.03)} c="#ff4f8b" z={0.05} o={broken ? 0.1 : 0.3} />
      {broken && <group position={[along(PATH_COPY, 0.55)[0], along(PATH_COPY, 0.55)[1], 0.3]}>
        <Flat g={ribbon([[-0.2, -0.2], [0.2, 0.2]], () => 0.07)} c="#ff3a2a" /><Flat g={ribbon([[-0.2, 0.2], [0.2, -0.2]], () => 0.07)} c="#ff3a2a" />
      </group>}
      {pulses(t).map((p, i) => <React.Fragment key={i}><Disc at={p.at} r={p.r} c={p.c} z={0.2} seg={12} /><Glow map={map} at={[p.at[0], p.at[1], 0.25]} size={0.8} color={p.c} opacity={0.8} /></React.Fragment>)}
      {/* areas */}
      <Glow map={map} at={[SENS[0], SENS[1], 0.3]} size={0.6 + 2.2 * sg} color="#6ee6cf" opacity={0.25 + 0.75 * sg} />
      <Disc at={MOTOR} r={0.1} c="#ffd23f" z={0.2} /><Disc at={SENS} r={0.1} c="#6ee6cf" z={0.2} /><Disc at={CBM} r={0.1} c="#ff4f8b" z={0.2} />
      {vk > 0 && <><Glow map={map} at={[AUD[0], AUD[1], 0.3]} size={0.8 + 1.6 * vk} color="#b48cff" opacity={vk} />
        {[0, 1, 2].map((i) => <mesh key={i} position={[AUD[0] - 1.6 + i * 0.25, AUD[1] + 0.05, 0.3]}><ringGeometry args={[0.2 + i * 0.22 + (1 - vk) * 0.3, 0.26 + i * 0.22 + (1 - vk) * 0.3, 24, 1, -0.9, 1.8]} /><meshBasicMaterial color="#b48cff" transparent opacity={vk} /></mesh>)}</>}
      {/* the hand (small) or the duel */}
      {!duelOn(t) && <group><Hand at={HANDP} s={0.36} curl={0.3 + 0.4 * sg} z={0.1} /></group>}
      {extTouch !== undefined && <Feather at={fe} rot={-0.9} s={0.45} z={0.3} />}
      {robotOn(t) && <Robot t={t} />}
      {duelOn(t) && <Duel t={t} map={map} />}
      {/* felt meter */}
      <group position={[-2.2, -1.6, 0.1]}>
        <Flat g={rrect(-0.16, -0.75, 0.16, 0.75, 0.08)} c="#090d2b" o={0.8} />
        <Flat g={rrect(-0.11, -0.7, 0.11, -0.7 + 1.4 * Math.max(sg, felt(t)), 0.06)} c="#ffd23f" z={0.01} />
      </group>
      {!duelOn(t) && <Scope t={t} />}
    </group>
  );
};

// ================= camera, dives, labels, tags =================
const HOME = { p: [0, 0.4, 29] as V3, l: [0, 0.4, 0] as V3 };
const LABV = { p: [0, 0.1, 29] as V3, l: [0, 0.1, 0] as V3 };
const PALMC: P2 = [0.1, -0.5];
const CAM_A: CamKey[] = [{ t: 0, ...HOME }, { t: L[1] - 1.2, ...HOME }, { t: L[1], p: [PALMC[0], PALMC[1], 2.2], l: [PALMC[0], PALMC[1], 0] }];
const CAM_L: CamKey[] = [{ t: L[1], p: [SENS[0], SENS[1], 3], l: [SENS[0], SENS[1], 0] }, { t: L[1] + 1.0, ...LABV }, { t: L[9] - 1.0, ...LABV }, { t: L[9], p: [HANDP[0], HANDP[1], 1.6], l: [HANDP[0], HANDP[1], 0] }];
const CAM_H: CamKey[] = [{ t: L[9], p: [PALMC[0], PALMC[1], 3], l: [PALMC[0], PALMC[1], 0] }, { t: L[9] + 1.0, ...HOME }, { t: D, ...HOME }];
const scene = (t: number) => (t < L[1] || t >= L[9] ? "hero" : "lab");
const camFor = (t: number) => (t < L[1] ? camAt(CAM_A, t) : t < L[9] ? camAt(CAM_L, t) : camAt(CAM_H, t)) as { p: V3; l: V3 };
const diveAt = (t: number) => Math.max(...[L[1], L[9]].map((x) => (t < x ? 1 - Math.min(1, (x - t) / 0.3) : 1 - Math.min(1, (t - x) / 0.3))));
const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "YOUR BRAIN DELETES" }], [{ t: "YOUR OWN TOUCH", c: "#ff4f8b" }], [{ t: "BEFORE IT LANDS" }]];
const R2 = ROBOT[1][0], SPLIT4 = (L[4] + R2) / 2;
const LABELS: LabelDef[] = [
  Lb(0, L[1], "#ff4f8b", HOOK, true),
  Lb(L[1], L[2], "#ff4f8b", [[{ t: "EVERY MOVE SENDS A" }], [{ t: "COPY", c: "#ff4f8b" }, { t: " TO YOUR" }], [{ t: "CEREBELLUM 🧠" }]]),
  Lb(L[2], L[3], "#ffd23f", [[{ t: "IT FORECASTS THE" }], [{ t: "TOUCH, THEN", c: "#6ee6cf" }], [{ t: "SUBTRACTS IT ➖", c: "#ffd23f" }]]),
  Lb(L[3], L[4], "#6ee6cf", [[{ t: "SOMEONE ELSE?" }], [{ t: "NO FORECAST", c: "#ff4f8b" }], [{ t: "→ FULL TICKLE 🪶", c: "#ffd23f" }]]),
  Lb(L[4], SPLIT4, "#c8cdf0", [[{ t: "1999 EXPERIMENT:" }], [{ t: "YOU MOVE," }], [{ t: "A ROBOT TOUCHES", c: "#c8cdf0" }]]),
  Lb(SPLIT4, L[5], "#ffd23f", [[{ t: "ADD A 0.1-0.2 S DELAY" }], [{ t: "FORECAST MISSES", c: "#ff4f8b" }], [{ t: "→ IT TICKLES 🪶", c: "#ffd23f" }]]),
  Lb(L[5], L[6], "#ff4f8b", [[{ t: "BONUS (SCIENCE 2003):" }], [{ t: "YOUR OWN PUSH" }], [{ t: "FEELS HALF 💪", c: "#ff4f8b" }]]),
  Lb(L[6], L[7], "#6ee6cf", [[{ t: "SO IN A SHOVING GAME" }], [{ t: "EACH TURN HITS" }], [{ t: "+38% HARDER 👊", c: "#ffd23f" }]]),
  Lb(L[7], L[8], "#b48cff", [[{ t: "PEOPLE HEARING VOICES" }], [{ t: "CAN TICKLE", c: "#b48cff" }], [{ t: "THEMSELVES 🪶", c: "#b48cff" }]]),
  Lb(L[8], L[9], "#ff3a2a", [[{ t: "THE COPY IS BROKEN:" }], [{ t: "OWN THOUGHTS" }], [{ t: "FEEL EXTERNAL 🗣️", c: "#ff8a7a" }]]),
  Lb(L[9], D + 0.01, "#ff4f8b", HOOK, true),
];
type Tag = { txt: string | ((t: number) => string); at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const SCOPE_TAGS: Tag[] = [
  { txt: "TOUCH", at: [-1.85, -2.75, 0.5], from: L[1] + 1.0, to: L[9], col: "#6ee6cf" },
  { txt: "FORECAST", at: [-0.65, -2.75, 0.5], from: L[1] + 1.0, to: L[9], col: "#ff4f8b" },
  { txt: "FELT", at: [-1.95, -3.6, 0.5], from: L[1] + 1.0, to: L[9], col: "#ffd23f" },
];
const SRC: Tag[] = [
  { txt: "BLAKEMORE ET AL. 1998", at: [0, -4.75, 0.5], from: L[2], to: L[4], col: "#7a88d6" },
  { txt: "BLAKEMORE ET AL. 1999", at: [0, -4.75, 0.5], from: L[4], to: L[5], col: "#7a88d6" },
  { txt: "SHERGILL ET AL. 2003", at: [0, -4.75, 0.5], from: L[5], to: L[7], col: "#7a88d6" },
  { txt: "BLAKEMORE ET AL. 2000", at: [0, -4.75, 0.5], from: L[7], to: L[9], col: "#7a88d6" },
];
const delayNow = (t: number) => { const r = ROBOT.filter(([m]) => m - 0.6 <= t).pop(); return r ? Math.round(r[1] * 1000) : 0; };
const TAGS: Tag[] = [
  { txt: "WHY YOU CAN'T TICKLE YOURSELF", at: [0, -3.55, 0.5], from: 0, to: L[1], col: "#b48cff" },
  { txt: "WHY YOU CAN'T TICKLE YOURSELF", at: [0, -3.55, 0.5], from: L[9], to: D + 1, col: "#b48cff" },
  { txt: "MOTOR CORTEX", at: [MOTOR[0] - 0.3, MOTOR[1] + 0.25, 0.5], from: L[1] + 1.1, to: L[2], col: "#ffd23f" },
  { txt: "CEREBELLUM", at: [CBM[0], CBM[1] - 0.35, 0.5], from: L[1] + 1.6, to: L[3], col: "#ff4f8b" },
  { txt: "TOUCH AREA", at: [SENS[0] + 0.55, SENS[1] - 0.45, 0.5], from: L[2] + 0.2, to: L[4], col: "#6ee6cf" },

  { txt: (t) => `DELAY ${delayNow(t)} MS`, at: [1.6, 0.0, 0.5], from: L[4] + 0.6, to: L[5], col: "#c8cdf0" },
  { txt: "YOU", at: [-1.5, -3.55, 0.5], from: TURNS[0], to: L[7], col: "#ff4f8b" },
  { txt: "THEM", at: [-0.85, -3.95, 0.5], from: TURNS[1], to: L[7], col: "#6ee6cf" },
  { txt: (t) => { const n = TURNS.filter((x) => x <= t).length; return n ? `×${FORCE[n - 1].toFixed(1)} FORCE` : ""; }, at: [1.2, -1.0, 0.5], from: TURNS[0], to: L[7], col: "#ffd23f" },
  { txt: "INNER VOICE", at: [AUD[0] - 1.5, AUD[1] + 0.55, 0.5], from: VOICE[0], to: L[9], col: "#b48cff" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[]; small?: boolean }> = ({ t, cam, tags, small }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g, i) => { const txt = typeof g.txt === "function" ? g.txt(t) : g.txt; if (!txt) return null; const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = g.from === 0 || g.from === L[9] ? 1 : backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: small ? 20 : 26, color: small ? "#c8cdf0" : "#ffffff", background: "rgba(9,13,43,0.92)", border: `${small ? 4 : 6}px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: small ? "8px 10px 4px" : "12px 14px 8px", whiteSpace: "nowrap" }}>{txt}</div>); })}</>
);
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const TickleVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  const lastTurn = TURNS.filter((x) => x <= t).length;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/35-tickle/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={TICKLE_PALETTE} outline={false} dither={0.05} scale={2}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "hero" ? <Hero t={t} map={glow} /> : <Lab t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: SKIN.mid, opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#b48cff" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} tags={TAGS} />
      {s === "lab" && <TagsView t={t} cam={cam} tags={SRC} small />}
      {s === "lab" && !duelOn(t) && <TagsView t={t} cam={cam} tags={SCOPE_TAGS} small />}
      {lastTurn > 1 && t < L[7] && t - TURNS[lastTurn - 1] < 0.5 && <div style={{ position: "absolute", left: 0, right: 0, top: 1060, textAlign: "center", fontFamily: "PressStart2P", fontSize: 64, color: "#ffd23f", textShadow: "6px 6px 0 #05060f", transform: `scale(${backOut((t - TURNS[lastTurn - 1]) / 0.2)})` }}>+38%</div>}
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
