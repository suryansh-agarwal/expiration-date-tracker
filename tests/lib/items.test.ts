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
