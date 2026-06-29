'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getPostLoginPath } from '@/lib/utils'
import LoginModal from './LoginModal'

interface LoginModalContextValue {
  openLogin: (next?: string) => void
}

const LoginModalContext = createContext<LoginModalContextValue | null>(null)

export function useLoginModal() {
  const context = useContext(LoginModalContext)
  if (!context) {
    throw new Error('useLoginModal must be used within LoginModalProvider')
  }
  return context
}

function stripLoginParams(
  pathname: string,
  searchParams: URLSearchParams
): string {
  const params = new URLSearchParams(searchParams.toString())
  params.delete('login')
  params.delete('next')
  params.delete('error')
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export default function LoginModalProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)
  const [next, setNext] = useState('/dashboard')
  const [initialError, setInitialError] = useState<string | null>(null)

  const closeLogin = useCallback(() => {
    setOpen(false)
    setInitialError(null)

    if (searchParams.get('login') === '1') {
      router.replace(stripLoginParams(pathname, searchParams))
    }
  }, [pathname, router, searchParams])

  const openLogin = useCallback((nextPath?: string) => {
    setNext(getPostLoginPath(nextPath))
    setInitialError(null)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (searchParams.get('login') !== '1') return

    setOpen(true)
    setNext(getPostLoginPath(searchParams.get('next')))

    if (searchParams.get('error') === 'auth') {
      setInitialError('Sign in failed. Please try again.')
    }
  }, [searchParams])

  return (
    <LoginModalContext.Provider value={{ openLogin }}>
      {children}
      <LoginModal
        open={open}
        onClose={closeLogin}
        next={next}
        initialError={initialError}
      />
    </LoginModalContext.Provider>
  )
}
