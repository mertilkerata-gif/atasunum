'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('mn_user')
    if (!user) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,var(--ac),#5b4de0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,106,247,.4)', animation: 'pulse 2s ease-in-out infinite' }}>
        <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
      <p style={{ color: 'var(--tx3)', fontSize: 12.5 }}>Yükleniyor…</p>
    </div>
  )

  return (
    <div className="dw">
      <Sidebar />
      <div className="dm">{children}</div>
    </div>
  )
}
