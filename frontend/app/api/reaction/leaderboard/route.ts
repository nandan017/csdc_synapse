import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const res = await fetch(`${BACKEND_URL}/reaction/leaderboard`, {
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
