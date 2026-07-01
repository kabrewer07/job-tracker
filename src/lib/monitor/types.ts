// Shared types for the daily job monitor.

import type { ExtractMeta } from './extract'

export interface MonitoredSource {
  id: string
  user_id: string
  url: string
  label: string | null
  dense_listing: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export interface ExcludedKeyword {
  id: string
  user_id: string
  keyword: string
  created_at: string
}

export interface DiscoveredJob {
  id: string
  user_id: string
  source_id: string | null
  title: string
  company: string | null
  job_url: string | null
  posted_text: string | null
  posted_at: string | null
  salary: string | null
  location: string | null
  work_type: string | null
  summary: string | null
  source_label: string | null
  source_url: string | null
  also_seen_on?: string[] | null
  fingerprint: string
  discovered_at: string
  emailed_at: string | null
}

// A job as extracted from a page, before it gets a fingerprint / user_id.
export interface ExtractedJob {
  title: string
  company: string | null
  url: string | null
  postedText: string | null
  postedAt: string | null
  salary: string | null
  location: string | null
  workType: string | null
  summary: string | null
}

// Per-source outcome, surfaced in the "Run now" summary and cron logs.
export interface SourceResult {
  url: string
  label: string
  found: number // jobs the model pulled off the page
  skippedKeywords?: number
  skippedLocation?: number
  eligible?: number
  /** New rows added to the tracker this run (per source). */
  inserted?: number
  /** Already in the tracker — matched fingerprint/URL or duplicate this run. */
  merged?: number
  extraction?: ExtractMeta
  error?: string
}

export type SkippedJobReason = 'keyword' | 'location'

/** A listing extracted from a source but filtered out before save. */
export interface SkippedJob {
  title: string
  company: string | null
  location: string | null
  job_url: string | null
  source_label: string
  reason: SkippedJobReason
  /** Matched keyword or location text that caused the skip. */
  detail: string
}

export interface RunSummary {
  sourcesChecked: number
  jobsFound: number // total extracted across all sources
  skippedKeywords: number
  skippedLocation: number
  jobsEligible: number // passed keyword + location filters
  jobsInserted: number // new rows upserted this run
  jobsMerged: number // existing rows refreshed by URL match
  newJobs: number // rows included in the email digest
  emailSent: boolean
  sources: SourceResult[]
  errors: string[]
  skippedJobs: SkippedJob[]
  runId?: string
  error?: string
}

/** Persisted run log row (monitor_runs table). */
export interface MonitorRun {
  id: string
  user_id: string
  ran_at: string
  sources_checked: number
  jobs_found: number
  skipped_keywords: number
  skipped_location: number
  jobs_eligible: number
  jobs_inserted: number
  jobs_merged: number
  new_jobs: number
  email_sent: boolean
  errors: string[]
  skipped_jobs: SkippedJob[]
  sources?: SourceResult[]
}
