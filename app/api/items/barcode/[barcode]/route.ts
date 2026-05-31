import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (error) return NextResponse.json(null, { status: 404 })
  return NextResponse.json(data)
}
