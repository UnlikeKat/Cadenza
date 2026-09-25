# pages — Route-Level Page Components

## Purpose

Top-level page components — one per application route. Each page composes hooks and presentational components to deliver a full screen of the app. Pages are registered in `src/App.tsx`.

## Ownership

- `HomePage.tsx` / `.css` — Landing page. Minimal hero section with the Cadenza logo and a single CTA linking to `/upload`.
- `UploadPage.tsx` / `.css` — Score upload screen. Drag-and-drop or browse for a MusicXML file (`.xml`, `.musicxml`, `.mxl`). Hosts the `MidiPanel` so the user can connect a MIDI device before opening the score. Passes the selected `File`, `midiEnabled`, and `midiInputId` to `/score` via `react-router-dom` `location.state`.
- `ScorePage.tsx` / `.css` — The main score viewer and practice surface. Dynamically imports `@music-i18n/musicxml-player` (Player + OSMD renderer + Verovio converter). Manages playback state, progress tracking, loading/error overlays, and the practice-mode lifecycle. Composes `PlaybackBar`, `StaffToggle`, `useMidi`, and `usePracticeMode`.
- `MetricsTestPage.tsx` / `.css` — Live RML metrics tester ("Metrics Lab") at `/metrics-test`. Consumes the `useMidi` event stream (`MidiEvent[]`) and evaluates the RML metric specs against each incoming event, rendering a pass/fail/waiting card per metric.

## Local Contracts

- Route → page mapping is defined in `src/App.tsx`: `/` → `HomePage`, `/upload` → `UploadPage`, `/score` → `ScorePage`, `/metrics-test` → `MetricsTestPage`
- `MetricsTestPage` consumes `useMidi`'s bounded `events: MidiEvent[]` stream with an object-identity cursor (`lastProcessedEvent` ref) — numeric indices desync when the stream evicts its head or `disable()` clears it
- `UploadPage` → `ScorePage` handoff contract via `location.state`:
  - `file: File` — the selected MusicXML file (required; `ScorePage` redirects to `/upload` if absent)
  - `midiEnabled: boolean` — whether MIDI was enabled on the upload page
  - `midiInputId: string | null` — the selected MIDI input device ID, if any
- `ScorePage` owns the `playerRef` and `osmdRef`; `osmdRef` is passed to `usePracticeMode`
- Space bar toggles play/pause on `ScorePage` (suppressed during loading and practice mode)
- Practice mode and playback are mutually exclusive — toggling one stops the other

## Work Guidance

- The `@music-i18n/musicxml-player`, `opensheetmusicdisplay`, and `webmidi` libraries are dynamically or lazily loaded where possible to keep the initial bundle small
- `ScorePage` uses module-level `let` refs for dynamically-imported library classes (`Player`, `OpenSheetMusicDisplayRenderer`, `VerovioConverter`) — these are populated on first load
- Verovio converter uses the `Bravura` font to avoid Leipzig font-loading errors
- Loading states must show a spinner and message; errors must offer a "Try Another File" path back to `/upload`

## Verification

- `npm run lint` — ESLint
- `npm run build` — TypeScript type-check + Vite build
- Manual: upload a `.musicxml` file, verify rendering, test playback and practice mode

## Child DOX Index

No child documents. All files in this directory are leaf pages.
