import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { member_id: string } }
) {
  const B = process.env.BACKEND_URL || 'http://localhost:8000'
  const res = await fetch(`${B}/activity/${params.member_id}`, { cache: 'no-store' })
  return NextResponse.json(await res.json(), { status: res.status })
}
