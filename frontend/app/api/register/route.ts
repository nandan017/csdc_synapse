import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Safe parse — backend might return plain text on errors
    const text = await response.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text || 'Something went wrong.' }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Register proxy error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}