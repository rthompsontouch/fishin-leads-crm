# Exactly what to do (Supabase + this CRM)

Supabase’s **“connection string”** prompt is for **Postgres (port 5432)**.  
Your **Vite + React app in the browser** does **not** use that string. It uses the **HTTP API** with **Project URL + anon key** (Dashboard → **API**).

---

## Step 0 — Fix your env file name (Vite)

1. In `fishin-leads-crm/`, rename **`.ENV`** → **`.env`** (lowercase).  
   Vite reads `.env` by default.

---

## Step 1 — Connect the **CRM app** (browser-safe)

These are **not** the Postgres URI Supabase showed in “Code”.

1. Open Supabase Dashboard → your project.
2. Go to **Project Settings** (gear) → **API** (or **API Keys**).
3. Copy **exactly**:
   - **Project URL** → put in `.env` as `VITE_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_...`) → put in `.env` as `VITE_SUPABASE_PUBLISHABLE_KEY`  
     - **Do not** put the **Secret** key (`sb_secret_...`) in the frontend — it bypasses RLS.
   - If you only see **legacy** keys: use **anon** as `VITE_SUPABASE_ANON_KEY` (still supported by our client).
4. Save `.env`.
5. From `fishin-leads-crm/` run:

   ```bash
   npm run dev
   ```

Your code uses `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy `VITE_SUPABASE_ANON_KEY`) — see `src/lib/supabaseClient.ts`.

---

## Step 2 — Apply **database** migrations (uses DB password / CLI)

The **Postgres connection string** is for this kind of thing:

`postgresql://postgres:[YOUR-PASSWORD]@db.bwbsxgjvuxuedejxusnv.supabase.co:5432/postgres`

1. In Dashboard → **Project Settings** → **Database**, find your **database password** (set or reset if needed). That replaces `[YOUR-PASSWORD]` in the URI (never commit it).
2. On your PC, in `fishin-leads-crm/`:

   ```bash
   supabase login
   ```

   (Or: `supabase login --token YOUR_ACCESS_TOKEN` from **Account → Access Tokens**.)

3. Link the folder to your project (uses **DB password** when prompted):

   ```bash
   supabase link --project-ref bwbsxgjvuxuedejxusnv
   ```

4. Push our SQL migration:

   ```bash
   supabase db push
   ```

**Project ref** `bwbsxgjvuxuedejxusnv` comes from your host  
`db.bwbsxgjvuxuedejxusnv.supabase.co`.

---

## If you want “one URI” for CLI only (advanced)

You can put this in **`.env`** (not `VITE_*`) on your machine **only** — still never use it from React:

```bash
DIRECT_POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@db.bwbsxgjvuxuedejxusnv.supabase.co:5432/postgres
```

Then (PowerShell example):

```powershell
supabase db push --db-url $env:DIRECT_POSTGRES_URL
```

(Password must be URL-encoded if it has special characters.)

---

## Quick reference

| What Supabase gave you | Use it for |
|------------------------|------------|
| `postgresql://postgres:...@db....:5432/postgres` | CLI, SQL clients, server backends |
| Project URL + **anon** key (API page) | **This Vite CRM** (`VITE_SUPABASE_*`) |

---

## Service images (private bucket)

- Bucket: **`service-images`** (private — not public URLs).
- Object path: **`{owner_id}/{service_id}/{uuid}-{sanitized_filename}`** (see `src/lib/serviceImageStorage.ts`).
- **RLS** on `storage.objects` is defined in migrations (first folder = `auth.uid()`, uploads must reference a **service_entries** row you own).
- The app uses **signed URLs** (~1 hour) to display images.
- On **service entry delete**, the client removes Storage objects first, then deletes the row (`service_attachments` cascade off `service_entries`).
- **DB safety net:** migration `20260325100000_db_storage_foundation_rls_triggers_cleanup.sql` adds an **AFTER DELETE** trigger on `service_attachments` that deletes the file from `storage.objects` if a row is removed without going through the client (e.g. cascade).

Apply new policies after pulling:

`supabase db push`

---

## Database + storage foundation (RLS, triggers, cleanup)

Migration: **`supabase/migrations/20260325100000_db_storage_foundation_rls_triggers_cleanup.sql`**

