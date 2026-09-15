'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchStockLevels, fetchRestaurants, updateStockLevel, insertAuditLog } from '@/lib/supabase-client'
import { AlertTriangle, Package, TrendingDown, RefreshCw, Minus, Plus } from 'lucide-react'

export default function ProductsPage() {
  const [stock, setStock] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('r1')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string|null>(null)
  const [editQty, setEditQty] = useState<Record<string,number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, r] = await Promise.all([fetchStockLevels(selectedId), fetchRestaurants()])
      setStock(s as any[])
      setRestaurants(r as any[])
    } finally { setLoading(false) }
  }, [selectedId])

  useEffect(() => { load() }, [load])

  const updateStock = async (stockId: string, qty: number) => {
    setUpdating(stockId)
    try {
      await updateStockLevel(stockId, qty)
      await insertAuditLog({ action: 'UPDATE_STOCK', resource: 'products', details: { stock_id: stockId, new_qty: qty } })
      setStock(prev => prev.map(s => s.id === stockId ? { ...s, quantity: qty } : s))
      setEditQty(prev => { const n = { ...prev }; delete n[stockId]; return n })
    } finally { setUpdating(null) }
  }

  const lowStock  = stock.filter(s => s.quantity > 0 && s.quantity <= s.min_threshold)
  const outOfStock = stock.filter(s => s.quantity === 0)
  const categories = [...new Set(stock.map(s => s.products?.category).filter(Boolean))]

  return (
    <div className="dm">
      <Topbar title="Ürün & Stok" subtitle="Supabase · gerçek zamanlı stok takibi"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {outOfStock.length > 0 && <span className="badge badge-red">{outOfStock.length} tükendi</span>}
            {lowStock.length > 0 && <span className="badge badge-amber">{lowStock.length} kritik</span>}
            <button onClick={load} className="btn-ghost" style={{ padding:'5px 12px', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
              <RefreshCw size={12}/> Yenile
            </button>
          </div>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,180px),1fr))', gap:12 }}>
          {[
            { label:'Toplam Ürün',  value:stock.length,                  color:'var(--ac)',    bg:'var(--ac2)',    Icon:Package       },
            { label:'Tükendi',      value:outOfStock.length,             color:'var(--red)',   bg:'var(--red2)',   Icon:AlertTriangle  },
            { label:'Kritik Stok',  value:lowStock.length,               color:'var(--amber)', bg:'var(--amber2)', Icon:TrendingDown   },
            { label:'Normal',       value:stock.length - outOfStock.length - lowStock.length, color:'var(--green)', bg:'var(--green2)', Icon:Package },
          ].map(({ label, value, color, bg, Icon }) => (
            <div key={label} className="kpi" style={{ borderLeft:`2.5px solid ${color}` }}>
              <div style={{ width:32, height:32, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <Icon size={14} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize:22, color }}>{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* Restoran seç */}
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="inp" style={{ width:'auto', padding:'7px 12px', fontSize:13 }}>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <span style={{ fontSize:12, color:'var(--tx3)' }}>{new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' })}</span>
        </div>

        {/* Stok tabloları */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px', background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14 }}>
            <Package size={32} style={{ color:'var(--tx3)', margin:'0 auto 12px', display:'block', opacity:.4 }}/>
            <p style={{ fontSize:14, color:'var(--tx2)' }}>Bu restoran için stok verisi yok</p>
          </div>
        ) : categories.map(cat => {
          const catItems = stock.filter(s => s.products?.category === cat)
          if (!catItems.length) return null
          return (
            <div key={cat} className="card">
              <div className="card-h">
                <span className="card-title" style={{ textTransform:'capitalize' }}>{cat}</span>
                <span className="card-meta">{catItems.length} ürün</span>
              </div>

              {/* Tablo — overflowX wrapper */}
              <div style={{ overflowX:'auto' }}>
                {/* Header */}
                <div style={{
                  display:'grid',
                  gridTemplateColumns:'minmax(140px,1fr) 70px 55px 110px 90px',
                  gap:0, padding:'8px 20px',
                  borderBottom:'1px solid var(--bdr)',
                  minWidth:500,
                }}>
                  {['Ürün', 'Fiyat', 'Min', 'Stok', 'İşlem'].map(h => (
                    <span key={h} style={{ fontSize:10.5, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</span>
                  ))}
                </div>

                {/* Rows */}
                {catItems.map(item => {
                  const out  = item.quantity === 0
                  const low  = !out && item.quantity <= item.min_threshold
                  const editVal = editQty[item.id] ?? item.quantity
                  const changed = editQty[item.id] !== undefined && editQty[item.id] !== item.quantity

                  return (
                    <div key={item.id} style={{
                      display:'grid',
                      gridTemplateColumns:'minmax(140px,1fr) 70px 55px 110px 90px',
                      gap:0, padding:'10px 20px',
                      borderBottom:'1px solid var(--bdr)',
                      borderLeft:`3px solid ${out ? 'var(--red)' : low ? 'var(--amber)' : 'transparent'}`,
                      alignItems:'center',
                      minWidth:500,
                      background: out ? 'rgba(242,87,87,0.03)' : low ? 'rgba(240,168,67,0.03)' : 'transparent',
                      transition:'background .15s',
                    }}>
                      {/* Ürün adı */}
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:22, flexShrink:0, lineHeight:1 }}>{item.products?.emoji}</span>
                        <div>
                          <p style={{ fontSize:13, fontWeight:500, color:'var(--tx)' }}>{item.products?.name}</p>
                          <div style={{ display:'flex', gap:4, marginTop:2 }}>
                            {out && <span className="badge badge-red" style={{ fontSize:9, padding:'1px 6px' }}>Tükendi</span>}
                            {!out && low && <span className="badge badge-amber" style={{ fontSize:9, padding:'1px 6px' }}>Kritik</span>}
                          </div>
                        </div>
                      </div>

                      {/* Fiyat */}
                      <span style={{ fontSize:13, fontFamily:'JetBrains Mono,monospace', color:'var(--tx2)' }}>
                        {item.products?.price} ₺
                      </span>

                      {/* Min threshold */}
                      <span style={{ fontSize:13, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>
                        {item.min_threshold}
                      </span>

                      {/* Stok sayacı */}
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <button
                          onClick={() => setEditQty(p => ({ ...p, [item.id]: Math.max(0, editVal - 1) }))}
                          style={{ width:26, height:26, borderRadius:7, background:'var(--s3)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                          <Minus size={11} style={{ color:'var(--tx2)' }}/>
                        </button>
                        <span style={{ fontSize:15, fontWeight:700, fontFamily:'JetBrains Mono,monospace', minWidth:30, textAlign:'center',
                          color: out ? 'var(--red)' : low ? 'var(--amber)' : changed ? 'var(--ac)' : 'var(--tx)' }}>
                          {editVal}
                        </span>
                        <button
                          onClick={() => setEditQty(p => ({ ...p, [item.id]: editVal + 1 }))}
                          style={{ width:26, height:26, borderRadius:7, background:'var(--s3)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                          <Plus size={11} style={{ color:'var(--tx2)' }}/>
                        </button>
                      </div>

                      {/* Kaydet */}
                      <div>
                        {changed ? (
                          <button
                            onClick={() => updateStock(item.id, editQty[item.id])}
                            disabled={updating === item.id}
                            className="btn"
                            style={{ padding:'5px 14px', fontSize:11, boxShadow:'none', opacity: updating === item.id ? .6 : 1 }}>
                            {updating === item.id ? '…' : 'Kaydet'}
                          </button>
                        ) : (
                          <span style={{ fontSize:11, color:'var(--tx3)' }}>—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
