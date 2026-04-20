'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <rect width="32" height="32" rx="6" fill="#0e7a8c"/>
              <rect x="8" y="8" width="7" height="7" rx="1" fill="white" opacity="0.9"/>
              <rect x="17" y="8" width="7" height="7" rx="1" fill="white" opacity="0.9"/>
              <rect x="8" y="17" width="7" height="7" rx="1" fill="white" opacity="0.9"/>
              <rect x="17" y="17" width="7" height="7" rx="1" fill="white" opacity="0.9"/>
            </svg>
            <span className="font-sans text-lg font-semibold text-slate-900 tracking-tight">
              Job Tracker
            </span>
          </div>
          <p className="text-xs text-slate-500 ml-7">
            Track every application. Stay organised.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-md p-6">
          {sent ? (
            <div className="text-center py-2">
              <div className="text-2xl mb-3">✉️</div>
              <p className="text-sm font-medium text-slate-900 mb-1">
                Check your inbox
              </p>
              <p className="text-xs text-slate-500">
                We sent a magic link to{' '}
                <span className="font-medium text-slate-700">{email}</span>.
                Click the link to sign in.
              </p>
              <button
                className="mt-4 text-xs text-teal-600 hover:text-teal-700 font-medium"
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-sm font-semibold text-slate-900 mb-0.5">
                Sign in
              </h1>
              <p className="text-xs text-slate-500 mb-5">
                Enter your email to receive a magic link — no password needed.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="email" className="label">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn-primary w-full justify-center"
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-2xs text-slate-400">
          Your data is private and secured with row-level security.
        </p>
      </div>
    </div>
  )
}
