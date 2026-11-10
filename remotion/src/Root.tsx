import { Composition } from "remotion";
import { HelloShort } from "./HelloShort";
import { StyleFrames } from "./videos/watch/StyleFrames";
import { Watch3DPreview } from "./videos/watch/Watch3D";
import { KlininPreviews } from "./clients/klinin/KlininPreviews";
import { KlininAdPreviews } from "./clients/klinin/KlininAdPreviews";
import { KlininCreative } from "./clients/klinin/KlininCreative";
import { KlininPost } from "./clients/klinin/KlininPost";
import { CinematicPreview } from "./videos/watch/CinematicPreview";
import { FirefliesTeaser, WatchTeaser, TEASER_FRAMES } from "./videos/teasers/Teasers";
import { FirefliesMajestic, WatchMajestic, MAJESTIC_FRAMES, FPS60 } from "./videos/teasers/Majestic";
import { WatchMajesticFull, DURATION as WMF_DURATION, FPS as WMF_FPS } from "./videos/watch/WatchMajesticFull";
import { SewingPreview } from "./videos/sewing/SewingPreview";
import { SewingVideo, DURATION as SEW_DURATION, FPS as SEW_FPS } from "./videos/sewing/SewingVideo";
import { LightVideo, DURATION as LIGHT_DURATION, FPS as LIGHT_FPS } from "./videos/light/LightVideo";
import { BeesVideo, DURATION as BEES_DURATION, FPS as BEES_FPS } from "./videos/bees/BeesVideo";
import { BeesPixelPreview } from "./videos/bees/BeesPixelPreview";
import { ProfilePic } from "./brand/ProfilePic";
import { BeesPixelVideo } from "./videos/bees/BeesPixelVideo";
import { FusionVideo, DURATION as FUSION_DURATION, FPS as FUSION_FPS } from "./videos/fusion/FusionVideo";
import { DnaVideo, DURATION as DNA_DURATION, FPS as DNA_FPS } from "./videos/dna/DnaVideo";
import { ScreensVideo, DURATION as SCR_DURATION, FPS as SCR_FPS } from "./videos/screens/ScreensVideo";
import { BabyVideo, DURATION as BABY_DURATION, FPS as BABY_FPS } from "./videos/baby/BabyVideo";
import { AncVideo, DURATION as ANC_DURATION, FPS as ANC_FPS } from "./videos/anc/AncVideo";
import { ChameleonVideo, DURATION as CHAM_DURATION, FPS as CHAM_FPS } from "./videos/chameleon/ChameleonVideo";
import { Chameleon30, DURATION as CHAM30_DURATION, FPS as CHAM30_FPS } from "./videos/chameleon/Chameleon30";
import { CameraVideo, DURATION as CAMV_DURATION, FPS as CAMV_FPS } from "./videos/camera/CameraVideo";
import { ChameleonK, DURATION as CHAMK_DURATION, FPS as CHAMK_FPS } from "./videos/chameleon/ChameleonK";
import { CameraK, DURATION as CAMK_DURATION, FPS as CAMK_FPS } from "./videos/camera/CameraK";
import { CameraKZ, DURATION as CAMKZ_DURATION, FPS as CAMKZ_FPS } from "./videos/camera/CameraKZ";
import { AirFryerVideo, DURATION as AF_DURATION, FPS as AF_FPS } from "./videos/airfryer/AirFryerVideo";
import { AirFryerV2, DURATION as AF2_DURATION, FPS as AF2_FPS } from "./videos/airfryer/AirFryerV2";
import { AirFryerK, DURATION as AFK_DURATION, FPS as AFK_FPS } from "./videos/airfryer/AirFryerK";
import { LsdVideo, DURATION as LSD_DURATION, FPS as LSD_FPS } from "./videos/lsd/LsdVideo";
import { BulbVideo, DURATION as BULB_DURATION, FPS as BULB_FPS } from "./videos/bulb/BulbVideo";
import { AnesthesiaVideo, DURATION as ANES_DURATION, FPS as ANES_FPS } from "./videos/anesthesia/AnesthesiaVideo";
import { AfterimageVideo, DURATION as AFTER_DURATION, FPS as AFTER_FPS } from "./videos/afterimage/AfterimageVideo";
import { BlinkVideo, DURATION as BLINK_DURATION, FPS as BLINK_FPS } from "./videos/blink/BlinkVideo";
import { PixelQuizVideo, DURATION as QUIZ_DURATION, FPS as QUIZ_FPS } from "./videos/pixelquiz/PixelQuizVideo";
import { CardCountVideo, DURATION as CARD_DURATION, FPS as CARD_FPS } from "./videos/cardcount/CardCountVideo";
import { WorldsVideo, DURATION as WORLDS_DURATION, FPS as WORLDS_FPS } from "./videos/worlds/WorldsVideo";
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
    {/* 004 · Sewing machine lockstitch (48 s loop @ 60 fps, --gl=swangle) */}
    <Composition id="SewingVideo" component={SewingVideo} durationInFrames={SEW_DURATION} fps={SEW_FPS} width={1080} height={1920} />
    {/* 005 · How does a light bulb make light? (48 s loop @ 60 fps, --gl=swangle) */}
    <Composition id="LightVideo" component={LightVideo} durationInFrames={LIGHT_DURATION} fps={LIGHT_FPS} width={1080} height={1920} />
    {/* 006 · How do bees build perfect hexagons? (48 s loop @ 60 fps, --gl=swangle) */}
    <Composition id="BeesVideo" component={BeesVideo} durationInFrames={BEES_DURATION} fps={BEES_FPS} width={1080} height={1920} />
    <Composition id="BeesPixelPreview" component={BeesPixelPreview} durationInFrames={1} fps={60} width={1080} height={1920} defaultProps={{ shot: 0 }} />
    <Composition id="ProfilePic" component={ProfilePic} durationInFrames={1} fps={30} width={1080} height={1080} />
    {/* 006 v2 · bees in true pixel-art 3D (48 s loop @ 60 fps, --gl=swangle) */}
    <Composition id="BeesPixelVideo" component={BeesPixelVideo} durationInFrames={BEES_DURATION} fps={BEES_FPS} width={1080} height={1920} />
    {/* 007 · How does fusion power the Sun? (48 s loop @ 60 fps, 150 BPM, --gl=swangle) */}
    <Composition id="FusionVideo" component={FusionVideo} durationInFrames={FUSION_DURATION} fps={FUSION_FPS} width={1080} height={1920} />
    {/* 008 · How does your DNA copy itself? (48 s loop @ 60 fps, 150 BPM, --gl=swangle) */}
    <Composition id="DnaVideo" component={DnaVideo} durationInFrames={DNA_DURATION} fps={DNA_FPS} width={1080} height={1920} />
    {/* 009 · How do screens work? (48 s loop @ 60 fps, 170 BPM DnB, --gl=swangle) */}
    <Composition id="ScreensVideo" component={ScreensVideo} durationInFrames={SCR_DURATION} fps={SCR_FPS} width={1080} height={1920} />
    {/* 010 · How does a baby form? (48 s loop @ 60 fps, 140 BPM jersey club, --gl=swangle) */}
    <Composition id="BabyVideo" component={BabyVideo} durationInFrames={BABY_DURATION} fps={BABY_FPS} width={1080} height={1920} />
    {/* 011 · How do noise-cancelling headphones work? (48 s loop @ 60 fps, 130 BPM UK garage, --gl=swangle) */}
    <Composition id="AncVideo" component={AncVideo} durationInFrames={ANC_DURATION} fps={ANC_FPS} width={1080} height={1920} />
    <Composition id="ChameleonVideo" component={ChameleonVideo} durationInFrames={CHAM_DURATION} fps={CHAM_FPS} width={1080} height={1920} />
    <Composition id="Chameleon30" component={Chameleon30} durationInFrames={CHAM30_DURATION} fps={CHAM30_FPS} width={1080} height={1920} />
    <Composition id="CameraVideo" component={CameraVideo} durationInFrames={CAMV_DURATION} fps={CAMV_FPS} width={1080} height={1920} />
    <Composition id="ChameleonK" component={ChameleonK} durationInFrames={CHAMK_DURATION} fps={CHAMK_FPS} width={1080} height={1920} />
    <Composition id="CameraK" component={CameraK} durationInFrames={CAMK_DURATION} fps={CAMK_FPS} width={1080} height={1920} />
    <Composition id="CameraKZ" component={CameraKZ} durationInFrames={CAMKZ_DURATION} fps={CAMKZ_FPS} width={1080} height={1920} />
    <Composition id="KlininPost" component={KlininPost} durationInFrames={270} fps={30} width={1080} height={1350} />
    <Composition id="AirFryerVideo" component={AirFryerVideo} durationInFrames={AF_DURATION} fps={AF_FPS} width={1080} height={1920} />
    <Composition id="AirFryerV2" component={AirFryerV2} durationInFrames={AF2_DURATION} fps={AF2_FPS} width={1080} height={1920} />
    <Composition id="AirFryerK" component={AirFryerK} durationInFrames={AFK_DURATION} fps={AFK_FPS} width={1080} height={1920} />
    <Composition id="LsdVideo" component={LsdVideo} durationInFrames={LSD_DURATION} fps={LSD_FPS} width={1080} height={1920} />
    <Composition id="BulbVideo" component={BulbVideo} durationInFrames={BULB_DURATION} fps={BULB_FPS} width={1080} height={1920} />
    <Composition id="AnesthesiaVideo" component={AnesthesiaVideo} durationInFrames={ANES_DURATION} fps={ANES_FPS} width={1080} height={1920} />
    <Composition id="AfterimageVideo" component={AfterimageVideo} durationInFrames={AFTER_DURATION} fps={AFTER_FPS} width={1080} height={1920} />
    <Composition id="BlinkVideo" component={BlinkVideo} durationInFrames={BLINK_DURATION} fps={BLINK_FPS} width={1080} height={1920} />
    <Composition id="PixelQuizVideo" component={PixelQuizVideo} durationInFrames={QUIZ_DURATION} fps={QUIZ_FPS} width={1080} height={1920} />
    <Composition id="CardCountVideo" component={CardCountVideo} durationInFrames={CARD_DURATION} fps={CARD_FPS} width={1080} height={1920} />
    <Composition id="WorldsVideo" component={WorldsVideo} durationInFrames={WORLDS_DURATION} fps={WORLDS_FPS} width={1080} height={1920} />
  </>
);
