'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getSupabase } from '@/lib/supabase-client'
import { Calendar, Plus, Zap, Trash2, X, RefreshCw, Sun, CloudRain } from 'lucide-react'
import { getOpenAIKey } from '@/lib/config-store'

const EVENT_TYPES = [
  { value:'MATCH',    label:'Futbol Maçı',  icon:'⚽', color:'var(--green)',  bg:'var(--green2)'  },
  { value:'CONCERT',  label:'Konser',        icon:'🎵', color:'var(--ac)',     bg:'var(--ac2)'     },
  { value:'HOLIDAY',  label:'Resmi Tatil',   icon:'🎉', color:'var(--amber)',  bg:'var(--amber2)'  },
  { value:'CAMPAIGN', label:'Kampanya',      icon:'📢', color:'var(--blue)',   bg:'var(--blue2)'   },
  { value:'WEATHER',  label:'Hava Durumu',   icon:'🌧', color:'var(--tx2)',    bg:'var(--s2)'      },
  { value:'OTHER',    label:'Diğer',         icon:'📌', color:'var(--tx3)',    bg:'var(--s3)'      },
]
const IMPACT = [
  { value:'LOW',      label:'Düşük',   color:'var(--tx3)'   },
  { value:'MEDIUM',   label:'Orta',    color:'var(--amber)' },
  { value:'HIGH',     label:'Yüksek',  color:'var(--red)'   },
  { value:'CRITICAL', label:'Kritik',  color:'var(--red)'   },
]
const DISTRICTS = ['Beşiktaş','Kadıköy','Maltepe','Pendik','Ümraniye','Taksim','Bağcılar','Şişli','Bakırköy','Üsküdar']
const BADGE: Record<string,string> = { LOW:'badge-muted', MEDIUM:'badge-amber', HIGH:'badge-red', CRITICAL:'badge-red' }

