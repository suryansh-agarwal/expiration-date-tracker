# Expiration Date Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly web app for tracking household food item expiry dates, with barcode scanning, a color-coded dashboard, and a daily email digest.

**Architecture:** Next.js App Router on Vercel, all Supabase operations server-side via Server Components and API Routes using the service role key, barcode scanning via `html5-qrcode` in a client component that calls internal API routes, auth via HTTP-only session cookie checked by Next.js middleware.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (Postgres + Storage), html5-qrcode, Resend, Vitest + React Testing Library

---

## File Structure

```
expiration-date-tracker/
├── app/
│   ├── layout.tsx                          # Root layout with Tailwind
│   ├── page.tsx                            # Root redirect → /dashboard
│   ├── globals.css                         # Tailwind base styles
│   ├── login/
│   │   └── page.tsx                        # Login form (client)
│   ├── dashboard/
│   │   └── page.tsx                        # Server component — fetch + display items
│   ├── scan/
│   │   └── page.tsx                        # Client component — barcode scanner + new item form
│   ├── item/
│   │   └── [id]/
│   │       └── page.tsx                    # Item detail / edit / delete (client)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts              # POST — verify password, set cookie
│       │   └── logout/route.ts             # POST — clear cookie
│       ├── items/
│       │   ├── route.ts                    # GET all items, POST new item
│       │   ├── [id]/route.ts               # GET one, PATCH, DELETE
│       │   └── barcode/
│       │       └── [barcode]/route.ts      # GET item by barcode string
│       ├── upload/route.ts                 # POST — proxy photo upload to Supabase Storage
│       └── cron/
│           └── digest/route.ts             # GET — daily email digest (Vercel cron)
├── components/
│   ├── StatusBadge.tsx                     # Red/yellow/green badge
│   ├── ItemCard.tsx                        # Card with name, date, badge, optional photo
│   └── BarcodeScanner.tsx                  # html5-qrcode wrapper (client-only)
├── lib/
│   ├── supabase.ts                         # Server-side Supabase client (service role)
│   ├── items.ts                            # getItemStatus(), sortItems(), getDigestItems()
│   └── email.ts                            # Resend digest email builder + sender
├── middleware.ts                            # Auth guard — redirect to /login if no session cookie
├── types/index.ts                           # Item, ItemStatus types
├── tests/
│   ├── setup.ts                            # @testing-library/jest-dom setup
│   ├── lib/
│   │   └── items.test.ts                   # Unit tests for item status + sort + digest utils
│   └── components/
│       ├── StatusBadge.test.tsx
│       └── ItemCard.test.tsx
├── .env.local.example
├── vercel.json                              # Cron job config (8am daily)
└── vitest.config.ts
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `tests/setup.ts`, `.env.local.example`

- [ ] **Step 1: Scaffold Next.js project**

Run from `/Users/suryanshagarwal/Desktop/projects/expiration-date-tracker`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-turbopack
```
Accept all defaults when prompted.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js html5-qrcode resend
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```
Expected: no errors.

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test scripts to package.json**

In `package.json`, inside `"scripts"`, add:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: Create .env.local.example**

Create `.env.local.example`:
```
FAMILY_PASSWORD=your-family-password-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
DIGEST_EMAIL=youremail@gmail.com
CRON_SECRET=a-long-random-secret-string
```

- [ ] **Step 7: Create .env.local**

```bash
cp .env.local.example .env.local
```
Leave values as placeholders for now — they'll be filled in Tasks 2 and 13.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, Supabase, Vitest"
```

---

### Task 2: Supabase project setup (manual steps)

**Files:** None — manual Supabase dashboard actions.

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New project → name it `expiration-date-tracker` → pick a region near you → Create project. Wait ~2 minutes.

- [ ] **Step 2: Create the items table**

In Supabase dashboard → SQL Editor → New query → run:
```sql
create table items (
  id uuid default gen_random_uuid() primary key,
  barcode text unique not null,
  name text not null,
  expiry_date date not null,
  photo_url text,
  created_at timestamptz default now()
);
```

