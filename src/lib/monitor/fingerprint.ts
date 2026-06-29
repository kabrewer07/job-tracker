import { createHash } from 'crypto'

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
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s]/g, '') // strip punctuation
      .replace(/\s+/g, ' ')
      .trim()

  const key = `${norm(title)}|${norm(company ?? '')}`
  return createHash('sha256').update(key).digest('hex')
}
