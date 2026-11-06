/**
 * Klinin — three creative ad concepts (Darija + French), 2 key frames each.
 *  1 "Machine à laver f jibek": the phone IS the washing machine; laundry gets sucked into the screen.
 *  2 "Mama": a mother/son chat ("Wach ghsalti hwayjek?") that ends with a Klinin booking.
 *  3 "POV: nta t-shirt 3and Klinin": a 3D t-shirt character rides across Agadir and comes back clean.
 * Claims come from klinin.ma. Darija lines should be checked by a native speaker before release.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import { roundedBox, toy, CLOTH, Bubbles, Lights } from "./KlininPreviews";
import { rnd } from "../../brand/pixels";

loadFont({ family: "PoppinsX", url: staticFile("fonts/Poppins-ExtraBold.ttf"), weight: "800" });
loadFont({ family: "PoppinsS", url: staticFile("fonts/Poppins-SemiBold.ttf"), weight: "600" });

const K = { navy: "#003367", blue: "#137fec", amber: "#f59e0b", ink: "#0f172a", white: "#ffffff" };
const img = (f: string) => staticFile(`clients/klinin/${f}`);

// ---------- shared UI ----------
const Big: React.FC<{ top: number; children: React.ReactNode; color?: string; size?: number; align?: "left" | "center" }> = ({ top, children, color = K.white, size = 104, align = "center" }) => (
  <div style={{ position: "absolute", left: 70, right: 70, top, fontFamily: "PoppinsX", fontSize: size, lineHeight: 1.05, letterSpacing: -3, color, textAlign: align, textShadow: color === K.white ? "0 8px 30px rgba(0,30,70,0.35)" : undefined }}>{children}</div>
);
const Hl: React.FC<{ children: React.ReactNode; bg?: string; color?: string; tilt?: number }> = ({ children, bg = K.amber, color = K.ink, tilt = -2 }) => (
  <span style={{ display: "inline-block", background: bg, color, padding: "0 22px", borderRadius: 18, transform: `rotate(${tilt}deg)`, textShadow: "none" }}>{children}</span>
);
const Tag: React.FC<{ left: number; top: number; children: React.ReactNode; bg?: string; color?: string; size?: number }> = ({ left, top, children, bg = K.white, color = K.navy, size = 38 }) => (
  <div style={{ position: "absolute", left, top, background: bg, color, fontFamily: "PoppinsS", fontSize: size, padding: "16px 30px", borderRadius: 999, boxShadow: "0 16px 36px rgba(0,30,70,0.28)", whiteSpace: "nowrap" }}>{children}</div>
);
const Logo: React.FC<{ size?: number; left?: number; top?: number }> = ({ size = 140, left = 880, top = 60 }) => (
  <Img src={img("logo.png")} style={{ position: "absolute", left, top, width: size, height: size, filter: "drop-shadow(0 8px 18px rgba(0,30,70,0.3))" }} />
);
const Label: React.FC<{ n: string; name: string }> = ({ n, name }) => (
  <div style={{ position: "absolute", left: 60, top: 1830, fontFamily: "PoppinsS", fontSize: 26, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.35)", padding: "10px 22px", borderRadius: 999 }}>CONCEPT {n} · {name}</div>
);

// ---------- 1 · the phone is the washing machine ----------
const PhoneMachine: React.FC<{ drumA: number; openPop?: boolean }> = ({ drumA, openPop }) => {
  const g = useMemo(() => ({
    body: roundedBox(5.2, 10.6, 0.7, 0.75, { x: 0, y: -0.4, r: 2.05 }),
    screen: (() => { const s = new THREE.Shape(); const w = 4.7, h = 10.1, r = 0.55, x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      const hp = new THREE.Path(); hp.absarc(0, -0.4, 2.05, 0, Math.PI * 2, true); s.holes.push(hp); return new THREE.ShapeGeometry(s, 16); })(),
    ring: new THREE.TorusGeometry(2.1, 0.28, 20, 64), drum: new THREE.CylinderGeometry(2.05, 2.05, 6, 40, 1, true).rotateX(Math.PI / 2),
    back: new THREE.CircleGeometry(2.1, 40), cloth: new THREE.SphereGeometry(0.55, 16, 12), notch: roundedBox(1.5, 0.35, 0.2, 0.15),
    pill: roundedBox(2.4, 0.5, 0.15, 0.2), knob: new THREE.CylinderGeometry(0.22, 0.22, 0.15, 20).rotateX(Math.PI / 2),
  }), []);
  return (
    <group>
      <mesh geometry={g.body}>{toy("#0f1a33")}</mesh>
      <mesh geometry={g.screen} position={[0, 0, 0.36]}><meshPhysicalMaterial color={K.blue} roughness={0.2} clearcoat={1} /></mesh>
      <mesh geometry={g.notch} position={[0, 4.65, 0.36]}>{toy("#0f1a33")}</mesh>
      {/* app UI on the screen, washing-machine style */}
      <mesh geometry={g.pill} position={[-0.8, 3.6, 0.4]}>{toy(K.white)}</mesh>
      <mesh geometry={g.knob} position={[1.15, 3.6, 0.42]}>{toy(K.white)}</mesh>
      <mesh geometry={g.knob} position={[1.75, 3.6, 0.42]}>{toy(K.white)}</mesh>
      <mesh position={[0, -3.6, 0.4]}><boxGeometry args={[3.6, 0.7, 0.12]} />{toy(K.amber)}</mesh>
      {/* impossible drum: much deeper than the phone */}
      <group position={[0, -0.4, -2.6]}>
        <mesh geometry={g.drum}><meshStandardMaterial color="#163b86" side={THREE.BackSide} roughness={0.55} /></mesh>
        <mesh geometry={g.back} position={[0, 0, -2.9]}><meshStandardMaterial color="#0c2558" /></mesh>
        <group rotation={[0, 0, drumA]}>
          {Array.from({ length: openPop ? 0 : 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2, r = 0.6 + rnd(i) * 0.9;
            return <mesh key={i} geometry={g.cloth} position={[Math.cos(a) * r, Math.sin(a) * r, 1.2 + rnd(i + 3) * 1.6]} scale={[1, 0.55, 0.7]} rotation={[0, 0, a * 2]}>{toy(CLOTH[i % CLOTH.length])}</mesh>;
          })}
        </group>
      </group>
      <mesh geometry={g.ring} position={[0, -0.4, 0.42]}>{toy(K.white)}</mesh>
    </group>
  );
};

