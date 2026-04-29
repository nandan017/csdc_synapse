import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, BACKEND_URL } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const headers = await getAuthHeaders(request)
  const res = await fetch(`${BACKEND_URL}/reaction/my-stats`, { headers })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
