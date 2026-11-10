/**
 * Video 019 · STARING CONTEST — "DON'T BLINK. BEAT ME." The video is the game: a 30 s stopwatch + an "urge to blink"
 * gauge, a character that stares back and finally blinks at 30 s. While the viewer holds, we dive into the eye and
 * show ONE mechanism, slowly: the tear film (oil / water / mucus, ~0.003 mm) → no blink = the water evaporates → dry
 * spots (tear break-up, normally after ~10 s or more) → the cornea, the most densely innervated tissue of the body,
 * fires its nerve endings → the urge to blink.
 * Facts: ~15 blinks a minute at rest (so 30 s ≈ 8 blinks skipped); tear film ≈ 3 µm with a lipid layer that slows
 * evaporation, an aqueous layer and a mucin layer; normal tear break-up time ≥ 10 s; corneal nerve-ending density is
 * the highest in the body (~7000 / mm²), cold/dryness receptors drive blinking.
 * 40 s loop, 96 BPM dembow (blink.json + music.wav from videos/19-blink/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./blink.json";
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
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const GO = EV.go, IN = EV.in, OUT = EV.out, BLINK = EV.blink, HOOK2 = EV.hook2, FADE = 0.3;

export const BLINK_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0",
];
const BG = "#090d2b";
const scene = (t: number) => (t >= IN && t < OUT ? "eye" : "face");
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);
/** the urge to blink, 0..1 (drives the gauge, the red veins, the twitching, the colours) */
const urge = (t: number) => {
  if (t < GO || t >= BLINK) return t >= BLINK ? Math.max(0, 1 - (t - BLINK) / 0.4) : 0;
  const keys: [number, number][] = [[GO, 0], [IN, 0.12], [b(6), 0.25], [b(8.5), 0.55], [OUT, 0.85], [BLINK, 1]];
  for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
  return 1;
};
const STARS = Array.from({ length: 60 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));
const Wedge: React.FC<{ r: number; a0: number; da: number; c: string; z: number }> = ({ r, a0, da, c, z }) => (
  <mesh position={[0, 0, z]}><circleGeometry args={[r, 8, a0, da]} /><meshBasicMaterial color={c} /></mesh>
);
const poly = (pts: P2[]) => new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));

