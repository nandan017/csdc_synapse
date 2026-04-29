import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, BACKEND_URL } from '@/lib/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: { submission_id: string } }) {
  const headers = await getAuthHeaders(req)
  const res = await fetch(`${BACKEND_URL}/tasks/submissions/${params.submission_id}/grade`, {
    method: 'PATCH',
    headers,
    body: await req.text(),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
