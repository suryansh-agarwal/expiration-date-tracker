export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowLeft, Tag, Package } from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import { getItemStatus } from '@/lib/items'
import type { Item, Category } from '@/types'

async function getData(): Promise<{ items: Item[]; categories: Category[] }> {
  const supabase = createServerClient()
  const [itemsRes, catsRes] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('categories').select('*').order('name', { ascending: true }),
  ])
  return {
    items: (itemsRes.data as Item[]) ?? [],
    categories: (catsRes.data as Category[]) ?? [],
  }
}

function statusSummary(items: Item[]): { expired: number; expiringSoon: number } {
  let expired = 0, expiringSoon = 0
  for (const item of items) {
    const s = getItemStatus(item.expiry_date)
    if (s === 'expired') expired++
    else if (s === 'expiring_soon') expiringSoon++
  }
  return { expired, expiringSoon }
}

export default async function CategoriesPage() {
  const { items, categories } = await getData()

  const uncategorised = items.filter(i => i.category_id === null)
  const categoriesWithCounts = categories.map(cat => ({
    ...cat,
    items: items.filter(i => i.category_id === cat.id),
  }))

  const totalCategories = categoriesWithCounts.filter(c => c.items.length > 0).length
    + (uncategorised.length > 0 ? 1 : 0)

  return (
    <main className="max-w-lg mx-auto px-4 py-6 min-h-screen animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Tag size={18} className="text-violet-500" />
          <h1 className="font-heading text-xl font-bold text-slate-800">Categories</h1>
        </div>
        <div className="flex-1" />
      </div>

      <p className="text-slate-400 text-sm text-center mb-6">
        {totalCategories === 0
          ? 'No categories yet — create one when adding an item.'
          : `${totalCategories} categor${totalCategories !== 1 ? 'ies' : 'y'}`}
      </p>

      {/* Category cards */}
      <div className="space-y-3">
        {categoriesWithCounts
          .filter(cat => cat.items.length > 0)
          .map(cat => {
            const { expired, expiringSoon } = statusSummary(cat.items)
            return (
              <Link
                key={cat.id}
                href={`/dashboard?category=${cat.id}`}
                className="block bg-white rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5
                  transition-all duration-200 p-4 border-l-4 border-l-violet-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Tag size={16} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-slate-800 text-[15px]">{cat.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {cat.items.length} item{cat.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {expired > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden />
                        {expired}
                      </span>
                    )}
                    {expiringSoon > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" aria-hidden />
                        {expiringSoon}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}

        {/* Uncategorised */}
        {uncategorised.length > 0 && (() => {
          const { expired, expiringSoon } = statusSummary(uncategorised)
          return (
            <Link
              href="/dashboard?category=__none__"
              className="block bg-white rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5
                transition-all duration-200 p-4 border-l-4 border-l-slate-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package size={16} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-slate-600 text-[15px]">Uncategorised</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {uncategorised.length} item{uncategorised.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {expired > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden />
                      {expired}
                    </span>
                  )}
                  {expiringSoon > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" aria-hidden />
                      {expiringSoon}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })()}

        {totalCategories === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 animate-float"
              style={{ background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)' }}
            >
              <Tag size={28} className="text-violet-400" />
            </div>
            <p className="font-heading text-lg font-semibold text-slate-600 mb-1">No categories yet</p>
            <p className="text-slate-400 text-sm mb-5">Add a category when you scan or enter an item.</p>
            <Link
              href="/scan"
              className="text-white px-5 py-2.5 rounded-2xl font-semibold text-sm
                hover:opacity-90 active:scale-[0.97] transition-all shadow-md shadow-violet-300/40"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
            >
              Add an item
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
