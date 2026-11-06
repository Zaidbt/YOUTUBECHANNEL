/** Style preview frames ("Blueprint Arcade") for video 002: how a mechanical watch ticks. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { P, Txt, BlueprintBg, TitleBlock, Balloon, Dimension, Sticker, Cogsy, CHANNEL } from "../../brand/ui";
import { Pixels, rect, gear, dashed } from "../../brand/pixels";
import { Movement, BAL, FORK, ESC, BARREL } from "./Movement";

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: P.paper }}>
    <svg viewBox="0 0 180 320" width={1080} height={1920} shapeRendering="crispEdges">
      <BlueprintBg />
      {children}
    </svg>
  </AbsoluteFill>
);

const Hook = () => (
  <Frame>
    <Movement balanceA={0.4} escA={0.3} forkA={0.1} blur />
    <Sticker x={90} y={40} bg={P.pink} tilt={-3} lines={[{ t: "HOW DOES A", s: 7 }, { t: "WATCH", s: 16, c: P.chalk }, { t: "TICK?", s: 10 }]} />
    <Sticker x={98} y={76} bg={P.yellow} tilt={2} lines={[{ t: "28,800 TICKS AN HOUR", s: 5 }]} />
    <Cogsy x={26} y={262} mood="happy" say="TICK TOCK!" />
    <TitleBlock title="HOW A WATCH TICKS" scale="1:1 REAL SPEED" mode="real" dwg="002" />
  </Frame>
);

const Explain = () => (
  <Frame>
    <Movement balanceA={-0.5} escA={0.12} forkA={-0.12} />
    <Sticker x={90} y={24} bg={P.cyan} tilt={-2} lines={[{ t: "THE ESCAPEMENT", s: 7 }, { t: "LETS THE SPRING GO", s: 5 }, { t: "ONE TOOTH AT A TIME", s: 5 }]} />
    <Balloon n={1} x={150} y={92} to={[BAL.x + 18, BAL.y - 19]} label="BALANCE" side="left" />
    <Balloon n={2} x={160} y={140} to={[BAL.x + 9, BAL.y + 6]} label="HAIRSPRING" side="left" c={P.cyan} />
    <Balloon n={3} x={20} y={128} to={[FORK.x - 10, FORK.y + 4]} label="PALLET FORK" side="right" c={P.pink} />
    <Balloon n={4} x={20} y={248} to={[ESC.x - 14, ESC.y + 14]} label="ESCAPE WHEEL" side="right" />
    <Balloon n={5} x={160} y={262} to={[BARREL.x + 10, BARREL.y + 12]} label="MAINSPRING" side="left" c={P.yellow} />
    <TitleBlock title="HOW A WATCH TICKS" scale="1:40 SLOW-MO" mode="slow" dwg="002" />
  </Frame>
);

const BigNumber = () => (
  <Frame>
    <Movement balanceA={1.2} escA={0.5} forkA={0.12} />
    {/* swing arc */}
    <Pixels px={Array.from({ length: 40 }, (_, i) => {
      const a = -Math.PI / 2 - 1.3 + (i / 39) * 2.6;
      return rect(BAL.x + Math.cos(a) * 33, BAL.y + Math.sin(a) * 33, 1, 1, P.pink);
    }).filter((_, i) => i % 3 !== 2)} />
    <Pixels px={[rect(BAL.x - 28, BAL.y - 22, 3, 1, P.pink), rect(BAL.x + 26, BAL.y - 22, 3, 1, P.pink)]} />
    <Dimension x0={BAL.x - 26} x1={BAL.x + 26} y={BAL.y + 38} label="10 MM" />
    <Sticker x={86} y={48} bg={P.yellow} tilt={-4} lines={[{ t: "8 TICKS", s: 16 }, { t: "EVERY SECOND", s: 7 }]} />
    <Sticker x={60} y={86} bg={P.pink} tilt={3} lines={[{ t: "691,200 A DAY", s: 6, c: P.chalk }]} />
    <Cogsy x={26} y={262} mood="wow" say="WAIT, WHAT?!" t={0.3} />
    <TitleBlock title="HOW A WATCH TICKS" scale="1:1 REAL SPEED" mode="real" dwg="002" />
  </Frame>
);