// ================= the opponent: a round bird that stares back =================
const BC: P2 = [0, -0.35];
const BODYG = blob([[0, 1.95], [1.45, 1.5], [2.05, 0.2], [1.75, -1.35], [0, -2.0], [-1.75, -1.35], [-2.05, 0.2], [-1.45, 1.5]], 48);
const BELLYG = blob([[0, -0.55], [1.15, -0.85], [1.0, -1.6], [0, -1.85], [-1.0, -1.6], [-1.15, -0.85]], 30);
const SHADEG = blob([[1.2, 1.55], [2.0, 0.3], [1.75, -1.3], [0.6, -1.95], [1.35, -1.0], [1.6, 0.2]], 24);
const WINGG = blob([[0, 0], [0.55, -0.25], [0.65, -0.95], [0.2, -1.2], [-0.1, -0.6]], 18);
const EYES: P2[] = [[-0.88, 0.45], [0.88, 0.45]], ER = 0.74;
const VEINS = Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2 + 0.4, r0 = ER * 0.98, r1 = ER * (0.55 + 0.1 * rnd(i + 40)); const m = (a + 0.25 * (rnd(i + 41) - 0.5)); return curve([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(m) * (r0 + r1) / 2, Math.sin(m) * (r0 + r1) / 2 + 0.05], [Math.cos(a + 0.12) * r1, Math.sin(a + 0.12) * r1]], 10); });
const Bird: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const u = urge(t), k = beatK(t), after = t >= BLINK && t < HOOK2 - 0.25;
  const open = t >= HOOK2 - 0.25 && t < HOOK2 ? backOut((t - HOOK2 + 0.25) / 0.25) : 1;
  const shake = u > 0.6 && t < BLINK ? (u - 0.6) * 0.09 * Math.sin(t * 70) : 0;
  const twitch = u > 0.4 && t < BLINK ? 0.16 * u * k : 0;
  const lid = after ? 1 : t >= HOOK2 - 0.25 && t < HOOK2 ? 1 - open : twitch;             // 0 open … 1 closed
  const sq = t >= BLINK && t < BLINK + 0.4 ? 0.12 * Math.sin(((t - BLINK) / 0.4) * Math.PI) : 0.02 * k;
  const body = "#1fb5a8", dark = "#0f6e6a", light = "#6ee6cf";
  return (
    <group position={[BC[0] + shake, BC[1], 0]} scale={[1 + sq, 1 - sq * 0.8, 1]}>
      {/* feet + tuft + wings */}
      {[-0.6, 0.6].map((x, i) => <Flat key={`ft${i}`} g={rrect(x - 0.3, -2.25, x + 0.3, -1.9, 0.12)} c="#ff8a1f" z={-0.05} />)}
      {[-0.25, 0, 0.25].map((x, i) => <Flat key={`tf${i}`} g={ribbon(curve([[x * 0.6, 1.85], [x * 1.3, 2.25], [x * 1.9 + 0.1 * Math.sin(4 * LW * t + i), 2.5]], 10), (q) => 0.16 * (1 - 0.6 * q))} c={i === 1 ? light : body} z={-0.04} />)}
      {[-1, 1].map((sd) => <group key={`wg${sd}`} position={[sd * 1.85, 0.05, -0.03]} scale={[sd, 1, 1]} rotation={[0, 0, sd * (0.15 + 0.12 * k + (u > 0.6 && t < BLINK ? 0.25 * Math.sin(t * 40) * (u - 0.6) : 0))]}><Flat g={WINGG} c={dark} /></group>)}
      <Flat g={BODYG} c={body} />
      <Flat g={SHADEG} c={dark} z={0.005} />
      <Flat g={BELLYG} c={light} z={0.01} />
      <Flat g={ribbon(curve([[-1.5, 1.4], [-1.98, 0.2], [-1.72, -1.2]], 20), () => 0.07)} c={light} z={0.012} />
      {/* cheeks get redder with the effort */}
      {[-1, 1].map((sd) => <Disc key={`ck${sd}`} at={[sd * 1.45, -0.45]} r={0.26} c={u > 0.5 ? "#ff4f8b" : "#ff8a7a"} z={0.02} o={0.75} />)}
      {/* beak */}
      <Flat g={blob([[-0.3, -0.42], [0, -0.3], [0.3, -0.42], [0, -0.8]], 12)} c="#ff8a1f" z={0.03} />
      <Flat g={blob([[-0.3, -0.42], [0, -0.3], [0.3, -0.42], [0, -0.5]], 12)} c="#ffbf6a" z={0.031} />
      {/* eyes */}
      {EYES.map((e, i) => (
        <group key={`ey${i}`} position={[e[0], e[1], 0.04]}>
          <Disc at={[0, 0]} r={ER + 0.09} c={dark} seg={40} />
          <Disc at={[0, 0]} r={ER} c={u > 0.75 && t < BLINK ? "#ffb3c9" : "#ffffff"} z={0.001} seg={40} />
          {VEINS.map((v, j) => (j < Math.floor(u * 8) && t < BLINK ? <Flat key={`v${j}`} g={ribbon(v, (q) => 0.035 * (1 - 0.6 * q))} c="#ff4f8b" z={0.002} /> : null))}
          <Disc at={[0, 0]} r={0.4 - 0.05 * u} c="#05060f" z={0.003} seg={28} />
          <Disc at={[-0.13, 0.15]} r={0.13} c="#ffffff" z={0.004} seg={14} />
          <Disc at={[0.14, -0.12]} r={0.06} c="#ffffff" z={0.004} seg={10} />
          {/* tears welling up */}
          {u > 0.55 && t < BLINK && <Flat g={blob([[-0.6, -0.42], [0, -0.3 - 0.25 * (u - 0.55)], [0.6, -0.42], [0.3, -0.7], [-0.3, -0.7]], 16)} c="#4a9aff" z={0.005} o={0.85} />}
          {/* eyelid */}
          {lid > 0.01 && <group position={[0, 0, 0.006]}>
            <Flat g={poly(Array.from({ length: 25 }, (_, j) => { const a = Math.PI - (j / 24) * Math.PI; return [Math.cos(a) * (ER + 0.02), Math.sin(a) * (ER + 0.02)] as P2; }).concat(Array.from({ length: 13 }, (_, j) => { const x = (ER + 0.02) * (1 - (j / 12) * 2); return [x, (ER + 0.02) * (1 - 2 * lid) * Math.sqrt(Math.max(0, 1 - (x / (ER + 0.02)) ** 2))] as P2; })))} c={body} />
          </group>}
          {after && <Flat g={ribbon(curve([[-0.55, -0.05], [0, 0.28], [0.55, -0.05]], 14), () => 0.09)} c={dark} z={0.008} />}
        </group>
      ))}
      {/* determined eyebrows */}
      {[-1, 1].map((sd) => <Flat key={`br${sd}`} g={ribbon([[sd * 0.3, after ? 1.55 : 1.22 - 0.1 * u], [sd * 1.45, after ? 1.7 : 1.62]], () => 0.1)} c={dark} z={0.06} />)}
      {/* sweat */}
      {u > 0.5 && t < BLINK && [0, 1, 2].map((i) => { const q = ((t * 0.8 + i / 3) % 1); return <Flat key={`sw${i}`} g={blob([[0, 0.14], [0.1, -0.04], [0, -0.14], [-0.1, -0.04]], 12)} c="#bfe6ff" z={0.07} p={[[-1.75, 1.7, -1.2][i], [1.5, 1.35, 1.75][i] - q * 0.9]} o={1 - q} />; })}
      {t >= BLINK && t - BLINK < 0.6 && <Glow map={map} at={[0, 0.4, 0.5]} size={5 + (t - BLINK) * 6} color="#fff08a" opacity={1 - (t - BLINK) / 0.6} />}
    </group>
  );
};
const Arena: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const u = urge(t), k = beatK(t), hot = u > 0.7 && t < BLINK, warm = u > 0.4 && t < BLINK;
  const tiers = hot ? ["#4a2a5a", "#8a1414", "#d94a7a"] : warm ? ["#1c2a6e", "#4a2a5a", "#7a4a6a"] : ["#121a4a", "#1c2a6e", "#2b3f99"];
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      <group position={[0, 0.2, -12]}>{Array.from({ length: 12 }, (_, i) => <Wedge key={`w${i}`} r={12} a0={2 * LW * t + (i * Math.PI) / 6} da={Math.PI / 12} c={hot ? "#4a2a5a" : "#121a4a"} z={0} />)}</group>
      {[5.0, 4.0, 3.1].map((r, i) => <Disc key={`h${i}`} at={[0, 0.1]} r={r * (1 + 0.03 * k * (i + 1))} c={tiers[i]} z={-10 + i * 0.1} seg={56} />)}
      <Glow map={map} at={[0, 0.1, -2]} size={8} color={hot ? "#ff3a2a" : "#7a4dff"} opacity={0.3 + 0.2 * k} />
      <Bird t={t} map={map} />
    </group>
  );
};

