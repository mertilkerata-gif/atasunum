'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'
import { getComplaintSummary } from '@/data/seed/complaints'
import { getRevenueSnapshot } from '@/data/seed/revenue'
import { getRiskConfig, cn } from '@/lib/utils'

export default function RiskMatrixPage() {
  const [hovered, setHovered] = useState<string | null>(null)

  const data = RESTAURANTS.map(r => {
    const pulse = getPulseScore(r.id)
    const comp = getComplaintSummary(r.id)
    const rev = getRevenueSnapshot(r.id)
    // X: olasılık (nabız skoru), Y: etki (kayıp ciro + şikayet)
    const probability = pulse.score / 100  // 0-1
    const impact = Math.min(1, (rev.totalLostRevenue / 5000 + comp.total / 25) / 2)  // 0-1
    return { restaurant: r, pulse, comp, rev, probability, impact }
  })

  const quadrants = [
    { x: 0,   y: 0.5, w: 0.5, h: 0.5, label: 'İzle',       desc: 'Yüksek etki, düşük olasılık', color: 'rgba(234,179,8,0.06)',  border: 'rgba(234,179,8,0.12)'   },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5, label: 'Acil Aksiyon',desc: 'Yüksek etki, yüksek olasılık',color: 'rgba(255,61,61,0.06)',  border: 'rgba(255,61,61,0.12)'   },
    { x: 0,   y: 0,   w: 0.5, h: 0.5, label: 'Kabul Et',    desc: 'Düşük etki, düşük olasılık', color: 'rgba(34,197,94,0.04)',   border: 'rgba(34,197,94,0.08)'   },
    { x: 0.5, y: 0,   w: 0.5, h: 0.5, label: 'Azalt',       desc: 'Düşük etki, yüksek olasılık', color: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.10)'  },
  ]

  const W = 600, H = 400

  return (
    <div>
      <Topbar title="Operasyonel Risk Matrisi" subtitle="Olasılık × Etki büyüklüğü analizi" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-12 gap-5">
          {/* Matrix */}
          <div className="col-span-8 rounded-2xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Risk Matrisi</div>
            <div className="relative" style={{ paddingLeft: '32px', paddingBottom: '28px' }}>
              {/* Y axis label */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-white/25 uppercase tracking-widest whitespace-nowrap">Etki Büyüklüğü →</div>
              {/* X axis label */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-white/25 uppercase tracking-widest">Oluşma Olasılığı →</div>

              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
                {/* Quadrants */}
                {quadrants.map((q, i) => (
                  <g key={i}>
                    <rect x={q.x * W} y={(1 - q.y - q.h) * H} width={q.w * W} height={q.h * H}
                      fill={q.color} stroke={q.border} strokeWidth="1" />
                    <text x={(q.x + q.w / 2) * W} y={(1 - q.y - q.h / 2) * H - 8}
                      textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="13" fontWeight="600">{q.label}</text>
                    <text x={(q.x + q.w / 2) * W} y={(1 - q.y - q.h / 2) * H + 10}
                      textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="10">{q.desc}</text>
                  </g>
                ))}

                {/* Center lines */}
                <line x1={W/2} y1={0} x2={W/2} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1={0} y1={H/2} x2={W} y2={H/2} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />

                {/* Axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map(v => (
                  <g key={v}>
                    <text x={v * W} y={H + 16} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="10">%{Math.round(v*100)}</text>
                    <text x={-8} y={(1-v) * H + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="10">%{Math.round(v*100)}</text>
                  </g>
                ))}

                {/* Restaurant dots */}
                {data.map(d => {
                  const cx = d.probability * W
                  const cy = (1 - d.impact) * H
                  const config = getRiskConfig(d.pulse.risk_level)
                  const isHov = hovered === d.restaurant.id
                  const r = isHov ? 14 : 10
                  return (
                    <g key={d.restaurant.id}
                      onMouseEnter={() => setHovered(d.restaurant.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: 'pointer' }}>
                      {/* Glow ring */}
                      <circle cx={cx} cy={cy} r={r + 4} fill={config.colorHex + '20'} />
                      {/* Main dot */}
                      <circle cx={cx} cy={cy} r={r} fill={config.colorHex} opacity={isHov ? 1 : 0.8}
                        style={{ filter: `drop-shadow(0 0 ${isHov ? 10 : 6}px ${config.colorHex}80)` }} />
                      {/* Label */}
                      <text cx={cx} cy={cy} textAnchor="middle" dy="0.35em" fill="white" fontSize={isHov ? 9 : 7} fontWeight="700">
                        {d.restaurant.id.toUpperCase()}
                      </text>
                      {isHov && (
                        <g>
                          <rect x={cx + 14} y={cy - 28} width={130} height={52} rx="6"
                            fill="#13131e" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                          <text x={cx + 22} y={cy - 14} fill="rgba(255,255,255,0.8)" fontSize="10" fontWeight="600">
                            {d.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}
                          </text>
                          <text x={cx + 22} y={cy} fill="rgba(255,255,255,0.4)" fontSize="9">
                            Nabız: {d.pulse.score} · Kayıp: {d.rev.totalLostRevenue.toLocaleString('tr-TR')}₺
                          </text>
                          <text x={cx + 22} y={cy + 14} fill="rgba(255,255,255,0.4)" fontSize="9">
                            Şikayet: {d.comp.total} · {config.label}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          {/* Legend + table */}
          <div className="col-span-4 space-y-4">
            <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Kadrant Eylemleri</div>
              {[
                { label: '🔴 Acil Aksiyon', desc: 'Hemen müdahale et', color: '#ff3d3d' },
                { label: '🟡 İzle', desc: 'Hazırlıklı ol, bekle', color: '#eab308' },
                { label: '🟠 Azalt', desc: 'Riski minimize et', color: '#f97316' },
                { label: '🟢 Kabul Et', desc: 'Standart izleme', color: '#22c55e' },
              ].map(({ label, desc, color }) => (
                <div key={label} className="flex items-center gap-2 mb-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <div>
                    <div className="text-xs font-medium text-white/70">{label}</div>
                    <div className="text-[10px] text-white/30">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top risks */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="px-4 py-3 border-b text-[10px] text-white/30 uppercase tracking-widest"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>Öncelikli Riskler</div>
              {data.sort((a, b) => (b.probability + b.impact) - (a.probability + a.impact)).slice(0, 5).map(d => {
                const config = getRiskConfig(d.pulse.risk_level)
                return (
                  <div key={d.restaurant.id} className="flex items-center gap-3 px-4 py-2.5 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: config.colorHex }} />
                    <span className="text-xs text-white/60 flex-1 truncate">{d.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}</span>
                    <span className={cn('text-xs font-bold font-mono', config.color)}>{d.pulse.score}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
