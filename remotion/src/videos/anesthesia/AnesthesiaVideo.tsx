/**
 * Video 017 · How does anesthesia switch you off? — LSD-style explainer (Kurzgesagt flat drawing through the pixel
 * pipeline, step-by-step cause → effect labels, infographic instruments: a neuron voltage trace with a firing threshold,
 * an EEG monitor, thalamus–cortex links). 40 s loop, 96 BPM lo-fi / neo-soul (anesthesia.json + music.wav from
 * videos/17-anesthesia/build.py); the music itself goes under (low-pass) with the patient and drops back on waking.
 * Facts: propofol (2,6-diisopropylphenol, C12H18O), nicknamed "milk of amnesia", the most used IV anesthetic, loss of
 * consciousness within ~30 s; it potentiates GABA-A receptors (binds in the transmembrane domain), keeping the chloride
 * channel open → Cl- influx hyperpolarizes the neuron below threshold; EEG: fast low-amplitude activity → large slow
 * oscillations + frontal alpha (Purdon et al. PNAS 2013); thalamocortical connectivity breaks down; general anesthesia
 * is not sleep but a drug-induced reversible coma (Brown, Lydic & Schiff, NEJM 2010); stopping the infusion → the drug
 * redistributes/is cleared and patients wake within minutes.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./anesthesia.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";
import { BRAIN, SHADE, CEREB, STEM, RIM, FOLDS, CB_FOLDS, STARS } from "../lsd/LsdVideo";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;

export const ANES_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#9aa0b8", "#5a607a", "#3a3f5a",
];
const BG = "#090d2b";

// ---------------- timing ----------------
const IN = b(3), OUT = b(9), BACK = b(15), FADE = 0.3;
const scene = (t: number) => (t < IN || t >= BACK ? "hero" : t < OUT ? "syn" : "brain");
const beatK = (t: number) => Math.exp(-((t % (BAR / 4)) / (BAR / 4)) * 6);
const under = (t: number) => t >= b(9.5) && t < b(14);

// ================= ball-and-stick propofol (2,6-diisopropylphenol) =================
type Atom = { p: P2; e: "C" | "O" | "H" };
const PROP = (() => {
  const r = 0.5, v = (d: number): P2 => [r * Math.cos((d * Math.PI) / 180), r * Math.sin((d * Math.PI) / 180)];
  const ring = [90, 150, 210, 270, 330, 30].map(v);
  const atoms: Atom[] = ring.map((p) => ({ p, e: "C" as const }));
  const bonds: [P2, P2][] = ring.map((p, i) => [p, ring[(i + 1) % 6]]);
  const out = (p: P2, d: number, l: number): P2 => [p[0] + l * Math.cos((d * Math.PI) / 180), p[1] + l * Math.sin((d * Math.PI) / 180)];
  const O = out(ring[0], 90, 0.45), H = out(O, 35, 0.3);
  atoms.push({ p: O, e: "O" }, { p: H, e: "H" }); bonds.push([ring[0], O], [O, H]);
  for (const [i, d] of [[1, 150], [5, 30]] as [number, number][]) {
    const ch = out(ring[i], d, 0.45), m1 = out(ch, d + 55, 0.42), m2 = out(ch, d - 55, 0.42);
    atoms.push({ p: ch, e: "C" }, { p: m1, e: "C" }, { p: m2, e: "C" }); bonds.push([ring[i], ch], [ch, m1], [ch, m2]);
  }
  const inner: [P2, P2][] = [[0, 1], [2, 3], [4, 5]].map(([a, c]) => [[ring[a][0] * 0.72, ring[a][1] * 0.72], [ring[c][0] * 0.72, ring[c][1] * 0.72]]);
  return { atoms, bonds: [...bonds, ...inner] };
})();
const ECOL = { C: ["#7a88d6", "#c8cdf0"], O: ["#8a1414", "#ff3a2a"], H: ["#9aa0b8", "#ffffff"] };
const Propofol: React.FC<{ t: number; s?: number }> = ({ t, s = 1 }) => {
  const k = beatK(t);
  const sticks = useMemo(() => PROP.bonds.map(([a, c]) => ribbon([a, c], () => 0.08)), []);
  return (
    <group scale={s * (1 + 0.04 * k)} rotation={[0, 0, 0.12 * Math.sin(2 * LW * t)]}>
      {sticks.map((g, i) => <Flat key={i} g={g} c="#c8cdf0" z={-0.01} />)}
      {PROP.atoms.map((a, i) => { const [d, l] = ECOL[a.e], r = a.e === "H" ? 0.09 : a.e === "O" ? 0.17 : 0.14; return (
        <group key={`a${i}`} position={[a.p[0], a.p[1], 0]}>
          <Disc at={[0, 0]} r={r} c={d} seg={16} />
          <Disc at={[-r * 0.15, r * 0.15]} r={r * 0.78} c={l} z={0.001} seg={16} />
          <Disc at={[-r * 0.35, r * 0.35]} r={r * 0.25} c="#ffffff" z={0.002} o={0.8} seg={8} />
        </group>); })}
    </group>
  );
};

// ================= HOOK: a syringe of milky propofol =================
const MOL_C: P2 = [0.3, 1.05];
const SYR_C: P2 = [0.15, -0.2], SYR_SMALL: P2 = [-1.45, -2.55];
const SHRINK = b(1.5);
const heroK = (t: number) => (t >= BACK ? 0 : ease((t - SHRINK) / 0.6));
const bubbleK = (t: number) => (t >= BACK ? 0 : backOut((t - SHRINK - 0.35) / 0.45));
const Syringe: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const drop = ((t % (BAR / 2)) / (BAR / 2));
  return (
    <group>
      {/* plunger */}
      <Flat g={rrect(-0.13, 1.1, 0.13, 2.45, 0.05)} c="#c8cdf0" z={-0.02} />
      <Flat g={rrect(-0.62, 2.4, 0.62, 2.58, 0.07)} c="#9aa0b8" z={-0.01} />
      {/* barrel: glass, milky propofol, stopper, gloss, scale */}
      <Flat g={rrect(-0.56, -1.62, 0.56, 1.62, 0.14)} c="#9aa0b8" />
      <Flat g={rrect(-0.47, -1.53, 0.47, 1.52, 0.1)} c="#bfe6ff" z={0.001} />
      <Flat g={rrect(-0.47, -1.53, 0.47, 0.85, 0.1)} c="#ffffff" z={0.002} />
      <Flat g={rrect(-0.47, 0.6, 0.47, 0.85, 0.05)} c="#fff3b0" z={0.003} />
      <Flat g={rrect(-0.47, 0.85, 0.47, 1.12, 0.05)} c="#3a3f5a" z={0.004} />
      {Array.from({ length: 9 }, (_, i) => <Flat key={`gr${i}`} g={rrect(-0.47, -1.25 + i * 0.28, i % 2 ? -0.3 : -0.2, -1.22 + i * 0.28, 0)} c="#7a88d6" z={0.005} />)}
      <Flat g={rrect(0.2, -1.3, 0.3, 1.3, 0.05)} c="#ffffff" z={0.006} o={0.7} />
      <Flat g={rrect(-0.98, 1.5, 0.98, 1.68, 0.07)} c="#9aa0b8" z={0.007} />
      {/* hub + needle + a forming drop */}
      <Flat g={blob([[-0.26, -1.6], [0.26, -1.6], [0.13, -1.95], [-0.13, -1.95]], 4)} c="#9aa0b8" z={0.003} />
      <Flat g={ribbon([[0, -1.95], [0, -3.05]], () => 0.035)} c="#c8cdf0" z={0.003} />
      <group position={[0, -3.1 - 0.12 * ease(drop), 0.01]} scale={0.4 + 0.6 * ease(drop * 1.3)}>
        <Flat g={blob([[0, 0.14], [0.11, -0.05], [0, -0.14], [-0.11, -0.05]], 16)} c="#ffffff" />
      </group>
      <Glow map={map} at={[0, -3.15, 0.05]} size={1.0 + 0.4 * beatK(t)} color="#ffffff" opacity={0.7} />
    </group>
  );
};
const Hero: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = heroK(t), bk = bubbleK(t), kk = beatK(t);
  const sc = lerp(0.85, 0.32, k), cx = lerp(SYR_C[0], SYR_SMALL[0], k), cy = lerp(SYR_C[1], SYR_SMALL[1], k), rot = lerp(-0.42 + 0.04 * Math.sin(2 * LW * t), -0.35, k);
  const tip: P2 = [cx + 3.15 * sc * Math.sin(rot), cy - 3.15 * sc * Math.cos(rot)];
  const tang = (deg: number): P2 => [MOL_C[0] + 2.2 * Math.cos((deg * Math.PI) / 180), MOL_C[1] + 2.2 * Math.sin((deg * Math.PI) / 180)];
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      {[5.4, 4.3, 3.3].map((r, i) => <Disc key={`h${i}`} at={[0, 0.6]} r={r * (1 + 0.025 * kk * (i + 1))} c={["#121a4a", "#1c2a6e", "#2b3f99"][i]} z={-10 + i * 0.1} seg={56} />)}
      {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2 + 2 * LW * t, r = 2.9 + 0.2 * Math.sin(3 * LW * t + i); return <Disc key={`b${i}`} at={[Math.cos(a) * r, 0.6 + Math.sin(a) * r]} r={0.06 + 0.03 * (i % 3)} c={i % 3 ? "#bfe6ff" : "#ffffff"} z={-5} seg={8} />; })}
      <Glow map={map} at={[0, 0.3, -2]} size={7} color="#7a4dff" opacity={0.35 + 0.15 * kk} />
      {bk > 0.01 && <group position={[MOL_C[0], MOL_C[1], 0]} scale={bk}><group position={[-MOL_C[0], -MOL_C[1], 0]}>
        {[200, 290].map((d, i) => <Flat key={`zl${i}`} g={ribbon([tip, tang(d)], () => 0.04)} c="#bfe6ff" z={-0.3} o={0.55} />)}
        <Disc at={MOL_C} r={2.2} c="#1c2a6e" z={-0.25} o={0.9} seg={64} />
        <mesh position={[MOL_C[0], MOL_C[1], -0.2]}><ringGeometry args={[2.16, 2.26, 64]} /><meshBasicMaterial color="#bfe6ff" /></mesh>
        <Glow map={map} at={[MOL_C[0], MOL_C[1], -0.15]} size={4.2} color="#ffffff" opacity={0.3 + 0.15 * kk} />
        <group position={[MOL_C[0], MOL_C[1] - 0.25, 0]}><Propofol t={t} s={1.35} /></group>
      </group></group>}
      <group position={[cx, cy, 0.3]} rotation={[0, 0, rot]} scale={sc * (1 + 0.03 * kk)}><Syringe t={t} map={map} /></group>
    </group>
  );
};

