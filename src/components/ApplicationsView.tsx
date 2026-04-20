'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Application, ApplicationStatus, FilterState, SortField, SortState } from '@/lib/types'
import { filterApplications, sortApplications } from '@/lib/utils'
import { deleteApplication } from '@/app/actions'
import ApplicationTable from './ApplicationTable'
import ApplicationForm from './ApplicationForm'
import Modal from './Modal'
import StatusBadge from './StatusBadge'

const STATUS_FILTERS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  )
}

export default function ApplicationsView({
  initialApplications,
}: {
  initialApplications: Application[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
  })
  const [sort, setSort] = useState<SortState>({
    field: 'date_applied',
    direction: 'desc',
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | undefined>()

  // Auto-open the add modal when navigated here with ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsFormOpen(true)
      router.replace('/dashboard/applications')
    }
  }, [searchParams, router])
  const [deletingApp, setDeletingApp] = useState<Application | undefined>()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()

  function handleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' }
    )
  }

  function openAdd() {
    setEditingApp(undefined)
    setIsFormOpen(true)
  }

  function openEdit(app: Application) {
    setEditingApp(app)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingApp(undefined)
  }

  function confirmDelete(app: Application) {
    setDeleteError(null)
    setDeletingApp(app)
  }

  function handleDelete() {
    if (!deletingApp) return
    startDeleteTransition(async () => {
      try {
        await deleteApplication(deletingApp.id)
        setDeletingApp(undefined)
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Delete failed.')
      }
    })
  }

  const filtered = filterApplications(initialApplications, filters)
  const sorted = sortApplications(filtered, sort)

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
        {/* Top row on mobile: search + add button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="search"
              className="input pl-7 text-xs"
              placeholder="Search company, role, notes…"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
            />
          </div>

          {/* Add button — shown inline on mobile */}
          <div className="shrink-0 sm:hidden">
            <button onClick={openAdd} className="btn-primary">
              <PlusIcon />
              Add
            </button>
          </div>
        </div>

        {/* Second row on mobile: status filters + add button on desktop */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center border border-slate-200 rounded overflow-hidden bg-white shrink-0 overflow-x-auto">
            {STATUS_FILTERS.map((sf) => (
              <button
                key={sf.value}
                onClick={() =>
                  setFilters((f) => ({ ...f, status: sf.value }))
                }
                className={`px-2.5 py-1 text-xs font-medium border-r border-slate-200 last:border-0 transition-colors whitespace-nowrap ${
                  filters.status === sf.value
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>

          {/* Add button — desktop only */}
          <div className="hidden sm:block ml-auto shrink-0">
            <button onClick={openAdd} className="btn-primary">
              <PlusIcon />
              Add application
            </button>
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center gap-1 mb-2 text-xs text-slate-400">
        <span className="tabular-nums font-medium text-slate-600">
          {sorted.length}
        </span>{' '}
        {sorted.length === 1 ? 'application' : 'applications'}
        {filters.status !== 'all' && (
          <span className="ml-0.5">
            · <StatusBadge status={filters.status as ApplicationStatus} size="xs" />
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <ApplicationTable
          applications={sorted}
          onEdit={openEdit}
          onDelete={confirmDelete}
          sort={sort}
          onSort={handleSort}
        />
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={isFormOpen}
        onClose={closeForm}
        title={editingApp ? 'Edit application' : 'Add application'}
      >
        <ApplicationForm
          application={editingApp}
          onSuccess={closeForm}
          onCancel={closeForm}
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!deletingApp}
        onClose={() => setDeletingApp(undefined)}
        title="Delete application"
        size="sm"
      >
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-600">
            Remove{' '}
            <span className="font-medium text-slate-900">
              {deletingApp?.role}
            </span>{' '}
            at{' '}
            <span className="font-medium text-slate-900">
              {deletingApp?.company}
            </span>
            ? This cannot be undone.
          </p>

          {deleteError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
              {deleteError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              className="btn-secondary"
              onClick={() => setDeletingApp(undefined)}
            >
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={isDeletePending}
            >
              {isDeletePending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
