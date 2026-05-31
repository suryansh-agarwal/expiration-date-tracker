'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import { getItemStatus } from '@/lib/items'
import type { Item } from '@/types'

export default function ItemPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<Item | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then(r => r.json())
      .then(data => {
        setItem(data)
        setName(data.name)
        setExpiryDate(data.expiry_date)
      })
  }, [id])

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, expiry_date: expiryDate }),
      })
      if (!res.ok) {
        setSaveError('Failed to save. Please try again.')
        return
      }
      const updated = await res.json()
      setItem(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  if (!item) {
    return <div className="p-6 text-center text-gray-400">Loading...</div>
  }

  const formattedDate = new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">
          ← Back
        </button>
        <button
          onClick={() => {
            setEditing(!editing)
            setSaveError('')
          }}
          className="text-blue-600 text-sm font-medium"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {item.photo_url && (
        <img
          src={item.photo_url}
          alt={item.name}
          className="w-full h-48 object-cover rounded-xl mb-4"
        />
      )}

      {editing ? (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={!name || !expiryDate || saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{item.name}</h1>
            <StatusBadge status={getItemStatus(item.expiry_date)} />
          </div>
          <p className="text-gray-500 mt-2">Expires {formattedDate}</p>
          <p className="text-gray-400 text-xs mt-1">Barcode: {item.barcode}</p>
        </div>
      )}

      <div className="mt-6">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full text-red-500 text-sm py-2 rounded-lg hover:bg-red-50"
          >
            Delete item
          </button>
        ) : (
          <div className="bg-red-50 rounded-xl p-4 text-center space-y-3">
            <p className="text-red-700 font-medium">Delete this item?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