| Piece | What it does |
|-------|----------------|
| **RLS** | Adds **`profiles_delete_own`** so a user can delete their own `profiles` row (account flows). |
| **Indexes** | **`UNIQUE (api_key_hash)`** on `integrations` — required for safe key lookup; matches edge function behavior. |
| **Triggers** | **`lead_notes` / `customer_notes`**: `last_contacted_at` updates on **INSERT or UPDATE** (not only insert). |
| **Storage cleanup** | **`profiles`**: after **UPDATE** when `company_logo_path` changes, or **DELETE**, removes the old object from **`company-logos`**. **`service_attachments`**: after **DELETE**, removes the object from the bucket named in the row (usually **`service-images`**). Functions are **SECURITY DEFINER** and are not callable by `anon` / `authenticated` (triggers only). |

**If `supabase db push` fails** on the unique index, you may have duplicate `api_key_hash` values. Inspect with:

```sql
select api_key_hash, count(*) as n
from public.integrations
group by 1
having count(*) > 1;
```

Resolve duplicates (keep one row per hash), then push again.

---

## Edge Function: `website-lead-capture` (marketing site → leads)

Public POST endpoint that accepts JSON + `x-api-key` header, hashes the key, looks up `integrations.api_key_hash`, and inserts a row into `leads`.

### Where Redis / env vars go (quick)

| Place | What you put there |
|-------|---------------------|
| **CRM `.env` (Vite, on your PC)** | `VITE_SUPABASE_URL`, publishable key, optional `VITE_SITE_URL`, optional `VITE_WEBSITE_LEAD_CAPTURE_URL`. **No** Redis vars here — the browser never talks to Redis. |
| **Supabase → Edge Functions → Secrets** | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` **only if** you want rate limiting on `website-lead-capture`. Same place as `SUPABASE_SERVICE_ROLE_KEY` if you deploy the function with the CLI. |

**Setup:** [Upstash Console](https://console.upstash.com/) → create a Redis database → copy **REST URL** and **REST TOKEN** (not the TCP connection string) → Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets** → add both keys. Redeploy `website-lead-capture` after adding secrets. **Optional:** skip Upstash entirely; the function still accepts leads, just without rate limits.

### Secrets (Supabase Dashboard → **Edge Functions** → **Secrets**)

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Usually injected automatically |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (inserts leads; never expose to browsers) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

If `UPSTASH_*` are **not** set, the function still works but **skips** rate limiting (logs a warning). If Redis errors during limit checks, the function **fails open** so outages don’t block leads.

Create a Redis database in [Upstash](https://console.upstash.com/) (global is fine), then paste **REST URL** and **REST TOKEN** into Edge secrets. See also: [Rate limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting).

### CRM env (webhook URL in UI)

- Default webhook URL: `{VITE_SUPABASE_URL}/functions/v1/website-lead-capture` (Supabase Edge Function — **not** your Vercel domain).
- Optional override: `VITE_WEBSITE_LEAD_CAPTURE_URL` — **omit in most deployments**; only if you proxy the function or need a different public URL. See **[`DEPLOY.md`](./DEPLOY.md)**.

---

## First-run onboarding (CRM)

### Add `onboarding_completed_at` column (required)

If the app errors with **“could not find the onboarding_completed_at column”**, the migration hasn’t been applied to your **hosted** database yet.

**Option A — Supabase Dashboard (fastest)**  
1. **SQL** → **New query**  
2. Paste and run:

```sql
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz null;

comment on column public.profiles.onboarding_completed_at is
  'Set when the user finishes in-app onboarding (profile, integration, sample lead).';