// ================= inside: a neuron membrane with a GABA-A chloride channel =================
const MEM_W = 4.2, HEADS = Array.from({ length: 44 }, (_, i) => -MEM_W + i * (2 * MEM_W / 43));
const OUTSIDE_IONS = Array.from({ length: 22 }, (_, i) => ({ x: (rnd(i + 300) - 0.5) * 7.5, y: 1.0 + rnd(i + 301) * 1.3, ph: rnd(i + 302) * 6 }));
const gateOpen = (t: number) => {
  if (t >= EV.propLock) return 0.5 + 0.05 * Math.sin(8 * LW * t);
  const g = (EV.gaba as number[]).find((x) => t >= x && t < x + 0.45);
  return g !== undefined ? 0.32 * Math.sin(Math.PI * clamp01((t - g) / 0.45)) ** 0.4 : 0.05;
};
const PTR = { X0: -1.9, X1: 1.9, Y: -2.75, WIN: 2.5 };
const voltage = (tt: number) => {
  let v = 0;
  for (const g of EV.gaba as number[]) if (tt >= g) v -= 0.2 * Math.exp(-(tt - g) / 0.35) * clamp01((tt - g) / 0.06);
  if (tt >= EV.propLock - 0.2) v -= 0.42 * ease((tt - EV.propLock + 0.2) / 1.2);
  const d = Math.min(...(EV.spikes as number[]).map((s) => Math.abs(tt - s)));
  if (d < 0.035 && tt < EV.propIn) v += 0.75 * (1 - d / 0.035);
  return v + 0.025 * Math.sin(tt * 37) + 0.02 * Math.sin(tt * 23 + 1);
};
const Ion: React.FC<{ at: P2; z?: number; o?: number }> = ({ at, z = 0.1, o }) => (
  <group position={[at[0], at[1], z]}>
    <Disc at={[0, 0]} r={0.12} c="#1f8a4a" seg={14} o={o} />
    <Disc at={[-0.01, 0.01]} r={0.095} c="#9bf08a" z={0.001} seg={14} o={o} />
    <Flat g={rrect(-0.045, -0.012, 0.045, 0.012, 0.01)} c="#1f8a4a" z={0.002} o={o} />
  </group>
);
const GabaMol: React.FC<{ at: P2; s?: number }> = ({ at, s = 1 }) => (
  <group position={[at[0], at[1], 0.15]} scale={s}>
    <Flat g={ribbon([[-0.3, 0], [-0.1, 0.12], [0.1, 0], [0.3, 0.12]], () => 0.06)} c="#ffbf6a" />
    {[[-0.3, 0], [-0.1, 0.12], [0.1, 0], [0.3, 0.12]].map((p, i) => <Disc key={i} at={p as P2} r={0.085} c={i === 0 ? "#4a9aff" : i === 3 ? "#ff3a2a" : "#ff8a1f"} z={0.001} seg={12} />)}
  </group>
);
const Synapse: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const tin = t - IN, gap = gateOpen(t), px = gap / 2 + 0.36;
  const pop = (d: number) => Math.max(0.001, backOut((tin - d) / 0.35));
  const passed = (EV.ions as number[]).filter((x) => t >= x + 0.5).length;
  const flood = clamp01((t - EV.propLock) / 2.5);
  // trace
  const pts: P2[] = [];
  for (let i = 0; i <= 260; i++) { const tt = t - PTR.WIN + (i / 260) * PTR.WIN; pts.push([PTR.X0 + (i / 260) * (PTR.X1 - PTR.X0), PTR.Y + (tt >= IN ? voltage(tt) : 0)]); }
  return (
    <group>
      {/* outside (top) and the neuron's inside (bottom) */}
      <Flat g={rrect(-8, 0, 8, 8, 0)} c="#121a4a" z={-6} />
      <Flat g={rrect(-8, -8, 8, 0, 0)} c={flood > 0.5 ? "#121a4a" : "#1c2a6e"} z={-6} />
      {STARS.slice(0, 30).map((s, i) => <Disc key={`s${i}`} at={[s.x * 0.3, 1 + Math.abs(s.y) * 0.15]} r={s.s * 0.7} c="#2b3f99" z={-5} seg={6} />)}
      {/* lipid bilayer */}
      <group scale={[1, pop(0.1), 1]}>
        {HEADS.map((x, i) => Math.abs(x) < px + 0.3 ? null : <React.Fragment key={`hd${i}`}>
          <Flat g={ribbon([[x - 0.04, 0.32], [x - 0.04, -0.32]], () => 0.025)} c="#d94a7a" z={-0.2} />
          <Flat g={ribbon([[x + 0.04, 0.32], [x + 0.04, -0.32]], () => 0.025)} c="#d94a7a" z={-0.2} />
          <Disc at={[x, 0.38 + 0.02 * Math.sin(6 * LW * t + i)]} r={0.1} c="#ffb3c9" z={-0.19} seg={10} />
          <Disc at={[x, -0.38 + 0.02 * Math.sin(6 * LW * t + i + 2)]} r={0.1} c="#ffb3c9" z={-0.19} seg={10} />
        </React.Fragment>)}
      </group>
      {/* GABA-A receptor: two subunits around a pore that opens */}
      {[-1, 1].map((sd) => <group key={`su${sd}`} position={[sd * px, 0.15, 0]} scale={pop(0.35)}>
        <Flat g={rrect(-0.36, -0.95, 0.36, 1.05, 0.22)} c="#0f6e6a" />
        <Flat g={rrect(-0.3, -0.85, 0.3, 0.98, 0.18)} c="#1fb5a8" z={0.001} />
        <Flat g={rrect(sd > 0 ? -0.3 : 0.12, -0.7, sd > 0 ? -0.12 : 0.3, 0.85, 0.08)} c="#6ee6cf" z={0.002} />
      </group>)}
      {/* outside chloride ions jiggling */}
      {tin > 0.6 && OUTSIDE_IONS.map((p, i) => Math.abs(p.x) < 0.9 && p.y < 1.4 ? null : <Ion key={`oi${i}`} at={[p.x + 0.05 * Math.sin(5 * LW * t + p.ph), p.y + 0.05 * Math.cos(4 * LW * t + p.ph)]} />)}
      {/* GABA docks → the door opens → a few ions slip in */}
      {(EV.gaba as number[]).map((g, i) => { const a = t - g + 0.35; if (a < 0 || a > 1.0) return null; const p: P2 = a < 0.35 ? [lerp(-1.6 + i * 0.5, 0, ease(a / 0.35)), lerp(2.0, 1.25, ease(a / 0.35))] : [0, 1.25 + (a - 0.35) * 0.8]; return (
        <React.Fragment key={`gb${i}`}>
          <GabaMol at={p} s={1.2} />
          {a > 0.35 && a < 0.8 && [0, 1, 2].map((j) => { const u = clamp01((a - 0.38 - j * 0.1) / 0.3); return u > 0 && u < 1 ? <Ion key={j} at={[0.05 * (j - 1), lerp(0.9, -1.0, u)]} z={0.2} /> : null; })}
        </React.Fragment>); })}
      {/* propofol slides into the membrane next to the channel and jams it open */}
      {t >= EV.propIn - 0.3 && (() => { const a = clamp01((t - EV.propIn + 0.3) / (EV.propLock - EV.propIn + 0.3)); const p: P2 = [lerp(-3.4, -px - 0.55, ease(a)), lerp(1.6, 0.1, ease(a))]; return (
        <group position={[p[0], p[1], 0.3]}><Glow map={map} at={[0, 0, -0.05]} size={1.5} color="#ffffff" opacity={0.5} /><Propofol t={t} s={0.42} /></group>); })()}
      {t >= EV.propLock && t - EV.propLock < 0.7 && <mesh position={[-px - 0.55, 0.1, 0.35]} scale={0.3 + (t - EV.propLock) * 3}><ringGeometry args={[0.85, 1, 28]} /><meshBasicMaterial color="#ffffff" transparent opacity={1 - (t - EV.propLock) / 0.7} /></mesh>}
      {/* the chloride flood */}
      {(EV.ions as number[]).map((e, i) => { const a = t - e + 0.5; if (a < 0) return null; const x0 = (rnd(i + 330) - 0.5) * 3.5;
        if (a < 0.5) { const u = a / 0.5; const p: P2 = u < 0.5 ? [lerp(x0, 0, ease(u * 2)), lerp(1.9, 0.9, ease(u * 2))] : [0.08 * Math.sin(i), lerp(0.9, -1.0, (u - 0.5) * 2)]; return <Ion key={`fl${i}`} at={p} z={0.2} />; }
        const home: P2 = [(rnd(i + 340) - 0.5) * 4.0, -1.1 - rnd(i + 341) * 0.7]; const u = ease((a - 0.5) / 0.6);
        return <Ion key={`fl${i}`} at={[lerp(0, home[0], u) + 0.04 * Math.sin(5 * LW * t + i), lerp(-1.0, home[1], u)]} z={0.2} />; })}
      {passed > 0 && <Glow map={map} at={[0, -1.4, 0.1]} size={2 + passed * 0.12} color="#3fcf6a" opacity={0.25} />}
      {/* voltage trace instrument */}
      <group scale={pop(0.6)} position={[0, PTR.Y, 0]}><group position={[0, -PTR.Y, 0]}>
        <Flat g={rrect(PTR.X0 - 0.15, PTR.Y - 0.75, PTR.X1 + 0.15, PTR.Y + 0.95, 0.08)} c="#05060f" z={0.08} o={0.8} />
        {Array.from({ length: 12 }, (_, i) => <Flat key={`th${i}`} g={rrect(PTR.X0 + i * 0.33, PTR.Y + 0.33, PTR.X0 + i * 0.33 + 0.18, PTR.Y + 0.36, 0)} c="#ff8a7a" z={0.09} />)}
        <Flat g={ribbon(pts, () => 0.035)} c={t >= EV.propLock ? "#7a88d6" : "#6ee6cf"} z={0.1} />
        <Disc at={pts[pts.length - 1]} r={0.07} c="#ffffff" z={0.11} seg={8} />
      </group></group>
    </group>
  );
};

