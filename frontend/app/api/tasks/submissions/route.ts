import { NextRequest, NextResponse } from 'next/server'
const B = process.env.BACKEND_URL || 'http://localhost:8000'
export async function GET(req: NextRequest) {
  const res = await fetch(`${B}/tasks/submissions${req.nextUrl.search}`, { cache:'no-store' })
  return NextResponse.json(await res.json(), { status: res.status })
}
export async function POST(req: NextRequest) {
  const res = await fetch(`${B}/tasks/submit`, { method:'POST', headers:{'Content-Type':'application/json'}, body: await req.text() })
  return NextResponse.json(await res.json(), { status: res.status })
}
