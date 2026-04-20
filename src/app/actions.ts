'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ApplicationInsert, ApplicationUpdate } from '@/lib/types'

async function getAuthenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Unauthorized')
  return { supabase, user }
}

export async function createApplication(data: ApplicationInsert) {
  const { supabase, user } = await getAuthenticatedClient()

  const { error } = await supabase.from('applications').insert({
    ...data,
    user_id: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')
}

export async function updateApplication(id: string, data: ApplicationUpdate) {
  const { supabase, user } = await getAuthenticatedClient()

  const { error } = await supabase
    .from('applications')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')
}

export async function deleteApplication(id: string) {
  const { supabase, user } = await getAuthenticatedClient()

  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}