// ================= the brain: EEG + thalamus relay =================
const PINK = { mid: "#ff8a7a", dark: "#ff4f8b", light: "#ffb3c9" }, DIM = { mid: "#7a88d6", dark: "#2b3f99", light: "#c8cdf0" };
const WIPE = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
const THAL: P2 = [0.1, 0.95];
const CORTEX: P2[] = [[-1.9, 1.3], [-1.5, 2.0], [-0.8, 2.5], [0.1, 2.65], [0.9, 2.55], [1.6, 2.15], [2.05, 1.4], [1.9, 0.6]];
const linkArc = (c: P2) => curve([THAL, [(THAL[0] + c[0]) / 2, (THAL[1] + c[1]) / 2 + 0.35], c], 20);
const LINKS = CORTEX.map(linkArc);
const linkOn = (t: number, i: number) => (t < (EV.dark as number[])[i] ? 1 : t < (EV.wake as number[])[i] ? 0 : 1);
const ELEC: P2[] = [[-1.6, 2.05], [-0.7, 2.62], [0.3, 2.78], [1.25, 2.42]];
const EEG = { X0: -2.0, X1: 2.0, Y: -3.25, WIN: 2.5 };
const underK = (tt: number) => (tt < b(9.5) ? 0 : tt < b(9.5) + 0.8 ? ease((tt - b(9.5)) / 0.8) : tt < b(14) ? 1 : tt < b(14) + 0.5 ? 1 - ease((tt - b(14)) / 0.5) : 0);
const eeg = (tt: number) => {
  const u = underK(tt);
  const fast = 0.09 * Math.sin(2 * Math.PI * 14 * tt) + 0.07 * Math.sin(2 * Math.PI * 19 * tt + 1) + 0.05 * Math.sin(2 * Math.PI * 9 * tt + 2);
  const slow = 0.36 * Math.sin((2 * Math.PI * (tt - b(9))) / (BAR / 2)) + 0.07 * Math.sin(2 * Math.PI * 10 * tt);
  return lerp(fast, slow, u);
};
const Brain: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), sq = 0.03 * k * (under(t) ? 0.3 : 1);
  const w0 = b(9.5), w1 = b(14);
  const wipeT = t >= w1 ? t - w1 : t >= w0 ? t - w0 : 9, edge = 2.6 - wipeT * 12;
  WIPE.constant = -edge;
  const wiping = edge > -2.6;
  const pal = under(t) ? DIM : PINK, prev = t >= w1 ? DIM : PINK;
  const layer = (g: THREE.BufferGeometry, role: "mid" | "dark" | "light", z: number, key: string) => (
    <React.Fragment key={key}>
      {wiping && <Flat g={g} c={prev[role]} z={z} />}
      <Flat g={g} c={pal[role]} z={z + 0.003} clip={wiping ? [WIPE] : undefined} />
    </React.Fragment>
  );
  const pts: P2[] = [];
  for (let i = 0; i <= 300; i++) { const tt = t - EEG.WIN + (i / 300) * EEG.WIN; pts.push([EEG.X0 + (i / 300) * (EEG.X1 - EEG.X0), EEG.Y + eeg(tt)]); }
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      {[5.2, 4.2, 3.4].map((r, i) => <Disc key={`h${i}`} at={[0, 1.1]} r={r * (1 + 0.03 * k * (i + 1))} c={under(t) ? ["#121a4a", "#1c2a6e", "#2b3f99"][i] : ["#1c2a6e", "#4a2a5a", "#7a4a6a"][i]} z={-10 + i * 0.1} seg={56} />)}
      <group position={[0, 0.03 * Math.sin(4 * LW * t), 0]} scale={[1 + sq, 1 + sq * 0.7, 1]}>
        {layer(STEM, "dark", -0.05, "st")}
        {layer(CEREB, "mid", -0.02, "cb")}
        {CB_FOLDS.map((g, i) => layer(g, "dark", -0.01, `cbf${i}`))}
        {layer(BRAIN, "mid", 0, "br")}
        {layer(SHADE, "dark", 0.01, "sh")}
        {FOLDS.map((g, i) => layer(g, "dark", 0.02, `f${i}`))}
        {layer(RIM, "light", 0.03, "rim")}
        {/* thalamus + its links to the cortex (pulses travel while on) */}
        {LINKS.map((pts2, i) => { const on = linkOn(t, i); return (
          <React.Fragment key={`lk${i}`}>
            <Flat g={ribbon(pts2, () => 0.06)} c={on ? "#fff08a" : "#3a3f5a"} z={0.05} o={on ? 0.9 : 0.6} />
            {on > 0 && [0, 1].map((j) => { const u = ((t * 0.9 + i * 0.13 + j * 0.5) % 1); const p = pts2[Math.floor(u * (pts2.length - 1))]; return <Disc key={j} at={p} r={0.07} c="#ffffff" z={0.06} seg={8} />; })}
            {(EV.dark as number[])[i] <= t && t - (EV.dark as number[])[i] < 0.4 && <Glow map={map} at={[CORTEX[i][0], CORTEX[i][1], 0.2]} size={1.0} color="#7a88d6" opacity={1 - (t - (EV.dark as number[])[i]) / 0.4} />}
            {(EV.wake as number[])[i] <= t && t - (EV.wake as number[])[i] < 0.4 && <Glow map={map} at={[CORTEX[i][0], CORTEX[i][1], 0.2]} size={1.2} color="#fff08a" opacity={1 - (t - (EV.wake as number[])[i]) / 0.4} />}
          </React.Fragment>); })}
        <Disc at={THAL} r={0.4} c="#c85a10" z={0.07} seg={24} />
        <Disc at={[THAL[0] - 0.05, THAL[1] + 0.05]} r={0.32} c={under(t) && t >= (EV.dark as number[])[7] ? "#7a88d6" : "#ffbf6a"} z={0.071} seg={24} />
        <Disc at={[THAL[0] - 0.13, THAL[1] + 0.13]} r={0.08} c="#ffffff" z={0.072} o={0.7} seg={8} />
        {/* EEG electrodes */}
        {ELEC.map((e, i) => <React.Fragment key={`el${i}`}>
          <Disc at={e} r={0.13} c="#9aa0b8" z={0.08} seg={12} /><Disc at={e} r={0.07} c="#3fcf6a" z={0.081} seg={10} />
        </React.Fragment>)}
      </group>
      {/* electrode wires to the monitor */}
      {ELEC.map((e, i) => <Flat key={`wr${i}`} g={ribbon(curve([e, [e[0] * 1.25 + 0.6, e[1] + 0.4], [2.45, 0.6], [2.35, EEG.Y + 0.9]], 24), () => 0.025)} c="#5a607a" z={-0.3} />)}
      {/* EEG monitor */}
      <Flat g={rrect(EEG.X0 - 0.2, EEG.Y - 0.6, EEG.X1 + 0.2, EEG.Y + 0.65, 0.1)} c="#3a3f5a" z={0.2} />
      <Flat g={rrect(EEG.X0 - 0.1, EEG.Y - 0.5, EEG.X1 + 0.1, EEG.Y + 0.55, 0.06)} c="#05060f" z={0.21} />
      <Flat g={ribbon(pts, () => 0.03)} c="#3fcf6a" z={0.22} />
      <Disc at={pts[pts.length - 1]} r={0.06} c="#9bf08a" z={0.23} seg={8} />
      {(EV.slow as number[]).map((s, i) => t >= s && t - s < 0.5 ? <Glow key={`sw${i}`} map={map} at={[0, 0.9, -1]} size={6} color="#7a4dff" opacity={0.35 * (1 - (t - s) / 0.5)} /> : null)}
    </group>
  );
};

