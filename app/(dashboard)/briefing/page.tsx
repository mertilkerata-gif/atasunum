'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getNetworkRevenueSummary } from '@/data/seed/revenue'
import { getAllComplaintSummaries } from '@/data/seed/complaints'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'
import { generateShiftPlan, UPCOMING_EVENTS } from '@/data/seed/shifts'
import { cn } from '@/lib/utils'
import { Sun, AlertTriangle, CheckCircle, TrendingUp, Calendar, Zap, ChevronRight, Loader2 } from 'lucide-react'

export default function BriefingPage() {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(true)

  const revenue = getNetworkRevenueSummary()
  const complaints = getAllComplaintSummaries()
  const totalComplaints = complaints.reduce((s, c) => s + c.total, 0)
  const criticalRestaurants = RESTAURANTS.filter(r => getPulseScore(r.id).risk_level === 'KRITIK')
  const todayDate = Object.keys(UPCOMING_EVENTS)[0]
  const todayEvents = UPCOMING_EVENTS[todayDate] ?? []
  const todayPlan = generateShiftPlan('r1', todayDate)

  const actions = [
    { priority: 1, icon: '🔴', text: `${criticalRestaurants.map(r => r.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')).join(', ')} — nabız kritik, sabah vardiyası takviye edilmeli`, done: false },
    { priority: 2, icon: '📦', text: 'BK Kadıköy ve Popeyes Taksim stok kontrolü — Whopper ekmeği kritik seviyede', done: false },
    { priority: 3, icon: '⚽', text: todayEvents.length > 0 ? `Bugün ${todayEvents.map(e => e.name).join(' + ')} — tüm şubelerde ekstra personel hazır olsun` : 'Bugün özel etkinlik yok — standart vardiya yeterli', done: true },
  ]

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 2000))
    setGenerating(false)
    setGenerated(true)
  }

  return (
    <div className="dm">
      <Topbar title="Sabah Briefing" subtitle={`${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} — Günlük yönetici özeti`} />
      <div className="p-6 space-y-5 max-w-4xl">

        {/* Header card */}
        <div className="card" style={{ padding: 24 }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)' }} />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-orange-400" />
                <span className="text-lg font-bold text-white">Günaydın</span>
              </div>
              <p className="text-sm leading-relaxed max-w-lg">
                Dün <span className="text-white font-medium">{revenue.totalOrders.toLocaleString('tr-TR')}</span> sipariş işlendi,
                toplam <span className="text-emerald-400 font-medium">{revenue.totalActual.toLocaleString('tr-TR')} ₺</span> ciro elde edildi.
                {revenue.totalLost > 0 && <> <span className="text-red-400 font-medium">{revenue.totalLost.toLocaleString('tr-TR')} ₺</span> kayıp ciro tespit edildi.</>}
              </p>
            </div>
            {!generated && (
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 16px rgba(249,115,22,0.25)' }}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? 'Üretiliyor...' : 'AI Briefing Üret'}
              </button>
            )}
          </div>
        </div>

        {/* Dün özeti */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam Sipariş', value: revenue.totalOrders.toLocaleString('tr-TR'), sub: 'dün', color: 'text-white' },
            { label: 'Toplam Ciro', value: `${(revenue.totalActual/1000).toFixed(0)}K ₺`, sub: 'gerçekleşen', color: 'text-emerald-400' },
            { label: 'Kayıp Ciro', value: `${(revenue.totalLost/1000).toFixed(0)}K ₺`, sub: 'önlenebilir', color: 'text-red-400' },
            { label: 'Şikayet', value: totalComplaints, sub: 'toplam', color: totalComplaints > 50 ? 'text-orange-400' : 'text-white/60' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="card" style={{ padding: "16px" }}>
              <div className="text-[10px] uppercase tracking-widest mb-2">{label}</div>
              <div className={cn('text-2xl font-bold font-mono', color)}>{value}</div>
              <div className="text-[11px] mt-1">{sub}</div>
            </div>
          ))}
        </div>

        {/* Bugünün olayları */}
        {todayEvents.length > 0 && (
          <div className="card" style={{ padding: "20px" }}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-300">Bugünün Dış Faktörleri</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {todayEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border px-4 py-2.5"
                  style={{ background: 'var(--s2)', borderColor: 'var(--bdr)' }}>
                  <span className="text-lg">{e.icon}</span>
                  <div>
                    <div className="text-xs font-medium">{e.name}</div>
                    <div className="text-[10px] text-orange-400">TG siparişi +{Math.round(e.impact * 100)}% bekleniyor</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 Öncelikli Aksiyon */}
        <div className="card" style={{ background: 'var(--s1)', borderColor: 'var(--bdr)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bdr)' }}>
            <div className="text-sm font-semibold text-white">Bugünün 3 Önceliği</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--bdr)' }}>
            {actions.map(action => (
              <div key={action.priority} className={cn('flex items-start gap-4 px-6 py-4', action.done && 'opacity-50')}>
                <div className="text-2xl shrink-0 mt-0.5">{action.icon}</div>
                <div className="flex-1">
                  <div className={cn('text-sm', action.done ? 'line-through text-white/40' : 'text-white/80')}>{action.text}</div>
                </div>
                <div className="shrink-0">
                  {action.done
                    ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                    : <div className="w-5 h-5 rounded-full border-2" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bugünkü vardiya özeti */}
        <div className="card" style={{ padding: "20px" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-white">Bugünkü Vardiya Durumu</div>
            <a href="/shifts" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors">
              Detay <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {RESTAURANTS.slice(0, 3).map(r => {
              const plan = generateShiftPlan(r.id, todayDate)
              const gap = plan.recommendedStaff.total - plan.currentStaff.total
              return (
                <div key={r.id} className="card" style={{ padding: 12 }}>
                  <div className="text-xs font-medium truncate mb-1">{r.name.replace('Burger King ','BK ')}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{plan.currentStaff.total} kişi</span>
                    {gap > 0
                      ? <span className="text-xs font-bold text-orange-400">+{gap} gerek</span>
                      : <span className="text-xs text-emerald-400">✓ Yeterli</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Değerlendirmesi */}
        <div className="card" style={{ padding: "20px" }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-300">AI Günlük Değerlendirmesi</span>
          </div>
          <p className="text-sm leading-relaxed">
            Dünkü operasyonun ana zorluğu <span >akşam saatlerinde Packing kapasitesinin Tıkla Gelsin talebini karşılayamamasıydı</span>.
            Bugün {todayEvents.length > 0 ? `${todayEvents[0].name} nedeniyle benzer veya daha yüksek yoğunluk bekleniyor` : 'yoğunluğun dünle benzer seyretmesi bekleniyor'}.
            Öncelikli aksiyon: <span className="text-orange-300">kritik restoranların sabah vardiyasında Packing kadrolarını güçlendirmek</span>.
          </p>
          <div className="mt-3 text-[10px]">Güven: %84 · Kaynak: 7 günlük tarihsel veri + dış olaylar</div>
        </div>
      </div>
    </div>
  )
}
