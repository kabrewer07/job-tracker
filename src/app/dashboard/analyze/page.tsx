import type { Metadata } from 'next'
import JobAnalyzer from '@/components/JobAnalyzer'

export const metadata: Metadata = { title: 'AI Analyzer' }

export default function DashboardAnalyzePage() {
  return (
    <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-3xl">
      <div className="mb-4 sm:mb-5">
        <h1 className="text-base font-semibold text-slate-900">
          AI Job Description Analyzer
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Paste a job posting and get an AI-powered breakdown — save results straight to your tracker.
        </p>
      </div>

      <JobAnalyzer embedded />
    </div>
  )
}
