import OpenAI from 'openai'
import { scrapeToMarkdown } from './firecrawl'

const MAX_MARKDOWN_CHARS = 12_000

const SYSTEM_PROMPT = `You read the markdown of a single job posting page and write a short summary.

Return ONLY valid JSON, no markdown fences, in exactly this shape:
{ "summary": string | null }

Rules:
- Write 1–3 plain-English sentences summarizing the role: responsibilities, requirements, team, or tech stack when visible.
- Use null only when the page has no job description content (error page, login wall, empty page).
- Never invent details not on the page.`

/**
 * Scrape an individual job posting and extract a short summary. Used when the
 * listing page only shows title/company/location with no description text.
 */
export async function extractSummaryFromJobPage(
  jobUrl: string,
  title: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  let markdown: string
  try {
    markdown = await scrapeToMarkdown(jobUrl)
  } catch {
    return null
  }

  if (!markdown.trim()) return null

  const openai = new OpenAI({ apiKey })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Job title: ${title}\nJob URL: ${jobUrl}\n\nPage markdown:\n${markdown.slice(0, MAX_MARKDOWN_CHARS)}`,
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{"summary":null}'
  try {
    const parsed = JSON.parse(raw) as { summary?: unknown }
    return typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : null
  } catch {
    return null
  }
}

/** Fill missing summaries on rows that have a job URL. */
export async function enrichMissingSummaries<
  T extends { summary: string | null; job_url: string | null; title: string },
>(rows: T[], options?: { max?: number; concurrency?: number }): Promise<void> {
  const max = options?.max ?? 25
  const concurrency = options?.concurrency ?? 3

  const needsSummary = rows.filter((r) => !r.summary?.trim() && r.job_url?.trim())
  const batch = needsSummary.slice(0, max)

  for (let i = 0; i < batch.length; i += concurrency) {
    const chunk = batch.slice(i, i + concurrency)
    await Promise.all(
      chunk.map(async (row) => {
        const summary = await extractSummaryFromJobPage(row.job_url!, row.title)
        if (summary) row.summary = summary
      })
    )
  }
}
