import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServerClient } from '@/lib/supabase'
import { getDigestItems } from '@/lib/items'
import { sendDigestEmail } from '@/lib/email'
import type { Item } from '@/types'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const expected = process.env.CRON_SECRET ?? ''

  if (
    !expected ||
    secret.length !== expected.length ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase.from('items').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { expired, expiringSoon } = getDigestItems(data as Item[])

  if (expired.length === 0 && expiringSoon.length === 0) {
    return NextResponse.json({ message: 'Nothing to report — no email sent' })
  }

  try {
    await sendDigestEmail(expired, expiringSoon)
  } catch (err) {
    console.error('Failed to send digest email:', err)
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
  }

  return NextResponse.json({
    message: `Email sent — ${expired.length} expired, ${expiringSoon.length} expiring soon`,
  })
}
