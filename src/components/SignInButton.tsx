'use client'

import { useLoginModal } from './LoginModalProvider'
import { POST_LOGIN_PATH } from '@/lib/utils'

export default function SignInButton({
  next = POST_LOGIN_PATH,
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
