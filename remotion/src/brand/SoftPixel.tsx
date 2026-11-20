/**
 * SoftPixel: the "@engineeredwithin1" look — a properly lit 3D render (soft shadows, ambient occlusion, environment
 * reflections, depth of field, gentle bloom) rendered at low resolution and upscaled with hard pixels. No palette
 * snapping: rich gradients survive, only a light colour quantisation + ordered dither gives the pixel-art grain.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const grainShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, levels: { value: 28.0 }, res: { value: new THREE.Vector2(360, 640) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float levels; uniform vec2 res; varying vec2 vUv;
    float bayer(vec2 p){ int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0)); int i = x + y * 4;
      float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0 - 0.5; return 0.0; }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; vec2 p = floor(vUv * res);
      c = floor(c * levels + 0.5 + bayer(p) * 0.9) / levels; gl_FragColor = vec4(c, 1.0); }`,
};
const Post: React.FC<{ w: number; h: number; focus: number; aperture: number; bloom: number; exposure: number; env: number }> = ({ w, h, focus, aperture, bloom, exposure, env }) => {
  const { gl, scene: sc, camera } = useThree();
  const { composer, bokeh } = useMemo(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = exposure;
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; sc.environmentIntensity = env;
    const c = new EffectComposer(gl); c.setSize(w, h);
    c.addPass(new RenderPass(sc, camera));
    const ao = new GTAOPass(sc, camera, w, h); ao.blendIntensity = 0.9; c.addPass(ao);
    const bokeh = new BokehPass(sc, camera, { focus: 10, aperture: 0.002, maxblur: 0.01 }); c.addPass(bokeh);
    c.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), bloom, 0.5, 0.82));
    c.addPass(new OutputPass());
    const g = new ShaderPass(grainShader); (g.uniforms as Record<string, { value: unknown }>).res.value = new THREE.Vector2(w, h); c.addPass(g);
    return { composer: c, bokeh };
  }, [gl, sc, camera, w, h, bloom, exposure, env]);
  useFrame(() => {
    const u = bokeh.uniforms as Record<string, { value: number }>;
    u.focus.value = focus; u.aperture.value = aperture;
    composer.render();
  }, 1);
  return null;
};
export const SoftPixelCanvas: React.FC<{ px?: number; fov?: number; bg: string; focus: number; aperture?: number; bloom?: number; exposure?: number; env?: number; children: React.ReactNode }> = ({
  px = 3, fov = 30, bg, focus, aperture = 0.0015, bloom = 0.35, exposure = 0.95, env = 0.45, children,
}) => {
  const w = Math.round(1080 / px), h = Math.round(1920 / px);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `scale(${px})`, transformOrigin: "0 0", imageRendering: "pixelated" }}>
      <ThreeCanvas width={w} height={h} camera={{ fov, near: 0.1, far: 200 }} gl={{ antialias: false }}>
        <color attach="background" args={[bg]} />
        {children}
        <Post w={w} h={h} focus={focus} aperture={aperture} bloom={bloom} exposure={exposure} env={env} />
      </ThreeCanvas>
    </div>
  );
};
