/**
 * True pixel-art 3D: the scene is rendered at low resolution into a render target, then a post pass
 *  - draws 1-px dark outlines where depth jumps,
 *  - adds 4x4 ordered (Bayer) dithering,
 *  - snaps every pixel to a fixed hand-picked palette,
 * and the result is upscaled with hard pixels. Glows go through the same pass, so nothing is smooth.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";

export const HIVE_PALETTE = [
  "#0b0604", "#1a0d08", "#2b1410", "#3d1f22", "#4a2c1a", "#6b3512", "#8f4a14", "#b8661a", "#d98a1f", "#f0ac2e",
  "#ffcf5a", "#ffe9a8", "#fff8e6", "#e3c06a", "#c99a4a", "#5a3a2a", "#2a2236", "#4a3f63", "#8f8fb8", "#d6dcf2",
  "#1e1a14", "#3a2c1c", "#a0522d", "#ffffff",
];

const MAX_PAL = 32;
const frag = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform vec3 pal[${MAX_PAL}]; uniform int palN;
uniform float near; uniform float far; uniform float dither; uniform vec3 outlineCol; uniform float outline;
varying vec2 vUv;
float lin(vec2 uv) { float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
vec3 toSRGB(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
void main() {
  vec2 px = 1.0 / res;
  vec3 c = toSRGB(texture2D(tColor, vUv).rgb);
  float d = lin(vUv);
  float e = max(max(abs(d - lin(vUv + vec2(px.x, 0.0))), abs(d - lin(vUv - vec2(px.x, 0.0)))), max(abs(d - lin(vUv + vec2(0.0, px.y))), abs(d - lin(vUv - vec2(0.0, px.y)))));
  bool edge = outline > 0.5 && e / max(d, 0.001) > 0.045 && d < far * 0.9;
  c += (bayer4(gl_FragCoord.xy) - 0.5) * dither;
  vec3 best = pal[0]; float bd = 1e9;
  for (int i = 0; i < ${MAX_PAL}; i++) {
    if (i >= palN) break;
    vec3 q = c - pal[i];
    float dist = dot(q * q, vec3(0.3, 0.59, 0.11));
    if (dist < bd) { bd = dist; best = pal[i]; }
  }
  if (edge) best = mix(best, outlineCol, 0.8);
  gl_FragColor = vec4(best, 1.0);
}`;
const vert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const Post: React.FC<{ w: number; h: number; palette: string[]; dither: number; outline: boolean; outlineColor: string }> = ({ w, h, palette, dither, outline, outlineColor }) => {
  const { gl, scene, camera } = useThree();
  const { target, quadScene, quadCam } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    target.depthTexture = new THREE.DepthTexture(w, h);
    const palVecs = Array.from({ length: MAX_PAL }, (_, i) => (i < palette.length ? toVecHex(palette[i]) : new THREE.Vector3()));
    function toVecHex(hex: string) { const n = parseInt(hex.slice(1), 16); return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: target.texture }, tDepth: { value: target.depthTexture }, res: { value: new THREE.Vector2(w, h) }, pal: { value: palVecs }, palN: { value: palette.length },
        near: { value: 0.1 }, far: { value: 300 }, dither: { value: dither }, outlineCol: { value: toVecHex(outlineColor) }, outline: { value: outline ? 1 : 0 } },
    });
    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    return { target, quadScene, quadCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [w, h, palette, dither, outline, outlineColor]);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const m = (quadScene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    m.uniforms.near.value = cam.near; m.uniforms.far.value = cam.far;
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(quadScene, quadCam);
  }, 1);
  return null;
};

/** Drop-in canvas: children are a normal R3F scene; output is palette-locked pixel art at 1080x1920. */
export const PixelArtCanvas: React.FC<{ scale?: number; fov?: number; bg: string; palette?: string[]; dither?: number; outline?: boolean; outlineColor?: string; children: React.ReactNode }> = ({
  scale = 4, fov = 40, bg, palette = HIVE_PALETTE, dither = 0.09, outline = true, outlineColor = "#0b0604", children,
}) => {
  const w = 1080 / scale, h = 1920 / scale;
  return (
    <AbsoluteFill style={{ imageRendering: "pixelated" }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <ThreeCanvas width={w} height={h} gl={{ antialias: false }} camera={{ fov, near: 0.1, far: 300 }}>
          <color attach="background" args={[bg]} />
          {children}
          <Post w={w} h={h} palette={palette} dither={dither} outline={outline} outlineColor={outlineColor} />
        </ThreeCanvas>
      </div>
    </AbsoluteFill>
  );
};
