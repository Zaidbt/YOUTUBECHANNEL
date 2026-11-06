/**
 * "How does a car engine work?" — 8-bit, music-driven explainer (9:16).
 *
 * Everything is drawn on a 180x320 pixel grid (scaled to 1080x1920) and timed to the
 * 128 BPM soundtrack from videos/01-car-engine/music.py. Section map (bars, 0-based):
 *  0-1 REAL SPEED · 2 SLOWING · 3-6 SLOW-MO (one stroke per bar) · 7 RECAP
 *  8-9 2X FASTER · 10-11 IDLE · 12-13 FLOOR IT · 14-15 6500 RPM · 16 END
 */
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";

// Press Start 2P (SIL Open Font License), bundled in public/fonts so renders work offline.
const fontFamily = "PressStart2P";
loadFont({ family: fontFamily, url: staticFile("fonts/PressStart2P-Regular.ttf") });

export const FPS = 30;
const BPM = 128;
const SPB = 60 / BPM; // seconds per beat
const BAR = 4 * SPB;
export const DURATION = Math.ceil((16 * BAR + 2) * FPS);

// ---------- palette ----------
const C = {
  bg: "#121735", grid: "#182046", ink: "#f4f1e8", yellow: "#ffd23f", orange: "#ff8a1f", red: "#e8413c",
  blue: "#5ab4ff", cyan: "#a8e6ff", metal: "#8d95ab", metalHi: "#b9c0d2", metalDk: "#5c6379",
  piston: "#c9cede", dark: "#0b0e20", bore: "#0e1229", case: "#262d52", caseHi: "#3a4378", smoke: "#7d8496",
};

// ---------- engine timing ----------
const T = (bars: number) => bars * BAR;
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const W_REAL = 3000 * 6; // deg/s at 3000 RPM
const IDLE = 800 * 6;
const TOP = 6500 * 6;
const DOUBLING = [600, 1200, 2400, 4800]; // deg/s per half bar, bars 8-9
const thA = W_REAL * T(2);
const thB = Math.ceil((thA + (W_REAL * BAR) / 3) / 720) * 720; // stop exactly at top dead centre
const thC = thB + 720;
const thD = thC + 720;
const thE = thD + DOUBLING.reduce((a, v) => a + (v * BAR) / 2, 0);
const thF = thE + IDLE * T(2);
const thG = thF + ((IDLE + TOP) / 2) * T(2);
const thH = thG + TOP * T(2);

/** Crank angle in degrees. 0..720 = intake, compression, power, exhaust. */
function theta(t: number): number {
  const b = t / BAR;
  if (b < 2) return W_REAL * t;
  if (b < 3) return thA + (thB - thA) * easeOut(b - 2);
  if (b < 7) {
    // slow-mo: crank snaps 45 degrees on every beat
    const k = (t - T(3)) / SPB;
    const f = k - Math.floor(k);
    return thB + 45 * (Math.floor(k) + easeOut(Math.min(1, f / 0.3)));
  }
  if (b < 8) return thC + 720 * (b - 7);
  if (b < 10) {
    let th = thD;
    let tt = t - T(8);
    for (const v of DOUBLING) {
      const d = Math.min(tt, BAR / 2);
      if (d <= 0) break;
      th += v * d;
      tt -= BAR / 2;
    }
    return th;
  }
  if (b < 12) return thE + IDLE * (t - T(10));
  if (b < 14) {
    const tt = t - T(12);
    return thF + IDLE * tt + 0.5 * ((TOP - IDLE) / T(2)) * tt * tt;
  }
  if (b < 16) return thG + TOP * (t - T(14));
  return thH + TOP * 0.2 * (1 - Math.exp(-(t - T(16)) / 0.2));
}

function engineRpm(t: number): number {
  const b = t / BAR;
  let r: number;
  if (b < 2) r = 3000;
  else if (b < 3) r = 3000 - 2200 * easeOut(b - 2);
  else if (b < 12) r = 800;
  else if (b < 14) r = 800 + 5700 * ((b - 12) / 2) ** 1.4;
  else if (b < 16) r = 6500;
  else r = 6500 * Math.exp(-(t - T(16)) / 0.35);
  return Math.max(0, r + (b < 16 ? Math.round(Math.sin(t * 23) * r * 0.008) : 0));
}

