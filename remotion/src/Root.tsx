import { Composition } from "remotion";
import { HelloShort } from "./HelloShort";

export const Root = () => (
  <>
    {/* 9:16 vertical: TikTok / Reels / Shorts */}
    <Composition id="HelloShort" component={HelloShort} durationInFrames={90} fps={30} width={1080} height={1920}
      defaultProps={{ title: "AI Video Studio" }} />
    {/* 16:9: YouTube long-form */}
    <Composition id="HelloWide" component={HelloShort} durationInFrames={90} fps={30} width={1920} height={1080}
      defaultProps={{ title: "AI Video Studio" }} />
  </>
);
