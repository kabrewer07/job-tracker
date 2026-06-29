'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

function LayoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="0.5" />
      <rect x="9" y="2" width="5" height="5" rx="0.5" />
      <rect x="2" y="9" width="5" height="5" rx="0.5" />
      <rect x="9" y="9" width="5" height="5" rx="0.5" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="0.75" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="2" y1="10" x2="14" y2="10" />
      <line x1="6" y1="2" x2="6" y2="14" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5l1 3.5h3.5l-2.8 2 1 3.5L8 9l-2.7 1.5 1-3.5-2.8-2H7L8 1.5z" />
      <line x1="13" y1="2" x2="13" y2="3.5" />
      <line x1="13.75" y1="2.75" x2="12.25" y2="2.75" />
    </svg>
  )
}

function RadarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
      <line x1="8" y1="2.5" x2="8" y2="5" />
      <line x1="8" y1="11" x2="8" y2="13.5" />
      <line x1="2.5" y1="8" x2="5" y2="8" />
      <line x1="11" y1="8" x2="13.5" y2="8" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      <polyline points="11 11 14 8 11 5" />
      <line x1="14" y1="8" x2="6" y2="8" />
    </svg>
  )
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutIcon /> },
  { href: '/dashboard/applications', label: 'Applications', icon: <TableIcon /> },
  { href: '/dashboard/analyze', label: 'AI Analyzer', icon: <SparkleIcon /> },
  { href: '/dashboard/monitor', label: 'Job Monitor', icon: <RadarIcon /> },
]

interface SidebarProps {
  email: string
  onClose?: () => void
}

export default function Sidebar({ email, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-52 shrink-0 h-full bg-white border-r border-slate-200">
      {/* Wordmark — hidden on mobile since the top bar shows it */}
      <div className="hidden md:flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
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

      {/* Mobile drawer header */}
      <div className="md:hidden flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
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
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
            aria-label="Close menu"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="section-title px-2 pb-1.5 pt-1">Workspace</p>
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors duration-75',
                isActive
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <span className={cn(isActive ? 'text-teal-600' : 'text-slate-400')}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User / sign out */}
      <div className="border-t border-slate-100 px-3 py-3">
        <p
          className="text-xs text-slate-500 truncate mb-2 font-mono"
          title={email}
        >
          {email}
        </p>
        <button
          onClick={handleSignOut}
          className="btn-ghost w-full justify-start text-xs text-slate-400 hover:text-slate-600 px-1"
        >
          <LogOutIcon />
          Sign out
        </button>
      </div>
    </aside>
  )
}
