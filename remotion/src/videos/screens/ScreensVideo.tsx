/**
 * Video 009 · How do screens work? — true pixel-art 3D, 48 s seamless loop @ 60 fps, 170 BPM drum & bass.
 * All text lives INSIDE the animation: on the phone it is drawn by the screen's own pixels; in the close-up it
 * floats as voxel letters above the pixel. The close-up pixel is the drum machine (R = kick, G = snare, B = hats)
 * and colours are chords. Timing from screens.json (videos/09-screens/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./screens.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { textCells, textWidth } from "../../brand/pixelFont";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type RGB = [number, number, number];
const BAR = EV.bar, BEAT = BAR / 4, S16 = BEAT / 4;
const bt = (bar: number, step = 0) => bar * BAR + step * S16;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export const SCREEN_PALETTE = [
  "#05060a", "#0b0e1a", "#141a33", "#1f2a52", "#2e4080", "#16161c", "#2a2a33", "#4a4a58", "#8a8a9a",
  "#ff2a2a", "#8a1414", "#3a0a0a", "#2aff4a", "#148a28", "#0a3a14", "#2a6aff", "#14388a", "#0a1a3a",
  "#ffff3a", "#3affff", "#ff3aff", "#ffffff", "#ffd23f", "#ff9a1f", "#7ec8ff", "#bfe6ff", "#2fae5a", "#1f6a3a",
];
const BG = "#05060a";
const C: Record<string, RGB> = {
  navy: [0.08, 0.1, 0.2], navy2: [0.12, 0.16, 0.32], white: [1, 1, 1], yellow: [1, 1, 0.23], red: [1, 0.16, 0.16], green: [0.16, 1, 0.29],
  blue: [0.16, 0.42, 1], cyan: [0.23, 1, 1], magenta: [1, 0.23, 1], sky: [0.49, 0.78, 1], sky2: [0.75, 0.9, 1], sun: [1, 0.82, 0.25],
  mount: [0.12, 0.42, 0.23], mount2: [0.18, 0.68, 0.35], ground: [0.12, 0.42, 0.23], orange: [1, 0.6, 0.12], black: [0.02, 0.02, 0.04],
};
const MASK_RGB = (m: number): RGB => [m & 1 ? 1 : 0, m & 2 ? 1 : 0, m & 4 ? 1 : 0];
const NAMED = (rgb: RGB): RGB => {
  const k = (rgb[0] > 0.5 ? 1 : 0) + (rgb[1] > 0.5 ? 2 : 0) + (rgb[2] > 0.5 ? 4 : 0);
  return [C.black, C.red, C.green, C.yellow, C.blue, C.magenta, C.cyan, C.white][k];
};

// ---------- the phone screen: 36 x 64 pixels ----------
const COLS = 36, ROWS = 64;
const cellPos = (c: number, r: number): [number, number] => [c - (COLS - 1) / 2, (ROWS - 1) / 2 - r];
const TC = 17, TR = 33; // the pixel we zoom into
const [TX, TY] = cellPos(TC, TR);

type Line = { text: string; row: number; color: RGB };
function drawLines(lines: Line[], upTo = 99): Map<number, RGB> {
  const m = new Map<number, RGB>();
  for (const l of lines) {
    const x0 = Math.floor((COLS - textWidth(l.text)) / 2);
    for (const [x, y] of textCells(l.text)) if (x0 + x < upTo) m.set((l.row + y) * COLS + x0 + x, l.color);
  }
  return m;
}
const HOOK = drawLines([{ text: "HOW DO", row: 22, color: C.white }, { text: "SCREENS", row: 29, color: C.yellow }, { text: "WORK?", row: 36, color: C.white }]);
const PIX_LINES: Line[] = [{ text: "IT'S ALL", row: 25, color: C.white }, { text: "PIXELS", row: 32, color: C.yellow }];
const PIX = drawLines(PIX_LINES);
const MIL = drawLines([{ text: "2 MILLION", row: 4, color: C.white }, { text: "PIXELS", row: 10, color: C.yellow }]);
const EYE = drawLines([{ text: "YOUR EYE", row: 4, color: C.white }, { text: "BLENDS", row: 10, color: C.yellow }, { text: "THEM", row: 16, color: C.white }]);
const RED = drawLines([{ text: "REDRAWN", row: 3, color: C.white }, { text: "60-120X", row: 9, color: C.yellow }, { text: "A SECOND", row: 15, color: C.white }]);
const NOW = drawLines([{ text: "NOW YOU", row: 26, color: C.white }, { text: "KNOW.", row: 33, color: C.yellow }]);
const HANDLE = drawLines([{ text: "@HOWTO", row: 26, color: C.white }, { text: "WITHZAY", row: 33, color: C.yellow }]);

const landscape = (c: number, r: number): RGB => {
  if (Math.hypot(c - 26, r - 26) < 5) return C.sun;
  const ridge = 40 + 5 * Math.sin(c * 0.35) + 3 * Math.sin(c * 0.9 + 1);
  if (r > 52) return C.ground;
  if (r > ridge) return r > ridge + 3 ? C.mount : C.mount2;
  return r < 22 ? (r % 2 ? C.navy2 : [0.18, 0.26, 0.55]) : r < 30 ? C.sky : C.sky2;
};
const ballFrame = (f: number, c: number, r: number): RGB => {
  const k = ((f % 8) + 8) % 8;
  const bx = 6 + k * 3, by = 30 + 26 * Math.abs(Math.sin((k / 8) * Math.PI * 2)) ;
  if (Math.hypot(c - bx, r - (63 - (by - 22))) < 3) return C.orange;
  return r > 61 ? C.mount2 : C.navy;
};
const CYCLE_T = EV.cycle.map((x) => x[0]);
const REVEAL_CACHE = new Map<number, Map<number, RGB>>();
const revealMap = (upTo: number) => { if (!REVEAL_CACHE.has(upTo)) REVEAL_CACHE.set(upTo, drawLines(PIX_LINES, upTo)); return REVEAL_CACHE.get(upTo)!; };
const lastIdx = (arr: number[], t: number) => { let k = -1; for (let i = 0; i < arr.length && arr[i] <= t + 1e-6; i++) k = i; return k; };

/** What the phone screen shows at time t (one colour per pixel). */
function screen(t: number, c: number, r: number): RGB {
  const b = t / BAR, i = r * COLS + c;
  const bg: RGB = r % 2 ? C.navy : C.navy2;
  if (b < 4 || b >= 33) return bg;
  if (b < 22) {
    if (b >= 18) { // the drop: every pixel cycles colours, offset by position
      const k = lastIdx(CYCLE_T, t);
      const m = EV.cycle[Math.max(0, (k + c + r * 3) % EV.cycle.length)][1];
      return NAMED(MASK_RGB(m));
    }
    const upTo = b < 6 ? Math.ceil(((lastIdx(EV.reveal, t) + 1) / EV.reveal.length) * COLS) : 99;
    if (c >= upTo || b < 4) return bg;
    return NAMED(MASK_RGB(1 + ((c * 3 + r * 5) % 7))); // a mosaic of the 7 RGB mixes, revealed column by column
  }
  if (b < 26) return landscape(c, r);
  if (b < 30) {
    if (r < 21) return C.navy;
    const k = lastIdx(EV.scans, t);
    const scanRow = 21 + ((t - EV.scans[Math.max(0, k)]) / BEAT) * 43;
    if (Math.abs(r - scanRow) < 0.7) return C.white;
    return ballFrame(r < scanRow ? k : k - 1, c, r);
  }
  return bg;
}

