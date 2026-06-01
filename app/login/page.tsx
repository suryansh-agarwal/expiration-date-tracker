'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        setError('Wrong password. Try again!')
      }
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{ backgroundColor: '#F0EDFB' }}>

      {/* Background blobs */}
      <div
        className="animate-blob absolute -top-24 -left-24 w-80 h-80 opacity-30"
        style={{ backgroundColor: '#C4B5FD', borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
      />
      <div
        className="animate-blob absolute -bottom-16 -right-16 w-72 h-72 opacity-25"
        style={{ backgroundColor: '#6EE7B7', borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%', animationDelay: '4s' }}
      />
      <div
        className="animate-blob absolute top-1/3 -right-20 w-56 h-56 opacity-20"
        style={{ backgroundColor: '#FCD34D', borderRadius: '50% 60% 30% 40% / 30% 40% 60% 70%', animationDelay: '8s' }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        <div className="bg-white rounded-3xl shadow-xl shadow-violet-200/50 p-8">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg animate-float"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)' }}
            >
              <span className="text-3xl" role="img" aria-label="food">🥕</span>
            </div>
          </div>

          <h1 className="font-heading text-3xl font-bold text-center text-slate-800 mb-1">
            Expiry Tracker
          </h1>
          <p className="text-center text-slate-500 text-sm mb-7">Family access only 🏠</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password input */}
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                placeholder="Family password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-violet-100 rounded-2xl px-4 py-3.5 pr-12
                  text-slate-800 placeholder:text-slate-400
                  focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100
                  transition-colors text-sm"
                autoFocus
                autoComplete="current-password"
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors cursor-pointer"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" aria-hidden />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full text-white rounded-2xl py-3.5 font-semibold text-sm
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:opacity-90 active:scale-[0.98] transition-all duration-150 cursor-pointer
                flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
