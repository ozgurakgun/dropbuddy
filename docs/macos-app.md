# DropBuddy macOS app (MVP-acceptable)

We are **not** requiring a browser-only MVP. A standalone macOS app is fine for kitchen ops, especially with the Epson ES-50 on the same machine.

## Why

- USB scanners are awkward in a pure web app (no direct device access).
- A desktop shell can watch `~/DropBuddy/inbox`, keep the window on a kitchen Mac, and later call local OCR or a cloud API.
- The existing Vite + React UI can be reused inside a thin native wrapper.

## Recommended approach (next implementation slice)

**Tauri 2** wrapping this repo’s frontend:

| Layer | Role |
|-------|------|
| React UI (current) | Admin / Operations / Intake |
| Tauri (Rust) | App window, FS permissions, folder watcher on `~/DropBuddy/inbox` |
| Epson Scan 2 | Still owns USB scan → writes images to inbox |
| Optional later | Native Image Capture / ICA if we want scan-from-app without Epson UI |

Electron is also viable; Tauri keeps the install smaller and fits the current Vite toolchain.

## MVP behaviour

1. User scans with ES-50 → files land in `~/DropBuddy/inbox`.
2. macOS app auto-detects new images and queues them in Intake (no manual file picker).
3. Stub → then real OCR+LLM as today planned.
4. Render-hosted web build can remain for remote demos; kitchen machine runs the desktop app.

## Out of scope for first desktop slice

- Replacing Epson Scan 2 with a custom TWAIN/ICA driver UI.
- App Store notarization polish (local/dev distribution first).
- Full offline OCR (cloud LLM is OK for early MVP).
