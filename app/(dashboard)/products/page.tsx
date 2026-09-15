'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchStockLevels, fetchRestaurants, updateStockLevel, insertAuditLog } from '@/lib/supabase-client'
import { AlertTriangle, Package, TrendingDown, RefreshCw } from 'lucide-react'

export default function ProductsPage() {
  const [stock, setStock] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('r1')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string|null>(null)
  const [editQty, setEditQty] = useState<Record<string,number>>({})

  const load = useCallback(async () => {
    const [s,r] = await Promise.all([fetchStockLevels(selectedId), fetchRestaurants()])
    setStock(s as any[]); setRestaurants(r as any[]); setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  const updateStock = async (stockId: string, qty: number) => {
    setUpdating(stockId)
    try {
      await updateStockLevel(stockId, qty)
      await insertAuditLog({ user_role:'', action:'UPDATE_STOCK', resource:'products', details:{ stock_id:stockId, new_qty:qty } })
      setStock(prev => prev.map(s => s.id===stockId ? {...s, quantity:qty} : s))
      setEditQty(prev => { const n={...prev}; delete n[stockId]; return n })
    } finally { setUpdating(null) }
  }

  const lowStock = stock.filter(s=>s.quantity <= s.min_threshold)
  const outOfStock = stock.filter(s=>s.quantity === 0)

  const categories = [...new Set(stock.map(s=>s.products?.category).filter(Boolean))]

  return (
    <div className="dm">
      <Topbar title="Ürün & Stok" subtitle="Gerçek zamanlı stok takibi"
        action={
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {outOfStock.length>0 && <span className="badge badge-red">{outOfStock.length} stok yok</span>}
            {lowStock.length>0 && <span className="badge badge-amber">{lowStock.length} kritik</span>}
            <button onClick={load} className="btn-ghost" style={{padding:'5px 10px',fontSize:12}}><RefreshCw size={12}/> Yenile</button>
          </div>
        }
      />
      <div className="scroll" style={{padding:'22px 24px',display:'flex',flexDirection:'column',gap:16}}>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
          {[
            {label:'Toplam Ürün',value:stock.length,color:'var(--ac)',bg:'var(--ac2)',Icon:Package},
            {label:'Stok Yok',value:outOfStock.length,color:'var(--red)',bg:'var(--red2)',Icon:AlertTriangle},
            {label:'Kritik Stok',value:lowStock.length,color:'var(--amber)',bg:'var(--amber2)',Icon:TrendingDown},
            {label:'Normal',value:stock.length-lowStock.length,color:'var(--green)',bg:'var(--green2)',Icon:Package},
          ].map((k,i)=>{const Icon=k.Icon;return(
            <div key={k.label} className="kpi" style={{borderLeft:`2.5px solid ${k.color}`,animationDelay:`${i*40}ms`}}>
              <div style={{width:34,height:34,borderRadius:9,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>
                <Icon size={15} style={{color:k.color}} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{k.label}</p>
              <p className="kpi-value" style={{fontSize:22,color:k.color}}>{loading?'—':k.value}</p>
            </div>
          )})}
        </div>

        {/* Restaurant select */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="inp" style={{width:'auto',padding:'7px 12px',fontSize:13}}>
            {restaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <span style={{fontSize:12,color:'var(--tx3)'}}>Stok durumu · {new Date().toLocaleDateString('tr-TR')}</span>
        </div>

        {/* Stock table */}
        {categories.map(cat => {
          const catItems = stock.filter(s=>s.products?.category===cat)
          if (!catItems.length) return null
          return (
            <div key={cat} className="card">
              <div className="card-h">
                <span className="card-title" style={{textTransform:'capitalize'}}>{cat}</span>
                <span className="card-meta">{catItems.length} ürün</span>
              </div>
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 120px 100px',gap:0,padding:'8px 20px',borderBottom:'1px solid var(--bdr)'}}>
                  {['Ürün','Fiyat','Min.','Stok','İşlem'].map(h=>(
                    <span key={h} style={{fontSize:10.5,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.06em'}}>{h}</span>
                  ))}
                </div>
                {catItems.map(item => {
                  const low = item.quantity <= item.min_threshold
                  const out = item.quantity === 0
                  const editVal = editQty[item.id] ?? item.quantity
                  return (
                    <div key={item.id} className="row" style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 120px 100px',gap:0,borderLeft:out?'3px solid var(--red)':low?'3px solid var(--amber)':'3px solid transparent'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:18}}>{item.products?.emoji}</span>
                        <div>
                          <p style={{fontSize:13,fontWeight:500,color:'var(--tx)'}}>{item.products?.name}</p>
                          {out&&<span className="badge badge-red" style={{fontSize:9}}>Tükendi</span>}
                          {!out&&low&&<span className="badge badge-amber" style={{fontSize:9}}>Kritik</span>}
                        </div>
                      </div>
                      <span style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',color:'var(--tx2)',alignSelf:'center'}}>{item.products?.price} ₺</span>
                      <span style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',color:'var(--tx3)',alignSelf:'center'}}>{item.min_threshold}</span>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <button onClick={()=>setEditQty(p=>({...p,[item.id]:Math.max(0,editVal-1)}))}
                          style={{width:24,height:24,borderRadius:6,background:'var(--s3)',border:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'var(--tx2)',cursor:'pointer'}}>−</button>
                        <span style={{fontSize:14,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:out?'var(--red)':low?'var(--amber)':'var(--tx)',minWidth:28,textAlign:'center'}}>{editVal}</span>
                        <button onClick={()=>setEditQty(p=>({...p,[item.id]:editVal+1}))}
                          style={{width:24,height:24,borderRadius:6,background:'var(--s3)',border:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'var(--tx2)',cursor:'pointer'}}>+</button>
                      </div>
                      <div>
                        {editQty[item.id]!==undefined && editQty[item.id]!==item.quantity ? (
                          <button onClick={()=>updateStock(item.id,editQty[item.id])} disabled={updating===item.id}
                            className="btn" style={{padding:'4px 12px',fontSize:11,boxShadow:'none'}}>
                            {updating===item.id?'…':'Kaydet'}
                          </button>
                        ) : (
                          <span style={{fontSize:11,color:'var(--tx3)'}}>—</span>
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
    </div>
  )
}
