'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAllPulseScores, fetchAnomalies, fetchComplaints, fetchShifts } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { Sun, AlertCircle, Users, TrendingUp, MessageSquare, Zap } from 'lucide-react'

export default function BriefingPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [pulse, anomalies, complaints, shifts] = await Promise.all([
        fetchAllPulseScores(), fetchAnomalies(), fetchComplaints(), fetchShifts()
      ])
      const critical = pulse.filter((p: any) => p.risk_level === 'KRITIK')
      const risky = pulse.filter((p: any) => p.risk_level === 'RISKLI')
      const avgScore = pulse.length ? Math.round(pulse.reduce((s: number, p: any) => s + p.score, 0) / pulse.length) : 0
      const openComplaints = complaints.filter((c: any) => c.status === 'OPEN')
      const unackedAnomalies = anomalies.filter((a: any) => !a.acknowledged)
      const activeShifts = shifts.filter((s: any) => s.status === 'ACTIVE')
      const absentShifts = shifts.filter((s: any) => s.status === 'ABSENT')
      setData({ pulse, critical, risky, avgScore, openComplaints, unackedAnomalies, activeShifts, absentShifts, anomalies })
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Günaydın' : now.getHours() < 18 ? 'İyi günler' : 'İyi akşamlar'

  if (loading) return (
    <div className="dm">
      <Topbar title="Sabah Briefing"/>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--s4)', borderTopColor: 'var(--ac)', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  const priorities = [
    ...(data.critical.length > 0 ? [{ icon: '🚨', text: `${data.critical.length} restoran KRİTİK — acil müdahale gerekiyor`, color: 'var(--red)' }] : []),
    ...(data.unackedAnomalies.length > 0 ? [{ icon: '⚠️', text: `${data.unackedAnomalies.length} onaylanmamış anomali bekliyor`, color: 'var(--amber)' }] : []),
    ...(data.openComplaints.length > 0 ? [{ icon: '💬', text: `${data.openComplaints.length} açık şikayet çözüm bekliyor`, color: 'var(--amber)' }] : []),
    ...(data.absentShifts.length > 0 ? [{ icon: '👥', text: `${data.absentShifts.length} personel vardiyaya gelmedi`, color: 'var(--red)' }] : []),
    { icon: '📊', text: `Ağ ortalaması ${data.avgScore}/100 — ${data.avgScore > 70 ? 'dikkat gerekiyor' : data.avgScore > 50 ? 'izlemeye devam' : 'iyi durumda'}`, color: data.avgScore > 70 ? 'var(--red)' : 'var(--green)' },
  ].slice(0, 5)

  return (
    <div className="dm">
      <Topbar title="Sabah Briefing" subtitle={now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}/>
      <div className="scroll" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Karşılama */}
        <div style={{ background: 'linear-gradient(135deg,var(--ac2),rgba(124,106,247,.04))', border: '1px solid rgba(124,106,247,.2)', borderRadius: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,var(--ac),#5b4de0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(124,106,247,.4)' }}>
            <Sun size={24} color="#fff"/>
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.3px', marginBottom: 4 }}>{greeting}! ☀️</p>
            <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.5 }}>
              {data.critical.length > 0 ? `Dikkat! ${data.critical.length} restoran kritik seviyede.` : 'Sistem genel olarak stabil. Günlük özetiniz hazır.'}
            </p>
          </div>
        </div>

        {/* KPI özet */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: 'Ort. Nabız', value: data.avgScore, unit: '/100', color: data.avgScore > 70 ? 'var(--red)' : data.avgScore > 50 ? 'var(--amber)' : 'var(--green)', Icon: Zap },
            { label: 'Kritik', value: data.critical.length, unit: ' rest.', color: data.critical.length > 0 ? 'var(--red)' : 'var(--green)', Icon: AlertCircle },
            { label: 'Açık Şikayet', value: data.openComplaints.length, unit: '', color: data.openComplaints.length > 5 ? 'var(--amber)' : 'var(--tx2)', Icon: MessageSquare },
            { label: 'Aktif Personel', value: data.activeShifts.length, unit: '', color: 'var(--green)', Icon: Users },
          ].map(({ label, value, unit, color, Icon }) => (
            <div key={label} className="kpi" style={{ borderLeft: `2.5px solid ${color}` }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon size={13} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize: 22, color }}>{value}<span style={{ fontSize: 11, color: 'var(--tx3)' }}>{unit}</span></p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Öncelikler */}
          <div className="card">
            <div className="card-h"><span className="card-title">Bugünün Öncelikleri</span></div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {priorities.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--s2)', borderRadius: 10, border: '1px solid var(--bdr)' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{p.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5 }}>{p.text}</span>
                </div>
              ))}
              {priorities.length === 0 && <p style={{ fontSize: 13, color: 'var(--tx3)', textAlign: 'center', padding: '20px 0' }}>✅ Bugün herşey yolunda!</p>}
            </div>
          </div>

          {/* Kritik restoranlar */}
          <div className="card">
            <div className="card-h">
              <span className="card-title">Dikkat Gerektiren Restoranlar</span>
              {data.critical.length > 0 && <span className="badge badge-red">{data.critical.length} kritik</span>}
            </div>
            <div>
              {[...data.critical, ...data.risky].slice(0, 6).map((p: any) => {
                const r = RESTAURANTS.find(x => x.id === p.restaurant_id)
                return (
                  <div key={p.restaurant_id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{r?.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.') ?? p.restaurant_id}</p>
                      <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 1 }}>{r?.district} · {p.open_orders} sipariş</p>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: p.risk_level === 'KRITIK' ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }}>{p.score}</span>
                    <span className={`badge badge-${p.risk_level === 'KRITIK' ? 'red' : 'amber'}`} style={{ fontSize: 10, flexShrink: 0 }}>{p.risk_level}</span>
                  </div>
                )
              })}
              {data.critical.length === 0 && data.risky.length === 0 && (
                <p style={{ padding: '20px', textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>✅ Tüm restoranlar normal</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
