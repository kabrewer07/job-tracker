import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import AddApplicationButton from '@/components/AddApplicationButton'
import { formatDate } from '@/lib/utils'
import type { Application, ApplicationStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Overview' }

const STATUS_ORDER: ApplicationStatus[] = [
  'saved',
  'applied',
  'interviewing',
  'offer',
  'rejected',
]

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div
      className={`bg-white border rounded p-4 ${
        accent ? 'border-teal-200' : 'border-slate-200'
      }`}
    >
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p
        className={`text-2xl font-semibold tabular-nums ${
          accent ? 'text-teal-700' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .order('date_applied', { ascending: false })

  const apps: Application[] = applications ?? []
  const total = apps.length

  const byStatus = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = apps.filter((a) => a.status === s).length
      return acc
    },
    {} as Record<ApplicationStatus, number>
  )

  const activeCount = byStatus.applied + byStatus.interviewing

  const recent = apps.slice(0, 5)

  // Activity by week (last 8 weeks)
  const weeksMap: Record<string, number> = {}
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`
    weeksMap[key] = 0
  }
  apps.forEach((a) => {
    if (!a.date_applied) return
    const d = new Date(a.date_applied)
    const key = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`
    if (key in weeksMap) weeksMap[key]++
  })

  const weeklyData = Object.entries(weeksMap)
  const maxWeekly = Math.max(...weeklyData.map(([, v]) => v), 1)

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between mb-5 sm:mb-6">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your job search at a glance.
          </p>
        </div>
        <AddApplicationButton label="Add application" className="btn-primary shrink-0" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-7">
        <StatCard label="Total applications" value={total} />
        <StatCard
          label="Active"
          value={activeCount}
          sub="applied + interviewing"
          accent
        />
        <StatCard label="Offers" value={byStatus.offer} />
        <StatCard label="Rejected" value={byStatus.rejected} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
        {/* Status breakdown */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <p className="section-title mb-3">By status</p>
          <div className="space-y-2">
            {STATUS_ORDER.map((s) => {
              const count = byStatus[s]
              const pct = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={s}>
                  <div className="flex items-center justify-between mb-0.5">
                    <StatusBadge status={s} size="xs" />
                    <span className="text-xs tabular-nums text-slate-500">
                      {count}
                    </span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s === 'saved'
                          ? 'bg-amber-400'
                          : s === 'applied'
                          ? 'bg-slate-400'
                          : s === 'interviewing'
                            ? 'bg-sky-500'
                            : s === 'offer'
                              ? 'bg-emerald-500'
                              : 'bg-rose-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly activity */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <p className="section-title mb-3">Weekly activity</p>
          <div className="flex items-end gap-1 h-20">
            {weeklyData.map(([week, count]) => (
              <div
                key={week}
                className="flex-1 flex flex-col items-center gap-0.5"
                title={`${week}: ${count}`}
              >
                <div
                  className="w-full bg-teal-500 rounded-sm opacity-80 transition-all"
                  style={{
                    height: `${Math.max((count / maxWeekly) * 64, count > 0 ? 4 : 0)}px`,
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-2xs text-slate-400 mt-2">Last 8 weeks</p>
        </div>

        {/* Recent applications */}
        <div className="bg-white border border-slate-200 rounded p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Recent</p>
            <Link
              href="/dashboard/applications"
              className="text-2xs text-teal-600 hover:text-teal-700 font-medium"
            >
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No applications yet.
            </p>
          ) : (
            <div className="space-y-0">
              {recent.map((app) => (
                <div
                  key={app.id}
                  className="py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {app.company}
                      </p>
                      <p className="text-2xs text-slate-500 truncate">
                        {app.role}
                      </p>
                    </div>
                    <StatusBadge status={app.status} size="xs" />
                  </div>
                  <p className="text-2xs text-slate-400 mt-0.5">
                    {formatDate(app.date_applied)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {total === 0 && (
        <div className="mt-6 border border-dashed border-slate-200 rounded p-8 text-center">
          <p className="text-sm text-slate-500 mb-3">
            No applications tracked yet.
          </p>
          <AddApplicationButton label="Add your first application" />
        </div>
      )}
    </div>
  )
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
