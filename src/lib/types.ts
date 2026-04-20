export type ApplicationStatus = 'applied' | 'interviewing' | 'offer' | 'rejected'

export interface Application {
  id: string
  user_id: string
  company: string
  role: string
  date_applied: string // ISO date string YYYY-MM-DD
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
