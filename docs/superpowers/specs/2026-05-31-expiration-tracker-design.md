# Expiration Date Tracker — Design Spec
**Date:** 2026-05-31

## Overview

A mobile-friendly web app for tracking household food items and their expiry dates. Hosted on Vercel, with a Supabase backend. Shared by family members via a single hardcoded password. Sends a daily email digest for expired and soon-to-expire items.

---

## Architecture

```
Vercel (Next.js App)
├── /login          → password check against FAMILY_PASSWORD env var, sets a cookie
├── /dashboard      → lists all items, color-coded by expiry status
├── /scan           → camera view, barcode scanner
│   ├── barcode found + exists in DB → show item details
│   └── barcode found + new → form to enter name, expiry date, optional photo
├── /item/[id]      → view/edit/delete a single item
└── /api/cron/digest → Vercel cron job (runs daily at 8am), sends email via Resend

Supabase
├── items table     → id, barcode, name, expiry_date, photo_url, created_at
└── Storage bucket  → item photos (optional)

Resend
└── daily digest email → lists expired + expiring within 7 days
```

**Auth:** Next.js middleware checks for a valid session cookie on every protected page. If missing, redirects to `/login`. The password is stored only as a Vercel env var (`FAMILY_PASSWORD`) — never in the database. No Supabase Auth is used.

---

## Data Model

**Table: `items`**

| column | type | notes |
|---|---|---|
| `id` | `uuid` | primary key, auto-generated |
| `barcode` | `text` | unique, the scanned barcode string |
| `name` | `text` | user-entered product name |
| `expiry_date` | `date` | user-entered expiry date |
| `photo_url` | `text` | nullable, URL to photo in Supabase Storage |
| `created_at` | `timestamptz` | auto-set on insert |

**Status logic** (computed in the app, not stored in DB):
- `expired` — expiry_date < today
- `expiring_soon` — expiry_date is within 7 days from today
- `ok` — expiry_date is more than 7 days away

---

## Camera & Barcode Flow

Two camera modes on the `/scan` page, using `html5-qrcode`:

**Mode 1 — Barcode scan:**
1. Camera opens in the browser
2. User points at a barcode → library detects and returns the barcode string
3. App queries Supabase by barcode:
   - **Exists** → navigate to `/item/[id]` showing name, expiry date, photo, status
   - **New** → show a form: enter name, expiry date, optionally take a photo → saves new row to Supabase

**Mode 2 — Photo capture (on new item form):**
- User taps "Add Photo" to open camera and take a shot
- Photo uploads to Supabase Storage; URL saved to the item row
- Optional — items can exist without a photo

`html5-qrcode` uses the native browser camera API. Works on iPhone/Android Safari/Chrome with no app install. Camera permission is requested on first use.

---

## Dashboard

**URL:** `/dashboard`

**Sort order:** Expired → Expiring soon → OK

**Each item card displays:**
- Item name
- Expiry date
- Status badge (color-coded):
  - Red — expired
  - Yellow — expiring within 7 days
  - Green — more than 7 days remaining
- Photo thumbnail (if present)
- Tap to open `/item/[id]` for edit or delete

**Header:** "Scan" button linking to `/scan`. Mobile-first layout.

---

## Daily Email Digest

**Trigger:** Vercel cron job at 8am daily → `/api/cron/digest`

**Email contents:**
- List of expired items (name + expiry date)
- List of items expiring within 7 days (name + expiry date + days remaining)
- No email sent if nothing is expired or expiring soon

**Required env vars:**
| var | purpose |
|---|---|
| `FAMILY_PASSWORD` | Shared login password |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For server-side Supabase writes |
| `RESEND_API_KEY` | Resend email API key |
| `DIGEST_EMAIL` | Email address to send the digest to |
| `CRON_SECRET` | Secret to protect the cron endpoint |

---

## Tech Stack

| layer | choice |
|---|---|
| Framework | Next.js (App Router) |
| Hosting | Vercel |
| Database | Supabase (Postgres) |
| File storage | Supabase Storage |
| Barcode scanning | `html5-qrcode` |
| Email | Resend |
| Styling | Tailwind CSS |
