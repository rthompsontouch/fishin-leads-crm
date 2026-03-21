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
