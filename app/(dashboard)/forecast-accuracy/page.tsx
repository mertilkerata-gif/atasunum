'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'

const ACCURACY_DATA = [
  { hour: '14:00', predicted: 38, actual: 41, diff: 3 },
  { hour: '15:00', predicted: 45, actual: 43, diff: -2 },
  { hour: '16:00', predicted: 52, actual: 55, diff: 3 },
  { hour: '17:00', predicted: 68, actual: 71, diff: 3 },
  { hour: '18:00', predicted: 94, actual: 98, diff: 4 },
  { hour: '18:30', predicted: 127, actual: 132, diff: 5 },
  { hour: '19:00', predicted: 141, actual: 138, diff: -3 },
  { hour: '19:30', predicted: 128, actual: 121, diff: -7 },
  { hour: '20:00', predicted: 109, actual: 114, diff: 5 },
  { hour: '21:00', predicted: 72, actual: 69, diff: -3 },
]

const WEEKLY_ACCURACY = [
  { day: 'Pzt', mae: 4.2, mape: 5.1, accuracy: 94.9 },
  { day: 'Sal', mae: 3.8, mape: 4.7, accuracy: 95.3 },
  { day: 'Çar', mae: 5.1, mape: 6.2, accuracy: 93.8 },
  { day: 'Per', mae: 6.3, mape: 7.8, accuracy: 92.2 },
  { day: 'Cum', mae: 8.9, mape: 9.4, accuracy: 90.6 },
  { day: 'Cmt', mae: 11.2, mape: 11.8, accuracy: 88.2 },
  { day: 'Paz', mae: 9.7, mape: 10.3, accuracy: 89.7 },
]

const RESTAURANT_ACCURACY = RESTAURANTS.map(r => ({
  id: r.id, name: r.name.replace('Burger King ', 'BK ').replace('Popeyes ', 'Pop. '),
  mae: +(4 + Math.sin(r.id.charCodeAt(1)) * 2).toFixed(1),
  mape: +(5 + Math.sin(r.id.charCodeAt(1)) * 2.5).toFixed(1),
  accuracy: +(95 - Math.sin(r.id.charCodeAt(1)) * 3).toFixed(1),
}))

function calcMAE(data: typeof ACCURACY_DATA) {
  return (data.reduce((s, d) => s + Math.abs(d.diff), 0) / data.length).toFixed(1)
}
function calcMAPE(data: typeof ACCURACY_DATA) {
  return (data.reduce((s, d) => s + Math.abs(d.diff / d.actual) * 100, 0) / data.length).toFixed(1)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.1] rounded-lg px-3 py-2 text-xs">
      <div className="text-white/50 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mt-0.5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ForecastAccuracyPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today')
  const [restaurantFilter, setRestaurantFilter] = useState('all')

  const mae = calcMAE(ACCURACY_DATA)
  const mape = calcMAPE(ACCURACY_DATA)
  const accuracy = (100 - parseFloat(mape)).toFixed(1)

  return (
    <div>
      <Topbar title="Tahmin Doğruluğu" subtitle="MAE · MAPE · Gerçekleşen vs Tahmin" />
      <div className="p-6 space-y-5">

        {/* Period tabs */}
        <div className="flex items-center gap-2">
          {[{ v: 'today', l: 'Bugün' }, { v: '7d', l: '7 Gün' }, { v: '30d', l: '30 Gün' }].map(({ v, l }) => (
            <button key={v} onClick={() => setPeriod(v as typeof period)}
              className={cn('px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                period === v ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
              {l}
            </button>
          ))}
          <div className="ml-auto">
            <select value={restaurantFilter} onChange={e => setRestaurantFilter(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.1] text-white text-sm rounded-lg px-3 py-1.5 outline-none">
              <option value="all" className="bg-[#1a1a2e]">Tüm Restoranlar</option>
              {RESTAURANTS.map(r => <option key={r.id} value={r.id} className="bg-[#1a1a2e]">{r.name}</option>)}
            </select>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'MAE', value: mae, desc: 'Ortalama Mutlak Hata', color: 'text-white', good: parseFloat(mae) < 7 },
            { label: 'MAPE', value: `%${mape}`, desc: 'Ort. Mutlak Yüzde Hata', color: 'text-white', good: parseFloat(mape) < 8 },
            { label: 'Doğruluk', value: `%${accuracy}`, desc: '100 - MAPE', color: 'text-emerald-400', good: true },
            { label: 'Tahmin Sayısı', value: ACCURACY_DATA.length.toString(), desc: 'bugün değerlendirilen', color: 'text-white', good: true },
          ].map(({ label, value, desc, color, good }) => (
            <div key={label} className={cn('rounded-xl border p-4', good ? 'border-white/[0.08] bg-white/[0.04]' : 'border-orange-500/20 bg-orange-500/[0.04]')}>
              <div className="text-xs text-white/40 uppercase tracking-wide mb-1">{label}</div>
              <div className={cn('text-2xl font-bold tabular-nums', color)}>{value}</div>
              <div className="text-xs text-white/30 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>

        {/* Main comparison chart */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Tahmin vs Gerçekleşen — Saatlik</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ACCURACY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }} />
              <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Tahmin" />
              <Line type="monotone" dataKey="actual" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} name="Gerçek" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Weekly accuracy trend */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Haftalık Doğruluk Trendi</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={WEEKLY_ACCURACY}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="accuracy" fill="#6366f1" name="Doğruluk %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Restaurant accuracy table */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Restoran Bazlı Doğruluk</div>
            <div className="space-y-2">
              {RESTAURANT_ACCURACY.sort((a, b) => b.accuracy - a.accuracy).map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/70 truncate">{r.name}</div>
                  </div>
                  <div className="text-xs text-white/40 w-16 text-right">MAE: {r.mae}</div>
                  <div className="w-20">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', r.accuracy >= 93 ? 'bg-emerald-500' : r.accuracy >= 90 ? 'bg-yellow-500' : 'bg-orange-500')}
                          style={{ width: `${r.accuracy - 80}%` }} />
                      </div>
                      <span className={cn('text-xs font-bold w-10 text-right', r.accuracy >= 93 ? 'text-emerald-400' : r.accuracy >= 90 ? 'text-yellow-400' : 'text-orange-400')}>
                        %{r.accuracy}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error distribution */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Hata Dağılımı (Tahmin − Gerçek)</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={ACCURACY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="diff" name="Hata" radius={[3, 3, 0, 0]}
                fill="#6366f1"
                // Positive = over-predicted (blue), negative = under-predicted (orange)
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
            <span>🔵 Pozitif = Fazla tahmin</span>
            <span>⬛ Negatif = Eksik tahmin</span>
          </div>
        </div>
      </div>
    </div>
  )
}
