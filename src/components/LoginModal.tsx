'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPostLoginPath } from '@/lib/utils'
import Modal from './Modal'

const SHOW_EMAIL_AUTH = false
const AUTH_NEXT_COOKIE = 'auth-next'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export interface LoginModalProps {
  open: boolean
  onClose: () => void
  next?: string
  initialError?: string | null
}

export default function LoginModal({
  open,
  onClose,
  next: nextProp,
  initialError = null,
}: LoginModalProps) {
  const router = useRouter()
  const next = getPostLoginPath(nextProp)

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(initialError)
    setMessage(null)
    setMode('signin')
    setEmail('')
    setPassword('')
  }, [open, initialError])

  function resetFeedback() {
    setError(null)
    setMessage(null)
  }

  function authRedirectPath(path: string) {
    return `${window.location.origin}${path}`
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    resetFeedback()

    document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; SameSite=Lax`

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirectPath(
          `/auth/callback?next=${encodeURIComponent(next)}`
        ),
      },
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    resetFeedback()

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: authRedirectPath('/auth/callback?next=/auth/update-password'),
      }
    )

    if (resetError) {
      setError(resetError.message)
    } else {
      setMessage(
        'If an account exists for that email, we sent a reset link. Click it to set your password.'
      )
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    resetFeedback()

    const supabase = createClient()

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      onClose()
      router.push(next)
      router.refresh()
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.session) {
        onClose()
        router.push(next)
        router.refresh()
      } else {
        setMessage('Account created. Check your email to confirm, then sign in.')
        setMode('signin')
        setPassword('')
      }
    }

    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Sign in" size="sm">
      <div className="px-5 py-4">
        {SHOW_EMAIL_AUTH && mode === 'forgot' ? (
          <>
            <p className="text-xs text-slate-500 mb-4">
              Enter the email for your existing account. We&apos;ll send a link to
              set a password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label htmlFor="login-email" className="label">
                  Email address
                </label>
                <input
                  id="login-email"
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

              {message && (
                <p className="text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded px-2.5 py-1.5">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full justify-center"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500">
              <button
                type="button"
                className="text-teal-600 hover:text-teal-700 font-medium"
                onClick={() => {
                  setMode('signin')
                  resetFeedback()
                }}
              >
                Back to sign in
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-4">
              {SHOW_EMAIL_AUTH
                ? mode === 'signin'
                  ? 'Sign in with Google or your email and password.'
                  : 'Create an account with your email and password.'
                : 'Sign in with your Google account to continue.'}
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn-secondary w-full justify-center"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {SHOW_EMAIL_AUTH && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-2xs">
                    <span className="bg-white px-2 text-slate-400">or</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="login-email" className="label">
                      Email address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      className="input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="login-password" className="label mb-0">
                        Password
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          className="text-2xs text-teal-600 hover:text-teal-700 font-medium"
                          onClick={() => {
                            setMode('forgot')
                            resetFeedback()
                          }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      autoComplete={
                        mode === 'signin' ? 'current-password' : 'new-password'
                      }
                      required
                      minLength={6}
                      className="input"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
                      {error}
                    </p>
                  )}

                  {message && (
                    <p className="text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded px-2.5 py-1.5">
                      {message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="btn-primary w-full justify-center"
                  >
                    {loading
                      ? 'Please wait…'
                      : mode === 'signin'
                        ? 'Sign in'
                        : 'Create account'}
                  </button>
                </form>

                <p className="mt-4 text-center text-xs text-slate-500">
                  {mode === 'signin' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        className="text-teal-600 hover:text-teal-700 font-medium"
                        onClick={() => {
                          setMode('signup')
                          resetFeedback()
                        }}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        className="text-teal-600 hover:text-teal-700 font-medium"
                        onClick={() => {
                          setMode('signin')
                          resetFeedback()
                        }}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </>
            )}

            {!SHOW_EMAIL_AUTH && error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5 mt-3">
                {error}
              </p>
            )}
          </>
        )}

        <p className="mt-4 text-center text-2xs text-slate-400">
          Your data is private and secured with row-level security.
        </p>
      </div>
    </Modal>
  )
}
