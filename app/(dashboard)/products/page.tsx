'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getProductSnapshot, getAllProductSnapshots } from '@/data/seed/products'
import { getPulseScore } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { Package, AlertTriangle, Flame, TrendingUp } from 'lucide-react'

export default function ProductsPage() {
  const [selectedId, setSelectedId] = useState('r1')
  const snapshot = getProductSnapshot(selectedId)
  const restaurant = RESTAURANTS.find(r => r.id === selectedId)!
  const pulse = getPulseScore(selectedId)
  const allSnapshots = getAllProductSnapshots()

  // Ağ genelinde en yoğun ürünler
  const networkTopProducts = allSnapshots.flatMap(s => s.products)
    .reduce((acc, p) => {
      const existing = acc.find(a => a.id === p.id)
      if (existing) { existing.totalDemand += p.currentDemand; existing.avgIndex = Math.round((existing.avgIndex + p.demandIndex) / 2) }
      else acc.push({ ...p, totalDemand: p.currentDemand, avgIndex: p.demandIndex })
      return acc
    }, [] as any[])
    .sort((a, b) => b.avgIndex - a.avgIndex)

  const criticalStock = allSnapshots.flatMap(s =>
    s.products.filter(p => p.stockRisk === 'critical').map(p => ({
      ...p,
      restaurantName: RESTAURANTS.find(r => r.id === s.restaurantId)?.name ?? '',
    }))
  )

  const stationColors = { grill: '#f97316', fryer: '#eab308', packing: '#818cf8' }

  return (
    <div>
      <Topbar title="Ürün & Stok Analizi" subtitle="Ürün bazlı yoğunluk ve envanter risk takibi" />
      <div className="p-6 space-y-5">

        {/* Kritik stok uyarıları */}
        {criticalStock.length > 0 && (
          <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,61,61,0.05)', borderColor: 'rgba(255,61,61,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-red-300">Kritik Stok Seviyesi — Acil Tedarik Gerekiyor</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticalStock.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5"
                  style={{ background: 'rgba(255,61,61,0.08)', borderColor: 'rgba(255,61,61,0.2)' }}>
                  <span className="text-xs text-red-300 font-medium">{p.name}</span>
                  <span className="text-[10px] text-white/30">·</span>
                  <span className="text-[10px] text-white/40">{p.restaurantName.replace('Burger King ', 'BK ').replace('Popeyes ', 'Pop.')}</span>
                  <span className="text-[10px] font-bold text-red-400">{p.stockUnits} adet</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-5">
          {/* Restoran seçici */}
          <div className="col-span-3 space-y-2">
            <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 mb-3">Restoran Seç</div>
            {RESTAURANTS.map(r => {
              const p = getPulseScore(r.id)
              const snap = getProductSnapshot(r.id)
              const c = getRiskConfig(p.risk_level)
              const isSelected = r.id === selectedId
              return (
                <button key={r.id} onClick={() => setSelectedId(r.id)}
                  className={cn('w-full text-left rounded-xl border px-4 py-3 transition-all', isSelected ? `${c.bg} ${c.border}` : 'border-white/[0.06] hover:border-white/[0.1]')}
                  style={{ background: isSelected ? undefined : 'var(--bg-surface)' }}>
                  <div className={cn('text-xs font-medium truncate', isSelected ? c.color : 'text-white/60')}>{r.name.replace('Burger King ', 'BK ').replace('Popeyes ', 'Pop.')}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {snap.inventoryRiskScore > 50 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    <span className="text-[10px] text-white/25">Stok risk: {snap.inventoryRiskScore}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Ürün bazlı analiz */}
          <div className="col-span-9 space-y-4">
            {/* Restoran başlık */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold text-white">{restaurant.name}</div>
                  <div className="text-xs text-white/30 mt-0.5">
                    En yoğun: <span className="text-orange-400">{snapshot.topDemandProduct}</span> ·
                    Darboğaz: <span className="text-red-400">{snapshot.bottleneckProduct}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {snapshot.inventoryRiskScore > 50 && (
                    <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5"
                      style={{ background: 'rgba(255,61,61,0.08)', borderColor: 'rgba(255,61,61,0.2)' }}>
                      <Package className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs text-red-300 font-medium">Stok Risk: {snapshot.inventoryRiskScore}</span>
                    </div>
                  )}
                  <div className={cn('text-xl font-bold font-mono', getRiskConfig(pulse.risk_level).color)}>{pulse.score}</div>
                </div>
              </div>

              {/* Ürün listesi */}
              <div className="space-y-3">
                {snapshot.products.sort((a, b) => b.demandIndex - a.demandIndex).map(product => {
                  const stationColor = stationColors[product.station as keyof typeof stationColors] ?? '#fff'
                  const demandColor = product.demandIndex >= 150 ? '#ff3d3d' : product.demandIndex >= 120 ? '#f97316' : product.demandIndex >= 100 ? '#eab308' : '#22c55e'
                  return (
                    <div key={product.id} className="flex items-center gap-4 rounded-xl border p-3"
                      style={{
                        background: product.demandIndex >= 150 ? 'rgba(255,61,61,0.04)' : 'rgba(255,255,255,0.02)',
                        borderColor: product.demandIndex >= 150 ? 'rgba(255,61,61,0.15)' : 'rgba(255,255,255,0.05)',
                      }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white/80">{product.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: stationColor + '20', color: stationColor, border: `1px solid ${stationColor}30` }}>
                            {product.station.toUpperCase()}
                          </span>
                          {product.stockRisk !== 'ok' && (
                            <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium', product.stockRisk === 'critical' ? 'text-red-300' : 'text-orange-300')}
                              style={{ background: product.stockRisk === 'critical' ? 'rgba(255,61,61,0.15)' : 'rgba(249,115,22,0.15)' }}>
                              {product.stockRisk === 'critical' ? '⚠ KRİTİK STOK' : '↓ DÜŞÜK STOK'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(product.demandIndex, 200) / 2}%`, background: demandColor, boxShadow: product.demandIndex >= 150 ? `0 0 6px ${demandColor}60` : 'none' }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold w-12 text-right" style={{ color: demandColor }}>
                            %{product.demandIndex}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center">
                          <div className="text-sm font-bold font-mono text-white">{product.currentDemand}</div>
                          <div className="text-[9px] text-white/25">30 dk</div>
                        </div>
                        <div className="text-center">
                          <div className={cn('text-sm font-bold font-mono', product.stockRisk === 'critical' ? 'text-red-400' : product.stockRisk === 'low' ? 'text-orange-400' : 'text-white/40')}>
                            {product.stockUnits}
                          </div>
                          <div className="text-[9px] text-white/25">stok</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-white/30">{product.avgPrepTime} dk</div>
                          <div className="text-[9px] text-white/20">hazırlama</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Ağ geneli en yoğun ürünler */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Ağ Geneli — En Yüksek Talep Endeksi</div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {networkTopProducts.slice(0, 4).map((p: any) => {
              const stationColor = stationColors[p.station as keyof typeof stationColors] ?? '#fff'
              const demandColor = p.avgIndex >= 140 ? '#ff3d3d' : p.avgIndex >= 115 ? '#f97316' : '#eab308'
              return (
                <div key={p.id} className="rounded-xl border p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame className="w-3.5 h-3.5" style={{ color: demandColor }} />
                    <span className="text-xs font-medium text-white/70">{p.name}</span>
                  </div>
                  <div className="text-2xl font-bold font-mono mb-1" style={{ color: demandColor }}>%{p.avgIndex}</div>
                  <div className="text-[10px]" style={{ color: stationColor }}>{p.station.toUpperCase()} istasyonu</div>
                  <div className="text-[10px] text-white/25 mt-1">Toplam: {p.totalDemand} adet/30dk</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
