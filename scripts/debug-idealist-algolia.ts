const APP_ID = 'NSV3AUESS7'
const API_KEY = 'c2730ea10ab82787f2f3cc961e8c1e06'

const JOB_INDEXES = [
  'idealist7_production_jobs',
  'idealist7-production-jobs',
  'idealist7_production_jobs_published_desc',
  'idealist7-production-jobs-published-desc',
]

async function search(
  index: string,
  filters: string,
  aroundLatLng?: string,
  aroundRadius?: string
) {
  const params = new URLSearchParams({
    query: '',
    hitsPerPage: '50',
    page: '0',
    filters,
    facets: '*',
  })
  if (aroundLatLng) params.set('aroundLatLng', aroundLatLng)
  if (aroundRadius) params.set('aroundRadius', aroundRadius)

  const url = `https://${APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${index}?${params}`
  const res = await fetch(url, {
    headers: {
      'X-Algolia-Application-Id': APP_ID,
      'X-Algolia-API-Key': API_KEY,
    },
  })
  if (!res.ok) {
    console.log(index, res.status, await res.text().then((t) => t.slice(0, 120)))
    return
  }
  const json = (await res.json()) as {
    nbHits?: number
    hits?: unknown[]
    facets?: Record<string, Record<string, number>>
  }
  console.log(`\n[${index}] filters=${filters}`)
  console.log('geo:', aroundLatLng ?? 'none', aroundRadius ?? '')
  console.log('nbHits:', json.nbHits, 'returned:', json.hits?.length ?? 0)
  if (json.facets?.locationType) console.log('locationType:', json.facets.locationType)
  if (json.facets?.functions) {
    const tech = json.facets.functions.TECHNOLOGY_IT
    if (tech != null) console.log('TECHNOLOGY_IT facet count:', tech)
  }
}

async function main() {
  const filters = 'functions:TECHNOLOGY_IT AND locationType:REMOTE'
  for (const index of JOB_INDEXES) {
    await search(index, filters)
    await search(index, filters, '40.7128,-74.0060', 'all')
    await search(index, filters, '40.7128,-74.0060', '40233')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
