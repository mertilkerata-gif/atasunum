'use client'
import { use, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { PulseGauge } from '@/components/cards/pulse-gauge'
import { KPICard } from '@/components/cards/kpi-card'
import { StationBar } from '@/components/cards/station-bar'
import { HourlyChart } from '@/components/charts/hourly-chart'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot, getPredictions, getWeather, getHourlyForecast, getRecommendation } from '@/data/seed/mock-data'
import { getRiskConfig, cn, formatDuration } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock, Package, Flame, ChevronLeft, Zap, Users, CloudRain } from 'lucide-react'
import Link from 'next/link'
import { RecommendationAction } from '@/types'

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const restaurant = RESTAURANTS.find(r => r.id === id)
  if (!restaurant) return <div className="p-8 text-white/50">Restoran bulunamadı.</div>

  const pulse = getPulseScore(id)
  const snapshot = getSnapshot(id)
  const predictions = getPredictions(id)
  const weather = getWeather(id)
  const forecast = getHourlyForecast(id)
  const recommendation = getRecommendation(id)
  const config = getRiskConfig(pulse.risk_level)

  return (
    <div>
      <Topbar
        title={restaurant.name}
        subtitle={`${restaurant.district}, ${restaurant.city} · ${weather.icon} ${weather.condition}, ${weather.temperature}°C`}
      />
      <div className="p-6 space-y-6">

        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Link href="/overview" className="text-white/30 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="text-xs text-white/30">{restaurant.brand.replace('_', ' ')}</span>
          <span className="text-white/20">·</span>
          <span className="text-xs text-white/30">{restaurant.region}</span>
        </div>

        {/* Pulse + KPIs */}
        <div className="grid grid-cols-12 gap-4">
          {/* Pulse score card */}
          <div className={cn('col-span-3 rounded-xl border p-6 flex flex-col items-center justify-center gap-4', config.bg, config.border)}>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Operasyon Nabzı</div>
            <PulseGauge score={pulse.score} riskLevel={pulse.risk_level} size="lg" />
            {pulse.top_signals.length > 0 && (
              <div className="w-full space-y-1.5 mt-2">
                {pulse.top_signals.map((s, i) => (
                  <div key={i} className={cn('flex items-start gap-1.5 text-xs', config.color)}>
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPIs */}
          <div className="col-span-5 grid grid-cols-2 gap-3">
            <KPICard label="Açık Sipariş" value={String(pulse.open_orders)} trend="up" trendValue="Normalin %35 üstünde" alert={pulse.open_orders > 25} icon={<Package className="w-4 h-4" />} />
            <KPICard label="Ort. Hazırlama" value={pulse.avg_prep_time.toFixed(1)} unit="dk" trend={pulse.avg_prep_time > 9 ? 'up' : 'neutral'} trendValue={pulse.avg_prep_time > 9 ? 'Hedef: 7 dk' : 'Normal'} alert={pulse.avg_prep_time > 10} icon={<Flame className="w-4 h-4" />} />
            <KPICard label="Packing Süresi" value={pulse.avg_packing_time.toFixed(1)} unit="dk" trend="neutral" trendValue="Stabil" icon={<Package className="w-4 h-4" />} />
            <KPICard label="Kurye Bekleme" value={pulse.courier_wait.toFixed(1)} unit="dk" trend={pulse.courier_wait > 6 ? 'up' : 'neutral'} trendValue={pulse.courier_wait > 6 ? 'Artıyor' : 'Normal'} alert={pulse.courier_wait > 7} icon={<Clock className="w-4 h-4" />} />
            <KPICard label="Aktif Personel" value={String(snapshot.active_staff)} unit="kişi" icon={<Users className="w-4 h-4" />} />
            <KPICard label="Yağış Yoğunluğu" value={String(weather.rain_intensity)} unit="/10" icon={<CloudRain className="w-4 h-4" />} />
          </div>

          {/* Stations */}
          <div className="col-span-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">İstasyon Nabzı</div>
            <div className="space-y-3">
              <StationBar label="Grill" score={pulse.station_scores.grill} icon="🔥" />
              <StationBar label="Fryer" score={pulse.station_scores.fryer} icon="🍟" />
              <StationBar label="Packing" score={pulse.station_scores.packing} icon="📦" />
              <StationBar label="Kurye" score={pulse.station_scores.courier} icon="🛵" />
            </div>

            {/* Channel breakdown */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Sipariş Kanalı</div>
              <div className="space-y-1.5">
                {[
                  { label: 'Tıkla Gelsin Paket', value: snapshot.tiklagelsin_delivery_orders, color: 'bg-orange-500' },
                  { label: 'Tıkla Gelsin Gel Al', value: snapshot.tiklagelsin_pickup_orders, color: 'bg-blue-500' },
                  { label: 'Normal Restoran', value: snapshot.restaurant_orders, color: 'bg-purple-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-white/50 flex-1">{label}</span>
                    <span className="text-xs font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Forecast row */}
        <div className="grid grid-cols-12 gap-4">
          {/* Hourly chart */}
          <div className="col-span-8 rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Saatlik Sipariş Trendi</div>
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-orange-500 inline-block" />Gerçek</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-indigo-500 inline-block border-dashed" />Tahmin</span>
              </div>
            </div>
            <HourlyChart data={forecast} />
          </div>

          {/* Predictions */}
          <div className="col-span-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">İleriye Dönük Tahmin</div>
            <div className="space-y-3">
              {predictions.map(p => {
                const pConfig = getRiskConfig(p.predicted_pulse_score >= 80 ? 'KRITIK' : p.predicted_pulse_score >= 60 ? 'RISKLI' : p.predicted_pulse_score >= 40 ? 'YOGUN' : 'NORMAL')
                return (
                  <div key={p.horizon_minutes} className={cn('rounded-lg border p-3', pConfig.bg, pConfig.border)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/50 font-medium">+{p.horizon_minutes} dk</span>
                      <span className={cn('text-lg font-bold tabular-nums', pConfig.color)}>{p.predicted_pulse_score}</span>
                    </div>
                    <div className="text-xs text-white/40">{p.predicted_orders} sipariş bekleniyor</div>
                    <div className="text-xs text-white/30 mt-0.5">Güven: %{Math.round(p.confidence_score * 100)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        {recommendation && (
          <RecommendationPanel recommendation={recommendation} />
        )}

        {/* Ürün & Stok + Şikayet özeti */}
        <ProductComplaintRow restaurantId={id} />

      </div>
    </div>
  )
}

function RecommendationPanel({ recommendation }: { recommendation: NonNullable<ReturnType<typeof getRecommendation>> }) {
  const [actions, setActions] = useState(recommendation.actions)

  const toggle = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, applied: !a.applied, applied_at: !a.applied ? new Date().toISOString() : undefined } : a))
  }

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.05] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-semibold text-indigo-300">Operasyon Reçetesi</span>
        <span className="ml-auto text-xs text-white/30">{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p className="text-xs text-white/60 mb-1">{recommendation.summary}</p>
      <p className="text-xs text-white/40 mb-4">{recommendation.risk_explanation}</p>

      <div className="space-y-2">
        {actions.map(action => (
          <div key={action.id} className={cn(
            'flex items-start gap-3 rounded-lg border p-3 transition-all',
            action.applied
              ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
              : action.priority === 'HIGH'
                ? 'border-red-500/20 bg-red-500/[0.04]'
                : 'border-white/[0.08] bg-white/[0.03]'
          )}>
            <button
              onClick={() => toggle(action.id)}
              className={cn(
                'mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                action.applied
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-white/20 hover:border-white/40'
              )}
            >
              {action.applied && <CheckCircle className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1">
              <div className={cn('text-sm', action.applied ? 'text-white/40 line-through' : 'text-white/80')}>{action.action_text}</div>
              {action.expected_improvement && !action.applied && (
                <div className="text-xs text-white/35 mt-0.5">→ {action.expected_improvement}</div>
              )}
              {action.applied && action.applied_at && (
                <div className="text-xs text-emerald-400/70 mt-0.5">✓ Uygulandı · {new Date(action.applied_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
              )}
            </div>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium uppercase', action.priority === 'HIGH' ? 'bg-red-500/20 text-red-300' : 'bg-white/[0.06] text-white/40')}>
              {action.priority === 'HIGH' ? 'Acil' : 'Orta'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductComplaintRow({ restaurantId }: { restaurantId: string }) {
  const { getProductSnapshot } = require('@/data/seed/products')
  const { getComplaintSummary, REASON_LABELS } = require('@/data/seed/complaints')
  const { getRevenueSnapshot } = require('@/data/seed/revenue')
  const { cn } = require('@/lib/utils')

  const products = getProductSnapshot(restaurantId)
  const complaints = getComplaintSummary(restaurantId)
  const revenue = getRevenueSnapshot(restaurantId)

  const topProducts = [...products.products].sort((a: any, b: any) => b.demandIndex - a.demandIndex).slice(0, 4)
  const topComplaint = Object.entries(complaints.byReason as Record<string, number>)
    .sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 3)

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Ürün yoğunluğu */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Ürün Yoğunluğu</div>
        <div className="space-y-3">
          {topProducts.map((p: any) => {
            const color = p.demandIndex >= 150 ? '#ff3d3d' : p.demandIndex >= 120 ? '#f97316' : p.demandIndex >= 100 ? '#eab308' : '#22c55e'
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/60">{p.name}</span>
                    <span className="text-xs font-bold font-mono" style={{ color }}>%{p.demandIndex}</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(p.demandIndex, 200) / 2}%`, background: color }} />
                  </div>
                </div>
                {p.stockRisk !== 'ok' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-red-300" style={{ background: 'rgba(255,61,61,0.15)' }}>
                    {p.stockUnits}a
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Şikayet özeti */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Müşteri Şikayeti</div>
          <span className={cn('text-xl font-bold font-mono', complaints.total > 15 ? 'text-red-400' : complaints.total > 8 ? 'text-orange-400' : 'text-white/50')}>{complaints.total}</span>
        </div>
        <div className="space-y-2 mb-4">
          {topComplaint.map(([reason, count]: [string, any]) => count > 0 && (
            <div key={reason} className="flex items-center justify-between">
              <span className="text-xs text-white/50">{(REASON_LABELS as any)[reason]}</span>
              <span className="text-xs font-bold text-white/70">{count}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex-1">
            <div className="text-[10px] text-white/30">Kayıp Ciro</div>
            <div className="text-sm font-bold font-mono text-red-400">{complaints.totalLostRevenue.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div>
            <div className="text-[10px] text-white/30">Çözüm</div>
            <div className="text-sm font-bold font-mono text-emerald-400">%{Math.round(complaints.resolvedRate * 100)}</div>
          </div>
        </div>
      </div>

      {/* Ciro özeti */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Ciro Durumu</div>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-white/30 mb-0.5">Gerçekleşen</div>
            <div className="text-xl font-bold font-mono text-white">{revenue.actualRevenue.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div>
            <div className="text-[10px] text-white/30 mb-0.5">Kayıp Ciro</div>
            <div className="text-lg font-bold font-mono text-red-400">{revenue.totalLostRevenue.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="text-[10px] text-white/30 mb-1.5">Kapasite Kullanımı</div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${revenue.capacityUtilization}%`, background: revenue.capacityUtilization > 80 ? '#ff3d3d' : '#22c55e' }} />
            </div>
            <div className="text-xs font-mono text-white/40 mt-1">%{revenue.capacityUtilization}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
