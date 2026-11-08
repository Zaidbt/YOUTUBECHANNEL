/** Kurzgesagt-style shading for the pixel pipeline: every shape gets a gradient (linear on x or y, or radial),
 *  soft additive halos for bloom. Use with flat.tsx shapes and <PixelArtCanvas outline={false}>. */
import React, { useMemo } from "react";
import * as THREE from "three";
import { P2, clamp01 } from "./flat";

const GV = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GF = `uniform vec3 c0; uniform vec3 c1; uniform float a0; uniform float a1; uniform float axis; uniform float op; uniform vec3 rad; uniform float useRad; uniform float pw; varying vec2 vP;
void main(){ float v = axis > 0.5 ? vP.x : vP.y; float k = useRad > 0.5 ? 1.0 - smoothstep(0.0, rad.z, distance(vP, rad.xy)) : smoothstep(a0, a1, v); k = pow(k, pw); gl_FragColor = vec4(mix(c0, c1, k), op); }`;
export const C = (h: string) => new THREE.Color(h);
export const mixHex = (a: string, c: string, k: number) => "#" + C(a).lerp(C(c), clamp01(k)).getHexString();
export const CIRC = new THREE.CircleGeometry(1, 40);
/** gradient shape: c0 → c1 along y (default) or x (`x`) between a[0] and a[1]; or radial `rad` = [cx, cy, r] (c1 in the centre) */
export const G: React.FC<{ g: THREE.BufferGeometry; c0: string; c1?: string; a?: [number, number]; x?: boolean; rad?: [number, number, number]; z?: number; o?: number; p?: P2; s?: number | [number, number]; r?: number; add?: boolean; pw?: number }> = ({ g, c0, c1, a = [0, 1], x, rad, z = 0, o, p, s = 1, r = 0, add, pw = 1 }) => {
  const m = useMemo(() => new THREE.ShaderMaterial({ vertexShader: GV, fragmentShader: GF, side: THREE.DoubleSide,
    uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, a0: { value: 0 }, a1: { value: 1 }, axis: { value: 0 }, op: { value: 1 }, rad: { value: new THREE.Vector3() }, useRad: { value: 0 }, pw: { value: 1 } } }), []);
  m.uniforms.c0.value.set(c0); m.uniforms.c1.value.set(c1 ?? c0); m.uniforms.a0.value = a[0]; m.uniforms.a1.value = a[1]; m.uniforms.axis.value = x ? 1 : 0;
  m.uniforms.op.value = o ?? 1; m.uniforms.useRad.value = rad ? 1 : 0; if (rad) m.uniforms.rad.value.set(...rad); m.uniforms.pw.value = pw;
  m.transparent = o !== undefined || !!add; m.depthWrite = o === undefined && !add; m.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending;
  const sc: [number, number, number] = typeof s === "number" ? [s, s, 1] : [s[0], s[1], 1];
  return <mesh geometry={g} material={m} position={[p?.[0] ?? 0, p?.[1] ?? 0, z]} scale={sc} rotation={[0, 0, r]} />;
};
/** soft round bloom (additive) */
export const Halo: React.FC<{ at: P2; r: number; c: string; o?: number; z?: number; sy?: number }> = ({ at, r, c, o = 0.6, z = 0, sy = 1 }) => (
  <G g={CIRC} c0="#000000" c1={c} rad={[0, 0, 1]} p={at} s={[r, r * sy]} z={z} o={o} add pw={2.6} />
);
