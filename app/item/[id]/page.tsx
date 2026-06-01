'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, CalendarDays, Barcode, Package, Tag } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import CategorySelector from '@/components/CategorySelector'
import { getItemStatus } from '@/lib/items'
import type { Item, Category } from '@/types'

const STATUS_GRADIENT: Record<string, string> = {
  expired: 'from-red-50 to-white',
  expiring_soon: 'from-amber-50 to-white',
  ok: 'from-emerald-50 to-white',
}

export default function ItemPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<Item | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/items/${id}`, { signal: controller.signal })
      .then(r => r.json())
      .then((data: Item) => {
        setItem(data)
        setName(data.name)
        setExpiryDate(data.expiry_date)
        setQuantity(data.quantity ?? 1)
        setCategoryId(data.category_id ?? null)
      })
      .catch(() => {})
    fetch('/api/categories')
      .then(r => r.json())
      .then((data: Category[]) => setCategories(data))
      .catch(() => {})
    return () => controller.abort()
  }, [id])

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, expiry_date: expiryDate, quantity, category_id: categoryId }),
      })
      if (!res.ok) {
        setSaveError('Failed to save. Please try again.')
        return
      }
      const updated: Item = await res.json()
      setItem(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setDeleteError('Failed to delete item. Please try again.')
      setConfirmDelete(false)
      return
    }
    router.push('/dashboard')
  }

  const inputClass = `w-full border-2 border-violet-100 rounded-2xl px-4 py-3
    text-slate-800 placeholder:text-slate-400 text-sm
    focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100
    transition-colors bg-white`

  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5'

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0EDFB' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  const status = getItemStatus(item.expiry_date)
  const formattedDate = new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  const categoryName = categories.find(c => c.id === item.category_id)?.name ?? null

  return (
    <main className="max-w-lg mx-auto px-4 py-6 animate-fade-up">
      {/* Nav */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={() => { setEditing(e => !e); setSaveError('') }}
          className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer
            ${editing
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}
        >
          <Pencil size={13} />
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Photo */}
      {item.photo_url && (
        <img
          src={item.photo_url}
          alt={item.name}
          className="w-full h-52 object-cover rounded-3xl mb-4 shadow-md"
        />
      )}

      {/* Detail / Edit card */}
      {editing ? (
        <div className="bg-white rounded-3xl shadow-md shadow-violet-100/50 p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-slate-800 mb-2">Edit Item</h2>

          {/* Name */}
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Expiry date */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} className="text-violet-400" />
                Expiry date
              </span>
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className={labelClass}>Quantity</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 font-bold text-lg flex items-center justify-center hover:bg-violet-100 transition-colors cursor-pointer"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center border-2 border-violet-100 rounded-xl px-2 py-2.5 text-slate-800 text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white"
              />
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 font-bold text-lg flex items-center justify-center hover:bg-violet-100 transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <Tag size={14} className="text-violet-400" />
                Category
                <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </span>
            </label>
            <CategorySelector
              categories={categories}
              value={categoryId}
              onChange={(newId, newCat) => {
                if (newCat) setCategories(prev => [...prev, newCat])
                setCategoryId(newId)
              }}
            />
          </div>

          {saveError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" aria-hidden />
              <p className="text-red-600 text-sm">{saveError}</p>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={!name || !expiryDate || saving}
            className="w-full text-white py-3.5 rounded-2xl font-semibold text-sm
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:opacity-90 active:scale-[0.97] transition-all
              shadow-md shadow-violet-300/40 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : 'Save Changes'}
          </button>
        </div>
      ) : (
        <div className={`bg-gradient-to-b ${STATUS_GRADIENT[status]} rounded-3xl shadow-md p-6`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="font-heading text-2xl font-bold text-slate-800 leading-tight">{item.name}</h1>
            <StatusBadge status={status} />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-sm">
              <CalendarDays size={14} className="text-slate-400 flex-shrink-0" />
              <span>Expires {formattedDate}</span>
            </div>

            {item.quantity > 1 && (
              <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                <Package size={14} className="text-slate-400 flex-shrink-0" />
                <span>{item.quantity} in stock</span>
              </div>
            )}

            {categoryName && (
              <div className="flex items-center gap-1.5 text-sm">
                <Tag size={14} className="text-violet-400 flex-shrink-0" />
                <span className="bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {categoryName}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-400 text-xs pt-1">
              <Barcode size={13} className="flex-shrink-0" />
              <span className="font-mono">{item.barcode}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete section */}
      <div className="mt-5">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 text-red-400 text-sm py-3 rounded-2xl
              hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
          >
            <Trash2 size={15} />
            Delete item
          </button>
        ) : (
          <div className="bg-red-50 rounded-3xl p-5 text-center space-y-3 border border-red-100">
            <p className="font-heading text-red-700 font-bold">Delete this item?</p>
            <p className="text-red-500 text-sm">This can&apos;t be undone.</p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm
                  hover:bg-white transition-all cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-semibold
                  hover:bg-red-600 active:scale-[0.97] transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        )}
        {deleteError && (
          <p className="text-red-500 text-sm mt-2 text-center">{deleteError}</p>
        )}
      </div>
    </main>
  )
}
