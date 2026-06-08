# Suuper — Setup Guide

## 1. Supabase Project

1. Create a new project at https://supabase.com
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Run Migrations

In the Supabase dashboard → **SQL Editor**, run each file in order:

```
supabase/migrations/001_enable_pgvector.sql
supabase/migrations/002_supermarkets.sql
supabase/migrations/003_products.sql
supabase/migrations/004_price_history.sql
supabase/migrations/005_product_matches.sql
supabase/migrations/006_scrape_jobs.sql
supabase/migrations/007_users.sql
supabase/migrations/008_match_products_rpc.sql
```

Or with the Supabase CLI:
```bash
supabase db push
```

## 3. Create Admin User

1. In Supabase dashboard → **Authentication → Users** → **Invite user**
2. Enter your admin email and set a password
3. After the user is created, run this in the SQL Editor:

```sql
UPDATE public.users
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

## 4. Generate a Scraper Secret

Generate a random secret (used to authenticate the Vercel admin panel → Railway):

```bash
openssl rand -hex 32
```

Use the same value for:
- `SCRAPER_API_SECRET` on Railway
- `NEXT_PUBLIC_SCRAPER_API_SECRET` on Vercel

## 5. Next.js (Vercel)

1. Deploy to Vercel (connect GitHub repo or `vercel deploy`)
2. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SCRAPER_API_URL` ← Railway URL from step 5

## 6. Scraper Service (Railway)

1. Create a new Railway project, add the `scraper/` directory as the service root
2. Set environment variables in Railway dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `PORT=3001`
   - `TZ=America/Costa_Rica`
3. Railway auto-deploys on push; `railway.toml` handles the build + Playwright install
4. Copy the Railway public URL → set as `NEXT_PUBLIC_SCRAPER_API_URL` in Vercel

## 7. First Scrape

Hit the admin panel at `/admin/jobs` and click **Run All**, or:

```bash
curl -X POST https://your-railway-url.up.railway.app/jobs/run/pali \
  -H "x-api-secret: your-random-secret-here"
```

After the first run, visit `/admin/matches` to confirm cross-store product matches.
