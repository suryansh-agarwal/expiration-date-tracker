import Image from 'next/image'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { getItemStatus } from '@/lib/items'
import type { Item } from '@/types'

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
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        {item.photo_url && (
          <Image
            src={item.photo_url}
            alt={item.name}
            width={56}
            height={56}
            className="rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{item.name}</p>
          <p className="text-sm text-gray-500">Expires {formattedDate}</p>
        </div>
        <StatusBadge status={status} />
      </div>
    </Link>
  )
}
