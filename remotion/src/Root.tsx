import { Composition } from "remotion";
import { HelloShort } from "./HelloShort";
import { StyleFrames } from "./videos/watch/StyleFrames";
import { Watch3DPreview } from "./videos/watch/Watch3D";
import { KlininPreviews } from "./clients/klinin/KlininPreviews";
import { KlininAdPreviews } from "./clients/klinin/KlininAdPreviews";
import { KlininCreative } from "./clients/klinin/KlininCreative";
import { CinematicPreview } from "./videos/watch/CinematicPreview";
import { FirefliesTeaser, WatchTeaser, TEASER_FRAMES } from "./videos/teasers/Teasers";
import { FirefliesMajestic, WatchMajestic, MAJESTIC_FRAMES, FPS60 } from "./videos/teasers/Majestic";
import { WatchMajesticFull, DURATION as WMF_DURATION, FPS as WMF_FPS } from "./videos/watch/WatchMajesticFull";
import { SewingPreview } from "./videos/sewing/SewingPreview";
import { WatchVideo, DURATION as WATCH_DURATION, FPS as WATCH_FPS } from "./videos/watch/WatchVideo";
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
    {/* 3D look previews (render with --props='{"look":"pixel"|"toy"|"blueprint"}' --gl=swangle) */}
    <Composition id="Watch3DPreview" component={Watch3DPreview} durationInFrames={60} fps={30} width={1080} height={1920} defaultProps={{ look: "toy" as const }} />
    {/* 002 · How does a watch tick? (render with --gl=swangle) */}
    <Composition id="WatchVideo" component={WatchVideo} durationInFrames={WATCH_DURATION} fps={WATCH_FPS} width={1080} height={1920} />
    {/* Client: Klinin — concept previews (--props='{"shot":N}' --gl=swangle) */}
    <Composition id="KlininPreviews" component={KlininPreviews} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ shot: 0 }} />
    <Composition id="KlininAdPreviews" component={KlininAdPreviews} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ shot: 0 }} />
    <Composition id="KlininCreative" component={KlininCreative} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ shot: 0 }} />
    <Composition id="CinematicPreview" component={CinematicPreview} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ shot: 0 }} />
    {/* Cinematic pixel-3D teasers (10 s, --gl=swangle) */}
    <Composition id="FirefliesTeaser" component={FirefliesTeaser} durationInFrames={TEASER_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="WatchTeaser" component={WatchTeaser} durationInFrames={TEASER_FRAMES} fps={30} width={1080} height={1920} />
    {/* Majestic v2 teasers: 60 fps, 10 s */}
    <Composition id="FirefliesMajestic" component={FirefliesMajestic} durationInFrames={MAJESTIC_FRAMES} fps={FPS60} width={1080} height={1920} />
    <Composition id="WatchMajestic" component={WatchMajestic} durationInFrames={MAJESTIC_FRAMES} fps={FPS60} width={1080} height={1920} />
    {/* 003 · How does a watch tick? (majestic, 48 s @ 60 fps, --gl=swangle) */}
    <Composition id="WatchMajesticFull" component={WatchMajesticFull} durationInFrames={WMF_DURATION} fps={WMF_FPS} width={1080} height={1920} />
    <Composition id="SewingPreview" component={SewingPreview} durationInFrames={1} fps={60} width={1080} height={1920} defaultProps={{ shot: 0 }} />
  </>
);