export default function EventsPage() {
  const [events, setEvents]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [briefing, setBriefing] = useState(false)
  const [briefResult, setBriefResult] = useState<any>(null)
  const [form, setForm] = useState({
    event_date: new Date().toISOString().split('T')[0],
    event_type: 'MATCH', title: '', description: '',
    affected_districts: [] as string[],
    impact_level: 'HIGH', expected_order_increase_pct: 30,
    home_team: '', away_team: '', venue: '', kickoff_time: '',
  })

  const fetchBrief = async () => {
    const apiKey = getOpenAIKey()
    if (!apiKey) { alert('Ayarlar sayfasından OpenAI API Key giriniz'); return }
    setBriefing(true)
    try {
      const res = await fetch('/api/daily-brief', {
        headers: { 'x-api-key': apiKey }
      })
      const data = await res.json()
      if (data.ok) {
        setBriefResult(data)
        await load()
      } else {
        alert('Hata: ' + (data.error || 'Bilinmeyen hata'))
      }
    } catch (e: any) {
      alert('Bağlantı hatası: ' + e.message)
    } finally { setBriefing(false) }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await getSupabase().from('events').select('*').order('event_date').order('kickoff_time')
    setEvents(data ?? []); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleDistrict = (d: string) => setForm(p => ({
    ...p, affected_districts: p.affected_districts.includes(d)
      ? p.affected_districts.filter(x=>x!==d)
      : [...p.affected_districts, d]
  }))

  const save = async () => {
    if (!form.title || !form.event_date || form.affected_districts.length === 0) return
    setSaving(true)
    const { data } = await getSupabase().from('events').insert({
      ...form,
      kickoff_time: form.kickoff_time || null,
      home_team: form.home_team || null,
      away_team: form.away_team || null,
      venue: form.venue || null,
    }).select().single()
    if (data) setEvents(p => [...p, data].sort((a,b)=>a.event_date.localeCompare(b.event_date)))
    setShowAdd(false)
    setForm({ event_date:new Date().toISOString().split('T')[0], event_type:'MATCH', title:'', description:'', affected_districts:[], impact_level:'HIGH', expected_order_increase_pct:30, home_team:'', away_team:'', venue:'', kickoff_time:'' })
    setSaving(false)
  }

  const remove = async (id: string) => {
    await getSupabase().from('events').delete().eq('id', id)
    setEvents(p => p.filter(e => e.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]
  const todayEvents = events.filter(e => e.event_date === today)
  const upcoming = events.filter(e => e.event_date > today)
  const past = events.filter(e => e.event_date < today)

  const etMeta = (type: string) => EVENT_TYPES.find(t=>t.value===type) ?? EVENT_TYPES[5]

  return (
    <div className="dm">
      <Topbar title="Etkinlik Takvimi" subtitle="Maç · Konser · Tatil · AI bağlamı"
        action={
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={fetchBrief} disabled={briefing}
              className="btn-ghost" style={{ padding:'6px 14px', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
              <RefreshCw size={12} style={{ animation:briefing?'spin .7s linear infinite':undefined }}/>
              {briefing ? 'Çekiliyor…' : '🌐 Günlük Brifing'}
            </button>
            <button onClick={() => setShowAdd(true)} className="btn" style={{ padding:'6px 14px', fontSize:12 }}>
              <Plus size={12}/> Etkinlik Ekle
            </button>
          </div>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Bugün banner */}
        {todayEvents.length > 0 && (
          <div style={{ background:'var(--red2)', border:'1px solid var(--red-ln)', borderRadius:14, padding:'16px 20px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--red)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>⚡ Bugün Aktif Etkinlikler — AI Otopilot Devrede</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {todayEvents.map(ev => {
                const m = etMeta(ev.event_type)
                return (
                  <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(0,0,0,.2)', borderRadius:10 }}>
                    <span style={{ fontSize:22, flexShrink:0 }}>{m.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13.5, fontWeight:700, color:'#fff' }}>{ev.title}</p>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginTop:2 }}>
                        {ev.affected_districts?.join(', ')} {ev.kickoff_time ? `· Başlangıç: ${ev.kickoff_time}` : ''} · Beklenen artış: +%{ev.expected_order_increase_pct}
                      </p>
                    </div>
                    <span className={`badge ${BADGE[ev.impact_level]||'badge-muted'}`}>{IMPACT.find(i=>i.value===ev.impact_level)?.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,160px),1fr))', gap:12 }}>
          {[
            { label:'Bugün',     value:todayEvents.length, color:'var(--red)',   bg:'var(--red2)'   },
            { label:'Yaklaşan',  value:upcoming.length,    color:'var(--amber)', bg:'var(--amber2)' },
            { label:'Toplam',    value:events.length,      color:'var(--ac)',    bg:'var(--ac2)'    },
            { label:'Geçmiş',    value:past.length,        color:'var(--tx3)',   bg:'var(--s2)'     },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="kpi" style={{ borderLeft:`2.5px solid ${color}` }}>
              <div style={{ width:30, height:30, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <Calendar size={13} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize:22, color }}>{loading?'—':value}</p>
            </div>
          ))}
        </div>

        {/* Brifing sonucu */}
        {briefResult && (
          <div style={{ background:'var(--green2)', border:'1px solid var(--green-ln)', borderRadius:14, padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span style={{ fontSize:18 }}>🌐</span>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>Günlük Brifing Tamamlandı — {briefResult.date}</p>
              <button onClick={()=>setBriefResult(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--tx3)' }}><X size={14}/></button>
            </div>
            <p style={{ fontSize:13, color:'var(--tx2)', lineHeight:1.6, marginBottom:6 }}>{briefResult.summary}</p>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {briefResult.weather && (
                <span style={{ fontSize:12, color:'var(--tx3)' }}>
                  🌡 {briefResult.weather.condition} · {briefResult.weather.temperature}°C
                </span>
              )}
              <span style={{ fontSize:12, color:'var(--tx3)' }}>📅 {briefResult.events_saved} etkinlik kaydedildi</span>
              {briefResult.tomorrow_preview && <span style={{ fontSize:12, color:'var(--amber)' }}>📌 Yarın: {briefResult.tomorrow_preview}</span>}
            </div>
          </div>
        )}

        {/* AI bağlam açıklaması */}
        <div style={{ display:'flex', gap:12, padding:'14px 18px', background:'var(--ac2)', border:'1px solid rgba(124,106,247,.2)', borderRadius:12 }}>
          <Zap size={16} style={{ color:'var(--ac)', flexShrink:0, marginTop:2 }}/>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--tx)', marginBottom:4 }}>AI Otopilot bu verileri nasıl kullanıyor?</p>
            <p style={{ fontSize:12, color:'var(--tx3)', lineHeight:1.6 }}>
              Her 30 saniyede çalışan AI motoru etkinlik tablosunu okur. <strong style={{ color:'var(--tx2)' }}>Maç 2 saat öncesinden</strong> etkilenen bölgedeki restoranlar için stok hazırlığı ve personel takviyesi önerir.
              <strong style={{ color:'var(--tx2)' }}> Maç sonrası</strong> (22:00-23:30) kurye kapasitesi artırımı tetiklenir.
              <strong style={{ color:'var(--tx2)' }}> Tatil günleri</strong> tüm ağda +%30 sipariş beklentisiyle hazırlık yapılır.
            </p>
          </div>
        </div>

        {/* Yaklaşan etkinlikler */}
        {upcoming.length > 0 && (
          <div className="card">
            <div className="card-h"><span className="card-title">Yaklaşan Etkinlikler</span><span className="card-meta">{upcoming.length} etkinlik</span></div>
            <div>
              {upcoming.map(ev => {
                const m = etMeta(ev.event_type)
                const daysLeft = Math.ceil((new Date(ev.event_date).getTime() - Date.now()) / 86400000)
                return (
                  <div key={ev.id} className="row" style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:m.bg, border:`1px solid ${m.color}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{m.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--tx)' }}>{ev.title}</p>
                      <p style={{ fontSize:11, color:'var(--tx3)', marginTop:2 }}>
                        {new Date(ev.event_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}
                        {ev.kickoff_time ? ` · ${ev.kickoff_time}` : ''}
                        {ev.venue ? ` · ${ev.venue}` : ''}
                        {' · '}{ev.affected_districts?.slice(0,3).join(', ')}{(ev.affected_districts?.length||0)>3?` +${ev.affected_districts.length-3}`:''} 
                      </p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'var(--amber)', fontWeight:600 }}>+%{ev.expected_order_increase_pct}</span>
                      <span style={{ fontSize:11, color:'var(--tx3)' }}>{daysLeft === 1 ? 'yarın' : `${daysLeft} gün`}</span>
                      <span className={`badge ${BADGE[ev.impact_level]||'badge-muted'}`} style={{ fontSize:9 }}>{IMPACT.find(i=>i.value===ev.impact_level)?.label}</span>
                      <button onClick={()=>remove(ev.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx3)', padding:4 }}><Trash2 size={13}/></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bugün etkinlik yoksa */}
        {todayEvents.length === 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'var(--green2)', border:'1px solid var(--green-ln)', borderRadius:12 }}>
            <span style={{ fontSize:20 }}>✅</span>
            <p style={{ fontSize:13, color:'var(--tx2)' }}>Bugün özel etkinlik yok — sistem standart modda çalışıyor</p>
          </div>
        )}

      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr2)', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 80px rgba(0,0,0,.5)' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'var(--s1)', zIndex:1 }}>
              <p style={{ fontSize:16, fontWeight:700, color:'var(--tx)' }}>Etkinlik Ekle</p>
              <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx3)' }}><X size={16}/></button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
              {/* Tür */}
              <div>
                <label className="label">Etkinlik Türü</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {EVENT_TYPES.map(t => (
                    <button key={t.value} onClick={()=>setForm(p=>({...p,event_type:t.value}))}
                      style={{ padding:'8px', borderRadius:9, border:`1px solid ${form.event_type===t.value?t.color:'var(--bdr)'}`, background:form.event_type===t.value?t.bg:'var(--s2)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                      <span style={{ fontSize:16 }}>{t.icon}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:form.event_type===t.value?t.color:'var(--tx3)' }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Temel bilgiler */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="label">Tarih</label>
                  <input type="date" className="inp" value={form.event_date} onChange={e=>setForm(p=>({...p,event_date:e.target.value}))}/>
                </div>
                <div>
                  <label className="label">Başlangıç Saati</label>
                  <input type="time" className="inp" value={form.kickoff_time} onChange={e=>setForm(p=>({...p,kickoff_time:e.target.value}))} placeholder="20:00"/>
                </div>
              </div>
              <div>
                <label className="label">Başlık</label>
                <input className="inp" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Beşiktaş - Galatasaray Derbisi"/>
              </div>
              {form.event_type === 'MATCH' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label className="label">Ev Sahibi</label>
                    <input className="inp" value={form.home_team} onChange={e=>setForm(p=>({...p,home_team:e.target.value}))} placeholder="Beşiktaş"/>
                  </div>
                  <div>
                    <label className="label">Deplasman</label>
                    <input className="inp" value={form.away_team} onChange={e=>setForm(p=>({...p,away_team:e.target.value}))} placeholder="Galatasaray"/>
                  </div>
                </div>
              )}
              <div>
                <label className="label">Mekan (opsiyonel)</label>
                <input className="inp" value={form.venue} onChange={e=>setForm(p=>({...p,venue:e.target.value}))} placeholder="Vodafone Park"/>
              </div>
              {/* Etki */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="label">Etki Seviyesi</label>
                  <select className="inp" value={form.impact_level} onChange={e=>setForm(p=>({...p,impact_level:e.target.value}))}>
                    {IMPACT.map(i=><option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Tahmini Sipariş Artışı %</label>
                  <input type="number" className="inp" value={form.expected_order_increase_pct} onChange={e=>setForm(p=>({...p,expected_order_increase_pct:Number(e.target.value)}))} min={0} max={200}/>
                </div>
              </div>
              {/* Bölgeler */}
              <div>
                <label className="label">Etkilenen Bölgeler (en az 1 seç)</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:6 }}>
                  {DISTRICTS.map(d => (
                    <button key={d} onClick={()=>toggleDistrict(d)}
                      style={{ padding:'5px 12px', borderRadius:20, fontSize:12, cursor:'pointer', border:`1px solid ${form.affected_districts.includes(d)?'var(--ac)':'var(--bdr)'}`, background:form.affected_districts.includes(d)?'var(--ac2)':'var(--s2)', color:form.affected_districts.includes(d)?'var(--ac)':'var(--tx3)', fontWeight:form.affected_districts.includes(d)?600:400 }}>
                      {d}
                    </button>
                  ))}
                </div>
                <button onClick={()=>setForm(p=>({...p,affected_districts:DISTRICTS}))} style={{ marginTop:8, fontSize:11, color:'var(--ac)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                  Tümünü seç
                </button>
              </div>
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid var(--bdr)', display:'flex', gap:10 }}>
              <button onClick={save} disabled={saving || !form.title || form.affected_districts.length === 0}
                className="btn" style={{ flex:1, justifyContent:'center', opacity:saving?.7:1 }}>
                {saving ? '…Kaydediliyor' : '💾 Kaydet'}
              </button>
              <button onClick={()=>setShowAdd(false)} className="btn-ghost" style={{ flex:1, justifyContent:'center' }}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
