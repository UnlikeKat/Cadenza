# hooks — Domain-Logic Hooks

## Purpose

Stateful React hooks that encapsulate cross-cutting domain logic — MIDI device management and score practice-mode navigation. Each hook owns a complex concern that would otherwise bloat page components.

## Ownership

- `useMidi.ts` — Web MIDI API integration via the `webmidi` package. Manages device enumeration, enable/disable lifecycle, input selection, live note-on/note-off tracking, two event streams, and hot-plug (connect/disconnect) events. Returns `UseMidiReturn` (the interface consumed by `MidiPanel` and `ScorePage`).
- `usePracticeMode.ts` — Note-by-note practice engine built on OSMD's native cursor API. Drives cursor reset, expected-pitch extraction, MIDI matching with 250 ms chord tolerance, gold/green note coloring, rest/tie auto-advance, and treble/bass staff toggling. Returns `PracticeModeReturn`.
- `useVerdict.ts` — Carries a finished performance to the Cadenza service and holds the seven RML verdicts. `toPerformance(events)` is a pure function, exported for testing, converting the MIDI stream into the payload the service validates. It contains no threshold and no verdict: the verdict is computed in Prolog. `API_URL` comes from `VITE_CADENZA_API` and defaults to `http://127.0.0.1:8080`.

## Local Contracts

- `useMidi` exports the `MidiNote`, `MidiEvent`, and `UseMidiReturn` interfaces; `usePracticeMode` imports `MidiNote` from `useMidi`, and `useVerdict` imports `MidiEvent` from `useMidi` — those are the only cross-hook dependencies
- `UseMidiReturn` carries TWO event streams, and they are not interchangeable: `events: MidiEvent[]` is a bounded live stream for the UI (cap 500, oldest dropped first), while `recording: MidiEvent[]` is the performance that gets analysed (cap 20000). A 216-note piece produces 434 events, so `events` alone silently loses the beginning of the performance
- `recording` must be read at analysis time, never subscribed to; `useVerdict` takes it as a plain argument and only reads it inside `analyse()`
- `useMidi` uses ref-tracked listener references so multiple instances don't clobber each other's global WebMidi listeners; never call bare `WebMidi.removeListener()` without a reference
- `useMidi` attaches the selected input's listeners and the ref-scoped global `connected`/`disconnected` handlers in an effect SETUP keyed on `isEnabled`, `selectedInput?.id`, and `attachListeners`, so delivery and hot-plug registration are re-established on every effect remount (Vite Fast Refresh / StrictMode) instead of being silently detached while the UI still shows the device as connected
- `useMidi.selectInput()` resolves the id before detaching: an empty or unresolvable id is a complete no-op — the live input keeps its listeners and the current selection is unchanged
- `useMidi.isSupported` is a lazy `useState` initializer (`!!navigator.requestMIDIAccess`), never a `setState` in an effect — do not reintroduce a support-check effect
- `useMidi`'s enable/disable global `connected`/`disconnected` handlers are typed `PortEvent` (the base `webmidi` event), not `MessageEvent`; `MessageEvent extends PortEvent`, so a handler typed `MessageEvent` is not assignable to the port-listener slot
- `enable()` surfaces `err instanceof Error ? err.message : ''` and then falls back to the default guidance string — an empty message must still produce the guidance, not `""` (pinned by `useMidi.test.ts`)
- `usePracticeMode` receives `osmdRef` (OSMD instance ref from `ScorePage`) and `activeNotes` (from `useMidi`) — it does not own MIDI state
- Staff indices: 1 = treble (top staff), 2 = bass (bottom staff); `enabledStaves` defaults to `{1, 2}` and cannot be emptied
- Color contract: gold `#C5A880` = current expected notes; green `#4CAF50` = matched notes; `#000000` = reset

## Work Guidance

- OSMD internals are accessed via untyped `any` refs — this is intentional and documented in code comments; prefer `setColor()` API over direct SVG DOM manipulation
- `no-explicit-any` is disabled for `usePracticeMode.ts` in `web-app/eslint.config.js` because OSMD ships no usable types — the override is per-file and must stay scoped to that file
- `useMidi.test.ts` runs on **bun**, not vitest (`bun test src/hooks/useMidi.test.ts`), because it drives `mock.module` for the module registry. `web-app/eslint.config.js` disables `react-hooks/globals`, `react-hooks/immutability` and `react-hooks/rules-of-hooks` for that file only: the harness runs the hook outside a React render tree, so those rules report its module-level state as violations. Its harness functions are named with a `use` prefix (`useRenderHook`, `useCreateHookWithInputs`) for that reason
- `pitchToMidi()` adds 12 to OSMD's `getHalfTone()` to correct the 1-octave offset (C4 = MIDI 60)
- The chord-tolerance window (250 ms) and post-match delay (150 ms) are tuned constants; change deliberately
- All timers (`chordTimerRef`) must be cleared on stop/reset/unmount

## Verification

- `npm run lint` — ESLint (note: `ScorePage` disables `react-hooks/exhaustive-deps` on specific effects)
- `npm run build` — TypeScript type-check
- `npm test` — vitest; **does not cover `useMidi.test.ts`** (excluded in `vite.config.ts`). Run `bun test src/hooks/useMidi.test.ts` (21 tests) as the gate for this directory
- Manual: connect a MIDI keyboard, enter practice mode, play a score note-by-note

## Child DOX Index

No child documents. All files in this directory are leaf hooks.