function speedTag(b: number): { text: string; real: boolean } {
  if (b < 2 || b >= 10) return { text: "REAL SPEED", real: true };
  if (b < 3) return { text: "SLOWING...", real: false };
  if (b < 7) return { text: "SLOW-MO 1/50", real: false };
  if (b < 8) return { text: "SLOW-MO 1/12", real: false };
  const half = Math.floor((b - 8) * 2);
  return half === 3 ? { text: "REAL SPEED", real: true } : { text: `SLOW-MO 1/${[8, 4, 2][half]}`, real: false };
}

type Line = { t: string; c?: string; size?: number };
function caption(b: number): Line[] | null {
  if (b < 3) return null; // title card instead
  if (b < 4) return [{ t: "1. SUCK", c: C.yellow, size: 8 }, { t: "PISTON DROPS, PULLING IN" }, { t: "FUEL + AIR" }];
  if (b < 5) return [{ t: "2. SQUEEZE", c: C.yellow, size: 8 }, { t: "VALVES SHUT. PISTON RISES" }, { t: "& CRUSHES IT 10X SMALLER" }];
  if (b < 6) return [{ t: "3. BANG", c: C.orange, size: 8 }, { t: "SPARK! THE BLAST SHOVES" }, { t: "THE PISTON DOWN" }];
  if (b < 7) return [{ t: "4. BLOW", c: C.yellow, size: 8 }, { t: "PISTON RISES, PUSHING" }, { t: "THE EXHAUST OUT" }];
  if (b < 8) return [{ t: "4 STROKES = 2 TURNS", c: C.yellow, size: 6 }, { t: "= 1 BANG. AND REPEAT!" }];
  if (b < 9) return [{ t: "2X FASTER...", c: C.ink, size: 7 }];
  if (b < 10) return [{ t: "2X FASTER...", c: C.ink, size: 7 }, { t: "...THEN DOUBLE IT", c: C.yellow, size: 7 }];
  if (b < 12) return [{ t: "IDLE: 800 RPM", c: C.yellow, size: 7 }, { t: "~7 BANGS A SECOND" }];
  if (b < 14) return [{ t: "NOW...", c: C.ink, size: 8 }, { t: "FLOOR IT", c: C.red, size: 10 }];
  if (b < 16) return [{ t: "6500 RPM:", c: C.yellow, size: 8 }, { t: "54 BANGS A SECOND" }, { t: "PER CYLINDER. A V8? 433!" }];
  return [{ t: "AND THAT'S", c: C.ink, size: 8 }, { t: "AN ENGINE.", c: C.yellow, size: 8 }, { t: "FOLLOW FOR MORE" }];
}

// ---------- pixel helpers (all coordinates in 180x320 grid units) ----------
type Px = { x: number; y: number; w: number; h: number; c: string; o?: number };
const rect = (x: number, y: number, w: number, h: number, c: string, o?: number): Px => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), c, o });

function disc(cx: number, cy: number, r: number, c: string, o?: number): Px[] {
  const out: Px[] = [];
  const X = Math.round(cx), Y = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    out.push({ x: X - hw, y: Y + dy, w: 2 * hw + 1, h: 1, c, o });
  }
  return out;
}

function ring(cx: number, cy: number, r: number, c: string): Px[] {
  const out: Px[] = [];
  for (let y = -r - 1; y <= r + 1; y++)
    for (let x = -r - 1; x <= r + 1; x++)
      if (Math.abs(Math.hypot(x, y) - r) < 0.55) out.push({ x: cx + x, y: cy + y, w: 1, h: 1, c });
  return out;
}

function line(x0: number, y0: number, x1: number, y1: number, c: string, th = 1, o?: number): Px[] {
  const out: Px[] = [];
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const off = Math.floor(th / 2);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n) - off;
    const y = Math.round(y0 + ((y1 - y0) * i) / n) - off;
    out.push({ x, y, w: th, h: th, c, o });
  }
  return out;
}

const Pixels: React.FC<{ px: Px[] }> = ({ px }) => (
  <>
    {px.map((p, i) => (
      <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.c} opacity={p.o} />
    ))}
  </>
);

