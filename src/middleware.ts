import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSafeRedirectPath } from '@/lib/utils'
import { NextResponse, type NextRequest } from 'next/server'

function loginRedirectUrl(request: NextRequest, next?: string | null) {
  const url = new URL(request.url)
  url.pathname = '/'
  url.search = ''
  url.searchParams.set('login', '1')
  if (next) {
    url.searchParams.set('next', getSafeRedirectPath(next))
  }
  return url
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session token — must not be short-circuited
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (pathname === '/login') {
    const url = loginRedirectUrl(
      request,
      request.nextUrl.searchParams.get('next')
    )
    const error = request.nextUrl.searchParams.get('error')
    if (error) url.searchParams.set('error', error)
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.searchParams.get('login') === '1') {
    const next = getSafeRedirectPath(request.nextUrl.searchParams.get('next'))
    return NextResponse.redirect(new URL(next, request.url))
  }

  if (user && pathname === '/analyze') {
    return NextResponse.redirect(new URL('/dashboard/analyze', request.url))
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(loginRedirectUrl(request, pathname))
  }

  if (!user && pathname === '/auth/update-password') {
    return NextResponse.redirect(
      loginRedirectUrl(request, '/auth/update-password')
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
