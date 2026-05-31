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
