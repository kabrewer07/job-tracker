import type { SupabaseClient } from '@supabase/supabase-js'
import { enrichMissingSummaries } from './enrich-summary'
import { scrapeToMarkdown } from './firecrawl'
import { extractJobs, type ExtractJobsResult } from './extract'
import { fetchIdealistJobs, isIdealistSearchUrl } from './idealist'
import { fingerprint } from './fingerprint'
import { sendDigest } from './email'
import { mergeSourceLists } from './job-sources'
import { normalizeJobUrl } from './map-to-application'
import { isUsEligibleLocation } from './us-filter'
import type {
  DiscoveredJob,
  ExcludedKeyword,
  MonitoredSource,
  RunSummary,
  SkippedJob,
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
    skippedKeywords: 0,
    skippedLocation: 0,
    jobsEligible: 0,
    jobsInserted: 0,
    jobsMerged: 0,
    newJobs: 0,
    emailSent: false,
    sources: [],
    errors: [],
    skippedJobs: [],
  }

  const skippedJobs: SkippedJob[] = []

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
  if (activeSources.length === 0) {
    return finishRun(admin, userId, summary, skippedJobs)
  }

  // 2. Scrape + extract every source in parallel; one bad URL can't sink the run.
  const perSource = await Promise.all(
    activeSources.map(async (source): Promise<{ result: SourceResult; rows: NewRow[] }> => {
      const label = source.label || hostname(source.url)
      try {
        const { jobs, extraction } = await loadJobsFromSource(source)

        const rows: NewRow[] = []
        let skippedKeywords = 0
        let skippedLocation = 0

        for (const j of jobs) {
          const keyword = getMatchingKeyword(j.title, excluded)
          if (keyword) {
            skippedKeywords++
            skippedJobs.push({
              title: j.title,
              company: j.company,
              location: j.location,
              job_url: j.url,
              source_label: label,
              reason: 'keyword',
              detail: keyword,
            })
            continue
          }
          if (!isUsEligibleLocation(j.location)) {
            skippedLocation++
            skippedJobs.push({
              title: j.title,
              company: j.company,
              location: j.location,
              job_url: j.url,
              source_label: label,
              reason: 'location',
              detail: j.location?.trim() || 'unknown location',
            })
            continue
          }
          rows.push({
            user_id: userId,
            source_id: source.id,
            title: j.title,
            company: j.company,
            job_url: j.url,
            posted_text: j.postedText,
            posted_at: j.postedAt,
            salary: j.salary,
            location: j.location,
            work_type: j.workType,
            summary: j.summary,
            source_label: label,
            source_url: source.url,
            also_seen_on: [],
            fingerprint: fingerprint(j.title, j.company),
          })
        }

        return {
          result: {
            url: source.url,
            label,
            found: jobs.length,
            skippedKeywords,
            skippedLocation,
            eligible: rows.length,
            extraction,
          },
          rows,
        }
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
  summary.skippedKeywords = perSource.reduce(
    (n, p) => n + (p.result.skippedKeywords ?? 0),
    0
  )
  summary.skippedLocation = perSource.reduce(
    (n, p) => n + (p.result.skippedLocation ?? 0),
    0
  )

  const existingIndex = await loadExistingJobIndex(admin, userId)
  applyPerSourceDbCounts(perSource, existingIndex.keys)

  // 3. De-dupe within this run — merge jobs seen on multiple sources.
  const byFingerprint = new Map<string, NewRow>()
  const byUrl = new Map<string, NewRow>()

  for (const { rows } of perSource) {
    for (const row of rows) {
      const incoming: NewRow = { ...row, also_seen_on: [] }
      const existing = findRunCandidate(byFingerprint, byUrl, incoming)

      if (existing) {
        mergeRunCandidate(existing, incoming)
        registerRunCandidate(byFingerprint, byUrl, existing)
        continue
      }

      registerRunCandidate(byFingerprint, byUrl, incoming)
    }
  }

  const candidates = uniqueRunCandidates(byFingerprint)

  summary.jobsEligible = candidates.length

  // Listing pages often lack description text — fetch summaries from job URLs.
  try {
    await enrichMissingSummaries(candidates)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    summary.errors.push(`enrich summaries: ${message}`)
  }

  const { toInsert, merged } = await mergeExistingJobs(admin, candidates, existingIndex)

  summary.jobsMerged = merged

  if (toInsert.length > 0) {
    const { error } = await admin.from('discovered_jobs').upsert(toInsert, {
      onConflict: 'user_id,fingerprint',
      ignoreDuplicates: true,
    })
    if (error) summary.errors.push(`upsert: ${error.message}`)
  }

  summary.jobsInserted = toInsert.length

  // Backfill summaries on older rows still missing one (capped per run).
  try {
    await backfillMissingSummaries(admin, userId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    summary.errors.push(`backfill summaries: ${message}`)
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
    return finishRun(admin, userId, summary, skippedJobs)
  }

  const toEmail = (pending ?? []) as DiscoveredJob[]
  summary.newJobs = toEmail.length
  if (toEmail.length === 0) {
    return finishRun(admin, userId, summary, skippedJobs)
  }

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
  return finishRun(admin, userId, summary, skippedJobs)
}

type NewRow = {
  user_id: string
  source_id: string
  title: string
  company: string | null
  job_url: string | null
  posted_text: string | null
  posted_at: string | null
  salary: string | null
  location: string | null
  work_type: string | null
  summary: string | null
  source_label: string
  source_url: string
  also_seen_on: string[]
  fingerprint: string
}

function findRunCandidate(
  byFingerprint: Map<string, NewRow>,
  byUrl: Map<string, NewRow>,
  row: NewRow
): NewRow | undefined {
  if (row.job_url?.trim()) {
    const byUrlHit = byUrl.get(normalizeJobUrl(row.job_url))
    if (byUrlHit) return byUrlHit
  }
  return byFingerprint.get(row.fingerprint)
}

function registerRunCandidate(
  byFingerprint: Map<string, NewRow>,
  byUrl: Map<string, NewRow>,
  row: NewRow
): void {
  byFingerprint.set(row.fingerprint, row)
  if (row.job_url?.trim()) {
    byUrl.set(normalizeJobUrl(row.job_url), row)
  }
}

function mergeRunCandidate(existing: NewRow, incoming: NewRow): void {
  const merged = mergeSourceLists(
    existing.source_label,
    existing.also_seen_on,
    incoming.source_label,
    ...incoming.also_seen_on
  )
  existing.source_label = merged.source_label ?? existing.source_label
  existing.also_seen_on = merged.also_seen_on
}

function uniqueRunCandidates(byFingerprint: Map<string, NewRow>): NewRow[] {
  return [...new Set(byFingerprint.values())]
}

function getMatchingKeyword(title: string, excluded: string[]): string | null {
  const t = title.toLowerCase()
  for (const kw of excluded) {
    if (kw && t.includes(kw)) return kw
  }
  return null
}

async function finishRun(
  admin: SupabaseClient,
  userId: string,
  summary: RunSummary,
  skippedJobs: SkippedJob[]
): Promise<RunSummary> {
  summary.skippedJobs = skippedJobs

  const { data, error } = await admin
    .from('monitor_runs')
    .insert({
      user_id: userId,
      sources_checked: summary.sourcesChecked,
      jobs_found: summary.jobsFound,
      skipped_keywords: summary.skippedKeywords,
      skipped_location: summary.skippedLocation,
      jobs_eligible: summary.jobsEligible,
      jobs_inserted: summary.jobsInserted,
      jobs_merged: summary.jobsMerged,
      new_jobs: summary.newJobs,
      email_sent: summary.emailSent,
      errors: summary.errors,
      skipped_jobs: skippedJobs,
      sources: summary.sources,
    })
    .select('id')
    .single()

  if (error) {
    summary.errors.push(`save run log: ${error.message}`)
  } else if (data?.id) {
    summary.runId = data.id as string
  }

  return summary
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

type ExistingJobKeys = {
  fingerprints: Set<string>
  urls: Set<string>
}

type ExistingJobIndex = {
  keys: ExistingJobKeys
  byUrl: Map<string, string>
  byFingerprint: Map<string, string>
  existingById: Map<
    string,
    { source_label: string | null; also_seen_on: string[] | null }
  >
}

async function loadExistingJobIndex(
  admin: SupabaseClient,
  userId: string
): Promise<ExistingJobIndex> {
  const { data: existing, error } = await admin
    .from('discovered_jobs')
    .select('id, job_url, fingerprint, source_label, also_seen_on')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  const keys: ExistingJobKeys = { fingerprints: new Set(), urls: new Set() }
  const byUrl = new Map<string, string>()
  const byFingerprint = new Map<string, string>()
  const existingById = new Map<
    string,
    { source_label: string | null; also_seen_on: string[] | null }
  >()

  for (const row of existing ?? []) {
    const id = row.id as string
    const fp = row.fingerprint as string
    byFingerprint.set(fp, id)
    keys.fingerprints.add(fp)
    existingById.set(id, {
      source_label: row.source_label as string | null,
      also_seen_on: (row.also_seen_on as string[] | null) ?? [],
    })
    if (row.job_url && typeof row.job_url === 'string') {
      const urlKey = normalizeJobUrl(row.job_url)
      byUrl.set(urlKey, id)
      keys.urls.add(urlKey)
    }
  }

  return { keys, byUrl, byFingerprint, existingById }
}

/** Count new vs already-tracked jobs per source before run-level dedupe. */
function applyPerSourceDbCounts(
  perSource: { result: SourceResult; rows: NewRow[] }[],
  existing: ExistingJobKeys
): void {
  const addedFingerprints = new Set<string>()
  const addedUrls = new Set<string>()

  for (const { result, rows } of perSource) {
    let inserted = 0
    let merged = 0

    for (const row of rows) {
      if (isAlreadyTracked(row, existing, addedFingerprints, addedUrls)) {
        merged++
        continue
      }

      inserted++
      addedFingerprints.add(row.fingerprint)
      if (row.job_url?.trim()) {
        addedUrls.add(normalizeJobUrl(row.job_url))
      }
    }

    result.inserted = inserted
    result.merged = merged
  }
}

function isAlreadyTracked(
  row: NewRow,
  existing: ExistingJobKeys,
  addedFingerprints: Set<string>,
  addedUrls: Set<string>
): boolean {
  if (
    existing.fingerprints.has(row.fingerprint) ||
    addedFingerprints.has(row.fingerprint)
  ) {
    return true
  }

  if (row.job_url?.trim()) {
    const urlKey = normalizeJobUrl(row.job_url)
    if (existing.urls.has(urlKey) || addedUrls.has(urlKey)) return true
  }

  return false
}

/**
 * Insert new jobs and refresh metadata on rows that already exist (by fingerprint
 * or posting URL). emailed_at and discovered_at are never changed.
 */
async function mergeExistingJobs(
  admin: SupabaseClient,
  candidates: NewRow[],
  index: ExistingJobIndex
): Promise<{ toInsert: NewRow[]; merged: number }> {
  const toInsert: NewRow[] = []
  let merged = 0

  for (const row of candidates) {
    const fingerprintId = index.byFingerprint.get(row.fingerprint)
    if (fingerprintId) {
      await updateDiscoveredJobMetadata(admin, index, fingerprintId, row)
      merged++
      continue
    }

    if (row.job_url?.trim()) {
      const urlId = index.byUrl.get(normalizeJobUrl(row.job_url))
      if (urlId) {
        await updateDiscoveredJobMetadata(admin, index, urlId, row)
        merged++
        continue
      }
    }

    toInsert.push(row)
  }

  return { toInsert, merged }
}

async function updateDiscoveredJobMetadata(
  admin: SupabaseClient,
  index: ExistingJobIndex,
  id: string,
  row: NewRow
): Promise<void> {
  const existingSources = index.existingById.get(id)
  const mergedSources = mergeSourceLists(
    existingSources?.source_label ?? row.source_label,
    existingSources?.also_seen_on,
    row.source_label,
    ...row.also_seen_on
  )

  const { error: updateErr } = await admin
    .from('discovered_jobs')
    .update({
      title: row.title,
      company: row.company,
      posted_text: row.posted_text,
      posted_at: row.posted_at,
      salary: row.salary,
      location: row.location,
      work_type: row.work_type,
      summary: row.summary,
      source_label: mergedSources.source_label,
      also_seen_on: mergedSources.also_seen_on,
      source_url: row.source_url,
      source_id: row.source_id,
    })
    .eq('id', id)

  if (updateErr) {
    throw new Error(`merge job metadata: ${updateErr.message}`)
  }
}

/** Fill summaries on existing DB rows that still have null summary. */
async function backfillMissingSummaries(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await admin
    .from('discovered_jobs')
    .select('id, job_url, title, summary')
    .eq('user_id', userId)
    .is('summary', null)
    .not('job_url', 'is', null)
    .limit(25)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as {
    id: string
    job_url: string
    title: string
    summary: string | null
  }[]

  if (rows.length === 0) return

  await enrichMissingSummaries(rows, { max: 25 })

  for (const row of rows) {
    if (!row.summary?.trim()) continue
    const { error: updateErr } = await admin
      .from('discovered_jobs')
      .update({ summary: row.summary })
      .eq('id', row.id)
    if (updateErr) throw new Error(updateErr.message)
  }
}

async function loadJobsFromSource(source: MonitoredSource): Promise<ExtractJobsResult> {
  if (isIdealistSearchUrl(source.url)) {
    return fetchIdealistJobs(source.url)
  }
  const markdown = await scrapeToMarkdown(source.url)
  return extractJobs(markdown, source.url, { denseListing: source.dense_listing })
}
