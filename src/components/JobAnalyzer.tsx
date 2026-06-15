'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import { createApplication } from '@/app/actions'
import Modal from '@/components/Modal'
import SignInButton from '@/components/SignInButton'
import { createClient } from '@/lib/supabase/client'
import type { ApplicationInsert, ApplicationStatus } from '@/lib/types'
import { STATUS_OPTIONS, statusRequiresDateApplied } from '@/lib/types'
import {
  buildApplicationPayload,
  restoreAnalyzePending,
  saveAnalyzePending,
} from '@/lib/utils'

const today = new Date().toISOString().split('T')[0]

type SaveFormState = Omit<ApplicationInsert, 'date_applied'> & { date_applied: string }

function AnalysisMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm text-slate-700 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-slate-900">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

function ScrollableAnalysis({ content }: { content: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)

  function updateScrollHint() {
    const el = scrollRef.current
    if (!el) return

    const canScroll = el.scrollHeight > el.clientHeight + 4
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8
    setShowScrollHint(canScroll && !atBottom)
  }

  useEffect(() => {
    updateScrollHint()
  }, [content])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const observer = new ResizeObserver(updateScrollHint)
    observer.observe(el)
    return () => observer.disconnect()
  }, [content])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateScrollHint}
        className="max-h-[min(50vh,420px)] overflow-y-auto pr-1 -mr-1 scroll-smooth"
      >
        <AnalysisMarkdown content={content} />
      </div>

      {showScrollHint && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent"
            aria-hidden="true"
          />
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-2xs text-slate-400">
            Scroll for more ↓
          </p>
        </>
      )}
    </div>
  )
}

function emptySaveForm(jobDescription: string): SaveFormState {
  return {
    company: '',
    role: '',
    date_applied: '',
    status: 'saved',
    job_url: '',
    notes: '',
    job_description: jobDescription,
  }
}

const saveButtonClass =
  'inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-5 py-2 text-sm font-medium rounded border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-300 active:bg-teal-200 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1'

/** True when the model returned a structured JD breakdown, not a prompt/error reply. */
function isSaveableAnalysis(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  const promptPatterns = [
    'please provide the job description',
    'please paste a job description',
    'please share the job description',
    'could you provide the job description',
  ]
  if (promptPatterns.some((pattern) => lower.includes(pattern))) return false

  return /^##\s*Role Summary/m.test(trimmed)
}

function SaveActions({
  saveSuccess,
  isLoggedIn,
  showSaveForm,
  extracting,
  onSave,
  onSignIn,
}: {
  saveSuccess: boolean
  isLoggedIn: boolean
  showSaveForm: boolean
  extracting: boolean
  onSave: () => void
  onSignIn: () => void
}) {
  if (showSaveForm) return null

  if (saveSuccess) {
    return (
      <div className="inline-flex items-center flex-wrap gap-x-1.5 w-full sm:w-auto px-5 py-2 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded">
        <span>Application saved.</span>
        <Link
          href="/dashboard/applications"
          className="font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
        >
          View in Dashboard →
        </Link>
      </div>
    )
  }

  if (isLoggedIn) {
    return (
      <button
        type="button"
        onClick={onSave}
        disabled={extracting}
        className={saveButtonClass}
      >
        {extracting ? 'Extracting details…' : 'Save as Application'}
      </button>
    )
  }

  return (
    <SignInButton
      next="/dashboard/analyze"
      onBeforeOpen={onSignIn}
      className={saveButtonClass}
    >
      Sign in to save
    </SignInButton>
  )
}

