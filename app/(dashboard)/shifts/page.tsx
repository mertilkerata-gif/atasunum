'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchShifts, fetchRestaurants, updateShiftStatus, insertShift, insertAuditLog } from '@/lib/supabase-client'
import { Users, Plus, Clock } from 'lucide-react'

const ROLES = ['GRILL','FRYER','PACKING','CASHIER','MANAGER']
const ROLE_COLORS: Record<string,string> = {
  GRILL:'var(--amber)', FRYER:'var(--red)', PACKING:'var(--ac)', CASHIER:'var(--blue)', MANAGER:'var(--green)'
}
const STATUS_BADGE: Record<string,string> = {
  SCHEDULED:'badge-muted', ACTIVE:'badge-green', COMPLETED:'badge-ac', ABSENT:'badge-red'
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('r1')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ staff_name:'', role:'GRILL', shift_start:'', shift_end:'' })

  const load = useCallback(async () => {
    const [s,r] = await Promise.all([fetchShifts(selectedId), fetchRestaurants()])
    setShifts(s); setRestaurants(r); setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  const changeStatus = async (id: string, status: string) => {
    await updateShiftStatus(id, status)
    await insertAuditLog({ user_role:'', action:'UPDATE_SHIFT', resource:'shifts', details:{id,status} })
    setShifts(prev => prev.map(s => s.id===id ? {...s,status} : s))
  }

  const addShift = async () => {
    if (!form.staff_name||!form.shift_start||!form.shift_end) return
    const shift = { restaurant_id:selectedId, ...form, status:'SCHEDULED' }
    const created = await insertShift(shift)
    await insertAuditLog({ user_role:'', action:'CREATE_SHIFT', resource:'shifts', details:{restaurant_id:selectedId, staff_name:form.staff_name} })
    setShifts(prev => [...prev, created])
    setShowAdd(false); setForm({ staff_name:'', role:'GRILL', shift_start:'', shift_end:'' })
  }

  const active = shifts.filter(s=>s.status==='ACTIVE')
  const scheduled = shifts.filter(s=>s.status==='SCHEDULED')
  const absent = shifts.filter(s=>s.status==='ABSENT')

  return (
    <div className="dm">
      <Topbar title="Vardiya Yönetimi" subtitle="Personel planlaması · Supabase"
        action={
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span className="badge badge-green">{active.length} aktif</span>
            {absent.length>0 && <span className="badge badge-red">{absent.length} gelmedi</span>}
            <button onClick={()=>setShowAdd(true)} className="btn" style={{padding:'6px 12px',fontSize:12}}>
              <Plus size={12}/> Vardiya Ekle
            </button>
          </div>
        }
      />
      <div className="scroll" style={{padding:'clamp(14px,3vw,24px) clamp(14px,3vw,24px)',display:'flex',flexDirection:'column',gap:16}}>

        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="inp" style={{width:'auto',padding:'7px 12px',fontSize:13}}>
            {restaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <span style={{fontSize:12,color:'var(--tx3)'}}>{new Date().toLocaleDateString('tr-TR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
        </div>

        {/* Add shift modal */}
        {showAdd && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:'var(--s1)',border:'1px solid var(--bdr2)',borderRadius:16,padding:28,width:'100%',maxWidth:440}}>
              <p style={{fontSize:17,fontWeight:700,color:'var(--tx)',marginBottom:20}}>Vardiya Ekle</p>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div><label className="label">Personel Adı</label><input className="inp" value={form.staff_name} onChange={e=>setForm(p=>({...p,staff_name:e.target.value}))} placeholder="Ad Soyad"/></div>
                <div><label className="label">Görev</label>
                  <select className="inp" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                    {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12, overflowX: "auto"}}>
                  <div><label className="label">Başlangıç</label><input type="datetime-local" className="inp" value={form.shift_start} onChange={e=>setForm(p=>({...p,shift_start:e.target.value}))}/></div>
                  <div><label className="label">Bitiş</label><input type="datetime-local" className="inp" value={form.shift_end} onChange={e=>setForm(p=>({...p,shift_end:e.target.value}))}/></div>
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button onClick={addShift} className="btn" style={{flex:1,justifyContent:'center'}}>Kaydet</button>
                <button onClick={()=>setShowAdd(false)} className="btn-ghost" style={{flex:1,justifyContent:'center'}}>İptal</button>
              </div>
            </div>
          </div>
        )}

        {/* Shifts table */}
        <div className="card">
          <div className="card-h"><span className="card-title">Bugünkü Vardiyalar</span><span className="card-meta">{shifts.length} toplam</span></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 80px 110px 110px 80px 100px',gap:0,padding:'8px 14px',borderBottom:'1px solid var(--bdr)', overflowX: "auto"}}>
            {['Personel','Görev','Başlangıç','Bitiş','Durum','İşlem'].map(h=>(
              <span key={h} style={{fontSize:10.5,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.06em'}}>{h}</span>
            ))}
          </div>
          {loading?<p style={{padding:24,textAlign:'center',color:'var(--tx3)'}}>Yükleniyor…</p>:
            shifts.map(s=>(
              <div key={s.id} className="row" style={{display:'grid',gridTemplateColumns:'1fr 80px 110px 110px 80px 100px',gap:0, overflowX: "auto"}}>
                <span style={{fontSize:13,fontWeight:500,color:'var(--tx)'}}>{s.staff_name}</span>
                <span style={{fontSize:12,fontWeight:600,color:ROLE_COLORS[s.role]||'var(--tx2)'}}>{s.role}</span>
                <span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:'var(--tx3)'}}>{new Date(s.shift_start).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</span>
                <span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:'var(--tx3)'}}>{new Date(s.shift_end).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</span>
                <span className={`badge ${STATUS_BADGE[s.status]||'badge-muted'}`} style={{width:'fit-content'}}>{s.status}</span>
                <div style={{display:'flex',gap:4}}>
                  {s.status==='SCHEDULED'&&<button onClick={()=>changeStatus(s.id,'ACTIVE')} className="btn-ghost" style={{padding:'3px 8px',fontSize:10}}>Başlat</button>}
                  {s.status==='ACTIVE'&&<button onClick={()=>changeStatus(s.id,'COMPLETED')} className="btn-ghost" style={{padding:'3px 8px',fontSize:10}}>Bitir</button>}
                  {s.status!=='ABSENT'&&<button onClick={()=>changeStatus(s.id,'ABSENT')} className="btn-ghost" style={{padding:'3px 8px',fontSize:10,color:'var(--red)'}}>Gelmedi</button>}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
