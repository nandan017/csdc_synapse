import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Whitelist of emails that can access admin
// Add your email here after creating your Supabase auth account
const ADMIN_EMAILS = [
  'chathuryastudentdevclub@gmail.com',
  // add your personal email here too
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Only protect /admin routes (except /admin/login)
  if (!req.nextUrl.pathname.startsWith('/admin')) return res
  if (req.nextUrl.pathname === '/admin/login') return res

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Not logged in → redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  // Logged in but not admin email → redirect to home
  if (!ADMIN_EMAILS.includes(session.user.email ?? '')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
