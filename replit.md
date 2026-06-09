# SyncHR — Employee Attendance System

A production-ready QR code-based employee attendance system with GPS verification, selfie capture, and an admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/attendance-app run dev` — run the frontend (port 19377)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS
- API: Express 5, JWT authentication (jsonwebtoken + bcryptjs)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- QR Scanning: html5-qrcode (employee camera scanning)
- QR Generation: qrcode (admin QR display)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema (employees, attendance, qrTokens)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware
- `artifacts/attendance-app/src/pages/` — React pages (employee + admin)
- `artifacts/api-server/uploads/` — Saved selfie images

## Architecture decisions

- QR tokens expire after 5 minutes; each generated via `POST /api/qr/generate` (admin only)
- Selfies are sent as base64 data URLs in JSON body, saved to `artifacts/api-server/uploads/`
- GPS radius validation is configurable (default: 100m) — set `GPS_VALIDATION_ENABLED=true` and update `COMPANY_LAT`/`COMPANY_LNG` in attendance.ts
- JWT secret comes from `JWT_SECRET` env var (falls back to a dev default)
- bcrypt password hashing; pgcrypto used for seeding only (both produce compatible hashes)

## Product

- **Employee portal**: Login → scan QR → capture GPS + selfie → clock in/out. View attendance history.
- **Admin portal**: Dashboard stats, generate/display QR codes with 5-min countdown, view all attendance records with selfies, manage employees (CRUD), export reports as CSV.

## Demo credentials

| Role     | Email                  | Password      |
|----------|------------------------|---------------|
| Admin    | admin@company.com      | admin123      |
| Employee | john@company.com       | employee123   |
| Employee | sarah@company.com      | employee123   |
| Employee | david@company.com      | employee123   |

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After schema changes: run `pnpm --filter @workspace/db run push` then restart the API server workflow
- After OpenAPI spec changes: run `pnpm --filter @workspace/api-spec run codegen` then restart frontend
- `bcryptjs` is used (pure JS) — no native build scripts needed
- GPS validation is disabled by default in attendance.ts (`GPS_VALIDATION_ENABLED = false`). Enable and set company coordinates for production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
