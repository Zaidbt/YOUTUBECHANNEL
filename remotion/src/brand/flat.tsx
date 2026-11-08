/** Flat 2D "Kurzgesagt-style" shape helpers for the pixel pipeline (see videos/chameleon/ChameleonK.tsx). */
import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

export type P2 = [number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
/** overshoot "pop" (0 → 1 with a bounce past 1) */
export const backOut = (x: number) => { const k = clamp01(x), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
export const lerp = (a: number, c: number, k: number) => a + (c - a) * k;

/** a smooth closed blob through the points */
export function blob(pts: P2[], seg = 32) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  s.splineThru([...pts.slice(1), pts[0]].map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ShapeGeometry(s, seg);
}
/** a rounded rectangle */
export function rrect(x0: number, y0: number, x1: number, y1: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return new THREE.ShapeGeometry(s, 8);
}
/** a flat stroke along a polyline with a width profile */
export function ribbon(pts: P2[], w: (u: number) => number) {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
    let tx = c[0] - a[0], ty = c[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const hw = w(i / (pts.length - 1)) / 2;
    pos.push(pts[i][0] - ty * hw, pts[i][1] + tx * hw, 0, pts[i][0] + ty * hw, pts[i][1] - tx * hw, 0);
    if (i > 0) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
export const curve = (pts: P2[], n = 40): P2[] => new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(n).map((v) => [v.x, v.y]);
/** outline of a rounded rect as a closed stroke */
export function rrectLine(x0: number, y0: number, x1: number, y1: number, r: number, w: number) {
  const pts: P2[] = [];
  const arc = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x1 - r, y0 + r, -Math.PI / 2); arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, Math.PI / 2); arc(x0 + r, y0 + r, Math.PI); pts.push(pts[0], pts[1]);
  return ribbon(pts, () => w);
}
export const Flat: React.FC<{ g: THREE.BufferGeometry; c: string; z?: number; o?: number; clip?: THREE.Plane[]; p?: P2 }> = ({ g, c, z = 0, o, clip, p }) => (
  <mesh geometry={g} position={[p?.[0] ?? 0, p?.[1] ?? 0, z]}><meshBasicMaterial color={c} transparent={o !== undefined} opacity={o ?? 1} depthWrite={o === undefined} clippingPlanes={clip ?? null} side={THREE.DoubleSide} /></mesh>
);
export const Disc: React.FC<{ at: P2; r: number; c: string; z?: number; o?: number; seg?: number }> = ({ at, r, c, z = 0, o, seg = 24 }) => (
  <mesh position={[at[0], at[1], z]}><circleGeometry args={[r, seg]} /><meshBasicMaterial color={c} transparent={o !== undefined} opacity={o ?? 1} depthWrite={o === undefined} /></mesh>
);
export const ClipOn: React.FC = () => { const { gl } = useThree(); gl.localClippingEnabled = true; return null; };
