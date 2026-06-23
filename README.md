# Job Tracker

Track job applications without the spreadsheet mess. Built with Next.js 15, Supabase, and Tailwind CSS.

## Stack

- **Next.js 15** (App Router)
- **Supabase** — Postgres + Auth (Google OAuth, email/password)
- **Tailwind CSS** — custom palette, no component library
- **Vercel** — deployment target

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd job-tracker
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, then grab your keys from **Settings → API**.

### 3. Run the migration

Open the **SQL Editor** in the Supabase dashboard and paste in `supabase/migrations/0001_initial.sql`. This is the only migration needed for a fresh project — it creates the `applications` table (including the `saved` / “Not applied yet” status and optional apply date), indexes, RLS policies, grants, and the `updated_at` trigger.

<details>
<summary>Already ran an older version of 0001?</summary>

If your schema still requires `date_applied` and lacks the `saved` status, run this once in the SQL editor:

```sql
alter table public.applications alter column date_applied drop not null;
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected'));
alter table public.applications alter column status set default 'saved';
```

</details>

### 4. Environment variables

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3100
```

### 5. Configure auth in Supabase

**Redirect URLs** — Supabase → **Authentication → URL Configuration**:

- `http://localhost:3100/auth/callback`
- `https://your-app.vercel.app/auth/callback` (production — use your exact Vercel or custom domain)
- Optional for preview deploys: `https://*.vercel.app/auth/callback`

**Site URL** (same page) — set this to your **production** URL (e.g. `https://your-app.vercel.app`), **not** localhost. If Site URL is still `http://localhost:3100`, Supabase will send users there whenever a redirect isn’t fully allowed — a common cause of “OAuth works on Google but I land on localhost” on Vercel.

**Email/password** — **Authentication → Providers → Email**:

- Enable Email provider
- Enable sign ups
- Optional: disable "Confirm email" for simpler local dev (otherwise new users must confirm before signing in)

**Google OAuth** — **Authentication → Providers → Google**:

1. Enable Google
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/) (Web application)
3. Add authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Paste the Client ID and Client Secret into Supabase

### 6. Run it

```bash
npm run dev
```

---

## Deploying to Vercel

Push to GitHub, import the repo on Vercel, add env vars in project settings, deploy. Then add the production callback URL to Supabase's redirect allow-list (see step 5).

**Vercel env vars (Production):**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
OPENAI_API_KEY=sk-...
```

Do **not** set `NEXT_PUBLIC_SITE_URL` to `localhost` on Production. Redeploy after changing env vars.

### OAuth redirects to localhost on Vercel?

The Google OAuth screen always shows Supabase’s callback (`*.supabase.co/auth/v1/callback`) — that’s normal. Your app URL is passed separately as `redirectTo`.

If you end up on localhost after signing in:

1. **Supabase → Authentication → URL Configuration → Site URL** — must be your Vercel URL, not `http://localhost:3100`
2. **Redirect URLs** — must include `https://your-exact-vercel-domain.vercel.app/auth/callback` (or `https://*.vercel.app/auth/callback` for previews)
3. **Vercel → Environment Variables** — `NEXT_PUBLIC_SITE_URL` should match production (not localhost)
4. **Redeploy** on Vercel after env changes

The app builds OAuth `redirectTo` from `window.location.origin` on the page you’re on, so if you’re on Vercel, it requests a Vercel callback. Supabase only honors that if it’s on the allow list; otherwise it falls back to **Site URL** (often localhost from initial setup).

---

## Features

- Sign in with Google or email/password
- Add, edit, and delete applications — company, role, date, status, job URL, notes
- Searchable and filterable table with sortable columns
- Simple dashboard with status breakdown and weekly activity
- RLS enforced — users only ever see their own data
