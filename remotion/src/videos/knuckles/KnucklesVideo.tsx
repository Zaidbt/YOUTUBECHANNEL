/**
 * Video 025 · What is the CRACK when you crack your knuckles? — LSD-look explainer (colourful Kurzgesagt-flat pixel art,
 * dry adult copy, one step at a time, instruments: pressure bar + sound trace + a 20-minute recharge bar).
 * Facts: the sound does not come from bones. Between the bones is a joint capsule filled with synovial fluid holding
 * dissolved gas. Pulling the finger separates the joint surfaces, pressure in the capsule drops, and a gas cavity forms
 * suddenly (cavitation / tribonucleation) — real-time MRI (Kawchuk et al., PLOS ONE 2015) showed the crack coincides with
 * the cavity forming. The joint can't be cracked again for ~20 minutes while the gas redissolves. No link with
 * arthritis was found; Dr Donald Unger cracked only his left hand's knuckles for ~60 years (≈36,500 times), neither hand
 * had arthritis — Ig Nobel Prize in Medicine 2009.
 * 42.7 s loop, 118 BPM 80s synth-pop whose snare is layered with a knuckle crack (knuckles.json + music.wav from videos/25-knuckles/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./knuckles.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar, BEAT = BAR / 4;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const L = EV.l as number[], IN = EV.in, OUT = EV.out, BACK = EV.back, HOOKC = EV.hook as number[], PULL = EV.pull as number[];
const CRACK = EV.crack, COUNT = EV.count as number[], YOUR = EV.your, NOPE = EV.nope;
const FADE = 0.3;

export const KN_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#9aa0b8", "#5a607a", "#3a3f5a",
];
const BG = "#090d2b";
const scene = (t: number) => (t < IN || t >= BACK ? "hero" : t < OUT ? "joint" : "hands");
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));
const Wedge: React.FC<{ r: number; a0: number; da: number; c: string; z: number; o?: number }> = ({ r, a0, da, c, z, o }) => (
  <mesh position={[0, 0, z]}><circleGeometry args={[r, 6, a0, da]} /><meshBasicMaterial color={c} transparent={o !== undefined} opacity={o ?? 1} depthWrite={o === undefined} /></mesh>
);
/** comic "pop": a spiky star + rings, age in seconds */
const Burst: React.FC<{ at: P2; age: number; s?: number; map: THREE.Texture; z?: number }> = ({ at, age, s = 1, map, z = 0.6 }) => {
  if (age < 0 || age > 0.45) return null;
  const k = 1 - age / 0.45, g = s * (0.6 + 1.4 * Math.sqrt(age / 0.45));
  return (
    <group position={[at[0], at[1], z]}>
      {Array.from({ length: 8 }, (_, i) => <group key={i} rotation={[0, 0, (i * Math.PI) / 4 + 0.2]}><Flat g={blob([[0.18 * g, -0.05 * g], [0.62 * g, 0], [0.18 * g, 0.05 * g]], 3)} c={i % 2 ? "#ffd23f" : "#ffffff"} o={k} /></group>)}
      <mesh scale={0.3 * s + age * 3 * s}><ringGeometry args={[0.85, 1, 28]} /><meshBasicMaterial color="#fff08a" transparent opacity={k} /></mesh>
      <Glow map={map} at={[0, 0, 0.05]} size={2.2 * s} color="#fff08a" opacity={k} />
    </group>
  );
};

