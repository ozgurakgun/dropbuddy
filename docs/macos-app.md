# DropBuddy macOS app (MVP-acceptable)

We are **not** requiring a browser-only MVP. A standalone macOS app is fine for kitchen ops, especially with the Epson ES-50 on the same machine.

## Why

- USB scanners are awkward in a pure web app (no direct device access).
- A desktop shell can watch `~/DropBuddy/inbox`, keep the window on a kitchen Mac, and later call local OCR or a cloud API.
- The existing Vite + React UI can be reused inside a thin native wrapper.

## Implementation (in progress on MVP2 branch)

**Tauri 2** wraps this repo’s frontend (`src-tauri/`).

| Layer | Role |
|-------|------|
| React UI | Admin / Operations / Intake |
| Tauri | App window, inbox ensure/list/read commands, `notify` folder watcher |
| Epson Scan 2 | USB scan → writes images to `~/DropBuddy/inbox` |

### Run locally

```bash
npm install
npm run inbox:init
# Set Epson Scan 2 destination to ~/DropBuddy/inbox
npm run desktop:dev
```

Web-only (no auto-watch): `npm run dev`.

### Build a macOS app

```bash
npm run desktop:build
```

## MVP behaviour

1. User scans with ES-50 → files land in `~/DropBuddy/inbox`.
2. macOS app auto-detects new images and queues them in Intake.
3. Stub → then real OCR+LLM.
4. Render-hosted web build remains for remote demos.

## Out of scope for first desktop slice

- Replacing Epson Scan 2 with a custom TWAIN/ICA driver UI.
- App Store notarization polish (local/dev distribution first).
- Full offline OCR (cloud LLM is OK for early MVP).
