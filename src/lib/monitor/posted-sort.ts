import { differenceInCalendarDays, format, isValid, parse, parseISO } from 'date-fns'

const PARSE_FORMATS = ['MMM d, yyyy', 'MMM d yyyy', 'MMM d', 'M/d/yyyy', 'M/d/yy']
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Calendar date in the local timezone (YYYY-MM-DD). */
export function formatLocalDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Never store or show a posting date after today (local calendar). */
export function clampToToday(
  isoDate: string,
  referenceDate = new Date()
): string {
  const today = formatLocalDateOnly(referenceDate)
  return isoDate > today ? today : isoDate
}

/** Format YYYY-MM-DD for display without timezone shifts. */
export function formatDateOnlyDisplay(isoDate: string): string {
  const m = isoDate.match(DATE_ONLY_RE)
  if (!m) return '—'
  return `${Number(m[2])}/${Number(m[3])}/${m[1].slice(-2)}`
}

function parseDateOnlyToTimestamp(isoDate: string): number | null {
  const m = isoDate.match(DATE_ONLY_RE)
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Map Idealist/Algolia unix seconds to stable posted fields. */
export function postedFieldsFromUnix(
  seconds: number,
  referenceDate = new Date()
): { postedAt: string; postedText: string } {
  const published = new Date(seconds * 1000)
  if (Number.isNaN(published.getTime())) {
    return { postedAt: formatLocalDateOnly(referenceDate), postedText: 'today' }
  }

  const days = differenceInCalendarDays(referenceDate, published)
  let postedText: string
  if (days <= 0) postedText = 'today'
  else if (days === 1) postedText = 'yesterday'
  else postedText = `${days} days ago`

  const postedAt = clampToToday(formatLocalDateOnly(published), referenceDate)
  return { postedAt, postedText }
}

export interface PostedDateFields {
  posted_at?: string | null
  posted_text?: string | null
  discovered_at?: string
}

/** Parse listing date text into a Date. Returns null when unknown. */
export function parsePostedTextToDate(
  postedText: string | null | undefined,
  referenceDate = new Date()
): Date | null {
  if (!postedText?.trim()) return null

  // Strip emoji / symbols so "🔥 1 hour ago" still parses.
  const text = postedText
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim()
    .toLowerCase()

  if (!text) return null

  const now = referenceDate.getTime()

  if (/\bjust now\b/.test(text)) return referenceDate

  const minutesAgo = text.match(/(\d+)\s*min(?:ute)?s?\s*ago/)
  if (minutesAgo) return new Date(now - Number(minutesAgo[1]) * 60_000)

  const hoursAgo = text.match(/(\d+)\s*hours?\s*ago/)
  if (hoursAgo) return new Date(now - Number(hoursAgo[1]) * 3_600_000)

  if (/\ban?\s+hour\s+ago\b/.test(text)) {
    return new Date(now - 3_600_000)
  }

  const daysAgo = text.match(/(\d+)\s*days?\s*ago/)
  if (daysAgo) return new Date(now - Number(daysAgo[1]) * 86_400_000)

  if (/\ban?\s+day\s+ago\b/.test(text)) {
    return new Date(now - 86_400_000)
  }

  const weeksAgo = text.match(/(\d+)\s*weeks?\s*ago/)
  if (weeksAgo) return new Date(now - Number(weeksAgo[1]) * 7 * 86_400_000)

  const monthsAgo = text.match(/(\d+)\s*months?\s*ago/)
  if (monthsAgo) return new Date(now - Number(monthsAgo[1]) * 30 * 86_400_000)

  if (/\btoday\b/.test(text)) return referenceDate
  if (/\byesterday\b/.test(text)) return new Date(now - 86_400_000)

  const cleaned = postedText.trim()
  for (const fmt of PARSE_FORMATS) {
    const parsed = parse(cleaned, fmt, referenceDate)
    if (isValid(parsed)) return parsed
  }

  try {
    const iso = parseISO(cleaned)
    if (isValid(iso)) return iso
  } catch {
    // fall through
  }

  return null
}

/** Normalize YYYY-MM-DD from extraction, or derive from posted text. */
export function resolvePostedAt(
  postedAt: string | null | undefined,
  postedText: string | null | undefined,
  referenceDate = new Date()
): string | null {
  const trimmed = postedAt?.trim()
  if (trimmed && DATE_ONLY_RE.test(trimmed)) {
    return clampToToday(trimmed, referenceDate)
  }

  if (trimmed) {
    const iso = parseISO(trimmed)
    if (isValid(iso)) {
      return clampToToday(formatLocalDateOnly(iso), referenceDate)
    }
  }

  const parsed = parsePostedTextToDate(postedText, referenceDate)
  return parsed ? clampToToday(formatLocalDateOnly(parsed), referenceDate) : null
}

/** Display as M/d/yy — prefers posted_at, then parses posted_text. */
export function formatPostedDisplay(job: PostedDateFields): string {
  if (job.posted_at?.trim()) {
    if (DATE_ONLY_RE.test(job.posted_at.trim())) {
      return formatDateOnlyDisplay(job.posted_at.trim())
    }
    const d = parseISO(job.posted_at)
    if (isValid(d)) return format(d, 'M/d/yy')
  }

  const parsed = parsePostedTextToDate(job.posted_text)
  if (parsed) return format(parsed, 'M/d/yy')

  return '—'
}

function resolvePostedDate(job: PostedDateFields): Date | null {
  if (job.posted_at?.trim() && DATE_ONLY_RE.test(job.posted_at.trim())) {
    const ts = parseDateOnlyToTimestamp(job.posted_at.trim())
    return ts == null ? null : new Date(ts)
  }
  if (job.posted_at) {
    const d = parseISO(job.posted_at)
    if (isValid(d)) return d
  }
  return parsePostedTextToDate(job.posted_text)
}

/** Email digest: "today", "yesterday", or M/d/yy for older dates. */
export function formatPostedDisplayForEmail(
  job: PostedDateFields,
  referenceDate = new Date()
): string {
  if (job.posted_at?.trim() && DATE_ONLY_RE.test(job.posted_at.trim())) {
    const days = differenceInCalendarDays(
      referenceDate,
      new Date(parseDateOnlyToTimestamp(job.posted_at.trim())!)
    )
    if (days <= 0) return 'today'
    if (days === 1) return 'yesterday'
    return formatDateOnlyDisplay(job.posted_at.trim())
  }

  const d = resolvePostedDate(job)
  if (!d) return '—'
  const days = differenceInCalendarDays(referenceDate, d)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return format(d, 'M/d/yy')
}

/** Format an ISO date or Date for monitor UI (M/d/yy). */
export function formatMonitorDate(
  value: string | Date | null | undefined
): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(d)) return '—'
  return format(d, 'M/d/yy')
}

/**
 * Sort key for posted date (ms since epoch). Null when no date is known —
 * callers should sort nulls last when ordering newest first.
 */
export function jobPostedSortTimestamp(job: PostedDateFields): number | null {
  if (job.posted_at?.trim()) {
    if (DATE_ONLY_RE.test(job.posted_at.trim())) {
      return parseDateOnlyToTimestamp(job.posted_at.trim())
    }
    const d = parseISO(job.posted_at)
    if (isValid(d)) return d.getTime()
  }

  const parsed = parsePostedTextToDate(job.posted_text)
  if (parsed) return parsed.getTime()

  return null
}

export function comparePostedDates(
  a: PostedDateFields,
  b: PostedDateFields,
  direction: 'asc' | 'desc'
): number {
  const valA = jobPostedSortTimestamp(a)
  const valB = jobPostedSortTimestamp(b)

  let cmp = 0
  if (valA === null && valB === null) cmp = 0
  else if (valA === null) cmp = 1
  else if (valB === null) cmp = -1
  else cmp = valA - valB

  return direction === 'desc' ? -cmp : cmp
}
