import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to wherever the flow intended (e.g. /reset-password)
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = next
      redirectUrl.searchParams.delete('code')
      redirectUrl.searchParams.delete('next')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If code exchange failed or no code, redirect to login with error
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/login'
  return NextResponse.redirect(redirectUrl)
}
