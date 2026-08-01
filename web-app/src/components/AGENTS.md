# components — Reusable Presentational Components

## Purpose

Stateless and lightly-stateful UI components reused across pages. Each component is paired with a co-located `.css` file and is consumed by one or more page components.

## Ownership

- `MidiPanel.tsx` / `.css` — Collapsible MIDI connection panel. Renders device selector, live note display, mini keyboard visualization (C3–B4). Consumes `UseMidiReturn` from `useMidi`. Returns `null` on unsupported browsers.
- `PlaybackBar.tsx` / `.css` — Floating bottom control bar. Exposes Play/Pause, Stop, and Practice toggle. Renders a thin progress line (0–100%). Uses Material Symbols icons + a custom stopwatch SVG for the practice button.
- `StaffToggle.tsx` / `.css` — Sticky treble/bass clef toggle buttons. Only renders during active practice mode. Calls back with staff index (1 = treble, 2 = bass).

## Local Contracts

- Components receive all data and callbacks via props — no direct hook usage inside presentational components except local UI state (e.g. `MidiPanel` expand/collapse)
- Each component imports its own `.css` file; styles are scoped by component-specific class names
- `MidiPanel` depends on the `UseMidiReturn` interface exported from `hooks/useMidi`
- `PlaybackBar` and `StaffToggle` are controlled components — parent owns playback/practice state

## Work Guidance

- Use `lucide-react` for standard icons; use inline SVG only when no suitable lucide icon exists (see `PlaybackBar` practice stopwatch)
- Material Symbols icons are loaded via class `material-symbols-outlined` with `fontVariationSettings` for weight/fill control
- New components must follow the same pattern: `React.FC<Props>`, named export, co-located CSS, component-scoped class names

## Verification

- `npm run lint` — ESLint with React Hooks + React Refresh plugins
- `npm run build` — TypeScript type-check + Vite build

## Child DOX Index

No child documents. All files in this directory are leaf components.
