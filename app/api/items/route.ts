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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { barcode, name, expiry_date, photo_url, quantity, category_id } = body

  if (!barcode || !name || !expiry_date) {
    return NextResponse.json({ error: 'barcode, name, and expiry_date are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      barcode,
      name,
      expiry_date,
      photo_url: photo_url ?? null,
      quantity: typeof quantity === 'number' && quantity > 0 ? quantity : 1,
      category_id: category_id ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Item, { status: 201 })
}
