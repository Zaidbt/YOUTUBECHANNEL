/** Pixel-art Swiss lever escapement + simplified gear train (2D), in a blueprint or candy palette. */
import React from "react";
import { Px, Pixels, rect, disc, ring, line, gear, spiral, dashed } from "../../brand/pixels";
import { P } from "../../brand/ui";

// Same layout as the 3D model (Watch3D POS): 2D grid x = 90 + 10*x3d, y = 168 - 10*y3d
export const BAL = { x: 112, y: 128, r: 26 };
export const FORK = { x: 90, y: 165 };
export const ESC = { x: 66, y: 204, r: 18 };
export const FOURTH = { x: 86, y: 224, r: 20 };
export const BARREL = { x: 132, y: 218, r: 22 };

export type Pal = {
  balance: string; balanceDk: string; screwA: string; screwB: string; hairspring: string; fork: string; forkDk: string;
  escape: string; fourth: string; barrel: string; spring: string; jewel: string; hole: string; candy: boolean;
};
export const BLUEPRINT_PAL: Pal = {
  balance: P.brass, balanceDk: P.brassDk, screwA: P.yellow, screwB: P.blued, hairspring: P.blued, fork: P.steel, forkDk: P.steelDk,
  escape: P.steel, fourth: P.brass, barrel: P.brass, spring: P.steel, jewel: P.ruby, hole: P.paperDeep, candy: false,
};
/** Matches the candy 3D look (Watch3D "toy" colours). */
export const CANDY_PAL: Pal = {
  balance: "#4fd2ff", balanceDk: "#2a9fd0", screwA: "#ffcf3f", screwB: "#7a5cff", hairspring: "#7a5cff", fork: "#9be84a", forkDk: "#5fae22",
  escape: "#ff5fa8", fourth: "#ff8a3d", barrel: "#ffcf3f", spring: "#fff7ee", jewel: "#ff3b6b", hole: "#efe3d6", candy: true,
};

const rot = (px: number, py: number, cx: number, cy: number, a: number): [number, number] => [
  cx + (px - cx) * Math.cos(a) - (py - cy) * Math.sin(a),
  cy + (px - cx) * Math.sin(a) + (py - cy) * Math.cos(a),
];

export function balance(a: number, o?: number, pal: Pal = BLUEPRINT_PAL): Px[] {
  const { x, y, r } = BAL;
  const out: Px[] = [];
  out.push(...spiral(x, y, 4, 17, 4.5, a * 0.6, pal.hairspring).map((p) => ({ ...p, o })));
  for (let i = 0; i < 3; i++) {
    const s = a + (i * 2 * Math.PI) / 3;
    out.push(...line(x, y, x + Math.cos(s) * (r - 2), y + Math.sin(s) * (r - 2), pal.balance, 2, o));
  }
  out.push(...ring(x, y, r, pal.balance, 3, o), ...ring(x, y, r - 2, pal.balanceDk, 1, o));
  for (let i = 0; i < 8; i++) {
    const s = a + (i * 2 * Math.PI) / 8 + 0.2;
    out.push(...disc(x + Math.cos(s) * (r + 1), y + Math.sin(s) * (r + 1), 1, i % 2 ? pal.screwB : pal.screwA, o));
  }
  out.push(...disc(x, y, 4, pal.fork, o));
  const j = a + Math.PI * 0.62;
  out.push(...disc(x + Math.cos(j) * 4, y + Math.sin(j) * 4, 1, pal.jewel, o), ...disc(x, y, 1, pal.jewel, o));
  return out;
}

export function palletFork(a: number, pal: Pal = BLUEPRINT_PAL): Px[] {
  const { x, y } = FORK;
  const entry = rot(54, 186, x, y, a), exit = rot(82, 190, x, y, a), tail = rot(104, 142, x, y, a);
  const hornL = rot(101, 139, x, y, a), hornR = rot(108, 144, x, y, a);
  return [
    ...line(x, y, entry[0], entry[1], pal.fork, 3), ...line(x, y, exit[0], exit[1], pal.fork, 3), ...line(x, y, tail[0], tail[1], pal.fork, 2),
    ...line(tail[0], tail[1], hornL[0], hornL[1], pal.fork, 2), ...line(tail[0], tail[1], hornR[0], hornR[1], pal.fork, 2),
    rect(entry[0] - 2, entry[1] - 2, 4, 5, pal.jewel), rect(exit[0] - 2, exit[1] - 2, 4, 5, pal.jewel),
    ...disc(x, y, 3, pal.forkDk), ...disc(x, y, 1, pal.jewel),
  ];
}

