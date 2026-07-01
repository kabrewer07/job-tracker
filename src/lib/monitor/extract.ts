import OpenAI from 'openai'
import type { ExtractedJob } from './types'
import { resolvePostedAt } from './posted-sort'

const MAX_MARKDOWN_CHARS = 30_000
const LISTING_SECTION_BATCH = 13
const MIN_SECTIONS_FOR_BATCH = 10

const WORK_TYPES = new Set(['remote', 'hybrid', 'onsite'])

const SYSTEM_PROMPT = `You extract job postings from the markdown of a single web page (a company careers page or a job board listing).

Return ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "jobs": [
    {
      "title": string,
      "company": string | null,
      "url": string | null,
      "postedText": string | null,
      "postedDate": string | null,
      "salary": string | null,
      "location": string | null,
      "workType": "Remote" | "Hybrid" | "Onsite" | null,
      "summary": string | null
    }
  ]
}

Rules:
- Extract EVERY distinct job posting in the markdown chunk — listing pages often have 15–25 jobs. Do not stop early or truncate the jobs array.
- One object per distinct job posting that is actually listed.
- "title": the role title exactly as shown.
- "company": the hiring company. If the page is a single company's careers page and the name isn't on each row, infer it from the page. Use null if genuinely unknown.
- "url": the link to that specific posting or its application page. Prefer an absolute URL. If the link is relative (e.g. "/jobs/123"), return it as-is — it will be resolved later. Use null if there is no per-job link.
- "postedText": the posted/date text exactly as shown (e.g. "1 hour ago", "Yesterday", "3 days ago", "Jan 12"). Include relative times verbatim. Use null if not shown.
- "postedDate": the posting date as YYYY-MM-DD when it can be determined from the listing (including relative text like "1 hour ago", "yesterday", "3 days ago" using today's date from the user message). Use null if not shown or unclear.
- "salary": compensation text exactly as shown (e.g. "$120k–$150k", "$50/hr"). Use null if not shown.
- "location": location text exactly as shown (city, state, country, or "Remote"). Use null if not shown.
- "workType": one of "Remote", "Hybrid", or "Onsite" only if clearly indicated on the page for that posting. Use null if not shown or unclear.
- "summary": 1–3 sentences summarizing meaningful job description details visible on the listing (requirements, team, tech stack, responsibilities). Use null if the page only shows title, company, location, salary, and/or work type with no additional description. Never invent details not on the page.
- Do NOT invent jobs, dates, links, salary, location, or description text. Do NOT include navigation links, categories, or "see all jobs" links as jobs.
- If the chunk lists no jobs, return { "jobs": [] }.`

/**
 * Extract structured jobs from a page's markdown using gpt-4o-mini (same model
 * the analyzer uses). Relative URLs are resolved against the source page URL.
 *
 * Long job-board pages are split into batches so the model returns every listing
 * instead of truncating the JSON after ~10 jobs.
 */
export interface ExtractMeta {
  denseListing: boolean
  listingSections: number
  extractBatches: number
  extractMode: 'single' | 'batched' | 'idealist'
}

export interface ExtractJobsResult {
  jobs: ExtractedJob[]
  extraction: ExtractMeta
}

export interface ExtractJobsOptions {
  /** Split long job-board pages into smaller batches (opt-in per source). */
  denseListing?: boolean
}

export async function extractJobs(
  markdown: string,
  sourceUrl: string,
  options: ExtractJobsOptions = {}
): Promise<ExtractJobsResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY env var.')

  const openai = new OpenAI({ apiKey })
  const today = new Date().toISOString().split('T')[0]

  const sections = splitListingSections(markdown)
  const listingSections = sections.length
  const denseListing = !!options.denseListing

  if (denseListing && sections.length >= MIN_SECTIONS_FOR_BATCH) {
    const extractBatches = Math.ceil(sections.length / LISTING_SECTION_BATCH)
    const all: ExtractedJob[] = []
    for (let i = 0; i < sections.length; i += LISTING_SECTION_BATCH) {
      const batch = sections.slice(i, i + LISTING_SECTION_BATCH).join('\n\n')
      const jobs = await extractJobsFromMarkdown(openai, batch, sourceUrl, today)
      all.push(...jobs)
    }
    return {
      jobs: dedupeExtractedJobs(all),
      extraction: {
        denseListing,
        listingSections,
        extractBatches,
        extractMode: 'batched',
      },
    }
  }

  const jobs = await extractJobsFromMarkdown(
    openai,
    markdown.slice(0, MAX_MARKDOWN_CHARS),
    sourceUrl,
    today
  )
  return {
    jobs,
    extraction: {
      denseListing,
      listingSections,
      extractBatches: 1,
      extractMode: 'single',
    },
  }
}

/** Split markdown into per-job sections (### heading + posting URL). */
function splitListingSections(markdown: string): string[] {
  const parts = markdown.split(/\n(?=### )/)
  return parts.filter((part) => {
    const trimmed = part.trim()
    if (!trimmed.startsWith('### ')) return false
    return /\/jobs\/|\/job\/|\/careers\/|\/positions\//i.test(trimmed)
  })
}

async function extractJobsFromMarkdown(
  openai: OpenAI,
  markdown: string,
  sourceUrl: string,
  today: string
): Promise<ExtractedJob[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 16_384,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Today's date: ${today}\nPage URL: ${sourceUrl}\n\nPage markdown:\n${markdown.slice(0, MAX_MARKDOWN_CHARS)}`,
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

    const postedText = optionalString(j.postedText)
    const postedAt = optionalString(j.postedDate)

    jobs.push({
      title,
      company: optionalString(j.company),
      url: resolveUrl(typeof j.url === 'string' ? j.url : null, sourceUrl),
      postedText,
      postedAt: resolvePostedAt(postedAt, postedText),
      salary: optionalString(j.salary),
      location: optionalString(j.location),
      workType: normalizeWorkType(j.workType),
      summary: optionalString(j.summary),
    })
  }
  return jobs
}

function dedupeExtractedJobs(jobs: ExtractedJob[]): ExtractedJob[] {
  const byUrl = new Map<string, ExtractedJob>()
  const out: ExtractedJob[] = []

  for (const job of jobs) {
    if (job.url?.trim()) {
      try {
        const key = new URL(job.url).toString().replace(/\/$/, '')
        if (byUrl.has(key)) continue
        byUrl.set(key, job)
        out.push(job)
        continue
      } catch {
        // fall through to title dedupe
      }
    }

    const titleKey = job.title.toLowerCase()
    if (out.some((j) => j.title.toLowerCase() === titleKey && j.company === job.company)) {
      continue
    }
    out.push(job)
  }

  return out
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeWorkType(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const lower = value.trim().toLowerCase()
  if (!WORK_TYPES.has(lower)) return null
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function resolveUrl(href: string | null, base: string): string | null {
  if (!href) return null
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}
