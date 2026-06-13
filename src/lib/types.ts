export type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected'

export const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'saved', label: 'Not applied yet' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

export const STATUS_FILTER_OPTIONS: {
  value: ApplicationStatus | 'all'
  label: string
}[] = [{ value: 'all', label: 'All' }, ...STATUS_OPTIONS]

export function statusRequiresDateApplied(status: ApplicationStatus): boolean {
  return status !== 'saved'
}

export interface Application {
  id: string
  user_id: string
  company: string
  role: string
  date_applied: string | null // ISO date string YYYY-MM-DD
  status: ApplicationStatus
  job_url: string | null
  notes: string | null
  job_description: string | null
  created_at: string
  updated_at: string
}

export type ApplicationInsert = Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export type ApplicationUpdate = Partial<ApplicationInsert>

export type SortField = 'company' | 'role' | 'date_applied' | 'status' | 'created_at'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  field: SortField
  direction: SortDirection
}

export interface FilterState {
  search: string
  status: ApplicationStatus | 'all'
}
