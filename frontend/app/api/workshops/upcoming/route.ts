import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const B = process.env.BACKEND_URL || 'http://localhost:8000'
    const res = await fetch(`${B}/admin/workshops/upcoming`, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 })
  }
}