```

**Option B — CLI** (from `fishin-leads-crm/` after `supabase link`):

```bash
supabase db push
```

That applies `supabase/migrations/20260324120000_profiles_onboarding_completed_at.sql` (same as the SQL above).

---

New accounts get `profiles.onboarding_completed_at = null` and are redirected to **`/onboarding`** until they finish the wizard (profile → integration → sample lead). The route **`/onboarding`** is **not** wrapped by `OnboardingGate` so users aren’t stuck in a redirect loop.

**Existing users** (after the column exists): either complete onboarding once, or run SQL once to skip it for everyone already live:

```sql
update public.profiles
set onboarding_completed_at = now()
where onboarding_completed_at is null;
```

(Adjust with a `created_at` filter if you only want to backfill old accounts.)

---

## Auth (CRM sign-in only — no sign-up here)

Accounts are created on your **marketing site** / signup flow. This app only has:

- **Sign in** — `/login`
- **Forgot password** — `/forgot-password` (sends Supabase “reset password” email)
- **Set new password** — `/auth/update-password` (user lands here from the email link)

### Environment

Add to `.env` for **production** (and optional for local):

```bash
# Public origin of this CRM (no trailing slash). Used in password-reset email links.
# Local dev: omit to use http://localhost:5173 automatically.
VITE_SITE_URL=https://your-crm-domain.com
```

### Supabase Dashboard

1. **Authentication → URL configuration**
   - **Site URL**: your production CRM origin, e.g. `https://your-crm-domain.com`
   - **Redirect URLs**: include at least:
     - `https://your-crm-domain.com/auth/update-password`
     - `http://localhost:5173/auth/update-password` (dev)

2. **Email confirmations** (if you require confirmed email before login):  
   **Authentication → Providers → Email** — enable **Confirm email** as needed for users created via your marketing signup / Admin API.

3. **Auth emails via Resend (SMTP)**  
   Supabase sends password reset and confirmation emails. To use **Resend**:

   - In Resend: create an API key / SMTP credentials (see [Resend SMTP](https://resend.com/docs/send-with-supabase-smtp)).
   - In Supabase: **Project Settings → Auth → SMTP Settings** — enable custom SMTP and paste Resend’s host, port, user, password.

   Product/marketing emails (e.g. newsletters, “you have new leads”) are **separate**: send those from **Edge Functions** or a backend using the **Resend HTTP API**, not the CRM SPA (no secret keys in the browser).

---
## Web Push notifications (new-lead alerts)

This CRM supports real Web Push notifications (works when the app is open or closed), via:
- browser service worker: `public/sw.js`
- subscription storage table: `public.notification_subscriptions`
- lead event queue: `public.lead_push_events` (trigger enqueues on `leads` INSERT)
- Edge Function sender: `supabase/functions/lead-webpush`

### 1) Generate VAPID keys (once)
On your PC:
```bash
deno run https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts
```
Copy the output JSON and save it for the next step.

### 2) Set Edge Secrets (Supabase Dashboard)
Supabase → **Edge Functions** → **Secrets**:
1. `VAPID_KEYS_JSON` = the stringified JSON from the generate-vapid-keys command
2. `VAPID_CONTACT_EMAIL` = your email (e.g. `you@yourcompany.com`)

### 3) Deploy the edge function
From the repo folder:
```bash
supabase functions deploy lead-webpush
```

The function returns **CORS** headers and handles **OPTIONS** preflight so the Settings **Send test notification** button works from a custom domain (e.g. Vercel). Redeploy after changing the function.
`lead-webpush` is configured with `verify_jwt = false` in `supabase/config.toml` so Database Webhooks can invoke it without end-user JWT auth.

### 4) Create a Database Webhook (manual dashboard step)
Supabase Dashboard → **Database** → **Webhooks** (or **Integrations → Webhooks**, depending on UI):
1. Table: `public.lead_push_events`
2. Event: `INSERT`
3. Edge Function: `lead-webpush` (POST)

### 5) Enable notifications in the app
After login, go to `Settings` and click **Enable notifications**.

Notes:
- Web Push requires a secure origin (HTTPS, or `localhost` for testing).

### Job reminder dispatch (upcoming service dates)
This repo includes `supabase/functions/job-reminder-webpush` which:
1. scans `jobs` where `status='Scheduled'`, `reminder_at <= now()`, and `reminder_sent_at is null`
2. sends Web Push notifications to the job owner subscriptions
3. marks sent reminders by setting `reminder_sent_at`

Deploy it:
```bash
supabase functions deploy job-reminder-webpush
```

For immediate testing, use **Settings → Security → Run reminder dispatch now**.
For production automation, schedule this function in Supabase Dashboard (Cron) to run every 5-15 minutes.
