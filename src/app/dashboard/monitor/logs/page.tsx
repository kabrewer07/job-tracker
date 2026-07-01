import type { Metadata } from 'next'
import Link from 'next/link'
import MonitorLogsView from '@/components/MonitorLogsView'
import { createClient } from '@/lib/supabase/server'
import type { MonitorRun } from '@/lib/monitor/types'

export const metadata: Metadata = { title: 'Monitor Run Logs' }

export default async function MonitorLogsPage() {
  const supabase = await createClient()

  const { data: runs } = await supabase
    .from('monitor_runs')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <Link
          href="/dashboard/monitor"
          className="text-xs text-teal-700 hover:underline"
        >
          ← Job Monitor
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 mt-2">Run logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Each check (manual or daily cron) is logged here. Expand a run to see
          which listings were skipped and why — keyword match or non-US location.
        </p>
      </div>

      <MonitorLogsView runs={(runs ?? []) as MonitorRun[]} />
    </div>
  )
}
