/**
 * "Blueprint Arcade" — the channel's visual identity.
 * Engineering drawing (blueprint grid, numbered balloons, dimension lines, title block)
 * + arcade fun (sticker captions, neon accents, Cogsy the mascot).
 */
import React from "react";
import { staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { Px, Pixels, rect, disc, line, gear, dashed } from "./pixels";

export const fontFamily = "PressStart2P";
loadFont({ family: fontFamily, url: staticFile("fonts/PressStart2P-Regular.ttf") });

export const CHANNEL = "HOW IT WORKS";
export const HANDLE = "WITH ZAY";

export const P = {
  // blueprint
  paper: "#0b2a5b", paperDeep: "#071d42", grid: "#12397a", gridMajor: "#1d4f9c", chalk: "#e6f4ff", chalkDim: "#8fb4e0",
  // arcade accents
  pink: "#ff4fa3", lime: "#b8ff4a", yellow: "#ffd23f", cyan: "#59d8ff", orange: "#ff8a3d", ink: "#0a0f24",
  // materials
  brass: "#e2b14c", brassDk: "#a2741f", steel: "#c3cede", steelDk: "#6c7a93", blued: "#5f8cff", ruby: "#ff3b6b",
};

// ---------- text ----------
export const Txt: React.FC<{ x: number; y: number; s: number; c?: string; anchor?: "start" | "middle" | "end"; children: React.ReactNode }> = ({ x, y, s, c = P.chalk, anchor = "middle", children }) => (
  <text x={x} y={y} fontFamily={fontFamily} fontSize={s} fill={c} textAnchor={anchor} dominantBaseline="hanging">
    {children}
  </text>
);

// ---------- blueprint sheet ----------
export const BlueprintBg: React.FC = () => {
  const px: Px[] = [rect(0, 0, 180, 320, P.paper)];
  for (let x = 0; x <= 180; x += 6) px.push(rect(x, 0, 1, 320, x % 30 === 0 ? P.gridMajor : P.grid));
  for (let y = 0; y <= 320; y += 6) px.push(rect(0, y, 180, 1, y % 30 === 0 ? P.gridMajor : P.grid));
  // sheet border (double line) + corner registration marks
  px.push(rect(3, 3, 174, 1, P.chalkDim), rect(3, 316, 174, 1, P.chalkDim), rect(3, 3, 1, 314, P.chalkDim), rect(176, 3, 1, 314, P.chalkDim));
  px.push(rect(5, 5, 170, 1, P.chalkDim, 0.4), rect(5, 314, 170, 1, P.chalkDim, 0.4), rect(5, 5, 1, 310, P.chalkDim, 0.4), rect(174, 5, 1, 310, P.chalkDim, 0.4));
  return <Pixels px={px} />;
};

/** Engineering-drawing title block: brand, drawing title, scale (= playback speed), drawing number. */
export const TitleBlock: React.FC<{ title: string; scale: string; mode: "real" | "slow" | "fast"; dwg: string }> = ({ title, scale, mode, dwg }) => {
  const y = 282, h = 30;
  const modeC = mode === "real" ? P.lime : mode === "slow" ? P.cyan : P.pink;
  return (
    <>
      <rect x={6} y={y} width={168} height={h} fill={P.paperDeep} />
      <Pixels px={[rect(6, y, 168, 1, P.chalk), rect(6, y + h, 168, 1, P.chalk), rect(6, y, 1, h, P.chalk), rect(173, y, 1, h + 1, P.chalk),
        rect(62, y, 1, h, P.chalk), rect(62, y + 15, 112, 1, P.chalk), rect(138, y + 15, 1, 15, P.chalk)]} />
      {/* logo cell */}
      <Pixels px={gear(20, y + 15, 6, 8, 0.3, P.yellow, P.paperDeep, { spokes: 0, tooth: 2, hub: 2 })} />
      <Txt x={30} y={y + 9} s={4} c={P.yellow} anchor="start">BIT</Txt>
      <Txt x={30} y={y + 16} s={4} c={P.chalk} anchor="start">WORKS</Txt>
      {/* title */}
      <Txt x={66} y={y + 3} s={2.5} c={P.chalkDim} anchor="start">DRAWING TITLE</Txt>
      <Txt x={66} y={y + 8} s={4} anchor="start">{title}</Txt>
      {/* scale = speed */}
      <Txt x={66} y={y + 18} s={2.5} c={P.chalkDim} anchor="start">SCALE</Txt>
      <rect x={66} y={y + 22} width={2} height={5} fill={modeC} />
      {mode === "slow" && <rect x={69} y={y + 22} width={2} height={5} fill={modeC} />}
      {mode !== "slow" && <Pixels px={[rect(68, y + 23, 1, 3, modeC), rect(69, y + 24, 1, 1, modeC)]} />}
      <Txt x={74} y={y + 22} s={4} c={modeC} anchor="start">{scale}</Txt>
      <Txt x={142} y={y + 18} s={2.5} c={P.chalkDim} anchor="start">DWG NO.</Txt>
      <Txt x={142} y={y + 23} s={4} c={P.pink} anchor="start">{dwg}</Txt>
    </>
  );
};

// ---------- callouts ----------
/** Numbered balloon callout with leader line, like an engineering parts list. */
export const Balloon: React.FC<{ n: number; x: number; y: number; to: [number, number]; label: string; side?: "left" | "right"; c?: string }> = ({ n, x, y, to, label, side = "right", c = P.lime }) => {
  const w = label.length * 4 + 6;
  const lx = side === "right" ? x + 8 : x - 8 - w;
  return (
    <>
      <Pixels px={[...line(x, y, to[0], to[1], c), ...disc(to[0], to[1], 1, c)]} />
      <Pixels px={[...disc(x, y, 6, P.paperDeep), ...ringPx(x, y, 6, c)]} />
      <Txt x={x + 0.5} y={y - 2} s={4} c={c}>{n}</Txt>
      <rect x={lx} y={y - 5} width={w} height={10} fill={c} />
      <rect x={lx + 1} y={y + 5} width={w} height={1} fill={P.ink} />
      <Txt x={lx + w / 2} y={y - 2} s={4} c={P.ink}>{label}</Txt>
    </>
  );
};
const ringPx = (cx: number, cy: number, r: number, c: string): Px[] => {
  const out: Px[] = [];
  for (let y = -r - 1; y <= r + 1; y++)
    for (let x = -r - 1; x <= r + 1; x++) if (Math.abs(Math.hypot(x, y) - r) < 0.55) out.push(rect(cx + x, cy + y, 1, 1, c));
  return out;
};

/** Dimension line with arrowheads and a measurement label. */
export const Dimension: React.FC<{ x0: number; x1: number; y: number; label: string; c?: string }> = ({ x0, x1, y, label, c = P.cyan }) => (
  <>
    <Pixels px={[...dashed(x0, y - 6, x0, y + 2, c, 2, 1), ...dashed(x1, y - 6, x1, y + 2, c, 2, 1), ...line(x0, y, x1, y, c),
      rect(x0 + 1, y - 1, 1, 3, c), rect(x0 + 2, y - 2, 1, 5, c), rect(x1 - 1, y - 1, 1, 3, c), rect(x1 - 2, y - 2, 1, 5, c)]} />
    <rect x={(x0 + x1) / 2 - (label.length * 4) / 2 - 2} y={y - 3} width={label.length * 4 + 4} height={7} fill={P.paper} />
    <Txt x={(x0 + x1) / 2} y={y - 2} s={4} c={c}>{label}</Txt>
  </>
);

// ---------- sticker captions ----------
/** Pop-art sticker: solid colour, hard ink shadow, slight tilt. */
export const Sticker: React.FC<{ x: number; y: number; lines: { t: string; s?: number; c?: string }[]; bg?: string; tilt?: number; pop?: number }> = ({ x, y, lines, bg = P.yellow, tilt = -3, pop = 1 }) => {
  const ls = lines.map((l) => ({ ...l, s: l.s ?? 6 }));
  const w = Math.max(...ls.map((l) => l.t.length * l.s)) + 10;
  const h = ls.reduce((a, l) => a + l.s + 3, 0) + 7;
  let yy = y - h / 2 + 5;
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${pop}) translate(${-x} ${-y})`}>
      <rect x={x - w / 2 + 3} y={y - h / 2 + 3} width={w} height={h} fill={P.ink} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={bg} />
      <rect x={x - w / 2 + 1} y={y - h / 2 + 1} width={w - 2} height={1} fill="#ffffff" opacity={0.5} />
      {ls.map((l, i) => {
        const el = <Txt key={i} x={x} y={yy} s={l.s} c={l.c ?? P.ink}>{l.t}</Txt>;
        yy += l.s + 3;
        return el;
      })}
    </g>
  );
};

// ---------- mascot ----------
export type Mood = "happy" | "wow" | "point" | "wave";
/** Cogsy: a little yellow cog with legs. */
export const Cogsy: React.FC<{ x: number; y: number; mood?: Mood; t?: number; say?: string }> = ({ x, y, mood = "happy", t = 0, say }) => {
  const bob = Math.round(Math.sin(t * 8) * 1);
  const cy = y + bob;
  const px: Px[] = [
    // legs + shoes
    rect(x - 5, cy + 9, 2, 5, P.ink), rect(x + 3, cy + 9, 2, 5, P.ink), rect(x - 7, cy + 13, 5, 2, P.pink), rect(x + 3, cy + 13, 5, 2, P.pink),
    ...gear(x, cy, 10, 10, t * 1.5, P.yellow, P.yellow, { spokes: 0, tooth: 3, hub: 0 }),
    ...disc(x, cy, 10, P.yellow),
    rect(x - 7, cy - 8, 6, 1, "#fff3b0"),
    // eyes
    ...(mood === "wow" ? [rect(x - 5, cy - 4, 3, 4, P.ink), rect(x + 2, cy - 4, 3, 4, P.ink), rect(x - 4, cy - 4, 1, 1, "#fff"), rect(x + 3, cy - 4, 1, 1, "#fff")]
      : [rect(x - 5, cy - 3, 2, 3, P.ink), rect(x + 3, cy - 3, 2, 3, P.ink), rect(x - 5, cy - 3, 1, 1, "#fff"), rect(x + 3, cy - 3, 1, 1, "#fff")]),
    // mouth
    ...(mood === "wow" ? [rect(x - 2, cy + 2, 4, 4, P.ink), rect(x - 1, cy + 3, 2, 2, P.pink)]
      : [rect(x - 3, cy + 3, 1, 1, P.ink), rect(x - 2, cy + 4, 4, 1, P.ink), rect(x + 2, cy + 3, 1, 1, P.ink)]),
    // cheeks
    rect(x - 8, cy + 1, 2, 1, P.pink), rect(x + 6, cy + 1, 2, 1, P.pink),
    // arms
    ...(mood === "point" ? [...line(x + 10, cy + 2, x + 17, cy - 3, P.ink, 2)] : []),
    ...(mood === "wave" ? [...line(x + 10, cy + 1, x + 15, cy - 6 + Math.round(Math.sin(t * 14) * 2), P.ink, 2)] : []),
    ...(mood === "wow" ? [...line(x - 10, cy + 1, x - 15, cy - 6, P.ink, 2), ...line(x + 10, cy + 1, x + 15, cy - 6, P.ink, 2)] : []),
    ...(mood === "happy" ? [...line(x - 10, cy + 2, x - 13, cy + 7, P.ink, 2), ...line(x + 10, cy + 2, x + 13, cy + 7, P.ink, 2)] : []),
  ];
  return (
    <>
      <Pixels px={px} />
      {say && (
        <g>
          <rect x={x - say.length * 2 - 4} y={cy - 30} width={say.length * 4 + 8} height={11} fill={P.chalk} />
          <rect x={x - say.length * 2 - 4 + 2} y={cy - 19} width={say.length * 4 + 8} height={1} fill={P.ink} />
          <Pixels px={[rect(x - 1, cy - 19, 4, 2, P.chalk), rect(x, cy - 17, 2, 2, P.chalk)]} />
          <Txt x={x} y={cy - 27} s={4} c={P.ink}>{say}</Txt>
        </g>
      )}
    </>
  );
};
