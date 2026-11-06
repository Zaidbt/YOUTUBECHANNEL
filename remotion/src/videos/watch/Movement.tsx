/** Pixel-art Swiss lever escapement + simplified gear train, blueprint cutaway style. */
import React from "react";
import { Px, Pixels, rect, disc, ring, line, gear, spiral, dashed } from "../../brand/pixels";
import { P } from "../../brand/ui";

export const BAL = { x: 112, y: 128, r: 26 };
export const FORK = { x: 90, y: 165 };
export const ESC = { x: 66, y: 204, r: 18 };
export const FOURTH = { x: 86, y: 224, r: 20 };
export const BARREL = { x: 132, y: 218, r: 22 };

const rot = (px: number, py: number, cx: number, cy: number, a: number): [number, number] => [
  cx + (px - cx) * Math.cos(a) - (py - cy) * Math.sin(a),
  cy + (px - cx) * Math.sin(a) + (py - cy) * Math.cos(a),
];

export function balance(a: number, o?: number): Px[] {
  const { x, y, r } = BAL;
  const out: Px[] = [];
  out.push(...spiral(x, y, 4, 17, 4.5, a * 0.6, P.blued).map((p) => ({ ...p, o })));
  for (let i = 0; i < 3; i++) {
    const s = a + (i * 2 * Math.PI) / 3;
    out.push(...line(x, y, x + Math.cos(s) * (r - 2), y + Math.sin(s) * (r - 2), P.brass, 2, o));
  }
  out.push(...ring(x, y, r, P.brass, 3, o), ...ring(x, y, r - 2, P.brassDk, 1, o));
  for (let i = 0; i < 8; i++) {
    const s = a + (i * 2 * Math.PI) / 8 + 0.2;
    out.push(...disc(x + Math.cos(s) * (r + 1), y + Math.sin(s) * (r + 1), 1, i % 2 ? P.blued : P.yellow, o));
  }
  // roller + impulse jewel
  out.push(...disc(x, y, 4, P.steel, o));
  const j = a + Math.PI * 0.62;
  out.push(...disc(x + Math.cos(j) * 4, y + Math.sin(j) * 4, 1, P.ruby, o), ...disc(x, y, 1, P.ruby, o));
  return out;
}

export function palletFork(a: number): Px[] {
  const { x, y } = FORK;
  const entry = rot(54, 186, x, y, a), exit = rot(82, 190, x, y, a), tail = rot(104, 142, x, y, a);
  const hornL = rot(101, 139, x, y, a), hornR = rot(108, 144, x, y, a);
  return [
    ...line(x, y, entry[0], entry[1], P.steel, 3), ...line(x, y, exit[0], exit[1], P.steel, 3), ...line(x, y, tail[0], tail[1], P.steel, 2),
    ...line(tail[0], tail[1], hornL[0], hornL[1], P.steel, 2), ...line(tail[0], tail[1], hornR[0], hornR[1], P.steel, 2),
    rect(entry[0] - 2, entry[1] - 2, 4, 5, P.ruby), rect(exit[0] - 2, exit[1] - 2, 4, 5, P.ruby),
    ...disc(x, y, 3, P.steelDk), ...disc(x, y, 1, P.ruby),
  ];
}

export function escapeWheel(a: number): Px[] {
  const { x, y, r } = ESC;
  const out: Px[] = [];
  for (let i = 0; i < 15; i++) {
    const s = a + (i * 2 * Math.PI) / 15;
    out.push(...line(x + Math.cos(s) * (r - 1), y + Math.sin(s) * (r - 1), x + Math.cos(s + 0.18) * (r + 5), y + Math.sin(s + 0.18) * (r + 5), P.steel, 2));
  }
  out.push(...disc(x, y, r, P.steel), ...disc(x, y, r - 3, P.paperDeep));
  for (let i = 0; i < 5; i++) {
    const s = a + (i * 2 * Math.PI) / 5;
    out.push(...line(x, y, x + Math.cos(s) * (r - 3), y + Math.sin(s) * (r - 3), P.steel, 2));
  }
  out.push(...gear(x, y, 4, 7, a, P.steelDk, P.steelDk, { spokes: 0, tooth: 2, hub: 0 }), ...disc(x, y, 1, P.ruby));
  return out;
}

export function train(a: number): Px[] {
  return [
    ...gear(FOURTH.x, FOURTH.y, FOURTH.r, 30, -a / 4, P.brass, P.paperDeep, { spokes: 4, tooth: 2 }),
    ...disc(FOURTH.x, FOURTH.y, 1, P.ruby),
    ...gear(BARREL.x, BARREL.y, BARREL.r, 36, a / 40, P.brass, P.paperDeep, { spokes: 0, tooth: 2, hub: 0 }),
    ...disc(BARREL.x, BARREL.y, BARREL.r - 3, P.paperDeep),
    ...spiral(BARREL.x, BARREL.y, 3, BARREL.r - 4, 5, a / 40, P.steel),
    ...disc(BARREL.x, BARREL.y, 3, P.steelDk), ...disc(BARREL.x, BARREL.y, 1, P.ruby),
  ];
}

export function caseOutline(): Px[] {
  return [
    ...dashed(90 - 80, 168, 90 + 80, 168, P.chalkDim, 6, 3).map((p) => ({ ...p, o: 0.35 })),
    ...dashed(90, 84, 90, 252, P.chalkDim, 6, 3).map((p) => ({ ...p, o: 0.35 })),
    ...ring(90, 168, 82, P.chalkDim, 1), ...ring(90, 168, 78, P.chalkDim, 1, 0.5),
    // crown + stem
    rect(172, 164, 4, 8, P.steelDk), rect(166, 166, 6, 4, P.steelDk),
  ];
}

/** Full movement. balanceA: balance angle (rad); escA: escape wheel angle; forkA: pallet fork angle. */
export const Movement: React.FC<{ balanceA: number; escA: number; forkA: number; blur?: boolean; dim?: number }> = ({ balanceA, escA, forkA, blur, dim }) => {
  const bal: Px[] = blur ? [-1, -0.5, 0, 0.5, 1].flatMap((k) => balance(balanceA + k * 1.1, 0.3)) : balance(balanceA);
  return (
    <g opacity={dim}>
      <Pixels px={caseOutline()} />
      <Pixels px={train(escA)} />
      <Pixels px={escapeWheel(escA)} />
      <Pixels px={palletFork(forkA)} />
      <Pixels px={bal} />
    </g>
  );
};
