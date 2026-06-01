import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getDigestItems } from '@/lib/items'
import { sendDigestEmail } from '@/lib/email'
import type { Item } from '@/types'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase.from('items').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { expired, expiringSoon } = getDigestItems(data as Item[])

  if (expired.length === 0 && expiringSoon.length === 0) {
    return NextResponse.json({ message: 'Nothing to report — no email sent' })
  }

  await sendDigestEmail(expired, expiringSoon)
  return NextResponse.json({
    message: `Email sent — ${expired.length} expired, ${expiringSoon.length} expiring soon`,
  })
}
