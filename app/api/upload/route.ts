import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const formData = await request.formData()
  const file = formData.get('file') as File
  const barcode = formData.get('barcode') as string

  if (!file || !barcode) {
    return NextResponse.json({ error: 'Missing file or barcode' }, { status: 400 })
  }

  const fileName = `${barcode}-${Date.now()}.jpg`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('item-photos')
    .upload(fileName, buffer, { contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('item-photos').getPublicUrl(fileName)
  return NextResponse.json({ url: data.publicUrl })
}