/** Clothes spiralling into the screen (the "suck in" moment). */
const Swirl: React.FC = () => {
  const geo = useMemo(() => new THREE.SphereGeometry(0.6, 16, 12), []);
  return (
    <group>
      {Array.from({ length: 16 }, (_, i) => {
        const k = i / 16, a = k * Math.PI * 3.2 + 0.4, r = 1.2 + k * 7.5;
        return <mesh key={i} geometry={geo} position={[Math.cos(a) * r, Math.sin(a) * r * 1.25 - 0.4, 1 + k * 4]} scale={[1.3 - k * 0.2, 0.55, 0.8]} rotation={[a, a * 0.5, a * 2]}>{toy(CLOTH[i % CLOTH.length])}</mesh>;
      })}
    </group>
  );
};
const FoldedStack: React.FC = () => (
  <group>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0, i * 0.62, 0]}><boxGeometry args={[3.4, 0.55, 2.4]} />{toy(CLOTH[(i + 1) % CLOTH.length])}</mesh>)}
  </group>
);

const C1a = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 58%, #4fa3ff 0%, #137fec 38%, #003367 100%)" }}>
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1920} gl={{ alpha: true, antialias: true }} camera={{ fov: 40, position: [0, 0, 30], near: 0.1, far: 200 }}>
        <Lights />
        <group position={[0, -2.6, 0]} rotation={[0.18, -0.42, 0.05]}><PhoneMachine drumA={0.8} /></group>
        <group position={[0, -2.6, 0]} rotation={[0.18, -0.42, 0.05]}><Swirl /></group>
        <Bubbles n={14} seed={4} spread={[12, 16, 4]} />
      </ThreeCanvas>
    </AbsoluteFill>
    <Label n="1" name="MACHINE F JIBEK" />
    <Big top={170}>Machine à laver</Big>
    <Big top={290} size={130}><Hl>f jibek.</Hl></Big>
    <Logo left={60} top={1640} size={130} />
  </AbsoluteFill>
);
const C1b = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 58%, #4fa3ff 0%, #137fec 38%, #003367 100%)" }}>
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1920} gl={{ alpha: true, antialias: true }} camera={{ fov: 40, position: [0, 0, 30], near: 0.1, far: 200 }}>
        <Lights />
        <group position={[0, -4.2, 0]} rotation={[0.25, 0.3, -0.04]}><PhoneMachine drumA={0} openPop /></group>
        <group position={[0.3, -1.2, 3.5]} rotation={[0.35, -0.5, 0.08]}><FoldedStack /></group>
        <Bubbles n={20} seed={11} spread={[12, 16, 5]} />
      </ThreeCanvas>
    </AbsoluteFill>
    <Label n="1" name="MACHINE F JIBEK" />
    <Big top={170} size={92}>Kayrj3ou <Hl>nqiyin</Hl><br />w mtwiyin.</Big>
    <Tag left={70} top={1420} bg={K.amber} color={K.ink}>Livré en 4 à 24h</Tag>
    <Tag left={70} top={1520}>-50% 3la awel commande</Tag>
  </AbsoluteFill>
);

