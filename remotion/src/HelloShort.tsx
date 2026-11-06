import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const HelloShort = ({ title }: { title: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg,#0f0c29,#302b63,#24243e)", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color: "white", fontFamily: "sans-serif", fontSize: 110, textAlign: "center", transform: `scale(${scale})`, opacity }}>
        {title}
      </h1>
    </AbsoluteFill>
  );
};