export function escapeWheel(a: number, pal: Pal = BLUEPRINT_PAL): Px[] {
  const { x, y, r } = ESC;
  const out: Px[] = [];
  for (let i = 0; i < 15; i++) {
    const s = a + (i * 2 * Math.PI) / 15;
    out.push(...line(x + Math.cos(s) * (r - 1), y + Math.sin(s) * (r - 1), x + Math.cos(s + 0.18) * (r + 5), y + Math.sin(s + 0.18) * (r + 5), pal.escape, 2));
  }
  out.push(...disc(x, y, r, pal.escape), ...disc(x, y, r - 3, pal.hole));
  for (let i = 0; i < 5; i++) {
    const s = a + (i * 2 * Math.PI) / 5;
    out.push(...line(x, y, x + Math.cos(s) * (r - 3), y + Math.sin(s) * (r - 3), pal.escape, 2));
  }
  out.push(...disc(x, y, 3, pal.escape), ...disc(x, y, 1, pal.jewel));
  return out;
}

export function train(a: number, pal: Pal = BLUEPRINT_PAL): Px[] {
  return [
    ...gear(FOURTH.x, FOURTH.y, FOURTH.r, 30, -a / 4, pal.fourth, pal.hole, { spokes: 4, tooth: 2 }),
    ...disc(FOURTH.x, FOURTH.y, 1, pal.jewel),
    ...gear(BARREL.x, BARREL.y, BARREL.r, 36, a / 40, pal.barrel, pal.hole, { spokes: 0, tooth: 2, hub: 0 }),
    ...disc(BARREL.x, BARREL.y, BARREL.r - 3, pal.hole),
    ...spiral(BARREL.x, BARREL.y, 3, BARREL.r - 4, 5, a / 40, pal.candy ? pal.barrel : pal.spring),
    ...disc(BARREL.x, BARREL.y, 3, pal.candy ? pal.barrel : P.steelDk), ...disc(BARREL.x, BARREL.y, 1, pal.jewel),
  ];
}

export function caseOutline(pal: Pal = BLUEPRINT_PAL): Px[] {
  if (pal.candy) {
    // flat top-down version of the 3D candy case: cream plate, pink case, yellow bezel
    return [
      ...disc(90, 168, 92, "#ffcf3f"), ...disc(90, 168, 87, "#ff5fa8"), ...disc(90, 168, 84, "#d4c6b8"), ...disc(90, 168, 83, "#efe3d6"),
      rect(181, 162, 1, 1, "#ffcf3f"),
      ...ring(90, 168, 92, "#1a1440", 1), ...ring(90, 168, 84, "#c8b6a6", 1),
    ];
  }
  return [
    ...dashed(90 - 80, 168, 90 + 80, 168, P.chalkDim, 6, 3).map((p) => ({ ...p, o: 0.35 })),
    ...dashed(90, 84, 90, 252, P.chalkDim, 6, 3).map((p) => ({ ...p, o: 0.35 })),
    ...ring(90, 168, 82, P.chalkDim, 1), ...ring(90, 168, 78, P.chalkDim, 1, 0.5),
    rect(172, 164, 4, 8, P.steelDk), rect(166, 166, 6, 4, P.steelDk),
  ];
}

/** Full movement. balanceA: balance angle (rad); escA: escape wheel angle; forkA: pallet fork angle. */
export const Movement: React.FC<{ balanceA: number; escA: number; forkA: number; blur?: boolean; dim?: number; pal?: Pal }> = ({ balanceA, escA, forkA, blur, dim, pal = BLUEPRINT_PAL }) => {
  const bal: Px[] = blur ? [-1, -0.5, 0, 0.5, 1].flatMap((k) => balance(balanceA + k * 1.1, 0.3, pal)) : balance(balanceA, undefined, pal);
  return (
    <g opacity={dim}>
      <Pixels px={caseOutline(pal)} />
      <Pixels px={train(escA, pal)} />
      <Pixels px={escapeWheel(escA, pal)} />
      <Pixels px={palletFork(forkA, pal)} />
      <Pixels px={bal} />
    </g>
  );
};
