/**
 * Video 024 · How does a weekly shot switch off hunger? (semaglutide: Ozempic / Wegovy) — LSD-look explainer for adults:
 * colourful Kurzgesagt-flat pixel drawing, no mascots, dry copy, step-by-step cause → effect, an instrument panel.
 * Facts: GLP-1 is a gut hormone released by intestinal L-cells after a meal; it signals fullness to the brain, slows
 * stomach emptying and boosts insulin when sugar is high. Native GLP-1 is cut by the enzyme DPP-4 within ~2 minutes.
 * Semaglutide is a 31-amino-acid GLP-1 copy with one swapped link (resists DPP-4) and a fatty-acid tail that binds the
 * blood protein albumin → half-life ≈ 1 week (~165 h, roughly 5,000x longer) → one injection a week. STEP 1 trial
 * (2.4 mg, 68 weeks ≈ 16 months): −14.9 % body weight vs −2.4 % placebo; after stopping, about two thirds is regained
 * within a year. Common side effects: nausea, vomiting, diarrhoea. Explainer only, not medical advice.
 * 45.6 s loop, 100 BPM amapiano-flavoured groove (ozempic.json + music.wav from videos/24-ozempic/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./ozempic.json";
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
const L = EV.l as number[], IN = EV.in, OUT = EV.out, BACK = EV.back;
const RELEASE = EV.release as number[], BITES = EV.bites as number[], DRUGS = EV.drugs as number[], BOUNCE = EV.bounce as number[];
const FADE = 0.3;

export const OZ_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#9aa0b8", "#5a607a", "#3a3f5a",
];
const BG = "#090d2b";
const scene = (t: number) => (t < IN || t >= BACK ? "hero" : t < OUT ? "blood" : "body");
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));

// ================= the molecule: a chain of amino-acid links (+ the drug's swapped link and fatty tail) =================
const Chain: React.FC<{ n: number; len: number; amp: number; waves: number; r: number; t: number; drug?: boolean; grey?: number; tailAt?: number }> = ({ n, len, amp, waves, r, t, drug, grey = 0, tailAt }) => {
  const pts: P2[] = Array.from({ length: n }, (_, i) => { const u = i / (n - 1); return [-len / 2 + len * u, amp * Math.sin(u * Math.PI * 2 * waves + 2 * t)]; });
  const ti = tailAt ?? Math.floor(n * 0.62), tp = pts[ti];
  return (
    <group>
      <Flat g={ribbon(pts, () => r * 0.7)} c={grey > 0.5 ? "#5a607a" : "#c8a010"} z={-0.002} />
      {drug && <Flat g={ribbon([tp, [tp[0] + r * 1.5, tp[1] - r * 3], [tp[0], tp[1] - r * 6], [tp[0] + r * 1.5, tp[1] - r * 9], [tp[0], tp[1] - r * 12]], () => r * 0.55)} c="#1fb5a8" z={-0.003} />}
      {pts.map((p, i) => <React.Fragment key={i}>
        <Disc at={p} r={r} c={grey > 0.5 ? "#9aa0b8" : drug && i === 1 ? "#ff4f8b" : "#ffd23f"} seg={14} />
        <Disc at={[p[0] - r * 0.3, p[1] + r * 0.3]} r={r * 0.3} c="#ffffff" z={0.001} o={0.7} seg={8} />
      </React.Fragment>)}
    </group>
  );
};

// ================= HOOK: the injection pen =================
const MOL_C: P2 = [0.3, 1.0], PEN_C: P2 = [0.1, -0.35], PEN_SMALL: P2 = [-1.5, -2.6];
const SHRINK = L[1];
const heroK = (t: number) => (t >= BACK ? 0 : ease((t - SHRINK) / 0.6));
const bubbleK = (t: number) => (t >= BACK ? 0 : backOut((t - SHRINK - 0.35) / 0.45));
const Pen: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const drop = (t % (BAR / 2)) / (BAR / 2);
  return (
    <group>
      {/* dose button + dial */}
      <Flat g={rrect(-0.26, 2.55, 0.26, 2.85, 0.1)} c="#1fb5a8" z={-0.01} />
      <Flat g={rrect(-0.38, 1.95, 0.38, 2.6, 0.1)} c="#9aa0b8" />
      {[-0.24, -0.08, 0.08, 0.24].map((x, i) => <Flat key={i} g={rrect(x - 0.025, 2.02, x + 0.025, 2.53, 0)} c="#5a607a" z={0.001} />)}
      {/* body + dose window */}
      <Flat g={rrect(-0.44, -1.1, 0.44, 2.0, 0.2)} c="#1f4abf" />
      <Flat g={rrect(-0.44, -1.1, -0.2, 2.0, 0.12)} c="#4a9aff" z={0.001} />
      <Flat g={rrect(0.24, -0.9, 0.44, 1.8, 0.1)} c="#1c2a6e" z={0.001} />
      <Flat g={rrect(-0.22, 1.0, 0.22, 1.5, 0.06)} c="#ffffff" z={0.002} />
      {[1.12, 1.25, 1.38].map((y, i) => <Flat key={i} g={rrect(-0.12, y - 0.02, i === 1 ? 0.14 : 0.04, y + 0.02, 0)} c="#05060f" z={0.003} />)}
      <Flat g={rrect(-0.3, -0.6, 0.3, 0.6, 0.08)} c="#bfe6ff" z={0.002} />
      <Flat g={rrect(-0.3, -0.6, 0.3, 0.1, 0.08)} c="#6ee6cf" z={0.003} />
      {/* cartridge holder, hub, needle, drop */}
      <Flat g={rrect(-0.33, -2.15, 0.33, -1.1, 0.1)} c="#c8cdf0" z={-0.001} />
      <Flat g={rrect(-0.24, -2.05, 0.24, -1.2, 0.06)} c="#ffffff" z={0.001} />
      {[-1.9, -1.65, -1.4].map((y, i) => <Flat key={i} g={rrect(-0.24, y, -0.1, y + 0.03, 0)} c="#7a88d6" z={0.002} />)}
      <Flat g={blob([[-0.2, -2.15], [0.2, -2.15], [0.09, -2.45], [-0.09, -2.45]], 4)} c="#9aa0b8" />
      <Flat g={ribbon([[0, -2.45], [0, -3.15]], () => 0.028)} c="#c8cdf0" />
      <group position={[0, -3.2 - 0.1 * ease(drop), 0.01]} scale={0.4 + 0.6 * ease(drop * 1.3)}><Flat g={blob([[0, 0.13], [0.1, -0.05], [0, -0.13], [-0.1, -0.05]], 16)} c="#6ee6cf" /></group>
      <Glow map={map} at={[0, -3.25, 0.05]} size={1.0 + 0.4 * beatK(t)} color="#6ee6cf" opacity={0.7} />
    </group>
  );
};
const Hero: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = heroK(t), bk = bubbleK(t), kk = beatK(t);
  const sc = lerp(0.88, 0.3, k), cx = lerp(PEN_C[0], PEN_SMALL[0], k), cy = lerp(PEN_C[1], PEN_SMALL[1], k), rot = lerp(-0.45 + 0.04 * Math.sin(2 * LW * t), -0.35, k);
  const tip: P2 = [cx + 3.25 * sc * Math.sin(rot), cy - 3.25 * sc * Math.cos(rot)];
  const tang = (deg: number): P2 => [MOL_C[0] + 2.2 * Math.cos((deg * Math.PI) / 180), MOL_C[1] + 2.2 * Math.sin((deg * Math.PI) / 180)];
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      {[5.4, 4.3, 3.3].map((r, i) => <Disc key={`h${i}`} at={[0, 0.5]} r={r * (1 + 0.025 * kk * (i + 1))} c={["#121a4a", "#1c2a6e", "#2b3f99"][i]} z={-10 + i * 0.1} seg={56} />)}
      {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2 + 2 * LW * t, r = 2.9 + 0.2 * Math.sin(3 * LW * t + i); return <Disc key={`b${i}`} at={[Math.cos(a) * r, 0.5 + Math.sin(a) * r]} r={0.06 + 0.03 * (i % 3)} c={i % 3 ? "#6ee6cf" : "#ffd23f"} z={-5} seg={8} />; })}
      <Glow map={map} at={[0, 0.3, -2]} size={7} color="#1fb5a8" opacity={0.35 + 0.15 * kk} />
      {bk > 0.01 && <group position={[MOL_C[0], MOL_C[1], 0]} scale={bk}><group position={[-MOL_C[0], -MOL_C[1], 0]}>
        {[205, 285].map((d, i) => <Flat key={`zl${i}`} g={ribbon([tip, tang(d)], () => 0.04)} c="#bfe6ff" z={-0.3} o={0.55} />)}
        <Disc at={MOL_C} r={2.2} c="#1c2a6e" z={-0.25} o={0.9} seg={64} />
        <mesh position={[MOL_C[0], MOL_C[1], -0.2]}><ringGeometry args={[2.16, 2.26, 64]} /><meshBasicMaterial color="#bfe6ff" /></mesh>
        <Glow map={map} at={[MOL_C[0], MOL_C[1], -0.15]} size={4.2} color="#ffd23f" opacity={0.25 + 0.12 * kk} />
        <group position={[MOL_C[0], MOL_C[1] + 0.55, 0]} rotation={[0, 0, 0.08 * Math.sin(2 * LW * t)]} scale={1 + 0.03 * kk}><Chain n={31} len={3.4} amp={0.42} waves={1.5} r={0.085} t={0} drug tailAt={19} /></group>
      </group></group>}
      <group position={[cx, cy, 0.3]} rotation={[0, 0, rot]} scale={sc * (1 + 0.03 * kk)}><Pen t={t} map={map} /></group>
    </group>
  );
};

