import { format, parseISO } from 'date-fns'
import type {
  Application,
  ApplicationInsert,
  ApplicationStatus,
  FilterState,
  SortState,
} from './types'
import { STATUS_SORT_ORDER, statusRequiresDateApplied } from './types'

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

export function formatDateInput(dateString: string | null): string {
  if (!dateString) return ''
  // Returns YYYY-MM-DD for <input type="date">
  try {
    return format(parseISO(dateString), 'yyyy-MM-dd')
  } catch {
    return dateString
  }
}

export function buildApplicationPayload(data: {
  company: string
  role: string
  date_applied: string | null
  status: ApplicationStatus
  job_url?: string | null
  notes?: string | null
  job_description?: string | null
}): ApplicationInsert {
  const trimmedDate = data.date_applied?.trim() || null

  if (statusRequiresDateApplied(data.status) && !trimmedDate) {
    throw new Error('Date applied is required for this status.')
  }

  return {
    company: data.company.trim(),
    role: data.role.trim(),
    status: data.status,
    date_applied: trimmedDate,
    job_url: data.job_url?.trim() || null,
    notes: data.notes?.trim() || null,
    job_description: data.job_description?.trim() || null,
  }
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

const ANALYZE_PENDING_KEY = 'job-tracker-analyze-pending'

/** Where users land after a normal sign-in (OAuth or email/password). */
export const POST_LOGIN_PATH = '/dashboard'

const ALLOWED_LOGIN_REDIRECTS = new Set([
  '/dashboard',
  '/dashboard/analyze',
  '/dashboard/applications',
  '/dashboard/monitor',
  '/auth/update-password',
])

/** Validates post-login destination; falls back to dashboard. */
export function getPostLoginPath(
  next: string | null | undefined,
  fallback = POST_LOGIN_PATH
): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback
  }
  const path = next.split('?')[0]
  if (ALLOWED_LOGIN_REDIRECTS.has(path)) {
    return path
  }
  return fallback
}

export function getSafeRedirectPath(
  next: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next
  }
  return fallback
}

export function saveAnalyzePending(jobDescription: string, analysis: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(
    ANALYZE_PENDING_KEY,
    JSON.stringify({ jobDescription, analysis })
  )
}

export function restoreAnalyzePending(): {
  jobDescription: string
  analysis: string
} | null {
  if (typeof window === 'undefined') return null

  const raw = sessionStorage.getItem(ANALYZE_PENDING_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as {
      jobDescription?: unknown
      analysis?: unknown
    }
    if (
      typeof parsed.jobDescription === 'string' &&
      typeof parsed.analysis === 'string'
    ) {
      return {
        jobDescription: parsed.jobDescription,
        analysis: parsed.analysis,
      }
    }
  } catch {
    // ignore invalid stored state
  }

  return null
}

export function clearAnalyzePending() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ANALYZE_PENDING_KEY)
}

export function filterApplications(
  applications: Application[],
  filters: FilterState
): Application[] {
  return applications.filter((app) => {
    if (filters.status !== 'all' && app.status !== filters.status) return false

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      const matchesCompany = app.company.toLowerCase().includes(q)
      const matchesRole = app.role.toLowerCase().includes(q)
      const matchesNotes = app.notes?.toLowerCase().includes(q) ?? false
      if (!matchesCompany && !matchesRole && !matchesNotes) return false
    }

    return true
  })
}

function compareIsoDate(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const valA = a?.trim() ?? ''
  const valB = b?.trim() ?? ''
  if (!valA && !valB) return 0
  if (!valA) return 1
  if (!valB) return -1
  return valA.localeCompare(valB)
}

function tiebreakApplications(a: Application, b: Application): number {
  const byCompany = a.company.localeCompare(b.company)
  if (byCompany !== 0) return byCompany
  return a.role.localeCompare(b.role)
}

export function sortApplications(
  applications: Application[],
  sort: SortState
): Application[] {
  return [...applications].sort((a, b) => {
    let cmp = 0

    if (sort.field === 'date_applied' || sort.field === 'created_at') {
      cmp = compareIsoDate(a[sort.field], b[sort.field])
    } else if (sort.field === 'status') {
      cmp = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]
    } else {
      cmp = (a[sort.field] ?? '').localeCompare(b[sort.field] ?? '')
    }

    const primary = sort.direction === 'asc' ? cmp : -cmp
    if (primary !== 0) return primary
    return tiebreakApplications(a, b)
  })
}
