'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRiskConfig } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { FileText, TrendingUp, TrendingDown, ShoppingBag, Store, Truck, CloudRain, Zap, Download } from 'lucide-react'

type ReportType = 'daily' | 'weekly' | 'channel' | 'kitchen' | 'weather' | 'campaign' | 'ai-impact' | 'comparison'

const REPORT_TYPES = [
  { id: 'daily', label: 'Günlük Operasyon', icon: FileText, desc: 'Bugünün özeti ve AI değerlendirmesi' },
  { id: 'weekly', label: 'Haftalık Özet', icon: TrendingUp, desc: '7 günlük trend ve karşılaştırma' },
  { id: 'channel', label: 'Kanal Analizi', icon: ShoppingBag, desc: 'Tıkla Gelsin vs Normal Restoran' },
  { id: 'kitchen', label: 'Mutfak / İstasyon', icon: Store, desc: 'Grill, Fryer, Packing, Kurye performansı' },
  { id: 'weather', label: 'Hava Durumu Etkisi', icon: CloudRain, desc: 'Yağış ve sıcaklık sipariş ilişkisi' },
  { id: 'campaign', label: 'Kampanya Etkisi', icon: Zap, desc: 'Aktif kampanya dönemlerinin analizi' },
  { id: 'ai-impact', label: 'AI Aksiyon Etkisi', icon: Zap, desc: 'Önerilen aksiyonların KPI sonuçları' },
  { id: 'comparison', label: 'Restoran Karşılaştırma', icon: TrendingDown, desc: 'Tüm şubeler yan yana' },
]

// Mock report data
const HOURLY_DATA = [
  { hour: '10:00', orders: 12, pulse: 22, delivery: 8, pickup: 2, dine: 2 },
  { hour: '11:00', orders: 28, pulse: 38, delivery: 18, pickup: 4, dine: 6 },
  { hour: '12:00', orders: 67, pulse: 61, delivery: 42, pickup: 8, dine: 17 },
  { hour: '13:00', orders: 84, pulse: 72, delivery: 54, pickup: 10, dine: 20 },
  { hour: '14:00', orders: 45, pulse: 48, delivery: 28, pickup: 7, dine: 10 },
  { hour: '15:00', orders: 31, pulse: 35, delivery: 19, pickup: 5, dine: 7 },
  { hour: '16:00', orders: 38, pulse: 41, delivery: 24, pickup: 6, dine: 8 },
  { hour: '17:00', orders: 52, pulse: 55, delivery: 34, pickup: 8, dine: 10 },
  { hour: '18:00', orders: 91, pulse: 78, delivery: 61, pickup: 12, dine: 18 },
  { hour: '19:00', orders: 118, pulse: 84, delivery: 79, pickup: 15, dine: 24 },
  { hour: '20:00', orders: 103, pulse: 79, delivery: 68, pickup: 13, dine: 22 },
  { hour: '21:00', orders: 72, pulse: 62, delivery: 47, pickup: 9, dine: 16 },
  { hour: '22:00', orders: 41, pulse: 44, delivery: 26, pickup: 6, dine: 9 },
]

const WEEKLY_DATA = [
  { day: 'Pzt', orders: 842, avgPulse: 52, critical: 23 },
  { day: 'Sal', orders: 791, avgPulse: 48, critical: 17 },
  { day: 'Çar', orders: 913, avgPulse: 57, critical: 31 },
  { day: 'Per', orders: 1024, avgPulse: 63, critical: 44 },
  { day: 'Cum', orders: 1287, avgPulse: 71, critical: 67 },
  { day: 'Cmt', orders: 1542, avgPulse: 79, critical: 89 },
  { day: 'Paz', orders: 1389, avgPulse: 74, critical: 72 },
]

const CHANNEL_DATA = [
  { name: 'TG Paket Servis', value: 58, color: '#f97316' },
  { name: 'TG Gel Al', value: 17, color: '#6366f1' },
  { name: 'Normal Restoran', value: 25, color: '#8b5cf6' },
]

