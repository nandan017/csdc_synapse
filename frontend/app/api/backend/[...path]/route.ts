import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || 'https://csdcsynapse-production.up.railway.app'

async function handler(request: NextRequest) {
  // Extract the path after /api/backend/
  const url = new URL(request.url)
  const backendPath = url.pathname.replace('/api/backend/', '/')
  const backendUrl = `${BACKEND}${backendPath}${url.search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  }

  // Forward body for non-GET requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      fetchOptions.body = await request.text()
    } catch {
      // No body
    }
  }

  try {
    const res = await fetch(backendUrl, fetchOptions)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { detail: 'Backend unreachable' },
      { status: 502 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const PUT = handler
export const DELETE = handler
