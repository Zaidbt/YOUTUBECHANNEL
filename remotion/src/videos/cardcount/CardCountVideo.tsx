/**
 * Video 021 · CAN YOU COUNT CARDS? — the viewer plays 3 levels of Hi-Lo counting, then learns why it works.
 * Hi-Lo: 2-6 = +1, 7-9 = 0, 10-J-Q-K-A = -1; the running count tells how rich the remaining shoe is in tens and aces.
 * A high count favours the player (more blackjacks paid 3:2, dealer busts more): the edge moves by ~0.5 % per true
 * count, so from a ~0.5 % house edge to roughly a 1 % player edge — counters then raise their bets. Counting is not
 * illegal, but casinos can ban you.
 * LEVEL 1: a card every 2 beats with hints · LEVEL 2: a card per beat, no hints · LEVEL 3: casino speed (a card every 3 sixteenths), answer NOT revealed (viewers comment it).
 * 43.8 s loop, 126 BPM electro swing (cardcount.json + music.wav from videos/21-cardcount/build.py): every card is a note.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./cardcount.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type Card = { t: number; r: string; s: string; v: number };
const D = EV.duration, BAR = EV.bar, BEAT = BAR / 4;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const LEVELS = EV.levels as { cards: Card[]; count: number }[];
const LT = EV.l as number[], ASK = EV.ask as number[], REVEAL = EV.reveal as number[], SHOE = EV.shoe as number[];
const RULES = EV.rules, WHY = EV.why, OUTRO = EV.outro, AGAIN = EV.again, EX = EV.ex as number[], DEMO = EV.demo;
const LEND = [ASK[0], ASK[1], ASK[2]];

export const CARD_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0", "#103a1c", "#9aa0b8", "#3a3f5a",
];
const BG = "#090d2b";
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);
const levelAt = (t: number) => (t >= LT[2] && t < OUTRO ? 2 : t >= LT[1] && t < WHY ? 1 : t >= LT[0] && t < LT[1] ? 0 : -1);
const VCOL = (v: number) => (v > 0 ? "#3fcf6a" : v < 0 ? "#ff3a2a" : "#9aa0b8");
const sgn = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// ================= shapes =================
const CW = 1.4, CH = 1.96, CARD_C: P2 = [0, -0.85];
const CARD_G = rrect(-CW / 2, -CH / 2, CW / 2, CH / 2, 0.14), CARD_IN = rrect(-CW / 2 + 0.07, -CH / 2 + 0.07, CW / 2 - 0.07, CH / 2 - 0.07, 0.09);
const HEART = blob([[0, -0.3], [0.3, 0.02], [0.3, 0.2], [0.15, 0.3], [0, 0.18], [-0.15, 0.3], [-0.3, 0.2], [-0.3, 0.02]], 24);
const DIAMOND = blob([[0, 0.34], [0.24, 0], [0, -0.34], [-0.24, 0]], 4);
const Suit: React.FC<{ s: string; c: string; z?: number }> = ({ s, c, z = 0.003 }) => (
  <group position={[0, -0.42, z]} scale={1.15}>
    {s === "H" && <Flat g={HEART} c={c} />}
    {s === "D" && <Flat g={DIAMOND} c={c} />}
    {s === "S" && <><group rotation={[0, 0, Math.PI]} position={[0, 0.02, 0]}><Flat g={HEART} c={c} /></group><Flat g={blob([[-0.14, -0.34], [0, -0.08], [0.14, -0.34]], 3)} c={c} /></>}
    {s === "C" && <><Disc at={[0, 0.14]} r={0.16} c={c} seg={16} /><Disc at={[-0.17, -0.06]} r={0.16} c={c} seg={16} /><Disc at={[0.17, -0.06]} r={0.16} c={c} seg={16} /><Flat g={blob([[-0.12, -0.34], [0, -0.02], [0.12, -0.34]], 3)} c={c} /></>}
  </group>
);
const CardFace: React.FC<{ s?: string; back?: boolean; gold?: boolean }> = ({ s, back, gold }) => (
  <group>
    <Flat g={rrect(-CW / 2 + 0.06, -CH / 2 - 0.08, CW / 2 + 0.06, CH / 2 - 0.08, 0.14)} c="#05060f" z={-0.004} o={0.5} />
    <Flat g={CARD_G} c={gold ? "#ffd23f" : back ? "#d94a7a" : "#ffffff"} />
    {(back || gold) && <Flat g={CARD_IN} c={gold ? "#c8a010" : "#ff4f8b"} z={0.001} />}
    {back && !gold && [-0.4, 0, 0.4].map((y, i) => <Flat key={i} g={DIAMOND} c="#ffb3c9" z={0.002} p={[0, y * 1.2]} />)}
    {!back && !gold && s && <Suit s={s} c={s === "H" || s === "D" ? "#ff3a2a" : "#05060f"} />}
  </group>
);
// the dealer: a round teal bird with a visor and a bow tie
const BODYG = blob([[0, 1.95], [1.45, 1.5], [2.05, 0.2], [1.75, -1.35], [0, -2.0], [-1.75, -1.35], [-2.05, 0.2], [-1.45, 1.5]], 48);
const WINGG = blob([[0, 0], [0.55, -0.25], [0.65, -0.95], [0.2, -1.2], [-0.1, -0.6]], 18);
const Dealer: React.FC<{ t: number; deal: number; happy: boolean }> = ({ t, deal, happy }) => {
  const k = beatK(t), blink = (t % (BAR * 2)) > BAR * 2 - 0.1;
  const look: P2 = [0, -0.16];
  return (
    <group position={[0, 1.32, -0.5]} scale={0.6 * (1 + 0.02 * k)}>
      {[-1, 1].map((sd) => <group key={`wg${sd}`} position={[sd * 1.85, -0.2, -0.03]} scale={[sd, 1, 1]} rotation={[0, 0, sd * (0.15 + 0.1 * k) - (sd > 0 ? 0 : 1) * 0 + (sd < 0 ? -1 : 1) * 0.9 * deal * (sd < 0 ? 1 : 0)]}><Flat g={WINGG} c="#0f6e6a" /></group>)}
      <Flat g={BODYG} c="#1fb5a8" />
      <Flat g={blob([[1.2, 1.55], [2.0, 0.3], [1.75, -1.3], [0.6, -1.95], [1.35, -1.0], [1.6, 0.2]], 24)} c="#0f6e6a" z={0.005} />
      <Flat g={blob([[0, -0.75], [1.15, -1.0], [1.0, -1.65], [0, -1.9], [-1.0, -1.65], [-1.15, -1.0]], 30)} c="#6ee6cf" z={0.01} />
      {/* bow tie */}
      <Flat g={blob([[0, -1.0], [-0.6, -0.7], [-0.6, -1.4]], 3)} c="#ff3a2a" z={0.03} /><Flat g={blob([[0, -1.0], [0.6, -0.7], [0.6, -1.4]], 3)} c="#ff3a2a" z={0.03} /><Disc at={[0, -1.05]} r={0.16} c="#8a1414" z={0.031} seg={12} />
      {/* eyes */}
      {[-0.82, 0.82].map((x, i) => (
        <group key={`ey${i}`} position={[x, 0.35, 0.04]}>
          <Disc at={[0, 0]} r={0.74} c="#0f6e6a" seg={36} />
          <Disc at={[0, 0]} r={0.66} c="#ffffff" z={0.001} seg={36} />
          {happy ? <Flat g={ribbon(curve([[-0.45, -0.1], [0, 0.25], [0.45, -0.1]], 12), () => 0.1)} c="#05060f" z={0.003} />
            : blink ? <Flat g={rrect(-0.5, -0.05, 0.5, 0.05, 0.03)} c="#05060f" z={0.003} />
            : <><Disc at={look} r={0.36} c="#05060f" z={0.003} seg={24} /><Disc at={[look[0] - 0.12, look[1] + 0.13]} r={0.12} c="#ffffff" z={0.004} seg={12} /></>}
        </group>
      ))}
      <Flat g={blob([[-0.28, -0.4], [0, -0.28], [0.28, -0.4], [0, -0.72]], 12)} c="#ff8a1f" z={0.03} />
      {/* dealer visor */}
      <Flat g={blob([[-1.75, 1.05], [0, 1.5], [1.75, 1.05], [1.95, 0.75], [0, 1.15], [-1.95, 0.75]], 24)} c="#1f8a4a" z={0.06} />
      <Flat g={ribbon(curve([[-1.5, 1.3], [0, 1.72], [1.5, 1.3]], 16), () => 0.14)} c="#05060f" z={0.061} />
    </group>
  );
};
const STARS = Array.from({ length: 60 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));
const Wedge: React.FC<{ r: number; a0: number; da: number; c: string; z: number }> = ({ r, a0, da, c, z }) => (
  <mesh position={[0, 0, z]}><circleGeometry args={[r, 8, a0, da]} /><meshBasicMaterial color={c} /></mesh>
);
const railY = (x: number) => 0.55 - 0.05 * x * x;
const TABLE = blob([...Array.from({ length: 21 }, (_, i) => { const x = -4 + i * 0.4; return [x, railY(x)] as P2; }), [4, -7], [-4, -7]], 60);
const RAIL = ribbon(Array.from({ length: 41 }, (_, i) => { const x = -4 + i * 0.2; return [x, railY(x)] as P2; }), () => 0.2);
const CHIPS: { p: P2; c: string; n: number }[] = [{ p: [-2.2, -0.1], c: "#ff3a2a", n: 4 }, { p: [-1.75, -0.35], c: "#4a9aff", n: 3 }, { p: [2.2, -0.15], c: "#ffd23f", n: 5 }, { p: [1.8, -0.4], c: "#b48cff", n: 2 }];
/** which card is in the middle, and the piles */
const cardState = (t: number) => {
  const lv = levelAt(t); if (lv < 0) return null;
  const cs = LEVELS[lv].cards, i = cs.filter((c) => t >= c.t - 0.09).length - 1;
  return { lv, cs, i, done: cs.filter((c) => t >= c.t).length };
};
const Scene: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), st = cardState(t), half = Math.floor(t / (BEAT / 2));
  const ri = REVEAL.findIndex((r, i) => t >= ASK[i] && t < (i < 2 ? ASK[i] + BAR : OUTRO)), asking = ri >= 0 && t < REVEAL[ri], revealed = ri >= 0 && t >= REVEAL[ri];
  const hook = t < RULES || t >= AGAIN, rules = t >= RULES && t < LT[0], why = t >= WHY && t < LT[2], outro = t >= OUTRO && t < AGAIN;
  const cur = st && st.i >= 0 && t < LEND[st.lv] ? st.cs[st.i] : null;
  const dealK = cur ? Math.exp(-Math.max(0, t - cur.t + 0.09) / 0.12) : 0;
  const inK = cur ? clamp01((t - cur.t + 0.09) / 0.09) : 0;
  const shoeOut = SHOE.filter((s) => t >= s).length;
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      <group position={[0, 1.4, -12]}>{Array.from({ length: 12 }, (_, i) => <Wedge key={`w${i}`} r={12} a0={2 * LW * t + (i * Math.PI) / 6} da={Math.PI / 12} c={revealed ? "#4a2a5a" : "#121a4a"} z={0} />)}</group>
      {[4.6, 3.7, 2.9].map((r, i) => <Disc key={`h${i}`} at={[0, 1.5]} r={r * (1 + 0.03 * k * (i + 1))} c={(revealed ? ["#4a2a5a", "#7a4a6a", "#d94a7a"] : ["#121a4a", "#1c2a6e", "#2b3f99"])[i]} z={-10 + i * 0.1} seg={56} />)}
      <Glow map={map} at={[0, 1.5, -2]} size={7} color={revealed ? "#ffd23f" : "#7a4dff"} opacity={0.3 + 0.2 * k} />
      <Dealer t={t} deal={dealK} happy={revealed || outro} />
      {/* table: felt + rail with chasing bulbs + chips */}
      <Flat g={TABLE} c="#1f8a4a" z={-0.3} />
      <Flat g={blob([[-2.4, -0.3], [0, 0.0], [2.4, -0.3], [2.0, -3.6], [-2.0, -3.6]], 30)} c="#0f6e6a" z={-0.29} o={0.45} />
      {[-2.1, -0.7, 0.7, 2.1].map((x, i) => <group key={`fm${i}`} position={[x, -4.1 + 0.12 * (i % 2), -0.285]} scale={1.5} rotation={[0, 0, (i - 1.5) * 0.12]}><Flat g={i % 2 ? DIAMOND : HEART} c="#0f6e6a" /></group>)}
      <Flat g={ribbon(curve([[-2.6, -3.1], [0, -3.45], [2.6, -3.1]], 30), () => 0.05)} c="#9bf08a" z={-0.285} o={0.5} />
      <Flat g={RAIL} c="#c85a10" z={-0.28} />
      {Array.from({ length: 15 }, (_, i) => { const x = -2.8 + i * 0.4, on = (i + half) % 3 === 0; return <React.Fragment key={`bl${i}`}><Disc at={[x, railY(x)]} r={0.075} c={on ? "#fff08a" : "#8a1414"} z={-0.27} seg={10} />{on && <Glow map={map} at={[x, railY(x), -0.2]} size={0.7} color="#ffd23f" opacity={0.8} />}</React.Fragment>; })}
      {CHIPS.map((ch, i) => Array.from({ length: ch.n }, (_, j) => <group key={`ch${i}-${j}`} position={[ch.p[0], ch.p[1] + j * 0.09 + (j === ch.n - 1 ? 0.06 * k : 0), -0.2 + j * 0.001]}><Flat g={rrect(-0.26, -0.06, 0.26, 0.06, 0.05)} c={ch.c} /><Flat g={rrect(-0.08, -0.06, 0.08, 0.06, 0)} c="#ffffff" z={0.001} /></group>))}
      {/* hook: a fan of cards with the ace on top */}
      {hook && <group position={[CARD_C[0], CARD_C[1], 0]}>
        {[-2, -1, 1, 2].map((i) => <group key={`fn${i}`} position={[i * 0.42, -0.06 * i * i, -0.05 + 0.001 * i]} rotation={[0, 0, -i * 0.2]} scale={0.92}><CardFace back /></group>)}
        <group scale={1 + 0.05 * k} rotation={[0, 0, 0.03 * Math.sin(2 * LW * t)]}><CardFace s="S" /></group>
      </group>}
      {/* the rules: three example cards */}
      {rules && [-1.55, 0, 1.55].map((x, i) => { const a = t - EX[i]; return a < 0 ? null : <group key={`rl${i}`} position={[x, CARD_C[1] + 0.1, 0]} scale={0.78 * Math.max(0.001, backOut(a / 0.25))}><CardFace s={["H", "C", "D"][i]} /></group>; })}
      {/* the game: discard pile + the current card */}
      {st && st.done > 0 && <group position={[2.05, -1.9, -0.1]} scale={0.42}>{Array.from({ length: Math.min(st.done, 8) }, (_, j) => <group key={j} position={[0.02 * j, 0.05 * j, 0.001 * j]} rotation={[0, 0, 0.15 * Math.sin(j * 2.1)]}><CardFace back /></group>)}</group>}
      {cur && <group position={[lerp(-2.4, CARD_C[0], ease(inK)), CARD_C[1] + 0.25 * Math.sin(inK * Math.PI), 0.1]} rotation={[0, 0, lerp(-0.5, 0, inK)]} scale={[Math.max(0.05, inK) * (1 + 0.06 * dealK), 1 + 0.06 * dealK, 1]}>
        <CardFace s={cur.s} />
      </group>}
      {cur && t >= cur.t && t - cur.t < 0.3 && <Glow map={map} at={[CARD_C[0], CARD_C[1], 0.3]} size={3.2} color={VCOL(cur.v)} opacity={0.5 * (1 - (t - cur.t) / 0.3)} />}
      {/* "your count?" → the answer card */}
      {ri >= 0 && <group position={[CARD_C[0], CARD_C[1], 0.1]} scale={revealed ? 1 + 0.25 * Math.exp(-(t - REVEAL[ri]) / 0.15) : 1 + 0.06 * Math.sin(t * 18)}>
        <CardFace gold />
        {revealed && t - REVEAL[ri] < 0.6 && <mesh position={[0, 0, 0.05]} scale={0.6 + (t - REVEAL[ri]) * 5}><ringGeometry args={[0.9, 1, 32]} /><meshBasicMaterial color="#fff08a" transparent opacity={1 - (t - REVEAL[ri]) / 0.6} /></mesh>}
        <Glow map={map} at={[0, 0, -0.05]} size={3.5} color="#ffd23f" opacity={asking ? 0.5 : 0.8} />
      </group>}
      {/* why it works: the shoe. low cards (teal) leave → what is left is rich in tens and aces (pink) */}
      {why && <group position={[0, -0.95, 0.1]} scale={Math.max(0.001, backOut((t - WHY) / 0.35))}>
        <Flat g={rrect(-0.95, -1.2, 0.95, 1.2, 0.12)} c="#05060f" o={0.75} />
        <Flat g={rrect(-0.95, -1.2, 0.95, 1.2, 0.12)} c="#3a3f5a" z={-0.002} />
        {Array.from({ length: 14 }, (_, j) => { const low = j % 2 === 0, idx = Math.floor(j / 2), gone = low && idx < shoeOut, a = low && idx < 6 ? t - SHOE[idx] : -1; const y = -1.02 + j * 0.155;
          if (gone && a > 0.35) return null;
          return <Flat key={`sh${j}`} g={rrect(-0.78, -0.055, 0.78, 0.055, 0.03)} c={low ? "#6ee6cf" : "#ff4f8b"} p={[gone ? ease(a / 0.35) * 2.6 : 0, y + (gone ? 0.5 * Math.sin((a / 0.35) * Math.PI) : 0)]} z={0.01} />; })}
      </group>}
      {/* outro: winnings */}
      {outro && Array.from({ length: 10 }, (_, i) => { const a = ((t - OUTRO) * 0.9 + i / 10) % 1; return <group key={`cn${i}`} position={[(rnd(i + 70) - 0.5) * 4.5, 1.5 - a * 4.5, 0.4]} rotation={[0, 0, a * 6 + i]}><Flat g={rrect(-0.2, -0.05, 0.2, 0.05, 0.04)} c={["#ffd23f", "#ff3a2a", "#4a9aff"][i % 3]} /></group>; })}
      {outro && <group position={[CARD_C[0], CARD_C[1], 0]} scale={1 + 0.05 * k}><CardFace s="H" /></group>}
    </group>
  );
};

