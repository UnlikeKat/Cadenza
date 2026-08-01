# src — Application Source Root

## Purpose

Root of the Cadenza web application source tree. Hosts the React entry point, the top-level router, the global stylesheet, and three durable subdomains: `pages`, `components`, and `hooks`.

## Ownership

- Entry point: `main.tsx` mounts `<App />` into `#root` under `React.StrictMode`
- `App.tsx` defines the `BrowserRouter` and the three routes (`/`, `/upload`, `/score`) plus the global nav header
- `App.css` holds app-shell layout (header, nav, wrapper)
- `index.css` is the global stylesheet imported once at boot

## Local Contracts

- Every route component lives under `pages/`; every reusable presentational component under `components/`; every domain-logic hook under `hooks/`
- New routes must be registered in `App.tsx` and have a corresponding page component in `pages/`
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

- `pages/` — Route-level page components (Home, Upload, Score) and their co-located CSS
- `components/` — Reusable presentational components (MidiPanel, PlaybackBar, StaffToggle)
- `hooks/` — Domain-logic hooks (useMidi, usePracticeMode)
