'use client'

import { Suspense } from 'react'
import LoginModalProvider from './LoginModalProvider'

export default function AppProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <LoginModalProvider>{children}</LoginModalProvider>
    </Suspense>
  )
}