/** Deterministic pseudo-random in [0,1). */
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- engine geometry ----------
const CX = 90, CRANK_Y = 224, THROW = 20, ROD = 64;
const HEAD_BOTTOM = 120, BORE_L = 60, BORE_R = 120;
const pistonPin = (th: number) => {
  const a = (th * Math.PI) / 180;
  const px = CX + THROW * Math.sin(a), py = CRANK_Y - THROW * Math.cos(a);
  const pinY = py - Math.sqrt(ROD * ROD - (px - CX) ** 2);
  return { px, py, pinY };
};

function movingParts(th: number, o?: number): Px[] {
  const { px, py, pinY } = pistonPin(th);
  const a = (th * Math.PI) / 180;
  const top = Math.round(pinY - 10);
  return [
    ...disc(CX - 9 * Math.sin(a), CRANK_Y + 9 * Math.cos(a), 13, C.metalDk, o), // counterweight
    ...disc(CX, CRANK_Y, 3, C.metalHi, o),
    ...line(CX, pinY, px, py, C.metalHi, 4, o), // connecting rod
    ...disc(px, py, 4, C.piston, o),
    rect(BORE_L + 1, top, BORE_R - BORE_L - 2, 22, C.piston, o),
    rect(BORE_L + 1, top + 3, BORE_R - BORE_L - 2, 1, C.metalDk, o),
    rect(BORE_L + 1, top + 6, BORE_R - BORE_L - 2, 1, C.metalDk, o),
    rect(BORE_L + 1, top + 20, BORE_R - BORE_L - 2, 2, C.metal, o),
    ...disc(CX, pinY, 3, C.metalDk, o),
  ];
}

function staticEngine(): Px[] {
  return [
    // stand + crankcase
    rect(44, 254, 92, 8, C.case), rect(50, 262, 8, 14, C.case), rect(122, 262, 8, 14, C.case),
    rect(50, 198, 80, 58, C.caseHi), rect(53, 201, 74, 52, C.dark),
    ...disc(CX, CRANK_Y, 25, "#161b38"),
    // cylinder walls + bore
    rect(52, HEAD_BOTTOM, 8, 82, C.metal), rect(120, HEAD_BOTTOM, 8, 82, C.metal),
    rect(52, HEAD_BOTTOM, 2, 82, C.metalHi), rect(126, HEAD_BOTTOM, 2, 82, C.metalDk),
    rect(BORE_L, HEAD_BOTTOM, BORE_R - BORE_L, 82, C.bore),
    // cooling fins
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => [rect(46, 128 + i * 12, 6, 6, C.metalDk), rect(128, 128 + i * 12, 6, 6, C.metalDk)]),
    // head
    rect(48, 96, 84, 24, C.metal), rect(48, 96, 84, 2, C.metalHi), rect(48, 118, 84, 2, C.metalDk),
    // intake pipe + port
    rect(8, 100, 42, 16, C.metal), rect(8, 104, 70, 8, C.dark), rect(66, 104, 12, 16, C.dark),
    // exhaust pipe + port
    rect(130, 100, 42, 16, C.metal), rect(102, 104, 70, 8, C.dark), rect(102, 104, 12, 16, C.dark),
    // spark plug
    rect(86, 82, 8, 12, "#e9e6dc"), rect(85, 94, 10, 4, C.metalHi), rect(88, 98, 4, 22, C.metalDk),
    rect(89, 78, 2, 4, C.metalDk),
  ];
}

function valve(cx: number, lift: number): Px[] {
  const y = 118 + Math.round(lift);
  return [rect(cx - 1, 86, 3, y - 86, C.metalHi), rect(cx - 7, y, 15, 2, C.metalHi), rect(cx - 4, 88, 9, 6, C.metalDk)];
}

