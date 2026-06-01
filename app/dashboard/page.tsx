export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ScanLine, LogOut, Tag } from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import { sortItems } from '@/lib/items'
import DashboardFilters from '@/components/DashboardFilters'
import type { Item, Category } from '@/types'

async function getData(): Promise<{ items: Item[]; categories: Category[] }> {
  const supabase = createServerClient()
  const [itemsRes, catsRes] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('categories').select('*').order('name', { ascending: true }),
  ])
  if (itemsRes.error) throw itemsRes.error
  return {
    items: sortItems((itemsRes.data as Item[]) ?? []),
    categories: (catsRes.data as Category[]) ?? [],
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { items, categories } = await getData()
  const { category } = await searchParams

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
            href="/categories"
            className="flex items-center gap-1.5 text-violet-600 px-3 py-2.5 rounded-2xl font-semibold text-sm
              hover:bg-violet-100 active:scale-[0.97] transition-all duration-150"
            aria-label="Categories"
          >
            <Tag size={15} />
          </Link>
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
        <DashboardFilters
          items={items}
          categories={categories}
          initialCategoryId={category ?? null}
        />
      )}
    </main>
  )
}
