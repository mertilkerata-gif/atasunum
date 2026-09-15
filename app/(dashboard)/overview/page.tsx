'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RestaurantCard } from '@/components/cards/restaurant-card'
import { fetchAllPulseScores, fetchRestaurants, fetchLatestSnapshots } from '@/lib/supabase-client'
import { getPredictions, getWeather, getHourlyForecast, getRecommendation, getSnapshot, getPulseScore } from '@/data/seed/mock-data'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { RestaurantDashboard, RiskLevel } from '@/types'
import { RefreshCw, Wifi, WifiOff, AlertCircle, TrendingUp, UtensilsCrossed, Activity } from 'lucide-react'

const RISK_ORDER: Record<RiskLevel, number> = { KRITIK: 0, RISKLI: 1, YOGUN: 2, NORMAL: 3 }

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
      const pm: Record<string, unknown> = Object.fromEntries(pulseRows.map(p => [p.restaurant_id, p]))
      const sm: Record<string, unknown> = Object.fromEntries(snapRows.map(s => [s.restaurant_id, s]))
      const allRests: any[] = restRows.length > 0 ? restRows : RESTAURANTS
      const result: RestaurantDashboard[] = allRests.map(r => ({
        restaurant: r as RestaurantDashboard['restaurant'],
        pulse: (pm[r.id] ?? getPulseScore(r.id)) as RestaurantDashboard['pulse'],
        snapshot: (sm[r.id] ?? getSnapshot(r.id)) as RestaurantDashboard['snapshot'],
        predictions: getPredictions(r.id),
        latest_recommendation: getRecommendation(r.id),
        weather: getWeather(r.id),
        hourly_forecast: getHourlyForecast(r.id),
      })).sort((a,b) => RISK_ORDER[a.pulse.risk_level]-RISK_ORDER[b.pulse.risk_level])
      setBoards(result); setIsLive(pulseRows.length>0); setRefreshed(new Date())
    } catch {
      const fb = RESTAURANTS.map(r => ({
        restaurant: r as RestaurantDashboard['restaurant'],
        pulse: getPulseScore(r.id) as RestaurantDashboard['pulse'],
        snapshot: getSnapshot(r.id) as RestaurantDashboard['snapshot'],
        predictions: getPredictions(r.id), latest_recommendation: getRecommendation(r.id),
        weather: getWeather(r.id), hourly_forecast: getHourlyForecast(r.id),
      })).sort((a,b)=>RISK_ORDER[a.pulse.risk_level]-RISK_ORDER[b.pulse.risk_level])
      setBoards(fb); setIsLive(false)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const t=setInterval(load,60000); return ()=>clearInterval(t) }, [load])

  const shown = boards.filter(d => filter==='ALL' || d.pulse.risk_level===filter)
  const cnt = {
    KRITIK: boards.filter(d=>d.pulse.risk_level==='KRITIK').length,
    RISKLI: boards.filter(d=>d.pulse.risk_level==='RISKLI').length,
    YOGUN:  boards.filter(d=>d.pulse.risk_level==='YOGUN').length,
    NORMAL: boards.filter(d=>d.pulse.risk_level==='NORMAL').length,
  }
  const avg = boards.length ? Math.round(boards.reduce((s,d)=>s+d.pulse.score,0)/boards.length) : 0

  const kpis = [
    { label: 'Ort. Nabız Skoru', value: loading?'—':String(avg), sub: '10 restoran ortalaması', color: avg>70?'var(--red)':avg>50?'var(--amber)':'var(--green)', iconBg: avg>70?'var(--red2)':avg>50?'var(--amber2)':'var(--green2)', Icon: Activity, trend: null },
    { label: 'Kritik Restoran', value: loading?'—':String(cnt.KRITIK), sub: 'Acil müdahale gerekli', color: 'var(--red)', iconBg: 'var(--red2)', Icon: AlertCircle, trend: cnt.KRITIK > 0 ? { up: false, v: `${cnt.KRITIK} acil` } : null },
    { label: 'Riskli / Yoğun', value: loading?'—':String(cnt.RISKLI+cnt.YOGUN), sub: 'İzleme gerektiriyor', color: 'var(--amber)', iconBg: 'var(--amber2)', Icon: TrendingUp, trend: null },
    { label: 'Normal', value: loading?'—':String(cnt.NORMAL), sub: 'Standart operasyon', color: 'var(--green)', iconBg: 'var(--green2)', Icon: UtensilsCrossed, trend: null },
  ]

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key:'ALL',    label:'Tümü',   count:boards.length },
    { key:'KRITIK', label:'Kritik', count:cnt.KRITIK },
    { key:'RISKLI', label:'Riskli', count:cnt.RISKLI },
    { key:'YOGUN',  label:'Yoğun',  count:cnt.YOGUN  },
    { key:'NORMAL', label:'Normal', count:cnt.NORMAL  },
  ]

  return (
    <div className="dm">
      <Topbar title="Genel Bakış" subtitle="Tüm restoranlar · anlık nabız durumu"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={load} className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, gap: 5 }}>
              <RefreshCw size={12} /> Yenile
            </button>
            <span className={`badge ${isLive ? 'badge-green' : 'badge-muted'}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {isLive ? <Wifi size={10}/> : <WifiOff size={10}/>}
              {isLive ? 'Supabase' : 'Demo'}
            </span>
          </div>
        }
      />

      <div className="scroll" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {kpis.map((k, i) => {
            const Icon = k.Icon
            return (
              <div key={k.label} className="kpi" style={{ borderLeft: `2.5px solid ${k.color}`, animationDelay: `${i*40}ms` }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right,${k.iconBg},transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: k.iconBg, border: `1px solid ${k.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} style={{ color: k.color }} strokeWidth={1.9} />
                  </div>
                  {k.trend && (
                    <span className="badge badge-red" style={{ fontSize: 10.5 }}>{k.trend.v}</span>
                  )}
                </div>
                <p className="kpi-label">{k.label}</p>
                <p className="kpi-value" style={{ color: k.color }}>{k.value}</p>
                {k.sub && <p className="kpi-sub">{k.sub}</p>}
              </div>
            )
          })}
        </div>

        {/* Filter tabs */}
        <div className="tabs" style={{ borderRadius: '10px 10px 0 0', marginBottom: -1 }}>
          {FILTERS.map(f => (
            <button key={f.key} className={`tab ${filter===f.key?'active':''}`} onClick={()=>setFilter(f.key)}>
              {f.label}
              <span style={{ marginLeft: 5, fontSize: 10.5, fontFamily: 'JetBrains Mono,monospace', background: filter===f.key?'var(--ac2)':'var(--s3)', color: filter===f.key?'var(--ac)':'var(--tx3)', padding: '1px 6px', borderRadius: 5 }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--s4)', borderTopColor: 'var(--ac)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14 }}>
            {shown.map((d, i) => (
              <div key={d.restaurant.id} className="anim-pop" style={{ animationDelay: `${i*30}ms` }}>
                <RestaurantCard data={d} />
              </div>
            ))}
          </div>
        )}

        {refreshed && (
          <p style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
            Son güncelleme: {refreshed.toLocaleTimeString('tr-TR')} {isLive?'· Supabase bağlı':'· Demo · 60sn otomatik yenileme'}
          </p>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
