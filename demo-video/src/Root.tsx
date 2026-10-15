import { Composition } from "remotion";
import { Demo, demoDuration } from "./Demo";
import { fps } from "./theme";

export function RemotionRoot() {
  return (
    <Composition
      id="MeridiqaDemo"
      component={Demo}
      durationInFrames={demoDuration}
      fps={fps}
      width={1920}
      height={1080}
    />
  );
}
