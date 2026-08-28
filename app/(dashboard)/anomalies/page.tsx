'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'
import { cn } from '@/lib/utils'
import { AlertTriangle, Zap, Eye, CheckCircle, Activity, TrendingDown, Server } from 'lucide-react'

type AnomalyType = 'SPEED_ANOMALY' | 'POS_CRASH' | 'DEMAND_SPIKE' | 'QUALITY_DROP' | 'STAFF_SHORTAGE' | 'COURIER_BLACKOUT'
type AnomalySeverity = 'WARNING' | 'CRITICAL' | 'INFO'

interface Anomaly {
  id: string
  restaurantId: string
  restaurantName: string
  type: AnomalyType
  severity: AnomalySeverity
  title: string
  description: string
  detectedAt: string
  metric: string
  expectedValue: string
  actualValue: string
  deviation: string
  acknowledged: boolean
  autoAction?: string
}

const TYPE_CONFIG: Record<AnomalyType, { icon: string; label: string }> = {
  SPEED_ANOMALY:    { icon: '⚡', label: 'Hız Anomalisi' },
  POS_CRASH:        { icon: '💻', label: 'POS Arızası' },
  DEMAND_SPIKE:     { icon: '📈', label: 'Ani Talep' },
  QUALITY_DROP:     { icon: '⚠️', label: 'Kalite Düşüşü' },
  STAFF_SHORTAGE:   { icon: '👥', label: 'Personel Eksikliği' },
  COURIER_BLACKOUT: { icon: '🛵', label: 'Kurye Kesintisi' },
}

const SEVERITY_CONFIG: Record<AnomalySeverity, { color: string; bg: string; border: string; badge: string }> = {
  CRITICAL: { color: 'text-red-400',    bg: 'rgba(255,61,61,0.06)',   border: 'rgba(255,61,61,0.22)',   badge: 'bg-red-500/20 text-red-300 border-red-500/20' },
  WARNING:  { color: 'text-orange-400', bg: 'rgba(249,115,22,0.06)',  border: 'rgba(249,115,22,0.22)',  badge: 'bg-orange-500/20 text-orange-300 border-orange-500/20' },
  INFO:     { color: 'text-blue-400',   bg: 'rgba(96,165,250,0.06)',  border: 'rgba(96,165,250,0.15)',  badge: 'bg-blue-500/20 text-blue-300 border-blue-500/20' },
}

