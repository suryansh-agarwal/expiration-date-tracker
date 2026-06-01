'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Category } from '@/types'

export default function CategorySelector({
  categories,
  value,
  onChange,
}: {
  categories: Category[]
  value: string | null
  onChange: (id: string | null, newCategory?: Category) => void
}) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  async function createCategory() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        const cat: Category = await res.json()
        onChange(cat.id, cat)
        setNewName('')
        setCreating(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-2
            ${value === null
              ? 'border-violet-400 bg-violet-100 text-violet-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200'}`}
        >
          Uncategorised
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-2
              ${value === cat.id
                ? 'border-violet-400 bg-violet-100 text-violet-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200'}`}
          >
            {cat.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreating(c => !c)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-dashed border-violet-200 text-violet-400 hover:border-violet-400 hover:text-violet-600 transition-all cursor-pointer flex items-center gap-1"
        >
          <Plus size={11} />
          New
        </button>
      </div>
      {creating && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Category name…"
            className="flex-1 border-2 border-violet-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') createCategory() }}
          />
          <button
            type="button"
            onClick={createCategory}
            disabled={!newName.trim() || saving}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
          >
            {saving ? '…' : 'Add'}
          </button>
        </div>
      )}
    </div>
  )
}
