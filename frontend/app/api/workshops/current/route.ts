import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, BACKEND_URL } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const headers = await getAuthHeaders(req)
    const res = await fetch(`${BACKEND_URL}/admin/workshops/current`, {
      cache: 'no-store',
      headers,
    })
    if (!res.ok) return NextResponse.json({ data: [] }, { status: 200 })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 })
  }
}