// ================= the hand (back of the hand, fingers up, a sweater sleeve) =================
const SKIN = "#ffbf6a", SKIN_D = "#c85a10", SKIN_L = "#fff3b0";
const FX = [-0.75, -0.25, 0.25, 0.73], FLEN = [1.6, 1.82, 1.7, 1.32], FW = [0.44, 0.46, 0.44, 0.38], FB = 0.55;
const PALM = blob([[-1.0, 0.7], [-0.35, 0.82], [0.35, 0.8], [0.98, 0.62], [1.05, -0.4], [0.82, -1.25], [0.0, -1.5], [-0.82, -1.3], [-1.08, -0.4]], 40);
const THUMB_G = blob([[-0.15, 0.25], [0.15, 0.22], [0.2, -0.8], [0.0, -1.05], [-0.22, -0.8]], 24);
/** fold envelope for finger events: 0 straight … 1 folded (crack at full fold) */
const foldEnv = (t: number, evs: number[]) => { let k = 0; for (const e of evs) { const a = t - e; if (a > -0.3 && a < 0) k = Math.max(k, ease((a + 0.3) / 0.3)); else if (a >= 0 && a < 0.5) k = Math.max(k, 1 - ease(a / 0.5)); } return k; };
const knuckleOf = (c: P2, sc: number, i: number, mirror = false): P2 => [c[0] + (mirror ? -1 : 1) * FX[i] * sc, c[1] + (FB + 0.22) * sc];
const Hand: React.FC<{ t: number; fold: number[]; xray?: boolean; mirror?: boolean; sleeve?: string }> = ({ t, fold, xray, mirror, sleeve = "#7a4dff" }) => {
  const skin = xray ? "#2b3f99" : SKIN, dark = xray ? "#1c2a6e" : SKIN_D, light = xray ? "#4a9aff" : SKIN_L, bone = "#fff3b0", sway = 0.015 * Math.sin(3 * LW * t);
  return (
    <group scale={[mirror ? -1 : 1, 1, 1]} rotation={[0, 0, sway]}>
      {/* sleeve */}
      <Flat g={rrect(-1.05, -5.2, 1.05, -2.15, 0.3)} c={sleeve} z={-0.03} />
      {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => <Flat key={`rb${i}`} g={rrect(x - 0.04, -2.75, x + 0.04, -2.2, 0.03)} c="#5a2a9a" z={-0.029} />)}
      <Flat g={rrect(-1.05, -2.8, 1.05, -2.6, 0.08)} c="#5a2a9a" z={-0.028} />
      {/* wrist + back of the hand */}
      <Flat g={rrect(-0.72, -2.4, 0.72, -1.0, 0.25)} c={skin} z={-0.02} />
      <Flat g={rrect(0.45, -2.4, 0.72, -1.0, 0.2)} c={dark} z={-0.019} o={0.6} />
      <Flat g={PALM} c={skin} />
      <Flat g={blob([[0.6, 0.6], [0.98, 0.5], [1.03, -0.4], [0.8, -1.2], [0.55, -0.6]], 20)} c={dark} z={0.001} o={0.55} />
      {!xray && [[-0.55, -0.2], [0.05, -0.4], [0.5, -0.1]].map((p, i) => <Flat key={`tn${i}`} g={ribbon(curve([[p[0], p[1] + 0.5], [p[0] + 0.05, p[1]], [p[0] - 0.02, p[1] - 0.5]], 10), () => 0.025)} c={dark} z={0.002} o={0.35} />)}
      {/* thumb (on the side, angled out) */}
      <group position={[-1.05, -0.55, 0.004]} rotation={[0, 0, 0.95]} scale={1.4}>
        <Flat g={THUMB_G} c={dark} p={[0.03, -0.03]} z={-0.001} />
        <Flat g={THUMB_G} c={skin} /><Flat g={rrect(-0.1, 0.0, 0.1, 0.2, 0.07)} c={light} z={0.001} />
        {xray && <><Flat g={rrect(-0.05, -0.75, 0.05, -0.38, 0.04)} c={bone} z={0.002} /><Flat g={rrect(-0.05, -0.3, 0.05, 0.12, 0.04)} c={bone} z={0.002} /></>}
      </group>
      {xray && <>
        {[[-0.35, -1.15], [0, -1.2], [0.35, -1.15], [-0.18, -0.95], [0.18, -0.95]].map((p, i) => <Disc key={`cp${i}`} at={p as P2} r={0.12} c={bone} z={0.003} seg={10} />)}
        {FX.map((x, i) => <Flat key={`mc${i}`} g={rrect(x * 0.85 - 0.06, -0.85, x - 0.06 + 0.12, FB + 0.05, 0.05)} c={bone} z={0.003} />)}
      </>}
      {/* fingers: they fold away from us at the knuckle (shorter + the knuckle bump shows) */}
      {FX.map((x, i) => { const f = clamp01(fold[i] ?? 0), len = FLEN[i] * (1 - 0.62 * f), w = FW[i], y0 = FB; return (
        <group key={`f${i}`} position={[x, 0, 0.01 + i * 0.001]}>
          <Flat g={rrect(-w / 2, y0 - 0.1, w / 2, y0 + len, w / 2)} c={skin} />
          <Flat g={rrect(w / 2 - w * 0.28, y0, w / 2, y0 + len - w * 0.3, w * 0.14)} c={dark} z={0.001} o={0.5} />
          <Flat g={rrect(-w / 2 + 0.05, y0 + len - w * 0.6, -w / 2 + 0.11, y0 + len - 0.12, 0.03)} c={light} z={0.001} o={0.8} />
          {!xray && f < 0.5 && <Flat g={rrect(-w * 0.3, y0 + len - w * 0.78, w * 0.3, y0 + len - 0.05, w * 0.28)} c={light} z={0.002} />}
          {!xray && f < 0.6 && [0.42, 0.72].map((u, j) => <Flat key={j} g={ribbon(curve([[-w * 0.28, y0 + len * u], [0, y0 + len * u + 0.04], [w * 0.28, y0 + len * u]], 8), () => 0.022)} c={dark} z={0.002} o={0.6} />)}
          {/* the knuckle */}
          <Disc at={[0, y0 + 0.08 + 0.12 * f]} r={w * (0.42 + 0.12 * f)} c={f > 0.3 ? light : skin} z={0.003} seg={18} />
          {xray && [0, 1, 2].map((j) => { const a0 = y0 + 0.05 + (len / 3) * j, a1 = a0 + len / 3 - 0.08; return <Flat key={`ph${j}`} g={rrect(-0.055, a0, 0.055, a1, 0.04)} c={bone} z={0.004} />; })}
        </group>); })}
    </group>
  );
};