const EndCard = () => (
  <Frame>
    <Movement balanceA={0.2} escA={0.2} forkA={0} dim={0.25} />
    <Pixels px={gear(90, 92, 22, 12, 0.2, P.yellow, P.paperDeep, { spokes: 6, tooth: 5 })} />
    <Sticker x={90} y={140} bg={P.chalk} tilt={-2} lines={[{ t: CHANNEL, s: 16 }]} />
    <Txt x={90} y={162} s={4} c={P.chalk}>HOW THINGS WORK, IN 8 BITS</Txt>
    <Sticker x={90} y={200} bg={P.pink} tilt={3} lines={[{ t: "NEXT DRAWING:", s: 5, c: P.chalk }, { t: "DWG 003 ???", s: 9 }]} />
    <Cogsy x={140} y={250} mood="wave" say="SEE YA!" t={0.2} />
    <TitleBlock title="THE END" scale="FOLLOW FOR MORE" mode="fast" dwg="002" />
  </Frame>
);

const StyleSheet = () => {
  const sw: [string, string][] = [["PAPER", P.paper], ["CHALK", P.chalk], ["PINK", P.pink], ["LIME", P.lime], ["YELLOW", P.yellow], ["CYAN", P.cyan], ["BRASS", P.brass], ["STEEL", P.steel], ["BLUED", P.blued], ["RUBY", P.ruby]];
  return (
    <Frame>
      <Sticker x={90} y={22} bg={P.yellow} tilt={-2} lines={[{ t: "BLUEPRINT ARCADE", s: 8 }, { t: "BITWORKS STYLE GUIDE", s: 4 }]} />
      <Txt x={12} y={44} s={4} c={P.chalkDim} anchor="start">01 PALETTE</Txt>
      {sw.map(([n, c], i) => (
        <g key={n}>
          <rect x={12 + (i % 5) * 32} y={52 + Math.floor(i / 5) * 22} width={28} height={12} fill={c} stroke={P.chalk} strokeWidth={0.5} />
          <Txt x={26 + (i % 5) * 32} y={66 + Math.floor(i / 5) * 22} s={3} c={P.chalk}>{n}</Txt>
        </g>
      ))}
      <Txt x={12} y={102} s={4} c={P.chalkDim} anchor="start">02 TYPE</Txt>
      <Txt x={12} y={110} s={8} anchor="start">AA BB 123</Txt>
      <Txt x={12} y={121} s={4} c={P.chalkDim} anchor="start">PRESS START 2P, ALL CAPS</Txt>
      <Txt x={12} y={134} s={4} c={P.chalkDim} anchor="start">03 CALLOUTS + STICKERS</Txt>
      <Balloon n={1} x={20} y={150} to={[20, 150]} label="PART NAME" />
      <Sticker x={130} y={152} bg={P.pink} tilt={-3} lines={[{ t: "BIG FACT!", s: 6 }]} />
      <Dimension x0={14} x1={90} y={172} label="10 MM" />
      <Txt x={12} y={186} s={4} c={P.chalkDim} anchor="start">04 COGSY (MASCOT)</Txt>
      <Cogsy x={30} y={212} mood="happy" />
      <Cogsy x={72} y={212} mood="wow" />
      <Cogsy x={114} y={212} mood="point" />
      <Cogsy x={154} y={212} mood="wave" />
      <Txt x={12} y={238} s={4} c={P.chalkDim} anchor="start">05 TITLE BLOCK = SPEED</Txt>
      <Pixels px={dashed(12, 246, 168, 246, P.chalkDim, 4, 2)} />
      <Txt x={12} y={252} s={4} c={P.lime} anchor="start">LIME = REAL SPEED</Txt>
      <Txt x={12} y={260} s={4} c={P.cyan} anchor="start">CYAN = SLOW-MO</Txt>
      <Txt x={12} y={268} s={4} c={P.pink} anchor="start">PINK = FAST / FX</Txt>
      <TitleBlock title="STYLE GUIDE" scale="REV A" mode="slow" dwg="000" />
    </Frame>
  );
};

export const STYLE_SHOTS = [Hook, Explain, BigNumber, EndCard, StyleSheet];
export const StyleFrames: React.FC<{ shot: number }> = ({ shot }) => {
  const S = STYLE_SHOTS[shot] ?? Hook;
  return <S />;
};