const PARTICLES = 70;
function chamberParticles(th: number, t: number, top: number): Px[] {
  const ph = ((th % 720) + 720) % 720;
  const stroke = Math.floor(ph / 180), p = (ph % 180) / 180;
  const h = Math.max(1, top - HEAD_BOTTOM - 1);
  let count = PARTICLES;
  if (stroke === 0) count = Math.round(PARTICLES * p);
  if (stroke === 3) count = Math.round(PARTICLES * (1 - p));
  const out: Px[] = [];
  const hot = [C.yellow, C.orange, C.red, "#ffb347"];
  const cool = [C.cyan, C.blue, C.ink];
  const smoke = [C.smoke, "#a0522d", "#5f6577"];
  for (let i = 0; i < count; i++) {
    const jit = stroke === 2 ? 0.05 : 0.02;
    const u = Math.min(0.97, Math.max(0, rnd(i) + jit * Math.sin(t * 9 + i)));
    const v = Math.min(0.95, Math.max(0, rnd(i + 99) + jit * Math.cos(t * 7 + i * 2)));
    const pal = stroke === 2 ? hot : stroke === 3 ? smoke : cool;
    const sz = rnd(i + 7) > 0.7 ? 2 : 1;
    out.push(rect(BORE_L + 1 + u * (BORE_R - BORE_L - 3), HEAD_BOTTOM + 1 + v * (h - sz), sz, sz, pal[i % pal.length]));
  }
  return out;
}

function pipeFlow(th: number): Px[] {
  const ph = ((th % 720) + 720) % 720;
  const stroke = Math.floor(ph / 180), p = (ph % 180) / 180;
  const out: Px[] = [];
  if (stroke === 0)
    for (let k = 0; k < 10; k++) out.push(rect(8 + ((p * 140 + k * 7) % 62), 105 + (k % 3) * 2, 2, 2, k % 2 ? C.cyan : C.blue));
  if (stroke === 3)
    for (let k = 0; k < 10; k++) out.push(rect(104 + ((p * 140 + k * 7) % 66), 105 + (k % 3) * 2, 2, 2, k % 2 ? C.smoke : "#a0522d"));
  return out;
}

// ---------- UI pieces ----------
const Txt: React.FC<{ x: number; y: number; s: number; c?: string; anchor?: "start" | "middle" | "end"; children: React.ReactNode }> = ({ x, y, s, c = C.ink, anchor = "middle", children }) => (
  <text x={x} y={y} fontFamily={fontFamily} fontSize={s} fill={c} textAnchor={anchor} dominantBaseline="hanging">
    {children}
  </text>
);

const Box: React.FC<{ x: number; y: number; w: number; h: number; border?: string }> = ({ x, y, w, h, border = C.ink }) => (
  <>
    <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={C.dark} />
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={border} strokeWidth={1} />
  </>
);

const CaptionBox: React.FC<{ lines: Line[]; y: number; pop: number }> = ({ lines, y, pop }) => {
  const sized = lines.map((l) => ({ ...l, size: l.size ?? 5 }));
  const w = Math.max(...sized.map((l) => l.t.length * l.size)) + 10;
  const h = sized.reduce((a, l) => a + l.size + 3, 0) + 7;
  let yy = y + 5;
  return (
    <g transform={`translate(90 ${y + h / 2}) scale(${pop}) translate(-90 ${-(y + h / 2)})`}>
      <Box x={Math.round(90 - w / 2)} y={y} w={Math.round(w)} h={h} />
      {sized.map((l, i) => {
        const el = (
          <Txt key={i} x={90} y={yy} s={l.size} c={l.c}>
            {l.t}
          </Txt>
        );
        yy += l.size + 3;
        return el;
      })}
    </g>
  );
};

const Label: React.FC<{ x: number; y: number; text: string; to: [number, number]; c?: string }> = ({ x, y, text, to, c = C.yellow }) => {
  const w = text.length * 4 + 6;
  return (
    <>
      <Pixels px={line(x + w / 2, y + 9, to[0], to[1], c, 1)} />
      <Box x={x} y={y} w={w} h={9} border={c} />
      <Txt x={x + w / 2} y={y + 3} s={4} c={c}>
        {text}
      </Txt>
    </>
  );
};

