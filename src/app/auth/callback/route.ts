import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getPostLoginPath } from '@/lib/utils'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_NEXT_COOKIE = 'auth-next'

function resolvePostLoginPath(request: NextRequest, searchParams: URLSearchParams) {
  const fromQuery = searchParams.get('next')
  if (fromQuery) return getPostLoginPath(fromQuery)

  const fromCookie = request.cookies.get(AUTH_NEXT_COOKIE)?.value
  if (fromCookie) return getPostLoginPath(decodeURIComponent(fromCookie))

  return getPostLoginPath(null)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = resolvePostLoginPath(request, searchParams)

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(
            cookiesToSet: {
              name: string
              value: string
              options?: CookieOptions
            }[]
          ) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      response.cookies.delete(AUTH_NEXT_COOKIE)
      return response
    }
  }

  const failUrl = new URL('/', origin)
  failUrl.searchParams.set('login', '1')
  failUrl.searchParams.set('error', 'auth')
  failUrl.searchParams.set('next', next)
  const failResponse = NextResponse.redirect(failUrl)
  failResponse.cookies.delete(AUTH_NEXT_COOKIE)
  return failResponse
}
