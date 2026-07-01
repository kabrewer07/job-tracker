import type { ExtractJobsResult, ExtractMeta } from './extract'
import { postedFieldsFromUnix } from './posted-sort'
import type { ExtractedJob } from './types'

// Public search-only credentials embedded in Idealist's HTML (see /en/jobs SSR payload).
const ALGOLIA_APP_ID = 'NSV3AUESS7'
const ALGOLIA_SEARCH_KEY = 'c2730ea10ab82787f2f3cc961e8c1e06'
const INDEX_PUBLISHED_DESC = 'idealist7-production-published-desc'
const INDEX_RELEVANCE = 'idealist7-production'
const HITS_PER_PAGE = 50
const MAX_PAGES = 20
const IDEALIST_ORIGIN = 'https://www.idealist.org'

const FACET_PARAMS = [
  'functions',
  'locationType',
  'areasOfFocus',
  'jobType',
  'orgType',
  'professionalLevel',
  'education',
] as const

interface AlgoliaHit {
  name?: string
  orgName?: string
  url?: { en?: string }
  published?: number
  description?: string
  locationType?: string
  city?: string | null
  stateStr?: string | null
  state?: string | null
  country?: string | null
  remoteCountry?: string | null
  remoteState?: string | null
  hasSalary?: boolean
  salaryMinimum?: string | null
  salaryMaximum?: string | null
  salaryPeriod?: string | null
  salaryCurrency?: string | null
}

interface AlgoliaResponse {
  hits?: AlgoliaHit[]
  nbHits?: number
  nbPages?: number
  page?: number
}

/** Idealist job/internship search URLs — geo is applied client-side, not in the URL. */
export function isIdealistSearchUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url)
    if (!hostname.replace(/^www\./, '').endsWith('idealist.org')) return false
    return /\/en\/(jobs|internships)(\/|$)/.test(pathname)
  } catch {
    return false
  }
}

/** Fetch listings from Idealist's Algolia index (nationwide, no geo radius). */
export async function fetchIdealistJobs(sourceUrl: string): Promise<ExtractJobsResult> {
  const { query, filters, index } = parseIdealistSearchUrl(sourceUrl)
  const hits = await searchAllPages(index, query, filters)
  const jobs = hits.map((hit) => mapHitToJob(hit))

  const extraction: ExtractMeta = {
    denseListing: false,
    listingSections: hits.length,
    extractBatches: Math.max(1, Math.ceil(hits.length / HITS_PER_PAGE)),
    extractMode: 'idealist',
  }

  return { jobs, extraction }
}

function parseIdealistSearchUrl(sourceUrl: string): {
  query: string
  filters: string
  index: string
} {
  const url = new URL(sourceUrl)
  const listingType = url.pathname.includes('/internships') ? 'INTERNSHIP' : 'JOB'
  if (!url.pathname.includes('/jobs') && listingType !== 'INTERNSHIP') {
    throw new Error(`Unsupported Idealist URL path: ${url.pathname}`)
  }

  const filterParts: string[] = [`type:${listingType}`]

  for (const param of FACET_PARAMS) {
    const values = url.searchParams.getAll(param).filter(Boolean)
    if (values.length === 1) {
      filterParts.push(`${param}:${values[0]}`)
    } else if (values.length > 1) {
      filterParts.push(`(${values.map((v) => `${param}:${v}`).join(' OR ')})`)
    }
  }

  if (url.searchParams.get('hasSalary') === 'true') {
    filterParts.push('hasSalary:true')
  }

  const sort = url.searchParams.get('sort')?.toUpperCase()
  const index = sort === 'RELEVANCE' || sort === 'BEST_MATCH' ? INDEX_RELEVANCE : INDEX_PUBLISHED_DESC

  return {
    query: url.searchParams.get('q')?.trim() ?? '',
    filters: filterParts.join(' AND '),
    index,
  }
}

