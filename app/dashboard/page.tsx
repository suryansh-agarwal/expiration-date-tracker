export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ScanLine, LogOut } from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import { sortItems, getItemStatus } from '@/lib/items'
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

  const expired = items.filter(i => getItemStatus(i.expiry_date) === 'expired').length
  const expiringSoon = items.filter(i => getItemStatus(i.expiry_date) === 'expiring_soon').length
  const ok = items.filter(i => getItemStatus(i.expiry_date) === 'ok').length

  return (
    <main className="relative max-w-lg mx-auto px-4 py-6 min-h-screen overflow-x-hidden">

      {/* Decorative blobs */}
      <div
        className="animate-blob pointer-events-none fixed -top-20 -right-20 w-64 h-64 opacity-20 -z-10"
        style={{ backgroundColor: '#A78BFA', borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
      />
      <div
        className="animate-blob pointer-events-none fixed bottom-20 -left-16 w-56 h-56 opacity-15 -z-10"
        style={{ backgroundColor: '#6EE7B7', borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%', animationDelay: '6s' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-3xl font-bold" style={{ color: '#5B21B6' }}>
            Expiry Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {items.length === 0 ? 'No items yet' : `${items.length} item${items.length !== 1 ? 's' : ''} tracked`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/scan"
            className="flex items-center gap-1.5 text-white px-4 py-2.5 rounded-2xl font-semibold text-sm
              hover:opacity-90 active:scale-[0.97] transition-all duration-150 shadow-md shadow-violet-300/40"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
          >
            <ScanLine size={15} />
            Scan
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-slate-500 text-sm px-3 py-2.5 rounded-2xl
                hover:bg-white/60 hover:text-slate-700 transition-all duration-150 cursor-pointer"
              aria-label="Log out"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Stats pills */}
      {items.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap animate-fade-up">
          {expired > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 ring-1 ring-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden />
              {expired} expired
            </span>
          )}
          {expiringSoon > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" aria-hidden />
              {expiringSoon} expiring soon
            </span>
          )}
          {ok > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 ring-1 ring-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden />
              {ok} good
            </span>
          )}
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 animate-float shadow-lg"
            style={{ background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)' }}
          >
            <span className="text-4xl" role="img" aria-label="grocery bag">🛒</span>
          </div>
          <p className="font-heading text-xl font-semibold text-slate-700 mb-1">Nothing here yet!</p>
          <p className="text-slate-400 text-sm mb-6">Scan a barcode to track your first item.</p>
          <Link
            href="/scan"
            className="flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-semibold text-sm
              hover:opacity-90 active:scale-[0.97] transition-all shadow-md shadow-violet-300/40"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
          >
            <ScanLine size={16} />
            Scan your first item
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5 animate-fade-up">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  )
}
