/**
 * Video 016 · How does a light bulb turn electricity into light? — LSD-style explainer (Kurzgesagt flat drawing through
 * the pixel pipeline, step-by-step cause → effect labels, infographic instruments, clean synthwave where every flash of
 * light is a note). 40 s loop, 120 BPM (bulb.json + music.wav from videos/16-bulb/build.py).
 * Facts: a ~10 W LED emits ~1e19 photons/s (≈ 3-4 W of light / ~3.7e-19 J per photon); an LED chip is ~1 mm or less;
 * n-type crystal = extra electrons, p-type = holes; forward voltage of a blue LED ≈ 3 V; an electron dropping across the
 * band gap releases one photon whose colour is set by the gap (bigger gap = bluer); blue InGaN LEDs (~450 nm) won the
 * 2014 Nobel Prize in Physics; white LEDs = blue chip + yellow (YAG:Ce) phosphor; incandescent tungsten filament
 * ~2,500 °C, ~90 % of the power becomes heat; LEDs use at least 75 % less energy and last up to 25x longer (US DOE).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./bulb.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, rrectLine, ribbon, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;

export const BULB_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#9aa0b8", "#5a607a", "#3a3f5a",
];
const BG = "#090d2b";

// ---------------- timing ----------------
const IN = b(4), OUT = b(12), P2_ = b(14), BACK = b(18.5), FADE = 0.3;
const scene = (t: number) => (t < IN || t >= P2_ ? "bulb" : t < OUT ? "chip" : "pkg");
const beatK = (t: number) => Math.exp(-((t % (BAR / 4)) / (BAR / 4)) * 6);
const oldMode = (t: number) => t >= P2_ && t < b(16);
const REC = EV.rec as { t: number; g: number }[];
const gapAt = (t: number) => { const tgt = t >= b(9) && t < b(9.5) ? 0.8 : t >= b(9.5) && t < b(10) ? 1.1 : 1.4; const prev = t >= b(9.5) && t < b(10) ? 0.8 : t >= b(10) && t < b(10.5) ? 1.1 : t >= b(9) && t < b(9.5) ? 1.4 : 1.4;
  const st = t >= b(10) ? b(10) : t >= b(9.5) ? b(9.5) : b(9); return t >= b(9) && t < b(10.5) ? lerp(prev, tgt, ease((t - st) / 0.15)) : 1.4; };
const GCOL = (g: number) => (g < 0.95 ? "#ff3a2a" : g < 1.25 ? "#3fcf6a" : "#4a9aff");
const GCOL_L = (g: number) => (g < 0.95 ? "#ff8a7a" : g < 1.25 ? "#9bf08a" : "#bfe6ff");
/** a light wave: points along a direction with a sine wiggle */
const squig = (p: P2, ang: number, len: number, amp: number, ph: number, n = 22): P2[] => {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  return Array.from({ length: n }, (_, i) => { const u = (i / (n - 1)) * len, w = amp * Math.sin(u * 14 + ph); return [p[0] + dx * u - dy * w, p[1] + dy * u + dx * w] as P2; });
};
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));
const Wedge: React.FC<{ r: number; a0: number; da: number; c: string; z: number; o?: number }> = ({ r, a0, da, c, z, o }) => (
  <mesh position={[0, 0, z]}><circleGeometry args={[r, 8, a0, da]} /><meshBasicMaterial color={c} transparent={o !== undefined} opacity={o ?? 1} depthWrite={o === undefined} /></mesh>
);

