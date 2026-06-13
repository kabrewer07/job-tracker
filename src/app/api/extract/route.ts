import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const MAX_JOB_DESCRIPTION_LENGTH = 15_000

const SYSTEM_PROMPT = `Extract the company name and job title/role from this job description. Return JSON: { "company": "...", "role": "..." }. If you can't determine one, use an empty string.

Use proper capitalization as it would appear officially:
- Company names: preserve brand casing (e.g. "Apple", "JPMorgan Chase", "eBay")
- Job titles: use Title Case (e.g. "Senior Software Engineer", "Product Marketing Manager")`

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const jobDescription =
    typeof body === 'object' &&
    body !== null &&
    'jobDescription' in body &&
    typeof (body as { jobDescription: unknown }).jobDescription === 'string'
      ? (body as { jobDescription: string }).jobDescription.trim()
      : ''

  if (!jobDescription) {
    return Response.json(
      { error: 'Please provide a job description to extract from.' },
      { status: 400 }
    )
  }

  if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return Response.json(
      {
        error: `Job description is too long. Maximum ${MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()} characters.`,
      },
      { status: 400 }
    )
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OpenAI API key is not configured on the server.' },
      { status: 500 }
    )
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: jobDescription },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return Response.json({ error: 'No extraction result returned.' }, { status: 500 })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return Response.json({ error: 'Failed to parse extraction result.' }, { status: 500 })
    }

    const company =
      typeof parsed === 'object' &&
      parsed !== null &&
      'company' in parsed &&
      typeof (parsed as { company: unknown }).company === 'string'
        ? (parsed as { company: string }).company
        : ''

    const role =
      typeof parsed === 'object' &&
      parsed !== null &&
      'role' in parsed &&
      typeof (parsed as { role: unknown }).role === 'string'
        ? (parsed as { role: string }).role
        : ''

    return Response.json({ company, role })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to extract job details.'
    return Response.json({ error: message }, { status: 500 })
  }
}
