'use client'

import { useState } from 'react'
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
  { field: 'date_applied', label: 'Applied', className: 'w-28', hideOnMobile: true },
  { field: 'status', label: 'Status', className: 'w-28' },
  { field: null, label: 'Link', className: 'w-12', hideOnMobile: true },
  { field: null, label: 'Job Description', className: 'w-20' },
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
            {COLUMNS.map((col) => (
              <th
                key={col.label || 'actions'}
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
            <>
              <tr
                key={app.id}
                onMouseEnter={() => setHoveredRow(app.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Company — always visible */}
                <td>
                  <span className="font-medium text-slate-900">{app.company}</span>
                  <p className="sm:hidden text-xs text-slate-500 mt-0.5">{app.role}</p>
                  {app.notes && (
                    <p className="hidden sm:block text-2xs text-slate-400 mt-0.5 truncate max-w-[220px]">
                      {app.notes}
                    </p>
                  )}
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
                    {/* Description toggle — only if there's content */}
                    {app.job_description && (
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
                        {expandedRow === app.id ? (
                          // Minus / collapse
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                            <line x1="2" y1="5" x2="8" y2="5" />
                          </svg>
                        ) : (
                          // Plus / expand
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                            <line x1="5" y1="2" x2="5" y2="8" />
                            <line x1="2" y1="5" x2="8" y2="5" />
                          </svg>
                        )}
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

              {/* Expandable description row */}
              {expandedRow === app.id && app.job_description && (
                <tr key={`${app.id}-desc`} className="bg-slate-50">
                  <td colSpan={6} className="px-4 py-3">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Job description
                    </p>
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                      {app.job_description}
                    </pre>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
