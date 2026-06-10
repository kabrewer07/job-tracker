'use client'

import { Fragment, useState } from 'react'
import type { Application, SortField, SortState } from '@/lib/types'
import StatusBadge from './StatusBadge'
import { formatDate, cn } from '@/lib/utils'

interface ApplicationTableProps {
  applications: Application[]
  onEdit: (app: Application) => void
  onDelete: (app: Application) => void
  sort: SortState
  onSort: (field: SortField) => void
}

const COLUMNS: {
  field: SortField | null
  label: string
  className?: string
  hideOnMobile?: boolean
}[] = [
  { field: 'company', label: 'Company' },
  { field: 'role', label: 'Role', hideOnMobile: true },
  { field: 'date_applied', label: 'Applied', className: 'w-40', hideOnMobile: true },
  { field: 'status', label: 'Status', className: 'w-28' },
  { field: null, label: 'Link', className: 'w-12', hideOnMobile: true },
  { field: null, label: '', className: 'w-20' },
]

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: 'asc' | 'desc'
}) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      className={cn(
        'ml-1 inline-block transition-colors',
        active ? 'text-teal-600' : 'text-slate-300'
      )}
    >
      {direction === 'asc' || !active ? (
        <path
          d="M4.5 1L7.5 7H1.5L4.5 1Z"
          fill={active && direction === 'asc' ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1"
        />
      ) : (
        <path
          d="M4.5 8L1.5 2H7.5L4.5 8Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
        />
      )}
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9" />
      <polyline points="11 1 15 1 15 5" />
      <line x1="7.5" y1="8.5" x2="15" y2="1" />
    </svg>
  )
}

export default function ApplicationTable({
  applications,
  onEdit,
  onDelete,
  sort,
  onSort,
}: ApplicationTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  function toggleExpand(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id))
  }

  if (applications.length === 0) {
    return (
      <div className="py-14 text-center border-t border-slate-100">
        <p className="text-sm text-slate-400">No applications match your filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map((col, index) => (
              <th
                key={col.field ?? `col-${index}`}
                className={cn(
                  col.className,
                  col.field && 'cursor-pointer hover:text-slate-700',
                  col.hideOnMobile && 'hidden sm:table-cell'
                )}
                onClick={() => col.field && onSort(col.field)}
              >
                {col.label}
                {col.field && (
                  <SortIcon
                    active={sort.field === col.field}
                    direction={sort.field === col.field ? sort.direction : 'asc'}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <Fragment key={app.id}>
              <tr
                onMouseEnter={() => setHoveredRow(app.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Company — always visible */}
                <td>
                  <span className="font-medium text-slate-900">{app.company}</span>
                  <p className="sm:hidden text-xs text-slate-500 mt-0.5">{app.role}</p>
                </td>

                {/* Role — desktop only */}
                <td className="hidden sm:table-cell text-slate-600">{app.role}</td>

                {/* Date — desktop only */}
                <td className="hidden sm:table-cell text-slate-500 tabular-nums">
                  {formatDate(app.date_applied)}
                </td>

                {/* Status — always visible */}
                <td>
                  <StatusBadge status={app.status} />
                  <p className="sm:hidden text-2xs text-slate-400 mt-0.5 tabular-nums">
                    {formatDate(app.date_applied)}
                  </p>
                </td>

                {/* Link — desktop only */}
                <td className="hidden sm:table-cell">
                  {app.job_url ? (
                    <a
                      href={app.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-teal-600 transition-colors"
                      title={app.job_url}
                    >
                      <LinkIcon />
                    </a>
                  ) : (
                    <span className="text-slate-200">—</span>
                  )}
                </td>

                {/* Actions */}
                <td>
                  <div className="flex items-center gap-1">
                    {/* Expand toggle — show if notes or description exists */}
                    {(app.notes || app.job_description) && (
                      <button
                        onClick={() => toggleExpand(app.id)}
                        className={cn(
                          'btn-ghost text-xs py-0.5 px-1.5 h-6 transition-colors',
                          expandedRow === app.id
                            ? 'text-teal-600 bg-teal-50'
                            : 'text-slate-400'
                        )}
                        title={expandedRow === app.id ? 'Hide description' : 'Show description'}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                          className={cn(expandedRow === app.id && 'text-teal-600')}
                        >
                          <path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
                          <polyline points="10 2 10 5 13 5" />
                          <line x1="5" y1="9" x2="11" y2="9" />
                          <line x1="5" y1="12" x2="9" y2="12" />
                        </svg>
                      </button>
                    )}

                    <div
                      className={cn(
                        'flex items-center gap-1 transition-opacity',
                        'opacity-100 sm:opacity-0',
                        hoveredRow === app.id && 'sm:opacity-100'
                      )}
                    >
                      <button
                        onClick={() => onEdit(app)}
                        className="btn-ghost text-xs py-0.5 px-1.5 h-6"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(app)}
                        className="btn-ghost text-xs py-0.5 px-1.5 h-6 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Expandable row — notes + description */}
              {expandedRow === app.id && (app.notes || app.job_description) && (
                <tr className="bg-slate-50">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 space-y-4">
                        {app.notes && (
                          <div>
                            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Notes
                            </p>
                            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                              {app.notes}
                            </p>
                          </div>
                        )}
                        {app.job_description && (
                          <div>
                            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Job description
                            </p>
                            <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                              {app.job_description}
                            </pre>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExpand(app.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors ml-4 mt-0.5 shrink-0"
                        aria-label="Close"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="3" y1="3" x2="13" y2="13" />
                          <line x1="13" y1="3" x2="3" y2="13" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
