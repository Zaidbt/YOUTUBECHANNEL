/** Pixel-art drawing helpers. All coordinates are in 180x320 grid units (scaled 6x to 1080x1920). */
import React from "react";

export type Px = { x: number; y: number; w: number; h: number; c: string; o?: number };

export const rect = (x: number, y: number, w: number, h: number, c: string, o?: number): Px => ({
  x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), c, o,
});

export function disc(cx: number, cy: number, r: number, c: string, o?: number): Px[] {
  const out: Px[] = [];
  const X = Math.round(cx), Y = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    out.push({ x: X - hw, y: Y + dy, w: 2 * hw + 1, h: 1, c, o });
  }
  return out;
}

/** Ring of thickness th (outer radius r). */
export function ring(cx: number, cy: number, r: number, c: string, th = 1, o?: number): Px[] {
  const out: Px[] = [];
  const X = Math.round(cx), Y = Math.round(cy);
  for (let y = -r - 1; y <= r + 1; y++)
    for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y);
      if (d <= r + 0.5 && d > r - th + 0.5 - 1e-6) out.push({ x: X + x, y: Y + y, w: 1, h: 1, c, o });
    }
  return out;
}

export function line(x0: number, y0: number, x1: number, y1: number, c: string, th = 1, o?: number): Px[] {
  const out: Px[] = [];
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const off = Math.floor(th / 2);
  for (let i = 0; i <= n; i++) {
    out.push({ x: Math.round(x0 + ((x1 - x0) * i) / n) - off, y: Math.round(y0 + ((y1 - y0) * i) / n) - off, w: th, h: th, c, o });
  }
  return out;
}

/** Dashed line (blueprint construction lines). */
export function dashed(x0: number, y0: number, x1: number, y1: number, c: string, dash = 3, gap = 2): Px[] {
  const pts = line(x0, y0, x1, y1, c);
  return pts.filter((_, i) => i % (dash + gap) < dash);
}

/** Archimedean spiral, e.g. a hairspring or mainspring. */
export function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, rot: number, c: string): Px[] {
  const out: Px[] = [];
  const steps = Math.ceil(turns * 2 * Math.PI * r1);
  let last = "";
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const a = rot + s * turns * 2 * Math.PI;
    const r = r0 + (r1 - r0) * s;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
    const k = `${x},${y}`;
    if (k !== last) out.push({ x, y, w: 1, h: 1, c });
    last = k;
  }
  return out;
}

/** Spoked gear. rot in radians. */
export function gear(cx: number, cy: number, r: number, teeth: number, rot: number, body: string, dark: string, opts: { spokes?: number; tooth?: number; hub?: number } = {}): Px[] {
  const { spokes = 4, tooth = 3, hub = Math.max(2, Math.round(r / 5)) } = opts;
  const out: Px[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i * 2 * Math.PI) / teeth;
    out.push(...line(cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), cx + Math.cos(a) * (r + tooth), cy + Math.sin(a) * (r + tooth), body, 2));
  }
  out.push(...disc(cx, cy, r, body));
  if (r >= 8) {
    out.push(...disc(cx, cy, r - 3, dark));
    for (let i = 0; i < spokes; i++) {
      const a = rot + (i * 2 * Math.PI) / spokes;
      out.push(...line(cx, cy, cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3), body, 2));
    }
  }
  out.push(...disc(cx, cy, hub, body), ...disc(cx, cy, Math.max(1, hub - 2), dark));
  return out;
}

export const Pixels: React.FC<{ px: Px[] }> = ({ px }) => (
  <>
    {px.map((p, i) => (
      <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.c} opacity={p.o} />
    ))}
  </>
);

/** Deterministic pseudo-random in [0,1). */
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