// ---------- 2 · Mama chat ----------
type Msg = { me: boolean; text?: string; card?: boolean; time: string; read?: boolean };
const Bubble: React.FC<{ m: Msg }> = ({ m }) => (
  <div style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start", margin: "16px 40px" }}>
    <div style={{ maxWidth: 760, background: m.me ? "#d7ecff" : K.white, borderRadius: m.me ? "34px 34px 8px 34px" : "34px 34px 34px 8px", padding: m.card ? 16 : "22px 30px",
      fontFamily: "PoppinsS", fontSize: 44, color: K.ink, boxShadow: "0 6px 16px rgba(0,30,70,0.12)" }}>
      {m.card ? (
        <div style={{ width: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, background: K.navy, borderRadius: 24, padding: 18 }}>
            <Img src={img("logo.png")} style={{ width: 92, height: 92, background: K.white, borderRadius: 20 }} />
            <div style={{ color: K.white }}>
              <div style={{ fontFamily: "PoppinsX", fontSize: 36 }}>Collecte confirmée ✅</div>
              <div style={{ fontSize: 30, color: "#bfdbfe" }}>Demain · 10:00 – 11:00</div>
            </div>
          </div>
          <div style={{ fontSize: 30, color: "#475569", padding: "12px 8px 2px" }}>Chauffeur Klinin · livraison en 4 à 24h</div>
        </div>
      ) : m.text}
      <div style={{ fontSize: 24, color: "#64748b", textAlign: "right", marginTop: 6 }}>{m.time}{m.me ? (m.read ? "  ✓✓" : "  ✓") : ""}</div>
    </div>
  </div>
);
const Chat: React.FC<{ msgs: Msg[]; typing?: boolean }> = ({ msgs, typing }) => (
  <AbsoluteFill style={{ background: "#eaf2fb" }}>
    <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(19,127,236,0.12) 3px, transparent 3px)", backgroundSize: "56px 56px" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 230, background: K.navy, display: "flex", alignItems: "flex-end", padding: "0 40px 30px", gap: 26 }}>
      <div style={{ fontSize: 56, color: K.white }}>‹</div>
      <div style={{ width: 110, height: 110, borderRadius: 55, background: "linear-gradient(135deg,#f9a8d4,#f472b6)", display: "grid", placeItems: "center", fontSize: 60 }}>👩🏻</div>
      <div style={{ fontFamily: "PoppinsS", color: K.white }}>
        <div style={{ fontSize: 46 }}>Mama ❤️</div>
        <div style={{ fontSize: 28, color: "#bfdbfe" }}>{typing ? "en train d'écrire…" : "en ligne"}</div>
      </div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 270 }}>
      {msgs.map((m, i) => <Bubble key={i} m={m} />)}
    </div>
  </AbsoluteFill>
);
const C2a = () => (
  <AbsoluteFill>
    <Chat typing msgs={[
      { me: false, text: "Wach ghsalti hwayjek? 🙄", time: "09:12" },
      { me: true, text: "Mazal a mama… 😅", time: "09:13", read: true },
      { me: false, text: "Dima nfs l9issa!! L'weekend kaml w nta na3s 😤", time: "09:13" },
    ]} />
    <Label n="2" name="MAMA" />
    <div style={{ position: "absolute", left: 70, right: 70, top: 1250, fontFamily: "PoppinsX", fontSize: 88, lineHeight: 1.08, color: K.navy, letterSpacing: -2 }}>
      Kolna 3ndna<br /><Hl>had l'message.</Hl>
    </div>
  </AbsoluteFill>
);
const C2b = () => (
  <AbsoluteFill>
    <Chat msgs={[
      { me: true, text: "Safi a mama, 3iyit l Klinin 😎", time: "09:15", read: true },
      { me: true, card: true, time: "09:15", read: true },
      { me: false, text: "Lah yrdi 3lik a wldi ❤️🤲", time: "09:16" },
    ]} />
    <Label n="2" name="MAMA" />
    <div style={{ position: "absolute", left: 0, right: 0, top: 1300, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <div style={{ fontFamily: "PoppinsX", fontSize: 76, color: K.navy, letterSpacing: -2 }}>Rdat mama. 😌</div>
      <div style={{ background: K.amber, color: K.ink, fontFamily: "PoppinsX", fontSize: 50, padding: "18px 40px", borderRadius: 999, boxShadow: "0 16px 36px rgba(0,30,70,0.28)" }}>-50% 3la awel commande</div>
    </div>
  </AbsoluteFill>
);

// ---------- 3 · POV t-shirt ----------
function shirtShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.45, 1.2); s.quadraticCurveTo(0, 0.78, 0.45, 1.2); s.lineTo(1.2, 1.2); s.lineTo(2.05, 0.55); s.lineTo(1.6, -0.05); s.lineTo(1.1, 0.35);
  s.lineTo(1.1, -1.6); s.lineTo(-1.1, -1.6); s.lineTo(-1.1, 0.35); s.lineTo(-1.6, -0.05); s.lineTo(-2.05, 0.55); s.lineTo(-1.2, 1.2); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.12, bevelSegments: 4 });
}
const Shirt: React.FC<{ clean: boolean }> = ({ clean }) => {
  const g = useMemo(() => ({ shirt: shirtShape(), eye: new THREE.SphereGeometry(0.3, 20, 16), pupil: new THREE.SphereGeometry(0.15, 16, 12), stain: new THREE.CircleGeometry(0.28, 16) }), []);
  const z = 0.68;
  return (
    <group>
      <mesh geometry={g.shirt} position={[0, 0, -0.2]}>{toy(clean ? "#ffffff" : "#d8cfbf", clean ? { emissive: "#e8f1ff", emissiveIntensity: 0.45 } : {})}</mesh>
      {clean ? (
        <>
          {/* sunglasses */}
          <mesh position={[-0.42, 0.15, z]}><boxGeometry args={[0.7, 0.42, 0.12]} />{toy("#0f172a")}</mesh>
          <mesh position={[0.42, 0.15, z]}><boxGeometry args={[0.7, 0.42, 0.12]} />{toy("#0f172a")}</mesh>
          <mesh position={[0, 0.25, z]}><boxGeometry args={[0.3, 0.08, 0.1]} />{toy("#0f172a")}</mesh>
          <mesh position={[0, -0.45, z]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.32, 0.06, 8, 20, Math.PI]} />{toy("#0f172a")}</mesh>
          <mesh position={[0, -1.0, z - 0.06]}><boxGeometry args={[1.6, 0.25, 0.08]} />{toy(K.blue)}</mesh>
        </>
      ) : (
        <>
          {[-0.42, 0.42].map((x) => (
            <group key={x}>
              <mesh geometry={g.eye} position={[x, 0.15, z - 0.12]}>{toy("#ffffff")}</mesh>
              <mesh geometry={g.pupil} position={[x + 0.04, 0.1, z + 0.1]}>{toy("#0f172a")}</mesh>
              <mesh position={[x, 0.55, z]} rotation={[0, 0, x > 0 ? 0.35 : -0.35]}><boxGeometry args={[0.5, 0.09, 0.1]} />{toy("#0f172a")}</mesh>
            </group>
          ))}
          <mesh position={[0, -0.5, z]}><torusGeometry args={[0.25, 0.06, 8, 20, Math.PI]} />{toy("#0f172a")}</mesh>
          {[[0.6, -1.0], [-0.7, -0.7], [0.2, -1.3], [-1.5, 0.3]].map(([x, y], i) => <mesh key={i} geometry={g.stain} position={[x, y, z - 0.05]} scale={0.7 + rnd(i) * 0.6}><meshBasicMaterial color="#8a6a3f" /></mesh>)}
        </>
      )}
    </group>
  );
};
const Sparkles: React.FC = () => (
  <group>
    {Array.from({ length: 9 }, (_, i) => (
      <mesh key={i} position={[(rnd(i) - 0.5) * 9, (rnd(i + 5) - 0.3) * 8, 2]} rotation={[0, 0, Math.PI / 4]} scale={0.25 + rnd(i + 9) * 0.35}>
        <octahedronGeometry args={[1, 0]} />{toy(i % 2 ? K.amber : "#ffffff")}
      </mesh>
    ))}
  </group>
);

