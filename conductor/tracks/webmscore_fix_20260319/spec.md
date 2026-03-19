# Track Specification: WebMscore Position Data Fix

## Problem Description
Loading MuseScore (.mscz) or MusicXML files in the `WebMscorePlayer` triggers a `RuntimeError: function signature mismatch` when the `useWebMscore` hook attempts to retrieve position data. This prevents the visual cursor from functioning and causes the loading process to fail at the final stage.

## Root Cause Hypothesis
The `webmscore` engine (running in a Web Worker) and the WASM binary have a mismatch in the expected parameters for RPC methods like `savePositions` or `segmentPositions`. This is likely due to a version mismatch between the `webmscore` NPM package and the manually managed WASM/JS files in the `public/` directory.

## Success Criteria
- [ ] Music scores (MusicXML and MSCZ) load without `RuntimeError`.
- [ ] Visual position data is successfully retrieved from the WebMscore engine.
- [ ] The `ScoreCursor` correctly tracks playback in the `WebMscorePlayer`.
- [ ] "Merry-Go-Round of Life" specifically loads and plays with a functional cursor.

## Technical Requirements
- Align `webmscore` package version with the WASM binaries.
- Ensure the RPC call signature in `useWebMscore.ts` matches the engine's requirements.
- Maintain compatibility with the local worker mode in `WebMscoreManager`.
