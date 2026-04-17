import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_EMAILS = [
  'chathuryastudentdevclub@gmail.com',
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

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
  const user = session?.user

  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}