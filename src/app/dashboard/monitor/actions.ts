'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAuthenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Unauthorized')
  return { supabase, user }
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('URL must use http or https.')
    }
    return url.toString()
  } catch {
    throw new Error('Enter a valid URL (e.g. https://company.com/careers).')
  }
}

export async function addSource(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient()
  const url = normalizeUrl(formData.get('url')?.toString() ?? '')
  const label = formData.get('label')?.toString().trim() || null
  const denseListing = formData.get('dense_listing') === 'on'

  const { error } = await supabase.from('monitored_sources').insert({
    user_id: user.id,
    url,
    label,
    dense_listing: denseListing,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/monitor')
}

export async function removeSource(id: string) {
  const { supabase, user } = await getAuthenticatedClient()

  const { error } = await supabase
    .from('monitored_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/monitor')
}

export async function updateSourceUrl(id: string, url: string) {
  const { supabase, user } = await getAuthenticatedClient()
  const normalized = normalizeUrl(url)

  const { error } = await supabase
    .from('monitored_sources')
    .update({ url: normalized })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/monitor')
}

export async function toggleDenseListing(id: string, denseListing: boolean) {
  const { supabase, user } = await getAuthenticatedClient()

  const { error } = await supabase
    .from('monitored_sources')
    .update({ dense_listing: denseListing })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/monitor')
}

export async function toggleSource(id: string, active: boolean) {
  const { supabase, user } = await getAuthenticatedClient()

  const { error } = await supabase
    .from('monitored_sources')
    .update({ active })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/monitor')
}

export async function addKeyword(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient()
  const keyword = formData.get('keyword')?.toString().trim().toLowerCase()
  if (!keyword) throw new Error('Keyword is required.')

  const { error } = await supabase.from('excluded_keywords').insert({
    user_id: user.id,
    keyword,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/monitor')
}

export async function removeKeyword(id: string) {
  const { supabase, user } = await getAuthenticatedClient()

  const { error } = await supabase
    .from('excluded_keywords')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/monitor')
}
