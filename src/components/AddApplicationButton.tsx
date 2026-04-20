'use client'

import { useState } from 'react'
import Modal from './Modal'
import ApplicationForm from './ApplicationForm'

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  )
}

export default function AddApplicationButton({
  label = 'Add application',
  className,
}: {
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? 'btn-primary text-xs'}>
        <PlusIcon />
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add application">
        <ApplicationForm
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  )
}
