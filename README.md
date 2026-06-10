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

Open the **SQL Editor** in the Supabase dashboard and paste in `supabase/migrations/0001_initial.sql`. This sets up the table, indexes, RLS policies, and the `updated_at` trigger.

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
- `https://your-app.vercel.app/auth/callback` (once deployed)

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

Push to GitHub, import the repo on Vercel, add the three env vars in project settings (set `NEXT_PUBLIC_SITE_URL` to your production domain), deploy. Then add the production callback URL to Supabase's redirect allow-list.

---

## Features

- Sign in with Google or email/password
- Add, edit, and delete applications — company, role, date, status, job URL, notes
- Searchable and filterable table with sortable columns
- Simple dashboard with status breakdown and weekly activity
- RLS enforced — users only ever see their own data
