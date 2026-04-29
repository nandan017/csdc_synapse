import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, BACKEND_URL } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const headers = await getAuthHeaders(req)
  const res = await fetch(`${BACKEND_URL}/tasks/${req.nextUrl.search}`, {
    cache: 'no-store',
    headers,
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function POST(req: NextRequest) {
  const headers = await getAuthHeaders(req)
  const res = await fetch(`${BACKEND_URL}/tasks/`, {
    method: 'POST',
    headers,
    body: await req.text(),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
