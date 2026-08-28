import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mutfak Nabzı — TAB Gıda Operasyon Merkezi',
  description: 'Restoran operasyonları için yapay zekâ destekli erken uyarı sistemi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
