import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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

function DocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
      <path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <polyline points="10 2 10 5 13 5" />
      <line x1="5" y1="9" x2="11" y2="9" />
      <line x1="5" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
      <rect x="2" y="2" width="12" height="12" rx="0.75" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="2" y1="10" x2="14" y2="10" />
      <line x1="6" y1="2" x2="6" y2="14" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
      <path d="M8 1.5l1.2 3.8H13l-3.1 2.3 1.2 3.8L8 9.1l-3.1 2.3 1.2-3.8L3 5.3h3.8L8 1.5z" />
      <line x1="13.5" y1="2" x2="14.5" y2="3" />
      <line x1="14" y1="1.5" x2="14" y2="2.5" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
      <rect x="2" y="2" width="12" height="12" rx="0.75" />
      <line x1="5" y1="11" x2="5" y2="8" />
      <line x1="8" y1="11" x2="8" y2="5" />
      <line x1="11" y1="11" x2="11" y2="7" />
    </svg>
  )
}

const features = [
  {
    icon: <DocumentIcon />,
    title: 'Save Job Descriptions',
    description: 'Paste the full posting before it disappears. Keep the original requirements on hand for every interview.',
  },
  {
    icon: <TableIcon />,
    title: 'Track Every Application',
    description: 'Company, role, status, dates, notes — everything in one searchable table instead of a messy spreadsheet.',
  },
  {
    icon: <SparkIcon />,
    title: 'AI Job Analyzer',
    description: 'Paste any JD and get an instant breakdown of requirements, nice-to-haves, and seniority signals.',
    note: 'Powered by OpenAI',
  },
  {
    icon: <ChartIcon />,
    title: 'Dashboard Insights',
    description: 'See your pipeline at a glance with status breakdowns and weekly activity so you know where you stand.',
  },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          <LogoWordmark />
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/analyze"
              className="text-xs sm:text-sm text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              Try AI Analyzer →
            </Link>
            {user ? (
              <Link href="/dashboard" className="btn-primary text-xs sm:text-sm">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="btn-primary text-xs sm:text-sm">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-slate-900 tracking-tight leading-tight">
              Track applications. Save job descriptions. Get AI-powered insights.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Job postings vanish fast. Save the full description before it&apos;s taken down,
              track every application in one place, and let AI help you understand what each
              role is really asking for.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/login" className="btn-primary justify-center px-5 py-2">
                Get started free
              </Link>
              <Link href="/analyze" className="btn-secondary justify-center px-5 py-2">
                Try the AI Analyzer
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white border border-slate-200 rounded-md p-5 sm:p-6"
              >
                <div className="mb-3">{feature.icon}</div>
                <h2 className="text-sm font-semibold text-slate-900 mb-1.5">
                  {feature.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
                {feature.note && (
                  <p className="mt-2 text-2xs text-slate-400">{feature.note}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* AI callout */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-12 sm:pb-20">
          <div className="bg-teal-50 border border-teal-100 rounded-md p-6 sm:p-8">
            <div className="max-w-2xl">
              <p className="text-2xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
                AI Job Analyzer
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight mb-3">
                Understand any posting in seconds
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                Paste any job description and instantly see what&apos;s required vs. nice-to-have,
                seniority signals, and what to highlight in your application. No signup required.
              </p>
              <Link href="/analyze" className="btn-primary inline-flex">
                Try the AI Analyzer
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-2xs text-slate-400">
          <p>Built with Next.js, Supabase, and OpenAI</p>
          <a
            href="https://github.com/kabrewer07/job-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-600 transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
