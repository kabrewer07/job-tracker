'use client'

import Link from 'next/link'
import JobAnalyzer from '@/components/JobAnalyzer'
import SignInButton from '@/components/SignInButton'

function LogoWordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
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
    </Link>
  )
}

export default function PublicAnalyzeView() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          <LogoWordmark />
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="text-xs sm:text-sm text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              ← Back
            </Link>
            <SignInButton
              next="/dashboard/analyze"
              className="btn-primary text-xs sm:text-sm"
            >
              Sign in
            </SignInButton>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            AI Job Description Analyzer
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Paste any job posting and get an instant AI-powered breakdown. No signup required.
          </p>
        </div>

        <JobAnalyzer />
      </main>
    </div>
  )
}