async function searchAllPages(
  index: string,
  query: string,
  filters: string
): Promise<AlgoliaHit[]> {
  const all: AlgoliaHit[] = []
  let page = 0
  let totalPages = 1

  while (page < totalPages && page < MAX_PAGES) {
    const json = await algoliaSearch(index, query, filters, page)
    all.push(...(json.hits ?? []))
    totalPages = json.nbPages ?? 1
    page++
    if ((json.hits?.length ?? 0) === 0) break
  }

  return all
}

async function algoliaSearch(
  index: string,
  query: string,
  filters: string,
  page: number
): Promise<AlgoliaResponse> {
  const params = new URLSearchParams({
    query,
    hitsPerPage: String(HITS_PER_PAGE),
    page: String(page),
    filters,
  })

  const endpoint = `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${index}?${params}`
  const res = await fetch(endpoint, {
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': ALGOLIA_SEARCH_KEY,
    },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Idealist search failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  return (await res.json()) as AlgoliaResponse
}

function mapHitToJob(hit: AlgoliaHit): ExtractedJob {
  const posted = hit.published
    ? postedFieldsFromUnix(hit.published)
    : { postedAt: null, postedText: null }

  return {
    title: hit.name?.trim() || 'Untitled',
    company: hit.orgName?.trim() || null,
    url: resolveJobUrl(hit.url?.en),
    postedText: posted.postedText,
    postedAt: posted.postedAt,
    salary: formatSalary(hit),
    location: formatLocation(hit),
    workType: formatWorkType(hit.locationType),
    summary: summarizeDescription(hit.description),
  }
}

function resolveJobUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null
  if (path.startsWith('http')) return path
  return `${IDEALIST_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

function formatWorkType(locationType: string | undefined): string | null {
  switch (locationType?.toUpperCase()) {
    case 'REMOTE':
      return 'Remote'
    case 'HYBRID':
      return 'Hybrid'
    case 'ONSITE':
      return 'Onsite'
    default:
      return null
  }
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
}

function formatLocation(hit: AlgoliaHit): string | null {
  const type = hit.locationType?.toUpperCase()

  if (type === 'REMOTE') {
    if (hit.remoteState && hit.remoteCountry === 'US') {
      return `${hit.remoteState}, United States`
    }
    if (hit.remoteCountry) {
      return COUNTRY_NAMES[hit.remoteCountry] ?? hit.remoteCountry
    }
    return 'Remote'
  }

  const parts = [hit.city, hit.stateStr ?? hit.state, hit.country ? COUNTRY_NAMES[hit.country] ?? hit.country : null]
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function formatSalary(hit: AlgoliaHit): string | null {
  if (!hit.hasSalary || !hit.salaryMinimum) return null

  const currency = hit.salaryCurrency ?? 'USD'
  const symbol = currency === 'USD' ? '$' : currency === 'CAD' ? 'CAD ' : `${currency} `
  const min = formatMoney(hit.salaryMinimum)
  const max = hit.salaryMaximum ? formatMoney(hit.salaryMaximum) : null
  const range = max && max !== min ? `${symbol}${min} - ${symbol}${max}` : `${symbol}${min}`
  const period = formatSalaryPeriod(hit.salaryPeriod)
  return period ? `${range} / ${period}` : range
}

function formatMoney(value: string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatSalaryPeriod(period: string | null | undefined): string | null {
  switch (period?.toUpperCase()) {
    case 'YEAR':
      return 'year'
    case 'HOUR':
      return 'hour'
    case 'MONTH':
      return 'month'
    default:
      return period?.toLowerCase() ?? null
  }
}

function summarizeDescription(html: string | undefined): string | null {
  if (!html?.trim()) return null

  const text = decodeHtml(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return null

  const max = 400
  if (text.length <= max) return text

  const slice = text.slice(0, max)
  const lastPeriod = slice.lastIndexOf('. ')
  if (lastPeriod > 120) return slice.slice(0, lastPeriod + 1)
  return `${slice.trim()}…`
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