// ================= the bulb =================
const GC: P2 = [0, 0.55], GR = 1.5;
const GLOBE = (() => {
  const pts: P2[] = [];
  for (let d = -50; d <= 230; d += 20) pts.push([GC[0] + GR * Math.cos((d * Math.PI) / 180), GC[1] + GR * Math.sin((d * Math.PI) / 180)]);
  pts.push([-0.72, -1.05], [-0.6, -1.42], [0.6, -1.42], [0.72, -1.05]);
  return blob(pts, 48);
})();
const GLOBE_IN = (() => { const pts: P2[] = []; for (let d = -40; d <= 220; d += 20) pts.push([GC[0] + 1.25 * Math.cos((d * Math.PI) / 180), GC[1] + 0.1 + 1.25 * Math.sin((d * Math.PI) / 180)]); return blob(pts, 40); })();
const CHIPS = [-0.45, 0, 0.45];
const CHIP: P2 = [0, -0.72];
const FIL = (() => { const pts: P2[] = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([-0.5 + u, 0.55 + 0.09 * Math.sin(u * Math.PI * 14)]); } return ribbon(pts, () => 0.05); })();
const Moth: React.FC<{ t: number }> = ({ t }) => {
  const a = 3 * LW * t, x = GC[0] + 2.15 * Math.cos(a), y = GC[1] + 0.25 + 0.7 * Math.sin(2 * a), front = Math.sin(a) < 0, flap = 0.45 + 0.55 * Math.abs(Math.sin(60 * LW * t));
  return (
    <group position={[x, y, front ? 0.6 : -0.6]} scale={[Math.cos(a) > 0 ? -0.55 : 0.55, 0.55, 1]}>
      <group scale={[1, flap, 1]}>
        <Flat g={blob([[0, 0], [-0.35, 0.55], [-0.75, 0.45], [-0.5, 0.05]], 16)} c="#c8cdf0" />
        <Flat g={blob([[0, 0], [0.3, 0.5], [0.65, 0.4], [0.45, 0.02]], 16)} c="#9aa0b8" z={-0.01} />
        <Disc at={[-0.45, 0.32]} r={0.09} c="#ffbf6a" z={0.001} />
      </group>
      <Flat g={blob([[-0.38, 0], [0, 0.13], [0.3, 0.06], [0.3, -0.06], [0, -0.13]], 14)} c="#7a88d6" z={0.01} />
      <Disc at={[0.22, 0.03]} r={0.07} c="#ffffff" z={0.02} seg={10} /><Disc at={[0.24, 0.03]} r={0.04} c="#05060f" z={0.03} seg={8} />
      <Flat g={ribbon([[0.28, 0.08], [0.4, 0.28]], () => 0.025)} c="#7a88d6" z={0.01} />
    </group>
  );
};
const Bulb: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), old = oldMode(t);
  const sw = t >= P2_ && t < P2_ + 0.5 ? (t - P2_) / 0.5 : t >= b(16) && t < b(16) + 0.5 ? (t - b(16)) / 0.5 : 1;
  const warm = old ? "#ff8a1f" : "#fff08a";
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      {/* light rays + halo rings */}
      <group position={[GC[0], GC[1], -6.5]}>{Array.from({ length: 14 }, (_, i) => <Wedge key={`r${i}`} r={9} a0={2 * LW * t + (i * Math.PI) / 7} da={Math.PI / 14} c={old ? "#8a1414" : "#121a4a"} z={0} />)}</group>
      {[5.6, 4.4, 3.4, 2.6].map((r, i) => <Disc key={`h${i}`} at={GC} r={r * (1 + 0.025 * k * (i + 1))} c={(old ? ["#4a2a5a", "#7a4a6a", "#c85a10", "#ff8a1f"] : ["#1c2a6e", "#2b3f99", "#7a4dff", "#b48cff"])[i]} z={-6 + i * 0.1} seg={56} />)}
      <Glow map={map} at={[GC[0], GC[1], -1]} size={9} color={warm} opacity={0.5 + 0.2 * k} />
      {[[2.15, old ? "#c85a10" : "#ffbf6a"], [1.85, old ? "#ff8a1f" : "#ffd23f"], [1.65, old ? "#ffbf6a" : "#fff08a"]].map(([r, c], i) => <Disc key={`hb${i}`} at={GC} r={(r as number) * (1 + 0.04 * k)} c={c as string} z={-0.8 + i * 0.01} seg={48} />)}
      <Moth t={t} />
      {/* glass */}
      <Flat g={GLOBE} c={old ? "#ffbf6a" : "#fff3b0"} />
      <Flat g={GLOBE_IN} c={old ? "#ff8a1f" : "#ffffff"} z={0.005} o={old ? 0.35 : 0.55} />
      <Flat g={blob([[-1.05, 1.0], [-0.75, 1.55], [-0.45, 1.6], [-0.85, 0.9]], 16)} c="#ffffff" z={0.03} o={0.75} />
      {/* LED board inside (or the old tungsten filament) */}
      {!old && <group scale={sw < 1 && t >= b(16) ? Math.max(0.001, backOut(sw)) : 1} position={[0, 0, 0.02]}>
        <Flat g={rrect(-0.75, -0.98, 0.75, -0.8, 0.05)} c="#9aa0b8" />
        {CHIPS.map((x, i) => <React.Fragment key={`c${i}`}><Flat g={rrect(x - 0.13, -0.8, x + 0.13, -0.62, 0.03)} c="#ffd23f" z={0.001} /><Disc at={[x, -0.71]} r={0.05} c="#ffffff" z={0.002} seg={8} /></React.Fragment>)}
      </group>}
      {old && <group position={[0, 0, 0.02]} scale={Math.max(0.001, backOut(sw))}>
        <Flat g={ribbon([[-0.5, 0.55], [-0.25, -0.85]], () => 0.035)} c="#5a607a" />
        <Flat g={ribbon([[0.5, 0.55], [0.25, -0.85]], () => 0.035)} c="#5a607a" />
        <Flat g={FIL} c="#fff08a" z={0.002} />
        <Glow map={map} at={[0, 0.55, 0.1]} size={2.2 + 0.4 * k} color="#ff8a1f" opacity={0.9} />
      </group>}
      {/* base: collar + screw */}
      <Flat g={rrect(-0.72, -1.85, 0.72, -1.35, 0.14)} c="#c8cdf0" z={0.01} />
      <Flat g={rrect(-0.72, -1.85, 0.72, -1.7, 0.08)} c="#9aa0b8" z={0.011} />
      <Flat g={rrect(-0.56, -2.85, 0.56, -1.85, 0.08)} c="#9aa0b8" z={0.01} />
      {[-2.02, -2.27, -2.52, -2.77].map((y, i) => <Flat key={`th${i}`} g={ribbon([[-0.56, y + 0.08], [0.56, y - 0.04]], () => 0.07)} c="#5a607a" z={0.012} />)}
      <Flat g={rrect(-0.26, -3.12, 0.26, -2.85, 0.1)} c="#3a3f5a" z={0.01} />
      {/* heat waves (old bulb) */}
      {old && [-0.7, 0, 0.7].map((x, i) => { const u = ((t - P2_) * 0.8 + i / 3) % 1; return <Flat key={`hw${i}`} g={ribbon(squig([x, 2.2 + u * 1.2], Math.PI / 2, 0.9, 0.08, t * 8 + i), () => 0.05)} c="#ff3a2a" z={0.05} o={(1 - u) * 0.8 * Math.min(1, sw * 3)} />; })}
      {/* photon bursts (bars 2-3) */}
      {(EV.heroPh as number[]).map((e, i) => { const a = t - e; if (a < 0 || a > 1.2) return null; return Array.from({ length: 5 }, (_, j) => { const ang = (j / 5) * Math.PI * 2 + i * 0.7, r0 = GR + 0.1 + a * 3.2; return (
        <Flat key={`ph${i}-${j}`} g={ribbon(squig([GC[0] + Math.cos(ang) * r0, GC[1] + Math.sin(ang) * r0], ang, 0.55, 0.06, a * 20), () => 0.04)} c={j % 2 ? "#fff08a" : "#ffffff"} z={0.3} o={1 - a / 1.2} />); }); })}
      <Meter t={t} />
    </group>
  );
};
/** energy meter under the bulb: old bulb = 10 % light / 90 % heat, LED = power bar 60 W -> 9 W */
const MY = -4.15;
const Meter: React.FC<{ t: number }> = ({ t }) => {
  if (t < P2_ || t > BACK + 0.4) return null;
  const k = Math.max(0.001, t > BACK ? 1 - ease((t - BACK) / 0.3) : backOut((t - P2_ - 0.4) / 0.35));
  const old = oldMode(t), w = old ? 4.2 : lerp(4.2, 4.2 * 9 / 60, ease((t - b(16) - 0.5) / 0.6));
  return (
    <group position={[0, MY, 0.4]} scale={k}>
      <Flat g={rrect(-2.25, -0.3, 2.25, 0.3, 0.1)} c="#05060f" o={0.85} />
      {old ? <>
        <Flat g={rrect(-2.1, -0.17, -2.1 + 0.42, 0.17, 0.05)} c="#fff08a" z={0.01} />
        <Flat g={rrect(-2.1 + 0.46, -0.17, 2.1, 0.17, 0.05)} c={Math.sin(t * 30) > 0 ? "#ff3a2a" : "#ff8a1f"} z={0.01} />
      </> : <Flat g={rrect(-2.1, -0.17, -2.1 + w, 0.17, 0.05)} c="#6ee6cf" z={0.01} />}
    </group>
  );
};

