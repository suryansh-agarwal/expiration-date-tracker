export type ItemStatus = 'expired' | 'expiring_soon' | 'ok'

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface Item {
  id: string
  barcode: string
  name: string
  expiry_date: string // ISO date: "2026-06-15"
  photo_url: string | null
  quantity: number
  category_id: string | null
  created_at: string
}
