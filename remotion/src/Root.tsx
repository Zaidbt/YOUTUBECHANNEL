import { Composition } from "remotion";
import { HelloShort } from "./HelloShort";
import { StyleFrames } from "./videos/watch/StyleFrames";
import { CarEngine, DURATION as CAR_ENGINE_DURATION, FPS as CAR_ENGINE_FPS } from "./videos/CarEngine";

export const Root = () => (
  <>
    {/* 9:16 vertical: TikTok / Reels / Shorts */}
    <Composition id="HelloShort" component={HelloShort} durationInFrames={90} fps={30} width={1080} height={1920}
      defaultProps={{ title: "AI Video Studio" }} />
    {/* 16:9: YouTube long-form */}
    <Composition id="HelloWide" component={HelloShort} durationInFrames={90} fps={30} width={1920} height={1080}
      defaultProps={{ title: "AI Video Studio" }} />
    {/* 8-bit engineering: how a car engine works */}
    <Composition id="CarEngine" component={CarEngine} durationInFrames={CAR_ENGINE_DURATION} fps={CAR_ENGINE_FPS} width={1080} height={1920} />
    {/* Brand style previews (render with --props='{"shot":N}') */}
    <Composition id="StyleFrames" component={StyleFrames} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ shot: 0 }} />
  </>
);