- [ ] **Step 3: Create the Storage bucket**

In Supabase dashboard → SQL Editor → New query → run:
```sql
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true);
```
This creates a public bucket so photo URLs are directly accessible in `<img>` tags.

- [ ] **Step 4: Disable RLS on items table**

In Supabase dashboard → SQL Editor → New query → run:
```sql
alter table items disable row level security;
```
Safe because all DB access flows through our Next.js API routes, which are protected by password middleware.

- [ ] **Step 5: Copy API keys to .env.local**

In Supabase dashboard → Project Settings → API:
- Copy **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- Copy **service_role** secret (under "Project API keys") → paste as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

---

### Task 3: Types and Supabase server client

**Files:**
- Create: `types/index.ts`
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create types**

Create `types/index.ts`:
```typescript
export type ItemStatus = 'expired' | 'expiring_soon' | 'ok'

export interface Item {
  id: string
  barcode: string
  name: string
  expiry_date: string // ISO date: "2026-06-15"
  photo_url: string | null
  created_at: string
}
```

- [ ] **Step 2: Create Supabase server client**

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add types/index.ts lib/supabase.ts
git commit -m "feat: add Item types and Supabase server client"
```

---

### Task 4: Item status utilities (TDD)

**Files:**
- Create: `lib/items.ts`
- Create: `tests/lib/items.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/items.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getItemStatus, sortItems, getDigestItems } from '@/lib/items'
import type { Item } from '@/types'

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    barcode: '123',
    name: 'Milk',
    expiry_date: '2030-01-01',
    photo_url: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getItemStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns expired when expiry_date is in the past', () => {
    expect(getItemStatus('2026-05-31')).toBe('expired')
  })

  it('returns expired when expiry_date is today', () => {
    expect(getItemStatus('2026-06-01')).toBe('expired')
  })

  it('returns expiring_soon when expiry_date is within 7 days', () => {
    expect(getItemStatus('2026-06-05')).toBe('expiring_soon')
  })

  it('returns expiring_soon on exactly day 7', () => {
    expect(getItemStatus('2026-06-08')).toBe('expiring_soon')
  })

  it('returns ok when expiry_date is more than 7 days away', () => {
    expect(getItemStatus('2026-06-09')).toBe('ok')
  })
})

describe('sortItems', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01'))
  })
  afterEach(() => vi.useRealTimers())

  it('sorts expired first, expiring_soon second, ok last', () => {
    const items = [
      makeItem({ id: '1', expiry_date: '2026-06-09' }), // ok
      makeItem({ id: '2', expiry_date: '2026-05-31' }), // expired
      makeItem({ id: '3', expiry_date: '2026-06-05' }), // expiring_soon
    ]
    const sorted = sortItems(items)
    expect(sorted.map(i => i.id)).toEqual(['2', '3', '1'])
  })
})

