import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import ApplicationsView from '@/components/ApplicationsView'
import type { Application } from '@/lib/types'

export const metadata: Metadata = { title: 'Applications' }

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('*')
    .order('date_applied', { ascending: false })

  const applications: Application[] = data ?? []

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-6xl">
      <div className="mb-4 sm:mb-5">
        <h1 className="text-base font-semibold text-slate-900">Applications</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          All tracked applications — search, filter, and sort.
        </p>
      </div>

      <Suspense>
        <ApplicationsView initialApplications={applications} />
      </Suspense>
    </div>
  )
}