// ================= tags, camera, labels =================
type Tag = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const HERO_TAGS: Tag[] = [
  { txt: "PROPOFOL 1%", at: [-0.65, -0.3, 0.5], from: 0, to: SHRINK, col: "#ffffff" },
  { txt: "PROPOFOL 1%", at: [-0.65, -0.3, 0.5], from: BACK + 0.3, to: D + 1, col: "#ffffff" },
  { txt: "PROPOFOL · C12H18O", at: [MOL_C[0], MOL_C[1] - 2.35, 0.5], from: SHRINK + 0.6, to: IN, col: "#bfe6ff" },
];
const SYN_TAGS: Tag[] = [
  { txt: "NEURON VOLTAGE", at: [PTR.X0 + 1.0, PTR.Y + 1.0, 0.5], from: IN + 0.9, to: OUT, col: "#6ee6cf" },
  { txt: "FIRING THRESHOLD", at: [PTR.X1 - 1.0, PTR.Y + 0.42, 0.5], from: IN + 1.3, to: b(5), col: "#ff8a7a" },
  { txt: "GABA-A RECEPTOR", at: [0, 1.3, 0.5], from: IN + 0.8, to: b(4.5), col: "#6ee6cf" },
  { txt: "GABA", at: [-0.9, 1.75, 0.5], from: b(4.5), to: b(5.4), col: "#ff8a1f" },
  { txt: "CHLORIDE (CL-)", at: [1.4, 2.35, 0.5], from: b(4.6), to: b(6), col: "#9bf08a" },
  { txt: "PROPOFOL", at: (t) => [Math.max(-1.6, lerp(-3.4, -1.3, ease(clamp01((t - EV.propIn + 0.3) / (EV.propLock - EV.propIn + 0.3))))), 0.75, 0.5], from: EV.propIn, to: b(7.5), col: "#ffffff" },
  { txt: "THRESHOLD", at: [PTR.X1 - 0.7, PTR.Y + 0.42, 0.5], from: b(7.5), to: OUT, col: "#ff8a7a" },
];
const BRAIN_TAGS: Tag[] = [
  { txt: "EEG", at: [0, EEG.Y + 0.7, 0.5], from: OUT + 0.6, to: b(10.5), col: "#3fcf6a" },
  { txt: "THALAMUS (RELAY)", at: [THAL[0], THAL[1] - 0.45, 0.5], from: b(10.5), to: b(12), col: "#ffbf6a" },
  { txt: "SLEEP: A NUDGE WAKES YOU", at: [0, 2.15, 0.5], from: b(12) + 0.2, to: b(13.5), col: "#7a88d6" },
  { txt: "ANESTHESIA: SURGERY DOESN'T", at: [0, 1.45, 0.5], from: b(12) + 0.7, to: b(13.5), col: "#ff8a7a" },
  { txt: "EEG: AWAKE AGAIN", at: [0, EEG.Y + 0.7, 0.5], from: b(14) + 0.3, to: BACK, col: "#3fcf6a" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[] }> = ({ t, cam, tags }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = g.from === 0 ? (t > g.to - 0.2 ? clamp01((g.to - t) / 0.2) : 1) : backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 26, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.6, 29] as V3, l: [0, 0.6, 0] as V3 };
