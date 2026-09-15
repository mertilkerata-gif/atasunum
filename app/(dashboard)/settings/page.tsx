'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getConfig, saveConfig as setConfig, hasRequiredConfig } from '@/lib/config-store'
import { Save, Eye, EyeOff, AlertTriangle, CheckCircle2, Sliders, Bell, Shield, Key } from 'lucide-react'

const SECTIONS = [
  { id: 'thresholds', label: 'Eşik Değerleri', Icon: Sliders },
  { id: 'alerts',     label: 'Bildirimler',    Icon: Bell },
  { id: 'api-keys',   label: 'API Anahtarları', Icon: Key },
  { id: 'system',     label: 'Sistem',          Icon: Shield },
]

const THRESHOLDS = [
  { key: 'criticalPulseScore',   label: 'Kritik Nabız Eşiği',       unit: '/100', desc: 'Bu değerin üzerindeki nabız skorları KRİTİK sayılır' },
  { key: 'warningPulseScore',    label: 'Riskli Nabız Eşiği',       unit: '/100', desc: 'RISKLI seviyesi için eşik' },
  { key: 'maxPrepTime',          label: 'Maks. Hazırlama Süresi',   unit: 'dk',   desc: 'Bu süreden uzun hazırlama uyarı tetikler' },
  { key: 'maxCourierWait',       label: 'Maks. Kurye Bekleme',      unit: 'dk',   desc: 'Bu süreden uzun bekleyen kurye anomali sayılır' },
  { key: 'maxOpenOrders',        label: 'Maks. Açık Sipariş',       unit: 'adet', desc: 'Bu sayıyı aşan açık sipariş uyarı tetikler' },
  { key: 'anomalyLookbackMinutes', label: 'Anomali Geriye Bakış',   unit: 'dk',   desc: 'Anomali tespitinde kaç dakika geriye bakılır' },
]

export default function SettingsPage() {
  const [section, setSection] = useState('thresholds')
  const [config, setConfigState] = useState(() => getConfig())
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const { missing } = hasRequiredConfig()

  const save = () => {
    setConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="dm">
      <Topbar title="Ayarlar" subtitle="Sistem konfigürasyonu"
        action={
          <button onClick={save} className="btn" style={{ padding: '6px 14px', fontSize: 12 }}>
            {saved ? <><CheckCircle2 size={12}/> Kaydedildi</> : <><Save size={12}/> Kaydet</>}
          </button>
        }
      />
      <div className="scroll" style={{ padding: 'clamp(14px,3vw,24px) clamp(14px,3vw,24px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' , overflowX: "auto"}}>

          {/* Sol nav */}
          <div className="card">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setSection(id)}
                className={`sb-item ${section === id ? 'active' : ''}`}
                style={{ width: '100%', margin: '2px 0' }}>
                <span className="sb-icon"><Icon size={14} strokeWidth={1.8}/></span>
                {label}
              </button>
            ))}
          </div>

          {/* İçerik */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {missing.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: 'var(--amber2)', border: '1px solid var(--amber-ln)', borderRadius: 12 }}>
                <AlertTriangle size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }}/>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 3 }}>Eksik konfigürasyon</p>
                  <p style={{ fontSize: 12, color: 'var(--tx2)' }}>{missing.join(', ')} tanımlanmamış. AI özellikleri çalışmayacak.</p>
                </div>
              </div>
            )}

            {section === 'thresholds' && (
              <div className="card">
                <div className="card-h"><span className="card-title">Operasyonel Eşik Değerleri</span></div>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {THRESHOLDS.map(({ key, label, unit, desc }) => (
                    <div key={key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{label}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            value={(config as any)[key] ?? 0}
                            onChange={e => setConfigState(p => ({ ...p, [key]: Number(e.target.value) }))}
                            className="inp"
                            style={{ width: 80, padding: '5px 10px', fontSize: 13, textAlign: 'right' }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--tx3)', width: 36 }}>{unit}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'api-keys' && (
              <div className="card">
                <div className="card-h"><span className="card-title">API Anahtarları</span></div>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { key: 'openaiApiKey', label: 'OpenAI API Key', placeholder: 'sk-...', secret: true },
                    { key: 'tiklagelsinApiKey', label: 'Tıkla Gelsin API Key', placeholder: 'tg_...', secret: true },
                    { key: 'supabaseUrl', label: 'Supabase URL', placeholder: 'https://xxx.supabase.co', secret: false },
                    { key: 'supabaseAnonKey', label: 'Supabase Anon Key', placeholder: 'eyJ...', secret: true },
                  ].map(({ key, label, placeholder, secret }) => (
                    <div key={key}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={secret && !showKey ? 'password' : 'text'}
                          value={(config as any)[key] ?? ''}
                          onChange={e => setConfigState(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="inp"
                          style={{ paddingRight: secret ? 40 : 13 }}
                        />
                        {secret && (
                          <button onClick={() => setShowKey(v => !v)}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)' }}>
                            {showKey ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'alerts' && (
              <div className="card">
                <div className="card-h"><span className="card-title">Bildirim Ayarları</span></div>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { key: 'alertsEnabled', label: 'Bildirimler Aktif', desc: 'Anomali ve kritik uyarıları etkinleştir' },
                    { key: 'criticalAlertsOnly', label: 'Sadece Kritik', desc: 'Yalnızca KRİTİK seviyesinde bildirim gönder' },
                    { key: 'soundEnabled', label: 'Ses Bildirimi', desc: 'Kritik anomalilerde sesli uyarı' },
                    { key: 'emailAlerts', label: 'E-posta Bildirimleri', desc: 'Önemli olaylar için e-posta gönder' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--s2)', borderRadius: 10, border: '1px solid var(--bdr)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{label}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 2 }}>{desc}</p>
                      </div>
                      <button
                        onClick={() => setConfigState(p => ({ ...p, [key]: !(p as any)[key] }))}
                        style={{ width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'background .2s', background: (config as any)[key] ? 'var(--ac)' : 'var(--s4)', position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left .2s', left: (config as any)[key] ? 21 : 3 }}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'system' && (
              <div className="card">
                <div className="card-h"><span className="card-title">Sistem Bilgisi</span></div>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Versiyon', value: 'v1.0.0' },
                    { label: 'Supabase Projesi', value: 'exkhzmpowcoxdzzvzisv' },
                    { label: 'Ortam', value: 'Production' },
                    { label: 'Güncelleme Sıklığı', value: '5 dakika' },
                    { label: 'Realtime', value: 'Aktif' },
                  ].map(({ label, value }) => (
                    <div key={label} className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
