import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, BACKEND_URL } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  const headers = await getAuthHeaders(request)
  const body = await request.json()
  const res = await fetch(`${BACKEND_URL}/reaction/attempt`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
