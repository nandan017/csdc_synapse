import { NextResponse } from 'next/server'

export async function GET() {
  const B = process.env.BACKEND_URL || 'http://localhost:8000'
  const res = await fetch(`${B}/admin/workshops/upcoming`, { cache: 'no-store' })
  return NextResponse.json(await res.json(), { status: res.status })
}
