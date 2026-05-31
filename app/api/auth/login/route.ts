import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  if (!process.env.FAMILY_PASSWORD) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  let password: unknown
  try {
    ;({ password } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof password !== 'string' || password !== process.env.FAMILY_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
