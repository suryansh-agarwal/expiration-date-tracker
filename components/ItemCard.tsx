import Image from 'next/image'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { getItemStatus } from '@/lib/items'
import type { Item, ItemStatus } from '@/types'

const STATUS_ACCENT: Record<ItemStatus, string> = {
  expired: 'border-l-red-400 bg-red-50/30',
  expiring_soon: 'border-l-amber-400 bg-amber-50/20',
  ok: 'border-l-emerald-400 bg-white',
}

export default function ItemCard({ item }: { item: Item }) {
  const status = getItemStatus(item.expiry_date)
  const formattedDate = new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/item/${item.id}`}
      aria-label={item.name}
      className={`block border-l-4 rounded-2xl shadow-sm overflow-hidden
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        ${STATUS_ACCENT[status]}`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {item.photo_url && (
          <Image
            src={item.photo_url}
            alt={item.name}
            width={52}
            height={52}
            className="w-13 h-13 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-slate-800 truncate text-[15px]">{item.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">Expires {formattedDate}</p>
        </div>
        <StatusBadge status={status} />
      </div>
    </Link>
  )
}
