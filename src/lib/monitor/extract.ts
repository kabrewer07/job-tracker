import OpenAI from 'openai'
import type { ExtractedJob } from './types'

// Keep token use bounded — listing pages are long. ~30k chars is plenty to cover
// the job rows on a typical careers/listing page.
const MAX_MARKDOWN_CHARS = 30_000

const SYSTEM_PROMPT = `You extract job postings from the markdown of a single web page (a company careers page or a job board listing).

Return ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "jobs": [
    { "title": string, "company": string | null, "url": string | null, "postedText": string | null }
  ]
}

Rules:
- One object per distinct job posting that is actually listed on the page.
- "title": the role title exactly as shown.
- "company": the hiring company. If the page is a single company's careers page and the name isn't on each row, infer it from the page. Use null if genuinely unknown.
- "url": the link to that specific posting or its application page. Prefer an absolute URL. If the link is relative (e.g. "/jobs/123"), return it as-is — it will be resolved later. Use null if there is no per-job link.
- "postedText": the posted/date text exactly as shown (e.g. "Posted 3 days ago", "Jan 12"). Use null if not shown.
- Do NOT invent jobs, dates, or links. Do NOT include navigation links, categories, or "see all jobs" links as jobs.
- If the page lists no jobs, return { "jobs": [] }.`

/**
 * Extract structured jobs from a page's markdown using gpt-4o-mini (same model
 * the analyzer uses). Relative URLs are resolved against the source page URL.
 */
export async function extractJobs(
  markdown: string,
  sourceUrl: string
): Promise<ExtractedJob[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY env var.')

  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Page URL: ${sourceUrl}\n\nPage markdown:\n${markdown.slice(0, MAX_MARKDOWN_CHARS)}`,
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{"jobs":[]}'

  let parsed: { jobs?: unknown }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed.jobs)) return []

  const jobs: ExtractedJob[] = []
  for (const item of parsed.jobs) {
    if (typeof item !== 'object' || item === null) continue
    const j = item as Record<string, unknown>
    const title = typeof j.title === 'string' ? j.title.trim() : ''
    if (!title) continue

    jobs.push({
      title,
      company: typeof j.company === 'string' && j.company.trim() ? j.company.trim() : null,
      url: resolveUrl(typeof j.url === 'string' ? j.url : null, sourceUrl),
      postedText:
        typeof j.postedText === 'string' && j.postedText.trim()
          ? j.postedText.trim()
          : null,
    })
  }
  return jobs
}

function resolveUrl(href: string | null, base: string): string | null {
  if (!href) return null
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}
