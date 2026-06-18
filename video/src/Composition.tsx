import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { VO } from "./vo";

// The captioned screencast (silent) as the visual layer, with per-scene
// voiceover audio sequenced over it.
export const Narrated: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("screencast.mp4")} />
      {VO.map((v, i) => (
        <Sequence key={i} from={Math.round(v.from * fps)} layout="none">
          <Audio src={staticFile(v.file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
