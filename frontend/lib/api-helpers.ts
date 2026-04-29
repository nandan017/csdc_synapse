import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Builds headers object with Content-Type and Supabase JWT
 * forwarded from the request cookies.
 */
export async function getAuthHeaders(request: NextRequest): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch {
    // If session extraction fails, proceed without auth
  }

  return headers
}

export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