/** The zoomed pixel's three lights: the drum machine, then colour chords, levels and the colour storm. */
function targetRGB(t: number): RGB {
  const b = t / BAR;
  const env = (arr: number[]) => { const k = lastIdx(arr, t); return k < 0 ? 0 : Math.exp(-(t - arr[k]) / 0.16); };
  if (b >= 8 && b < 12) return [env(EV.kicks), env(EV.snares), env(EV.hats)];
  if (b >= 12 && b < 16) { const m = EV.masks[Math.min(3, Math.floor(b - 12))][1]; const p = 0.75 + 0.25 * Math.exp(-((t % (BEAT / 2)) / 0.08)); return MASK_RGB(m).map((x) => x * p) as RGB; }
  if (b >= 16 && b < 18) { const l = (lastIdx(EV.levels, t) + 1) / 16; return [l, l, l]; }
  if (b >= 18 && b < 22) { const k = lastIdx(CYCLE_T, t); return MASK_RGB(EV.cycle[Math.max(0, k)][1]); }
  return screen(t, TC, TR);
}

const lod = (t: number) => t >= bt(8) && t < bt(21);
const NEAR = 4;

// ---------- instanced screen + sub-pixels ----------
const tmpC = new THREE.Color();
const toColor = (rgb: RGB) => tmpC.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
const Screen: React.FC<{ t: number }> = ({ t }) => {
  const { cells, subs } = useMemo(() => ({
    cells: new THREE.InstancedMesh(new THREE.PlaneGeometry(0.92, 0.92), new THREE.MeshBasicMaterial(), COLS * ROWS),
    subs: new THREE.InstancedMesh(new THREE.BoxGeometry(0.27, 0.86, 0.06), new THREE.MeshBasicMaterial(), (2 * NEAR + 1) ** 2 * 3),
  }), []);
  const o = new THREE.Object3D(), on = lod(t);
  let si = 0;
  const target = targetRGB(t);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, [x, y] = cellPos(c, r);
    const near = on && Math.abs(c - TC) <= NEAR && Math.abs(r - TR) <= NEAR;
    const col = c === TC && r === TR && t >= bt(8) && t < bt(22) ? target : screen(t, c, r);
    o.position.set(x, y, 0.01); o.scale.setScalar(near ? 1e-4 : 1); o.updateMatrix(); cells.setMatrixAt(i, o.matrix);
    cells.setColorAt(i, toColor(c === TC && r === TR ? NAMED(col) : col));
    if (near) {
      for (let k = 0; k < 3; k++) {
        const lvl = col[k];
        const base: RGB = [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0];
        const shade = lvl > 0.66 ? 1 : lvl > 0.33 ? 0.55 : lvl > 0.08 ? 0.3 : 0.12;
        o.position.set(x + (k - 1) * 0.31, y, 0.03); o.scale.setScalar(1); o.updateMatrix(); subs.setMatrixAt(si, o.matrix);
        subs.setColorAt(si, toColor(base.map((v) => v * shade + (1 - v) * 0.02) as RGB)); si++;
      }
    }
  }
  subs.count = si;
  cells.instanceMatrix.needsUpdate = true; if (cells.instanceColor) cells.instanceColor.needsUpdate = true;
  subs.instanceMatrix.needsUpdate = true; if (subs.instanceColor) subs.instanceColor.needsUpdate = true;
  return <><primitive object={cells} />{si > 0 && <primitive object={subs} />}</>;
};

