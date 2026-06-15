import { redirect } from 'next/navigation'
import PublicAnalyzeView from '@/components/PublicAnalyzeView'
import { createClient } from '@/lib/supabase/server'

export default async function AnalyzePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard/analyze')

  return <PublicAnalyzeView />
}
