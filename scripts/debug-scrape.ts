import { readFileSync } from 'fs'
import { resolve } from 'path'
import { extractJobs } from '../src/lib/monitor/extract'

const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v1/scrape'

async function scrapeToMarkdown(url: string, clearLocation = false): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('Missing FIRECRAWL_API_KEY env var.')

  const body: Record<string, unknown> = {
    url,
    formats: ['markdown'],
    onlyMainContent: false,
    waitFor: 8000,
  }

  if (clearLocation) {
    body.actions = [
      { type: 'wait', milliseconds: 3000 },
      { type: 'click', selector: '[aria-label="Clear Search"]' },
      { type: 'wait', milliseconds: 2000 },
      { type: 'click', selector: 'button:has-text("Search")' },
      { type: 'wait', milliseconds: 5000 },
    ]
  }

  const res = await fetch(FIRECRAWL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Firecrawl ${res.status} for ${url}: ${detail.slice(0, 300)}`)
  }

  const json = (await res.json()) as { data?: { markdown?: string }; markdown?: string }
  const markdown = json.data?.markdown ?? json.markdown ?? ''
  if (!markdown.trim()) throw new Error(`Firecrawl returned no markdown for ${url}`)
  return markdown
}

for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const args = process.argv.slice(2)
const clearLocation = args.includes('--clear-location')
const url = args.find((a) => !a.startsWith('--'))!
if (!url) {
  console.error('Usage: npx tsx scripts/debug-scrape.ts [--clear-location] <url>')
  process.exit(1)
}

async function main() {
  console.log('clearLocation:', clearLocation)
  const md = await scrapeToMarkdown(url, clearLocation)
  console.log('markdown length:', md.length)
  console.log('### headings:', (md.match(/^### /gm) || []).length)
  console.log('h2 headings:', (md.match(/^## /gm) || []).length)
  console.log('idealist job links:', (md.match(/idealist\.org\/en\/[^\s)]+/gi) || []).length)

  const sections = md.split(/\n(?=### )/).filter((p) => {
    const t = p.trim()
    return t.startsWith('### ') && /\/jobs\/|\/job\/|\/careers\/|\/positions\//i.test(t)
  })
  console.log('listing sections (batch regex):', sections.length)

  const jobIdx = md.search(/Senior Engineer|Partner Success|FreeWill|listing-card|job-card/i)
  if (jobIdx >= 0) {
    console.log('\n--- around first job mention ---\n')
    console.log(md.slice(Math.max(0, jobIdx - 300), jobIdx + 2500))
  }

  const remoteMatch = md.match(/Remote \(\d+\)/)
  const onsiteMatch = md.match(/On-site \(\d+\)/)
  console.log('filter counts:', { remote: remoteMatch?.[0], onsite: onsiteMatch?.[0] })

  const locMatch = md.match(/New York, New York|Entire Country|United States\n\n\d+/g)
  console.log('location hints:', locMatch?.slice(0, 5))

  for (const dense of [false, true]) {
    const { jobs, extraction } = await extractJobs(md, url, { denseListing: dense })
    console.log(`\ndense=${dense}:`, extraction, '→', jobs.length, 'jobs')
    jobs.forEach((j) => console.log(' -', j.title, '|', j.company, '|', j.location))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
