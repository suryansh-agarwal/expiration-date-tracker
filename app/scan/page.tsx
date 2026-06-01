'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Camera, CheckCircle2, Package, CalendarDays } from 'lucide-react'

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false })

type ScanState =
  | { stage: 'scanning' }
  | { stage: 'found'; itemId: string; name: string }
  | { stage: 'new'; barcode: string }

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm cursor-pointer"
    >
      <ArrowLeft size={16} />
      Back
    </button>
  )
}

export default function ScanPage() {
  const [state, setState] = useState<ScanState>({ stage: 'scanning' })
  const [name, setName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const router = useRouter()

  function resetToScanning() {
    setName('')
    setExpiryDate('')
    setPhoto(null)
    setSaveError('')
    setState({ stage: 'scanning' })
  }

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
        body: JSON.stringify({ barcode: state.barcode, name, expiry_date: expiryDate, photo_url: photoUrl }),
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

  const inputClass = `w-full border-2 border-violet-100 rounded-2xl px-4 py-3
    text-slate-800 placeholder:text-slate-400 text-sm
    focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100
    transition-colors bg-white`

  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5 font-heading'

  // Found stage
  if (state.stage === 'found') {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 animate-fade-up">
        <div className="mb-5">
          <BackButton onClick={resetToScanning} />
        </div>
        <div className="bg-white rounded-3xl shadow-md shadow-emerald-100/60 p-8 text-center border-l-4 border-l-emerald-400">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
          </div>
          <h2 className="font-heading text-xl font-bold text-slate-800 mb-1">Item Found!</h2>
          <p className="text-2xl font-semibold text-slate-700 mb-6">{state.name}</p>
          <button
            onClick={() => router.push(`/item/${state.itemId}`)}
            className="w-full text-white py-3.5 rounded-2xl font-semibold text-sm
              hover:opacity-90 active:scale-[0.97] transition-all shadow-md shadow-violet-300/40 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
          >
            View Item
          </button>
        </div>
        <button
          onClick={resetToScanning}
          className="mt-4 text-slate-400 text-sm w-full text-center hover:text-slate-600 transition-colors cursor-pointer py-2"
        >
          Scan another item
        </button>
      </main>
    )
  }

  // New item stage
  if (state.stage === 'new') {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-5">
          <BackButton onClick={resetToScanning} />
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-semibold">
            <Package size={12} />
            New item
          </div>
        </div>

        <h1 className="font-heading text-2xl font-bold text-slate-800 mb-5">Add Item</h1>

        <div className="bg-white rounded-3xl shadow-md shadow-violet-100/50 p-6 space-y-4">
          <div>
            <label className={labelClass}>Product name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Whole Milk"
              className={inputClass}
              autoFocus
            />
          </div>

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

          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <Camera size={14} className="text-violet-400" />
                Photo
                <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </span>
            </label>
            <label className="block w-full border-2 border-dashed border-violet-200 rounded-2xl px-4 py-3 text-sm text-slate-500 cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all">
              {photo ? (
                <span className="text-violet-600 font-medium">{photo.name}</span>
              ) : (
                'Tap to take or choose a photo'
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => setPhoto(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
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
            ) : 'Save Item'}
          </button>
        </div>
      </main>
    )
  }

  // Scanning stage
  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <BackButton onClick={() => router.push('/dashboard')} />
        <h1 className="font-heading text-xl font-bold text-slate-800">Scan Barcode</h1>
        <div className="w-12" />
      </div>

      <div className="bg-white rounded-3xl shadow-md shadow-violet-100/50 overflow-hidden mb-4">
        <div className="px-5 pt-5 pb-2">
          <p className="text-sm text-slate-500 text-center">
            Point your camera at a barcode
          </p>
        </div>
        <div className="px-3 pb-3">
          <div className="rounded-2xl overflow-hidden">
            <BarcodeScanner onScan={handleScan} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
        </span>
        <p className="text-xs text-slate-400">Waiting for scan…</p>
      </div>
    </main>
  )
}