const WEATHER_DATA = [
  { condition: 'Güneşli', delivery: 100, dine: 100, pickup: 100 },
  { condition: 'Bulutlu', delivery: 112, dine: 94, pickup: 98 },
  { condition: 'Yağmurlu', delivery: 131, dine: 78, pickup: 89 },
  { condition: 'Fırtına', delivery: 148, dine: 61, pickup: 74 },
]

const KITCHEN_DATA = [
  { station: 'Grill', avgLoad: 68, peakLoad: 92, bottleneckHours: 4.2 },
  { station: 'Fryer', avgLoad: 61, peakLoad: 88, bottleneckHours: 3.1 },
  { station: 'Packing', avgLoad: 74, peakLoad: 97, bottleneckHours: 5.8 },
  { station: 'Kurye', avgLoad: 64, peakLoad: 89, bottleneckHours: 3.9 },
]

const AI_IMPACT_DATA = [
  { action: 'Packing +1 Personel', applied: 23, avgBefore: 12.4, avgAfter: 7.8, improvement: 37 },
  { action: 'Ön Hazırlık Artır', applied: 18, avgBefore: 10.1, avgAfter: 7.2, improvement: 29 },
  { action: 'Kurye Önceliklendirme', applied: 31, avgBefore: 8.9, avgAfter: 5.4, improvement: 39 },
  { action: 'Sipariş Dengesi', applied: 15, avgBefore: 9.7, avgAfter: 7.1, improvement: 27 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.1] rounded-lg px-3 py-2 text-xs">
      <div className="text-white/50 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('daily')
  const [restaurantFilter, setRestaurantFilter] = useState('all')

  const totalOrders = HOURLY_DATA.reduce((s, d) => s + d.orders, 0)
  const totalDelivery = HOURLY_DATA.reduce((s, d) => s + d.delivery, 0)
  const totalPickup = HOURLY_DATA.reduce((s, d) => s + d.pickup, 0)
  const totalDine = HOURLY_DATA.reduce((s, d) => s + d.dine, 0)
  const peakHour = HOURLY_DATA.reduce((max, d) => d.orders > max.orders ? d : max, HOURLY_DATA[0])
  const avgPulse = Math.round(HOURLY_DATA.reduce((s, d) => s + d.pulse, 0) / HOURLY_DATA.length)
  const criticalMinutes = HOURLY_DATA.filter(d => d.pulse >= 80).length * 60

  return (
    <div>
      <Topbar title="Raporlar" subtitle="Operasyon ve performans analizi" />
      <div className="flex h-[calc(100vh-56px)]">

        {/* Left: Report type list */}
        <div className="w-56 border-r border-white/[0.06] bg-[#0a0a0f] py-4 px-2 shrink-0 overflow-y-auto">
          {REPORT_TYPES.map(rt => (
            <button key={rt.id} onClick={() => setActiveReport(rt.id as ReportType)}
              className={cn('w-full flex items-start gap-2.5 px-3 py-3 rounded-lg text-left mb-0.5 transition-all',
                activeReport === rt.id ? 'bg-orange-500/10 border border-orange-500/20' : 'hover:bg-white/[0.04]')}>
              <rt.icon className={cn('w-4 h-4 mt-0.5 shrink-0', activeReport === rt.id ? 'text-orange-400' : 'text-white/30')} />
              <div>
                <div className={cn('text-xs font-medium', activeReport === rt.id ? 'text-orange-300' : 'text-white/60')}>{rt.label}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{rt.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Right: Report content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select value={restaurantFilter} onChange={e => setRestaurantFilter(e.target.value)}
                className="bg-white/[0.06] border border-white/[0.1] text-white text-xs rounded-lg px-3 py-1.5 outline-none">
                <option value="all" className="bg-[#1a1a2e]">Tüm Restoranlar</option>
                {RESTAURANTS.map(r => <option key={r.id} value={r.id} className="bg-[#1a1a2e]">{r.name}</option>)}
              </select>
              {['Bugün', 'Dün', 'Bu Hafta', 'Bu Ay'].map(p => (
                <button key={p} className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/60 transition-colors">{p}</button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/60 transition-colors">
              <Download className="w-3 h-3" /> İndir
            </button>
          </div>

          {/* DAILY REPORT */}
          {activeReport === 'daily' && (
            <div className="space-y-5">
              {/* KPI summary */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Toplam Sipariş', value: totalOrders.toLocaleString(), sub: 'bugün', color: 'text-white' },
                  { label: 'TG Paket Servis', value: totalDelivery.toLocaleString(), sub: `%${Math.round(totalDelivery/totalOrders*100)}`, color: 'text-orange-400' },
                  { label: 'TG Gel Al', value: totalPickup.toLocaleString(), sub: `%${Math.round(totalPickup/totalOrders*100)}`, color: 'text-indigo-400' },
                  { label: 'Normal Restoran', value: totalDine.toLocaleString(), sub: `%${Math.round(totalDine/totalOrders*100)}`, color: 'text-purple-400' },
                  { label: 'Kritik Süre', value: `${criticalMinutes}dk`, sub: 'nabız > 80', color: 'text-red-400' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                    <div className="text-xs text-white/40 uppercase tracking-wide mb-1">{label}</div>
                    <div className={cn('text-2xl font-bold tabular-nums', color)}>{value}</div>
                    <div className="text-xs text-white/30 mt-0.5">{sub}</div>
                  </div>
                ))}
              </div>

              {/* Hourly chart */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Saatlik Sipariş Dağılımı</div>
                  <div className="text-xs text-white/30">En yoğun: <span className="text-orange-400 font-medium">{peakHour.hour} — {peakHour.orders} sipariş</span></div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={HOURLY_DATA}>
                    <defs>
                      <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2} fill="url(#ordersGrad)" name="Sipariş" dot={false} />
                    <Area type="monotone" dataKey="pulse" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#pulseGrad)" name="Nabız" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* AI Daily Summary */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.05] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-300">AI Günlük Değerlendirme</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-white/40 mb-1">En Yoğun Saat</div>
                    <div className="text-lg font-bold text-white">{peakHour.hour} — {String(parseInt(peakHour.hour.split(':')[0]) + 1).padStart(2,'0')}:00</div>
                    <div className="text-xs text-white/40">{peakHour.orders} sipariş · Nabız: {peakHour.pulse}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">Ana Darboğaz</div>
                    <div className="text-lg font-bold text-orange-400">Packing</div>
                    <div className="text-xs text-white/40">Ortalama yük: %74</div>
                  </div>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <div className="text-xs text-white/60 leading-relaxed">
                    <span className="text-white font-medium">Analiz:</span> Yoğunluğun ana nedeni 18:30 sonrası Tıkla Gelsin Paket Servis talep artışı ve packing kapasitesinin talebi karşılayamamasıydı. Yağmurlu hava koşulları paket siparişlerini %{Math.round((totalDelivery/totalOrders)*100 - 55)} puan artırdı.
                  </div>
                  <div className="text-xs text-indigo-300 mt-2 leading-relaxed">
                    <span className="font-medium">Öneri:</span> Benzer koşullarda packing kapasitesi 18:15 itibarıyla artırılmalıdır. Cuma-Cumartesi için +1 packing personeli planlanması önerilir.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WEEKLY REPORT */}
          {activeReport === 'weekly' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">7 Günlük Sipariş Trendi</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={WEEKLY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} name="Sipariş" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Ortalama Nabız Skoru</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={WEEKLY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avgPulse" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} name="Ort. Nabız" />
                    <Line type="monotone" dataKey="critical" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Kritik dk" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CHANNEL REPORT */}
          {activeReport === 'channel' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                  <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Sipariş Kanalı Dağılımı</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={CHANNEL_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {CHANNEL_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {CHANNEL_DATA.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-white/60 flex-1">{d.name}</span>
                        <span className="text-xs font-bold text-white">%{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                  <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Kanal Bazlı Saatlik Dağılım</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={HOURLY_DATA.filter((_, i) => i % 2 === 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="delivery" stackId="a" fill="#f97316" name="TG Paket" />
                      <Bar dataKey="pickup" stackId="a" fill="#6366f1" name="TG Gel Al" />
                      <Bar dataKey="dine" stackId="a" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Restoran" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* KITCHEN REPORT */}
          {activeReport === 'kitchen' && (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-3">
                {KITCHEN_DATA.map(k => (
                  <div key={k.station} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                    <div className="text-xs text-white/40 uppercase tracking-wide mb-2">{k.station}</div>
                    <div className={cn('text-2xl font-bold', k.avgLoad >= 70 ? 'text-orange-400' : 'text-white')}>{k.avgLoad}%</div>
                    <div className="text-xs text-white/30">ort. yük</div>
                    <div className="mt-2 text-xs text-red-400 font-medium">Peak: {k.peakLoad}%</div>
                    <div className="text-xs text-white/30">{k.bottleneckHours}s darboğaz</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">İstasyon Yük Karşılaştırması</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={KITCHEN_DATA} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="station" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avgLoad" fill="#f97316" name="Ort. Yük" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="peakLoad" fill="#ef4444" name="Peak Yük" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* WEATHER REPORT */}
          {activeReport === 'weather' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-2">Hava Koşulu — Sipariş İlişkisi</div>
                <div className="text-xs text-white/30 mb-4">Baz: Güneşli gün = 100 endeks</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={WEATHER_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="condition" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="delivery" fill="#f97316" name="TG Paket" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="dine" fill="#8b5cf6" name="Restoran" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="pickup" fill="#6366f1" name="Gel Al" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.05] p-4">
                  <div className="text-xs text-white/40 mb-2">🌧️ Yağmurlu Günler Etkisi</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-white/60">TG Paket Servis</span><span className="text-emerald-400 font-bold">+%31</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/60">Normal Restoran</span><span className="text-red-400 font-bold">-%22</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/60">Gel Al</span><span className="text-red-400 font-bold">-%11</span></div>
                  </div>
                </div>
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4">
                  <div className="text-xs text-white/40 mb-2">☀️ Güneşli Günler Etkisi</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-white/60">TG Paket Servis</span><span className="text-white/50 font-bold">Baz</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/60">Normal Restoran</span><span className="text-emerald-400 font-bold">+%18</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/60">Gel Al</span><span className="text-emerald-400 font-bold">+%12</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI IMPACT */}
          {activeReport === 'ai-impact' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Toplam Öneri', value: '87', sub: 'bu ay' },
                  { label: 'Uygulama Oranı', value: '%73', sub: '64 / 87' },
                  { label: 'Ort. İyileştirme', value: '%33', sub: 'hazırlama süresinde' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                    <div className="text-xs text-white/40 mb-1">{label}</div>
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-xs text-white/30">{sub}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Aksiyon Etki Analizi</div>
                <div className="space-y-3">
                  {AI_IMPACT_DATA.map(d => (
                    <div key={d.action} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.03]">
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium">{d.action}</div>
                        <div className="text-xs text-white/30 mt-0.5">{d.applied} kez uygulandı</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-white/40 mb-0.5">Öncesi</div>
                        <div className="text-sm font-bold text-red-400">{d.avgBefore}dk</div>
                      </div>
                      <div className="text-white/20">→</div>
                      <div className="text-center">
                        <div className="text-xs text-white/40 mb-0.5">Sonrası</div>
                        <div className="text-sm font-bold text-emerald-400">{d.avgAfter}dk</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-center">
                        <div className="text-sm font-bold text-emerald-400">-%{d.improvement}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COMPARISON */}
          {activeReport === 'comparison' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      {['Restoran', 'Nabız', 'Ort. Hazırlama', 'Kurye Bekl.', 'Açık Sipariş', 'Risk'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-white/30 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RESTAURANTS.map(r => {
                      const pulse = getPulseScore(r.id)
                      const config = getRiskConfig(pulse.risk_level)
                      return (
                        <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="text-sm text-white font-medium">{r.name}</div>
                            <div className="text-xs text-white/30">{r.district}</div>
                          </td>
                          <td className="px-4 py-3"><span className={cn('text-lg font-bold tabular-nums', config.color)}>{pulse.score}</span></td>
                          <td className="px-4 py-3"><span className={cn('text-sm tabular-nums', pulse.avg_prep_time > 10 ? 'text-red-400' : 'text-white/70')}>{pulse.avg_prep_time.toFixed(1)}dk</span></td>
                          <td className="px-4 py-3"><span className={cn('text-sm tabular-nums', pulse.courier_wait > 7 ? 'text-red-400' : 'text-white/70')}>{pulse.courier_wait.toFixed(1)}dk</span></td>
                          <td className="px-4 py-3"><span className="text-sm text-white/70">{pulse.open_orders}</span></td>
                          <td className="px-4 py-3"><span className={cn('text-xs px-2 py-1 rounded-full font-medium', config.badge)}>{config.label}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CAMPAIGN + placeholder for others */}
          {activeReport === 'campaign' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Kampanyalı Gün Siparişi', value: '1.842', diff: '+%23', color: 'text-emerald-400' },
                  { label: 'Kampanyasız Gün Siparişi', value: '1.497', diff: 'baz', color: 'text-white' },
                  { label: 'Kampanya Nabız Etkisi', value: '+11 puan', diff: 'ort. artış', color: 'text-orange-400' },
                ].map(({ label, value, diff, color }) => (
                  <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                    <div className="text-xs text-white/40 mb-1">{label}</div>
                    <div className={cn('text-2xl font-bold', color)}>{value}</div>
                    <div className="text-xs text-white/30">{diff}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Kampanya Dönemleri — Etki Analizi</div>
                <div className="space-y-3">
                  {[
                    { name: 'Whopper Günü', dates: '14–16 Ağu', orders: '+%31', pulse: '+18', packing: '+22', status: 'tamamlandı' },
                    { name: 'Çift Burger Haftası', dates: '1–7 Ağu', orders: '+%24', pulse: '+14', packing: '+17', status: 'tamamlandı' },
                    { name: 'Öğle Menüsü İndirimi', dates: '20–27 Ağu', orders: '+%18', pulse: '+9', packing: '+11', status: 'aktif' },
                  ].map(c => (
                    <div key={c.name} className={cn('flex items-center gap-4 rounded-lg border p-3', c.status === 'aktif' ? 'border-orange-500/30 bg-orange-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]')}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{c.name}</span>
                          {c.status === 'aktif' && <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-medium">Aktif</span>}
                        </div>
                        <div className="text-xs text-white/30 mt-0.5">{c.dates}</div>
                      </div>
                      <div className="text-center"><div className="text-xs text-white/40">Sipariş</div><div className="text-sm font-bold text-emerald-400">{c.orders}</div></div>
                      <div className="text-center"><div className="text-xs text-white/40">Nabız</div><div className="text-sm font-bold text-red-400">{c.pulse}</div></div>
                      <div className="text-center"><div className="text-xs text-white/40">Packing</div><div className="text-sm font-bold text-orange-400">{c.packing}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4 text-xs text-white/60">
                💡 <span className="text-white/80">Kampanyalı günlerde packing kapasitesi ortalama %17 daha fazla zorlanıyor.</span> Kampanya başlamadan 1 gün önce packing kadrosu takviye edilmesi önerilir.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
