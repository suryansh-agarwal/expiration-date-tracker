import type { ItemStatus } from '@/types'

const CONFIG: Record<ItemStatus, { label: string; classes: string }> = {
  expired: { label: 'Expired', classes: 'bg-red-100 text-red-700' },
  expiring_soon: { label: 'Expiring Soon', classes: 'bg-yellow-100 text-yellow-700' },
  ok: { label: 'Good', classes: 'bg-green-100 text-green-700' },
}

export default function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, classes } = CONFIG[status]
  return (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
