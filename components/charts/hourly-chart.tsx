'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { HourlyForecast } from '@/types'

interface HourlyChartProps {
  data: HourlyForecast[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.1] rounded-lg px-3 py-2 text-xs">
      <div className="text-white/50 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white/70">{p.name === 'actual' ? 'Gerçek' : 'Tahmin'}:</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function HourlyChart({ data }: HourlyChartProps) {
  const currentHour = new Date().getHours()
  const splitHour = data.find(d => !d.actual)?.hour

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="predictGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {splitHour && <ReferenceLine x={splitHour} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: 'Şimdi', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />}
        <Area type="monotone" dataKey="actual" stroke="#f97316" strokeWidth={2} fill="url(#actualGrad)" name="actual" connectNulls={false} dot={false} />
        <Area type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" fill="url(#predictGrad)" name="predicted" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
