# Tech Stack - Cadenza

## Core Technologies
- **Programming Language:** TypeScript
- **Frontend Framework:** Next.js 15 (App Router), React 19
- **Backend Framework:** Next.js Route Handlers (integrated with Next.js)
- **Styling:** Tailwind CSS 4 with PostCSS

## Data & Persistence
- **Database:** PostgreSQL
- **ORM:** Prisma 6 with Prisma Client
- **Authentication:** NextAuth.js 4 (using the Prisma adapter)

## Specialized Music Modules
- **Rendering & Analysis:** WebMscore for MusicXML processing and rendering.
- **Audio Engine:** Tone.js for low-latency audio playback and synthesis.
- **File Manipulation:** fast-xml-parser and xmlbuilder2 for robust MusicXML parsing and generation.
- **Asset Management:** JSZip for handling compressed MusicXML (.mxl) files.

## Utilities & Icons
- **Icon Library:** Lucide-React
- **Styling Utilities:** clsx and tailwind-merge
- **Animation:** tw-animate-css
