import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
  const res = await fetch(`${backendUrl}/u/${params.uid}`, {
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