// ---------- voxel text floating above the zoomed pixel ----------
const VoxelText: React.FC<{ lines: string[]; color: RGB; at: V3; v?: number }> = ({ lines, color, at, v = 0.028 }) => {
  const mesh = useMemo(() => {
    const cells: [number, number][] = [];
    lines.forEach((l, li) => { const x0 = -textWidth(l) / 2; textCells(l).forEach(([x, y]) => cells.push([x0 + x, li * 6 + y])); });
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(v * 0.92, v * 0.92, v * 0.9), new THREE.MeshToonMaterial({ color: new THREE.Color().setRGB(...color, THREE.SRGBColorSpace) }), cells.length);
    const o = new THREE.Object3D();
    cells.forEach(([x, y], i) => { o.position.set(x * v, -y * v, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; return m;
  }, [lines.join("|"), color.join(","), v]);
  return <group position={at}><primitive object={mesh} /></group>;
};
const closeText = (t: number): { lines: string[]; color: RGB } | null => {
  const b = Math.floor(t / BAR);
  const T: Record<number, [string[], RGB]> = {
    8: [["EACH", "PIXEL"], C.white], 9: [["IS 3", "LIGHTS"], C.white], 11: [["MIX", "THEM"], C.white],
    12: [["R+G", "=YELLOW"], C.yellow], 13: [["G+B", "=CYAN"], C.cyan], 14: [["R+B", "=MAGENTA"], C.magenta], 15: [["ALL 3", "=WHITE"], C.white],
    16: [["256", "LEVELS"], C.white], 17: [["EACH"], C.white], 18: [["16.7", "MILLION"], C.yellow], 19: [["COLORS"], C.cyan],
  };
  return T[b] ? { lines: T[b][0], color: T[b][1] } : null;
};

// ---------- the phone ----------
const Phone: React.FC = () => (
  <group>
    <mesh position={[0, 0, -0.7]}><boxGeometry args={[40, 70, 1.2]} /><meshToonMaterial color="#2a2a33" /></mesh>
    <mesh position={[0, 0, -0.08]}><boxGeometry args={[37.5, 65.5, 0.1]} /><meshBasicMaterial color="#05060a" /></mesh>
    <mesh position={[0, 33.4, 0.05]}><boxGeometry args={[6, 0.8, 0.1]} /><meshBasicMaterial color="#16161c" /></mesh>
    <mesh position={[20.2, 10, -0.7]}><boxGeometry args={[0.6, 6, 0.6]} /><meshToonMaterial color="#4a4a58" /></mesh>
  </group>
);

// ---------- camera ----------
const HOME = { p: [0, -6, 98] as V3, l: [0, 3, 0] as V3 };
const CLOSE = { p: [TX + 0.15, TY + 0.45, 2.6] as V3, l: [TX, TY + 0.35, 0] as V3 };
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: 1.4, ...HOME },
  { t: bt(4), p: [1, -3, 84], l: [0, 0, 0] },
  { t: bt(5.8), p: [0.5, -1.5, 72], l: [TX * 0.2, 0.5, 0] },
  { t: bt(7), p: [TX + 1, TY + 2, 15], l: [TX, TY, 0] },
  { t: bt(8), p: [TX + 0.4, TY + 0.8, 4.2], l: [TX, TY + 0.3, 0] },
  { t: bt(9), ...CLOSE },
  { t: bt(13), p: [TX + 0.25, TY + 0.4, 2.7], l: [TX, TY + 0.35, 0] },
  { t: bt(18), ...CLOSE },
  { t: bt(19.5), p: [TX, TY + 0.6, 6.5], l: [TX, TY + 0.2, 0] },
  { t: bt(21), p: [TX * 0.6, TY * 0.6, 28], l: [TX * 0.5, TY * 0.5, 0] },
  { t: bt(22), p: [0, -5, 92], l: [0, 2, 0] },
  { t: bt(30), p: [0, -5, 94], l: [0, 2.5, 0] },
  { t: 45.8, ...HOME }, { t: 48, ...HOME },
];