export default function JobAnalyzer({ embedded = false }: { embedded?: boolean }) {
  const [jobDescription, setJobDescription] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(embedded)
  const [authChecked, setAuthChecked] = useState(embedded)

  const [showSaveForm, setShowSaveForm] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [saveForm, setSaveForm] = useState<SaveFormState>(() => emptySaveForm(''))
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSaving, startSaveTransition] = useTransition()

  useEffect(() => {
    const pending = restoreAnalyzePending()
    if (pending) {
      setJobDescription(pending.jobDescription)
      setAnalysis(pending.analysis)
    }

    if (embedded) return

    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
      setAuthChecked(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [embedded])

  function persistBeforeLogin() {
    if (jobDescription.trim() && analysis) {
      saveAnalyzePending(jobDescription.trim(), analysis)
    }
  }

  async function handleAnalyze() {
    const trimmed = jobDescription.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    setAnalysis('')
    setShowSaveForm(false)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: trimmed }),
      })

      if (!response.ok) {
        let message = 'Something went wrong. Please try again.'
        try {
          const data = (await response.json()) as { error?: string }
          if (data.error) message = data.error
        } catch {
          // use default message
        }
        setError(message)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setError('Streaming is not supported in this browser.')
        return
      }

      const decoder = new TextDecoder()
      let streamed = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        streamed += decoder.decode(value, { stream: true })
        setAnalysis(streamed)
      }
    } catch {
      setError('Failed to connect to the analyzer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveAsApplication() {
    const trimmed = jobDescription.trim()
    if (!trimmed || extracting) return

    setExtracting(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: trimmed }),
      })

      if (!response.ok) {
        let message = 'Failed to extract job details.'
        try {
          const data = (await response.json()) as { error?: string }
          if (data.error) message = data.error
        } catch {
          // use default message
        }
        setSaveError(message)
        return
      }

      const data = (await response.json()) as { company?: string; role?: string }
      setSaveForm({
        ...emptySaveForm(trimmed),
        company: data.company ?? '',
        role: data.role ?? '',
      })
      setShowSaveForm(true)
    } catch {
      setSaveError('Failed to extract job details. Please try again.')
    } finally {
      setExtracting(false)
    }
  }

  function handleSaveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveError(null)

    let payload: ApplicationInsert
    try {
      payload = buildApplicationPayload(saveForm)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save application.')
      return
    }

    startSaveTransition(async () => {
      try {
        await createApplication(payload)
        setSaveSuccess(true)
        setShowSaveForm(false)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save application.')
      }
    })
  }

  function handleClear() {
    setJobDescription('')
    setAnalysis('')
    setError(null)
    setShowSaveForm(false)
    setSaveForm(emptySaveForm(''))
    setSaveError(null)
    setSaveSuccess(false)
  }

  function closeSaveForm() {
    setShowSaveForm(false)
    setSaveError(null)
  }

  function setSaveField<K extends keyof SaveFormState>(
    key: K,
    value: SaveFormState[K]
  ) {
    setSaveForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSaveStatusChange(status: ApplicationStatus) {
    setSaveForm((prev) => ({
      ...prev,
      status,
      date_applied:
        status === 'saved'
          ? ''
          : prev.date_applied || today,
    }))
  }

  const showSaveActions = Boolean(
    analysis && !loading && isSaveableAnalysis(analysis)
  )
  const loggedIn = embedded || isLoggedIn

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="jobDescription" className="label">
          Job description
        </label>
        <textarea
          id="jobDescription"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job posting here..."
          className="input min-h-[240px] resize-y leading-relaxed"
          disabled={loading}
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="text-2xs text-slate-400">Powered by OpenAI</p>
          {(analysis || jobDescription) && (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading || extracting || isSaving}
              className="btn-ghost text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!jobDescription.trim() || loading}
            className="btn-primary w-full sm:w-auto justify-center px-5 py-2"
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
          {showSaveActions && (
            <SaveActions
              saveSuccess={saveSuccess}
              isLoggedIn={loggedIn}
              showSaveForm={showSaveForm}
              extracting={extracting}
              onSave={handleSaveAsApplication}
              onSignIn={persistBeforeLogin}
            />
          )}
        </div>

        {showSaveActions && saveError && !showSaveForm && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
            {saveError}
          </p>
        )}
      </div>

      {(analysis || loading) && (
        <div className="bg-white border border-slate-200 rounded-md p-5 sm:p-6">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Analysis
          </p>
          {analysis ? (
            <ScrollableAnalysis content={analysis} />
          ) : (
            <p className="text-sm text-slate-400">Waiting for response…</p>
          )}
        </div>
      )}

      <Modal
        open={showSaveForm}
        onClose={closeSaveForm}
        title="Save to your tracker"
        size="lg"
      >
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 mb-4">
            Review the extracted details and edit anything before saving.
          </p>

          <form onSubmit={handleSaveSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="save-company">
                  Company
                </label>
                <input
                  id="save-company"
                  className="input"
                  required
                  value={saveForm.company}
                  onChange={(e) => setSaveField('company', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="save-role">
                  Role
                </label>
                <input
                  id="save-role"
                  className="input"
                  required
                  value={saveForm.role}
                  onChange={(e) => setSaveField('role', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="save-date">
                  Date applied
                  {statusRequiresDateApplied(saveForm.status) && (
                    <span className="text-rose-500"> *</span>
                  )}
                </label>
                <input
                  id="save-date"
                  type="date"
                  className="input"
                  required={statusRequiresDateApplied(saveForm.status)}
                  value={saveForm.date_applied}
                  onChange={(e) => setSaveField('date_applied', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="save-status">
                  Status
                </label>
                <select
                  id="save-status"
                  className="input"
                  value={saveForm.status}
                  onChange={(e) =>
                    handleSaveStatusChange(e.target.value as ApplicationStatus)
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
              <label className="label" htmlFor="save-job-url">
                Job posting URL
              </label>
              <input
                id="save-job-url"
                type="url"
                className="input"
                placeholder="https://..."
                value={saveForm.job_url ?? ''}
                onChange={(e) => setSaveField('job_url', e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="save-notes">
                Notes
              </label>
              <textarea
                id="save-notes"
                className="input min-h-[80px] resize-y"
                value={saveForm.notes ?? ''}
                onChange={(e) => setSaveField('notes', e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="save-job-description">
                Job description
              </label>
              <textarea
                id="save-job-description"
                className="input min-h-[120px] resize-y leading-relaxed"
                value={saveForm.job_description ?? ''}
                onChange={(e) => setSaveField('job_description', e.target.value)}
              />
            </div>

            {saveError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
                {saveError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary justify-center"
              >
                {isSaving ? 'Saving…' : 'Save application'}
              </button>
              <button
                type="button"
                onClick={closeSaveForm}
                disabled={isSaving}
                className="btn-secondary justify-center"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {!embedded && !authChecked && (
        <span className="sr-only" aria-live="polite">
          Checking sign-in status…
        </span>
      )}
    </div>
  )
}
