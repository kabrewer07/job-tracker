import type { ExtractMeta } from './extract'
import type { SourceResult } from './types'

const LISTING_SECTION_BATCH = 13
const MIN_SECTIONS_FOR_BATCH = 10

/** Human-readable extraction mode for run summaries and logs. */
export function formatExtraction(meta: ExtractMeta): string {
  if (meta.extractMode === 'idealist') {
    const pages = meta.extractBatches
    return `idealist · algolia · ${meta.listingSections} listing${meta.listingSections === 1 ? '' : 's'}${pages > 1 ? ` (${pages} pages)` : ''}`
  }
  if (meta.extractMode === 'batched') {
    return `batched · ${meta.extractBatches} calls × ${LISTING_SECTION_BATCH} sections (${meta.listingSections} detected)`
  }
  if (meta.denseListing && meta.listingSections < MIN_SECTIONS_FOR_BATCH) {
    return `single pass · dense on but only ${meta.listingSections} section${meta.listingSections === 1 ? '' : 's'} (need ${MIN_SECTIONS_FOR_BATCH}+ to batch)`
  }
  if (meta.denseListing) {
    return `single pass · dense on (${meta.listingSections} sections)`
  }
  return `single pass · ${meta.listingSections} section${meta.listingSections === 1 ? '' : 's'}`
}

/** Per-source run line for summaries and logs. */
export function formatSourceRunDetails(s: SourceResult): string {
  const parts: string[] = []

  if (s.extraction) parts.push(formatExtraction(s.extraction))
  parts.push(`${s.found} extracted`)

  const skipped = (s.skippedKeywords ?? 0) + (s.skippedLocation ?? 0)
  if (skipped > 0) parts.push(`${skipped} skipped`)

  if (s.eligible != null) parts.push(`${s.eligible} passed filters`)
  if (s.inserted != null || s.merged != null) {
    parts.push(`${s.inserted ?? 0} new`)
    parts.push(`${s.merged ?? 0} already in tracker`)
  }

  return parts.join(' · ')
}
