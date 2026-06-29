import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses Row-Level Security, so it can read
 * every user's monitored sources and write discovered jobs from the cron route,
 * which runs with no logged-in user / no cookies.
 *
 * NEVER import this into client components or anything that ships to the browser.
 * It is only safe in server-only code (route handlers, server actions).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
