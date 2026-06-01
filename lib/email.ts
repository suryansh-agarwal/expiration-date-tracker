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
    ${expired.length > 0 ? `<h3 style="color:#dc2626">Expired</h3><ul>${expiredRows}</ul>` : ''}
    ${expiringSoon.length > 0 ? `<h3 style="color:#d97706">Expiring Soon</h3><ul>${soonRows}</ul>` : ''}
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
