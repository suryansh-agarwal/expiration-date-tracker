'use client'

import { useState } from 'react'
import ItemCard from '@/components/ItemCard'
import { getItemStatus } from '@/lib/items'
import type { Item, Category, ItemStatus } from '@/types'

type StatusFilter = 'all' | ItemStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'ok', label: 'Good' },
]

export default function DashboardFilters({
  items,
  categories,
  initialCategoryId = null,
}: {
  items: Item[]
  categories: Category[]
  initialCategoryId?: string | null
}) {
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(initialCategoryId)

  const statusCounts: Record<StatusFilter, number> = {
    all: items.length,
    expired: 0,
    expiring_soon: 0,
    ok: 0,
  }
  for (const item of items) {
    statusCounts[getItemStatus(item.expiry_date)]++
  }

  const categoriesWithItems = categories.filter(cat =>
    items.some(i => i.category_id === cat.id)
  )
  const hasUncategorised = items.some(i => i.category_id === null)

  const filtered = items.filter(item => {
    const statusMatch = activeStatus === 'all' || getItemStatus(item.expiry_date) === activeStatus
    const catMatch = activeCategoryId === null
      ? true
      : activeCategoryId === '__none__'
        ? item.category_id === null
        : item.category_id === activeCategoryId
    return statusMatch && catMatch
  })

  return (
    <div className="space-y-3 animate-fade-up">
      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map(tab => {
          const count = statusCounts[tab.value]
          if (tab.value !== 'all' && count === 0) return null
          const isActive = activeStatus === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-2 flex items-center gap-1.5
                ${isActive
                  ? 'border-violet-400 bg-violet-600 text-white shadow-sm shadow-violet-300/40'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-600'}`}
            >
              {tab.label}
              {tab.value !== 'all' && (
                <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold leading-4
                  ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Category chips */}
      {(categoriesWithItems.length > 0 || hasUncategorised) && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveCategoryId(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border-2
              ${activeCategoryId === null
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-400 hover:border-violet-200'}`}
          >
            All categories
          </button>
          {categoriesWithItems.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id === activeCategoryId ? null : cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border-2
                ${activeCategoryId === cat.id
                  ? 'border-violet-300 bg-violet-50 text-violet-700'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-violet-200'}`}
            >
              {cat.name}
            </button>
          ))}
          {hasUncategorised && (
            <button
              onClick={() => setActiveCategoryId(activeCategoryId === '__none__' ? null : '__none__')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border-2
                ${activeCategoryId === '__none__'
                  ? 'border-violet-300 bg-violet-50 text-violet-700'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-violet-200'}`}
            >
              Uncategorised
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-400 text-sm">No items match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
