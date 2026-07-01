'use client'

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addSource,
  removeSource,
  toggleDenseListing,
  toggleSource,
  updateSourceUrl,
  addKeyword,
  removeKeyword,
} from '@/app/dashboard/monitor/actions'
import ApplicationForm from '@/components/ApplicationForm'
import Modal from '@/components/Modal'
import {
  buildTrackedApplicationIndex,
  discoveredJobToApplicationInitialValues,
  isDiscoveredJobTracked,
} from '@/lib/monitor/map-to-application'
import type {
  DiscoveredJob,
  ExcludedKeyword,
  MonitoredSource,
  RunSummary,
} from '@/lib/monitor/types'
import { comparePostedDates, formatMonitorDate, formatPostedDisplay } from '@/lib/monitor/posted-sort'
import {
  formatSourceDisplay,
  formatSourceTooltip,
  isMultiSource,
} from '@/lib/monitor/job-sources'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type DiscoveredJobSortField =
  | 'title'
  | 'company'
  | 'salary'
  | 'posted_text'
  | 'discovered_at'
  | 'source_label'

type SortState = {
  field: DiscoveredJobSortField
  direction: 'asc' | 'desc'
}

const PAGE_SIZE = 30
const TABLE_COL_COUNT = 7

const SORT_COLUMNS: {
  field: DiscoveredJobSortField
  label: string
  className?: string
  hideOnMobile?: boolean
}[] = [
  { field: 'title', label: 'Role / Where' },
  { field: 'company', label: 'Company', className: 'max-w-[9rem]' },
  { field: 'posted_text', label: 'Posted', className: 'w-24' },
  { field: 'salary', label: 'Salary', className: 'max-w-[6rem] hidden md:table-cell' },
  { field: 'discovered_at', label: 'Found', className: 'w-24 hidden lg:table-cell' },
  { field: 'source_label', label: 'Source', className: 'max-w-[7rem] hidden sm:table-cell' },
]

