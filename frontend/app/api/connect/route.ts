import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, BACKEND_URL } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const headers = await getAuthHeaders(req)
  const res = await fetch(`${BACKEND_URL}/connect/`, {
    method: 'POST',
    headers,
    body: await req.text(),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function GET(req: NextRequest) {
  const headers = await getAuthHeaders(req)
  const memberId = req.nextUrl.searchParams.get('member_id')
  if (!memberId) {
    return NextResponse.json({ data: [], count: 0 }, { status: 200 })
  }
  const res = await fetch(`${BACKEND_URL}/connect/${memberId}`, {
    cache: 'no-store',
    headers,
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