const AgadirMap: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute" }}>
    <rect width={1080} height={1920} fill="#f3ead9" />
    <path d="M0 0 H330 C 300 300, 380 520, 300 760 S 240 1200, 330 1500 S 280 1800, 300 1920 H0 Z" fill="#7cc4f5" />
    <path d="M330 0 C 300 300, 380 520, 300 760 S 240 1200, 330 1500 S 280 1800, 300 1920" fill="none" stroke="#f7d9a0" strokeWidth={26} />
    {[[380, 0, 900, 1920], [380, 640, 1080, 560], [500, 1300, 1080, 1180], [600, 0, 760, 1920]].map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={22} />)}
    {[[180, 520], [150, 1080], [200, 1560]].map(([x, y], i) => <text key={i} x={x} y={y} fontSize={60}>🌴</text>)}
    <path d="M 860 1520 C 700 1380, 640 1180, 560 1000 S 520 720, 640 520" fill="none" stroke={K.navy} strokeWidth={14} strokeDasharray="30 22" strokeLinecap="round" />
    <text x={640} y={1580} fontFamily="PoppinsS" fontSize={34} fill="#475569">CITÉ DAKHLA</text>
    <text x={450} y={460} fontFamily="PoppinsS" fontSize={34} fill="#475569">HAY MOHAMMADI</text>
    <text x={60} y={300} fontFamily="PoppinsS" fontSize={34} fill="#2b6ea3">OCÉAN</text>
    <circle cx={860} cy={1520} r={34} fill={K.amber} stroke="#fff" strokeWidth={8} />
    <circle cx={640} cy={520} r={34} fill={K.blue} stroke="#fff" strokeWidth={8} />
  </svg>
);

