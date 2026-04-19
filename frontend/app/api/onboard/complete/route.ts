import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const backendUrl = process.env.BACKEND_URL || 'https://csdcsynapse-production.up.railway.app'
  const res = await fetch(`${backendUrl}/onboard/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = { message: text } }
  return NextResponse.json(data, { status: res.status })
}
