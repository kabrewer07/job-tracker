'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'

function HamburgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="14" y2="12" />
    </svg>
  )
}

export default function NavShell({
  email,
  children,
}: {
  email: string
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on md+ */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
          'md:relative md:translate-x-0 md:z-auto md:transition-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar email={email} onClose={() => setMobileOpen(false)} />
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-500 hover:text-slate-700 p-1 -ml-1 rounded"
            aria-label="Open menu"
          >
            <HamburgerIcon />
          </button>
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
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
