/**
 * Readable labels: crisp HTML text (Press Start 2P) in a solid dark panel with a coloured border,
 * anchored next to what it describes by projecting a 3D point through the scene camera.
 * Never rendered through the pixel pipeline, so it stays sharp. One label at a time.
 */
import React from "react";
import * as THREE from "three";

type V3 = [number, number, number];
export type Seg = { t: string; c?: string };
export type LabelDef = { from: number; to: number; anchor: V3 | ((t: number) => V3); lines: Seg[][]; border: string; hold?: boolean };

const projCam = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.1, 300);
export function project(a: V3, cam: { p: V3; l: V3 }, fov = 42): [number, number] {
  projCam.fov = fov; projCam.updateProjectionMatrix();
  projCam.position.set(...cam.p); projCam.lookAt(...cam.l); projCam.updateMatrixWorld();
  const v = new THREE.Vector3(...a).project(projCam);
  return [((v.x + 1) / 2) * 1080, ((1 - v.y) / 2) * 1920];
}

/** `hold: true` = no pop/fade (use for the loop hook on the first and last frames). */
export const Labels: React.FC<{ t: number; cam: { p: V3; l: V3 }; labels: LabelDef[]; fov?: number }> = ({ t, cam, labels, fov = 42 }) => {
  const L = labels.find((l) => t >= l.from && t < l.to);
  if (!L) return null;
  const anchor = typeof L.anchor === "function" ? L.anchor(t) : L.anchor;
  const [x, y] = project(anchor, cam, fov);
  const age = t - L.from, left = L.to - t;
  const o = L.hold ? 1 : Math.min(1, Math.floor(Math.min(age, left) / 0.06) / 3);
  const pop = L.hold ? 1 : age < 0.1 ? 0.92 : 1;
  // keep the whole panel on screen: Press Start 2P glyphs are 1 em wide
  const width = Math.max(...L.lines.map((segs, i) => segs.reduce((n, sg) => n + [...sg.t].length, 0) * (i === 0 && L.lines.length > 1 ? 44 : 58))) + 76;
  const half = Math.min(width / 2, 520);
  const cx = Math.max(half + 24, Math.min(1080 - half - 24, x)), cy = Math.max(380, Math.min(1500, y));
  return (
    <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%, -100%) scale(${pop})`, opacity: o, textAlign: "center", fontFamily: "PressStart2P",
      background: "rgba(5,6,10,0.9)", border: `8px solid ${L.border}`, boxShadow: "10px 10px 0 #000", padding: "26px 30px 18px", lineHeight: 1.35, whiteSpace: "nowrap" }}>
      {L.lines.map((segs, i) => (
        <div key={i} style={{ fontSize: i === 0 && L.lines.length > 1 ? 44 : 58, color: "#ffffff", marginBottom: 8 }}>
          {segs.map((sg, j) => <span key={j} style={{ color: sg.c ?? "#ffffff" }}>{sg.t}</span>)}
        </div>
      ))}
    </div>
  );
};
