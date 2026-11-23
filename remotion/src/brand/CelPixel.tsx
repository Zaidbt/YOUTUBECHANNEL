/**
 * CelPixel — the @engineeredwithin1 look: a 3D scene rendered at 360x640 with toon (cel) shading in 3 bands,
 * a solid 1-px navy outline wherever depth jumps, light ordered dithering at band edges and a gentle colour
 * quantisation (no hard palette), then upscaled ×3 with hard pixels.
 * Plus PixelUI: a 360x640 Canvas2D layer for HUD/banners/tags drawn in real pixels (thresholded text, crisp boxes),
 * upscaled ×3 the same way, so the text looks like pixel art, not vector.
 */
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";

export const CW = 360, CH = 640;
const grad = (() => { const d = new Uint8Array([70, 70, 70, 255, 165, 165, 165, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1); t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const cache = new Map<string, THREE.MeshToonMaterial>();
/** shared toon material (3 cel bands) */
export const toon = (color: string, opts: { emissive?: string; ei?: number; transparent?: boolean; opacity?: number; side?: THREE.Side } = {}) => {
  const key = `${color}|${opts.emissive}|${opts.ei}|${opts.transparent}|${opts.opacity}|${opts.side}`;
  let m = cache.get(key);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: grad, emissive: opts.emissive ?? "#000000", emissiveIntensity: opts.ei ?? 0, transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide, depthWrite: !(opts.transparent ?? false) }); cache.set(key, m); }
  return m;
};

const frag = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float near; uniform float far; uniform vec3 outlineCol; uniform float levels; uniform float dither;
varying vec2 vUv;
float lin(vec2 uv) { float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
vec3 toSRGB(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
void main() {
  vec2 px = 1.0 / res;
  vec3 c = toSRGB(texture2D(tColor, vUv).rgb);
  float d = lin(vUv);
  float dl = lin(vUv - vec2(px.x, 0.0)), dr = lin(vUv + vec2(px.x, 0.0)), du = lin(vUv + vec2(0.0, px.y)), dd = lin(vUv - vec2(0.0, px.y));
  float e = max(max(dl - d, dr - d), max(du - d, dd - d));      // only the NEAR side of a depth jump gets the line
  bool edge = e / max(d, 0.001) > 0.06 && d < far * 0.95;
  c = floor(c * levels + bayer4(gl_FragCoord.xy) * dither) / levels;
  if (edge) c = outlineCol;
  gl_FragColor = vec4(c, 1.0);
}`;
const vert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const Post: React.FC<{ outline: string; levels: number; dither: number }> = ({ outline, levels, dither }) => {
  const { gl, scene, camera } = useThree();
  const { target, quadScene, quadCam } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(CW, CH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    target.depthTexture = new THREE.DepthTexture(CW, CH);
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: target.texture }, tDepth: { value: target.depthTexture }, res: { value: new THREE.Vector2(CW, CH) }, near: { value: 0.1 }, far: { value: 300 }, outlineCol: { value: hex(outline) }, levels: { value: levels }, dither: { value: dither } } });
    const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    return { target, quadScene, quadCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [outline, levels, dither]);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera; const m = (quadScene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    m.uniforms.near.value = cam.near; m.uniforms.far.value = cam.far;
    gl.setRenderTarget(target); gl.render(scene, camera); gl.setRenderTarget(null); gl.render(quadScene, quadCam);
  }, 1);
  return null;
};
export const CelPixelCanvas: React.FC<{ fov?: number; bg: string; outline?: string; levels?: number; dither?: number; children: React.ReactNode }> = ({ fov = 30, bg, outline = "#141833", levels = 22, dither = 0.9, children }) => (
  <AbsoluteFill style={{ imageRendering: "pixelated" }}>
    <div style={{ width: CW, height: CH, transform: "scale(3)", transformOrigin: "top left" }}>
      <ThreeCanvas width={CW} height={CH} gl={{ antialias: false }} camera={{ fov, near: 0.1, far: 300 }}>
        <color attach="background" args={[bg]} />
        {children}
        <Post outline={outline} levels={levels} dither={dither} />
      </ThreeCanvas>
    </div>
  </AbsoluteFill>
);

// ================= PixelUI: crisp pixel-art 2D layer =================
export type Ctx = CanvasRenderingContext2D;
const tmp = typeof document !== "undefined" ? document.createElement("canvas") : null;
/** pixel text: rasterised at low res, alpha thresholded (no anti-aliasing), optional 1-px outline + drop shadow */
export function ptext(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, opts: { font?: string; align?: "left" | "center" | "right"; outline?: string; shadow?: string; italic?: boolean } = {}) {
  if (!tmp) return 0;
  const font = `${opts.italic ? "italic " : ""}${size}px ${opts.font ?? "AlfaSlab"}`;
  const t = tmp.getContext("2d")!; t.font = font;
  const w = Math.ceil(t.measureText(s).width) + 4, h = Math.ceil(size * 1.35) + 4;
  tmp.width = w; tmp.height = h; const c = tmp.getContext("2d")!; c.font = font; c.textBaseline = "alphabetic"; c.fillStyle = "#fff"; c.fillText(s, 2, Math.round(size * 1.0) + 2);
  const img = c.getImageData(0, 0, w, h), d = img.data;
  const paint = (col: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16)); const o = new ImageData(w, h); for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 110) { o.data[i] = r; o.data[i + 1] = g; o.data[i + 2] = b; o.data[i + 3] = 255; } return o; };
  const x0 = Math.round(opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x), y0 = Math.round(y - size - 2);
  const put = (o: ImageData, dx: number, dy: number) => { c.putImageData(o, 0, 0); ctx.drawImage(tmp, x0 + dx, y0 + dy); };
  const main = paint(color);
  if (opts.shadow) { const sh = paint(opts.shadow); put(sh, 1, 2); }
  if (opts.outline) { const ol = paint(opts.outline); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) put(ol, dx, dy); }
  put(main, 0, 0);
  return w;
}
export const prect = (ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, border?: string, bw = 1) => {
  ctx.fillStyle = fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (border) { ctx.fillStyle = border; const X = Math.round(x), Y = Math.round(y), W = Math.round(w), H = Math.round(h); ctx.fillRect(X, Y, W, bw); ctx.fillRect(X, Y + H - bw, W, bw); ctx.fillRect(X, Y, bw, H); ctx.fillRect(X + W - bw, Y, bw, H); }
};
export const pline = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string) => {
  ctx.fillStyle = color; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (let n = 0; n < 2000; n++) { ctx.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
};
export const PixelUI: React.FC<{ draw: (ctx: Ctx) => void; deps: unknown[] }> = ({ draw, deps }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const paint = () => { const c = ref.current; if (!c) return; const ctx = c.getContext("2d")!; ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, CW, CH); draw(ctx); };
  useLayoutEffect(() => {
    paint();
    const h = delayRender("pixel-ui fonts");
    document.fonts.ready.then(() => { paint(); continueRender(h); });
  }, deps); // eslint-disable-line
  return <canvas ref={ref} width={CW} height={CH} style={{ position: "absolute", left: 0, top: 0, width: CW * 3, height: CH * 3, imageRendering: "pixelated" }} />;
};