function formatWhere(job: DiscoveredJob): string {
  const parts = [job.work_type, job.location].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

function hasJobSummary(job: DiscoveredJob): boolean {
  return Boolean(job.summary?.trim())
}

const iconButtonClass =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-teal-500 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1'

const iconButtonActiveClass =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-teal-300 bg-teal-50 text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1'

function filterDiscoveredJobs(jobs: DiscoveredJob[], search: string): DiscoveredJob[] {
  const q = search.trim().toLowerCase()
  if (!q) return jobs

  return jobs.filter((j) => {
    const haystack = [
      j.title,
      j.company,
      j.summary,
      j.location,
      j.work_type,
      j.salary,
      j.posted_text,
      j.source_label,
      ...(j.also_seen_on ?? []),
      formatMonitorDate(j.discovered_at),
      j.emailed_at ? 'sent' : 'new',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(q)
  })
}

function compareText(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  return (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base' })
}

function compareDiscoveredAt(
  a: DiscoveredJob,
  b: DiscoveredJob,
  direction: 'asc' | 'desc'
): number {
  const cmp =
    new Date(a.discovered_at).getTime() - new Date(b.discovered_at).getTime()
  return direction === 'asc' ? cmp : -cmp
}

function parseSalarySortKey(salary: string | null | undefined): number {
  if (!salary?.trim()) return -1
  const match = salary.replace(/,/g, '').match(/\d+/)
  return match ? Number(match[0]) : -1
}

function compareSalary(a: DiscoveredJob, b: DiscoveredJob): number {
  return parseSalarySortKey(a.salary) - parseSalarySortKey(b.salary)
}

/** Stable ordering when the primary sort field ties (common after batch inserts). */
function tiebreakDiscoveredJobs(
  a: DiscoveredJob,
  b: DiscoveredJob,
  direction: 'asc' | 'desc'
): number {
  let cmp = compareText(a.title, b.title)
  if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
  cmp = compareText(a.company, b.company)
  if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
  return a.id.localeCompare(b.id)
}

function sortDiscoveredJobs(
  jobs: DiscoveredJob[],
  sort: SortState
): DiscoveredJob[] {
  const dir = sort.direction

  return [...jobs].sort((a, b) => {
    let primary = 0

    if (sort.field === 'posted_text') {
      primary = comparePostedDates(a, b, dir)
    } else if (sort.field === 'discovered_at') {
      primary = compareDiscoveredAt(a, b, dir)
    } else if (sort.field === 'company') {
      primary = compareText(a.company, b.company)
    } else if (sort.field === 'salary') {
      primary = compareSalary(a, b)
    } else if (sort.field === 'source_label') {
      primary = compareText(formatSourceDisplay(a), formatSourceDisplay(b))
    } else {
      primary = compareText(a[sort.field], b[sort.field])
    }

    if (sort.field !== 'posted_text' && sort.field !== 'discovered_at') {
      primary = dir === 'asc' ? primary : -primary
    }

    if (primary !== 0) return primary

    if (sort.field !== 'discovered_at') {
      const byFound = compareDiscoveredAt(a, b, 'desc')
      if (byFound !== 0) return byFound
    }

    if (sort.field !== 'posted_text') {
      const byPosted = comparePostedDates(a, b, 'desc')
      if (byPosted !== 0) return byPosted
    }

    return tiebreakDiscoveredJobs(a, b, 'asc')
  })
}

function NoteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <polyline points="10 2 10 5 13 5" />
      <line x1="5" y1="9" x2="11" y2="9" />
      <line x1="5" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 8.5 6.5 12 13 4" />
    </svg>
  )
}

function MailPendingIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="12" height="9" rx="1" />
      <polyline points="2 5 8 9.5 14 5" />
    </svg>
  )
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: 'asc' | 'desc'
}) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      className={cn(
        'ml-1 inline-block transition-colors',
        active ? 'text-teal-600' : 'text-slate-300'
      )}
      aria-hidden
    >
      {direction === 'asc' || !active ? (
        <path
          d="M4.5 1L7.5 7H1.5L4.5 1Z"
          fill={active && direction === 'asc' ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1"
        />
      ) : (
        <path
          d="M4.5 8L1.5 2H7.5L4.5 8Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
        />
      )}
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7" cy="7" r="4.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  )
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function MonitorView({
  email,
  sources,
  keywords,
  jobs,
  trackedApplications,
}: {
  email: string
  sources: MonitoredSource[]
  keywords: ExcludedKeyword[]
  jobs: DiscoveredJob[]
  trackedApplications: {
    job_url: string | null
    role: string
    company: string
  }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({
    field: 'posted_text',
    direction: 'desc',
  })
  const [page, setPage] = useState(1)
  const [trackingJob, setTrackingJob] = useState<DiscoveredJob | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null)

  const trackedIndex = useMemo(
    () => buildTrackedApplicationIndex(trackedApplications),
    [trackedApplications]
  )

  const filtered = useMemo(
    () => filterDiscoveredJobs(jobs, search),
    [jobs, search]
  )
  const sorted = useMemo(
    () => sortDiscoveredJobs(filtered, sort),
    [filtered, sort]
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length)

  useEffect(() => {
    setPage(1)
  }, [search, sort.field, sort.direction])

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  function handleSort(field: DiscoveredJobSortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: field === 'posted_text' || field === 'discovered_at' ? 'desc' : 'asc' }
    )
  }

  function toggleExpand(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id))
  }

  function closeTrackModal() {
    setTrackingJob(null)
  }

  function handleTrackSuccess() {
    closeTrackModal()
    router.refresh()
  }

  function saveSourceUrl(id: string, url: string, previousUrl: string) {
    const trimmed = url.trim()
    if (!trimmed || trimmed === previousUrl) return

    setSourceUrlError(null)
    startTransition(async () => {
      try {
        await updateSourceUrl(id, trimmed)
        router.refresh()
      } catch (err) {
        setSourceUrlError(
          err instanceof Error ? err.message : 'Could not update URL.'
        )
      }
    })
  }

  async function runNow() {
    setRunning(true)
    setSummary(null)
    try {
      const res = await fetch('/api/monitor/run', { method: 'POST' })
      const data = (await res.json()) as RunSummary
      setSummary(data)
      router.refresh()
    } catch {
      setSummary({
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
        error: 'Request failed.',
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Job Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Each morning these sites are checked for new postings. New ones are
            emailed to {email || 'you'} — never the same job twice.{' '}
            <Link
              href="/dashboard/monitor/logs"
              className="text-teal-700 hover:underline"
            >
              Run logs
            </Link>
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running || sources.length === 0}
          className="btn-primary shrink-0"
        >
          {running ? 'Checking…' : 'Run check now'}
        </button>
      </div>

      {/* Run summary */}
      {summary && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          {'error' in summary && summary.error ? (
            <p className="text-red-600">{summary.error}</p>
          ) : (
            <p className="text-slate-700">
              Checked {summary.sourcesChecked} site
              {summary.sourcesChecked === 1 ? '' : 's'}, found {summary.jobsFound}{' '}
              listing{summary.jobsFound === 1 ? '' : 's'}.{' '}
              {summary.newJobs > 0
                ? `${summary.newJobs} new — ${summary.emailSent ? 'email sent.' : 'email not sent (check config).'}`
                : 'Nothing pending since last check.'}
            </p>
          )}
          {summary.runId && (
            <p className="text-xs text-slate-500 mt-2">
              <Link
                href="/dashboard/monitor/logs"
                className="text-teal-700 hover:underline"
              >
                View run log
              </Link>
            </p>
          )}
          {summary.errors?.length > 0 && (
            <ul className="mt-2 text-xs text-amber-700 list-disc pl-4 space-y-0.5">
              {summary.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Monitored sources */}
      <section className="space-y-3">
        <p className="section-title">Monitored sites</p>

        <form
          action={(fd) => startTransition(() => addSource(fd))}
          className="space-y-2"
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              name="url"
              type="url"
              required
              placeholder="https://company.com/careers"
              className="input flex-1"
            />
            <input
              name="label"
              type="text"
              placeholder="Label (optional)"
              className="input sm:w-44"
            />
            <button type="submit" disabled={isPending} className="btn-secondary shrink-0">
              Add site
            </button>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-500 cursor-pointer">
            <input
              name="dense_listing"
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>
              Dense listing page — use smaller extraction batches for job boards with many
              postings (e.g. Remote Rocketship). Leave off for typical company careers pages.
            </span>
          </label>
        </form>

        {sources.length === 0 ? (
          <p className="text-sm text-slate-400">No sites yet. Add a careers page or job-board search URL above.</p>
        ) : (
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {sources.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`mt-1.5 sm:mt-0 h-1.5 w-1.5 rounded-full shrink-0 ${s.active ? 'bg-teal-500' : 'bg-slate-300'}`}
                    title={s.active ? 'Active' : 'Paused'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {s.label || hostname(s.url)}
                    </p>
                    <input
                      key={s.url}
                      type="url"
                      defaultValue={s.url}
                      disabled={isPending}
                      onBlur={(e) => saveSourceUrl(s.id, e.target.value, s.url)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') {
                          e.currentTarget.value = s.url
                          e.currentTarget.blur()
                        }
                      }}
                      className="mt-0.5 block w-full bg-transparent px-0 py-0 text-xs font-mono text-slate-400 select-text border-0 border-b border-transparent rounded-none focus:outline-none focus:text-slate-700 focus:border-slate-300 disabled:opacity-60"
                      title="Edit monitored URL"
                      aria-label={`URL for ${s.label || hostname(s.url)}`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-5 sm:pl-0">
                  <label
                    className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 cursor-pointer"
                    title="Use smaller extraction batches for job boards with many postings"
                  >
                    <input
                      type="checkbox"
                      checked={s.dense_listing}
                      onChange={() =>
                        startTransition(() => toggleDenseListing(s.id, !s.dense_listing))
                      }
                      disabled={isPending}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Dense
                  </label>
                  <button
                    onClick={() => startTransition(() => toggleSource(s.id, !s.active))}
                    disabled={isPending}
                    className="btn-ghost text-xs text-slate-500"
                  >
                    {s.active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => startTransition(() => removeSource(s.id))}
                    disabled={isPending}
                    className="btn-ghost text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {sourceUrlError && (
          <p className="text-xs text-red-600">{sourceUrlError}</p>
        )}
      </section>

      {/* Excluded keywords */}
      <section className="space-y-3">
        <p className="section-title">Excluded title keywords</p>
        <p className="text-xs text-slate-400 -mt-1">
          Any posting whose title contains one of these (case-insensitive) is
          skipped — e.g. “senior”, “staff”, “manager”.
        </p>

        <form
          action={(fd) => startTransition(() => addKeyword(fd))}
          className="flex gap-2"
        >
          <input
            name="keyword"
            type="text"
            required
            placeholder="keyword to exclude"
            className="input flex-1 sm:max-w-xs"
          />
          <button type="submit" disabled={isPending} className="btn-secondary shrink-0">
            Add
          </button>
        </form>

        {keywords.length === 0 ? (
          <p className="text-sm text-slate-400">No exclusions yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1.5 py-1 text-xs text-slate-700"
              >
                {k.keyword}
                <button
                  onClick={() => startTransition(() => removeKeyword(k.id))}
                  disabled={isPending}
                  aria-label={`Remove ${k.keyword}`}
                  className="text-slate-400 hover:text-red-600 rounded-full h-4 w-4 inline-flex items-center justify-center"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Recently discovered */}
      <section className="space-y-3">
        <p className="section-title">Recently discovered</p>

        {jobs.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing discovered yet. Add a site and hit “Run check now”.
          </p>
        ) : (
          <>
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <SearchIcon />
              </span>
              <input
                type="search"
                className="input pl-7 text-xs w-full"
                placeholder="Search role, company, location, salary…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="tabular-nums font-medium text-slate-600">
                {sorted.length}
              </span>{' '}
              {sorted.length === 1 ? 'job' : 'jobs'}
              {sorted.length > PAGE_SIZE && (
                <span className="ml-0.5">
                  · showing {rangeStart}–{rangeEnd}
                </span>
              )}
              {search.trim() && sorted.length !== jobs.length && (
                <span className="ml-0.5">· filtered from {jobs.length}</span>
              )}
            </div>

            {sorted.length === 0 ? (
              <p className="text-sm text-slate-400">No jobs match your search.</p>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {SORT_COLUMNS.map((col) => (
                            <th
                              key={col.field}
                              className={cn(
                                col.className,
                                'cursor-pointer hover:text-slate-700',
                                col.hideOnMobile && 'hidden sm:table-cell'
                              )}
                              onClick={() => handleSort(col.field)}
                            >
                              {col.label}
                              <SortIcon
                                active={sort.field === col.field}
                                direction={
                                  sort.field === col.field ? sort.direction : 'asc'
                                }
                              />
                            </th>
                          ))}
                          <th className="w-11 pr-2" aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((j) => {
                          const where = formatWhere(j)
                          const tracked = isDiscoveredJobTracked(j, trackedIndex)
                          const isExpanded = expandedRow === j.id
                          const showSummary = hasJobSummary(j)

                          return (
                            <Fragment key={j.id}>
                              <tr>
                                <td className="align-top max-w-[14rem]">
                                  <div className="flex items-start gap-1.5 min-w-0">
                                    {!j.emailed_at && (
                                      <span
                                        className="shrink-0 mt-0.5 text-amber-500"
                                        title="Not emailed yet — will be included in the next digest"
                                      >
                                        <MailPendingIcon />
                                      </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      {j.job_url ? (
                                        <a
                                          href={j.job_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-teal-700 hover:underline truncate block"
                                          title={j.title}
                                        >
                                          {j.title}
                                        </a>
                                      ) : (
                                        <span
                                          className="font-medium text-slate-900 truncate block"
                                          title={j.title}
                                        >
                                          {j.title}
                                        </span>
                                      )}
                                      <p
                                        className="text-xs text-slate-500 mt-0.5 truncate"
                                        title={where !== '—' ? where : undefined}
                                      >
                                        {where}
                                      </p>
                                      {showSummary && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpand(j.id)}
                                          className={cn(
                                            'mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
                                            isExpanded
                                              ? 'text-teal-600'
                                              : 'text-slate-400 hover:text-teal-600'
                                          )}
                                          aria-expanded={isExpanded}
                                          aria-label={
                                            isExpanded ? 'Hide summary' : 'Show summary'
                                          }
                                        >
                                          <NoteIcon />
                                          {isExpanded ? 'Hide summary' : 'Summary'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td
                                  className="text-slate-500 truncate max-w-[9rem]"
                                  title={j.company ?? undefined}
                                >
                                  {j.company || '—'}
                                </td>
                                <td
                                  className="text-slate-500 whitespace-nowrap tabular-nums"
                                  title={j.posted_text ?? undefined}
                                >
                                  {formatPostedDisplay(j)}
                                  <span className="block text-2xs text-slate-400 mt-0.5 lg:hidden">
                                    Found {formatMonitorDate(j.discovered_at)}
                                  </span>
                                </td>
                                <td
                                  className="text-slate-500 truncate max-w-[6rem] hidden md:table-cell"
                                  title={j.salary ?? undefined}
                                >
                                  {j.salary || '—'}
                                </td>
                                <td
                                  className="text-slate-500 whitespace-nowrap tabular-nums hidden lg:table-cell"
                                  title={`First seen ${formatMonitorDate(j.discovered_at)}`}
                                >
                                  {formatMonitorDate(j.discovered_at)}
                                </td>
                                <td
                                  className="text-slate-500 truncate max-w-[7rem] hidden sm:table-cell"
                                  title={formatSourceTooltip(j) || j.source_label || undefined}
                                >
                                  <span className="truncate block">
                                    {formatSourceDisplay(j)}
                                  </span>
                                  {isMultiSource(j) && (
                                    <span
                                      className="inline-block mt-0.5 text-2xs font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded"
                                      title={formatSourceTooltip(j)}
                                    >
                                      Multi-site
                                    </span>
                                  )}
                                </td>
                                <td className="w-11 align-middle pr-2">
                                  <div className="flex items-center justify-end">
                                    {tracked ? (
                                      <span
                                        className="inline-flex h-7 w-7 items-center justify-center text-slate-300"
                                        title="Already in applications"
                                      >
                                        <CheckIcon />
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setTrackingJob(j)}
                                        className={iconButtonClass}
                                        aria-label={`Add ${j.title} to applications`}
                                        title="Add to applications"
                                      >
                                        <PlusIcon />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && showSummary && (
                                <tr className="bg-slate-50">
                                  <td colSpan={TABLE_COL_COUNT} className="px-4 py-3">
                                    <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                      Summary
                                    </p>
                                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                      {j.summary}
                                    </p>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {sorted.length > PAGE_SIZE && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Page {safePage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="btn-secondary text-xs"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="btn-secondary text-xs"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      <Modal
        open={!!trackingJob}
        onClose={closeTrackModal}
        title="Add to applications"
      >
        {trackingJob && (
          <ApplicationForm
            key={trackingJob.id}
            initialValues={discoveredJobToApplicationInitialValues(trackingJob)}
            onSuccess={handleTrackSuccess}
            onCancel={closeTrackModal}
          />
        )}
      </Modal>
    </div>
  )
}
