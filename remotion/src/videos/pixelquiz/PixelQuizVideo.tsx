/**
 * Video 020 · PIXEL QUIZ — how screens work, as a 3-level game the viewer plays (question → 3-2-1 → zoom into the
 * screen for the answer → score). One continuous camera: the phone's picture is a real grid of pixels, and zooming in
 * resolves every pixel into its red / green / blue lights (subpixels); zooming out merges them again (what the eye does).
 * LEVEL 1: "your screen has no yellow — what makes it?" → red + green light. LEVEL 2: "what makes white?" → all three
 * on (and black = all off; on OLED the pixel is really off). Mixer: each light has 256 levels → 256³ = 16.7 M colours.
 * LEVEL 3: "how many lights in your phone screen?" → 1080 × 2400 pixels × 3 = 7,776,000 ≈ 8 million, redrawn 60-120
 * times a second.
 * 40 s loop, 108 BPM electro-funk (pixelquiz.json + music.wav from videos/20-pixelquiz/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./pixelquiz.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, rrect, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type RGB = [number, number, number];
const D = EV.duration, BAR = EV.bar, BEAT = BAR / 4;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;
const QS = EV.q as number[], AS = EV.a as number[], COUNT = EV.count as number[][], MIX = EV.mix as number[], REDRAW = EV.redraw as number[], AGAIN = EV.again;

const hex = (c: RGB) => "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
// picture colours (all in the palette, so flat areas stay flat)
const SKY: RGB = [28, 42, 110], SKY2: RGB = [43, 63, 153], STAR: RGB = [255, 243, 176], WATER: RGB = [31, 181, 168], WATER_L: RGB = [110, 230, 207];
const YEL: RGB = [255, 210, 0], YEL_D: RGB = [232, 160, 0], ORANGE: RGB = [255, 138, 31], BLACK: RGB = [0, 0, 0], WHITE: RGB = [255, 255, 255], GSHADE: RGB = [200, 205, 240], PURPLE: RGB = [122, 77, 255];
const MIXC: RGB[] = [[255, 79, 139], [255, 138, 31], [255, 210, 0], [63, 207, 106], [31, 181, 168], [74, 154, 255], [122, 77, 255], [255, 58, 42], [110, 230, 207], [255, 255, 255]];
export const QUIZ_PALETTE = [...new Set([
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#fff3b0", "#1fb5a8", "#6ee6cf", "#ffd200", "#e8a000", "#ff8a1f", "#000000", "#ffffff", "#c8cdf0", "#7a4dff",
  "#ff4f8b", "#3fcf6a", "#4a9aff", "#ff3a2a", "#8a1414", "#1f8a4a", "#1f4abf", "#3a1010", "#103a1c", "#10204a", "#05060f", "#3a3f5a", "#5a607a", "#9aa0b8",
  "#b48cff", "#4a2a5a", "#7a4a6a", "#fff08a", "#ffbf6a", "#0f6e6a", "#bfe6ff", "#d94a7a",
])];
const BG = "#090d2b";
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 6);

// ================= the picture: a grid of pixels =================
const W = 18, H = 30, CS = 0.16, SC: P2 = [0, 0.25];
const cellPos = (c: number, r: number): P2 => [SC[0] + (c - (W - 1) / 2) * CS, SC[1] + ((H - 1) / 2 - r) * CS];
const FC = 6, FR = 16, [FX, FY] = cellPos(FC, FR);                                 // the featured pixel
const ell = (c: number, r: number, cx: number, cy: number, rx: number, ry: number) => ((c - cx) / rx) ** 2 + ((r - cy) / ry) ** 2 <= 1;
const duck = (c: number, r0: number, bob: number): RGB => {
  const r = r0 - bob;                                                               // the duck bobs by one pixel
  if (r0 >= 22) return (c + r0 * 2 + bob) % 5 === 0 && r0 % 2 === 0 ? WATER_L : WATER;
  if (c === 12 && r === 11) return BLACK;
  if (c >= 14 && c <= 16 && (r === 12 || r === 13) && !(c === 16 && r === 13)) return ORANGE;
  if (ell(c, r, 8, 18.5, 3, 2)) return YEL_D;
  if (ell(c, r, 9, 18, 5.6, 4.1) || ell(c, r, 11.5, 12.2, 3.3, 3.3)) return YEL;
  if (ell(c, r0, 3.5, 4.5, 2.1, 2.1)) return STAR;
  if ((c * 7 + r0 * 13) % 41 === 0 && r0 < 20) return STAR;
  return r0 > 16 ? SKY2 : SKY;
};
const ghost = (c: number, r: number, tint: RGB): RGB => {
  if ((c === 7 || c === 11) && (r === 12 || r === 13)) return BLACK;
  if (c >= 8 && c <= 10 && r === 16) return BLACK;
  const body = ell(c, r, 9, 13, 5.4, 5.4) || (c >= 4 && c <= 14 && r >= 13 && r <= 21 && !(r === 21 && c % 3 === 1));
  if (body) return c >= 13 && r > 9 ? (tint === WHITE ? GSHADE : tint) : tint;
  if ((c * 5 + r * 11) % 37 === 0) return PURPLE;
  return BLACK;
};
// screen states: duck → (bar 6) ghost → (bar 12) duck, then one redraw per beat (duck bobs); each change sweeps down
const TR = [b(6), b(12), ...REDRAW], SWEEP = 0.22;
const tintAt = (t: number): RGB => { const n = MIX.filter((m) => t >= m).length; return n === 0 || t >= b(12) ? WHITE : MIXC[n - 1]; };
const colourAt = (c: number, r: number, t: number): RGB => {
  const n = TR.filter((x) => t >= x + (r / H) * SWEEP).length;
  if (n === 1) return ghost(c, r, tintAt(t));
  return duck(c, r, n >= 2 ? (n - 2) % 2 : 0);
};
const sweepRow = (t: number) => { const x = TR.find((q) => t >= q && t < q + SWEEP); return x === undefined ? -1 : ((t - x) / SWEEP) * H; };
const SQ = rrect(-CS * 0.5, -CS * 0.5, CS * 0.5, CS * 0.5, 0);
const BAR_G = rrect(-CS * 0.115, -CS * 0.4, CS * 0.115, CS * 0.4, CS * 0.05);
const SUB = [{ dx: -0.3, on: "#ff3a2a", mid: "#8a1414", off: "#3a1010" }, { dx: 0, on: "#3fcf6a", mid: "#1f8a4a", off: "#103a1c" }, { dx: 0.3, on: "#4a9aff", mid: "#1f4abf", off: "#10204a" }];
const STARS = Array.from({ length: 60 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));
const Wedge: React.FC<{ r: number; a0: number; da: number; c: string; z: number }> = ({ r, a0, da, c, z }) => (
  <mesh position={[0, 0, z]}><circleGeometry args={[r, 8, a0, da]} /><meshBasicMaterial color={c} /></mesh>
);
const Scene: React.FC<{ t: number; map: THREE.Texture; cam: { p: V3; l: V3 } }> = ({ t, map, cam }) => {
  const d = cam.p[2], near = clamp01((10 - d) / 5), k = beatK(t), sw = sweepRow(t);
  const cells: React.ReactNode[] = [], subs: React.ReactNode[] = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const [x, y] = cellPos(c, r), col = colourAt(c, r, t);
    if (near < 1) cells.push(<Flat key={`c${c}-${r}`} g={SQ} c={hex(col)} p={[x, y]} z={0.02} o={near > 0 ? 1 - near : undefined} />);
    if (near > 0 && Math.abs(x - cam.l[0]) < 0.2 * d + 0.25 && Math.abs(y - cam.l[1]) < 0.36 * d + 0.25) {
      SUB.forEach((s, i) => { const v = col[i] / 255, bx = x + s.dx * CS; subs.push(
        <React.Fragment key={`s${c}-${r}-${i}`}>
          <Flat g={BAR_G} c={v > 0.85 ? s.on : v > 0.3 ? s.mid : s.off} p={[bx, y]} z={0.03} o={near < 1 ? near : undefined} />
          {v > 0.3 && v <= 0.85 && <Flat g={BAR_G} c={s.on} p={[bx, y]} z={0.031} o={near * (v - 0.3) / 0.55} />}
          {v > 0.6 && d < 4 && <Glow map={map} at={[bx, y, 0.05]} size={CS * 0.9} color={s.on} opacity={0.45 * near * v * (0.8 + 0.2 * k)} />}
        </React.Fragment>); });
    }
  }
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      <group position={[0, 0.25, -12]}>{Array.from({ length: 12 }, (_, i) => <Wedge key={`w${i}`} r={12} a0={2 * LW * t + (i * Math.PI) / 6} da={Math.PI / 12} c="#121a4a" z={0} />)}</group>
      {[5.0, 4.0, 3.2].map((r, i) => <Disc key={`h${i}`} at={[0, 0.25]} r={r * (1 + 0.03 * k * (i + 1))} c={["#121a4a", "#1c2a6e", "#2b3f99"][i]} z={-10 + i * 0.1} seg={56} />)}
      {/* the 3 lights orbit the phone */}
      {SUB.map((s, i) => { const a = 3 * LW * t + (i * 2 * Math.PI) / 3, p: V3 = [Math.cos(a) * 2.45, 0.25 + Math.sin(a) * 3.3, Math.sin(a + 1) > 0 ? -1 : -3]; return (
        <React.Fragment key={`orb${i}`}><Glow map={map} at={p} size={1.5 + 0.4 * k} color={s.on} opacity={0.8} /><Disc at={[p[0], p[1]]} r={0.16} c={s.on} z={p[2] + 0.01} seg={16} /></React.Fragment>); })}
      {/* phone */}
      <Flat g={rrect(SC[0] - (W * CS) / 2 - 0.2, SC[1] - (H * CS) / 2 - 0.24, SC[0] + (W * CS) / 2 + 0.2, SC[1] + (H * CS) / 2 + 0.24, 0.28)} c="#5a607a" z={-0.02} />
      <Flat g={rrect(SC[0] - (W * CS) / 2 - 0.14, SC[1] - (H * CS) / 2 - 0.18, SC[0] + (W * CS) / 2 + 0.14, SC[1] + (H * CS) / 2 + 0.18, 0.22)} c="#05060f" z={-0.01} />
      <Flat g={rrect(SC[0] - (W * CS) / 2, SC[1] - (H * CS) / 2, SC[0] + (W * CS) / 2, SC[1] + (H * CS) / 2, 0.02)} c="#000000" z={0} />
      <Flat g={rrect(SC[0] + (W * CS) / 2 + 0.2, SC[1] + 0.6, SC[0] + (W * CS) / 2 + 0.27, SC[1] + 1.3, 0.03)} c="#3a3f5a" z={-0.03} />
      {cells}
      {subs}
      {sw >= 0 && d > 6 && <Flat g={rrect(SC[0] - (W * CS) / 2, -0.04, SC[0] + (W * CS) / 2, 0.04, 0)} c="#ffffff" p={[0, cellPos(0, sw)[1]]} z={0.06} o={0.8} />}
      <Flat g={rrect(SC[0] - 0.3, SC[1] + (H * CS) / 2 + 0.05, SC[0] + 0.3, SC[1] + (H * CS) / 2 + 0.12, 0.03)} c="#3a3f5a" z={0.01} />
      <Glow map={map} at={[0, 0.25, -0.5]} size={9} color="#4a9aff" opacity={0.22 + 0.1 * k} />
    </group>
  );
};

