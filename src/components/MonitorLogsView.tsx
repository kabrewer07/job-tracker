'use client'

import { useState } from 'react'
import Link from 'next/link'
import SkippedJobsList from '@/components/SkippedJobsList'
import { formatSourceRunDetails } from '@/lib/monitor/extract-meta'
import type { MonitorRun } from '@/lib/monitor/types'

function formatRunTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MonitorLogsView({ runs }: { runs: MonitorRun[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(
    runs[0]?.id ?? null
  )

  if (runs.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No runs logged yet. Use{' '}
        <Link href="/dashboard/monitor" className="text-teal-700 hover:underline">
          Run check now
        </Link>{' '}
        or wait for the daily cron.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const skipped = run.skipped_jobs ?? []
        const skippedTotal = run.skipped_keywords + run.skipped_location
        const isExpanded = expandedId === run.id

        return (
          <div
            key={run.id}
            className="rounded-lg border border-slate-200 bg-white overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : run.id)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
              aria-expanded={isExpanded}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">
                  {formatRunTime(run.ran_at)}
                </span>
                <span className="text-xs text-slate-500">
                  {run.jobs_found} extracted · {run.jobs_eligible} passed filters
                  {skippedTotal > 0 && (
                    <span className="text-amber-700">
                      {' '}
                      · {skippedTotal} skipped
                    </span>
                  )}
                  {run.jobs_inserted > 0 && (
                    <span> · {run.jobs_inserted} new</span>
                  )}
                  {run.jobs_merged > 0 && (
                    <span> · {run.jobs_merged} already in tracker</span>
                  )}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50">
                <p className="text-xs text-slate-600">
                  {run.sources_checked} site{run.sources_checked === 1 ? '' : 's'}{' '}
                  checked. {run.skipped_keywords} skipped for keywords,{' '}
                  {run.skipped_location} for location. {run.jobs_inserted} new,{' '}
                  {run.jobs_merged} already in tracker. {run.new_jobs} pending in
                  email queue{run.email_sent ? ' (sent)' : ''}.
                </p>

                {run.errors?.length > 0 && (
                  <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5">
                    {run.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}

                {(run.sources?.length ?? 0) > 0 && (
                  <ul className="text-xs text-slate-600 space-y-1">
                    {run.sources!.map((s) => (
                      <li key={s.url}>
                        <span className="font-medium text-slate-700">{s.label}</span>
                        {s.error ? (
                          <span className="text-red-600"> — {s.error}</span>
                        ) : (
                          <>
                            {' — '}
                            <span className="text-slate-500">
                              {formatSourceRunDetails(s)}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {skippedTotal > 0 && (
                  <div className="space-y-2">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
                      Skipped listings ({skipped.length})
                    </p>
                    <SkippedJobsList jobs={skipped} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
