import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const B = process.env.BACKEND_URL || 'http://localhost:8000'
  const res = await fetch(`${B}/auth/verify-otp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