describe('getDigestItems', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01'))
  })
  afterEach(() => vi.useRealTimers())

  it('splits items into expired and expiringSoon, excludes ok', () => {
    const items = [
      makeItem({ id: '1', expiry_date: '2026-06-09' }), // ok — excluded
      makeItem({ id: '2', expiry_date: '2026-05-31' }), // expired
      makeItem({ id: '3', expiry_date: '2026-06-05' }), // expiring_soon
    ]
    const { expired, expiringSoon } = getDigestItems(items)
    expect(expired.map(i => i.id)).toEqual(['2'])
    expect(expiringSoon.map(i => i.id)).toEqual(['3'])
  })

  it('returns empty arrays when all items are ok', () => {
    const { expired, expiringSoon } = getDigestItems([makeItem({ expiry_date: '2026-06-09' })])
    expect(expired).toHaveLength(0)
    expect(expiringSoon).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/lib/items.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/items'`

- [ ] **Step 3: Implement lib/items.ts**

Create `lib/items.ts`:
```typescript
import type { Item, ItemStatus } from '@/types'

export function getItemStatus(expiryDate: string): ItemStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate + 'T00:00:00')
  expiry.setHours(0, 0, 0, 0)

  if (expiry <= today) return 'expired'

  const sevenDaysOut = new Date(today)
  sevenDaysOut.setDate(today.getDate() + 7)

  if (expiry <= sevenDaysOut) return 'expiring_soon'

  return 'ok'
}

const STATUS_ORDER: Record<ItemStatus, number> = {
  expired: 0,
  expiring_soon: 1,
  ok: 2,
}

export function sortItems(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) =>
      STATUS_ORDER[getItemStatus(a.expiry_date)] -
      STATUS_ORDER[getItemStatus(b.expiry_date)]
  )
}

export function getDigestItems(items: Item[]): { expired: Item[]; expiringSoon: Item[] } {
  return {
    expired: items.filter(i => getItemStatus(i.expiry_date) === 'expired'),
    expiringSoon: items.filter(i => getItemStatus(i.expiry_date) === 'expiring_soon'),
  }
}
```

- [ ] **Step 4: Run to verify passing**

```bash
npm run test:run -- tests/lib/items.test.ts
```
Expected: PASS — all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/items.ts tests/lib/items.test.ts
git commit -m "feat: add item status utilities with tests"
```

---

### Task 5: Auth — login/logout routes + middleware

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create login route**

Create `app/api/auth/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password !== process.env.FAMILY_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return response
}
```

- [ ] **Step 2: Create logout route**

Create `app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('session', '', { maxAge: 0, path: '/' })
  return response
}
```

- [ ] **Step 3: Create middleware**

Create `middleware.ts` at the project root:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')
  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/ middleware.ts
git commit -m "feat: add auth login/logout routes and middleware"
```

---

### Task 6: Login page

**Files:**
- Create: `app/login/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create login page**

Create `app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Wrong password. Try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Expiry Tracker</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Family access only</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Replace root page with redirect**

Replace `app/page.tsx` with:
```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 3: Start dev server and verify login**

```bash
npm run dev
```
Open http://localhost:3000. Should redirect to `/login`. Enter the password from `.env.local` → should redirect to `/dashboard` (404 is fine for now). Wrong password should show error.

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx app/page.tsx
git commit -m "feat: add login page and root redirect"
```

---

### Task 7: StatusBadge + ItemCard components (TDD)

**Files:**
- Create: `components/StatusBadge.tsx`
- Create: `components/ItemCard.tsx`
- Create: `tests/components/StatusBadge.test.tsx`
- Create: `tests/components/ItemCard.test.tsx`

- [ ] **Step 1: Write failing StatusBadge tests**

Create `tests/components/StatusBadge.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusBadge from '@/components/StatusBadge'

describe('StatusBadge', () => {
  it('shows "Expired" with red classes', () => {
    render(<StatusBadge status="expired" />)
    const badge = screen.getByText('Expired')
    expect(badge).toHaveClass('bg-red-100', 'text-red-700')
  })

  it('shows "Expiring Soon" with yellow classes', () => {
    render(<StatusBadge status="expiring_soon" />)
    const badge = screen.getByText('Expiring Soon')
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-700')
  })

  it('shows "Good" with green classes', () => {
    render(<StatusBadge status="ok" />)
    const badge = screen.getByText('Good')
    expect(badge).toHaveClass('bg-green-100', 'text-green-700')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/components/StatusBadge.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/StatusBadge'`

- [ ] **Step 3: Implement StatusBadge**

Create `components/StatusBadge.tsx`:
```tsx
import type { ItemStatus } from '@/types'

const CONFIG: Record<ItemStatus, { label: string; classes: string }> = {
  expired: { label: 'Expired', classes: 'bg-red-100 text-red-700' },
  expiring_soon: { label: 'Expiring Soon', classes: 'bg-yellow-100 text-yellow-700' },
  ok: { label: 'Good', classes: 'bg-green-100 text-green-700' },
}

export default function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, classes } = CONFIG[status]
  return (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Run to verify passing**

```bash
npm run test:run -- tests/components/StatusBadge.test.tsx
```
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Write failing ItemCard tests**

Create `tests/components/ItemCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import ItemCard from '@/components/ItemCard'
import type { Item } from '@/types'

