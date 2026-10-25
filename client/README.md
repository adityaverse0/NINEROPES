# Hicine Client: Clean-Room Technical Reconstruction

This is a clean-room, production-grade frontend reconstruction of **Hicine** ([`https://hicine.biz/`](https://hicine.biz/)), engineered based on the findings documented in [`hicine_technical_reconstruction_report.md`](file:///data/data/com.termux/files/home/.gemini/antigravity-cli/brain/ecf9ea19-6706-46e6-8187-c5118461053a/hicine_technical_reconstruction_report.md).

---

## 1. Architectural Highlights

- **Framework**: React 18.3.1 + TypeScript + Vite 5 + Tailwind CSS.
- **Direct Live API Integration**: Communicates directly with `https://api.hicine.biz` via JSON-RPC (`/rpc/*`) and REST (`/api/*`), utilizing the authentic client authentication header `x-api-key: hicine_website_secret_2025_exi9epdmrns`.
- **Responsive Layout & Navigation**:
  - Desktop header with navigation tabs (**Home**, **Trending**, **Movies**, **Series**).
  - 3-Way **Cinema Mode Switcher**: **🎬 Hollywood**, **All**, **🎪 Bollywood**.
  - Mobile bottom fixed navigation bar.
- **Search System**:
  - Global search with `300ms` debounce.
  - Request cancellation on rapid typing using `AbortController`.
  - Autocomplete suggestion dropdown and local search history.
- **Modals & Link Resolvers**:
  - **MovieDetailsModal (`TA`)**: Parses the 7-slot comma-separated link structure (`PixelDrain`, `FSL`, `Mega`, `VCloud`, `Filexpress`, `GDtot`, `G-Direct`), quality tabs, and 10Gbps Cloud download buttons.
  - **SeriesDetailModal (`ZA`)**: Dynamic multi-season tabs (`Season 1` to `Season N`), episode listing, and complete season ZIP download links.
  - **DownloadManager**: Off-screen hidden `<iframe>` download execution triggering native browser download dialogs without navigating away from the page, with 8-second auto-cleanup.
- **Anti-Leech Verification Gate (`Ju`)**:
  - Developer bypass automatically active on `localhost` / `127.0.0.1`.
  - Persistent 24-hour session validation (`sessionStorage` / `localStorage`).
  - Supports verification via `HS256` JWS token parameter (`?from=hicine&token=<JWS>`) with hardcoded secret `hiicine_demo_secret_2025`.

---

## 2. Directory Structure

```
client/
├── index.html                 # App shell with mobile viewport optimizations
├── package.json               # Dependencies & scripts
├── postcss.config.js          # PostCSS configuration
├── tailwind.config.js         # Tailwind theme & animation extensions
├── tsconfig.json              # TypeScript strict configuration
├── vite.config.ts             # Vite build & dev server config
└── src/
    ├── main.tsx               # Application mount point
    ├── App.tsx                # Core state coordinator & layout
    ├── index.css              # Tailwind directives & custom animations
    ├── types/
    │   └── index.ts           # Media, Server, Feed, and State types
    ├── services/
    │   ├── api.ts             # Typed client for https://api.hicine.biz
    │   ├── authGate.ts        # Anti-leech verification gate
    │   └── downloadManager.ts # Background iframe download manager
    └── components/
        ├── Header.tsx         # Responsive header with search autocomplete
        ├── BottomBar.tsx      # Mobile fixed navigation bar
        ├── HeroCarousel.tsx   # Featured carousel banner
        ├── MovieCard.tsx      # Media grid card with badges
        ├── ContentSection.tsx # Media sections (grid / scrollable carousel)
        ├── MovieDetailsModal.tsx # Multi-server movie modal (TA)
        ├── SeriesDetailModal.tsx # Multi-season series modal (ZA)
        └── ScrollToTop.tsx    # Floating scroll-to-top button
```

---

## 3. Running & Building

### Development Mode
```bash
cd client
npm run dev
```
Starts the Vite dev server at `http://localhost:3000`. Localhost automatically bypasses the access gate.

### Production Build
```bash
cd client
npm run build
```
Generates a highly optimized production bundle in `dist/` (~498 kB JS, ~30 kB CSS).

### Preview Build
```bash
cd client
npm run preview
```
