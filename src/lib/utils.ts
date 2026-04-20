import { format, parseISO } from 'date-fns'
import type { Application, FilterState, SortState } from './types'

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

export function formatDateInput(dateString: string): string {
  // Returns YYYY-MM-DD for <input type="date">
  try {
    return format(parseISO(dateString), 'yyyy-MM-dd')
  } catch {
    return dateString
  }
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function filterApplications(
  applications: Application[],
  filters: FilterState
): Application[] {
  return applications.filter((app) => {
    if (filters.status !== 'all' && app.status !== filters.status) return false

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      const matchesCompany = app.company.toLowerCase().includes(q)
      const matchesRole = app.role.toLowerCase().includes(q)
      const matchesNotes = app.notes?.toLowerCase().includes(q) ?? false
      if (!matchesCompany && !matchesRole && !matchesNotes) return false
    }

    return true
  })
}

export function sortApplications(
  applications: Application[],
  sort: SortState
): Application[] {
  return [...applications].sort((a, b) => {
    let valA: string = a[sort.field] ?? ''
    let valB: string = b[sort.field] ?? ''

    if (sort.field === 'date_applied' || sort.field === 'created_at') {
      valA = a[sort.field]
      valB = b[sort.field]
    }

    const cmp = valA.localeCompare(valB)
    return sort.direction === 'asc' ? cmp : -cmp
  })
}
