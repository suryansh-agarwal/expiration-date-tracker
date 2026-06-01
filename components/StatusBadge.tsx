import type { ItemStatus } from '@/types'

const CONFIG: Record<ItemStatus, { label: string; classes: string; dotClass: string }> = {
  expired: {
    label: 'Expired',
    classes: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    dotClass: 'bg-red-500',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    classes: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200',
    dotClass: 'bg-yellow-500',
  },
  ok: {
    label: 'Good',
    classes: 'bg-green-100 text-green-700 ring-1 ring-green-200',
    dotClass: 'bg-green-500',
  },
}

export default function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, classes, dotClass } = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} aria-hidden="true" />
      {label}
    </span>
  )
}