// ================= inside the LED chip =================
const Y0 = -0.6, SL = 1.3, SP = 0.42;
const LATTICE = Array.from({ length: 13 * 16 }, (_, i) => ({ x: -3 + (i % 13) * 0.5, y: -4.6 + Math.floor(i / 13) * 0.5 }));
const Electron: React.FC<{ at: P2; z?: number; s?: number }> = ({ at, z = 0.1, s = 1 }) => (
  <group position={[at[0], at[1], z]} scale={s}>
    <Disc at={[0, 0]} r={0.14} c="#1f4abf" seg={16} />
    <Disc at={[-0.01, 0.01]} r={0.11} c="#bfe6ff" z={0.001} seg={16} />
    <Flat g={rrect(-0.055, -0.015, 0.055, 0.015, 0.01)} c="#1f4abf" z={0.002} />
  </group>
);
const Hole: React.FC<{ at: P2; z?: number; fill?: number }> = ({ at, z = 0.1, fill = 0 }) => (
  <group position={[at[0], at[1], z]}>
    <mesh><ringGeometry args={[0.09, 0.14, 18]} /><meshBasicMaterial color="#ffb3c9" /></mesh>
    <Disc at={[0, 0]} r={0.09} c="#4a2a5a" z={-0.001} seg={14} />
    {fill > 0 && <Disc at={[0, 0]} r={0.12 * fill} c="#ffffff" z={0.001} seg={14} />}
  </group>
);
const FALL = 0.25;
const Chip: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const g = gapAt(t), NT = Y0 + g / 2, PT = Y0 - g / 2, on = t >= EV.von;
  const v = 1.2, run = on ? (t - EV.von) * v : 0, off = run % SP;
  const jig = (i: number) => 0.03 * Math.sin(8 * LW * t * 4 + i * 1.7);
  const tin = t - IN;
  const pop = (d: number) => Math.max(0.001, backOut((tin - d) / 0.35));
  return (
    <group>
      <Disc at={[0, -0.5]} r={12} c="#121a4a" z={-8} seg={48} />
      {LATTICE.map((p, i) => <Disc key={`l${i}`} at={[p.x, p.y]} r={0.035} c="#2b3f99" z={-6} seg={6} />)}
      {/* N crystal (extra electrons) — top surface higher by the gap */}
      <group scale={[1, pop(0.2), 1]} position={[0, NT - SL / 2, 0]}><group position={[0, -(NT - SL / 2), 0]}>
        <Flat g={rrect(-2.75, NT - SL, -0.02, NT, 0.12)} c="#1f4abf" />
        <Flat g={rrect(-2.75, NT - 0.12, -0.02, NT, 0.06)} c="#4a9aff" z={0.001} />
      </group></group>
      {/* P crystal (holes) */}
      <group scale={[1, pop(0.35), 1]} position={[0, PT - SL / 2, 0]}><group position={[0, -(PT - SL / 2), 0]}>
        <Flat g={rrect(0.02, PT - SL, 2.75, PT, 0.12)} c="#d94a7a" />
        <Flat g={rrect(0.02, PT - 0.12, 2.75, PT, 0.06)} c="#ff8a7a" z={0.001} />
      </group></group>
      {/* electrons stream right, holes stream left (wrapping lattice so the flow is seamless) */}
      {tin > 0.5 && [0, 1, 2].map((row) => Array.from({ length: 7 }, (_, c) => { const x = -2.5 + c * SP + off; if (x > -0.25 + (row === 0 ? 0 : -0.1)) return null; return <Electron key={`e${row}-${c}`} at={[x + jig(c + row * 7), NT - 0.25 - row * 0.4 + jig(c * 3 + row)]} />; }))}
      {tin > 0.7 && [0, 1, 2].map((row) => Array.from({ length: 7 }, (_, c) => { const x = 2.5 - c * SP - off; if (x < 0.3) return null; return <Hole key={`h${row}-${c}`} at={[x + jig(c + row * 5 + 3), PT - 0.25 - row * 0.4 + jig(c * 2 + row + 1)]} />; }))}
      {/* the falls: an electron tumbles off the step into a hole → a flash → a photon whose colour = the drop */}
      {REC.map((e, i) => { const a = t - (e.t - FALL); if (a < 0 || a > FALL + 1.4) return null; const gN = Y0 + e.g / 2, gP = Y0 - e.g / 2, col = GCOL(e.g);
        const land: P2 = [0.32, gP - 0.25];
        if (a < FALL) { const u = a / FALL; return <React.Fragment key={`f${i}`}><Hole at={land} /><Electron at={[lerp(-0.2, land[0], u), lerp(gN - 0.25, land[1], u * u) + 0.25 * Math.sin(u * Math.PI) * (1 - u)]} z={0.2} /></React.Fragment>; }
        const a2 = a - FALL, ang = Math.PI / 2 + (i % 2 ? 0.45 : -0.35) + 0.15 * Math.sin(i * 2.3), d = a2 * 4.2;
        return (
          <React.Fragment key={`f${i}`}>
            {a2 < 0.3 && <Hole at={land} fill={1 - a2 / 0.3} />}
            {a2 < 0.4 && <Glow map={map} at={[land[0], land[1], 0.3]} size={1.6 * (1 - a2 / 0.4) + 0.4} color={col} opacity={1 - a2 / 0.4} />}
            {a2 < 0.35 && <mesh position={[land[0], land[1], 0.25]} scale={0.3 + a2 * 4}><ringGeometry args={[0.85, 1, 24]} /><meshBasicMaterial color={GCOL_L(e.g)} transparent opacity={1 - a2 / 0.35} /></mesh>}
            <Flat g={ribbon(squig([land[0] + Math.cos(ang) * d, land[1] + Math.sin(ang) * d], ang, 0.75, 0.09, a2 * 25), () => 0.055)} c={GCOL_L(e.g)} z={0.3} o={1 - a2 / 1.4} />
            <Glow map={map} at={[land[0] + Math.cos(ang) * (d + 0.4), land[1] + Math.sin(ang) * (d + 0.4), 0.28]} size={0.8} color={col} opacity={0.6 * (1 - a2 / 1.4)} />
          </React.Fragment>); })}
      {/* energy-gap ruler */}
      {t >= b(9) - 0.1 && <group>
        <Flat g={ribbon([[0.55, PT + 0.05], [0.55, NT - 0.05]], () => 0.04)} c={GCOL_L(g)} z={0.15} />
        <Flat g={blob([[0.43, NT - 0.18], [0.67, NT - 0.18], [0.55, NT]], 3)} c={GCOL_L(g)} z={0.15} />
        <Flat g={blob([[0.43, PT + 0.18], [0.67, PT + 0.18], [0.55, PT]], 3)} c={GCOL_L(g)} z={0.15} />
      </group>}
      {/* the circuit: wires + a 3 V battery under the crystals */}
      <group scale={pop(0.6)}>
        <Flat g={ribbon([[-2.4, Y0 - SL - 0.3], [-2.4, -3.4], [-0.35, -3.4]], () => 0.06)} c="#9aa0b8" z={-0.1} />
        <Flat g={ribbon([[0.35, -3.4], [2.4, -3.4], [2.4, Y0 - SL - 0.6]], () => 0.06)} c="#9aa0b8" z={-0.1} />
        <Flat g={rrect(-0.3, -3.65, -0.12, -3.15, 0.03)} c="#c8cdf0" z={-0.09} />
        <Flat g={rrect(0.1, -3.85, 0.18, -2.95, 0.03)} c="#c8cdf0" z={-0.09} />
        {on && Array.from({ length: 10 }, (_, i) => { const u = ((t - EV.von) * 0.6 + i / 10) % 1, L1 = 2.05, L2 = 2.2; const s = u * (L1 + L2); const p: P2 = s < L1 ? [-0.35 - s, -3.4] : [-2.4, -3.4 + (s - L1)]; return <Disc key={`w${i}`} at={p} r={0.06} c="#bfe6ff" z={-0.05} seg={8} />; })}
        {on && t - EV.von < 0.5 && <Glow map={map} at={[0, -3.4, 0.2]} size={2.5} color="#bfe6ff" opacity={1 - (t - EV.von) / 0.5} />}
      </group>
    </group>
  );
};

