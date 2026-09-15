'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Save, Eye, EyeOff, CheckCircle2, Sliders, Bell, Shield, Key, AlertTriangle } from 'lucide-react'

const STORAGE_KEY = 'mutfak_nabzi_config'

function loadConfig() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveToStorage(data: Record<string, any>) {
  const current = loadConfig()
  const merged = { ...current, ...data }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}

const SECTIONS = [
  { id:'api-keys',   label:'API Anahtarları', Icon:Key      },
  { id:'thresholds', label:'Eşik Değerleri',  Icon:Sliders  },
  { id:'alerts',     label:'Bildirimler',     Icon:Bell     },
  { id:'system',     label:'Sistem',          Icon:Shield   },
]

export default function SettingsPage() {
  const [section, setSection] = useState('api-keys')
  const [cfg, setCfg] = useState<Record<string,any>>({})
  const [showKeys, setShowKeys] = useState<Record<string,boolean>>({})
  const [saved, setSaved]   = useState(false)
  const [tested, setTested] = useState<'idle'|'ok'|'err'>('idle')
  const [testing, setTesting] = useState(false)

  // Mount'ta localStorage'dan yükle
  useEffect(() => { setCfg(loadConfig()) }, [])

  const set = (key: string, value: any) => setCfg(prev => ({ ...prev, [key]: value }))

  const save = () => {
    saveToStorage(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const testOpenAI = async () => {
    const key = cfg.openai_api_key || ''
    if (!key) { alert('Önce OpenAI API Key girin'); return }
    setTesting(true); setTested('idle')
    try {
      const res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } })
      setTested(res.ok ? 'ok' : 'err')
    } catch { setTested('err') }
    setTesting(false)
  }

  const API_KEYS = [
    { key:'openai_api_key',    label:'OpenAI API Key',    placeholder:'sk-proj-...',          secret:true  },
    { key:'tiklagelsin_api_key',label:'Tıkla Gelsin API', placeholder:'tg_live_...',           secret:true  },
    { key:'n8n_webhook_secret', label:'n8n Webhook Secret',placeholder:'whsec_...',            secret:true  },
    { key:'whatsapp_token',     label:'WhatsApp Token',   placeholder:'EAAxxxxxxxx...',         secret:true  },
    { key:'supabase_url',       label:'Supabase URL',     placeholder:'https://xxx.supabase.co',secret:false },
    { key:'supabase_anon_key',  label:'Supabase Anon Key',placeholder:'eyJhbGci...',            secret:true  },
  ]

  const THRESHOLDS_FIELDS = [
    { key:'pulse_threshold_yogun',   label:'Yoğun Eşiği',     unit:'/100', def:40, desc:'Bu nabız üstü YOĞUN sayılır' },
    { key:'pulse_threshold_riskli',  label:'Riskli Eşiği',    unit:'/100', def:60, desc:'Bu nabız üstü RİSKLİ sayılır' },
    { key:'pulse_threshold_kritik',  label:'Kritik Eşiği',    unit:'/100', def:80, desc:'Bu nabız üstü KRİTİK sayılır' },
    { key:'alert_interval_minutes',  label:'Uyarı Aralığı',   unit:'dk',   def:5,  desc:'AI otopilot tarama sıklığı' },
  ]

  const ALERT_TOGGLES = [
    { key:'alerts_dashboard', label:'Dashboard Bildirimleri', desc:'Ekranda uyarı paneli göster' },
    { key:'alerts_whatsapp',  label:'WhatsApp Bildirimleri',  desc:'Kritik durumlarda WhatsApp mesajı' },
    { key:'alerts_email',     label:'E-posta Bildirimleri',   desc:'Günlük özet rapor e-postası' },
    { key:'demo_mode',        label:'Demo Modu',              desc:'Gerçek aksiyonlar yerine simülasyon' },
  ]

  return (
    <div className="dm">
      <Topbar title="Ayarlar" subtitle="Sistem konfigürasyonu — localStorage"
        action={
          <button onClick={save} className="btn" style={{ padding:'6px 14px', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
            {saved ? <><CheckCircle2 size={12}/> Kaydedildi!</> : <><Save size={12}/> Kaydet</>}
          </button>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'clamp(160px,22%,200px) 1fr', gap:20, alignItems:'start' }}>

          {/* Sol nav */}
          <div className="card">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setSection(id)}
                className={`sb-item ${section === id ? 'active' : ''}`}
                style={{ width:'100%', margin:'2px 0' }}>
                <span className="sb-icon"><Icon size={14} strokeWidth={1.8}/></span>
                {label}
              </button>
            ))}
          </div>

          {/* Sağ içerik */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* ── API Keys ── */}
            {section === 'api-keys' && (
              <div className="card">
                <div className="card-h">
                  <span className="card-title">API Anahtarları</span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={testOpenAI} disabled={testing}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:8, fontSize:11.5, fontWeight:600, cursor:'pointer', border:'1px solid var(--bdr)',
                        background: tested==='ok'?'var(--green2)':tested==='err'?'var(--red2)':'var(--s2)',
                        color: tested==='ok'?'var(--green)':tested==='err'?'var(--red)':'var(--tx2)' }}>
                      {testing ? '…Test' : tested==='ok' ? '✓ Bağlı' : tested==='err' ? '✗ Hata' : '🔌 Test'}
                    </button>
                    <button onClick={() => {
                      const stored = loadConfig()
                      const key = stored.openai_api_key || ''
                      alert(key ? `✅ Kayıtlı: ${key.slice(0,8)}...${key.slice(-4)}\n\nToplam ${Object.keys(stored).length} ayar kayıtlı.` : '❌ OpenAI key kayıtlı değil.\nAşağıya girin ve Kaydet\'e basın.')
                    }} style={{ fontSize:11, padding:'4px 10px', borderRadius:8, border:'1px solid var(--bdr)', background:'var(--s2)', color:'var(--tx2)', cursor:'pointer' }}>
                      🔍 Kontrol
                    </button>
                  </div>
                </div>

                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
                  {/* OpenAI — özel alan, büyük vurgulu */}
                  <div style={{ padding:'14px 16px', background:'var(--ac2)', border:'1px solid rgba(124,106,247,.2)', borderRadius:12 }}>
                    <label style={{ fontSize:12, fontWeight:700, color:'var(--ac)', display:'block', marginBottom:8, letterSpacing:'.04em' }}>
                      🤖 OpenAI API Key <span style={{ fontSize:10, color:'var(--tx3)' }}>(AI Otopilot için zorunlu)</span>
                    </label>
                    <div style={{ position:'relative' }}>
                      <input
                        type={showKeys['openai_api_key'] ? 'text' : 'password'}
                        value={cfg.openai_api_key || ''}
                        onChange={e => set('openai_api_key', e.target.value)}
                        placeholder="sk-proj-..."
                        className="inp"
                        style={{ paddingRight:40, fontFamily:'JetBrains Mono,monospace', fontSize:13 }}
                      />
                      <button onClick={() => setShowKeys(p=>({...p, openai_api_key:!p.openai_api_key}))}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--tx3)' }}>
                        {showKeys['openai_api_key'] ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                    {!cfg.openai_api_key && (
                      <p style={{ fontSize:11, color:'var(--amber)', marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
                        <AlertTriangle size={11}/> Bu alanı doldurun ve Kaydet'e basın
                      </p>
                    )}
                  </div>

                  {/* Diğer key'ler */}
                  {API_KEYS.slice(1).map(({ key, label, placeholder, secret }) => (
                    <div key={key}>
                      <label style={{ fontSize:11, fontWeight:600, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:6 }}>{label}</label>
                      <div style={{ position:'relative' }}>
                        <input
                          type={secret && !showKeys[key] ? 'password' : 'text'}
                          value={cfg[key] || ''}
                          onChange={e => set(key, e.target.value)}
                          placeholder={placeholder}
                          className="inp"
                          style={{ paddingRight: secret ? 40 : 13, fontSize:13 }}
                        />
                        {secret && (
                          <button onClick={() => setShowKeys(p=>({...p,[key]:!p[key]}))}
                            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--tx3)' }}>
                            {showKeys[key] ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kaydet butonu — büyük, belirgin */}
                <div style={{ padding:'0 20px 20px' }}>
                  <button onClick={save} className="btn" style={{ width:'100%', justifyContent:'center', padding:'11px' }}>
                    {saved ? <><CheckCircle2 size={14}/> Kaydedildi!</> : <><Save size={14}/> Tüm Ayarları Kaydet</>}
                  </button>
                  <p style={{ fontSize:11, color:'var(--tx3)', marginTop:8, textAlign:'center' }}>
                    localStorage'a kaydedilir — sayfa yenilenince korunur
                  </p>
                </div>
              </div>
            )}

            {/* ── Thresholds ── */}
            {section === 'thresholds' && (
              <div className="card">
                <div className="card-h"><span className="card-title">Operasyonel Eşik Değerleri</span></div>
                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:18 }}>
                  {THRESHOLDS_FIELDS.map(({ key, label, unit, def, desc }) => (
                    <div key={key}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <label style={{ fontSize:13, fontWeight:500, color:'var(--tx)' }}>{label}</label>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <input type="number" value={cfg[key] ?? def}
                            onChange={e => set(key, Number(e.target.value))}
                            className="inp" style={{ width:72, padding:'5px 10px', fontSize:13, textAlign:'right' }}/>
                          <span style={{ fontSize:12, color:'var(--tx3)', width:36 }}>{unit}</span>
                        </div>
                      </div>
                      <p style={{ fontSize:11.5, color:'var(--tx3)' }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Alerts ── */}
            {section === 'alerts' && (
              <div className="card">
                <div className="card-h"><span className="card-title">Bildirim Ayarları</span></div>
                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
                  {ALERT_TOGGLES.map(({ key, label, desc }) => {
                    const val = cfg[key] ?? true
                    return (
                      <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--s2)', borderRadius:10, border:'1px solid var(--bdr)' }}>
                        <div>
                          <p style={{ fontSize:13, fontWeight:500, color:'var(--tx)' }}>{label}</p>
                          <p style={{ fontSize:11.5, color:'var(--tx3)', marginTop:2 }}>{desc}</p>
                        </div>
                        <button onClick={() => set(key, !val)}
                          style={{ width:42, height:24, borderRadius:12, border:'none', cursor:'pointer', transition:'background .2s', background:val?'var(--ac)':'var(--s4)', position:'relative', flexShrink:0 }}>
                          <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:3, transition:'left .2s', left:val?21:3 }}/>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── System ── */}
            {section === 'system' && (
              <div className="card">
                <div className="card-h"><span className="card-title">Sistem Bilgisi</span></div>
                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { label:'Versiyon',        value:'v1.0.0' },
                    { label:'Supabase Projesi',value:'exkhzmpowcoxdzzvzisv' },
                    { label:'Ortam',            value:'Production' },
                    { label:'AI Motor',         value:'GPT-4o' },
                    { label:'Güncelleme',       value:'5 dakika' },
                    { label:'Config Storage',   value:'localStorage' },
                    { label:'Kayıtlı Ayar',     value:`${Object.keys(loadConfig()).length} alan` },
                  ].map(({ label, value }) => (
                    <div key={label} className="row" style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, color:'var(--tx2)' }}>{label}</span>
                      <span style={{ fontSize:13, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:8 }}>
                    <button onClick={() => {
                      if (confirm('Tüm ayarlar silinecek. Emin misiniz?')) {
                        localStorage.removeItem(STORAGE_KEY)
                        setCfg({})
                        alert('Ayarlar temizlendi')
                      }
                    }} className="btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:12, color:'var(--red)' }}>
                      🗑 Ayarları Sıfırla
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