// ================= the joint (cross-section) =================
const GAS = Array.from({ length: 22 }, (_, i) => ({ x: (rnd(i + 40) - 0.5) * 2.0, y: (rnd(i + 41) - 0.5) * 1.9, ph: rnd(i + 42) * 6 }));
const pullK = (t: number) => (t < PULL[0] ? 0 : t < CRACK ? ease((t - PULL[0]) / (CRACK - PULL[0])) : 1);
const bubbleR = (t: number) => (t < CRACK ? 0 : t < L[6] ? 0.46 * Math.min(1.12, backOut((t - CRACK) / 0.14)) : lerp(0.46, 0.15, ease((t - L[6]) / (OUT - L[6]))));
const JointX: React.FC<{ t: number; map: THREE.Texture; mini?: boolean }> = ({ t, map, mini }) => {
  const pk = mini ? 0 : pullK(t), xr = 0.08 + pk * 0.55 - (t >= CRACK && !mini ? 0.08 * Math.exp(-(t - CRACK) / 0.15) : 0), cx = xr / 2 - 0.05;
  const rb = mini ? 0 : bubbleR(t), ca = t - CRACK;
  return (
    <group>
      {/* the capsule (a sealed bag) full of joint fluid */}
      <group position={[cx, 0, -0.2]} scale={[1.55 + pk * 0.35, 1.3 - pk * 0.12, 1]}>
        <Disc at={[0, 0]} r={1.07} c="#ff8a7a" seg={48} />
        <Disc at={[0, 0]} r={1} c="#1fb5a8" z={0.001} seg={48} />
      </group>
      {!mini && GAS.map((g, i) => { const gx = cx + g.x * (1 + pk * 0.2) + 0.04 * Math.sin(t * 3 + g.ph), gy = g.y * 0.6 + 0.04 * Math.cos(t * 2.5 + g.ph);
        if (ca >= 0) { const u = clamp01(ca / 0.12); if (u >= 1) return null; return <Disc key={`g${i}`} at={[lerp(gx, cx, u), lerp(gy, 0, u)]} r={0.05} c="#ffffff" z={-0.1} seg={8} />; }
        return <Disc key={`g${i}`} at={[gx, gy]} r={0.045} c="#bfe6ff" z={-0.1} seg={8} o={0.9} />; })}
      {/* left bone: a rounded head with cartilage */}
      <Flat g={rrect(-6, -0.62, -0.95, 0.62, 0.2)} c="#fff3b0" z={-0.05} />
      <Disc at={[-0.92, 0]} r={0.86} c="#bfe6ff" z={-0.04} seg={40} />
      <Disc at={[-1.02, 0]} r={0.76} c="#fff3b0" z={-0.035} seg={40} />
      <Flat g={rrect(-5, 0.25, -1.3, 0.35, 0.05)} c="#ffbf6a" z={-0.03} />
      {/* right bone: a cupped base */}
      <group position={[xr, 0, 0]}>
        <Flat g={rrect(0, -0.75, 6, 0.75, 0.2)} c="#bfe6ff" z={-0.05} />
        <Flat g={rrect(0.12, -0.75, 6, 0.75, 0.2)} c="#fff3b0" z={-0.045} />
        <Flat g={rrect(0.6, 0.3, 4, 0.4, 0.05)} c="#ffbf6a" z={-0.04} />
        <Disc at={[-0.55, 0]} r={0.66} c="#1fb5a8" z={-0.03} seg={36} />
      </group>
      {/* the bubble */}
      {rb > 0.005 && <group position={[cx, 0, 0.1]}>
        <Disc at={[0, 0]} r={rb} c="#ffffff" seg={32} />
        <Disc at={[rb * 0.06, -rb * 0.06]} r={rb * 0.86} c="#bfe6ff" z={0.001} seg={32} />
        <Disc at={[-rb * 0.35, rb * 0.35]} r={rb * 0.22} c="#ffffff" z={0.002} seg={12} />
        <Glow map={map} at={[0, 0, 0.05]} size={rb * 5} color="#bfe6ff" opacity={0.6} />
      </group>}
      {!mini && <Burst at={[cx, 0]} age={ca} s={1.6} map={map} />}
      {!mini && ca >= 0 && ca < 0.7 && [0, 0.15, 0.3].map((d) => ca > d ? <mesh key={d} position={[cx, 0, 0.5]} scale={0.4 + (ca - d) * 6}><ringGeometry args={[0.92, 1, 40]} /><meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 0.8 - (ca - d) / 0.5)} /></mesh> : null)}
      {/* pull arrow */}
      {!mini && t >= PULL[0] && t < CRACK + 0.2 && <group position={[xr + 1.4 + 0.1 * Math.sin(t * 12), -1.15, 0.3]}>
        <Flat g={ribbon([[-0.5, 0], [0.3, 0]], () => 0.08)} c="#ffd23f" /><Flat g={blob([[0.25, 0.22], [0.6, 0], [0.25, -0.22]], 3)} c="#ffd23f" />
      </group>}
    </group>
  );
};
const Joint: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const tin = t - IN;
  return (
    <group>
      <Flat g={rrect(-9, -9, 9, 9, 0)} c="#4a2a5a" z={-6} />
      {Array.from({ length: 14 }, (_, i) => <Flat key={`fb${i}`} g={ribbon(curve([[-4, -2.5 + i * 0.45], [-1, -2.3 + i * 0.45 + 0.15 * Math.sin(i)], [4, -2.6 + i * 0.45]], 20), () => 0.035)} c={i % 2 ? "#7a4a6a" : "#5a2a9a"} z={-5.5} />)}
      <group scale={Math.max(0.001, backOut(tin / 0.5))}><JointX t={t} map={map} /></group>
    </group>
  );
};