// ================= inside: the tear film on the cornea =================
const MU = -1.3, XS = Array.from({ length: 81 }, (_, i) => -3.4 + i * 0.085);
const DRYX = [0.9, -1.2, -0.1, 2.0];
const waterBase = (t: number) => (t < b(5) ? 0.85 : t < b(8.5) ? lerp(0.85, -0.25, (t - b(5)) / (b(8.5) - b(5))) : lerp(-0.25, -0.6, clamp01((t - b(8.5)) / (OUT - b(8.5)))));
const surf = (x: number, t: number) => {
  let y = waterBase(t) + 0.03 * Math.sin(x * 3 + 6 * LW * t * 3);
  (EV.dry as number[]).forEach((d, i) => { if (t >= d) { const g = ease((t - d) / 0.5) * (1 + 0.25 * clamp01((t - d - 0.5) / 4)); y -= (waterBase(t) - MU + 0.1) * Math.min(1.15, g) * Math.exp(-(((x - DRYX[i]) / (0.42 + 0.12 * clamp01((t - d) / 5))) ** 2)); } });
  return Math.max(MU, y);
};
const CELLS = Array.from({ length: 4 * 9 }, (_, i) => { const row = Math.floor(i / 9), c = i % 9; return { x: -3.6 + c * 0.9 + (row % 2) * 0.45, y: MU - 0.62 - row * 0.74 }; });
const ENDX = [-2.1, -1.2, -0.1, 0.9, 2.0];
const FIBRES = ENDX.map((x, i) => curve([[x, MU - 0.42], [x + 0.12 * (i % 2 ? 1 : -1), MU - 1.4], [x * 0.55, MU - 2.5], [-0.2, MU - 3.4], [-0.3, MU - 4.3]], 24));
const dryOf = (i: number) => DRYX.findIndex((d) => Math.abs(d - ENDX[i]) < 0.2);
const TearFilm: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const tin = t - IN, pop = (d: number) => Math.max(0.001, backOut((tin - d) / 0.35));
  const ys = XS.map((x) => surf(x, t));
  const water = useMemo(() => 0, []); void water;
  const wpts: P2[] = [...XS.map((x, i) => [x, ys[i]] as P2), [3.4, MU], [-3.4, MU]];
  const oilpts: P2[] = XS.map((x, i) => [x, ys[i] + 0.07]);
  const alarmOn = t >= b(8.5);
  const nAl = (EV.alarm as number[]).filter((a) => t >= a).length, lastAl = nAl > 0 ? t - (EV.alarm as number[])[nAl - 1] : 9;
  return (
    <group>
      <Flat g={rrect(-8, -9, 8, 9, 0)} c="#121a4a" z={-6} />
      {STARS.slice(0, 26).map((s, i) => <Disc key={`s${i}`} at={[s.x * 0.25, 1.6 + Math.abs(s.y) * 0.12]} r={s.s * 0.8} c="#2b3f99" z={-5} seg={6} />)}
      {/* cornea: surface cells */}
      <Flat g={rrect(-8, -9, 8, MU - 0.2, 0)} c="#d94a7a" z={-3} />
      {CELLS.map((c, i) => <group key={`c${i}`} position={[c.x, c.y, -2.9]} scale={pop(0.1 + (i % 9) * 0.02)}>
        <Flat g={rrect(-0.41, -0.33, 0.41, 0.33, 0.16)} c="#ffb3c9" />
        <Disc at={[0.05, -0.02]} r={0.12} c="#ff8a7a" z={0.001} seg={10} />
      </group>)}
      {/* mucus (the glue) with tiny hairs */}
      <Flat g={rrect(-8, MU - 0.22, 8, MU, 0)} c="#ff4f8b" z={-2.5} />
      {Array.from({ length: 40 }, (_, i) => <Flat key={`mv${i}`} g={rrect(-3.5 + i * 0.18, MU, -3.44 + i * 0.18, MU + 0.1, 0)} c="#ff4f8b" z={-2.4} />)}
      {/* water */}
      <Flat g={poly(wpts)} c="#1f4abf" z={-2} />
      <Flat g={poly([...XS.map((x, i) => [x, ys[i]] as P2), ...XS.map((x, i) => [x, Math.max(MU, ys[i] - 0.28)] as P2).reverse()])} c="#4a9aff" z={-1.9} />
      {Array.from({ length: 14 }, (_, i) => { const x = -3 + ((i * 0.47 + 4 * LW * t * 0.4) % 6), y0 = MU + 0.15 + rnd(i + 60) * 1.6; const top = surf(x, t); return y0 < top - 0.15 ? <Disc key={`bb${i}`} at={[x, y0 + 0.04 * Math.sin(8 * LW * t + i)]} r={0.04 + 0.03 * (i % 3)} c="#bfe6ff" z={-1.8} seg={8} o={0.8} /> : null; })}
      {/* oil: a thin skin that breaks where the film is gone */}
      <Flat g={ribbon(oilpts, (q) => { const i = Math.round(q * 80); return ys[i] > MU + 0.12 ? 0.07 : 0.001; })} c="#ffd23f" z={-1.7} />
      {/* vapour puffs: the water leaves */}
      {(EV.evap as number[]).map((e, i) => { const a = t - e; if (a < 0 || a > 1.1) return null; const x = (rnd(i + 90) - 0.5) * 5.2, y = surf(x, t) + 0.25 + a * 1.1; return (
        <Flat key={`ev${i}`} g={ribbon(curve([[x, y], [x + 0.12, y + 0.18], [x - 0.08, y + 0.36], [x + 0.06, y + 0.55]], 10), () => 0.05)} c="#bfe6ff" z={-1.5} o={0.9 * (1 - a / 1.1)} />); })}
      {/* dry spots opening */}
      {(EV.dry as number[]).map((d, i) => t >= d && t - d < 0.6 ? <React.Fragment key={`dr${i}`}>
        <mesh position={[DRYX[i], MU + 0.1, 0.2]} scale={0.3 + (t - d) * 2.2}><ringGeometry args={[0.85, 1, 24]} /><meshBasicMaterial color="#ffffff" transparent opacity={1 - (t - d) / 0.6} /></mesh>
        <Glow map={map} at={[DRYX[i], MU + 0.1, 0.2]} size={1.6} color="#fff08a" opacity={1 - (t - d) / 0.6} />
      </React.Fragment> : null)}
      {/* nerve endings in the cornea: the ones under a dry spot fire */}
      {FIBRES.map((f, i) => { const di = dryOf(i), dry = di >= 0 && t >= (EV.dry as number[])[di], fire = dry && alarmOn; const k2 = fire ? Math.exp(-lastAl / 0.18) : 0; return (
        <group key={`nf${i}`} scale={[1, pop(0.5), 1]}>
          <Flat g={ribbon(f, (q) => 0.05 + 0.03 * q)} c={fire ? "#ffd23f" : dry ? "#b48cff" : "#7a4dff"} z={-2.6} />
          <Disc at={f[0]} r={0.13 + 0.07 * k2} c={fire ? "#ff3a2a" : dry ? "#ffd23f" : "#b48cff"} z={-2.55} seg={12} />
          {fire && <Glow map={map} at={[f[0][0], f[0][1], 0.1]} size={0.8 + 1.0 * k2} color="#ff3a2a" opacity={0.5 + 0.5 * k2} />}
          {fire && [0, 1, 2].map((j) => { const q = ((t - b(8.5)) * 1.3 + j / 3 + i * 0.17) % 1; const p = f[Math.floor(q * (f.length - 1))]; return <Disc key={j} at={p} r={0.08} c="#ffffff" z={-2.5} seg={8} />; })}
        </group>); })}
    </group>
  );
};

