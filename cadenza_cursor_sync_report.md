# Cadenza Cursor Synchronization Report

## The Objective
The goal is to render a precise, vertical cursor that snaps cleanly from note-to-note in perfect rhythm with the active audio synthesizer during playback, avoiding smooth scrolling or measure-by-measure lag.

## The Core Defect
The fundamental problem lies in the underlying sheet music rendering engine, **WebMscore (version 1.2.1)**. 
WebMscore provides two tracking APIs:
1. `measurePositions()`: Returns the bounding boxes for entire measures. (Stable)
2. `segmentPositions()`: Returns the precise bounding boxes and timestamps for individual notes/chords. (Defective)

In version 1.2.1, calling `segmentPositions()` strictly crashes the WebAssembly VM with a fatal error:
`RuntimeError: null function or function signature mismatch`

Without access to `segmentPositions()`, the frontend has no native way to know the exact physical $X$ coordinates of individual notes.

---

## Technical Attempts & Engineering Log

### Attempt 1: Server-Side API Extraction
Knowing that `segmentPositions()` crashes the browser's WASM engine, we attempted to offload the extraction.
* **What we did**: We built a proxy backend (`/api/segmentPositions`) to run the Node.js compiled version of `webmscore`, load the file out of band, extract the perfect sub-note data, and pass it back to the client.
* **Why it failed**: Next.js's Webpack internal bundler violently rejects WebMscore's native `fs` and `path` bindings. Even after reconfiguring `next.config.ts` to shield the module, and eventually isolating the payload into a strictly spawned Node.js subprocess (`extractPositions.js`), we made a terminal discovery: **`segmentPositions` also crashes in native Node.js on v1.2.1.** 
* *Note: It only occasionally worked in early tests because a decoupled `mscz-service` folder contained an ancient WebMscore `v0.21.0` binary. We cannot safely downgrade the React app to v0.21.0 because it fundamentally breaks `synthAudio` audio playback and MuseScore 4 file support entirely.*

### Attempt 2: Mathematical Interpolation
Since we were restricted to using the stable `measurePositions()` API in the browser, we attempted to mathematically guess where the notes were.
* **What we did**: We built an engine that takes the chronological start/end time of a measure, determines how far into the measure the song has played (e.g. 50% through the time), and projects that 50% fraction against the measure's physical width dimension in pixels. 
* **Why it failed**: `measurePositions` only emits one single time-event flag when the measure starts. Without intermediate time flags, the cursor physically could not jump to sub-notes. It simply leaped by measures and sat frozen.

### Attempt 3: Native MusicXML AST Interceptor
To secure intermediate time-flags natively without crashing, we bypassed the tracking engine altogether.
* **What we did**: 
  1. We instruct WebMscore to silently export its internal raw `MusicXML` string.
  2. We parse this XML natively using the browser's `DOMParser`.
  3. We crawl through the AST of `<measure>` and `<note>` tags, meticulously calculating the musical rhythm durations, accounting for `<chord>`, `<backup>`, and `<forward>` multi-voice tags.
  4. We unroll that static AST map directly onto the actual live audio timeline to flawlessly account for musical repeats and tempo skips.
  5. We inject explicit geometrical margins (detecting when $X$ coordinates wrap lines, and jumping past the 60+ pixels occupied by Clefs and Key Signatures).
* **The Current State**: The cursor now successfully jumps multiple times per measure! It tracks repeats correctly and skips clef margins.
* **Why it is "not perfectly synced"**: The cursor is using strict chronological pacing ($Time \rightarrow \text{Fraction} \rightarrow X_{pixel}$). However, **sheet music spacing is entirely non-linear.** Optical engraving algorithms ensure that a whole note does *not* absorb 4 times the physical ink space of a quarter note. Because musical time is decoupled from visual geometry, any linear mathematical interpolation across a measure will result in the cursor landing slightly behind or slightly ahead of the actual printed notehead.

---

## Conclusion & Next Steps
We have structurally pushed the boundaries of WebMscore 1.2.1. We have successfully proven that while we *do* possess mathematically pristine sub-note timestamps via XML extraction, we *do not* possess perfectly mapped visual bounding boxes because the engine's sole layout function (`segmentPositions`) was compiled defectively upstream by the developers.

**Available Solutions:**
1. **Fallback to OSMD Renderer**: Your architecture specifies `osmd-extended-master` (OpenSheetMusicDisplay) as an alternative rendering engine. OSMD is profoundly stable in TypeScript and perfectly supports highly granular `cursor.next()` note-tracking out of the box natively. If absolute pixel-perfect rhythm sync is non-negotiable, transitioning the visual tracking to OSMD while potentially keeping WebMscore purely for audio synthesis or MSCZ-to-XML conversion is the ultimate industry standard.
2. **Patch WebMscore Upstream**: Building a C++ toolchain to locally re-compile the LibreScore WebMscore Emscripten bindings to resolve the Function Signature WebAssembly crash. 