// ================= tags, camera, labels, HUD =================
type Tag = { txt: string; at: V3; from: number; to: number; col: string };
const TAGS: Tag[] = [
  { txt: "ON", at: [FX - 0.3 * CS, FY - 0.45 * CS, 0.1], from: b(3.3), to: b(4.3), col: "#ff3a2a" },
  { txt: "ON", at: [FX, FY - 0.45 * CS, 0.1], from: b(3.45), to: b(4.3), col: "#3fcf6a" },
  { txt: "OFF", at: [FX + 0.3 * CS, FY - 0.45 * CS, 0.1], from: b(3.6), to: b(4.3), col: "#4a9aff" },
  { txt: "1 PIXEL = 3 LIGHTS", at: [FX, FY + 0.52 * CS, 0.1], from: b(3.3), to: b(4.3), col: "#ffffff" },
  { txt: "ALL ON", at: [FX - 2 * CS, FY + 0.5 * CS, 0.1], from: AS[1] + 0.5, to: b(9.4), col: "#ffffff" },
  { txt: "ALL OFF", at: [FX - 3 * CS, FY - 0.5 * CS + 0.02, 0.1], from: AS[1] + 0.9, to: b(9.4), col: "#9aa0b8" },
  { txt: "A: 80,000", at: [0, 1.25, 0.5], from: QS[2] + 0.4, to: AS[2], col: "#ff4f8b" },
  { txt: "B: 800,000", at: [0, 0.6, 0.5], from: QS[2] + 0.6, to: AS[2], col: "#ffd200" },
  { txt: "C: 8 MILLION", at: [0, -0.05, 0.5], from: QS[2] + 0.8, to: b(15), col: "#6ee6cf" },
  { txt: "3/3? COMMENT YOUR SCORE 👇", at: [0, -0.7, 0.5], from: b(15), to: AGAIN, col: "#fff08a" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 26, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.2, 29] as V3, l: [0, 0.2, 0] as V3 };