// ================= inside: gut wall + bloodstream =================
const VY0 = -1.45, VY1 = 1.65, LCELLS = [-1.35, 1.25];
const CELLX = Array.from({ length: 11 }, (_, i) => -3.6 + i * 0.72);
const chainPos = (i: number, t: number): P2 | null => {
  const a = t - RELEASE[i]; if (a < 0) return null;
  const cx = LCELLS[i % 2], y1 = -0.75 + 1.7 * rnd(i + 11);
  if (a < 0.6) return [cx + 0.2 * Math.sin(a * 6), lerp(VY0 - 0.35, y1, ease(a / 0.6))];
  return [cx + (a - 0.6) * 0.22 + 0.15 * Math.sin(a * 2 + i), y1 + 0.18 * Math.sin(a * 1.7 + i * 2)];
};
const DRUG_SLOT: P2[] = [[-1.5, 0.75], [0.9, 0.95], [-0.35, -0.35], [1.75, -0.45]];
const drugPos = (k: number, t: number): P2 | null => {
  const a = t - DRUGS[k]; if (a < -0.6) return null;
  const s = DRUG_SLOT[k], u = ease((a + 0.6) / 0.9);
  return [lerp(-4.2, s[0], u) + 0.12 * Math.sin(t * 1.3 + k), s[1] + 0.12 * Math.sin(t * 1.1 + k * 2)];
};
const ENZ_HOME: P2[] = [[2.3, 0.9], [-2.4, -0.6], [2.5, -0.9], [-2.2, 1.1], [0.3, 1.2], [0.2, -1.0]];
/** enzyme k lunges at its target on its event and comes back */
const enzPos = (k: number, t: number): { p: P2; bite: number } => {
  const home: P2 = [ENZ_HOME[k][0] + 0.15 * Math.sin(t * 1.4 + k), ENZ_HOME[k][1] + 0.12 * Math.cos(t * 1.2 + k * 2)];
  const lunge = (ev: number, target: P2 | null) => { if (!target) return null; const a = t - ev; if (a < -0.45 || a > 0.6) return null; const u = a < 0 ? ease((a + 0.45) / 0.45) : 1 - ease(a / 0.6); return { p: [lerp(home[0], target[0] - 0.3, u), lerp(home[1], target[1], u)] as P2, bite: a >= 0 ? Math.exp(-a / 0.12) : 0 }; };
  return lunge(BITES[k], chainPos(k, Math.min(t, BITES[k]))) ?? lunge(BOUNCE[k], drugPos(k % 4, t)) ?? { p: home, bite: 0 };
};
const Blood: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const tin = t - IN, pop = (d: number) => Math.max(0.001, backOut((tin - d) / 0.35));
  return (
    <group>
      <Flat g={rrect(-9, -9, 9, 9, 0)} c="#4a2a5a" z={-6} />
      {/* the vessel */}
      <Flat g={rrect(-9, VY0, 9, VY1, 0)} c="#8a1414" z={-5} />
      {Array.from({ length: 9 }, (_, i) => <Flat key={`fl${i}`} g={rrect(-0.7, -0.02, 0.7, 0.02, 0.02)} c="#d94a7a" p={[-4 + ((i * 1.31 + t * 0.5) % 8), VY0 + 0.3 + (i * 0.37) % 2.6]} z={-4.9} o={0.7} />)}
      {Array.from({ length: 9 }, (_, i) => { const x = -4.2 + ((i * 1.07 + t * (0.3 + 0.05 * (i % 3))) % 8.4), y = VY0 + 0.4 + ((i * 0.83) % 2.3); return (
        <group key={`rb${i}`} position={[x, y + 0.08 * Math.sin(t * 1.5 + i), -4]} rotation={[0, 0, 0.4 * Math.sin(t + i)]} scale={[1, 0.62, 1]}><Disc at={[0, 0]} r={0.3} c="#ff3a2a" seg={20} /><Disc at={[0, 0]} r={0.14} c="#d94a7a" z={0.001} seg={14} /></group>); })}
      <Flat g={rrect(-9, VY1, 9, VY1 + 0.22, 0)} c="#7a4a6a" z={-3} /><Flat g={rrect(-9, VY0 - 0.22, 9, VY0, 0)} c="#7a4a6a" z={-3} />
      {/* gut wall: ordinary cells + two hormone-making L-cells, the gut contents below */}
      <Flat g={rrect(-9, -9, 9, -3.25, 0)} c="#7a4a6a" z={-3.5} />
      {Array.from({ length: 8 }, (_, i) => <Disc key={`fd${i}`} at={[-4 + ((i * 1.2 + t * 0.35) % 8), -3.55 - (i % 3) * 0.22]} r={0.1 + 0.05 * (i % 2)} c={["#ff8a1f", "#3fcf6a", "#c85a10"][i % 3]} z={-3.4} seg={8} />)}
      {CELLX.map((x, i) => { const li = LCELLS.findIndex((lx) => Math.abs(lx - x) < 0.37), isL = li >= 0; const rel = isL ? RELEASE.filter((r, j) => j % 2 === li && t >= r && t - r < 0.3).length > 0 : false; return (
        <group key={`ce${i}`} position={[x, -2.45, -3]} scale={[1, pop(0.1 + i * 0.03) * (rel ? 1.08 : 1), 1]}>
          <Flat g={rrect(-0.33, -0.8, 0.33, 0.75, 0.16)} c={isL ? "#1fb5a8" : "#ffb3c9"} />
          <Disc at={[0, -0.25]} r={0.15} c={isL ? "#0f6e6a" : "#ff8a7a"} z={0.001} seg={12} />
          {isL && [[-0.12, 0.35], [0.1, 0.5], [0.02, 0.2]].map((p, j) => <Disc key={j} at={p as P2} r={0.06} c="#ffd23f" z={0.002} seg={8} />)}
        </group>); })}
      {/* GLP-1 chains: released, drifting, then shredded */}
      {RELEASE.map((r, i) => { const p = chainPos(i, Math.min(t, BITES[i] + 0.0)); if (!p) return null; const cut = t - BITES[i];
        if (cut >= 0) { if (cut > 1.0) return null; return (
          <group key={`gl${i}`}>{[-1, 1].map((sd) => <group key={sd} position={[p[0] + sd * (0.12 + cut * 0.5), p[1] + sd * cut * 0.35 - cut * cut * 0.4, 0.2]} rotation={[0, 0, sd * cut * 2]} scale={1 - cut * 0.5}><Chain n={3} len={0.26} amp={0.03} waves={1} r={0.085} t={t} grey={1} /></group>)}</group>); }
        return <group key={`gl${i}`} position={[p[0], p[1], 0.2]}><Chain n={6} len={0.75} amp={0.07} waves={1} r={0.085} t={t * 2 + i} />{t - r < 0.4 && <Glow map={map} at={[0, 0, 0.1]} size={1.1} color="#ffd23f" opacity={1 - (t - r) / 0.4} />}</group>; })}
      {/* the drug: same chain, one swapped link, a fatty tail riding a big blood protein (albumin) */}
      {DRUGS.map((_, k) => { const p = drugPos(k, t); if (!p) return null; return (
        <group key={`dg${k}`} position={[p[0], p[1], 0.25]}>
          <group position={[0.27, -0.72, -0.01]} rotation={[0, 0, 0.3 * Math.sin(t * 0.8 + k)]}><Flat g={blob([[-0.5, 0.05], [-0.2, 0.42], [0.3, 0.36], [0.52, -0.05], [0.2, -0.4], [-0.3, -0.36]], 24)} c="#fff3b0" /><Flat g={blob([[-0.1, 0.0], [0.2, 0.15], [0.3, -0.12], [0.0, -0.22]], 12)} c="#ffbf6a" z={0.001} /></group>
          <Chain n={6} len={0.75} amp={0.06} waves={1} r={0.085} t={t * 1.5 + k} drug tailAt={4} />
        </group>); })}
      {/* enzymes (DPP-4): a clamp that cuts chains… and slips off the protected drug */}
      {ENZ_HOME.map((_, k) => { if (tin < 0.9) return null; const e = enzPos(k, t), open = 0.5 + 0.35 * Math.sin(t * 5 + k) - 0.45 * e.bite; return (
        <group key={`en${k}`} position={[e.p[0], e.p[1], 0.3]} scale={pop(0.9 + k * 0.05) * (1 + 0.25 * e.bite)}>
          <mesh rotation={[0, 0, open / 2]}><circleGeometry args={[0.27, 20, 0, Math.PI * 2 - open]} /><meshBasicMaterial color="#7a4dff" /></mesh>
          <mesh rotation={[0, 0, open / 2]} position={[0, 0, 0.001]}><circleGeometry args={[0.15, 16, 0, Math.PI * 2 - open]} /><meshBasicMaterial color="#b48cff" /></mesh>
          {e.bite > 0.05 && <Glow map={map} at={[0.3, 0, 0.1]} size={1.3} color={t >= BOUNCE[0] ? "#ffffff" : "#ff4f8b"} opacity={e.bite} />}
        </group>); })}
      {BOUNCE.map((bt2, k) => { const a = t - bt2, p = drugPos(k % 4, t); if (a < 0 || a > 0.4 || !p) return null; return <mesh key={`sh${k}`} position={[p[0], p[1], 0.35]} scale={0.5 + a * 2}><ringGeometry args={[0.86, 1, 28]} /><meshBasicMaterial color="#6ee6cf" transparent opacity={1 - a / 0.4} /></mesh>; })}
    </group>
  );
};

