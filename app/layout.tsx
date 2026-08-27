import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mutfak Nabzı | TAB Gıda Operasyon Sistemi',
  description: 'Restoran operasyonları için yapay zekâ destekli erken uyarı ve karar destek sistemi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{children}</body>
    </html>
  )
}
