'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addSource,
  removeSource,
  toggleSource,
  addKeyword,
  removeKeyword,
} from '@/app/dashboard/monitor/actions'
import type {
  DiscoveredJob,
  ExcludedKeyword,
  MonitoredSource,
} from '@/lib/monitor/types'

interface RunSummary {
  sourcesChecked: number
  jobsFound: number
  newJobs: number
  emailSent: boolean
  errors: string[]
  error?: string
}

export default function MonitorView({
  email,
  sources,
  keywords,
  jobs,
}: {
  email: string
  sources: MonitoredSource[]
  keywords: ExcludedKeyword[]
  jobs: DiscoveredJob[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<RunSummary | null>(null)

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
        newJobs: 0,
        emailSent: false,
        errors: [],
        error: 'Request failed.',
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Job Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Each morning these sites are checked for new postings. New ones are
            emailed to {email || 'you'} — never the same job twice.
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
          {summary.error ? (
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
          className="flex flex-col sm:flex-row gap-2"
        >
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
        </form>

        {sources.length === 0 ? (
          <p className="text-sm text-slate-400">No sites yet. Add a careers page or job-board search URL above.</p>
        ) : (
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.active ? 'bg-teal-500' : 'bg-slate-300'}`}
                  title={s.active ? 'Active' : 'Paused'}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {s.label || hostname(s.url)}
                  </p>
                  <p className="text-xs text-slate-400 truncate font-mono">{s.url}</p>
                </div>
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
            ))}
          </div>
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
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <Th>Role / Company</Th>
                  <Th>Posted</Th>
                  <Th>Source</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 border-b border-slate-100 align-top">
                      {j.job_url ? (
                        <a
                          href={j.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-teal-700 hover:underline"
                        >
                          {j.title}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-slate-800">
                          {j.title}
                        </span>
                      )}
                      <div className="text-xs text-slate-500">{j.company || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 border-b border-slate-100 align-top text-xs text-slate-500 whitespace-nowrap">
                      {j.posted_text || '—'}
                    </td>
                    <td className="px-3 py-2.5 border-b border-slate-100 align-top text-xs text-slate-500">
                      {j.source_label || '—'}
                    </td>
                    <td className="px-3 py-2.5 border-b border-slate-100 align-top">
                      <span
                        className={`text-2xs uppercase tracking-wider font-semibold ${j.emailed_at ? 'text-slate-400' : 'text-teal-600'}`}
                      >
                        {j.emailed_at ? 'Sent' : 'New'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
      {children}
    </th>
  )
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