// ================= hero + the 60-year experiment =================
const HAND_C: P2 = [0.05, -1.75];
const HS = 1.15;
const FINGER_OF = (i: number) => [1, 0, 2, 3, 1, 2, 0][i % 7];
const MOL_C: P2 = [0.4, 1.35];
const SHRINK = L[1];
const heroK = (t: number) => (t >= BACK ? 0 : ease((t - SHRINK) / 0.6));
const bubbleK = (t: number) => (t >= BACK ? 0 : backOut((t - SHRINK - 0.35) / 0.45));
const foldsFor = (t: number, evs: number[], fingerOf: (i: number) => number) => [0, 1, 2, 3].map((f) => foldEnv(t, evs.filter((_, i) => fingerOf(i) === f)));
const Backdrop: React.FC<{ t: number; map: THREE.Texture; c?: string }> = ({ t, map, c = "#ff8a1f" }) => {
  const k = beatK(t);
  return (
    <>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      <group position={[0, 0.3, -12]}>{Array.from({ length: 12 }, (_, i) => <Wedge key={`w${i}`} r={12} a0={2 * LW * t + (i * Math.PI) / 6} da={Math.PI / 12} c="#121a4a" z={0} />)}</group>
      {[5.3, 4.2, 3.3].map((r, i) => <Disc key={`h${i}`} at={[0, 0.3]} r={r * (1 + 0.025 * k * (i + 1))} c={["#121a4a", "#1c2a6e", "#2b3f99"][i]} z={-10 + i * 0.1} seg={56} />)}
      <Glow map={map} at={[0, 0.2, -2]} size={7} color={c} opacity={0.3 + 0.15 * k} />
    </>
  );
};
const Hero: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const hk = heroK(t), bk = bubbleK(t), fold = foldsFor(t, HOOKC, FINGER_OF);
  const sc = lerp(HS, 0.42, hk), cx = lerp(HAND_C[0], -1.5, hk), cy = lerp(HAND_C[1], -2.0, hk);
  const kn = knuckleOf([cx, cy], sc, 1);
  const tang = (deg: number): P2 => [MOL_C[0] + 2.0 * Math.cos((deg * Math.PI) / 180), MOL_C[1] + 2.0 * Math.sin((deg * Math.PI) / 180)];
  return (
    <group>
      <Backdrop t={t} map={map} />
      {bk > 0.01 && <group position={[MOL_C[0], MOL_C[1], 0]} scale={bk}><group position={[-MOL_C[0], -MOL_C[1], 0]}>
        {[200, 275].map((d, i) => <Flat key={`zl${i}`} g={ribbon([kn, tang(d)], () => 0.04)} c="#bfe6ff" z={-0.3} o={0.55} />)}
        <Disc at={MOL_C} r={2.0} c="#4a2a5a" z={-0.25} seg={64} />
        <mesh position={[MOL_C[0], MOL_C[1], -0.2]}><ringGeometry args={[1.96, 2.06, 64]} /><meshBasicMaterial color="#bfe6ff" /></mesh>
        <group position={[MOL_C[0] + 0.25, MOL_C[1], 0]} scale={0.8}><JointX t={t} map={map} mini /></group>
      </group></group>}
      <group position={[cx, cy, 0.3]} scale={sc}><Hand t={t} fold={fold} xray={hk > 0.5 && t < BACK} /></group>
      {HOOKC.map((c, i) => <Burst key={i} at={knuckleOf([cx, cy], sc, FINGER_OF(i))} age={t - c} s={0.85 * sc} map={map} />)}
    </group>
  );
};
const LH: P2 = [-1.25, -1.6], RH: P2 = [1.25, -1.6], SS = 0.6;
const Hands: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const you = t >= L[9];
  const cnt = COUNT.filter((_, i) => i % 2 === 0), cf = (i: number) => i % 4;
  return (
    <group>
      <Backdrop t={t} map={map} c={you ? "#ff4f8b" : "#3fcf6a"} />
      {!you ? <>
        <group position={[LH[0], LH[1], 0.3]} scale={SS}><Hand t={t} fold={foldsFor(t, cnt, cf)} mirror sleeve="#1fb5a8" /></group>
        <group position={[RH[0], RH[1], 0.3]} scale={SS}><Hand t={t} fold={[0, 0, 0, 0]} sleeve="#1fb5a8" /></group>
        {cnt.map((c, i) => <Burst key={i} at={knuckleOf(LH, SS, cf(i), true)} age={t - c} s={0.55} map={map} />)}
      </> : <>
        <group position={[HAND_C[0], HAND_C[1], 0.3]} scale={HS}><Hand t={t} fold={[0, Math.max(foldEnv(t, [YOUR]), foldEnv(t, [NOPE]) * 0.9), 0, 0]} /></group>
        <Burst at={knuckleOf(HAND_C, HS, 1)} age={t - YOUR} s={1.0} map={map} />
        {t >= NOPE && t - NOPE < 0.5 && <mesh position={[knuckleOf(HAND_C, HS, 1)[0], knuckleOf(HAND_C, HS, 1)[1], 0.6]} scale={0.6 + (t - NOPE) * 2}><ringGeometry args={[0.85, 1, 28]} /><meshBasicMaterial color="#ff3a2a" transparent opacity={1 - (t - NOPE) / 0.5} /></mesh>}
      </>}
    </group>
  );
};

