'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { cn } from '@/lib/utils'
import {
  Zap, AlertTriangle, Activity, CheckCircle2, Clock,
  TrendingDown, TrendingUp, Server, Users, Truck, ArrowRight, RefreshCw
} from 'lucide-react'

type AnomalyType = 'SPEED_ANOMALY' | 'POS_CRASH' | 'DEMAND_SPIKE' | 'QUALITY_DROP' | 'STAFF_SHORTAGE' | 'COURIER_BLACKOUT'
type AnomalySeverity = 'CRITICAL' | 'WARNING' | 'INFO'

interface Anomaly {
  id: string
  restaurantId: string
  restaurantName: string
  brand: 'BK' | 'POP'
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

const TYPE_META: Record<AnomalyType, { icon: React.ElementType; label: string }> = {
  SPEED_ANOMALY:    { icon: Zap,          label: 'Hız Anomalisi' },
  POS_CRASH:        { icon: Server,        label: 'POS Arızası' },
  DEMAND_SPIKE:     { icon: TrendingUp,    label: 'Ani Talep' },
  QUALITY_DROP:     { icon: TrendingDown,  label: 'Kalite Düşüşü' },
  STAFF_SHORTAGE:   { icon: Users,         label: 'Personel Eksikliği' },
  COURIER_BLACKOUT: { icon: Truck,         label: 'Kurye Kesintisi' },
}

const SEV_META: Record<AnomalySeverity, {
  label: string; dotColor: string; textColor: string; bg: string; borderColor: string; rowBorder: string
}> = {
  CRITICAL: {
    label: 'KRİTİK',
    dotColor: '#ef4444',
    textColor: '#f87171',
    bg: 'rgba(239,68,68,0.055)',
    borderColor: 'rgba(239,68,68,0.18)',
    rowBorder: 'rgba(239,68,68,0.12)',
  },
  WARNING: {
    label: 'UYARI',
    dotColor: '#f97316',
    textColor: '#fb923c',
    bg: 'rgba(249,115,22,0.055)',
    borderColor: 'rgba(249,115,22,0.18)',
    rowBorder: 'rgba(249,115,22,0.10)',
  },
  INFO: {
    label: 'BİLGİ',
    dotColor: '#60a5fa',
    textColor: '#93c5fd',
    bg: 'rgba(96,165,250,0.045)',
    borderColor: 'rgba(96,165,250,0.15)',
    rowBorder: 'rgba(96,165,250,0.08)',
  },
}

function generateAnomalies(): Anomaly[] {
  const now = new Date()
  const fmt = (minsAgo: number) =>
    new Date(now.getTime() - minsAgo * 60000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return [
    {
      id: 'a1', restaurantId: 'r6', restaurantName: 'Popeyes Taksim', brand: 'POP',
      type: 'SPEED_ANOMALY', severity: 'CRITICAL',
      title: 'Anormal Hızlı Hazırlama Tespit Edildi',
      description: 'Hazırlama süresi son 15 dakikada normalin %52 altına düştü. Kalite standardı ihlali olabilir.',
      detectedAt: fmt(8), metric: 'Ort. Hazırlama', expectedValue: '8–10 dk', actualValue: '3.8 dk', deviation: '−%52',
      acknowledged: false, autoAction: 'Kalite kontrol ekibine otomatik bildirim gönderildi',
    },
    {
      id: 'a2', restaurantId: 'r1', restaurantName: 'BK Kadıköy', brand: 'BK',
      type: 'DEMAND_SPIKE', severity: 'CRITICAL',
      title: 'Ani Sipariş Dalgası',
      description: 'Son 5 dakikada sipariş geliş hızı normalin 3.2 katına çıktı. Maç çıkışı veya kampanya etkisi olabilir.',
      detectedAt: fmt(3), metric: 'Sipariş/5dk', expectedValue: '8–12', actualValue: '38', deviation: '+%316',
      acknowledged: false, autoAction: 'Tüm istasyonlara maksimum kapasite uyarısı verildi',
    },
    {
      id: 'a3', restaurantId: 'r9', restaurantName: 'BK Pendik', brand: 'BK',
      type: 'POS_CRASH', severity: 'CRITICAL',
      title: 'Sipariş Akışı Durdu — POS Arızası Şüphesi',
      description: '12 dakikadır hiç sipariş gelmiyor. Önceki hafta aynı saatte 24 siparişti. POS veya internet kesintisi olabilir.',
      detectedAt: fmt(14), metric: 'Sipariş/30dk', expectedValue: '20–28', actualValue: '0', deviation: '−%100',
      acknowledged: true, autoAction: 'IT ekibine otomatik ticket açıldı (INC-20847)',
    },
    {
      id: 'a4', restaurantId: 'r5', restaurantName: 'BK Maltepe', brand: 'BK',
      type: 'COURIER_BLACKOUT', severity: 'WARNING',
      title: 'Kurye Erişimi Yok',
      description: 'Tıkla Gelsin Paket servis siparişleri 23 dakikadır kurye ataması yapılamıyor. Kurye havuzunda sorun olabilir.',
      detectedAt: fmt(23), metric: 'Kurye Atama', expectedValue: '< 5 dk', actualValue: '23+ dk', deviation: '+%360',
      acknowledged: false,
    },
    {
      id: 'a5', restaurantId: 'r3', restaurantName: 'BK Ümraniye', brand: 'BK',
      type: 'STAFF_SHORTAGE', severity: 'WARNING',
      title: 'Packing İstasyonu Boş',
      description: 'Packing istasyonunda 18 dakikadır hareket yok. Çalışan yok veya tüm personel başka alanda olabilir.',
      detectedAt: fmt(18), metric: 'Packing Aktivitesi', expectedValue: 'Sürekli aktif', actualValue: '18 dk inaktif', deviation: 'Anormal',
      acknowledged: false,
    },
    {
      id: 'a6', restaurantId: 'r2', restaurantName: 'BK Beşiktaş', brand: 'BK',
      type: 'QUALITY_DROP', severity: 'INFO',
      title: 'İptal Oranı Artışı',
      description: 'Son 1 saatte iptal oranı normalin 2.4 katı. Müşteri şikayet artışıyla korelasyon var.',
      detectedAt: fmt(35), metric: 'İptal Oranı', expectedValue: '%2–4', actualValue: '%9.7', deviation: '+%243',
      acknowledged: true,
    },
  ]
}

function SeverityDot({ severity }: { severity: AnomalySeverity }) {
  const m = SEV_META[severity]
  return (
    <span className="relative inline-flex">
      <span className="absolute inline-flex w-full h-full rounded-full animate-ping opacity-30"
        style={{ background: m.dotColor, animationDuration: severity === 'CRITICAL' ? '1.4s' : '2.5s' }} />
      <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: m.dotColor }} />
    </span>
  )
}

