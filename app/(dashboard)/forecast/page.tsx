'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getHourlyForecast, getPredictions } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { RiskLevel } from '@/types'

const UPCOMING_ALERTS = [
  { restaurantId: 'r1', message: '18:35–18:55 arasında yüksek operasyonel yoğunluk bekleniyor', orders: 57, confidence: 87, risk: 'packing darboğazı' },
  { restaurantId: 'r6', message: '19:00–19:30 arasında kritik seviye riski', orders: 72, confidence: 91, risk: 'tüm istasyonlar' },
  { restaurantId: 'r5', message: '18:45 sonrası kurye bekleme artışı', orders: 41, confidence: 78, risk: 'kurye kapasitesi' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.1] rounded-lg px-3 py-2 text-xs">
      <div className="text-white/50 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mt-0.5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white/60">{p.name === 'actual' ? 'Gerçek' : p.name === 'predicted' ? 'Tahmin' : 'Nabız'}:</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ForecastPage() {
  const [selectedRestaurant, setSelectedRestaurant] = useState('r1')

  const restaurant = RESTAURANTS.find(r => r.id === selectedRestaurant)!
  const pulse = getPulseScore(selectedRestaurant)
  const forecast = getHourlyForecast(selectedRestaurant)
  const predictions = getPredictions(selectedRestaurant)
  const pulseConfig = getRiskConfig(pulse.risk_level)

  const peakHour = forecast.reduce((max, d) => d.predicted > max.predicted ? d : max, forecast[0])
  const currentHour = new Date().getHours()
  const remainingForecast = forecast.filter(f => parseInt(f.hour.split(':')[0]) >= currentHour)

  return (
    <div>
      <Topbar title="Tahmin" subtitle="İleriye dönük operasyon tahmini" />
      <div className="p-6 space-y-5">

        {/* Restaurant selector */}
        <div className="flex items-center gap-3 flex-wrap">
          {RESTAURANTS.map(r => {
            const p = getPulseScore(r.id)
            const c = getRiskConfig(p.risk_level)
            return (
              <button key={r.id} onClick={() => setSelectedRestaurant(r.id)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
                  selectedRestaurant === r.id ? `${c.bg} ${c.border} ${c.color} font-medium` : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                <div className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
                {r.name.split(' ').slice(-2).join(' ')}
                <span className="font-bold">{p.score}</span>
              </button>
            )
          })}
        </div>

        {/* Upcoming alerts */}
        {UPCOMING_ALERTS.filter(a => a.restaurantId === selectedRestaurant).map((alert, i) => (
          <div key={i} className="rounded-xl border border-orange-500/30 bg-orange-500/[0.06] p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-orange-300 mb-1">{alert.message}</div>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>Tahmini sipariş: <strong className="text-white">{alert.orders}</strong></span>
                  <span>Güven: <strong className="text-emerald-400">%{alert.confidence}</strong></span>
                  <span>Risk: <strong className="text-orange-400">{alert.risk}</strong></span>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-12 gap-5">
          {/* Main forecast chart */}
          <div className="col-span-8 rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Saatlik Yoğunluk Tahmini</div>
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-orange-500 inline-block" />Gerçek</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-indigo-400 inline-block border-dashed" />Tahmin</span>
              </div>
            </div>
            <div className="text-xs text-white/30 mb-4">
              En yoğun beklenen saat: <span className="text-orange-400 font-medium">{peakHour.hour} — {peakHour.predicted} sipariş</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecast}>
                <defs>
                  <linearGradient id="actualG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predictG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={`${currentHour}:00`} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4"
                  label={{ value: 'Şimdi', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Area type="monotone" dataKey="actual" stroke="#f97316" strokeWidth={2} fill="url(#actualG)" name="actual" dot={false} connectNulls={false} />
                <Area type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" fill="url(#predictG)" name="predicted" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Horizon predictions */}
          <div className="col-span-4 space-y-3">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium">İleriye Dönük Tahmin</div>
            {predictions.map(p => {
              const riskLevel: RiskLevel = p.predicted_pulse_score >= 80 ? 'KRITIK' : p.predicted_pulse_score >= 60 ? 'RISKLI' : p.predicted_pulse_score >= 40 ? 'YOGUN' : 'NORMAL'
              const pConfig = getRiskConfig(riskLevel)
              return (
                <div key={p.horizon_minutes} className={cn('rounded-xl border p-4', pConfig.bg, pConfig.border)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-xs font-semibold text-white/60">+{p.horizon_minutes} dakika</span>
                    </div>
                    <span className={cn('text-2xl font-bold tabular-nums', pConfig.color)}>{p.predicted_pulse_score}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <div className="text-white/30 mb-0.5">Beklenen Sipariş</div>
                      <div className="font-bold text-white">{p.predicted_orders}</div>
                    </div>
                    <div>
                      <div className="text-white/30 mb-0.5">Gecikme Riski</div>
                      <div className={cn('font-bold', p.delay_probability > 0.5 ? 'text-red-400' : 'text-emerald-400')}>%{Math.round(p.delay_probability * 100)}</div>
                    </div>
                  </div>
                  {/* Station overload bars */}
                  <div className="space-y-1.5">
                    {(['packing', 'grill', 'courier'] as const).map(st => (
                      <div key={st} className="flex items-center gap-2">
                        <span className="text-[10px] text-white/30 w-12 capitalize">{st}</span>
                        <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', p.station_overload[st] >= 80 ? 'bg-red-500' : p.station_overload[st] >= 60 ? 'bg-orange-500' : 'bg-emerald-500')}
                            style={{ width: `${p.station_overload[st]}%` }} />
                        </div>
                        <span className={cn('text-[10px] font-bold w-6 text-right', p.station_overload[st] >= 80 ? 'text-red-400' : 'text-white/40')}>{p.station_overload[st]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-white/25 mt-2">Güven: %{Math.round(p.confidence_score * 100)}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Similar days */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Benzer Günler</div>
          <div className="text-xs text-white/30 mb-4">
            Bugünkü koşullara (hava, gün, saat, kampanya) göre geçmişteki en benzer operasyonlar:
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { date: '12.06.2026', similarity: 94, orders: 1284, peak: '19:10', peakOrders: 118 },
              { date: '21.05.2026', similarity: 91, orders: 1197, peak: '18:45', peakOrders: 109 },
              { date: '28.08.2025', similarity: 89, orders: 1341, peak: '19:30', peakOrders: 124 },
            ].map(day => (
              <div key={day.date} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">{day.date}</span>
                  <span className="text-xs font-bold text-emerald-400">%{day.similarity} benzer</span>
                </div>
                <div className="text-sm font-bold text-white">{day.orders.toLocaleString()} sipariş</div>
                <div className="text-xs text-white/30 mt-1">Peak: {day.peak} — {day.peakOrders} sipariş</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.05] p-3 text-xs text-white/60">
            💡 <span className="text-white/80">Benzer operasyonlarda saat 18:40 sonrası ortalama %31 talep artışı gerçekleşmiştir.</span> Packing kapasitesinin 18:15 itibarıyla artırılması önerilir.
          </div>
        </div>
      </div>
    </div>
  )
}
