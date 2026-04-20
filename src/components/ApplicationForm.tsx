'use client'

import { useState, useTransition } from 'react'
import { createApplication, updateApplication } from '@/app/actions'
import type { Application, ApplicationInsert, ApplicationStatus } from '@/lib/types'
import { formatDateInput } from '@/lib/utils'

interface ApplicationFormProps {
  application?: Application
  onSuccess: () => void
  onCancel: () => void
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

const today = new Date().toISOString().split('T')[0]

export default function ApplicationForm({
  application,
  onSuccess,
  onCancel,
}: ApplicationFormProps) {
  const isEditing = !!application
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<ApplicationInsert>({
    company: application?.company ?? '',
    role: application?.role ?? '',
    date_applied: application ? formatDateInput(application.date_applied) : today,
    status: application?.status ?? 'applied',
    job_url: application?.job_url ?? '',
    notes: application?.notes ?? '',
    job_description: application?.job_description ?? '',
  })

  function set<K extends keyof ApplicationInsert>(
    key: K,
    value: ApplicationInsert[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const payload: ApplicationInsert = {
      ...form,
      job_url: form.job_url?.trim() || null,
      notes: form.notes?.trim() || null,
      job_description: form.job_description?.trim() || null,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="date_applied">
            Date applied <span className="text-rose-500">*</span>
          </label>
          <input
            id="date_applied"
            type="date"
            className="input"
            required
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
            onChange={(e) => set('status', e.target.value as ApplicationStatus)}
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
          className="input font-mono text-xs"
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
          className="input min-h-[72px] resize-y"
          placeholder="Referral from Alice, recruiter name, next steps…"
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
          className="input min-h-[140px] resize-y font-mono text-xs leading-relaxed"
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
