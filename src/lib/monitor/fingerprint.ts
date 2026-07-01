import { createHash } from 'crypto'

function normalizeIdentityPart(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalized title|company key — same basis as fingerprint, without the hash. */
export function jobIdentityKey(title: string, company: string | null): string {
  return `${normalizeIdentityPart(title)}|${normalizeIdentityPart(company ?? '')}`
}

/**
 * Stable de-dupe key for a job. Two postings are "the same" if their normalized
 * title + company match. This is what the (user_id, fingerprint) unique constraint
 * keys on, so a job is only ever stored — and emailed — once.
 *
 * Tradeoff: two genuinely different postings with the same title+company (e.g. the
 * same role in two cities) collide and only the first is kept. If you want to keep
 * those separate, add `| (url ?? '')` below — at the cost of re-emailing a job
 * whenever its URL changes.
 */
export function fingerprint(title: string, company: string | null): string {
  return createHash('sha256').update(jobIdentityKey(title, company)).digest('hex')
}