// ================= overlays: card ranks, hints, labels, HUD =================
const HOME = { p: [0, 0.2, 29] as V3, l: [0, 0.2, 0] as V3 };
const at = (x: number, y: number, z: number) => ({ p: [x, y, z] as V3, l: [x, y, 0] as V3 });
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: RULES, ...HOME }, { t: LT[0] - 0.3, ...HOME },
  { t: LT[0] + 0.6, ...at(0, -0.1, 26) }, { t: ASK[0] - 0.2, ...at(0, -0.1, 26) }, { t: REVEAL[0], ...at(0, -0.3, 22) }, { t: LT[1], ...at(0, -0.1, 26) },
  { t: ASK[1] - 0.2, ...at(0, -0.15, 25) }, { t: REVEAL[1], ...at(0, -0.3, 22) }, { t: WHY + 0.5, ...at(0, -0.1, 26) }, { t: LT[2] - 0.3, ...at(0, -0.1, 26) },
  { t: LT[2] + 0.5, ...at(0, -0.25, 23.5) }, { t: ASK[2] - 0.2, ...at(0, -0.25, 23.5) }, { t: REVEAL[2], ...at(0, -0.35, 21) },
  { t: OUTRO + 0.4, ...at(0, 0.1, 27) }, { t: AGAIN, ...HOME }, { t: D, ...HOME },
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
const Overlays: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => {
  const [cx, cy] = project([CARD_C[0], CARD_C[1] + 0.42, 0.1], cam, FOV), unit = project([1, 0, 0], cam, FOV)[0] - project([0, 0, 0], cam, FOV)[0];
  const st = cardState(t), cur = st && st.i >= 0 && t < LEND[st.lv] ? st.cs[st.i] : null, inK = cur ? clamp01((t - cur.t + 0.09) / 0.09) : 0;
  const ri = REVEAL.findIndex((r, i) => t >= ASK[i] && t < (i < 2 ? ASK[i] + BAR : OUTRO)), revealed = ri >= 0 && t >= REVEAL[ri];
  const hook = t < RULES || t >= AGAIN, rules = t >= RULES && t < LT[0], outro = t >= OUTRO && t < AGAIN;
  const rank = (txt: string, red: boolean, x: number, y: number, size: number, sx = 1) => (
    <div style={{ ...px, position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scaleX(${sx})`, fontSize: size, color: red ? "#ff3a2a" : "#05060f", whiteSpace: "nowrap" }}>{txt}</div>);
  return (
    <>
      {hook && rank("A", false, cx, cy, unit * 0.62)}
      {outro && rank("A", true, cx, cy, unit * 0.62)}
      {rules && [["5", "+1", 1], ["8", "0", 0], ["K", "-1", -1]].map(([r, v, n], i) => { const a = t - EX[i]; if (a < 0) return null; const [x, y] = project([[-1.55, 0, 1.55][i], CARD_C[1] + 0.1 + 0.33, 0.1], cam, FOV), [, y2] = project([0, CARD_C[1] - 0.95, 0.1], cam, FOV); return (
        <React.Fragment key={i}>
          {rank(r as string, i === 0 || i === 2, x, y, unit * 0.48)}
          <div style={{ ...px, position: "absolute", left: x, top: y2, transform: `translate(-50%, -50%) scale(${backOut((a - 0.2) / 0.25)})`, fontSize: 54, color: VCOL(n as number), background: "rgba(9,13,43,0.94)", border: `6px solid ${VCOL(n as number)}`, padding: "14px 18px 8px" }}>{v}</div>
        </React.Fragment>); })}
      {cur && inK > 0.3 && rank(cur.r, cur.s === "H" || cur.s === "D", cx, cy, unit * (cur.r === "10" ? 0.5 : 0.62), inK)}
      {/* level 1 hints */}
      {cur && st && st.lv === 0 && t >= cur.t && (() => { const [hx, hy] = project([CARD_C[0] + 1.25, CARD_C[1] + 0.3, 0.1], cam, FOV); return (
        <div style={{ ...px, position: "absolute", left: hx, top: hy, transform: `translate(-50%, -50%) scale(${backOut((t - cur.t) / 0.2)})`, fontSize: 60, color: VCOL(cur.v), background: "rgba(9,13,43,0.94)", border: `6px solid ${VCOL(cur.v)}`, padding: "16px 18px 8px" }}>{cur.v === 0 ? "0" : sgn(cur.v)}</div>); })()}
      {ri >= 0 && (() => { const [qx, qy] = project([CARD_C[0], CARD_C[1], 0.1], cam, FOV); return (
        <div style={{ ...px, position: "absolute", left: qx, top: qy, transform: `translate(-50%, -50%) scale(${revealed ? 1 + 0.4 * Math.exp(-(t - REVEAL[ri]) / 0.15) : 1})`, fontSize: unit * (revealed && ri < 2 ? 0.55 : 0.8), color: "#05060f" }}>{revealed && ri < 2 ? sgn(LEVELS[ri].count) : "?"}</div>); })()}
    </>
  );
};
const TOPZ: [number, number] = [540, 330];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "CAN YOU COUNT" }], [{ t: "CARDS LIKE A", c: "#ffd23f" }], [{ t: "CASINO PRO? 🃏" }]];
const ASKL = (i: number) => Lb(ASK[i], i < 2 ? ASK[i] + BAR : OUTRO, "#ffd23f", [[{ t: `LEVEL ${i + 1} DONE` }], [{ t: "WHAT'S YOUR", c: "#ffd23f" }], [{ t: "COUNT? 🤔" }]]);
const LABELS: LabelDef[] = [
  Lb(0, RULES, "#ffd23f", HOOK, true),
  Lb(EX[0], EX[1], "#3fcf6a", [[{ t: "THE TRICK (HI-LO):" }], [{ t: "LOW CARD, 2 TO 6", c: "#3fcf6a" }], [{ t: "= PLUS 1", c: "#3fcf6a" }]]),
  Lb(EX[1], EX[2], "#c8cdf0", [[{ t: "MIDDLE CARD:" }], [{ t: "7, 8 OR 9", c: "#c8cdf0" }], [{ t: "= ZERO", c: "#c8cdf0" }]]),
  Lb(EX[2], DEMO, "#ff3a2a", [[{ t: "HIGH CARD:" }], [{ t: "10, J, Q, K, ACE", c: "#ff3a2a" }], [{ t: "= MINUS 1", c: "#ff3a2a" }]]),
  Lb(DEMO, LT[0], "#ffd23f", [[{ t: "KEEP ONE RUNNING" }], [{ t: "TOTAL IN MIND:", c: "#ffd23f" }], [{ t: "+1  0  -1  = 0" }]]),
  Lb(LT[0], ASK[0], "#3fcf6a", [[{ t: "LEVEL 1: ADD THEM" }], [{ t: "UP IN YOUR HEAD", c: "#3fcf6a" }], [{ t: "(HINTS ON) 🧠" }]]),
  ASKL(0),
  Lb(LT[1], ASK[1], "#ffd23f", [[{ t: "LEVEL 2: FASTER." }], [{ t: "NO MORE HINTS", c: "#ffd23f" }], [{ t: "RESTART FROM 0" }]]),
  ASKL(1),
  Lb(WHY, WHY + 1.5 * BAR, "#ff4f8b", [[{ t: "LOW CARDS GONE =" }], [{ t: "MORE TENS & ACES", c: "#ff4f8b" }], [{ t: "LEFT IN THE SHOE" }]]),
  Lb(WHY + 1.5 * BAR, LT[2], "#ffd23f", [[{ t: "THE ODDS FLIP ~1%" }], [{ t: "TO THE PLAYER →", c: "#3fcf6a" }], [{ t: "THEY BET BIG 💰", c: "#ffd23f" }]]),
  Lb(LT[2], ASK[2], "#ff3a2a", [[{ t: "LEVEL 3:" }], [{ t: "CASINO SPEED 🔥", c: "#ff3a2a" }], [{ t: "RESTART FROM 0" }]]),
  ASKL(2),
  Lb(OUTRO, AGAIN, "#fff08a", [[{ t: "NO ANSWER THIS TIME" }], [{ t: "COMMENT YOUR", c: "#fff08a" }], [{ t: "LEVEL 3 COUNT 👇" }]]),
  Lb(AGAIN, D + 0.01, "#ffd23f", HOOK, true),
];
/** game HUD: level, the Hi-Lo legend, card progress, the count (hidden until the reveal), the edge meter */
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const lv = levelAt(t), why = t >= WHY && t < LT[2];
  const ri = REVEAL.findIndex((r, i) => t >= REVEAL[i] && t < (i < 2 ? LT[i + 1] : AGAIN) && !(i === 1 && t >= WHY));
  const st = cardState(t), shoeOut = SHOE.filter((s) => t >= s).length;
  const title = lv >= 0 ? `LEVEL ${lv + 1}/3` : why ? "WHY IT WORKS" : t >= OUTRO && t < AGAIN ? "GAME OVER" : "HI-LO COUNT";
  const count = why ? sgn(shoeOut).replace("+0", "0") : ri >= 0 && ri < 2 ? sgn(LEVELS[ri].count) : "?";
  const pop = ri >= 0 && t - REVEAL[ri] < 0.5 ? 1 + 0.35 * Math.sin(((t - REVEAL[ri]) / 0.5) * Math.PI) : 1;
  const legend: [string, string, string][] = [["2-6", "+1", "#3fcf6a"], ["7-9", "0", "#9aa0b8"], ["10-A", "-1", "#ff3a2a"]];
  const edge = why ? shoeOut / 6 : 0;
  return (
    <div style={{ position: "absolute", left: 540, top: 1530, transform: "translate(-50%, -50%)", width: 960, background: "rgba(9,13,43,0.95)", border: `8px solid ${ri >= 0 ? "#ffd23f" : "#ffffff"}`, boxShadow: "8px 8px 0 #05060f", padding: "20px 24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ ...px, fontSize: 30 }}>{title}</div>
        <div style={{ ...px, fontSize: 40, color: "#ffd23f", transform: `scale(${pop})`, transformOrigin: "100% 50%" }}>COUNT: {count}</div>
      </div>
      {why ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ ...px, fontSize: 24, color: "#ff3a2a" }}>HOUSE</div>
          <div style={{ flex: 1, height: 44, background: "#05060f", border: "5px solid #05060f", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "33%", background: "#8a1414" }} />
            <div style={{ position: "absolute", left: "33%", top: 0, bottom: 0, right: 0, background: "#1f8a4a" }} />
            <div style={{ position: "absolute", left: `${20 + 60 * edge}%`, top: -8, bottom: -8, width: 16, background: "#ffffff", border: "4px solid #05060f", transform: "translateX(-50%)" }} />
          </div>
          <div style={{ ...px, fontSize: 24, color: "#3fcf6a" }}>PLAYER</div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {legend.map(([r, v, c]) => <div key={r} style={{ ...px, fontSize: 24, border: `5px solid ${c}`, padding: "12px 12px 6px", color: c, whiteSpace: "nowrap" }}>{r}: {v}</div>)}
          <div style={{ flex: 1, display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {st && st.cs.map((_, i) => <div key={i} style={{ width: st.cs.length > 12 ? 11 : 20, height: 30, background: i < st.done ? "#ffd23f" : "#1c2a6e", border: "3px solid #05060f" }} />)}
          </div>
        </div>
      )}
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const CardCountVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const cam = camAt(CAM, t);
  const flash = [...REVEAL, ...LT].map((a) => (t >= a && t - a < 0.2 ? 1 - (t - a) / 0.2 : 0)).reduce((x, y) => Math.max(x, y), 0);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/21-cardcount/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={CARD_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        <Scene t={t} map={glow} />
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash * 0.3 }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ffd23f" }}>@HOWTOWITHZAY</div>
      <Overlays t={t} cam={cam} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
      <Hud t={t} />
    </AbsoluteFill>
  );
};