const at = (x: number, y: number, z: number) => ({ p: [x, y, z] as V3, l: [x, y, 0] as V3 });
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: b(1.6), ...HOME },
  { t: b(2.5), ...at(FX, FY, 2.7) }, { t: b(3.3), ...at(FX, FY, 1.15) }, { t: b(4.2), ...at(FX, FY, 1.15) },
  { t: b(5.2), ...at(FX, FY, 9) }, { t: b(5.9), ...HOME }, { t: b(7.4), ...HOME },
  { t: b(7.85), ...at(FX - 1.5 * CS, FY, 9) }, { t: b(8.3), ...at(FX - 2.5 * CS, FY, 2.7) }, { t: b(8.8), ...at(FX - 2.5 * CS, FY, 2.6) }, { t: b(9.4), ...at(FX - 2.5 * CS, FY, 2.5) },
  { t: b(10), ...at(FX, FY, 1.3) }, { t: b(10.9), ...at(FX, FY, 1.3) },
  { t: b(11.6), ...at(0, 0.5, 12) }, { t: b(12.2), ...HOME }, { t: b(13.6), ...HOME },
  { t: b(14.6), ...at(0, 0.2, 25) }, { t: AGAIN, ...HOME }, { t: D, ...HOME },
];
const TOPZ: [number, number] = [540, 330];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "LEVEL 1: YOUR SCREEN" }], [{ t: "HAS NO YELLOW 😳", c: "#ffd200" }], [{ t: "WHAT MAKES IT?" }]];
const LABELS: LabelDef[] = [
  Lb(0, AS[0], "#ffd200", HOOK, true),
  Lb(AS[0], b(4.3), "#3fcf6a", [[{ t: "ZOOM IN: IT'S JUST" }], [{ t: "RED", c: "#ff3a2a" }, { t: " + " }, { t: "GREEN", c: "#3fcf6a" }], [{ t: "LIGHT ✅" }]]),
  Lb(b(4.3), QS[1], "#ffffff", [[{ t: "TOO TINY TO SEE:" }], [{ t: "YOUR EYE BLURS", c: "#ffd200" }], [{ t: "THEM TOGETHER 👁️" }]]),
  Lb(QS[1], AS[1], "#ffffff", [[{ t: "LEVEL 2:" }], [{ t: "WHAT MAKES", c: "#6ee6cf" }], [{ t: "WHITE? 👻" }]]),
  Lb(AS[1], b(9.5), "#ffffff", [[{ t: "ALL 3 ON = WHITE ✅" }], [{ t: "ALL OFF = BLACK", c: "#9aa0b8" }], [{ t: "OLED: REALLY OFF" }]]),
  Lb(b(9.5), QS[2], "#ff4f8b", [[{ t: "EACH LIGHT HAS" }], [{ t: "256 LEVELS →", c: "#ff4f8b" }], [{ t: "16.7M COLOURS 🌈" }]]),
  Lb(QS[2], AS[2], "#6ee6cf", [[{ t: "LEVEL 3: HOW MANY" }], [{ t: "LIGHTS IN YOUR", c: "#6ee6cf" }], [{ t: "PHONE SCREEN?" }]]),
  Lb(AS[2], AGAIN, "#6ee6cf", [[{ t: "C: ~8 MILLION ✅" }], [{ t: "REDRAWN 60-120", c: "#6ee6cf" }], [{ t: "TIMES A SECOND" }]]),
  Lb(AGAIN, D + 0.01, "#ffd200", HOOK, true),
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
/** game HUD: level, score, countdown, and the R/G/B levels of the pixel we are looking at */
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const level = t >= AGAIN || t < QS[1] ? 1 : t < QS[2] ? 2 : 3;
  const score = t >= AGAIN ? 0 : AS.filter((a) => t >= a).length;
  const cw = COUNT.find((c3) => t >= c3[0] && t < c3[0] + 3 * BEAT), cn = cw ? 3 - Math.floor((t - cw[0]) / BEAT) : 0;
  const lastA = AS.filter((a) => t >= a).pop();
  const pop = lastA !== undefined && t - lastA < 0.5 ? 1 + 0.25 * Math.sin(((t - lastA) / 0.5) * Math.PI) : 1;
  let rgb: RGB | null = null;
  if (t >= AS[0] && t < QS[1]) rgb = YEL; else if (t >= AS[1] && t < QS[2]) rgb = t >= MIX[0] ? MIXC[Math.max(0, MIX.filter((m) => t >= m).length - 1)] : WHITE;
  const fill = lastA !== undefined ? ease((t - lastA) / 0.5) : 0;
  const lights = t >= AS[2] && t < AGAIN ? Math.round(7776000 * ease((t - AS[2]) / 1.4)) : -1;
  const rows = [{ n: "R", c: "#ff3a2a" }, { n: "G", c: "#3fcf6a" }, { n: "B", c: "#4a9aff" }];
  return (
    <div style={{ position: "absolute", left: 540, top: 1500, transform: "translate(-50%, -50%)", width: 960, background: "rgba(9,13,43,0.95)", border: `8px solid ${cn ? "#ffd200" : "#ffffff"}`, boxShadow: "8px 8px 0 #05060f", padding: "20px 24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ ...px, fontSize: 30 }}>LEVEL {level}/3</div>
        {cn > 0 && <div style={{ ...px, fontSize: 30, color: "#ffd200" }}>ANSWER IN</div>}
        <div style={{ ...px, fontSize: 30, color: "#fff08a", transform: `scale(${pop})`, transformOrigin: "100% 50%" }}>SCORE {score}/3</div>
      </div>
      {lights >= 0 ? (
        <div style={{ ...px, fontSize: 50, color: "#6ee6cf", textAlign: "center", padding: "10px 0 8px" }}>{lights.toLocaleString("en-US")}<span style={{ fontSize: 26, color: "#ffffff" }}> LIGHTS</span></div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r, i) => { const v = rgb ? Math.round(rgb[i] * (t < MIX[0] || t >= QS[2] ? fill : 1)) : 0; return (
              <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ ...px, fontSize: 26, color: r.c, width: 34 }}>{r.n}</div>
                <div style={{ flex: 1, height: 26, background: "#05060f", border: "4px solid #05060f" }}><div style={{ width: `${(v / 255) * 100}%`, height: "100%", background: r.c }} /></div>
                <div style={{ ...px, fontSize: 26, width: 110, textAlign: "right" }}>{rgb ? v : "?"}</div>
              </div>); })}
          </div>
          {cn > 0 && <div style={{ ...px, fontSize: 110, color: "#ffd200", width: 150, textAlign: "center", transform: `scale(${1 + 0.25 * beatK(t - (cw ? cw[0] : 0))})` }}>{cn}</div>}
        </div>
      )}
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const PixelQuizVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const cam = camAt(CAM, t);
  const flash = AS.map((a) => (t >= a && t - a < 0.25 ? 1 - (t - a) / 0.25 : 0)).reduce((x, y) => Math.max(x, y), 0);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/20-pixelquiz/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={QUIZ_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        <Scene t={t} map={glow} cam={cam} />
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash * 0.35 }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#6ee6cf" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
      <Hud t={t} />
    </AbsoluteFill>
  );
};
