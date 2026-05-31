export type ItemStatus = 'expired' | 'expiring_soon' | 'ok'

export interface Item {
  id: string
  barcode: string
  name: string
  expiry_date: string // ISO date: "2026-06-15"
  photo_url: string | null
  created_at: string
}
