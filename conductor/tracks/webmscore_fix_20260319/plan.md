# Implementation Plan: WebMscore Position Data Fix

## Phase 1: Investigation and Environment Audit
- [ ] Task: Verify the versions of `webmscore` NPM package and the files in `web-app/public/webmscore/`.
- [ ] Task: Analyze `web-app/lib/webmscore/webmscore-local.mjs` for the implementation of `rpc` and `segmentPositions`.
- [ ] Task: Inspect the browser console during a failure using `chrome-devtools` (if applicable) or by instrumenting the worker.

## Phase 2: Debugging and Root Cause Isolation
- [ ] Task: Create a minimal script to test `savePositions` and `segmentPositions` independently in the browser.
- [ ] Task: Log the exact arguments and types passed to `score.rpc('savePositions', ...)` in `useWebMscore.ts`.
- [ ] Task: Identify the correct function signature required by the WASM binary for `savePositions`.

## Phase 3: Implementation of the Fix
- [ ] Task: Update the RPC call signature in `web-app/lib/webmscore/useWebMscore.ts` to match the engine's requirements.
- [ ] Task: If necessary, patch `web-app/lib/webmscore/webmscore-local.mjs` to ensure the correct conversion of parameters between the worker and the main thread.
- [ ] Task: Ensure that `Uint8Array` data passed to the engine has a valid buffer property, as required by the WASM interface.

## Phase 4: Verification and Testing
- [ ] Task: Verify that "Merry-Go-Round of Life" loads successfully and retrieves position data.
- [ ] Task: Confirm that the playback cursor appears and moves correctly in the `WebMscorePlayer`.
- [ ] Task: Test loading of different file formats (MusicXML and MSCZ) to ensure the fix is robust.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
