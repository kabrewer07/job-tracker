// Shared types for the daily job monitor.

export interface MonitoredSource {
  id: string
  user_id: string
  url: string
  label: string | null
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
  source_label: string | null
  source_url: string | null
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
}

// Per-source outcome, surfaced in the "Run now" summary and cron logs.
export interface SourceResult {
  url: string
  label: string
  found: number // jobs the model pulled off the page
  error?: string
}

export interface RunSummary {
  sourcesChecked: number
  jobsFound: number // total extracted across all sources (pre-dedupe)
  newJobs: number // rows newly emailed this run
  emailSent: boolean
  sources: SourceResult[]
  errors: string[]
}
