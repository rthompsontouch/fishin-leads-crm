# Fishin Leads CRM

React + TypeScript + Vite CRM for leads, customers, integrations (website lead capture), and onboarding.

## Quick start (local)

```bash
npm install
cp .env.example .env
# Edit .env: VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

See **[`SUPABASE.md`](./SUPABASE.md)** for linking the project, migrations (`supabase db push`), and Auth URLs.

## Deploy (Vercel)

See **[`DEPLOY.md`](./DEPLOY.md)** for required env vars, what **not** to put in Vercel, and why **`VITE_WEBSITE_LEAD_CAPTURE_URL` is optional** (default webhook URL is derived from `VITE_SUPABASE_URL`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Project layout (high level)

- `src/app/` — shell / navigation  
- `src/features/` — API + feature modules (account, leads, integrations, …)  
- `src/pages/` — route screens  
- `supabase/migrations/` — database + storage SQL  
- `supabase/functions/website-lead-capture/` — public lead ingestion Edge Function  

---

*Original Vite template notes were replaced by this project README.*
