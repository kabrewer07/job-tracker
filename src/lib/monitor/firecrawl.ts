// Thin wrapper over Firecrawl's scrape endpoint. We use plain fetch (no SDK) to
// avoid an extra dependency. Firecrawl handles JS-rendered pages, which most job
// boards are, and returns clean markdown that's cheap to feed to the model.
//
// Cost note: a plain scrape is 1 Firecrawl credit per page. We deliberately do NOT
// use the /extract or agent endpoints (5+ credits, separate billing) — the model
// extraction in extract.ts does that part using your existing OpenAI key.
//
// If Firecrawl bumps its API version, only this constant needs to change. Confirm
// the current version + response shape at https://docs.firecrawl.dev
const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v1/scrape'

export async function scrapeToMarkdown(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('Missing FIRECRAWL_API_KEY env var.')

  const res = await fetch(FIRECRAWL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 5000, // wait 5s for SPA pages to fetch and render job data
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Firecrawl ${res.status} for ${url}: ${detail.slice(0, 300)}`)
  }

  const json = (await res.json()) as {
    data?: { markdown?: string }
    markdown?: string
  }

  // Be tolerant of envelope differences across versions.
  const markdown = json.data?.markdown ?? json.markdown ?? ''
  if (!markdown.trim()) {
    throw new Error(`Firecrawl returned no markdown for ${url}`)
  }
  return markdown
}