// ================= tags, camera, labels, instruments =================
type Tag = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const HERO_TAGS: Tag[] = [{ txt: "X-RAY: YOUR KNUCKLE", at: [MOL_C[0], MOL_C[1] - 2.2, 0.5], from: SHRINK + 0.6, to: IN, col: "#bfe6ff" }];
const JOINT_TAGS: Tag[] = [
  { txt: "BONE", at: [-2.3, 0.75, 0.5], from: IN + 0.7, to: L[3], col: "#fff3b0" },
  { txt: "CARTILAGE", at: [-0.6, -0.95, 0.5], from: IN + 0.9, to: L[3], col: "#bfe6ff" },
  { txt: "JOINT FLUID", at: [0.1, 1.45, 0.5], from: IN + 1.1, to: L[4], col: "#6ee6cf" },
  { txt: "SEALED CAPSULE", at: [1.45, -1.55, 0.5], from: IN + 1.3, to: L[3] + 1, col: "#ff8a7a" },
  { txt: "DISSOLVED GAS", at: [-0.2, 0.6, 0.5], from: L[3] + 0.3, to: CRACK, col: "#bfe6ff" },
  { txt: "PULL", at: (t) => [0.08 + pullK(t) * 0.55 + 1.5, -1.55, 0.5], from: PULL[0] + 0.2, to: CRACK, col: "#ffd23f" },
  { txt: "BUBBLE", at: [0.22, 0.75, 0.5], from: CRACK + 0.5, to: OUT, col: "#ffffff" },
];
const HAND_TAGS: Tag[] = [
  { txt: "CRACKED DAILY", at: [LH[0], 0.95, 0.5], from: OUT + 0.6, to: L[8], col: "#ffd23f" },
  { txt: "NEVER", at: [RH[0], 0.95, 0.5], from: OUT + 0.9, to: L[8], col: "#9aa0b8" },
  { txt: "NO ARTHRITIS", at: [LH[0], 0.95, 0.5], from: L[8], to: L[9], col: "#3fcf6a" },
  { txt: "NO ARTHRITIS", at: [RH[0], 0.95, 0.5], from: L[8] + 0.3, to: L[9], col: "#3fcf6a" },
  { txt: "LOCKED: ~20 MIN", at: [HAND_C[0] - 0.25 * HS, HAND_C[1] + 2.75 * HS, 0.5], from: NOPE + 0.1, to: BACK, col: "#ff3a2a" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[] }> = ({ t, cam, tags }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 26, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.2, 29] as V3, l: [0, 0.2, 0] as V3 };
