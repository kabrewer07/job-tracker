import type { ApplicationInsert } from '@/lib/types'
import { jobIdentityKey } from './fingerprint'
import type { DiscoveredJob } from './types'

/** Map a discovered job into ApplicationForm initial values (status: saved). */
export function discoveredJobToApplicationInitialValues(
  job: DiscoveredJob
): Partial<ApplicationInsert> {
  const noteLines = [
    job.salary ? `Salary: ${job.salary}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.work_type ? `Work type: ${job.work_type}` : null,
    job.posted_text ? `Posted: ${job.posted_text}` : null,
    job.source_label ? `Found via: ${job.source_label}` : null,
  ].filter(Boolean) as string[]

  return {
    company: discoveredJobCompany(job),
    role: job.title,
    status: 'saved',
    date_applied: null,
    job_url: job.job_url,
    notes: noteLines.length > 0 ? noteLines.join('\n') : null,
    job_description: job.summary,
  }
}

/** Company name used when tracking — mirrors ApplicationForm pre-fill. */
export function discoveredJobCompany(job: DiscoveredJob): string {
  return job.company?.trim() || job.source_label?.trim() || 'Unknown'
}

/** Normalize job URLs for duplicate detection against tracked applications. */
export function normalizeJobUrl(url: string): string {
  try {
    const parsed = new URL(url.trim())
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return url.trim().toLowerCase()
  }
}

export interface TrackedApplicationIndex {
  urls: Set<string>
  identityKeys: Set<string>
}

export function buildTrackedApplicationIndex(
  applications: {
    job_url: string | null
    role: string
    company: string
  }[]
): TrackedApplicationIndex {
  const urls = new Set<string>()
  const identityKeys = new Set<string>()

  for (const app of applications) {
    if (app.job_url?.trim()) {
      urls.add(normalizeJobUrl(app.job_url))
    }
    identityKeys.add(jobIdentityKey(app.role, app.company))
  }

  return { urls, identityKeys }
}

export function isDiscoveredJobTracked(
  job: DiscoveredJob,
  index: TrackedApplicationIndex
): boolean {
  if (job.job_url?.trim() && index.urls.has(normalizeJobUrl(job.job_url))) {
    return true
  }

  return index.identityKeys.has(
    jobIdentityKey(job.title, discoveredJobCompany(job))
  )
}
