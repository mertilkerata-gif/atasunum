'use client'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getRevenueSnapshot, getNetworkRevenueSummary } from '@/data/seed/revenue'
import { getPulseScore } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { TrendingDown, TrendingUp, DollarSign, AlertTriangle, Target } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2 text-xs" style={{ background: '#13131e', borderColor: 'rgba(255,255,255,0.1)' }}>
      <div className="text-white/40 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mt-0.5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-semibold">{typeof p.value === 'number' ? p.value.toLocaleString('tr-TR') + ' ₺' : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function RevenuePage() {
  const network = getNetworkRevenueSummary()
  const all = network.restaurantBreakdown

  const lossBreakdown = [
    { name: 'İptal Nedeniyle', value: all.reduce((s, r) => s + r.lostRevenueCancelled, 0), color: '#ff3d3d' },
    { name: 'Gecikme Terki', value: all.reduce((s, r) => s + r.lostRevenueDelayed, 0), color: '#f97316' },
    { name: 'Şikayet İadesi', value: all.reduce((s, r) => s + r.lostRevenueComplaints, 0), color: '#eab308' },
  ]

  const barData = RESTAURANTS.map(r => {
    const rev = getRevenueSnapshot(r.id)
    const pulse = getPulseScore(r.id)
    return {
      name: r.name.replace('Burger King ', 'BK ').replace('Popeyes ', 'Pop.'),
      actual: rev.actualRevenue,
      lost: rev.totalLostRevenue,
      missed: rev.missedRevenueOpportunity,
      pulse: pulse.score,
      riskLevel: pulse.risk_level,
    }
  }).sort((a, b) => b.lost - a.lost)

  return (
    <div>
      <Topbar title="Satış & Ciro Analizi" subtitle="Kayıp ciro, fırsat analizi ve satış planlama" />
      <div className="p-6 space-y-5">

        {/* Network summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Günlük Gerçekleşen Ciro', value: network.totalActual, suffix: ' ₺', color: 'text-white', icon: <DollarSign className="w-4 h-4" /> },
            { label: 'Kayıp Ciro (Bugün)', value: network.totalLost, suffix: ' ₺', color: 'text-red-400', icon: <TrendingDown className="w-4 h-4" /> },
            { label: 'Fırsat Kaybı', value: network.totalMissed, suffix: ' ₺', color: 'text-orange-400', icon: <AlertTriangle className="w-4 h-4" />, sub: 'Kapasite dolsaydı' },
            { label: 'Ort. Sipariş Değeri', value: network.avgOrderValue, suffix: ' ₺', color: 'text-emerald-400', icon: <Target className="w-4 h-4" /> },
          ].map(({ label, value, suffix, color, icon, sub }) => (
            <div key={label} className="rounded-2xl border p-5 relative overflow-hidden"
              style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/30 uppercase tracking-widest">{label}</span>
                <span className={cn('opacity-40', color)}>{icon}</span>
              </div>
              <div className={cn('text-2xl font-bold font-mono', color)}>
                {value.toLocaleString('tr-TR')}{suffix}
              </div>
              {sub && <div className="text-[10px] text-white/25 mt-1">{sub}</div>}
            </div>
          ))}
        </div>

        {/* Kayıp ciro dağılımı */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-4 rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Kayıp Ciro — Neden?</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={lossBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                  {lossBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 mt-3">
              {lossBreakdown.map(d => (
                <div key={d.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-white/50 flex-1">{d.name}</span>
                  <span className="text-xs font-bold font-mono text-white">{d.value.toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
            </div>
          </div>

          {/* Restoran bazlı kayıp */}
          <div className="col-span-8 rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Restoran Bazlı Ciro Analizi</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={40} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="actual" name="Gerçekleşen" fill="#22c55e" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="lost" name="Kayıp" fill="#ff3d3d" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="missed" name="Fırsat" fill="rgba(249,115,22,0.3)" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Restoran detay tablosu */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Detaylı Analiz</div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                {['Restoran', 'Nabız', 'Gerçekleşen Ciro', 'Kayıp Ciro', 'Fırsat Kaybı', 'Kapasite', 'Büyüme'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-white/25 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESTAURANTS.map(r => {
                const rev = getRevenueSnapshot(r.id)
                const pulse = getPulseScore(r.id)
                const config = getRiskConfig(pulse.risk_level)
                return (
                  <tr key={r.id} className="border-b transition-colors hover:bg-white/[0.02]"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="px-5 py-3">
                      <div className="text-xs font-medium text-white/70">{r.name}</div>
                      <div className="text-[10px] text-white/25">{r.district}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
                        <span className={cn('text-sm font-bold font-mono', config.color)}>{pulse.score}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-bold font-mono text-white">{rev.actualRevenue.toLocaleString('tr-TR')} ₺</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-sm font-bold font-mono', rev.totalLostRevenue > 2000 ? 'text-red-400' : rev.totalLostRevenue > 1000 ? 'text-orange-400' : 'text-white/50')}>
                        {rev.totalLostRevenue.toLocaleString('tr-TR')} ₺
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-mono text-orange-400/70">{rev.missedRevenueOpportunity.toLocaleString('tr-TR')} ₺</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${rev.capacityUtilization}%`, background: rev.capacityUtilization > 80 ? '#ff3d3d' : rev.capacityUtilization > 60 ? '#f97316' : '#22c55e' }} />
                        </div>
                        <span className="text-xs font-mono text-white/40">%{rev.capacityUtilization}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className={cn('flex items-center gap-1 text-xs font-bold', rev.revenueGrowth > 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {rev.revenueGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {rev.revenueGrowth > 0 ? '+' : ''}{rev.revenueGrowth}%
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* AI insight */}
        <div className="rounded-2xl border p-5" style={{ background: 'rgba(129,140,248,0.04)', borderColor: 'rgba(129,140,248,0.15)' }}>
          <div className="flex items-start gap-3">
            <div className="text-indigo-400 shrink-0 mt-0.5">💡</div>
            <div>
              <div className="text-sm font-semibold text-indigo-300 mb-1">AI Ciro Analizi</div>
              <div className="text-xs text-white/50 leading-relaxed">
                Bugün toplam <span className="text-white font-medium">{network.totalLost.toLocaleString('tr-TR')} ₺</span> kayıp ciro tespit edildi.
                Bunun <span className="text-red-400 font-medium">%{Math.round(lossBreakdown[0].value / network.totalLost * 100)}'i gecikmiş teslimat iptallerinden</span> kaynaklanıyor.
                Operasyonel önlemler alınırsa <span className="text-emerald-400 font-medium">%60–70 oranında önlenebilir</span>.
                En kritik restoran: <span className="text-orange-400 font-medium">{RESTAURANTS.find(r => r.id === barData[0]?.name ? r.name.includes(barData[0].name.replace('BK ', '').replace('Pop.', '')) : false)?.name ?? 'Popeyes Taksim'}</span>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
