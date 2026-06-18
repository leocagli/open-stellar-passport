// Voiceover scenes: start time (s) on the screencast timeline + audio file.
// Starts are non-overlapping (each ≥ prev start + prev duration) and aligned
// to the on-screen beats of public/screencast.mp4.
export const FPS = 30;
export const DURATION_S = 100.0667;

export const VO: { from: number; file: string }[] = [
  { from: 0.6, file: "vo/01.wav" },
  { from: 7.64, file: "vo/02.wav" },
  { from: 16.93, file: "vo/03.wav" },
  { from: 26.24, file: "vo/04.wav" },
  { from: 37.0, file: "vo/05.wav" },
  { from: 56.0, file: "vo/06.wav" },
  { from: 75.0, file: "vo/07.wav" },
  { from: 85.0, file: "vo/08.wav" },
];
