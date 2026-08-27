'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { cn } from '@/lib/utils'
import { Save, Bell, Sliders, Store, Shield, Key, Eye, EyeOff, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { getConfig, saveConfig, maskSecret, hasRequiredConfig, AppConfig } from '@/lib/config-store'

type Tab = 'api-keys' | 'thresholds' | 'alerts' | 'system'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('api-keys')
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({})

  useEffect(() => { setConfig(getConfig()) }, [])

  if (!config) return null

  const update = (key: keyof AppConfig, value: AppConfig[keyof AppConfig]) => {
    setConfig(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const handleSave = () => {
    if (config) saveConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const toggleShow = (key: string) => setShowSecrets(p => ({ ...p, [key]: !p[key] }))

  const testOpenAI = async () => {
    setTestResult(p => ({ ...p, openai: 'testing' }))
    try {
      const key = config.openai_api_key
      if (!key) throw new Error('Key yok')
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` }
      })
      setTestResult(p => ({ ...p, openai: res.ok ? 'ok' : 'fail' }))
    } catch { setTestResult(p => ({ ...p, openai: 'fail' })) }
  }

  const { missing } = hasRequiredConfig()

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'api-keys', label: 'API Anahtarları', icon: <Key className="w-4 h-4" /> },
    { id: 'thresholds', label: 'Eşik Değerleri', icon: <Sliders className="w-4 h-4" /> },
    { id: 'alerts', label: 'Bildirimler', icon: <Bell className="w-4 h-4" /> },
    { id: 'system', label: 'Sistem', icon: <Shield className="w-4 h-4" /> },
  ]

  return (
    <div>
      <Topbar title="Ayarlar" subtitle="Sistem konfigürasyonu" />
      <div className="p-6 max-w-3xl space-y-5">

        {/* Config durumu */}
        {missing.length > 0 && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.06] p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-orange-300 mb-1">Eksik konfigürasyon</div>
              <div className="text-xs text-white/50">{missing.join(', ')} tanımlanmamış. AI özellikleri çalışmayacak.</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border border-white/[0.08] rounded-xl p-1 bg-white/[0.02]">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-2 flex-1 justify-center py-2 rounded-lg text-xs font-medium transition-all',
                tab === t.id ? 'bg-orange-500/15 border border-orange-500/30 text-orange-300' : 'text-white/40 hover:text-white/60')}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* API Keys Tab */}
        {tab === 'api-keys' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-5">
              <div className="text-xs text-white/40 uppercase tracking-wide font-medium">AI & Entegrasyon Anahtarları</div>

              {/* OpenAI */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/70 font-medium">OpenAI API Key</label>
                  <div className="flex items-center gap-2">
                    {testResult.openai === 'ok' && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Bağlandı</span>}
                    {testResult.openai === 'fail' && <span className="text-xs text-red-400">Hatalı key</span>}
                    <button onClick={testOpenAI} disabled={testResult.openai === 'testing' || !config.openai_api_key}
                      className="text-xs px-2.5 py-1 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/60 disabled:opacity-30 flex items-center gap-1">
                      {testResult.openai === 'testing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                      Test Et
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecrets.openai ? 'text' : 'password'}
                    value={config.openai_api_key}
                    onChange={e => update('openai_api_key', e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none font-mono focus:border-orange-500/50 transition-colors"
                  />
                  <button onClick={() => toggleShow('openai')} className="p-2.5 border border-white/[0.08] rounded-lg text-white/30 hover:text-white/60">
                    {showSecrets.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-xs text-white/25 mt-1">AI Analyst + Operasyon Reçetesi için gerekli</div>
              </div>

              {/* n8n Webhook Secret */}
              <div>
                <label className="text-sm text-white/70 font-medium block mb-2">n8n Webhook Secret</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecrets.n8n ? 'text' : 'password'}
                    value={config.n8n_webhook_secret}
                    onChange={e => update('n8n_webhook_secret', e.target.value)}
                    placeholder="webhook_secret_..."
                    className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none font-mono focus:border-orange-500/50 transition-colors"
                  />
                  <button onClick={() => toggleShow('n8n')} className="p-2.5 border border-white/[0.08] rounded-lg text-white/30 hover:text-white/60">
                    {showSecrets.n8n ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-xs text-white/25 mt-1">n8n → Mutfak Nabzı webhook auth</div>
              </div>

              {/* API Key */}
              <div>
                <label className="text-sm text-white/70 font-medium block mb-2">Mutfak Nabzı API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecrets.apikey ? 'text' : 'password'}
                    value={config.mutfak_nabzi_api_key}
                    onChange={e => update('mutfak_nabzi_api_key', e.target.value)}
                    placeholder="mnabzi_..."
                    className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none font-mono focus:border-orange-500/50 transition-colors"
                  />
                  <button onClick={() => toggleShow('apikey')} className="p-2.5 border border-white/[0.08] rounded-lg text-white/30 hover:text-white/60">
                    {showSecrets.apikey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-xs text-white/25 mt-1">Harici sistemler (tablet, BI araçları) için</div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="text-sm text-white/70 font-medium block mb-2">WhatsApp Business Token</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecrets.wa ? 'text' : 'password'}
                    value={config.whatsapp_token}
                    onChange={e => update('whatsapp_token', e.target.value)}
                    placeholder="EAABs..."
                    className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none font-mono focus:border-orange-500/50 transition-colors"
                  />
                  <button onClick={() => toggleShow('wa')} className="p-2.5 border border-white/[0.08] rounded-lg text-white/30 hover:text-white/60">
                    {showSecrets.wa ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-xs text-white/25 mt-1">n8n üzerinden kritik alarm bildirimi</div>
              </div>
            </div>

            {/* Supabase */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-4">
              <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Supabase Bağlantısı</div>
              <div>
                <label className="text-sm text-white/70 font-medium block mb-2">Supabase URL</label>
                <input
                  type="text"
                  value={config.supabase_url}
                  onChange={e => update('supabase_url', e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none font-mono focus:border-orange-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 font-medium block mb-2">Supabase Anon Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecrets.sb ? 'text' : 'password'}
                    value={config.supabase_anon_key}
                    onChange={e => update('supabase_anon_key', e.target.value)}
                    placeholder="eyJhbGc..."
                    className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none font-mono focus:border-orange-500/50 transition-colors"
                  />
                  <button onClick={() => toggleShow('sb')} className="p-2.5 border border-white/[0.08] rounded-lg text-white/30 hover:text-white/60">
                    {showSecrets.sb ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="text-xs text-white/25 bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                ⚠️ Bu değerler tarayıcı localStorage'a kaydedilir. Prod ortamda Vercel environment variables kullanılmalıdır.
              </div>
            </div>
          </div>
        )}

        {/* Thresholds Tab */}
        {tab === 'thresholds' && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Nabız Skoru Eşik Değerleri</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'pulse_threshold_yogun' as const, label: 'Yoğun Başlangıcı', color: 'text-yellow-400', border: 'border-yellow-500/30', desc: '0 – bu değer arası: Normal' },
                { key: 'pulse_threshold_riskli' as const, label: 'Riskli Başlangıcı', color: 'text-orange-400', border: 'border-orange-500/30', desc: 'Yoğun – bu değer arası: Yoğun' },
                { key: 'pulse_threshold_kritik' as const, label: 'Kritik Başlangıcı', color: 'text-red-400', border: 'border-red-500/30', desc: 'Riskli – bu değer arası: Riskli' },
              ].map(({ key, label, color, border, desc }) => (
                <div key={key}>
                  <div className={cn('text-xs font-medium mb-1', color)}>{label}</div>
                  <div className={cn('border rounded-lg px-3 py-2 bg-white/[0.03]', border)}>
                    <input type="number" min={0} max={100}
                      value={config[key] as number}
                      onChange={e => update(key, parseInt(e.target.value))}
                      className="w-full bg-transparent text-white text-2xl font-bold outline-none tabular-nums"
                    />
                  </div>
                  <div className="text-xs text-white/25 mt-1">{desc}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-white/40">
              Mevcut: 0–{config.pulse_threshold_yogun - 1} <span className="text-emerald-400">Normal</span> · {config.pulse_threshold_yogun}–{config.pulse_threshold_riskli - 1} <span className="text-yellow-400">Yoğun</span> · {config.pulse_threshold_riskli}–{config.pulse_threshold_kritik - 1} <span className="text-orange-400">Riskli</span> · {config.pulse_threshold_kritik}–100 <span className="text-red-400">Kritik</span>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {tab === 'alerts' && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-4">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Bildirim Kanalları</div>
            {[
              { key: 'alerts_dashboard' as const, label: 'Dashboard Bildirimi', desc: 'Sistem içi toast & badge' },
              { key: 'alerts_whatsapp' as const, label: 'WhatsApp', desc: 'n8n üzerinden — WhatsApp token gerekli' },
              { key: 'alerts_email' as const, label: 'E-posta', desc: 'Günlük özet ve kritik alarmlar' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                <div>
                  <div className="text-sm text-white/80">{label}</div>
                  <div className="text-xs text-white/30">{desc}</div>
                </div>
                <button onClick={() => update(key, !config[key])}
                  className={cn('w-11 h-6 rounded-full transition-all relative', config[key] ? 'bg-orange-500' : 'bg-white/[0.1]')}>
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', config[key] ? 'left-6' : 'left-1')} />
                </button>
              </div>
            ))}
            <div className="pt-2">
              <div className="text-sm text-white/60 mb-3">Alert gönderim aralığı</div>
              <div className="flex gap-2">
                {[5, 10, 15, 30].map(v => (
                  <button key={v} onClick={() => update('alert_interval_minutes', v)}
                    className={cn('px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                      config.alert_interval_minutes === v ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                    {v} dk
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {tab === 'system' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-white/40" />
                <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Sistem Modu</div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-white/80">Demo Modu</div>
                  <div className="text-xs text-white/30">Mock data, auth bypass, OpenAI olmadan çalışır</div>
                </div>
                <button onClick={() => update('demo_mode', !config.demo_mode)}
                  className={cn('w-11 h-6 rounded-full transition-all relative', config.demo_mode ? 'bg-orange-500' : 'bg-white/[0.1]')}>
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', config.demo_mode ? 'left-6' : 'left-1')} />
                </button>
              </div>
              {!config.demo_mode && (
                <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/[0.06] text-xs text-yellow-300">
                  ⚠️ Prod modu aktif — Supabase ve OpenAI bağlantısı gerekli.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-4 h-4 text-white/40" />
                <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Aktif Restoranlar</div>
                <span className="ml-auto text-xs text-white/30">{RESTAURANTS.length} restoran</span>
              </div>
              <div className="space-y-1.5">
                {RESTAURANTS.map(r => (
                  <div key={r.id} className="flex items-center gap-3 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs text-white/60 flex-1">{r.name}</span>
                    <span className="text-xs text-white/20">{r.brand.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook URL'leri */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
              <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">n8n Webhook URL&apos;leri</div>
              {[
                { label: 'Snapshot Webhook', path: '/api/webhook/snapshot', method: 'POST' },
                { label: 'Order Event Webhook', path: '/api/webhook/order-event', method: 'POST' },
                { label: 'Tüm Nabız Skorları', path: '/api/pulse/all', method: 'GET' },
                { label: 'Günlük Rapor', path: '/api/reports/daily', method: 'GET' },
                { label: 'Simülasyon', path: '/api/simulate', method: 'POST' },
              ].map(({ label, path, method }) => (
                <div key={path} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', method === 'POST' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300')}>{method}</span>
                  <span className="text-xs text-white/50 flex-1">{label}</span>
                  <code className="text-xs text-white/30 font-mono">{path}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        <button onClick={handleSave}
          className={cn('flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all w-full justify-center',
            saved ? 'bg-emerald-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white')}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Kaydedildi</> : <><Save className="w-4 h-4" /> Ayarları Kaydet</>}
        </button>
      </div>
    </div>
  )
}