function generateAnomalies(): Anomaly[] {
  const now = new Date()
  const fmt = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return [
    {
      id: 'a1', restaurantId: 'r6', restaurantName: 'Popeyes Taksim',
      type: 'SPEED_ANOMALY', severity: 'CRITICAL',
      title: 'Anormal Hızlı Hazırlama Tespit Edildi',
      description: 'Hazırlama süresi son 15 dakikada normalin %52 altına düştü. Kalite standardı ihlali olabilir.',
      detectedAt: fmt(8), metric: 'Ort. Hazırlama Süresi',
      expectedValue: '8-10 dk', actualValue: '3.8 dk', deviation: '-%52',
      acknowledged: false,
      autoAction: 'Kalite kontrol ekibine otomatik bildirim gönderildi',
    },
    {
      id: 'a2', restaurantId: 'r1', restaurantName: 'BK Kadıköy',
      type: 'DEMAND_SPIKE', severity: 'CRITICAL',
      title: 'Ani Sipariş Dalgası',
      description: 'Son 5 dakikada sipariş geliş hızı normalin 3.2 katına çıktı. Maç çıkışı veya kampanya etkisi olabilir.',
      detectedAt: fmt(3), metric: 'Sipariş/5dk',
      expectedValue: '8-12', actualValue: '38', deviation: '+%316',
      acknowledged: false,
      autoAction: 'Tüm istasyonlara maksimum kapasite uyarısı verildi',
    },
    {
      id: 'a3', restaurantId: 'r9', restaurantName: 'BK Pendik',
      type: 'POS_CRASH', severity: 'CRITICAL',
      title: 'Sipariş Akışı Durdu — POS Arızası Şüphesi',
      description: '12 dakikadır hiç sipariş gelmiyor. Önceki hafta aynı saatte 24 siparişti. POS veya internet kesintisi olabilir.',
      detectedAt: fmt(14), metric: 'Sipariş/30dk',
      expectedValue: '20-28', actualValue: '0', deviation: '-%100',
      acknowledged: true,
      autoAction: 'IT ekibine otomatik ticket açıldı (INC-20847)',
    },
    {
      id: 'a4', restaurantId: 'r5', restaurantName: 'BK Maltepe',
      type: 'COURIER_BLACKOUT', severity: 'WARNING',
      title: 'Kurye Erişimi Yok',
      description: 'Tıkla Gelsin Paket servis siparişleri 23 dakikadır kurye ataması yapılamıyor. Kurye havuzunda sorun olabilir.',
      detectedAt: fmt(23), metric: 'Kurye Atama Süresi',
      expectedValue: '< 5 dk', actualValue: '23+ dk', deviation: '+%360',
      acknowledged: false,
    },
    {
      id: 'a5', restaurantId: 'r3', restaurantName: 'BK Ümraniye',
      type: 'STAFF_SHORTAGE', severity: 'WARNING',
      title: 'Packing İstasyonu Boş',
      description: 'Packing istasyonunda 18 dakikadır hareket yok. Çalışan yok veya tüm personel başka alanda olabilir.',
      detectedAt: fmt(18), metric: 'Packing Aktivitesi',
      expectedValue: 'Sürekli aktif', actualValue: '18 dk inaktif', deviation: 'Anormal',
      acknowledged: false,
    },
    {
      id: 'a6', restaurantId: 'r2', restaurantName: 'BK Beşiktaş',
      type: 'QUALITY_DROP', severity: 'INFO',
      title: 'İptal Oranı Artışı',
      description: 'Son 1 saatte iptal oranı normalin 2.4 katı. Müşteri şikayet artışıyla korelasyon var.',
      detectedAt: fmt(35), metric: 'İptal Oranı',
      expectedValue: '%2-4', actualValue: '%9.7', deviation: '+%243',
      acknowledged: true,
    },
  ]
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>(generateAnomalies())
  const [filter, setFilter] = useState<'ALL' | AnomalySeverity>('ALL')
  const [lastScan, setLastScan] = useState(new Date())
  const [scanning, setScanning] = useState(false)

  // Her 30 saniyede scan animasyonu
  useEffect(() => {
    const t = setInterval(() => {
      setScanning(true)
      setTimeout(() => { setScanning(false); setLastScan(new Date()) }, 1500)
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const acknowledge = (id: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  const filtered = anomalies.filter(a => filter === 'ALL' || a.severity === filter)
  const unacknowledged = anomalies.filter(a => !a.acknowledged).length
  const critical = anomalies.filter(a => a.severity === 'CRITICAL' && !a.acknowledged).length

  return (
    <div>
      <Topbar title="Anomali Dedektörü" subtitle="Sistem otomatik anomali tespiti — gerçek zamanlı" />
      <div className="p-6 space-y-5">

        {/* Status bar */}
        <div className="flex items-center justify-between rounded-2xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn('relative w-2 h-2')}>
                <div className={cn('w-2 h-2 rounded-full', scanning ? 'bg-yellow-400' : 'bg-emerald-400')}
                  style={{ boxShadow: scanning ? '0 0 8px rgba(234,179,8,0.8)' : '0 0 8px rgba(34,197,94,0.8)' }} />
                {scanning && <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping" />}
              </div>
              <span className="text-xs text-white/50">{scanning ? 'Taranıyor...' : 'Aktif İzleme'}</span>
            </div>
            <div className="text-[10px] text-white/25">
              Son tarama: {lastScan.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[10px] text-white/25">10 restoran · 47 metrik izleniyor</div>
          </div>
          <div className="flex items-center gap-3">
            {critical > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5"
                style={{ background: 'rgba(255,61,61,0.08)', borderColor: 'rgba(255,61,61,0.2)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs font-bold text-red-300">{critical} Kritik</span>
              </div>
            )}
            <div className="text-xs text-white/30">{unacknowledged} onaysız</div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="flex gap-2">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-2 rounded-xl border text-xs font-medium transition-all',
                filter === f ? 'border-orange-500/40 bg-orange-500/10 text-orange-300' : 'border-white/[0.07] text-white/40 hover:text-white/60')}
              style={{ background: filter === f ? undefined : 'var(--bg-surface)' }}>
              {f === 'ALL' ? `Tümü (${anomalies.length})` : f === 'CRITICAL' ? `🔴 Kritik (${anomalies.filter(a => a.severity === 'CRITICAL').length})` : f === 'WARNING' ? `🟠 Uyarı (${anomalies.filter(a => a.severity === 'WARNING').length})` : `🔵 Bilgi (${anomalies.filter(a => a.severity === 'INFO').length})`}
            </button>
          ))}
        </div>

        {/* Anomali listesi */}
        <div className="space-y-3">
          {filtered.map(anomaly => {
            const sc = SEVERITY_CONFIG[anomaly.severity]
            const tc = TYPE_CONFIG[anomaly.type]
            return (
              <div key={anomaly.id} className={cn('rounded-2xl border p-5 transition-all', anomaly.acknowledged && 'opacity-60')}
                style={{ background: anomaly.acknowledged ? 'var(--bg-surface)' : sc.bg, borderColor: anomaly.acknowledged ? 'rgba(255,255,255,0.07)' : sc.border }}>
                <div className="flex items-start gap-4">
                  <div className="text-2xl shrink-0 mt-0.5">{tc.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', sc.badge)}>
                            {anomaly.severity}
                          </span>
                          <span className="text-[10px] text-white/30">{tc.label}</span>
                          <span className="text-[10px] text-white/20">·</span>
                          <span className="text-[10px] text-white/30">{anomaly.restaurantName}</span>
                        </div>
                        <div className={cn('text-sm font-semibold', anomaly.acknowledged ? 'text-white/50' : 'text-white')}>
                          {anomaly.title}
                        </div>
                      </div>
                      <div className="text-[10px] text-white/25 shrink-0">{anomaly.detectedAt}</div>
                    </div>

                    <p className="text-xs text-white/50 leading-relaxed mb-3">{anomaly.description}</p>

                    {/* Metrik karşılaştırma */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="rounded-lg border px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[9px] text-white/25 mb-0.5">Beklenen</div>
                        <div className="text-xs font-mono text-emerald-400">{anomaly.expectedValue}</div>
                      </div>
                      <div className="text-white/20">→</div>
                      <div className="rounded-lg border px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[9px] text-white/25 mb-0.5">Gerçekleşen</div>
                        <div className={cn('text-xs font-mono font-bold', sc.color)}>{anomaly.actualValue}</div>
                      </div>
                      <div className={cn('text-sm font-bold font-mono', sc.color)}>{anomaly.deviation}</div>
                    </div>

                    {/* Oto aksiyon */}
                    {anomaly.autoAction && (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400/70 mb-3">
                        <Zap className="w-3 h-3" />
                        {anomaly.autoAction}
                      </div>
                    )}

                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-2">
                      {!anomaly.acknowledged ? (
                        <button onClick={() => acknowledge(anomaly.id)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all text-white/70 hover:text-white"
                          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Onayladım
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400/60">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Onaylandı
                        </div>
                      )}
                      <a href={`/restaurants/${anomaly.restaurantId}`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all text-white/40 hover:text-white/70"
                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
                        <Eye className="w-3.5 h-3.5" />
                        Restorana Git
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* İzlenen metrikler */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">İzlenen Metrikler</div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: <Activity className="w-4 h-4" />, label: 'Hazırlama Hızı', desc: 'Normalin ±%30 dışı' },
              { icon: <Server className="w-4 h-4" />, label: 'POS Akışı', desc: '10 dk sipariş gelmezse' },
              { icon: <TrendingDown className="w-4 h-4" />, label: 'İptal Anomalisi', desc: 'Normalin 2x üzeri' },
              { icon: <AlertTriangle className="w-4 h-4" />, label: 'Kurye Kesintisi', desc: '15 dk atamasız sipariş' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="rounded-xl border p-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-white/20 mb-2">{icon}</div>
                <div className="text-xs font-medium text-white/60">{label}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