// ================= tags, camera, labels, instrument =================
type Tag = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const HERO_TAGS: Tag[] = [
  { txt: "SEMAGLUTIDE", at: [-0.75, -0.2, 0.5], from: 0, to: SHRINK, col: "#6ee6cf" },
  { txt: "SEMAGLUTIDE", at: [-0.75, -0.2, 0.5], from: BACK + 0.3, to: D + 1, col: "#6ee6cf" },
  { txt: "31 LINKS + A FATTY TAIL", at: [MOL_C[0], MOL_C[1] - 2.35, 0.5], from: SHRINK + 0.6, to: IN, col: "#ffd23f" },
];
const BLOOD_TAGS: Tag[] = [
  { txt: "GUT WALL", at: [-2.0, -1.55, 0.5], from: IN + 0.8, to: L[3], col: "#ffb3c9" },
  { txt: "BLOOD", at: [1.9, 1.15, 0.5], from: IN + 1.0, to: L[3], col: "#ff8a7a" },
  { txt: "GLP-1", at: (t) => { const p = chainPos(0, t) ?? [0, 0]; return [p[0], p[1] + 0.25, 0.5]; }, from: RELEASE[0] + 0.3, to: BITES[0], col: "#ffd23f" },
  { txt: "ENZYME (DPP-4)", at: (t) => { const e = enzPos(1, t); return [Math.max(-1.0, Math.min(1.0, e.p[0])), e.p[1] + 0.4, 0.5]; }, from: L[3] + 0.2, to: L[4], col: "#b48cff" },
  { txt: "FATTY TAIL", at: (t) => { const p = drugPos(0, t) ?? [0, 0]; return [Math.max(-1.6, p[0] - 0.4), p[1] + 0.3, 0.5]; }, from: DRUGS[0] + 0.5, to: L[5], col: "#6ee6cf" },
  { txt: "BLOOD PROTEIN (ALBUMIN)", at: (t) => { const p = drugPos(1, t) ?? [0, 0]; return [Math.min(0.9, p[0] + 0.2), p[1] - 1.15, 0.5]; }, from: DRUGS[1] + 0.6, to: L[5], col: "#fff3b0" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[] }> = ({ t, cam, tags }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = g.from === 0 ? (t > g.to - 0.2 ? clamp01((g.to - t) / 0.2) : 1) : backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 26, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.5, 29] as V3, l: [0, 0.5, 0] as V3 };
