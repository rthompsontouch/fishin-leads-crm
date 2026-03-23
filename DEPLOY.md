# Deploying Fishin Leads CRM (e.g. Vercel)

The CRM is a **static Vite SPA**. Supabase hosts **Auth, Postgres, Storage**, and **Edge Functions** — not Vercel.

---

## Vercel — environment variables

Add these in **Vercel → Project → Settings → Environment Variables** (Production + Preview as needed).

### Required

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase project URL (Dashboard → API). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Browser-safe key (Dashboard → API). Never use the **secret** key here. |

### Strongly recommended (production)

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_SITE_URL` | `https://your-crm.vercel.app` | **No trailing slash.** Used for password-reset and other redirects so links land on your real domain, not localhost. |

### Optional — you can skip this

| Variable | When to use |
|----------|-------------|
| `VITE_WEBSITE_LEAD_CAPTURE_URL` | **Almost never.** Only if the webhook URL shown in the CRM must differ from the default (see below). |

**Default webhook URL** (integrations / onboarding — “paste this URL on your site”):

```text
{VITE_SUPABASE_URL}/functions/v1/website-lead-capture
```

Example: if `VITE_SUPABASE_URL=https://abc.supabase.co`, the webhook is:

`https://abc.supabase.co/functions/v1/website-lead-capture`

That hits your **Supabase Edge Function** (`website-lead-capture`). You do **not** need a Vercel URL for that.

Set `VITE_WEBSITE_LEAD_CAPTURE_URL` only if you:

- Put a **reverse proxy** in front of the function with a different URL, or  
- Need to **hardcode** a different public URL for some other reason.

If you leave it unset, the app builds the URL from `VITE_SUPABASE_URL` — **this is the normal MVP setup.**

---

## What stays in Supabase (not Vercel)

| Item | Where |
|------|--------|
| `website-lead-capture` Edge Function | Deploy with `supabase functions deploy website-lead-capture` |
| Secrets (`SUPABASE_SERVICE_ROLE_KEY`, Upstash, etc.) | **Supabase Dashboard → Edge Functions → Secrets** |
| Rate limiting (Redis) | Upstash secrets on the function — **not** in Vercel |

---

## Supabase Auth (production)

In **Supabase → Authentication → URL configuration**:

- **Site URL**: your production CRM origin, e.g. `https://your-crm.vercel.app`
- **Redirect URLs**: include at least:
  - `https://your-crm.vercel.app/auth/update-password`
  - `http://localhost:5173/auth/update-password` (optional, for local dev)

---

## After changing env vars on Vercel

Redeploy (or trigger a new build) so `import.meta.env` picks up the new values — Vite bakes them in at **build** time.

---

## More detail

- Full Supabase setup: [`SUPABASE.md`](./SUPABASE.md)
- Local env template: [`.env.example`](./.env.example)

---

## Marketing site (separate repo / Vercel project)

So successful signups redirect to **this** CRM app, set on the **marketing** project:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_CRM_APP_URL` | `https://your-crm.vercel.app` (same origin as this app’s `VITE_SITE_URL`; **no** trailing slash) |

Redirects to `{NEXT_PUBLIC_CRM_APP_URL}/login?email=...`. See `fishin_leads_marketing/.env.example` and README.
