import "./index.css";
import { Composition } from "remotion";
import { Narrated } from "./Composition";
import { DURATION_S, FPS } from "./vo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Narrated"
      component={Narrated}
      durationInFrames={Math.ceil(DURATION_S * FPS)}
      fps={FPS}
      width={1280}
      height={720}
    />
  );
};
