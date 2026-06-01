import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { normalizeBarcode } from '@/lib/items'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params
  const supabase = createServerClient()

  // Try the normalized form first, then the raw value, then the alternate
  // (covers items stored before normalization was added)
  const normalized = normalizeBarcode(barcode)
  const candidates = Array.from(new Set([normalized, barcode]))

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('barcode', candidate)
      .single()
    if (!error && data) return NextResponse.json(data)
  }

  return NextResponse.json(null, { status: 404 })
}
