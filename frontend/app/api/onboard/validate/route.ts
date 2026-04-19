import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  const backendUrl = process.env.BACKEND_URL || 'https://csdcsynapse-production.up.railway.app'
  const res = await fetch(`${backendUrl}/onboard/validate?token=${token}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
