# Job Tracker

Track job applications without the spreadsheet mess. Built with Next.js 15, Supabase, and Tailwind CSS.

## Stack

- **Next.js 15** (App Router)
- **Supabase** — Postgres + Auth (magic link)
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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Add the auth redirect URL

In Supabase → **Authentication → URL Configuration**, add to Redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://your-app.vercel.app/auth/callback` (once deployed)

### 6. Run it

```bash
npm run dev
```

---

## Deploying to Vercel

Push to GitHub, import the repo on Vercel, add the three env vars in project settings (set `NEXT_PUBLIC_SITE_URL` to your production domain), deploy. Then add the production callback URL to Supabase's redirect allow-list.

---

## Features

- Passwordless email login via magic link
- Add, edit, and delete applications — company, role, date, status, job URL, notes
- Searchable and filterable table with sortable columns
- Simple dashboard with status breakdown and weekly activity
- RLS enforced — users only ever see their own data