const Gauge: React.FC<{ rpm: number }> = ({ rpm }) => {
  const cx = 156, cy = 292, r = 17;
  const ang = (v: number) => ((-135 + (270 * Math.min(v, 7000)) / 7000) * Math.PI) / 180;
  const ticks: Px[] = [];
  for (let v = 0; v <= 7000; v += 1000) {
    const a = ang(v);
    ticks.push(...line(cx + Math.sin(a) * (r - 4), cy - Math.cos(a) * (r - 4), cx + Math.sin(a) * (r - 2), cy - Math.cos(a) * (r - 2), v >= 6000 ? C.red : C.ink));
  }
  const a = ang(rpm);
  return (
    <>
      <Pixels px={[...disc(cx, cy, r + 2, C.dark), ...ring(cx, cy, r + 1, C.ink), ...ticks, ...line(cx, cy, cx + Math.sin(a) * (r - 3), cy - Math.cos(a) * (r - 3), rpm > 6000 ? C.red : C.yellow, 1), ...disc(cx, cy, 1, C.ink)]} />
      <Txt x={cx} y={cy + 6} s={4} c={rpm > 6000 ? C.red : C.ink}>
        {Math.round(rpm)}
      </Txt>
      <Txt x={cx} y={cy + 11} s={3} c={C.metal}>
        RPM
      </Txt>
    </>
  );
};

