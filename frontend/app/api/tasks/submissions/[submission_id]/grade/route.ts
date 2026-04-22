import { NextRequest, NextResponse } from 'next/server'
const B = process.env.BACKEND_URL || 'http://localhost:8000'
export async function PATCH(req: NextRequest, { params }: { params: { submission_id: string } }) {
  const res = await fetch(`${B}/tasks/submissions/${params.submission_id}/grade`, {
    method:'PATCH', headers:{'Content-Type':'application/json'}, body: await req.text()
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