const at = (x: number, y: number, z: number) => ({ p: [x, y, z] as V3, l: [x, y, 0] as V3 });
const CAM_A: CamKey[] = [{ t: 0, ...HOME }, { t: SHRINK + 0.6, ...HOME }, { t: L[1] + BAR * 0.9, ...at(0.3, 0.9, 21) }, { t: IN - 0.35, ...at(0.3, 1.4, 7) }, { t: IN, ...at(0.3, 1.5, 1.6) }];
const CAM_B: CamKey[] = [
  { t: IN, ...at(0, -0.6, 6) }, { t: IN + 0.9, ...at(0, -1.0, 27) }, { t: L[3] - 0.2, ...at(0, -1.0, 27) },
  { t: L[3] + 0.9, ...at(0.1, -0.3, 22) }, { t: L[4], ...at(0.1, -0.3, 22) }, { t: L[4] + 1.0, ...at(-0.2, -0.2, 23) },
  { t: L[5] + 0.8, ...at(0, -0.5, 25) }, { t: OUT - 0.5, ...at(0, -0.5, 24) }, { t: OUT, ...at(0, 0.2, 2.5) },
];
const CAM_H: CamKey[] = [{ t: BACK, p: [0, 0.5, 32], l: [0, 0.5, 0] }, { t: BACK + 0.8, ...HOME }, { t: D, ...HOME }];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : t < BACK ? camAt(CAM_B, Math.min(t, OUT)) : camAt(CAM_H, t));
const diveAt = (t: number) => Math.max(...[IN, OUT, BACK].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - IN) < 1 ? "#ffd23f" : "#d94a7a");

