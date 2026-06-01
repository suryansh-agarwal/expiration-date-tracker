import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Expiry Tracker',
  description: 'Track your food expiration dates',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: '#F0EDFB' }}>{children}</body>
    </html>
  )
}
