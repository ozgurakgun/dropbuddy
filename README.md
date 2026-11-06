# DropBuddy

Multi-tenant restaurant delivery dispatch web app.

Restaurants capture order slips with **camera / file upload**, the app **auto-suggests a driver** (with override), and drivers punch pickup/delivery while sharing live location. Hosted as a **Next.js Node service on Render** with **managed Postgres** and **NextAuth**.

The earlier Vite / Tauri / Epson scanner MVP path is abandoned — see [`docs/web-app-design.md`](docs/web-app-design.md).

## Stack

- Next.js 15 (App Router)
- Prisma + PostgreSQL
- NextAuth (credentials + JWT session with tenant/role claims)
- Leaflet (map view; wiring follows this skeleton)

## Roles

| Role | Routes |
|------|--------|
| Superadmin | `/superadmin/tenants` |
| Restaurant admin | `/restaurant/orders`, `/restaurant/map` |
| Driver | `/driver` |

## Local development

```bash
cp .env.example .env
# point DATABASE_URL at a local Postgres database
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo accounts (password `password123`):

- `superadmin@dropbuddy.local`
- `admin@greatwestern.local`
- `driver@greatwestern.local`

## Checks

```bash
npm run lint
npm run build-no-db
```

## Deployment on Render

Use the Blueprint in [`render.yaml`](render.yaml):

1. Create a **Blueprint** (or Web Service + Postgres) from this repo.
2. Web service: Node runtime, `npm install --include=dev && npm run render:build`, pre-deploy `npm run render:migrate`, start `npm start`.
3. Set `NEXTAUTH_URL` to the public service URL; `DATABASE_URL` and `NEXTAUTH_SECRET` come from the blueprint.
4. Optional: create a Deploy Hook and store it as GitHub secret `RENDER_DEPLOY_HOOK_URL` so pushes to `main` can trigger deploy via `.github/workflows/render_workflow.yml`.

Health check: `/api/system/status`.

## Contributor / agent workflow

See [`workflow.md`](workflow.md) for PR prompt comments, commit style, and CI expectations.
