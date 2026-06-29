import { createAdminClient } from '@/lib/supabase/admin'
import { runForUser } from '@/lib/monitor/run'

// Node runtime: we use the service-role client and node:crypto.
export const runtime = 'nodejs'
// Give the scrape+extract loop room. Vercel Hobby caps function duration (≈60s);
// if you monitor a lot of URLs and hit the ceiling, trim the list or move to Pro.
export const maxDuration = 60

/**
 * Triggered by Vercel Cron (an HTTP GET) on the schedule in vercel.json.
 * Vercel attaches `Authorization: Bearer ${CRON_SECRET}` automatically when
 * CRON_SECRET is set in the project's env vars — we verify it so the endpoint
 * can't be triggered by anyone else.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()

  // Distinct users who have at least one active source.
  const { data: rows, error } = await admin
    .from('monitored_sources')
    .select('user_id')
    .eq('active', true)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id as string))]
  const results: Record<string, unknown> = {}

  for (const userId of userIds) {
    try {
      const { data: userRes, error: userErr } =
        await admin.auth.admin.getUserById(userId)
      const email = userRes?.user?.email
      if (userErr || !email) {
        results[userId] = { error: 'no email for user' }
        continue
      }
      results[userId] = await runForUser(admin, userId, email)
    } catch (err) {
      results[userId] = { error: err instanceof Error ? err.message : String(err) }
    }
  }

  return Response.json({ ran: userIds.length, results })
}