// ================= the LED package: blue chip + yellow phosphor = white =================
const CUP = blob([[-2.2, 1.2], [-1.05, -1.55], [1.05, -1.55], [2.2, 1.2]], 4);
const DOTS = Array.from({ length: 34 }, (_, i) => { const y = -1.3 + rnd(i + 700) * 2.4, w = 1.05 + ((y + 1.55) / 2.75) * 1.15; return { x: (rnd(i + 701) - 0.5) * 2 * (w - 0.2), y }; });
const Pkg: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), tin = t - OUT;
  return (
    <group>
      <Disc at={[0, 0]} r={12} c="#121a4a" z={-8} seg={48} />
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x * 0.5, s.y * 0.5]} r={s.s * 0.8} c="#fff3b0" z={-7} seg={6} />)}
      {/* white light pooling above */}
      <Glow map={map} at={[0, 2.4, -0.5]} size={5 + 0.5 * k} color="#ffffff" opacity={0.35 + 0.35 * clamp01(tin / 1.2)} />
      {/* lead frame */}
      <Flat g={rrect(-1.6, -2.2, -0.7, -1.55, 0.05)} c="#9aa0b8" z={-0.2} /><Flat g={rrect(0.7, -2.2, 1.6, -1.55, 0.05)} c="#9aa0b8" z={-0.2} />
      <Flat g={rrect(-1.6, -3.4, -1.25, -2.2, 0.05)} c="#5a607a" z={-0.2} /><Flat g={rrect(1.25, -3.4, 1.6, -2.2, 0.05)} c="#5a607a" z={-0.2} />
      {/* reflector cup + phosphor fill */}
      <Flat g={CUP} c="#ffd23f" z={-0.1} o={0.55} />
      <Flat g={ribbon([[-2.35, 1.25], [-1.12, -1.65], [1.12, -1.65], [2.35, 1.25]], () => 0.16)} c="#c8cdf0" z={0.05} />
      {DOTS.map((d, i) => <Disc key={`d${i}`} at={[d.x, d.y]} r={0.07} c="#fff08a" z={0.0} seg={8} />)}
      {/* the blue chip */}
      <Flat g={rrect(-0.55, -1.55, 0.55, -1.2, 0.05)} c="#1f4abf" z={0.1} />
      <Flat g={rrect(-0.5, -1.32, 0.5, -1.22, 0.03)} c="#4a9aff" z={0.11} />
      <Glow map={map} at={[0, -1.3, 0.2]} size={2.2 + 0.6 * k} color="#4a9aff" opacity={0.9} />
      {/* photons: even = blue escapes, odd = hits a phosphor grain → turns yellow */}
      {(EV.pkg as number[]).map((e, i) => {
        const conv = i % 2 === 1, t0 = conv ? e - 0.3 : e, a = t - t0; if (a < 0 || a > 1.4) return null;
        const x0 = (rnd(i + 800) - 0.5) * 0.8, ang = Math.PI / 2 + (rnd(i + 801) - 0.5) * 0.9, d = a * 3.4, p: P2 = [x0 + Math.cos(ang) * d, -1.15 + Math.sin(ang) * d];
        const yel = conv && a >= 0.3, col = yel ? "#ffd23f" : "#4a9aff", colL = yel ? "#fff08a" : "#bfe6ff";
        return (
          <React.Fragment key={`p${i}`}>
            <Flat g={ribbon(squig(p, ang, 0.7, yel ? 0.07 : 0.09, a * (yel ? 18 : 26)), () => 0.055)} c={colL} z={0.3} o={1 - a / 1.4} />
            <Glow map={map} at={[p[0] + Math.cos(ang) * 0.35, p[1] + Math.sin(ang) * 0.35, 0.28]} size={0.7} color={col} opacity={0.7 * (1 - a / 1.4)} />
            {conv && a >= 0.3 && a < 0.6 && <Glow map={map} at={[x0 + Math.cos(ang) * 0.3 * 3.4, -1.15 + Math.sin(ang) * 0.3 * 3.4, 0.3]} size={1.4} color="#fff08a" opacity={1 - (a - 0.3) / 0.3} />}
          </React.Fragment>);
      })}
    </group>
  );
};

