# DropBuddy

Restaurant dispatch app (Glasgow / Great Western Rd defaults). MVP1 simulated live map; MVP2 groundwork adds admin config, intake stubs, and dispatch hooks. Kitchen MVP may ship as a **macOS app** for Epson ES-50 proximity (`docs/macos-app.md`).

See [`docs/mvp2.md`](docs/mvp2.md) for the second MVP plan and [`workflow.md`](workflow.md) for PR/commit expectations.

## Features (current)

- **Operations** — OpenStreetMap view, simulated orders, first-available driver assignment, distance-based delivery timing.
- **Admin** — shop location, driver count, service radius, sim knobs, incomplete prep catalog + Q&A.
- **Intake** — Epson ES-50 / file import → stub OCR → LLM pipeline (see `docs/scanner-es50.md`).
- Render static deploy via `render.yaml` + optional `RENDER_DEPLOY_HOOK_URL` GitHub secret.

## Local Development

```bash
npm install
npm run inbox:init
npm run dev
```

Open `http://127.0.0.1:5173` (or the port shown by Vite).

### Kitchen desktop app (Epson ES-50)

```bash
npm run desktop:dev
```

Uses Tauri: watches `~/DropBuddy/inbox` and opens the DropBuddy UI. Point **Epson Scan 2** at that inbox (`docs/scanner-es50.md`, `docs/macos-app.md`).

## Local Build Check

```bash
npm run lint
npm run build
```

## Deployment on Render

Static Vite app: publish the `dist` folder after `npm run build`.

1. In [Render](https://dashboard.render.com), create a **Static Site** and connect this GitHub repository (or use **Blueprints** and point at `render.yaml`).
2. **Build command:** `npm ci && npm run build` — **Publish directory:** `dist`.
3. Optional: Deploy Hook → GitHub Actions secret **`RENDER_DEPLOY_HOOK_URL`**.
