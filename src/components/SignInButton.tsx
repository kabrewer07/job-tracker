'use client'

import { useLoginModal } from './LoginModalProvider'

export default function SignInButton({
  next = '/dashboard',
  className,
  children,
  onBeforeOpen,
}: {
  next?: string
  className?: string
  children: React.ReactNode
  onBeforeOpen?: () => void
}) {
  const { openLogin } = useLoginModal()

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onBeforeOpen?.()
        openLogin(next)
      }}
    >
      {children}
    </button>
  )
}
