# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Password reset (local development)

Forgot Password always returns the same generic success message when configuration is valid. In local development (`EMAIL_PROVIDER` empty, `none`, or `local`), the raw reset link is appended to a gitignored file instead of being emailed:

- Default path: `tmp/password-reset-dev.log` (project root)
- Override: set `PASSWORD_RESET_DEV_FILE` in `.env` or the API process environment
- Each line is JSON: `{ "email", "resetUrl", "at" }`
- Open `resetUrl` in the browser (`/reset-password?token=...`) to complete the flow
- Production providers are not wired yet; leave `EMAIL_PROVIDER` empty for local use
- Never commit this file; it contains one-time reset tokens

In `NODE_ENV=production`, password reset **fails with a clear server-side configuration error** (HTTP 500) until a real email provider and `EMAIL_RESET_BASE_URL` are configured. The API never pretends an email was sent.

## Production environment variables

Copy `.env.example` to `.env` for local setup. For production, set these on the API host (do not commit real secrets):

| Variable | Required in production | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL URL. Must not use the `.env.example` placeholder. |
| `PORT` | No (default `4000`) | API listen port. |
| `NODE_ENV` | Yes | Must be `production`. |
| `JWT_SECRET` | Yes | ≥32 chars, unique per environment. Must not be the example placeholder. |
| `JWT_EXPIRES_IN` | No (default `7d`) | Access token lifetime. |
| `CORS_ALLOWED_ORIGINS` | Recommended | Comma-separated exact origins, e.g. `https://app.example.com`. In production only these origins are allowed (plus same-origin requests with no `Origin` header). Empty = no cross-origin browser clients. |
| `VITE_API_BASE_URL` | Build-time (frontend) | Absolute API base baked into the Vite build, e.g. `https://api.example.com`. If unset, production builds use same-origin relative paths (no localhost). Local dev defaults to `http://localhost:4000`. |
| `EMAIL_PROVIDER` | When enabling password reset | Empty/`none`/`local` is development-only. Production fails clearly until a real provider is implemented and configured. |
| `EMAIL_FROM` | With a real provider | From address. |
| `EMAIL_API_KEY` | With a real provider | Provider API key (never commit). |
| `EMAIL_RESET_BASE_URL` | When enabling password reset | Public app origin for reset links, e.g. `https://app.example.com`. Required in production. |
| `PASSWORD_RESET_DEV_FILE` | No | Dev-only override for the reset-link log file. |

### Deploy notes (no hosting changes from this repo alone)

1. Set production env vars above.
2. Run `npm ci` then `npm run build`.
3. Apply schema: `npm run prisma:migrate:deploy` (never `prisma migrate dev` in production).
4. Start API: `NODE_ENV=production npm start`.
5. Serve the Vite `dist/` output from your static host/CDN with `VITE_API_BASE_URL` pointing at the API, **or** serve same-origin behind one reverse proxy and omit `VITE_API_BASE_URL`.

### Known production scalability issue (not fixed yet)

Property images are stored in PostgreSQL as base64 **data URLs** (client-side JPEG compress + `imageUrl` validation). This works for demos but grows table size quickly under real upload volume. A future change should move images to object storage (S3/GCS/etc.) or disk with only URLs in the DB.

Maps use **Leaflet + OpenStreetMap** (no Google Maps API key).

## Demo / mock data (production safeguard)

Files under `src/data/` (`users.ts`, `properties.ts`, `bookings.ts`, `agreements.ts`) are **frontend-only** fixtures:

- Never imported by the Express API or Prisma seed scripts (there is no `prisma.seed`).
- Never bulk-inserted into PostgreSQL.
- `seedProperties` may be written to **browser localStorage only** as an offline UI fallback; the live catalog loads from `GET /api/properties`.
- `seedBookings` / `seedAgreements` are unused by runtime API contexts.
- Do not use demo emails (`@example.in`, `admin@rentify.in`) as real accounts.

## Security (API)

- **Helmet** security headers on all API responses (CSP off for pure JSON API; CORP `cross-origin` so a separate SPA origin can read responses).
- **CORS allowlist** via `CORS_ALLOWED_ORIGINS` (dev also allows `localhost` / `127.0.0.1`).
- **Auth rate limits** (production only; development/test effectively unlimited for CI):
  - `POST /api/auth/login` — 10 / 15 min per IP
  - `POST /api/auth/forgot-password` — 5 / 15 min per IP
  - `POST /api/auth/reset-password` — 5 / 15 min per IP
  - Exceeded → `429` JSON `{ "message": "Too many requests. Please try again later." }`
- No global API rate limit (avoids breaking normal browsing/search).

## Production Deployment Checklist

Use this before first production host. Never commit real secrets.

### Environment variables

| Variable | Set to |
| --- | --- |
| `VITE_API_BASE_URL` | Build-time absolute API URL (e.g. `https://api.example.com`), **or** omit if SPA is same-origin behind one proxy |
| `CORS_ALLOWED_ORIGINS` | Exact SPA origin(s), comma-separated (e.g. `https://app.example.com`) |
| `DATABASE_URL` | Real PostgreSQL connection string (not the example placeholder) |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | New random value, ≥32 characters, unique to this environment |
| `JWT_EXPIRES_IN` | e.g. `7d` (or your preferred lifetime) |
| `EMAIL_PROVIDER` | Real provider once implemented (empty/`none` = prod password reset fails clearly by design) |
| `EMAIL_FROM` | From address for reset mail |
| `EMAIL_API_KEY` | Provider key (secret; never commit) |
| `EMAIL_RESET_BASE_URL` | Public app origin, e.g. `https://app.example.com` (required in prod for reset links) |
| `PASSWORD_RESET_DEV_FILE` | Leave unset in production (dev-only override) |
| `PORT` | Optional; default `4000` |

### Build & migrate

```bash
npm ci
npm run typecheck
npm run build
npm run prisma:migrate:deploy   # NEVER prisma migrate dev in production
```

### Start

```bash
NODE_ENV=production npm start
```

### Verify after deploy

- [ ] `GET /health` → 200 with `database: "up"`
- [ ] Login / register work from the real SPA origin
- [ ] CORS: SPA origin allowed; unknown origins get no `Access-Control-Allow-Origin`
- [ ] Security headers present (e.g. `X-Content-Type-Options: nosniff`)
- [ ] Auth endpoints return `429` only after production limits are exceeded
- [ ] Password reset behaves as configured (clear 500 if email not wired)
- [ ] Listings show; 5-photo publish rule still enforced
- [ ] No demo seed rows created in production DB
