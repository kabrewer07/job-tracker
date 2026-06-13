import { cn } from '@/lib/utils'
import type { ApplicationStatus } from '@/lib/types'

const statusConfig: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  saved: {
    label: 'Not applied yet',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  applied: {
    label: 'Applied',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  interviewing: {
    label: 'Interviewing',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  offer: {
    label: 'Offer',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-600 border-rose-200',
  },
}

export default function StatusBadge({
  status,
  size = 'sm',
}: {
  status: ApplicationStatus
  size?: 'xs' | 'sm'
}) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center border font-medium rounded-sm leading-none',
        size === 'xs' ? 'text-2xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
