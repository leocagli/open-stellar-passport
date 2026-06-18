# video — narrated demo (Remotion)

Composes the captioned screencast with a voiceover track and renders the
narrated demo (`../docs/demo-narrated.mp4`).

The narration is generated with **Windows SAPI TTS** (no API key) — robotic but
real. To swap in your own voice or a premium TTS (e.g. ElevenLabs), just replace
the WAVs in `public/vo/` and re-render; timings are in `src/vo.ts`.

## Regenerate

```bash
npm install

# 1. screencast (silent, captioned) — produced by the frontend recorder, then
#    copied here:
cp ../docs/demo.mp4 public/screencast.mp4

# 2. voiceover WAVs (Windows SAPI):
powershell -ExecutionPolicy Bypass -File ./gen-vo.ps1

# 3. render (point at Edge to avoid a chromium download):
REMOTION_BROWSER_EXECUTABLE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" \
  npx remotion render Narrated ../docs/demo-narrated.mp4

# 4. (optional) normalize loudness:
ffmpeg -i ../docs/demo-narrated.mp4 -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac out.mp4
```

`npx remotion studio` opens a live preview to retime the voiceover.