export const ScreensVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const map = useMemo(glowTexture, []);
  const cam = camAt(CAM, t);
  const b = t / BAR;
  const tgt = targetRGB(t);
  const mixed = NAMED(tgt);
  const lit = Math.max(...tgt);
  const showClose = b >= 8 && b < 20.5;
  const tag = b < 4 || b >= 30 ? "▶ YOUR PHONE" : b < 8 ? "⌕ ZOOM IN" : b < 21 ? "⌕ ONE PIXEL" : b < 26 ? "▶ 2,073,600 PIXELS" : "▶ REFRESH · SLOW-MO";
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/09-screens/music.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={SCREEN_PALETTE} outlineColor="#05060a">
        <CamOn p={cam.p} l={cam.l} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[-20, 30, 40]} intensity={1.4} />
        <Phone />
        <Screen t={t} />
        {showClose && lit > 0.25 && <Glow map={map} at={[TX, TY, -0.05]} size={1.5 + 0.6 * lit} color={`rgb(${mixed.map((v) => Math.round(v * 255)).join(",")})`} opacity={0.55 * lit} />}
        <Glow map={map} at={[0, 0, -3]} size={90} color="#1f2a52" opacity={0.35} />
      </PixelArtCanvas>
      <Labels t={t} cam={cam} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: "#bfe6ff", textShadow: "4px 4px 0 #05060a, -4px 0 0 #05060a, 0 -4px 0 #05060a" }}>{tag}</div>
    </AbsoluteFill>
  );
};
// ---------- crisp labels, anchored to what they describe (not drawn through the pixel pipeline) ----------
type Seg = { t: string; c?: string };
type LabelDef = { from: number; to: number; anchor: V3; lines: Seg[][]; border: string };
const hx = (rgb: RGB) => `rgb(${rgb.map((v) => Math.round(v * 255)).join(",")})`;
const SCREEN_MID: V3 = [0, 4, 0], ABOVE_PIXEL: V3 = [TX, TY + 0.72, 0];
const LABELS: LabelDef[] = [
  { from: 0, to: 4, anchor: SCREEN_MID, border: "#ffd23f", lines: [[{ t: "HOW DO" }], [{ t: "SCREENS", c: "#ffd23f" }], [{ t: "WORK? 🎧" }]] },
  { from: 4, to: 8, anchor: [TX, TY + 6, 0], border: "#ffffff", lines: [[{ t: "IT'S ALL" }], [{ t: "PIXELS", c: "#ffd23f" }]] },
  { from: 8, to: 10, anchor: ABOVE_PIXEL, border: "#ffffff", lines: [[{ t: "EACH PIXEL" }], [{ t: "= 3 LIGHTS", c: "#ffd23f" }]] },
  { from: 10, to: 12, anchor: ABOVE_PIXEL, border: "#ffffff", lines: [[{ t: "RED", c: "#ff2a2a" }, { t: " " }, { t: "GREEN", c: "#2aff4a" }], [{ t: "BLUE", c: "#2a6aff" }]] },
  { from: 12, to: 13, anchor: ABOVE_PIXEL, border: "#ffff3a", lines: [[{ t: "R", c: "#ff2a2a" }, { t: "+" }, { t: "G", c: "#2aff4a" }, { t: " =" }], [{ t: "YELLOW", c: "#ffff3a" }]] },
  { from: 13, to: 14, anchor: ABOVE_PIXEL, border: "#3affff", lines: [[{ t: "G", c: "#2aff4a" }, { t: "+" }, { t: "B", c: "#2a6aff" }, { t: " =" }], [{ t: "CYAN", c: "#3affff" }]] },
  { from: 14, to: 15, anchor: ABOVE_PIXEL, border: "#ff3aff", lines: [[{ t: "R", c: "#ff2a2a" }, { t: "+" }, { t: "B", c: "#2a6aff" }, { t: " =" }], [{ t: "MAGENTA", c: "#ff3aff" }]] },
  { from: 15, to: 16, anchor: ABOVE_PIXEL, border: "#ffffff", lines: [[{ t: "R", c: "#ff2a2a" }, { t: "+" }, { t: "G", c: "#2aff4a" }, { t: "+" }, { t: "B", c: "#2a6aff" }, { t: " =" }], [{ t: "WHITE" }]] },
  { from: 16, to: 18, anchor: ABOVE_PIXEL, border: "#ffffff", lines: [[{ t: "256 LEVELS" }], [{ t: "EACH", c: "#ffd23f" }]] },
  { from: 18, to: 20, anchor: ABOVE_PIXEL, border: "#ffd23f", lines: [[{ t: "16.7 MILLION", c: "#ffd23f" }], [{ t: "COLORS" }]] },
  { from: 22, to: 24, anchor: SCREEN_MID, border: "#ffffff", lines: [[{ t: "2 MILLION", c: "#ffd23f" }], [{ t: "PIXELS" }], [{ t: "ON YOUR PHONE" }]] },
  { from: 24, to: 26, anchor: SCREEN_MID, border: "#ffffff", lines: [[{ t: "YOUR EYE" }], [{ t: "BLENDS THEM", c: "#ffd23f" }]] },
  { from: 26, to: 30, anchor: [0, 22, 0], border: "#ffffff", lines: [[{ t: "REDRAWN" }], [{ t: "60-120×", c: "#ffd23f" }], [{ t: "A SECOND" }]] },
  { from: 30, to: 32, anchor: SCREEN_MID, border: "#ffd23f", lines: [[{ t: "NOW YOU" }], [{ t: "KNOW.", c: "#ffd23f" }]] },
  { from: 32, to: 33, anchor: SCREEN_MID, border: "#ffffff", lines: [[{ t: "@HOWTOWITHZAY", c: "#ffd23f" }]] },
  { from: 33, to: 34.01, anchor: SCREEN_MID, border: "#ffd23f", lines: [[{ t: "HOW DO" }], [{ t: "SCREENS", c: "#ffd23f" }], [{ t: "WORK? 🎧" }]] },
];
const projCam = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.1, 300);
function project(a: V3, cam: { p: V3; l: V3 }): [number, number] {
  projCam.position.set(...cam.p); projCam.lookAt(...cam.l); projCam.updateMatrixWorld();
  const v = new THREE.Vector3(...a).project(projCam);
  return [((v.x + 1) / 2) * 1080, ((1 - v.y) / 2) * 1920];
}
const Labels: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => {
  const b = t / BAR;
  const L = LABELS.find((l) => b >= l.from && b < l.to);
  if (!L) return null;
  const [x, y] = project(L.anchor, cam);
  const age = (b - L.from) * BAR, left = (L.to - b) * BAR;
  const first = L.from === 0, last = L.to > 34;
  const o = first || last ? 1 : Math.min(1, Math.floor(Math.min(age, left) / 0.06) / 3);
  const pop = first || last ? 1 : age < 0.1 ? 0.92 : 1;
  const cx = Math.max(300, Math.min(780, x)), cy = Math.max(330, Math.min(1500, y));
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
const CamOn: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