const TOPZ: [number, number] = [540, 400];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "ONE SHOT A WEEK" }], [{ t: "SWITCHES OFF", c: "#6ee6cf" }], [{ t: "YOUR HUNGER. HOW?" }]];
const LABELS: LabelDef[] = [
  Lb(0, L[1], "#6ee6cf", HOOK, true),
  Lb(L[1], IN + 0.3, "#ffd23f", [[{ t: "IT'S A COPY OF GLP-1," }], [{ t: "A HORMONE YOUR", c: "#ffd23f" }], [{ t: "GUT MAKES ITSELF", c: "#ffd23f" }]]),
  Lb(IN + 0.3, L[3], "#ffd23f", [[{ t: "YOU EAT → YOUR GUT" }], [{ t: "RELEASES GLP-1:", c: "#ffd23f" }], [{ t: "'I'M FULL'" }]]),
  Lb(L[3], L[4], "#b48cff", [[{ t: "BUT ENZYMES SHRED" }], [{ t: "IT IN ABOUT", c: "#b48cff" }], [{ t: "2 MINUTES" }]]),
  Lb(L[4], L[5], "#6ee6cf", [[{ t: "THE DRUG: SAME KEY," }], [{ t: "+ A FATTY TAIL", c: "#6ee6cf" }], [{ t: "THAT HIDES IT" }]]),
  Lb(L[5], OUT, "#6ee6cf", [[{ t: "NOW IT LASTS" }], [{ t: "A WEEK:", c: "#6ee6cf" }], [{ t: "5,000X LONGER" }]]),
  Lb(OUT, L[7], "#ff8a7a", [[{ t: "IN THE BRAIN, THE" }], [{ t: "'FULL' SIGNAL", c: "#ffd23f" }], [{ t: "NEVER TURNS OFF" }]]),
  Lb(L[7], L[8], "#ffbf6a", [[{ t: "AND THE STOMACH" }], [{ t: "EMPTIES SLOWER:", c: "#ffbf6a" }], [{ t: "FULL ON LESS" }]]),
  Lb(L[8], L[9], "#3fcf6a", [[{ t: "IN TRIALS: ABOUT" }], [{ t: "15% OF BODY", c: "#3fcf6a" }], [{ t: "WEIGHT, 16 MONTHS" }]]),
  Lb(L[9], BACK, "#ff3a2a", [[{ t: "STOP THE SHOTS:" }], [{ t: "MOST OF IT", c: "#ff8a7a" }], [{ t: "COMES BACK", c: "#ff8a7a" }]]),
  Lb(BACK, D + 0.01, "#6ee6cf", HOOK, true),
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
/** instrument: how long each molecule survives in the blood */
const Survival: React.FC<{ t: number }> = ({ t }) => {
  if (t < L[3] + 0.4 || t >= OUT - 0.2) return null;
  const k = t > OUT - 0.5 ? clamp01((OUT - 0.2 - t) / 0.3) : backOut((t - L[3] - 0.4) / 0.3);
  const drug = t >= L[5], w = drug ? ease((t - L[5]) / 1.2) : 0;
  return (
    <div style={{ position: "absolute", left: 540, top: 1520, transform: `translate(-50%, -50%) scale(${k})`, width: 960, background: "rgba(9,13,43,0.95)", border: "8px solid #ffffff", boxShadow: "8px 8px 0 #05060f", padding: "20px 24px 14px" }}>
      <div style={{ ...px, fontSize: 24, color: "#9aa0b8", marginBottom: 16 }}>TIME IT SURVIVES IN YOUR BLOOD</div>
      {[{ n: "YOUR GLP-1", v: "2 MIN", c: "#ffd23f", w: 0.012 }, { n: "THE DRUG", v: drug ? "7 DAYS" : "?", c: "#6ee6cf", w }].map((r) => (
        <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <div style={{ ...px, fontSize: 24, width: 250, color: r.c }}>{r.n}</div>
          <div style={{ flex: 1, height: 34, background: "#05060f", border: "4px solid #05060f" }}><div style={{ width: `${Math.max(1.2, r.w * 100)}%`, height: "100%", background: r.c }} /></div>
          <div style={{ ...px, fontSize: 26, width: 170, textAlign: "right" }}>{r.v}</div>
        </div>))}
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const OzempicVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/24-ozempic/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={OZ_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "hero" ? <Hero t={t} map={glow} /> : <Blood t={Math.min(t, OUT)} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#6ee6cf" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} tags={s === "hero" ? HERO_TAGS : s === "blood" ? BLOOD_TAGS : []} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
      <Survival t={t} />
    </AbsoluteFill>
  );
};
