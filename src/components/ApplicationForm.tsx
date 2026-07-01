'use client'

import { useState, useTransition } from 'react'
import { createApplication, updateApplication } from '@/app/actions'
import type { Application, ApplicationInsert, ApplicationStatus } from '@/lib/types'
import { STATUS_OPTIONS, statusRequiresDateApplied } from '@/lib/types'
import { buildApplicationPayload, formatDateInput } from '@/lib/utils'

interface ApplicationFormProps {
  application?: Application
  initialValues?: Partial<ApplicationInsert>
  onSuccess: () => void
  onCancel: () => void
}

const today = new Date().toISOString().split('T')[0]

type FormState = Omit<ApplicationInsert, 'date_applied'> & { date_applied: string }

export default function ApplicationForm({
  application,
  initialValues,
  onSuccess,
  onCancel,
}: ApplicationFormProps) {
  const isEditing = !!application
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaults = initialValues ?? {}
  const defaultStatus = application?.status ?? defaults.status ?? 'applied'

  const [form, setForm] = useState<FormState>({
    company: application?.company ?? defaults.company ?? '',
    role: application?.role ?? defaults.role ?? '',
    date_applied: application
      ? formatDateInput(application.date_applied)
      : defaultStatus === 'saved'
        ? ''
        : defaults.date_applied
          ? formatDateInput(defaults.date_applied)
          : today,
    status: defaultStatus,
    job_url: application?.job_url ?? defaults.job_url ?? '',
    notes: application?.notes ?? defaults.notes ?? '',
    job_description: application?.job_description ?? defaults.job_description ?? '',
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleStatusChange(status: ApplicationStatus) {
    setForm((prev) => ({
      ...prev,
      status,
      date_applied:
        status === 'saved'
          ? ''
          : prev.date_applied || today,
    }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    let payload: ApplicationInsert
    try {
      payload = buildApplicationPayload(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      return
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateApplication(application.id, payload)
        } else {
          await createApplication(payload)
        }
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
      <div>
        <label className="label" htmlFor="company">
          Company <span className="text-rose-500">*</span>
        </label>
        <input
          id="company"
          className="input"
          required
          placeholder="Acme Corp"
          value={form.company}
          onChange={(e) => set('company', e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="role">
          Role <span className="text-rose-500">*</span>
        </label>
        <input
          id="role"
          className="input"
          required
          placeholder="Senior Engineer"
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="date_applied">
            Date applied
            {statusRequiresDateApplied(form.status) && (
              <span className="text-rose-500"> *</span>
            )}
          </label>
          <input
            id="date_applied"
            type="date"
            className="input"
            required={statusRequiresDateApplied(form.status)}
            value={form.date_applied}
            onChange={(e) => set('date_applied', e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status <span className="text-rose-500">*</span>
          </label>
          <select
            id="status"
            className="input"
            value={form.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as ApplicationStatus)
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="job_url">
          Job posting URL
        </label>
        <input
          id="job_url"
          type="url"
          className="input"
          placeholder="https://company.com/jobs/123"
          value={form.job_url ?? ''}
          onChange={(e) => set('job_url', e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          className="input min-h-[48px] resize-y"
          placeholder="Referral, recruiter name, salary requested, next steps…"
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="job_description">
          Job description
        </label>
        <p className="text-2xs text-slate-400 mb-1">
          Paste the full posting here in case it goes offline. Line breaks are preserved.
        </p>
        <textarea
          id="job_description"
          className="input min-h-[140px] resize-y leading-relaxed"
          placeholder="Paste the job description here…"
          value={form.job_description ?? ''}
          onChange={(e) => set('job_description', e.target.value)}
        />
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
          {error}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 pb-1">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending
            ? isEditing
              ? 'Saving…'
              : 'Adding…'
            : isEditing
              ? 'Save changes'
              : 'Add application'}
        </button>
      </div>
    </form>
  )
}