const BRAINV = { p: [0, 0.75, 29] as V3, l: [0, 0.75, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: SHRINK + 0.6, ...HOME },
  { t: b(2.4), p: [0.3, 0.9, 21], l: [0.3, 0.9, 0] },
  { t: IN - 0.35, p: [0.3, 0.85, 7], l: [0.3, 0.85, 0] },
  { t: IN, p: [0.3, 0.8, 1.6], l: [0.3, 0.8, 0] },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0, 0, 6], l: [0, 0, 0] },
  { t: IN + 0.9, p: [0, -0.4, 26], l: [0, -0.4, 0] },
  { t: b(5.9), p: [0, -0.4, 26], l: [0, -0.4, 0] },
  { t: EV.propLock, p: [-0.4, 0.0, 17], l: [-0.4, 0.0, 0] },
  { t: b(7.4), p: [-0.2, -0.3, 19], l: [-0.2, -0.3, 0] },
  { t: b(7.9), p: [0, -0.5, 25], l: [0, -0.5, 0] },
  { t: OUT - 0.4, p: [0, -1.2, 10], l: [0, -1.2, 0] },
  { t: OUT, p: [0, -1.3, 2.5], l: [0, -1.3, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, p: [0.2, 1.0, 2], l: [0.2, 1.0, 0] },
  { t: OUT + 0.9, p: [0, 0.75, 25], l: [0, 0.75, 0] },
  { t: b(12), p: [0, 0.8, 27], l: [0, 0.8, 0] },
  { t: BACK - 0.4, p: [0, 0.8, 28], l: [0, 0.8, 0] },
  { t: BACK, ...BRAINV },
];
const CAM_H: CamKey[] = [{ t: BACK, p: [0, 0.6, 32], l: [0, 0.6, 0] }, { t: BACK + 0.8, ...HOME }, { t: D, ...HOME }];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : t < OUT ? camAt(CAM_S, t) : t < BACK ? camAt(CAM_B, t) : camAt(CAM_H, t));
const diveAt = (t: number) => Math.max(...[IN, OUT, BACK].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - OUT) < 1 ? "#1fb5a8" : "#ffffff");

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "THIS MILKY DRUG" }], [{ t: "SWITCHES YOU OFF", c: "#bfe6ff" }], [{ t: "IN ~30 SECONDS 😵" }]];
const LABELS: LabelDef[] = [
  Lb(0, SHRINK, "#ffffff", HOOK, true),
  Lb(SHRINK, IN + 0.3, "#bfe6ff", [[{ t: "PROPOFOL, AKA THE" }], [{ t: "'MILK OF", c: "#ffffff" }], [{ t: "AMNESIA' 🥛", c: "#ffffff" }]]),
  Lb(IN + 0.3, b(4.5), "#6ee6cf", [[{ t: "AWAKE, NEURONS" }], [{ t: "FIRE NONSTOP ⚡", c: "#6ee6cf" }], [{ t: "ABOVE THRESHOLD", c: "#ff8a7a" }]]),
  Lb(b(4.5), b(6), "#ff8a1f", [[{ t: "GABA IS THE BRAKE:" }], [{ t: "IT OPENS A DOOR", c: "#ff8a1f" }], [{ t: "FOR CHLORIDE 🚪", c: "#9bf08a" }]]),
  Lb(b(6), b(7.5), "#ffffff", [[{ t: "PROPOFOL JAMS IT" }], [{ t: "WIDE OPEN →", c: "#ffffff" }], [{ t: "CHLORIDE FLOODS", c: "#9bf08a" }]]),
  Lb(b(7.5), OUT, "#7a88d6", [[{ t: "THE NEURON SINKS" }], [{ t: "BELOW THRESHOLD", c: "#ff8a7a" }], [{ t: "→ SILENCE 🤫", c: "#7a88d6" }]]),
  Lb(OUT, b(10.5), "#3fcf6a", [[{ t: "BILLIONS GO QUIET:" }], [{ t: "FAST CHATTER", c: "#3fcf6a" }], [{ t: "→ SLOW WAVES 🌊", c: "#7a88d6" }]]),
  Lb(b(10.5), b(12), "#ffbf6a", [[{ t: "THALAMUS-CORTEX" }], [{ t: "LINKS GO DARK", c: "#ffbf6a" }], [{ t: "→ NO AWARENESS" }]]),
  Lb(b(12), b(13.5), "#7a88d6", [[{ t: "NOT SLEEP: CLOSER" }], [{ t: "TO A REVERSIBLE", c: "#7a88d6" }], [{ t: "COMA 😶" }]]),
  Lb(b(13.5), BACK, "#fff08a", [[{ t: "STOP THE DRIP:" }], [{ t: "IT WASHES OUT", c: "#fff08a" }], [{ t: "AWAKE IN MINUTES" }]]),
  Lb(BACK, D + 0.01, "#ffffff", HOOK, true),
];
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const AnesthesiaVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/17-anesthesia/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={ANES_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "hero" ? <Hero t={t} map={glow} /> : s === "syn" ? <Synapse t={t} map={glow} /> : <Brain t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#bfe6ff" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} tags={s === "syn" ? SYN_TAGS : s === "brain" ? BRAIN_TAGS : HERO_TAGS} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
