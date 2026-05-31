import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { sortItems } from '@/lib/items'
import ItemCard from '@/components/ItemCard'
import type { Item } from '@/types'

async function getItems(): Promise<Item[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase.from('items').select('*')
  if (error) throw error
  return sortItems((data as Item[]) ?? [])
}

export default async function DashboardPage() {
  const items = await getItems()

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Expiry Tracker</h1>
        <div className="flex gap-2 items-center">
          <Link
            href="/scan"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
          >
            + Scan
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Logout
            </button>
          </form>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No items yet.</p>
          <p className="text-sm mt-1">Tap + Scan to add your first item.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  )
}
