'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchShifts, fetchRestaurants, updateShiftStatus, insertShift, insertAuditLog } from '@/lib/supabase-client'
import { Users, Plus, Clock, CheckCircle2, XCircle, Play, X } from 'lucide-react'

const ROLES = ['GRILL','FRYER','PACKING','CASHIER','MANAGER']
const ROLE_META: Record<string,{color:string;label:string}> = {
  GRILL:   { color:'var(--amber)', label:'Izgara'   },
  FRYER:   { color:'var(--red)',   label:'Fritöz'   },
  PACKING: { color:'var(--ac)',    label:'Paketleme' },
  CASHIER: { color:'var(--blue)',  label:'Kasa'      },
  MANAGER: { color:'var(--green)', label:'Müdür'     },
}
const STATUS_META: Record<string,{badge:string;label:string}> = {
  SCHEDULED: { badge:'badge-muted',  label:'Planlandı' },
  ACTIVE:    { badge:'badge-green',  label:'Aktif'     },
  COMPLETED: { badge:'badge-ac',     label:'Tamamlandı' },
  ABSENT:    { badge:'badge-red',    label:'Gelmedi'   },
}

export default function ShiftsPage() {
  const [shifts, setShifts]           = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedId, setSelectedId]   = useState('r1')
  const [loading, setLoading]         = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [form, setForm] = useState({ staff_name:'', role:'GRILL', shift_start:'', shift_end:'' })

  const load = useCallback(async () => {
    setLoading(true)
    const [s, r] = await Promise.all([fetchShifts(selectedId), fetchRestaurants()])
    setShifts(s); setRestaurants(r); setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  const changeStatus = async (id: string, status: string) => {
    await updateShiftStatus(id, status)
    await insertAuditLog({ action:'UPDATE_SHIFT', resource:'shifts', details:{ id, status } })
    setShifts(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const addShift = async () => {
    if (!form.staff_name || !form.shift_start || !form.shift_end) return
    setSaving(true)
    const created = await insertShift({ restaurant_id: selectedId, ...form, status:'SCHEDULED' })
    await insertAuditLog({ action:'CREATE_SHIFT', resource:'shifts', details:{ restaurant_id:selectedId, staff_name:form.staff_name, role:form.role } })
    setShifts(prev => [...prev, created])
    setShowAdd(false)
    setForm({ staff_name:'', role:'GRILL', shift_start:'', shift_end:'' })
    setSaving(false)
  }

  const active    = shifts.filter(s => s.status === 'ACTIVE')
  const scheduled = shifts.filter(s => s.status === 'SCHEDULED')
  const absent    = shifts.filter(s => s.status === 'ABSENT')

  const kpis = [
    { label:'Aktif',       value:active.length,                    color:'var(--green)', bg:'var(--green2)' },
    { label:'Planlandı',   value:scheduled.length,                 color:'var(--ac)',    bg:'var(--ac2)'    },
    { label:'Gelmedi',     value:absent.length,                    color:'var(--red)',   bg:'var(--red2)'   },
    { label:'Toplam',      value:shifts.length,                    color:'var(--tx2)',   bg:'var(--s2)'     },
  ]

  return (
    <div className="dm">
      <Topbar title="Vardiya Yönetimi" subtitle="Personel planlaması · Supabase"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {absent.length > 0 && <span className="badge badge-red">{absent.length} gelmedi</span>}
            <span className="badge badge-green">{active.length} aktif</span>
            <button onClick={() => setShowAdd(true)} className="btn" style={{ padding:'6px 14px', fontSize:12 }}>
              <Plus size={12}/> Ekle
            </button>
          </div>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,150px),1fr))', gap:12 }}>
          {kpis.map(({ label, value, color, bg }) => (
            <div key={label} className="kpi" style={{ borderLeft:`2.5px solid ${color}` }}>
              <div style={{ width:30, height:30, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <Users size={13} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize:22, color }}>{loading?'—':value}</p>
            </div>
          ))}
        </div>

        {/* Filtre */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="inp" style={{ width:'auto', padding:'7px 12px', fontSize:13 }}>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <span style={{ fontSize:12, color:'var(--tx3)' }}>
            {new Date().toLocaleDateString('tr-TR',{ weekday:'long', day:'numeric', month:'long' })}
          </span>
        </div>

        {/* Vardiya listesi */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Bugünkü Vardiyalar</span>
            <span className="card-meta">{shifts.length} toplam</span>
          </div>

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
              <div style={{ width:18, height:18, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
            </div>
          ) : shifts.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <Users size={28} style={{ color:'var(--tx3)', margin:'0 auto 12px', display:'block', opacity:.3 }}/>
              <p style={{ fontSize:13, color:'var(--tx3)' }}>Bu restoran için vardiya bulunamadı</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              {/* Header */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 95px 95px 100px 130px', gap:0, padding:'8px 20px', borderBottom:'1px solid var(--bdr)', minWidth:580 }}>
                {['Personel','Görev','Başlangıç','Bitiş','Durum','İşlem'].map(h => (
                  <span key={h} style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</span>
                ))}
              </div>
              {/* Rows */}
              {shifts.map(s => {
                const rm = ROLE_META[s.role] ?? { color:'var(--tx2)', label:s.role }
                const sm = STATUS_META[s.status] ?? { badge:'badge-muted', label:s.status }
                return (
                  <div key={s.id} className="row" style={{ display:'grid', gridTemplateColumns:'1fr 100px 95px 95px 100px 130px', gap:0, alignItems:'center', minWidth:580,
                    borderLeft:`2.5px solid ${s.status==='ABSENT'?'var(--red)':s.status==='ACTIVE'?'var(--green)':'transparent'}` }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:500, color:'var(--tx)' }}>{s.staff_name}</p>
                    </div>
                    <span style={{ fontSize:11.5, fontWeight:600, color:rm.color }}>{rm.label}</span>
                    <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>
                      {new Date(s.shift_start).toLocaleTimeString('tr-TR',{ hour:'2-digit', minute:'2-digit' })}
                    </span>
                    <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>
                      {new Date(s.shift_end).toLocaleTimeString('tr-TR',{ hour:'2-digit', minute:'2-digit' })}
                    </span>
                    <span className={`badge ${sm.badge}`} style={{ width:'fit-content', fontSize:10 }}>{sm.label}</span>
                    <div style={{ display:'flex', gap:5 }}>
                      {s.status === 'SCHEDULED' && (
                        <button onClick={() => changeStatus(s.id,'ACTIVE')}
                          style={{ display:'flex', alignItems:'center', gap:3, padding:'4px 8px', borderRadius:7, background:'var(--green2)', border:'1px solid var(--green-ln)', color:'var(--green)', fontSize:10, fontWeight:600, cursor:'pointer' }}>
                          <Play size={9}/> Başlat
                        </button>
                      )}
                      {s.status === 'ACTIVE' && (
                        <button onClick={() => changeStatus(s.id,'COMPLETED')}
                          style={{ display:'flex', alignItems:'center', gap:3, padding:'4px 8px', borderRadius:7, background:'var(--ac2)', border:'1px solid rgba(124,106,247,.2)', color:'var(--ac)', fontSize:10, fontWeight:600, cursor:'pointer' }}>
                          <CheckCircle2 size={9}/> Bitir
                        </button>
                      )}
                      {s.status !== 'ABSENT' && s.status !== 'COMPLETED' && (
                        <button onClick={() => changeStatus(s.id,'ABSENT')}
                          style={{ display:'flex', alignItems:'center', gap:3, padding:'4px 8px', borderRadius:7, background:'var(--red2)', border:'1px solid var(--red-ln)', color:'var(--red)', fontSize:10, fontWeight:600, cursor:'pointer' }}>
                          <XCircle size={9}/> Gelmedi
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr2)', borderRadius:16, padding:'24px', width:'100%', maxWidth:420, boxShadow:'0 24px 80px rgba(0,0,0,.5)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <p style={{ fontSize:16, fontWeight:700, color:'var(--tx)' }}>Vardiya Ekle</p>
              <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx3)', padding:4 }}>
                <X size={16}/>
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label className="label">Personel Adı</label>
                <input className="inp" value={form.staff_name} onChange={e=>setForm(p=>({...p,staff_name:e.target.value}))} placeholder="Ad Soyad"/>
              </div>
              <div>
                <label className="label">Görev</label>
                <select className="inp" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="label">Başlangıç</label>
                  <input type="datetime-local" className="inp" value={form.shift_start} onChange={e=>setForm(p=>({...p,shift_start:e.target.value}))} style={{ fontSize:12 }}/>
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input type="datetime-local" className="inp" value={form.shift_end} onChange={e=>setForm(p=>({...p,shift_end:e.target.value}))} style={{ fontSize:12 }}/>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={addShift} disabled={saving || !form.staff_name || !form.shift_start || !form.shift_end}
                className="btn" style={{ flex:1, justifyContent:'center', opacity:saving?.7:1 }}>
                {saving ? '…Kaydediliyor' : 'Kaydet'}
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost" style={{ flex:1, justifyContent:'center' }}>İptal</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
