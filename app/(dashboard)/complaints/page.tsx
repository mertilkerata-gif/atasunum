'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getComplaintSummary, getAllComplaintSummaries, REASON_LABELS } from '@/data/seed/complaints'
import { getPulseScore } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts'
import { MessageSquare, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2 text-xs" style={{ background: '#13131e', borderColor: 'rgba(255,255,255,0.1)' }}>
      <div className="text-white/40 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mt-0.5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white font-semibold">{p.value}{p.name === 'lostRevenue' ? ' ₺' : ''}</span>
        </div>
      ))}
    </div>
  )
}

export default function ComplaintsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const allSummaries = getAllComplaintSummaries()
  const selected = selectedId ? getComplaintSummary(selectedId) : null
  const selectedRestaurant = selectedId ? RESTAURANTS.find(r => r.id === selectedId) : null

  const totalComplaints = allSummaries.reduce((s, c) => s + c.total, 0)
  const totalLost = allSummaries.reduce((s, c) => s + c.totalLostRevenue, 0)
  const avgRate = (allSummaries.reduce((s, c) => s + c.complaintRate, 0) / allSummaries.length * 100).toFixed(2)

  // En çok şikayet alan restoranlar
  const ranked = [...allSummaries].sort((a, b) => b.total - a.total)

  const reasonData = Object.entries(REASON_LABELS).map(([key, label]) => ({
    label: label.length > 12 ? label.slice(0, 12) + '…' : label,
    fullLabel: label,
    count: allSummaries.reduce((s, c) => s + (c.byReason[key as keyof typeof c.byReason] ?? 0), 0),
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  return (
    <div>
      <Topbar title="Müşteri Şikayetleri" subtitle="Şikayet analizi ve kayıp ciro etkisi" />
      <div className="p-6 space-y-5">

        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam Şikayet', value: totalComplaints, unit: 'bugün', color: 'text-red-400', icon: <MessageSquare className="w-4 h-4" /> },
            { label: 'Kayıp Ciro', value: `${totalLost.toLocaleString('tr-TR')} ₺`, unit: 'iade + iptal', color: 'text-orange-400', icon: <TrendingDown className="w-4 h-4" /> },
            { label: 'Ort. Şikayet Oranı', value: `%${avgRate}`, unit: 'sipariş başına', color: 'text-yellow-400', icon: <AlertTriangle className="w-4 h-4" /> },
            { label: 'Çözüm Oranı', value: '%72', unit: 'ortalama', color: 'text-emerald-400', icon: <TrendingUp className="w-4 h-4" /> },
          ].map(({ label, value, unit, color, icon }) => (
            <div key={label} className="rounded-2xl border p-5 relative overflow-hidden"
              style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/30 uppercase tracking-widest">{label}</span>
                <span className={cn('opacity-50', color)}>{icon}</span>
              </div>
              <div className={cn('text-2xl font-bold font-mono', color)}>{value}</div>
              <div className="text-[11px] text-white/25 mt-1">{unit}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Restoran sıralaması */}
          <div className="col-span-4 rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Restoran Sıralaması</div>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {ranked.map((summary, i) => {
                const restaurant = RESTAURANTS.find(r => r.id === summary.restaurantId)!
                const pulse = getPulseScore(summary.restaurantId)
                const config = getRiskConfig(pulse.risk_level)
                const isSelected = selectedId === summary.restaurantId
                return (
                  <button key={summary.restaurantId} onClick={() => setSelectedId(isSelected ? null : summary.restaurantId)}
                    className={cn('w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all',
                      isSelected ? 'bg-orange-500/[0.08]' : 'hover:bg-white/[0.03]')}>
                    <span className="text-[11px] font-mono text-white/20 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white/70 truncate">{restaurant.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', config.badge)}>{config.label}</span>
                        <span className="text-[10px] text-white/30">{summary.totalLostRevenue.toLocaleString('tr-TR')} ₺ kayıp</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn('text-lg font-bold font-mono', summary.total > 15 ? 'text-red-400' : summary.total > 8 ? 'text-orange-400' : 'text-white/60')}>
                        {summary.total}
                      </div>
                      <div className="flex items-center gap-0.5 justify-end">
                        {summary.trend === 'up' ? <TrendingUp className="w-2.5 h-2.5 text-red-400" /> : summary.trend === 'down' ? <TrendingDown className="w-2.5 h-2.5 text-emerald-400" /> : <Minus className="w-2.5 h-2.5 text-white/20" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sağ taraf */}
          <div className="col-span-8 space-y-5">
            {/* Şikayet türleri */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Şikayet Türü Dağılımı</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={reasonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="label" type="category" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Şikayet" radius={[0, 4, 4, 0]}>
                    {reasonData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#ff3d3d' : i === 1 ? '#f97316' : i === 2 ? '#eab308' : 'rgba(255,255,255,0.15)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Seçili restoran detayı veya haftalık trend */}
            {selected && selectedRestaurant ? (
              <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Seçili Restoran</div>
                    <div className="text-sm font-semibold text-white">{selectedRestaurant.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-red-400">{selected.total}</div>
                    <div className="text-[10px] text-white/30">şikayet · bugün</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Kayıp Ciro', value: `${selected.totalLostRevenue.toLocaleString('tr-TR')} ₺` },
                    { label: 'Ort. Puan', value: `${selected.avgScore}/5` },
                    { label: 'Çözüm Oranı', value: `%${Math.round(selected.resolvedRate * 100)}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="text-sm font-bold text-white">{value}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={selected.weeklyTrend}>
                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#ff3d3d" radius={[3, 3, 0, 0]} name="Şikayet" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Haftalık Şikayet Trendi — Tüm Ağ</div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((day, i) => ({
                    day,
                    count: allSummaries.reduce((s, c) => s + (c.weeklyTrend[i]?.count ?? 0), 0),
                    revenue: allSummaries.reduce((s, c) => s + (c.weeklyTrend[i]?.lostRevenue ?? 0), 0),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#ff3d3d" strokeWidth={2} dot={{ fill: '#ff3d3d', r: 3 }} name="Şikayet" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 text-xs text-white/25 text-center">Restoran seçmek için sol listeden tıklayın</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