const item: Item = {
  id: 'abc',
  barcode: '123456',
  name: 'Orange Juice',
  expiry_date: '2030-01-01',
  photo_url: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('ItemCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01'))
  })
  afterEach(() => vi.useRealTimers())

  it('renders item name', () => {
    render(<ItemCard item={item} />)
    expect(screen.getByText('Orange Juice')).toBeInTheDocument()
  })

  it('renders expiry date', () => {
    render(<ItemCard item={item} />)
    expect(screen.getByText('Expires Jan 1, 2030')).toBeInTheDocument()
  })

  it('links to the item detail page', () => {
    render(<ItemCard item={item} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/item/abc')
  })

  it('shows photo thumbnail when photo_url is set', () => {
    render(<ItemCard item={{ ...item, photo_url: 'https://example.com/photo.jpg' }} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('does not render img when photo_url is null', () => {
    render(<ItemCard item={item} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run to verify failure**

```bash
npm run test:run -- tests/components/ItemCard.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/ItemCard'`

- [ ] **Step 7: Implement ItemCard**

Create `components/ItemCard.tsx`:
```tsx
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { getItemStatus } from '@/lib/items'
import type { Item } from '@/types'

export default function ItemCard({ item }: { item: Item }) {
  const status = getItemStatus(item.expiry_date)
  const formattedDate = new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/item/${item.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        {item.photo_url && (
          <img
            src={item.photo_url}
            alt={item.name}
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{item.name}</p>
          <p className="text-sm text-gray-500">Expires {formattedDate}</p>
        </div>
        <StatusBadge status={status} />
      </div>
    </Link>
  )
}
```

- [ ] **Step 8: Run all tests**

```bash
npm run test:run
```
Expected: PASS — all tests pass.

- [ ] **Step 9: Commit**

```bash
git add components/ tests/components/
git commit -m "feat: add StatusBadge and ItemCard components with tests"
```

---

### Task 8: Items API routes

**Files:**
- Create: `app/api/items/route.ts`
- Create: `app/api/items/[id]/route.ts`
- Create: `app/api/items/barcode/[barcode]/route.ts`

- [ ] **Step 1: Create items list + create route**

Create `app/api/items/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Item } from '@/types'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Item[])
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { barcode, name, expiry_date, photo_url } = await request.json()

  const { data, error } = await supabase
    .from('items')
    .insert({ barcode, name, expiry_date, photo_url: photo_url ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Item, { status: 201 })
}
```

- [ ] **Step 2: Create item by ID routes**

Create `app/api/items/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()
  const { data, error } = await supabase.from('items').select('*').eq('id', id).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('items')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()
  const { error } = await supabase.from('items').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create barcode lookup route**

Create `app/api/items/barcode/[barcode]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (error) return NextResponse.json(null, { status: 404 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/items/
git commit -m "feat: add items CRUD and barcode lookup API routes"
```

---

### Task 9: Photo upload API route

**Files:**
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: Create upload route**

Create `app/api/upload/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const formData = await request.formData()
  const file = formData.get('file') as File
  const barcode = formData.get('barcode') as string

  if (!file || !barcode) {
    return NextResponse.json({ error: 'Missing file or barcode' }, { status: 400 })
  }

  const fileName = `${barcode}-${Date.now()}.jpg`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('item-photos')
    .upload(fileName, buffer, { contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('item-photos').getPublicUrl(fileName)
  return NextResponse.json({ url: data.publicUrl })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: add photo upload proxy route"
```

---

### Task 10: Dashboard page

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Update root layout**

Replace `app/layout.tsx` with:
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Expiry Tracker',
  description: 'Track your food expiration dates',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Create dashboard page**

Create `app/dashboard/page.tsx`:
```tsx
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { sortItems } from '@/lib/items'
import ItemCard from '@/components/ItemCard'
import type { Item } from '@/types'

async function getItems(): Promise<Item[]> {
  const supabase = createServerClient()
  const { data } = await supabase.from('items').select('*')
  return sortItems((data as Item[]) ?? [])
}

export default async function DashboardPage() {
  const items = await getItems()

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Expiry Tracker</h1>
        <div className="flex gap-2 items-center">
          <Link
            href="/scan"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
          >
            + Scan
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Logout
            </button>
          </form>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No items yet.</p>
          <p className="text-sm mt-1">Tap + Scan to add your first item.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Verify in browser**

With `npm run dev` running, log in and visit http://localhost:3000/dashboard. Should show empty state. Logout button should work (redirects to `/login`).

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/dashboard/page.tsx
git commit -m "feat: add dashboard page with item list"
```

---

### Task 11: BarcodeScanner component + Scan page

**Files:**
- Create: `components/BarcodeScanner.tsx`
- Create: `app/scan/page.tsx`

- [ ] **Step 1: Create BarcodeScanner component**

Create `components/BarcodeScanner.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface Props {
  onScan: (barcode: string) => void
}

export default function BarcodeScanner({ onScan }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )
    scannerRef.current.render(
      (decodedText) => {
        scannerRef.current?.clear()
        onScan(decodedText)
      },
      () => {} // suppress per-frame decode errors
    )
    return () => {
      scannerRef.current?.clear().catch(() => {})
    }
  }, [onScan])

  return <div id="qr-reader" className="w-full" />
}
```

- [ ] **Step 2: Create scan page**

Create `app/scan/page.tsx`:
```tsx
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

    let photoUrl: string | null = null
    if (photo) {
      const fd = new FormData()
      fd.append('file', photo)
      fd.append('barcode', state.barcode)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      if (uploadRes.ok) {
        const { url } = await uploadRes.json()
        photoUrl = url
      }
    }

    await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barcode: state.barcode,
        name,
        expiry_date: expiryDate,
        photo_url: photoUrl,
      }),
    })

    router.push('/dashboard')
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
          onClick={() => setState({ stage: 'scanning' })}
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
          <button
            onClick={handleSave}
            disabled={!name || !expiryDate || saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Item'}
          </button>
        </div>
        <button
          onClick={() => setState({ stage: 'scanning' })}
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
```

- [ ] **Step 3: Test on mobile**

Start dev server (`npm run dev`). On your phone, open the local IP shown in terminal (e.g. `http://192.168.x.x:3000`). Log in → tap Scan → allow camera → point at a barcode. New barcode should show name/date form. Save → should appear on dashboard.

- [ ] **Step 4: Commit**

```bash
git add components/BarcodeScanner.tsx app/scan/page.tsx
git commit -m "feat: add barcode scan page with new item form"
```

---

### Task 12: Item detail / edit / delete page

**Files:**
- Create: `app/item/[id]/page.tsx`

- [ ] **Step 1: Create item detail page**

Create `app/item/[id]/page.tsx`:
```tsx
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
    const res = await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, expiry_date: expiryDate }),
    })
    const updated = await res.json()
    setItem(updated)
    setEditing(false)
    setSaving(false)
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
          onClick={() => setEditing(!editing)}
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
```

- [ ] **Step 2: Verify in browser**

Add an item via `/scan`. Tap it on the dashboard. Verify name + date + status badge display. Test Edit (change name, save, confirm update). Test Delete (confirm dialog, item removed, redirect to dashboard).

- [ ] **Step 3: Commit**

```bash
git add app/item/
git commit -m "feat: add item detail, edit, and delete page"
```

---

### Task 13: Daily email digest

**Files:**
- Create: `lib/email.ts`
- Create: `app/api/cron/digest/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Set up Resend**

Go to https://resend.com → sign up → Settings → API Keys → Create API Key → copy it → paste as `RESEND_API_KEY` in `.env.local`. Also set `DIGEST_EMAIL` to your email address in `.env.local`.

- [ ] **Step 2: Create email helper**

Create `lib/email.ts`:
```typescript
import { Resend } from 'resend'
import type { Item } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

function daysUntil(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate + 'T00:00:00')
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function buildDigestHtml(expired: Item[], expiringSoon: Item[]): string {
  const expiredRows = expired
    .map(i => `<li><strong>${i.name}</strong> — expired on ${i.expiry_date}</li>`)
    .join('')

  const soonRows = expiringSoon
    .map(i => {
      const days = daysUntil(i.expiry_date)
      return `<li><strong>${i.name}</strong> — expires in ${days} day${days === 1 ? '' : 's'} (${i.expiry_date})</li>`
    })
    .join('')

  return `
    <h2 style="font-family:sans-serif">Daily Expiry Digest</h2>
    ${expired.length > 0 ? `<h3 style="color:#dc2626">🔴 Expired</h3><ul>${expiredRows}</ul>` : ''}
    ${expiringSoon.length > 0 ? `<h3 style="color:#d97706">🟡 Expiring Soon</h3><ul>${soonRows}</ul>` : ''}
  `
}

export async function sendDigestEmail(expired: Item[], expiringSoon: Item[]) {
  await resend.emails.send({
    from: 'Expiry Tracker <onboarding@resend.dev>',
    to: process.env.DIGEST_EMAIL!,
    subject: `Expiry Digest — ${expired.length} expired, ${expiringSoon.length} expiring soon`,
    html: buildDigestHtml(expired, expiringSoon),
  })
}
```

- [ ] **Step 3: Create cron route**

Create `app/api/cron/digest/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getDigestItems } from '@/lib/items'
import { sendDigestEmail } from '@/lib/email'
import type { Item } from '@/types'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase.from('items').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { expired, expiringSoon } = getDigestItems(data as Item[])

  if (expired.length === 0 && expiringSoon.length === 0) {
    return NextResponse.json({ message: 'Nothing to report — no email sent' })
  }

  await sendDigestEmail(expired, expiringSoon)
  return NextResponse.json({
    message: `Email sent — ${expired.length} expired, ${expiringSoon.length} expiring soon`,
  })
}
```

- [ ] **Step 4: Create vercel.json**

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/digest",
      "schedule": "0 8 * * *"
    }
  ]
}
```

- [ ] **Step 5: Test cron locally**

With dev server running and items in the database, test the endpoint:
```bash
curl -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" http://localhost:3000/api/cron/digest
```
Expected: `{"message":"Nothing to report — no email sent"}` if all items are fine, or `{"message":"Email sent — ..."}` if any are expired/expiring.

- [ ] **Step 6: Commit**

```bash
git add lib/email.ts app/api/cron/digest/route.ts vercel.json
git commit -m "feat: add daily email digest cron job"
```

---

### Task 14: Deploy to Vercel

**Files:** No code changes — deploy + configure.

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Import project on Vercel**

Go to https://vercel.com → New Project → Import from GitHub → select `expiration-date-tracker` → Deploy (accept defaults).

- [ ] **Step 3: Add environment variables**

In Vercel → your project → Settings → Environment Variables. Add each of these for all environments (Production, Preview, Development):

| Name | Value |
|---|---|
| `FAMILY_PASSWORD` | your chosen password |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase Project Settings → API |
| `RESEND_API_KEY` | from Resend dashboard |
| `DIGEST_EMAIL` | your email address |
| `CRON_SECRET` | any long random string |

- [ ] **Step 4: Redeploy to pick up env vars**

In Vercel → Deployments → latest deployment → Redeploy.

- [ ] **Step 5: Verify on phone**

Open the Vercel URL on your phone. Log in, scan a barcode, add an item, check the dashboard. Verify color coding works.

- [ ] **Step 6: Test cron endpoint on production**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/digest
```
Expected: `{"message":"..."}` — confirms the endpoint is live and the Resend key is wired up.
