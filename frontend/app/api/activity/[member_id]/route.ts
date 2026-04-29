import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, BACKEND_URL } from '@/lib/api-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: { member_id: string } }
) {
  const headers = await getAuthHeaders(req)
  const res = await fetch(`${BACKEND_URL}/activity/${params.member_id}`, {
    cache: 'no-store',
    headers,
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
