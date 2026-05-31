import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Item } from '@/types'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Item[])
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { barcode, name, expiry_date, photo_url } = await request.json()

  const { data, error } = await supabase
    .from('items')
    .insert({ barcode, name, expiry_date, photo_url: photo_url ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Item, { status: 201 })
}