const C3a = () => (
  <AbsoluteFill>
    <AgadirMap />
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1920} gl={{ alpha: true, antialias: true }} camera={{ fov: 40, position: [0, 0, 30], near: 0.1, far: 200 }}>
        <Lights />
        <group position={[0.8, -1.8, 2]} rotation={[0.1, -0.25, 0.12]} scale={1.5}><Shirt clean={false} /></group>
      </ThreeCanvas>
    </AbsoluteFill>
    <Label n="3" name="POV T-SHIRT" />
    <Big top={150} color={K.navy} size={84}>POV : nta t-shirt<br /><Hl>3and Klinin</Hl></Big>
    <Tag left={70} top={1120} bg={K.navy} color={K.white}>🛵 Collecte · Cité Dakhla → laverie</Tag>
  </AbsoluteFill>
);
const C3b = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #dcecff 60%, #9fcaff 100%)" }}>
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1920} gl={{ alpha: true, antialias: true }} camera={{ fov: 40, position: [0, 0, 30], near: 0.1, far: 200 }}>
        <Lights />
        <group position={[0, -0.6, 2]} rotation={[0.05, 0.2, -0.06]} scale={1.7}><Shirt clean /></group>
        <Sparkles />
        <Bubbles n={12} seed={21} spread={[12, 16, 3]} />
      </ThreeCanvas>
    </AbsoluteFill>
    <Label n="3" name="POV T-SHIRT" />
    <Big top={150} color={K.navy} size={88}>Rje3t l dar<br /><Hl bg={K.blue} color={K.white}>nqi w m3tter.</Hl></Big>
    <Tag left={70} top={1380} bg={K.amber} color={K.ink}>Livré en 4 à 24h</Tag>
    <Tag left={70} top={1480}>-50% 3la awel commande</Tag>
  </AbsoluteFill>
);

export const KLININ_CREATIVE = [C1a, C1b, C2a, C2b, C3a, C3b];
export const KlininCreative: React.FC<{ shot: number }> = ({ shot }) => {
  const S = KLININ_CREATIVE[shot] ?? C1a;
  return <S />;
};