// ================= tags, camera, labels, HUD =================
type Tag = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const EYE_TAGS: Tag[] = [
  { txt: "OIL", at: (t) => [-1.9, waterBase(t) + 0.2, 0.5], from: IN + 0.9, to: b(6), col: "#ffd23f" },
  { txt: "WATER", at: (t) => [0.2, (waterBase(t) + MU) / 2 + 0.2, 0.5], from: IN + 1.3, to: b(6), col: "#4a9aff" },
  { txt: "MUCUS (THE GLUE)", at: [1.3, MU - 0.05, 0.5], from: IN + 1.7, to: b(6), col: "#ff4f8b" },
  { txt: "CORNEA", at: [-1.7, MU - 0.5, 0.5], from: IN + 2.1, to: b(6), col: "#ffb3c9" },
  { txt: "DRY SPOT", at: [DRYX[0], MU + 0.55, 0.5], from: (EV.dry as number[])[0] + 0.1, to: b(8.5), col: "#fff08a" },
  { txt: "NERVE ENDINGS", at: [-1.2, MU - 0.7, 0.5], from: b(8.5) + 0.3, to: OUT, col: "#ffd23f" },
  { txt: "~7,000 PER MM²", at: [1.1, MU - 2.2, 0.5], from: b(9.5), to: OUT, col: "#ff8a7a" },
];
const FACE_TAGS: Tag[] = [
  { txt: "COMMENT YOUR TIME ⏱️", at: [0, -2.75, 0.5], from: BLINK + 1.2, to: HOOK2, col: "#fff08a" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[] }> = ({ t, cam, tags }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 26, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.35, 29] as V3, l: [0, 0.35, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: GO + 0.4, ...HOME },
  { t: b(2.5), p: [0.5, 0.2, 17], l: [0.5, 0.2, 0] },
  { t: IN - 0.35, p: [0.88, 0.1, 6], l: [0.88, 0.1, 0] },
  { t: IN, p: [0.88, 0.1, 1.4], l: [0.88, 0.1, 0] },
];
const CAM_E: CamKey[] = [
  { t: IN, p: [0, -0.6, 6], l: [0, -0.6, 0] },
  { t: IN + 0.9, p: [0, -0.7, 26], l: [0, -0.7, 0] },
  { t: b(6), p: [0, -0.7, 25], l: [0, -0.7, 0] },
  { t: b(7), p: [0.3, -0.5, 19], l: [0.3, -0.5, 0] },
  { t: b(8.4), p: [0, -0.6, 21], l: [0, -0.6, 0] },
  { t: b(9.2), p: [0, -2.0, 21], l: [0, -2.0, 0] },
  { t: OUT - 0.5, p: [0, -2.2, 19], l: [0, -2.2, 0] },
  { t: OUT, p: [0, -2.0, 2.5], l: [0, -2.0, 0] },
];
const CAM_F: CamKey[] = [
  { t: OUT, p: [0, 0.2, 9], l: [0, 0.2, 0] },
  { t: OUT + 0.8, p: [0, 0.3, 24], l: [0, 0.3, 0] },
  { t: BLINK - 0.3, p: [0, 0.1, 19], l: [0, 0.1, 0] },
  { t: BLINK + 0.5, p: [0, 0.35, 30], l: [0, 0.35, 0] },
  { t: HOOK2, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : t < OUT ? camAt(CAM_E, t) : camAt(CAM_F, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - IN) < 1 ? "#bfe6ff" : "#ff4f8b");

const TOPZ: [number, number] = [540, 400];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "STARING CONTEST" }], [{ t: "DON'T BLINK.", c: "#ffd23f" }], [{ t: "BEAT ME 👁️" }]];
const LABELS: LabelDef[] = [
  Lb(0, GO, "#ffd23f", HOOK, true),
  Lb(GO, IN + 0.3, "#6ee6cf", [[{ t: "EACH BLINK WIPES" }], [{ t: "FRESH TEARS OVER", c: "#4a9aff" }], [{ t: "YOUR EYE 💧" }]]),
  Lb(IN + 0.3, b(6), "#4a9aff", [[{ t: "THAT TEAR FILM HAS" }], [{ t: "3 LAYERS, ONLY", c: "#4a9aff" }], [{ t: "0.003 MM THICK" }]]),
  Lb(b(6), b(8.5), "#bfe6ff", [[{ t: "NO BLINK = THE" }], [{ t: "WATER EVAPORATES", c: "#bfe6ff" }], [{ t: "→ DRY SPOTS 🏜️", c: "#fff08a" }]]),
  Lb(b(8.5), OUT, "#ff3a2a", [[{ t: "DRY SPOTS HIT THE" }], [{ t: "DENSEST NERVES", c: "#ffd23f" }], [{ t: "IN YOUR BODY ⚡" }]]),
  Lb(OUT, BLINK, "#ff3a2a", [[{ t: "YOUR BRAIN YELLS:" }], [{ t: "BLINK! BLINK!", c: "#ff3a2a" }], [{ t: "HOLD ON... 😤" }]]),
  Lb(BLINK, HOOK2, "#fff08a", [[{ t: "I BLINKED." }], [{ t: "YOU WIN 🏆", c: "#fff08a" }], [{ t: "30 S = 8 BLINKS" }]]),
  Lb(HOOK2, D + 0.01, "#ffd23f", HOOK, true),
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
/** game HUD: stopwatch + "urge to blink" gauge */
const Hud: React.FC<{ t: number }> = ({ t }) => {
  if (t < GO || t >= HOOK2) return null;
  const k = t > HOOK2 - 0.25 ? clamp01((HOOK2 - t) / 0.25) : backOut((t - GO) / 0.3);
  const sw = Math.min(30, t - GO), u = urge(t), won = t >= BLINK;
  const n = 12, lit = Math.round(u * n);
  const flash = u > 0.85 && !won && Math.sin(t * 24) > 0;
  return (
    <div style={{ position: "absolute", left: 540, top: 1470, transform: `translate(-50%, -50%) scale(${k})`, width: 940, background: "rgba(9,13,43,0.94)", border: `8px solid ${won ? "#fff08a" : flash ? "#ff3a2a" : "#ffffff"}`, boxShadow: "8px 8px 0 #05060f", padding: "22px 26px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div style={{ ...px, fontSize: 30, color: won ? "#fff08a" : "#ffffff" }}>{won ? "YOU HELD" : "TIME"}</div>
        <div style={{ ...px, fontSize: 58, color: "#ffd23f" }}>{sw.toFixed(1)}<span style={{ fontSize: 30 }}> / 30 S</span></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ ...px, fontSize: 24, width: 250, lineHeight: 1.3 }}>URGE TO<br />BLINK</div>
        <div style={{ display: "flex", gap: 7, flex: 1 }}>
          {Array.from({ length: n }, (_, i) => <div key={i} style={{ flex: 1, height: 50, background: i < lit ? (i < 5 ? "#3fcf6a" : i < 9 ? "#ffd23f" : "#ff3a2a") : "#1c2a6e", border: "5px solid #05060f" }} />)}
        </div>
      </div>
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const BlinkVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/19-blink/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={BLINK_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "face" ? <Arena t={t} map={glow} /> : <TearFilm t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#6ee6cf" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} tags={s === "eye" ? EYE_TAGS : FACE_TAGS} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
      <Hud t={t} />
    </AbsoluteFill>
  );
};
