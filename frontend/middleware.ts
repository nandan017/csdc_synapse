import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = ['chathuryastudentdevclub@gmail.com']

export async function middleware(request: NextRequest) {
  // Don't protect the login page
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
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

  // ── Handle PKCE code exchange (password reset, email confirm, etc.) ──
  const code = request.nextUrl.searchParams.get('code')
  if (code && request.nextUrl.pathname === '/reset-password') {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Code exchanged successfully — redirect to clean URL (no ?code= param)
      const cleanUrl = request.nextUrl.clone()
      cleanUrl.searchParams.delete('code')

      const redirectResponse = NextResponse.redirect(cleanUrl)
      // Copy session cookies from supabaseResponse to the redirect
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        })
      })
      return redirectResponse
    }
    // If exchange fails, let the page handle it (will show error)
  }

  // ── Admin route protection ──
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    if (!ADMIN_EMAILS.includes(user.email ?? '')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/reset-password'],
}