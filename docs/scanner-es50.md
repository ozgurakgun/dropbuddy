# Epson ES-50 → DropBuddy intake

The browser cannot talk to USB scanners directly. Use **Epson Scan 2** (installer DMG from Epson) to save slips into a DropBuddy inbox folder, then import them in the **Intake** tab (or, later, a local watcher / server).

## Recommended inbox

```text
~/DropBuddy/inbox
```

Create it once:

```bash
mkdir -p ~/DropBuddy/inbox
open ~/DropBuddy/inbox
```

## Epson Scan 2 settings (ES-50)

1. Install **Epson Scan 2** from the Epson software package for ES-50.
2. Confirm the scanner appears in Epson Scan 2 / macOS **Image Capture**.
3. Set destination folder to `~/DropBuddy/inbox`.
4. Prefer **JPEG** or **PNG** for receipts (PDF works later once OCR handles multi-page).
5. Use a naming pattern that includes a timestamp if available (easier to audit).

Suggested scan mode for kitchen slips: colour or greyscale, ~200–300 dpi, single-sided.

## DropBuddy flow (current groundwork)

1. Scan a slip with the ES-50 into `~/DropBuddy/inbox`.
2. Open DropBuddy → **Intake**.
3. **Add scanned files…** (or drag-and-drop) and select the new image(s) from the inbox.
4. **Run OCR+LLM stub** — currently stubbed; next phase wires real OCR/LLM against these images.

## Later

- Local folder watcher that auto-enqueues new files without a file picker.
- Upload to object storage + server-side OCR when we add a Render web service.
