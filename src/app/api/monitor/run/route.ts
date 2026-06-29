import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runForUser } from '@/lib/monitor/run'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * "Run check now" button → runs the pipeline for the LOGGED-IN user only.
 * Handy for testing and for seeding the baseline (the first run discovers
 * everything currently listed, so expect a large first email — or run it once
 * and just delete/ignore that first batch).
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const summary = await runForUser(admin, user.id, user.email)
    return Response.json(summary)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Run failed.'
    return Response.json({ error: message }, { status: 500 })
  }
}
