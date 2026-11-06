/**
 * Klinin — real ad (Instagram / TikTok / YouTube Shorts, Morocco). Clean premium app-ad style,
 * built on the client's real app screens and hero photo from klinin.ma.
 * Text is kept out of the bottom ~320 px and right edge (platform UI safe zones).
 */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

loadFont({ family: "PoppinsX", url: staticFile("fonts/Poppins-ExtraBold.ttf"), weight: "800" });
loadFont({ family: "PoppinsS", url: staticFile("fonts/Poppins-SemiBold.ttf"), weight: "600" });

const K = { navy: "#003367", blue: "#137fec", amber: "#f59e0b", ink: "#0f172a", white: "#ffffff", soft: "#eef5ff" };
const img = (f: string) => staticFile(`clients/klinin/${f}`);

const Mark: React.FC<{ children: React.ReactNode; bg?: string; color?: string }> = ({ children, bg = K.amber, color = K.ink }) => (
  <span style={{ background: bg, color, padding: "0 18px", borderRadius: 14, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{children}</span>
);
const Title: React.FC<{ top: number; size?: number; color?: string; children: React.ReactNode; align?: "left" | "center" }> = ({ top, size = 92, color = K.navy, children, align = "left" }) => (
  <div style={{ position: "absolute", left: 70, right: 110, top, fontFamily: "PoppinsX", fontSize: size, lineHeight: 1.12, letterSpacing: -2, color, textAlign: align }}>{children}</div>
);
const Sub: React.FC<{ top: number; children: React.ReactNode; color?: string; align?: "left" | "center" }> = ({ top, children, color = "#334155", align = "left" }) => (
  <div style={{ position: "absolute", left: 70, right: 110, top, fontFamily: "PoppinsS", fontSize: 42, lineHeight: 1.3, color, textAlign: align }}>{children}</div>
);
const Logo: React.FC<{ size?: number; left?: number; top?: number }> = ({ size = 150, left = 60, top = 60 }) => (
  <Img src={img("logo.png")} style={{ position: "absolute", left, top, width: size, height: size, filter: "drop-shadow(0 8px 18px rgba(0,51,103,0.25))" }} />
);
/** The client's own screenshots already include a phone frame: we just stage them with depth. */
const Phone: React.FC<{ src: string; left: number; top: number; width: number; rotY?: number; rotZ?: number }> = ({ src, left, top, width, rotY = -14, rotZ = 2 }) => (
  <div style={{ position: "absolute", left, top, width, perspective: 2400 }}>
    <Img src={img(src)} style={{ width: "100%", transform: `rotateY(${rotY}deg) rotateZ(${rotZ}deg)`, filter: "drop-shadow(0 60px 60px rgba(0,51,103,0.35))" }} />
  </div>
);
const Chip: React.FC<{ left: number; top: number; children: React.ReactNode; bg?: string; color?: string }> = ({ left, top, children, bg = K.white, color = K.navy }) => (
  <div style={{ position: "absolute", left, top, background: bg, color, fontFamily: "PoppinsS", fontSize: 36, padding: "18px 30px", borderRadius: 24, boxShadow: "0 18px 40px rgba(0,51,103,0.22)", whiteSpace: "nowrap" }}>{children}</div>
);
const Progress: React.FC<{ step: number }> = ({ step }) => (
  <div style={{ position: "absolute", left: 70, top: 70, display: "flex", gap: 12 }}>
    {[0, 1, 2, 3].map((i) => <div key={i} style={{ width: 110, height: 10, borderRadius: 5, background: i <= step ? K.blue : "rgba(0,51,103,0.15)" }} />)}
  </div>
);
const Soft: React.FC = () => <AbsoluteFill style={{ background: "linear-gradient(180deg, #ffffff 0%, #eef5ff 55%, #d6e8ff 100%)" }} />;

// 1 · Hook: relatable problem over the client's hero photo
const F1 = () => (
  <AbsoluteFill>
    <Img src={img("hero_crop.jpg")} style={{ position: "absolute", width: 1080, height: 1920, objectFit: "cover", objectPosition: "45% 50%" }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,51,103,0.9) 0%, rgba(0,51,103,0.55) 36%, rgba(0,51,103,0) 55%, rgba(0,51,103,0) 72%, rgba(0,51,103,0.95) 100%)" }} />
    <Title top={190} color={K.white} size={92}>Ton week-end,<br />pas pour <Mark>la lessive.</Mark></Title>
    <Sub top={560} color="#dbeafe">On récupère, on lave, on livre.</Sub>
    <Logo left={850} top={60} size={160} />
  </AbsoluteFill>
);

// 2 · App demo: choose items, real prices
const F2 = () => (
  <AbsoluteFill>
    <Soft />
    <Progress step={1} />
    <Title top={140}>Choisis<br />tes articles</Title>
    <Sub top={400}>Lavage, nettoyage à sec, repassage…</Sub>
    <Phone src="app3.png" left={250} top={560} width={620} />
    <Chip left={70} top={900} bg={K.amber} color={K.ink}>À partir de 10 DH</Chip>
  </AbsoluteFill>
);

// 3 · Pickup tracking + delivery promise
const F3 = () => (
  <AbsoluteFill style={{ background: K.navy }}>
    <AbsoluteFill style={{ background: "radial-gradient(circle at 70% 60%, #1d5fa8 0%, #003367 60%)" }} />
    <Progress step={2} />
    <Title top={140} color={K.white}>Suis ton<br />chauffeur <Mark bg={K.blue} color={K.white}>en direct</Mark></Title>
    <Phone src="app5.png" left={300} top={540} width={600} rotY={12} rotZ={-2} />
    <Chip left={70} top={820}>🛵 14 min restantes</Chip>
    <Chip left={70} top={950} bg={K.amber} color={K.ink}>Livré en 4 à 24h</Chip>
  </AbsoluteFill>
);

// 4 · Offer + CTA
const F4 = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #137fec 0%, #003367 70%)" }} />
    <Logo left={445} top={90} size={190} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 320, textAlign: "center", fontFamily: "PoppinsX", color: K.white }}>
      <div style={{ fontSize: 240, lineHeight: 1, letterSpacing: -8, color: K.amber }}>-50%</div>
      <div style={{ fontSize: 64, lineHeight: 1.15 }}>sur ta 1ère commande</div>
    </div>
    <Phone src="app2.png" left={330} top={700} width={430} rotY={0} rotZ={-3} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 1470, display: "flex", justifyContent: "center", gap: 22 }}>
      {["App Store", "Google Play"].map((s) => <div key={s} style={{ background: K.ink, color: K.white, fontFamily: "PoppinsS", fontSize: 36, padding: "20px 36px", borderRadius: 20, border: "2px solid rgba(255,255,255,0.3)" }}>{s}</div>)}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 1580, textAlign: "center", fontFamily: "PoppinsS", fontSize: 38, color: "#dbeafe" }}>● Disponible à Agadir · klinin.ma</div>
  </AbsoluteFill>
);

export const KLININ_AD_SHOTS = [F1, F2, F3, F4];
export const KlininAdPreviews: React.FC<{ shot: number }> = ({ shot }) => {
  const S = KLININ_AD_SHOTS[shot] ?? F1;
  return <S />;
};