function MetricDelta({ value, size = 'md' }: { value: string; size?: 'sm' | 'md' }) {
  const negative = value.startsWith('−') || value.startsWith('-')
  const isAnormal = value === 'Anormal'
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-semibold num',
      size === 'sm' ? 'text-[11px]' : 'text-[13px]',
      isAnormal ? 'text-amber-400' : negative ? 'text-emerald-400' : 'text-red-400'
    )}>
      {!isAnormal && (negative
        ? <TrendingDown size={11} strokeWidth={2} />
        : <TrendingUp size={11} strokeWidth={2} />
      )}
      {value}
    </span>
  )
}

function AnomalyCard({ anomaly, onAck }: { anomaly: Anomaly; onAck: (id: string) => void }) {
  const s = SEV_META[anomaly.severity]
  const t = TYPE_META[anomaly.type]
  const TypeIcon = t.icon
  const acked = anomaly.acknowledged

  return (
    <div
      className={cn('rounded-[14px] border transition-all duration-200', acked && 'opacity-40')}
      style={{
        background: acked ? 'var(--s1)' : s.bg,
        borderColor: acked ? 'var(--bdr)' : s.borderColor,
      }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${acked ? 'var(--bdr)' : s.rowBorder}` }}>
        
        {/* Severity indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {!acked && <SeverityDot severity={anomaly.severity} />}
          {acked && <CheckCircle2 size={8} className="text-white/20" />}
          <span className="text-[9px] font-bold tracking-[0.18em]" style={{ color: acked ? 'var(--tx3)' : s.textColor }}>
            {s.label}
          </span>
        </div>

        <span className="text-white/10 text-xs">·</span>

        {/* Type badge */}
        <div className="flex items-center gap-1.5 rounded-md px-2 py-0.5"
          style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <TypeIcon size={9} className="text-white/30" />
          <span className="text-[9px] text-white/35 font-medium">{t.label}</span>
        </div>

        {/* Restaurant */}
        <div className="flex items-center gap-1.5 rounded-md px-2 py-0.5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[9px] font-semibold"
            style={{ color: anomaly.brand === 'POP' ? '#f97316' : '#60a5fa' }}>
            {anomaly.brand}
          </span>
          <span className="text-[9px] text-white/30">{anomaly.restaurantName}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Clock size={10} className="text-white/20" />
          <span className="text-[10px] num" style={{ color: 'var(--tx3)' }}>{anomaly.detectedAt}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
            style={{
              background: acked ? 'var(--s2)' : `${s.bg}`,
              border: `1px solid ${acked ? 'var(--bdr)' : s.borderColor}`,
            }}>
            <TypeIcon size={15} style={{ color: acked ? 'var(--tx3)' : s.textColor }} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={cn('text-[13.5px] font-semibold leading-snug mb-1.5', acked ? 'text-white/30' : 'text-white')}
              style={{ letterSpacing: '-0.02em' }}>
              {anomaly.title}
            </h3>

            {/* Description */}
            <p className="text-[11.5px] leading-relaxed mb-3" style={{ color: 'var(--tx3)' }}>
              {anomaly.description}
            </p>

            {/* Metrics row */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--tx3)' }}>Metrik</span>
                <span className="text-[11px] font-medium text-white/60">{anomaly.metric}</span>
              </div>
              <div className="w-px h-6 bg-white/[0.05] shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--tx3)' }}>Beklenen</span>
                <span className="text-[11px] font-medium num" style={{ color: 'var(--tx2)' }}>{anomaly.expectedValue}</span>
              </div>
              <div className="flex items-center text-white/15"><ArrowRight size={10} /></div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--tx3)' }}>Gerçekleşen</span>
                <span className="text-[12px] font-bold num" style={{ color: acked ? 'var(--tx3)' : s.textColor }}>
                  {anomaly.actualValue}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--tx3)' }}>Sapma</span>
                <MetricDelta value={anomaly.deviation} />
              </div>
            </div>

            {/* Auto-action */}
            {anomaly.autoAction && (
              <div className="flex items-center gap-2 mt-3 py-2 px-3 rounded-[8px]"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                <span className="text-[10px]" style={{ color: 'rgba(245,245,245,0.35)' }}>{anomaly.autoAction}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {!acked && (
              <button
                onClick={() => onAck(anomaly.id)}
                className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[10px] font-medium transition-all hover:opacity-80"
                style={{
                  background: 'var(--s2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(245,245,245,0.45)',
                }}
              >
                <CheckCircle2 size={10} />
                Onayla
              </button>
            )}
            <a
              href={`/restaurants/${anomaly.restaurantId}`}
              className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[10px] font-medium transition-all hover:opacity-80"
              style={{
                background: 'var(--s2)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(245,245,245,0.35)',
              }}
            >
              <ArrowRight size={10} />
              Restoran Git
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

type FilterType = 'ALL' | AnomalySeverity

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>(generateAnomalies())
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [lastScan, setLastScan] = useState(new Date())
  const [scanning, setScanning] = useState(false)

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

  const counts = {
    CRITICAL: anomalies.filter(a => a.severity === 'CRITICAL').length,
    WARNING:  anomalies.filter(a => a.severity === 'WARNING').length,
    INFO:     anomalies.filter(a => a.severity === 'INFO').length,
    unacked:  anomalies.filter(a => !a.acknowledged).length,
    critical_unacked: anomalies.filter(a => a.severity === 'CRITICAL' && !a.acknowledged).length,
  }

  const filtered = anomalies.filter(a => filter === 'ALL' || a.severity === filter)

  const FILTERS: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL',      label: 'Tümü',   count: anomalies.length },
    { key: 'CRITICAL', label: 'Kritik', count: counts.CRITICAL },
    { key: 'WARNING',  label: 'Uyarı',  count: counts.WARNING },
    { key: 'INFO',     label: 'Bilgi',  count: counts.INFO },
  ]

  return (
    <div className="dm">
      <Topbar
        title="Anomali Dedektörü"
        subtitle="Sistem otomatik anomali tespiti — gerçek zamanlı"
        action={
          <div className="flex items-center gap-2">
            {counts.critical_unacked > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.18)',
                }}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[10px] font-bold text-red-400">{counts.critical_unacked} Kritik</span>
              </div>
            )}
          </div>
        }
      />

      <div className="scroll" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Status bar */}
        <div className="flex items-center justify-between rounded-[12px] px-4 py-3"
          style={{ background: 'var(--s1)', border: '1px solid var(--bdr)' }}>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="relative w-2 h-2">
                {scanning
                  ? <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping" />
                  : <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                }
                <div className={cn('relative w-2 h-2 rounded-full', scanning ? 'bg-amber-400' : 'bg-emerald-400')} />
              </div>
              <span className="text-[11px]" style={{ color: 'var(--tx2)' }}>
                {scanning ? 'Taranıyor…' : 'Aktif İzleme'}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-[10px]" style={{ color: 'var(--tx3)' }}>
              <Clock size={10} className="shrink-0" />
              <span className="num">{lastScan.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div className="hidden md:block text-[10px]" style={{ color: 'var(--tx3)' }}>
              10 restoran · 47 metrik
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[10px]" style={{ color: 'var(--tx3)' }}>
              {counts.unacked} onaysız
            </div>
            <button
              onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 1500) }}
              className="p-1.5 rounded-[7px] transition-all hover:bg-white/[0.05]"
              style={{ border: '1px solid var(--bdr)' }}
            >
              <RefreshCw size={11} className={cn('text-white/25', scanning && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Filtre tabs */}
        <div className="flex items-center gap-1.5">
          {FILTERS.map(f => {
            const active = filter === f.key
            const dotColor = f.key === 'CRITICAL' ? '#ef4444' : f.key === 'WARNING' ? '#f97316' : f.key === 'INFO' ? '#60a5fa' : undefined
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[11px] font-medium transition-all duration-100',
                  active ? 'text-white' : 'hover:bg-white/[0.04]'
                )}
                style={{
                  background: active ? 'var(--bdr)' : 'var(--s1)',
                  border: active ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--bdr)',
                  color: active ? 'var(--tx)' : 'var(--tx3)',
                }}
              >
                {dotColor && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: active ? dotColor : 'rgba(255,255,255,0.15)' }} />
                )}
                {f.label}
                <span className="text-[10px] num px-1.5 py-px rounded-[5px]"
                  style={{
                    background: active ? 'var(--bdr)' : 'var(--s2)',
                    color: active ? 'var(--tx2)' : 'var(--tx3)',
                  }}>
                  {f.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Anomali listesi */}
        <div className="space-y-3">
          {filtered.map((anomaly, i) => (
            <div key={anomaly.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in">
              <AnomalyCard anomaly={anomaly} onAck={acknowledge} />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-[14px]"
              style={{ background: 'var(--s1)', border: '1px solid var(--bdr)' }}>
              <CheckCircle2 size={28} className="text-emerald-400 mb-3" style={{ opacity: 0.5 }} />
              <div className="text-[13px] font-medium" style={{ color: 'var(--tx2)' }}>
                Bu seviyede anomali yok
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--tx3)' }}>
                Sistem normal çalışıyor
              </div>
            </div>
          )}
        </div>

        {/* İzlenen metrikler */}
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--tx3)' }}>
            İzlenen Metrikler
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Hazırlama Hızı', sub: 'Normalin ±%30 dışı', ok: true },
              { label: 'POS Akışı', sub: '10 dk sipariş gelmezse', ok: true },
              { label: 'İptal Anomalisi', sub: 'Normalin 2x üzeri', ok: false },
              { label: 'Kurye Kesintisi', sub: '15 dk atanasız sipariş', ok: true },
            ].map(m => (
              <div key={m.label}
                className="flex items-start gap-3 rounded-[10px] px-3 py-2.5"
                style={{ background: 'var(--s1)', border: '1px solid var(--bdr)' }}>
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: m.ok ? 'var(--success)' : 'var(--danger)',
                    boxShadow: m.ok ? '0 0 5px rgba(34,197,94,0.7)' : '0 0 5px rgba(239,68,68,0.7)',
                    marginTop: 4,
                  }} />
                <div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--tx2)' }}>{m.label}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--tx3)' }}>{m.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
