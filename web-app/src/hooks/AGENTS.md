# hooks — Domain-Logic Hooks

## Purpose

Stateful React hooks that encapsulate cross-cutting domain logic — MIDI device management and score practice-mode navigation. Each hook owns a complex concern that would otherwise bloat page components.

## Ownership

- `useMidi.ts` — Web MIDI API integration via the `webmidi` package. Manages device enumeration, enable/disable lifecycle, input selection, live note-on/note-off tracking, a bounded `events: MidiEvent[]` stream (plus `lastEvent`), and hot-plug (connect/disconnect) events. Returns `UseMidiReturn` (the interface consumed by `MidiPanel`, `ScorePage`, and `MetricsTestPage`).
- `usePracticeMode.ts` — Note-by-note practice engine built on OSMD's native cursor API. Drives cursor reset, expected-pitch extraction, MIDI matching with 250 ms chord tolerance, gold/green note coloring, rest/tie auto-advance, and treble/bass staff toggling. Returns `PracticeModeReturn`.

## Local Contracts

- `useMidi` exports the `MidiNote`, `MidiEvent`, and `UseMidiReturn` interfaces; `usePracticeMode` imports `MidiNote` from `useMidi` — this is the only cross-hook dependency
- `UseMidiReturn.events: MidiEvent[]` is a bounded live stream (cap 500, oldest dropped first) alongside `lastEvent: MidiEvent | null`; consumers must not treat array indices as stable across renders — `MetricsTestPage` resumes consumption by object identity (`lastProcessedEvent` ref)
- `useMidi` uses ref-tracked listener references so multiple instances don't clobber each other's global WebMidi listeners; never call bare `WebMidi.removeListener()` without a reference
- `useMidi` attaches the selected input's listeners and the ref-scoped global `connected`/`disconnected` handlers in an effect SETUP keyed on `isEnabled`, `selectedInput?.id`, and `attachListeners`, so delivery and hot-plug registration are re-established on every effect remount (Vite Fast Refresh / StrictMode) instead of being silently detached while the UI still shows the device as connected
- `useMidi.selectInput()` resolves the id before detaching: an empty or unresolvable id is a complete no-op — the live input keeps its listeners and the current selection is unchanged
- `usePracticeMode` receives `osmdRef` (OSMD instance ref from `ScorePage`) and `activeNotes` (from `useMidi`) — it does not own MIDI state
- Staff indices: 1 = treble (top staff), 2 = bass (bottom staff); `enabledStaves` defaults to `{1, 2}` and cannot be emptied
- Color contract: gold `#C5A880` = current expected notes; green `#4CAF50` = matched notes; `#000000` = reset

## Work Guidance

- OSMD internals are accessed via untyped `any` refs — this is intentional and documented in code comments; prefer `setColor()` API over direct SVG DOM manipulation
- `pitchToMidi()` adds 12 to OSMD's `getHalfTone()` to correct the 1-octave offset (C4 = MIDI 60)
- The chord-tolerance window (250 ms) and post-match delay (150 ms) are tuned constants; change deliberately
- All timers (`chordTimerRef`) must be cleared on stop/reset/unmount

## Verification

- `npm run lint` — ESLint (note: `ScorePage` disables `react-hooks/exhaustive-deps` on specific effects)
- `npm run build` — TypeScript type-check
- Manual: connect a MIDI keyboard, enter practice mode, play a score note-by-note

## Child DOX Index

No child documents. All files in this directory are leaf hooks.
