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