const at = (x: number, y: number, z: number) => ({ p: [x, y, z] as V3, l: [x, y, 0] as V3 });
const CAM_A: CamKey[] = [{ t: 0, ...HOME }, { t: SHRINK + 0.6, ...HOME }, { t: L[1] + BAR * 0.9, ...at(0.4, 1.0, 20) }, { t: IN - 0.35, ...at(0.4, 1.35, 6.5) }, { t: IN, ...at(0.4, 1.35, 1.4) }];
const CAM_J: CamKey[] = [
  { t: IN, ...at(0, 0, 6) }, { t: IN + 0.9, ...at(0.2, -0.3, 24) }, { t: PULL[0], ...at(0.2, -0.3, 24) },
  { t: CRACK - 0.1, ...at(0.3, -0.2, 18) }, { t: CRACK + 0.6, ...at(0.3, -0.2, 21) }, { t: L[6], ...at(0.3, -0.2, 22) },
  { t: OUT - 0.45, ...at(0.3, -0.2, 22) }, { t: OUT, ...at(0.3, 0, 2.5) },
];
const CAM_H: CamKey[] = [{ t: OUT, ...at(0, -0.4, 10) }, { t: OUT + 0.9, ...HOME }, { t: BACK - 0.4, ...HOME }, { t: BACK, ...HOME }, { t: D, ...HOME }];
const camFor = (t: number) => { const c = t < IN ? camAt(CAM_A, t) : t < OUT ? camAt(CAM_J, t) : camAt(CAM_H, t);
  const sh = t >= CRACK && t < CRACK + 0.3 ? 0.18 * (1 - (t - CRACK) / 0.3) * Math.sin(t * 90) : 0;
  return { p: [c.p[0] + sh, c.p[1] + sh * 0.6, c.p[2]] as V3, l: [c.l[0] + sh, c.l[1] + sh * 0.6, c.l[2]] as V3 }; };
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - IN) < 1 ? "#1fb5a8" : "#ff8a7a");

