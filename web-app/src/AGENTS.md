# src — Application Source Root

## Purpose

Root of the Cadenza web application source tree. Hosts the React entry point, the top-level router, the global stylesheet, and three durable subdomains: `pages`, `components`, and `hooks`.

## Ownership

- Entry point: `main.tsx` mounts `<App />` into `#root` under `React.StrictMode`
- `App.tsx` defines the `BrowserRouter` and the four routes (`/`, `/upload`, `/score`, `/metrics-test`) plus the global nav header
- `App.tsx` loads `UploadPage`, `ScorePage` and `MetricsTestPage` through `React.lazy` inside a single `<Suspense fallback={<div className="route-loading" />}>`; only `HomePage` is a static import. This is what keeps the 11 MB `@music-i18n/musicxml-player` chunk out of the landing-page load
- `App.css` holds app-shell layout (header, nav, wrapper) and the `.route-loading` Suspense fallback
- `index.css` is the global stylesheet imported once at boot

## Local Contracts

- Every route component lives under `pages/`; every reusable presentational component under `components/`; every domain-logic hook under `hooks/`
- New routes must be registered in `App.tsx` and have a corresponding page component in `pages/`. Register them with `React.lazy` unless the page is on the landing path
- Do not statically import a page that transitively pulls a heavy vendor chunk: `ScorePage` → `usePracticeMode` → the MusicXML/OSMD stylesheet, and `ScorePage` already `await import('@music-i18n/musicxml-player')` at runtime
- The nav header in `App.tsx` is the single source of truth for top-level navigation links
- Routing state passed between pages uses `react-router-dom` `location.state` (see `UploadPage` → `ScorePage` handoff)

## Work Guidance

- Stack: React 19, TypeScript (strict, `noUnusedLocals`/`noUnusedParameters` on), Vite 8, `react-router-dom` 7
- Follow the existing function-component pattern (`React.FC`) and named exports
- Keep `main.tsx` minimal — only boot logic

## Verification

- `npm run lint` (ESLint flat config, `eslint.config.js`)
- `npm run build` (`tsc -b && vite build`) — type-check + production build
- `npm run dev` — Vite dev server

## Child DOX Index

- `pages/` — Route-level page components (Home, Upload, Score, MetricsTest) and their co-located CSS
- `components/` — Reusable presentational components (MidiPanel, PlaybackBar, StaffToggle)
- `hooks/` — Domain-logic hooks (useMidi, usePracticeMode)
