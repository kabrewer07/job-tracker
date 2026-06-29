import type { SupabaseClient } from '@supabase/supabase-js'
import { scrapeToMarkdown } from './firecrawl'
import { extractJobs } from './extract'
import { fingerprint } from './fingerprint'
import { sendDigest } from './email'
import type {
  DiscoveredJob,
  ExcludedKeyword,
  MonitoredSource,
  RunSummary,
  SourceResult,
} from './types'

/**
 * Run the full pipeline for ONE user:
 *   1. load their active sources + excluded keywords
 *   2. scrape + model-extract jobs from each source (in parallel, fault-tolerant)
 *   3. filter out excluded keywords, fingerprint, and upsert (de-dupe in DB)
 *   4. select everything not yet emailed, email it, then mark it emailed
 *
 * Step 4 keys off `emailed_at IS NULL`, so the job is idempotent: if an email send
 * fails one day, those jobs simply roll into the next run instead of being lost.
 *
 * Pass a SERVICE-ROLE client as `admin` (writes to discovered_jobs bypass RLS).
 */
export async function runForUser(
  admin: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<RunSummary> {
  const summary: RunSummary = {
    sourcesChecked: 0,
    jobsFound: 0,
    newJobs: 0,
    emailSent: false,
    sources: [],
    errors: [],
  }

  // 1. Load config
  const [{ data: sources }, { data: keywords }] = await Promise.all([
    admin
      .from('monitored_sources')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true),
    admin.from('excluded_keywords').select('*').eq('user_id', userId),
  ])

  const activeSources = (sources ?? []) as MonitoredSource[]
  const excluded = ((keywords ?? []) as ExcludedKeyword[]).map((k) =>
    k.keyword.toLowerCase()
  )
  summary.sourcesChecked = activeSources.length
  if (activeSources.length === 0) return summary

  // 2. Scrape + extract every source in parallel; one bad URL can't sink the run.
  const perSource = await Promise.all(
    activeSources.map(async (source): Promise<{ result: SourceResult; rows: NewRow[] }> => {
      const label = source.label || hostname(source.url)
      try {
        const markdown = await scrapeToMarkdown(source.url)
        const jobs = await extractJobs(markdown, source.url)

        const rows: NewRow[] = jobs
          .filter((j) => !isExcluded(j.title, excluded))
          .map((j) => ({
            user_id: userId,
            source_id: source.id,
            title: j.title,
            company: j.company,
            job_url: j.url,
            posted_text: j.postedText,
            source_label: label,
            source_url: source.url,
            fingerprint: fingerprint(j.title, j.company),
          }))

        return { result: { url: source.url, label, found: jobs.length }, rows }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          result: { url: source.url, label, found: 0, error: message },
          rows: [],
        }
      }
    })
  )

  summary.sources = perSource.map((p) => p.result)
  summary.errors = perSource.filter((p) => p.result.error).map((p) => p.result.error!)
  summary.jobsFound = perSource.reduce((n, p) => n + p.result.found, 0)

  // 3. De-dupe within this run, then upsert (ignore rows that already exist).
  const seen = new Set<string>()
  const candidates: NewRow[] = []
  for (const { rows } of perSource) {
    for (const row of rows) {
      if (seen.has(row.fingerprint)) continue
      seen.add(row.fingerprint)
      candidates.push(row)
    }
  }

  if (candidates.length > 0) {
    const { error } = await admin
      .from('discovered_jobs')
      .upsert(candidates, {
        onConflict: 'user_id,fingerprint',
        ignoreDuplicates: true, // existing jobs are left untouched (stay emailed)
      })
    if (error) summary.errors.push(`upsert: ${error.message}`)
  }

  // 4. Everything still unsent for this user (today's new + any prior failed sends).
  const { data: pending, error: pendingErr } = await admin
    .from('discovered_jobs')
    .select('*')
    .eq('user_id', userId)
    .is('emailed_at', null)
    .order('discovered_at', { ascending: false })

  if (pendingErr) {
    summary.errors.push(`select pending: ${pendingErr.message}`)
    return summary
  }

  const toEmail = (pending ?? []) as DiscoveredJob[]
  summary.newJobs = toEmail.length
  if (toEmail.length === 0) return summary

  // Send, then mark emailed. If the send throws, emailed_at stays null → retried.
  await sendDigest(userEmail, toEmail)
  const nowIso = new Date().toISOString()
  const { error: markErr } = await admin
    .from('discovered_jobs')
    .update({ emailed_at: nowIso })
    .in(
      'id',
      toEmail.map((j) => j.id)
    )
  if (markErr) summary.errors.push(`mark emailed: ${markErr.message}`)

  summary.emailSent = true
  return summary
}

type NewRow = {
  user_id: string
  source_id: string
  title: string
  company: string | null
  job_url: string | null
  posted_text: string | null
  source_label: string
  source_url: string
  fingerprint: string
}

function isExcluded(title: string, excluded: string[]): boolean {
  const t = title.toLowerCase()
  return excluded.some((kw) => kw && t.includes(kw))
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
