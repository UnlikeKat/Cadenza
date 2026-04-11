# Cadenza Project Overview

Cadenza is a multi-component platform for sheet music analysis, rendering, and playback. It integrates Optical Music Recognition (OMR) using Audiveris, high-fidelity sheet music rendering via OpenSheetMusicDisplay (OSMD), and interactive audio playback.

## Architecture & Components

### 1. `web-app` (Frontend & Orchestrator)
The main user interface built with **Next.js 15**, **React 19**, and **Tailwind CSS 4**.
- **State Management:** React Hooks and Context.
- **Backend:** Next.js Route Handlers (App Router).
- **Authentication:** NextAuth.js with Prisma adapter.
- **Database:** PostgreSQL (managed via Prisma).
- **Key Features:**
    - MusicXML upload and rendering.
    - OMR integration via a proxy to the Audiveris service.
    - Interactive Music Player using `osmd-extended`.
- **Location:** `web-app/`

### 2. `osmd-extended-master` (Rendering Engine)
A specialized/extended version of **OpenSheetMusicDisplay (OSMD)**.
- **Technology:** TypeScript, Webpack, VexFlow.
- **Key Features:** 
    - High-quality MusicXML rendering.
    - Built-in Audio Player with synthesizer support (Soundfont, SamplePlayer).
    - Transposition and layout justification.
- **Location:** `osmd-extended-master/`

### 3. `audiveris` (OMR Service)
A containerized OMR service that wraps **Audiveris 5.7.1**.
- **Technology:** Python (Flask), Docker, Audiveris (Java).
- **Functionality:** Accepts image/PDF uploads and returns MusicXML files.
- **Port:** Defaults to `8080`.
- **Location:** `audiveris/`

### 4. `icdar` / `cadenza/icdar` (Research/Data)
Python environments likely used for document analysis research or data processing related to the ICDAR (International Conference on Document Analysis and Recognition) standards.

---

## Development & Operations

### Building and Running

#### Web Application
```bash
cd web-app
npm install
npx prisma generate
npm run dev
```

#### OMR Service (Docker)
```bash
cd audiveris
docker-compose up --build
```

#### OSMD Extended (Core Engine)
```bash
cd osmd-extended-master
npm install
npm run build
```
Note: The built file is usually consumed by the `web-app` (often manually copied or linked to `web-app/public/osmd/`).

---

## Technical Workflows

### OMR Conversion Flow
1. User uploads a PNG/JPG/PDF in `web-app`.
2. `web-app` API (`/api/omr/convert`) proxies the request to the `audiveris` service (`localhost:8080/convert`).
3. `audiveris` service runs the Audiveris OMR engine in batch mode.
4. The service cleans the output, extracts the MusicXML, and returns it to `web-app`.
5. `web-app` downloads the result or passes it to the `MusicPlayer` component.

### Music Playback Flow
1. `MusicPlayer` component receives MusicXML data.
2. `osmd-extended` renders the score onto a canvas/SVG.
3. The internal `AudioPlayer` manages the playback state, using Tone.js or internal synthesizers to produce sound while syncing with the visual cursor.

---

## Development Conventions
- **TypeScript:** Preferred for all frontend and core engine development.
- **Surgical Updates:** When modifying the OMR service or the rendering engine, ensure compatibility with the `web-app` proxy and component interfaces.
- **Styling:** `web-app` uses Tailwind CSS 4 with a "cosmic" dark theme.
- **Environment Variables:**
    - `DATABASE_URL`: Prisma connection string.
    - `OMR_SERVICE_URL`: URL to the `audiveris` service.
    - `OMR_ENABLED`: Boolean flag to enable/disable OMR features in the frontend.
