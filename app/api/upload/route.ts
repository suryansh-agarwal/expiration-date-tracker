import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  const barcode = formData.get('barcode')

  if (!(file instanceof File) || typeof barcode !== 'string' || !barcode) {
    return NextResponse.json({ error: 'Missing or invalid file or barcode' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are supported' }, { status: 400 })
  }

  const safeBarcode = barcode.replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `${safeBarcode}-${Date.now()}.${ext}`

  let buffer: Uint8Array
  try {
    buffer = new Uint8Array(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 400 })
  }

  const { error } = await supabase.storage
    .from('item-photos')
    .upload(fileName, buffer, { contentType: file.type })

  if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const { data } = supabase.storage.from('item-photos').getPublicUrl(fileName)
  return NextResponse.json({ url: data.publicUrl })
}
