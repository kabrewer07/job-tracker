import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MonitorView from '@/components/MonitorView'
import type {
  DiscoveredJob,
  ExcludedKeyword,
  MonitoredSource,
} from '@/lib/monitor/types'

export const metadata: Metadata = { title: 'Job Monitor' }

export default async function MonitorPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: sources }, { data: keywords }, { data: jobs }, { data: applications }] =
    await Promise.all([
      supabase
        .from('monitored_sources')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('excluded_keywords').select('*').order('keyword'),
      supabase
        .from('discovered_jobs')
        .select('*')
        .order('discovered_at', { ascending: false }),
      supabase.from('applications').select('job_url, role, company'),
    ])

  const trackedApplications = (applications ?? []).map((a) => ({
    job_url: a.job_url,
    role: a.role,
    company: a.company,
  }))

  return (
    <MonitorView
      email={user?.email ?? ''}
      sources={(sources ?? []) as MonitoredSource[]}
      keywords={(keywords ?? []) as ExcludedKeyword[]}
      jobs={(jobs ?? []) as DiscoveredJob[]}
      trackedApplications={trackedApplications}
    />
  )
}
