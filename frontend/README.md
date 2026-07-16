# Mindstores Frontend

Vue 3 and Vuetify storefront and administration interface.

## Structure

- `src/pages/` contains route-level views.
- `src/components/` contains shared interface components.
- `src/stores/` contains Pinia application and cart state.
- `src/utils/` contains API, catalog, authentication, image, and invoice services.
- `src/plugins/` registers Vue, Firebase, Pinia, and Vuetify integrations.
- `api/index.js` is the Vercel same-origin backend proxy.

## Local development

```powershell
pnpm install
pnpm run dev
```

The Vite server defaults to `http://localhost:3000`. Set `VITE_API_URL` in `.env.development` when the backend runs on a different URL. Copy `.env.example` to `.env` for Firebase client configuration.

## Validation

```powershell
pnpm run lint
pnpm run build
```

`pnpm run lint` is intentionally read-only and must pass before committing. Production requests use the same-origin `/api` proxy; local development defaults to `http://localhost:8000`.