// ================= tags, camera, labels =================
type Tag = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const NTOP = (t: number) => Y0 + gapAt(t) / 2, PTOP = (t: number) => Y0 - gapAt(t) / 2;
const BULB_TAGS: Tag[] = [
  { txt: "LED CHIP (~1 MM)", at: [0, -1.05, 0.5], from: b(2.6), to: IN, col: "#ffd23f" },
  { txt: "TUNGSTEN WIRE ~2,500°C", at: [0, 1.05, 0.5], from: P2_ + 0.5, to: b(16), col: "#ff8a1f" },
  { txt: "90% HEAT 🔥", at: [0.4, MY + 0.35, 0.5], from: P2_ + 0.7, to: b(16), col: "#ff3a2a" },
  { txt: "10% LIGHT", at: [-1.85, MY + 0.35, 0.5], from: P2_ + 0.9, to: b(16), col: "#fff08a" },
  { txt: "SAME LIGHT: 60 W → 9 W", at: [0, MY + 0.35, 0.5], from: b(16) + 0.6, to: BACK, col: "#6ee6cf" },
];
const CHIP_TAGS: Tag[] = [
  { txt: "N: EXTRA ELECTRONS", at: (t) => [-1.35, NTOP(t) + 0.05, 0.5], from: IN + 0.8, to: b(7), col: "#4a9aff" },
  { txt: "P: HOLES (GAPS)", at: (t) => [1.4, PTOP(t) + 0.05, 0.5], from: IN + 1.1, to: b(7), col: "#ff8a7a" },
  { txt: "3 V", at: [0, -2.85, 0.5], from: EV.von, to: b(9), col: "#bfe6ff" },
  { txt: "1 FALL = 1 PHOTON ✨", at: (t) => [0.1, NTOP(t) + 1.0, 0.5], from: b(7) + 0.3, to: b(9), col: "#bfe6ff" },
  { txt: "ENERGY GAP", at: (t) => [0.55, NTOP(t) + 0.12, 0.5], from: b(9), to: b(10.5), col: "#ffffff" },
  { txt: "INGAN CRYSTAL → 450 NM BLUE", at: (t) => [0, NTOP(t) + 0.12, 0.5], from: b(10.5) + 0.2, to: OUT, col: "#4a9aff" },
];
const PKG_TAGS: Tag[] = [
  { txt: "BLUE LED CHIP", at: [0, -1.75, 0.5], from: OUT + 0.6, to: P2_, col: "#4a9aff" },
  { txt: "YELLOW PHOSPHOR", at: [0, 0.95, 0.5], from: OUT + 0.9, to: P2_, col: "#ffd23f" },
  { txt: "BLUE + YELLOW = WHITE", at: [0, 2.6, 0.5], from: b(13), to: P2_, col: "#ffffff" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[] }> = ({ t, cam, tags }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 26, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.2, 29] as V3, l: [0, 0.2, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: b(2), ...HOME },
  { t: b(3.3), p: [0, -0.45, 12], l: [0, -0.45, 0] },
  { t: IN - 0.35, p: [0, -0.68, 4], l: [0, -0.68, 0] },
  { t: IN, p: [0, -0.71, 1.2], l: [0, -0.71, 0] },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0, -0.6, 6], l: [0, -0.6, 0] },
  { t: IN + 0.9, p: [0, -0.9, 31], l: [0, -0.9, 0] },
  { t: b(7), p: [0, -0.9, 31], l: [0, -0.9, 0] },
  { t: b(7.5), p: [0, -0.5, 15], l: [0, -0.5, 0] },
  { t: b(8.8), p: [0, -0.4, 16], l: [0, -0.4, 0] },
  { t: b(9.3), p: [0, -0.4, 24], l: [0, -0.4, 0] },
  { t: b(10.5), p: [0, -0.3, 27], l: [0, -0.3, 0] },
  { t: OUT - 0.4, p: [0, 0.6, 12], l: [0, 0.6, 0] },
  { t: OUT, p: [0, 1.2, 2], l: [0, 1.2, 0] },
];
const CAM_P: CamKey[] = [{ t: OUT, p: [0, -1.0, 6], l: [0, -1.0, 0] }, { t: OUT + 0.9, p: [0, 0.2, 21], l: [0, 0.2, 0] }, { t: P2_ - 0.4, p: [0, 1.6, 12], l: [0, 1.6, 0] }, { t: P2_, p: [0, 2.4, 2], l: [0, 2.4, 0] }];
const CAM_B: CamKey[] = [{ t: P2_, p: [0, 0.6, 14], l: [0, 0.6, 0] }, { t: P2_ + 0.9, ...HOME }, { t: D, ...HOME }];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : t < OUT ? camAt(CAM_S, t) : t < P2_ ? camAt(CAM_P, t) : camAt(CAM_B, t));
const diveAt = (t: number) => Math.max(...[IN, OUT, P2_].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - P2_) < 1 ? "#fff3b0" : "#4a9aff");

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES A BULB" }], [{ t: "TURN ELECTRICITY", c: "#fff08a" }], [{ t: "INTO LIGHT? 💡" }]];
const LABELS: LabelDef[] = [
  Lb(0, b(2), "#fff08a", HOOK, true),
  Lb(b(2), IN + 0.3, "#ffffff", [[{ t: "A 10 W LED FIRES" }], [{ t: "~10 QUINTILLION", c: "#fff08a" }], [{ t: "PHOTONS A SECOND" }]]),
  Lb(IN + 0.3, EV.von, "#4a9aff", [[{ t: "INSIDE: 2 CRYSTALS" }], [{ t: "EXTRA ELECTRONS", c: "#4a9aff" }], [{ t: "VS. HOLES ⭕", c: "#ff8a7a" }]]),
  Lb(EV.von, b(7), "#bfe6ff", [[{ t: "SWITCH ON: 3 VOLTS" }], [{ t: "PUSH THEM TO", c: "#bfe6ff" }], [{ t: "THE EDGE ⚡" }]]),
  Lb(b(7), b(9), "#4a9aff", [[{ t: "AN ELECTRON FALLS" }], [{ t: "INTO A HOLE", c: "#ff8a7a" }], [{ t: "→ A FLASH! ✨", c: "#bfe6ff" }]]),
  Lb(b(9), b(10.5), "#3fcf6a", [[{ t: "BIGGER FALL =" }], [{ t: "BLUER LIGHT", c: "#4a9aff" }], [{ t: "RED", c: "#ff3a2a" }, { t: "→" }, { t: "GREEN", c: "#3fcf6a" }, { t: "→" }, { t: "BLUE", c: "#4a9aff" }]]),
  Lb(b(10.5), OUT, "#4a9aff", [[{ t: "BLUE WAS SO HARD" }], [{ t: "TO MAKE IT WON", c: "#4a9aff" }], [{ t: "THE 2014 NOBEL 🏆" }]]),
  Lb(OUT, P2_, "#ffd23f", [[{ t: "WHITE LIGHT = BLUE" }], [{ t: "+ YELLOW FROM A", c: "#ffd23f" }], [{ t: "PHOSPHOR COAT" }]]),
  Lb(P2_, b(16), "#ff8a1f", [[{ t: "OLD BULBS HEAT A" }], [{ t: "WIRE TO 2,500°C", c: "#ff8a1f" }], [{ t: "→ 90% IS HEAT 🔥", c: "#ff3a2a" }]]),
  Lb(b(16), BACK, "#6ee6cf", [[{ t: "LEDS: SAME LIGHT," }], [{ t: "75% LESS POWER,", c: "#6ee6cf" }], [{ t: "LASTS UP TO 25X" }]]),
  Lb(BACK, D + 0.01, "#fff08a", HOOK, true),
];
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const BulbVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/16-bulb/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={BULB_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "bulb" ? <Bulb t={t} map={glow} /> : s === "chip" ? <Chip t={t} map={glow} /> : <Pkg t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#fff08a" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} tags={s === "chip" ? CHIP_TAGS : s === "pkg" ? PKG_TAGS : BULB_TAGS} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
void rrectLine;