const TOPZ: [number, number] = [540, 360];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "THAT 'CRACK' ISN'T" }], [{ t: "YOUR BONES.", c: "#ffd23f" }], [{ t: "SO WHAT IS IT? 🤔" }]];
const LABELS: LabelDef[] = [
  Lb(0, SHRINK, "#ffd23f", HOOK, true),
  Lb(SHRINK, IN + 0.3, "#bfe6ff", [[{ t: "IT COMES FROM THE" }], [{ t: "GAP BETWEEN", c: "#6ee6cf" }], [{ t: "TWO BONES" }]]),
  Lb(IN + 0.3, L[3], "#6ee6cf", [[{ t: "THE GAP IS A SEALED" }], [{ t: "BAG OF SLIPPERY", c: "#6ee6cf" }], [{ t: "JOINT FLUID" }]]),
  Lb(L[3], CRACK, "#ffd23f", [[{ t: "PULL THE FINGER:" }], [{ t: "BAG STRETCHES,", c: "#ffd23f" }], [{ t: "PRESSURE DROPS" }]]),
  Lb(CRACK, L[5], "#ffffff", [[{ t: "GAS IN THE FLUID" }], [{ t: "RIPS OUT INTO", c: "#bfe6ff" }], [{ t: "A BUBBLE. CRACK!" }]]),
  Lb(L[5], L[6], "#bfe6ff", [[{ t: "THE SOUND IS THE" }], [{ t: "BUBBLE BEING", c: "#bfe6ff" }], [{ t: "BORN (MRI, 2015)" }]]),
  Lb(L[6], OUT, "#ff8a7a", [[{ t: "THE GAS NEEDS ~20" }], [{ t: "MIN TO DISSOLVE:", c: "#ff8a7a" }], [{ t: "NO 2ND CRACK" }]]),
  Lb(OUT, L[8], "#ffd23f", [[{ t: "ARTHRITIS? ONE" }], [{ t: "DOCTOR CRACKED", c: "#ffd23f" }], [{ t: "ONE HAND, 60 YRS" }]]),
  Lb(L[8], L[9], "#3fcf6a", [[{ t: "BOTH HANDS: FINE." }], [{ t: "NO ARTHRITIS,", c: "#3fcf6a" }], [{ t: "IG NOBEL 2009 🏆" }]]),
  Lb(L[9], BACK, "#ff4f8b", [[{ t: "YOUR TURN: CRACK" }], [{ t: "ONE. NOW TRY IT", c: "#ff4f8b" }], [{ t: "AGAIN 😏" }]]),
  Lb(BACK, D + 0.01, "#ffd23f", HOOK, true),
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
const Panel: React.FC<{ t: number }> = ({ t }) => {
  const s = scene(t);
  if (s === "joint" && t >= IN + 0.8) {
    const p = t < PULL[0] ? 1 : t < CRACK ? 1 - 0.8 * ease((t - PULL[0]) / (CRACK - PULL[0])) : 0.2 + 0.6 * ease((t - CRACK) / 0.6);
    const W = 600, H = 70, pts = Array.from({ length: 121 }, (_, i) => { const tt = t - 2.5 + (i / 120) * 2.5, a = tt - CRACK; const amp = a >= 0 && a < 0.25 ? Math.exp(-a / 0.05) * Math.sin(a * 900) : 0.04 * Math.sin(tt * 37 + Math.sin(tt * 11)); return `${(i / 120) * W},${H / 2 - amp * H * 0.48}`; }).join(" ");
    const wait = t >= L[6], rec = wait ? clamp01((t - L[6]) / (OUT - L[6] - 0.3)) : 0;
    return (
      <div style={{ position: "absolute", left: 540, top: 1540, transform: "translate(-50%, -50%)", width: 960, background: "rgba(9,13,43,0.95)", border: "8px solid #ffffff", boxShadow: "8px 8px 0 #05060f", padding: "20px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ ...px, fontSize: 24, width: 260, color: "#6ee6cf" }}>{wait ? "RECHARGE" : "PRESSURE"}</div>
          <div style={{ flex: 1, height: 34, background: "#05060f", border: "4px solid #05060f" }}><div style={{ width: `${(wait ? rec : p) * 100}%`, height: "100%", background: wait ? "#ff8a7a" : p < 0.4 ? "#ff3a2a" : "#6ee6cf" }} /></div>
          <div style={{ ...px, fontSize: 24, width: 140, textAlign: "right" }}>{wait ? `${Math.round(rec * 20)} MIN` : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ ...px, fontSize: 24, width: 260, color: "#ffd23f" }}>SOUND</div>
          <svg width={W} height={H} style={{ background: "#05060f" }}><polyline points={pts} fill="none" stroke="#ffd23f" strokeWidth={4} /></svg>
        </div>
      </div>
    );
  }
  if (s === "hands" && t >= OUT + 0.6 && t < L[9]) {
    const n = COUNT.filter((c) => t >= c).length, v = Math.round((36500 * n) / COUNT.length);
    return (
      <div style={{ position: "absolute", left: 540, top: 1560, transform: "translate(-50%, -50%)", width: 960, background: "rgba(9,13,43,0.95)", border: "8px solid #ffd23f", boxShadow: "8px 8px 0 #05060f", padding: "22px 24px 16px", textAlign: "center" }}>
        <div style={{ ...px, fontSize: 24, color: "#9aa0b8", marginBottom: 14 }}>LEFT-HAND CRACKS, 60 YEARS</div>
        <div style={{ ...px, fontSize: 56, color: "#ffd23f" }}>{v.toLocaleString("en-US")}</div>
      </div>
    );
  }
  return null;
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const KnucklesVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  const flash = t >= CRACK && t < CRACK + 0.18 ? 1 - (t - CRACK) / 0.18 : 0;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/25-knuckles/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={KN_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "hero" ? <Hero t={t} map={glow} /> : s === "joint" ? <Joint t={t} map={glow} /> : <Hands t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash * 0.45 }} />
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ffd23f" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} tags={s === "hero" ? HERO_TAGS : s === "joint" ? JOINT_TAGS : HAND_TAGS} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
      <Panel t={t} />
    </AbsoluteFill>
  );
};
