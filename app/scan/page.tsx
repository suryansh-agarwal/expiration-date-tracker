'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false })

type ScanState =
  | { stage: 'scanning' }
  | { stage: 'found'; itemId: string; name: string }
  | { stage: 'new'; barcode: string }

export default function ScanPage() {
  const [state, setState] = useState<ScanState>({ stage: 'scanning' })
  const [name, setName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const router = useRouter()

  const handleScan = useCallback(async (barcode: string) => {
    const res = await fetch(`/api/items/barcode/${encodeURIComponent(barcode)}`)
    if (res.ok) {
      const item = await res.json()
      setState({ stage: 'found', itemId: item.id, name: item.name })
    } else {
      setState({ stage: 'new', barcode })
    }
  }, [])

  async function handleSave() {
    if (state.stage !== 'new') return
    setSaving(true)
    setSaveError('')

    try {
      let photoUrl: string | null = null
      if (photo) {
        const fd = new FormData()
        fd.append('file', photo)
        fd.append('barcode', state.barcode)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) {
          setSaveError('Photo upload failed. Please try again.')
          return
        }
        const { url } = await uploadRes.json()
        photoUrl = url
      }

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: state.barcode,
          name,
          expiry_date: expiryDate,
          photo_url: photoUrl,
        }),
      })

      if (!res.ok) {
        setSaveError('Failed to save item. Please try again.')
        return
      }

      router.push('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  if (state.stage === 'found') {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Item Found</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-2xl font-semibold text-gray-800 mb-4">{state.name}</p>
          <button
            onClick={() => router.push(`/item/${state.itemId}`)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
          >
            View Item
          </button>
        </div>
        <button
          onClick={() => {
            setName('')
            setExpiryDate('')
            setPhoto(null)
            setSaveError('')
            setState({ stage: 'scanning' })
          }}
          className="mt-4 text-gray-500 text-sm w-full text-center"
        >
          Scan another
        </button>
      </main>
    )
  }

  if (state.stage === 'new') {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">New Item</h1>
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Whole Milk"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500"
            />
          </div>
          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={!name || !expiryDate || saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Item'}
          </button>
        </div>
        <button
          onClick={() => {
            setName('')
            setExpiryDate('')
            setPhoto(null)
            setSaveError('')
            setState({ stage: 'scanning' })
          }}
          className="mt-4 text-gray-500 text-sm w-full text-center"
        >
          ← Back to scanner
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Scan Barcode</h1>
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">
          Cancel
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Point your camera at a barcode to scan it.</p>
      <BarcodeScanner onScan={handleScan} />
    </main>
  )
}
