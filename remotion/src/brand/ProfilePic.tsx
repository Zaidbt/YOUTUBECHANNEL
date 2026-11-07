/** Instagram profile picture for @howtowithzay: a pixel-art gold cog with a "Z", on a dark dithered glow. 1080x1080. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pixels, Px, rect } from "./pixels";

const PAL = { bg: "#0b0604", bg2: "#1a0d08", glow1: "#2b1410", glow2: "#4a2c1a", dk: "#6b3512", mid: "#b8661a", gold: "#f0ac2e", hi: "#ffcf5a", hi2: "#ffe9a8", white: "#fff8e6", ink: "#0b0604" };
const N = 96; // 96x96 grid, scaled to 1080 (11.25 px per pixel)

export const ProfilePic: React.FC = () => {
  const px: Px[] = [];
  const c = (N - 1) / 2;
  // background: dark, with a dithered radial glow
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - c, y - c) / (N / 2);
    const b = ((x & 1) ^ (y & 1)) === 1, b2 = (x % 2 === 0 && y % 2 === 0);
    let col = PAL.bg;
    if (d < 0.95) col = b2 ? PAL.bg2 : PAL.bg;
    if (d < 0.8) col = b ? PAL.bg2 : PAL.bg;
    if (d < 0.68) col = b ? PAL.glow1 : PAL.bg2;
    if (d < 0.58) col = PAL.glow1;
    if (d < 0.52) col = b ? PAL.glow2 : PAL.glow1;
    px.push(rect(x, y, 1, 1, col));
  }
  // cog: ring + 10 square teeth, shaded with a light from the top-left
  const R_OUT = 30, R_IN = 21, TEETH = 10;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const toothA = ((a / (2 * Math.PI)) * TEETH + 100) % 1;
    const inTooth = r >= R_OUT - 1 && r <= R_OUT + 7 && Math.abs(toothA - 0.5) < 0.2;
    const inRing = r >= R_IN && r <= R_OUT;
    if (!(inTooth || inRing)) continue;
    const light = -(dx + dy) / (Math.SQRT2 * Math.max(1, r)); // +1 toward the top-left
    let col = light > 0.45 ? PAL.hi : light > -0.1 ? PAL.gold : light > -0.6 ? PAL.mid : PAL.dk;
    if (Math.abs(r - R_OUT) < 0.6 || Math.abs(r - R_IN) < 0.6 || (inTooth && r > R_OUT + 6)) col = light > 0 ? PAL.hi2 : PAL.dk;
    px.push(rect(x, y, 1, 1, col));
  }
  // outline the cog (1-px dark edge)
  const solid = (x: number, y: number) => {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const toothA = ((a / (2 * Math.PI)) * TEETH + 100) % 1;
    return (r >= R_IN && r <= R_OUT) || (r >= R_OUT - 1 && r <= R_OUT + 7 && Math.abs(toothA - 0.5) < 0.2);
  };
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    if (solid(x, y)) continue;
    if (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) px.push(rect(x, y, 1, 1, PAL.ink));
  }
  // the "Z" in the middle, 2-tone with a drop shadow
  const Z = ["##########", "##########", "      ### ", "     ###  ", "    ###   ", "   ###    ", "  ###     ", " ###      ", "##########", "##########"];
  const s = 2, zx = c - (Z[0].length * s) / 2 + 0.5, zy = c - (Z.length * s) / 2 + 0.5;
  Z.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") px.push(rect(zx + i * s + 1, zy + j * s + 1, s, s, PAL.ink)); }));
  Z.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") px.push(rect(zx + i * s, zy + j * s, s, s, j < 2 ? PAL.white : PAL.hi2)); }));
  // a few sparkles
  [[20, 22], [76, 30], [70, 76], [24, 70]].forEach(([x, y]) => px.push(rect(x, y - 1, 1, 3, PAL.hi), rect(x - 1, y, 3, 1, PAL.hi), rect(x, y, 1, 1, PAL.white)));
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <svg viewBox={`0 0 ${N} ${N}`} width={1080} height={1080} shapeRendering="crispEdges"><Pixels px={px} /></svg>
    </AbsoluteFill>
  );
};