// ---------- main composition ----------
export const CarEngine: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const b = t / BAR;
  const beat = t / SPB;
  const beatFrac = beat - Math.floor(beat);
  const th = theta(t);
  const dth = Math.abs(th - theta(t - 1 / FPS));
  const ph = ((th % 720) + 720) % 720;
  const stroke = Math.floor(ph / 180), p = (ph % 180) / 180;
  const { pinY } = pistonPin(th);
  const top = Math.round(pinY - 10);
  const rpm = engineRpm(t);
  const slowSection = b >= 3 && b < 10;

  // moving parts with pixel motion blur when spinning fast
  const blurN = dth > 40 ? 6 : 1;
  const parts: Px[] = [];
  for (let i = blurN - 1; i >= 0; i--) parts.push(...movingParts(theta(t - i / (FPS * blurN)), blurN > 1 ? 0.35 : undefined));

  // valves
  const inLift = stroke === 0 ? Math.sin(Math.PI * p) * 6 : 0;
  const exLift = stroke === 3 ? Math.sin(Math.PI * p) * 6 : 0;

  // combustion flash
  const spark = stroke === 2 && p < 0.18;
  const flashFrame = spark && frame % 2 === 0;

  // camera: zoom in for slow-mo, shake + beat pulses when flooring it
  let zoom = 1;
  if (b >= 3 && b < 8) zoom = 1 + 0.12 * easeOut(Math.min(1, (b - 3) * 2));
  else if (b >= 8 && b < 10) zoom = 1.12 - 0.12 * easeOut((b - 8) / 2);
  if (b >= 14 && b < 16) zoom += 0.035 * Math.exp(-beatFrac * 6);
  if (b >= 7 && b < 8 && stroke === 2 && p < 0.3) zoom += 0.02;
  const shakeAmp = b >= 12 && b < 16 ? Math.max(0, (rpm - 800) / 5700) * 1.6 : b >= 5 && b < 5.15 ? 2 : 0;
  const sx = Math.round(Math.sin(frame * 12.9898) * shakeAmp);
  const sy = Math.round(Math.cos(frame * 78.233) * shakeAmp);
  const camY = 175;

  const bangs = Math.max(0, Math.floor((th + 360) / 720));
  const tag = speedTag(b);
  const cap = caption(b);
  const capPop = 1 + 0.06 * Math.exp(-((b * 4) % 4 < 0.5 ? beatFrac : 9) * 10);

  // x2 indicator on every speed doubling (bars 8-9)
  const halfIdx = Math.floor((b - 8) * 2);
  const halfFrac = (b - 8) * 2 - halfIdx;
  const showX2 = b >= 8 && b < 10 && halfFrac < 0.6 && Math.floor(frame / 3) % 2 === 0;

  // title card typing
  const titleChars = Math.floor(Math.max(0, t) * 30);
  const typed = (s: string, offset: number) => s.slice(0, Math.max(0, titleChars - offset));

  const gridDots: Px[] = [];
  for (let y = 6; y < 320; y += 12) for (let x = 6; x < 180; x += 12) gridDots.push(rect(x, y, 1, 1, C.grid));

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Audio src={staticFile("videos/01-car-engine/music.wav")} />
      <svg viewBox="0 0 180 320" width={1080} height={1920} shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
        <Pixels px={gridDots} />

        <g transform={`translate(${sx} ${sy}) translate(90 ${camY}) scale(${zoom}) translate(-90 ${-camY})`}>
          <Pixels px={staticEngine()} />
          {/* chamber gas */}
          <rect x={BORE_L} y={HEAD_BOTTOM} width={BORE_R - BORE_L} height={Math.max(0, top - HEAD_BOTTOM)} fill={flashFrame ? C.yellow : stroke === 2 && p < 0.5 ? "#3a1a10" : stroke === 3 ? "#1d1f2b" : "#10234a"} />
          <Pixels px={chamberParticles(th, t, top)} />
          <Pixels px={pipeFlow(th)} />
          <Pixels px={[...valve(72, inLift), ...valve(108, exLift)]} />
          <Pixels px={parts} />
          {spark && <Pixels px={[rect(87, 121, 6, 1, C.yellow), rect(89, 120, 2, 4, C.ink), rect(85, 123, 2, 1, C.yellow), rect(93, 123, 2, 1, C.yellow)]} />}
          {/* exhaust puffs out of the tailpipe */}
          {stroke === 3 && <Pixels px={[0, 1, 2, 3].map((k) => rect(172 + ((p * 30 + k * 5) % 8), 100 - ((p * 60 + k * 9) % 22), 3, 3, k % 2 ? C.smoke : "#a0522d", 0.8))} />}

          {/* slow-mo callouts */}
          {b >= 3 && b < 4 && <Label x={6} y={80} text="FUEL+AIR IN" to={[20, 104]} c={C.cyan} />}
          {b >= 4 && b < 5 && p > 0.3 && <Label x={132} y={124} text="SQUEEZED" to={[118, Math.min(126, top - 2)]} c={C.cyan} />}
          {b >= 6 && b < 7 && <Label x={124} y={80} text="EXHAUST OUT" to={[160, 104]} c={C.smoke} />}
          {slowSection && stroke === 2 && p < 0.35 && (
            <g transform={`translate(90 ${HEAD_BOTTOM + 16}) scale(${1 + 0.6 * Math.exp(-p * 20)}) translate(-90 ${-(HEAD_BOTTOM + 16)})`}>
              <Txt x={91} y={HEAD_BOTTOM + 11} s={11} c={C.dark}>BANG!</Txt>
              <Txt x={90} y={HEAD_BOTTOM + 10} s={11} c={C.orange}>BANG!</Txt>
            </g>
          )}
        </g>

        {/* speed tag (top-left) */}
        <Box x={4} y={4} w={tag.text.length * 4 + 12} h={10} border={tag.real ? C.orange : C.cyan} />
        {tag.real ? (
          <Pixels px={[rect(7, 7, 1, 5, C.orange), rect(8, 8, 1, 3, C.orange), rect(9, 9, 1, 1, C.orange)]} />
        ) : (
          <Pixels px={[rect(7, 7, 1, 5, C.cyan), rect(9, 7, 1, 5, C.cyan)]} />
        )}
        <Txt x={13} y={7} s={4} c={tag.real ? C.orange : C.cyan} anchor="start">
          {tag.text}
        </Txt>
        {showX2 && (
          <Txt x={174} y={5} s={10} c={C.yellow} anchor="end">
            X2
          </Txt>
        )}

        {/* title card */}
        {b < 3 && (
          <>
            <Box x={34} y={22} w={112} h={44} border={C.ink} />
            <Txt x={90} y={28} s={9}>{typed("HOW DOES A", 0)}</Txt>
            <Txt x={90} y={41} s={9} c={C.yellow}>{typed("CAR ENGINE", 10)}</Txt>
            <Txt x={90} y={54} s={9}>{typed("WORK?", 20)}</Txt>
            {t > 0.9 && (
              <>
                <Box x={18} y={70} w={144} h={10} border={C.yellow} />
                <Txt x={90} y={73} s={4} c={C.yellow}>3000 RPM: 25 BANGS A SECOND</Txt>
              </>
            )}
          </>
        )}
        {cap && <CaptionBox lines={cap} y={20} pop={capPop} />}

        {/* bang counter (bottom-left) + gauge */}
        <Box x={6} y={282} w={52} h={20} border={C.metal} />
        <Txt x={32} y={286} s={3} c={C.metal}>BANGS</Txt>
        <Txt x={32} y={292} s={6} c={C.orange}>{String(bangs).padStart(4, "0")}</Txt>
        <Gauge rpm={rpm} />
      </svg>
    </AbsoluteFill>
  );
};
