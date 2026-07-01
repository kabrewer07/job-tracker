/** Source fields on a discovered job row. */
export interface JobSourceFields {
  source_label?: string | null
  also_seen_on?: string[] | null
}

/** All unique source labels for a job (primary first). */
export function allSourceLabels(job: JobSourceFields): string[] {
  const labels: string[] = []
  const seen = new Set<string>()

  const add = (label: string | null | undefined) => {
    const trimmed = label?.trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    labels.push(trimmed)
  }

  add(job.source_label)
  for (const label of job.also_seen_on ?? []) add(label)

  return labels
}

export function isMultiSource(job: JobSourceFields): boolean {
  return allSourceLabels(job).length > 1
}

/** Merge source labels into primary + also_seen_on (deduped, stable order). */
export function mergeSourceLists(
  primary: string | null | undefined,
  alsoSeen: string[] | null | undefined,
  ...more: (string | null | undefined)[]
): { source_label: string | null; also_seen_on: string[] } {
  const labels = allSourceLabels({
    source_label: primary,
    also_seen_on: [
      ...(alsoSeen ?? []),
      ...more.filter((l): l is string => Boolean(l?.trim())),
    ],
  })

  return {
    source_label: labels[0] ?? null,
    also_seen_on: labels.slice(1),
  }
}

/** Compact label for table cells — e.g. "Fast Forward +1". */
export function formatSourceDisplay(job: JobSourceFields): string {
  const labels = allSourceLabels(job)
  if (labels.length === 0) return '—'
  if (labels.length === 1) return labels[0]
  return `${labels[0]} +${labels.length - 1}`
}

/** Full list for tooltips and email. */
export function formatSourceTooltip(job: JobSourceFields): string {
  const labels = allSourceLabels(job)
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  return `Listed on: ${labels.join(', ')}`
}

/** Email-friendly source line when listed on multiple sites. */
export function formatSourceForEmail(job: JobSourceFields): string {
  const labels = allSourceLabels(job)
  if (labels.length === 0) return '—'
  if (labels.length === 1) return labels[0]
  return `${labels[0]} (also on ${labels.slice(1).join(', ')})`
}
