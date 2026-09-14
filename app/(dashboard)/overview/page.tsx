'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RestaurantCard } from '@/components/cards/restaurant-card'
import { fetchAllPulseScores, fetchRestaurants, fetchLatestSnapshots } from '@/lib/supabase-client'
import { getPredictions, getWeather, getHourlyForecast, getRecommendation, getSnapshot, getPulseScore } from '@/data/seed/mock-data'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { RestaurantDashboard, RiskLevel } from '@/types'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

const RISK_ORDER: Record<RiskLevel, number> = { KRITIK: 0, RISKLI: 1, YOGUN: 2, NORMAL: 3 }

function buildDashboard(id: string, restaurant: typeof RESTAURANTS[0], pulseMap: Record<string, unknown>, snapshotMap: Record<string, unknown>): RestaurantDashboard {
  return {
    restaurant,
    pulse: (pulseMap[id] ?? getPulseScore(id)) as RestaurantDashboard['pulse'],
    snapshot: (snapshotMap[id] ?? getSnapshot(id)) as RestaurantDashboard['snapshot'],
    predictions: getPredictions(id),
    latest_recommendation: getRecommendation(id),
    weather: getWeather(id),
    hourly_forecast: getHourlyForecast(id),
  }
}

type Filter = RiskLevel | 'ALL'

export default function OverviewPage() {
  const [boards, setBoards] = useState<RestaurantDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [refreshed, setRefreshed] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const [pulseRows, restRows, snapRows] = await Promise.all([
        fetchAllPulseScores(), fetchRestaurants(), fetchLatestSnapshots(),
      ])
      const pm = Object.fromEntries(pulseRows.map(p => [p.restaurant_id, p]))
      const sm = Object.fromEntries(snapRows.map(s => [s.restaurant_id, s]))
      const allRests = restRows.length > 0 ? restRows : RESTAURANTS
      const result = allRests
        .map(r => buildDashboard(r.id, r as typeof RESTAURANTS[0], pm, sm))
        .sort((a, b) => RISK_ORDER[a.pulse.risk_level] - RISK_ORDER[b.pulse.risk_level])
      setBoards(result)
      setIsLive(pulseRows.length > 0)
      setRefreshed(new Date())
    } catch {
      setBoards(RESTAURANTS.map(r => buildDashboard(r.id, r, {}, {})).sort((a, b) => RISK_ORDER[a.pulse.risk_level] - RISK_ORDER[b.pulse.risk_level]))
      setIsLive(false)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])

  const shown = boards.filter(d => filter === 'ALL' || d.pulse.risk_level === filter)
  const cnt = { KRITIK: boards.filter(d=>d.pulse.risk_level==='KRITIK').length, RISKLI: boards.filter(d=>d.pulse.risk_level==='RISKLI').length, YOGUN: boards.filter(d=>d.pulse.risk_level==='YOGUN').length, NORMAL: boards.filter(d=>d.pulse.risk_level==='NORMAL').length }
  const avg = boards.length ? Math.round(boards.reduce((s,d)=>s+d.pulse.score,0)/boards.length) : 0

  const FILTERS: { key: Filter; label: string; count: number; color: string }[] = [
    { key:'ALL',    label:'Tümü',   count:boards.length, color:'var(--t2)' },
    { key:'KRITIK', label:'Kritik', count:cnt.KRITIK,    color:'var(--red)' },
    { key:'RISKLI', label:'Riskli', count:cnt.RISKLI,    color:'var(--orange)' },
    { key:'YOGUN',  label:'Yoğun',  count:cnt.YOGUN,     color:'var(--yellow)' },
    { key:'NORMAL', label:'Normal', count:cnt.NORMAL,    color:'var(--green)' },
  ]

  return (
    <div className="anim-fade">
      <Topbar title="Genel Bakış"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-1.5 rounded-[7px] hover:bg-white/5 transition-colors"
              style={{ border: '1px solid var(--line)' }}>
              <RefreshCw size={12} style={{ color: 'var(--t3)' }} />
            </button>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px]"
              style={{ background: isLive ? 'var(--green-bg)' : 'rgba(255,255,255,0.04)', border: isLive ? '1px solid var(--green-ln)' : '1px solid var(--line)', color: isLive ? 'var(--green)' : 'var(--t4)' }}>
              {isLive ? <Wifi size={9}/> : <WifiOff size={9}/>}
              {isLive ? 'Supabase' : 'Demo'}
            </div>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* KPI bar */}
        <div className="grid grid-cols-5 rounded-[12px] overflow-hidden" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
          {[
            { label: 'Ort. Nabız', value: loading?'—':avg, color: avg>70?'var(--red)':avg>50?'var(--orange)':'var(--green)', suffix:'/100' },
            { label: 'Kritik', value: loading?'—':cnt.KRITIK, color: 'var(--red)' },
            { label: 'Riskli', value: loading?'—':cnt.RISKLI, color: 'var(--orange)' },
            { label: 'Yoğun',  value: loading?'—':cnt.YOGUN,  color: 'var(--yellow)' },
            { label: 'Normal', value: loading?'—':cnt.NORMAL, color: 'var(--green)' },
          ].map((k,i) => (
            <div key={k.label} className="py-4 px-5 text-center" style={{ borderRight: i<4?'1px solid var(--line)':undefined }}>
              <div className="text-[9px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--t4)' }}>{k.label}</div>
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-[26px] font-bold num leading-none" style={{ color: k.color, letterSpacing:'-0.04em' }}>{k.value}</span>
                {k.suffix && <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{k.suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button key={f.key} onClick={()=>setFilter(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11.5px] transition-colors duration-100"
              style={{
                background: filter===f.key ? 'var(--bg-2)' : 'transparent',
                border: filter===f.key ? '1px solid var(--line-2)' : '1px solid transparent',
                color: filter===f.key ? 'var(--t1)' : 'var(--t3)',
              }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: filter===f.key?f.color:'var(--line-2)' }} />
              {f.label}
              <span className="text-[10px] num" style={{ color: 'var(--t4)' }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {shown.map((d,i) => (
              <div key={d.restaurant.id} className="anim-fade" style={{ animationDelay:`${i*30}ms` }}>
                <RestaurantCard data={d} />
              </div>
            ))}
          </div>
        )}

        {refreshed && (
          <div className="text-[10px] num" style={{ color: 'var(--t4)' }}>
            Son güncelleme: {refreshed.toLocaleTimeString('tr-TR')} {isLive ? '· Supabase bağlı' : '· Demo verisi · 5 dk otomatik yenileme'}
          </div>
        )}
      </div>
    </div>
  )
}
