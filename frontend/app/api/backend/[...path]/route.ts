import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const BACKEND = process.env.BACKEND_URL || 'https://csdcsynapse-production.up.railway.app'

async function handler(request: NextRequest) {
  const url = new URL(request.url)
  const backendPath = url.pathname.replace('/api/backend/', '/')
  const backendUrl = `${BACKEND}${backendPath}${url.search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Forward Supabase auth token from cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},  // proxy doesn't set cookies
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try { fetchOptions.body = await request.text() } catch {}
  }

  try {
    const res = await fetch(backendUrl, fetchOptions)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const PUT = handler
export const DELETE = handler
