import type { Item, ItemStatus } from '@/types'

export function getItemStatus(expiryDate: string): ItemStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate + 'T00:00:00')

  if (expiry <= today) return 'expired'

  const sevenDaysOut = new Date(today)
  sevenDaysOut.setDate(today.getDate() + 7)

  if (expiry <= sevenDaysOut) return 'expiring_soon'

  return 'ok'
}

const STATUS_ORDER: Record<ItemStatus, number> = {
  expired: 0,
  expiring_soon: 1,
  ok: 2,
}

export function sortItems(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) =>
      STATUS_ORDER[getItemStatus(a.expiry_date)] - STATUS_ORDER[getItemStatus(b.expiry_date)] ||
      a.expiry_date.localeCompare(b.expiry_date)
  )
}

export function getDigestItems(items: Item[]): { expired: Item[]; expiringSoon: Item[] } {
  return {
    expired: items.filter(i => getItemStatus(i.expiry_date) === 'expired'),
    expiringSoon: items.filter(i => getItemStatus(i.expiry_date) === 'expiring_soon'),
  }
}
