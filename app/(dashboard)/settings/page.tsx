'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { cn } from '@/lib/utils'
import { Save, Bell, Sliders, Store, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState({ yogun: 40, riskli: 60, kritik: 80 })
  const [alerts, setAlerts] = useState({ dashboard: true, whatsapp: false, email: true })
  const [alertInterval, setAlertInterval] = useState(5)
  const [demoMode, setDemoMode] = useState(true)
  const [saved, setSaved] = useState(false)

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div>
      <Topbar title="Ayarlar" subtitle="Sistem konfigürasyonu" />
      <div className="p-6 max-w-3xl space-y-5">

        {/* Nabız eşikleri */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-white/40" />
            <div className="text-sm font-semibold text-white">Nabız Skoru Eşikleri</div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'yogun', label: 'Yoğun Başlangıcı', color: 'text-yellow-400', border: 'border-yellow-500/30' },
              { key: 'riskli', label: 'Riskli Başlangıcı', color: 'text-orange-400', border: 'border-orange-500/30' },
              { key: 'kritik', label: 'Kritik Başlangıcı', color: 'text-red-400', border: 'border-red-500/30' },
            ].map(({ key, label, color, border }) => (
              <div key={key}>
                <div className={cn('text-xs font-medium mb-2', color)}>{label}</div>
                <div className={cn('flex items-center gap-2 border rounded-lg px-3 py-2', border, 'bg-white/[0.03]')}>
                  <input
                    type="number" min={0} max={100}
                    value={(thresholds as any)[key]}
                    onChange={e => setThresholds(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                    className="w-full bg-transparent text-white text-lg font-bold outline-none tabular-nums"
                  />
                  <span className="text-white/40 text-sm">/ 100</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-white/30">
            Mevcut: 0–{thresholds.yogun - 1} Normal · {thresholds.yogun}–{thresholds.riskli - 1} Yoğun · {thresholds.riskli}–{thresholds.kritik - 1} Riskli · {thresholds.kritik}–100 Kritik
          </div>
        </div>

        {/* Alert kanalları */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-white/40" />
            <div className="text-sm font-semibold text-white">Alert Kanalları</div>
          </div>
          <div className="space-y-3">
            {[
              { key: 'dashboard', label: 'Dashboard Bildirimi', desc: 'Sistem içi bildirim' },
              { key: 'whatsapp', label: 'WhatsApp', desc: 'n8n üzerinden gönderilir (gerçek entegrasyon gerekli)' },
              { key: 'email', label: 'E-posta', desc: 'Yönetici özetleri için' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-white/80">{label}</div>
                  <div className="text-xs text-white/30">{desc}</div>
                </div>
                <button onClick={() => setAlerts(p => ({ ...p, [key]: !(p as any)[key] }))}
                  className={cn('w-10 h-5 rounded-full transition-all relative',
                    (alerts as any)[key] ? 'bg-orange-500' : 'bg-white/[0.1]')}>
                  <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                    (alerts as any)[key] ? 'left-5.5 translate-x-0.5' : 'left-0.5')} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
              <span className="text-sm text-white/60 flex-1">Alert gönderim aralığı</span>
              <div className="flex items-center gap-2">
                {[5, 10, 15].map(v => (
                  <button key={v} onClick={() => setAlertInterval(v)}
                    className={cn('px-3 py-1 rounded-lg border text-xs font-medium transition-all',
                      alertInterval === v ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40')}>
                    {v} dk
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Demo modu */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-white/40" />
            <div className="text-sm font-semibold text-white">Sistem Modu</div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80">Demo Modu</div>
              <div className="text-xs text-white/30">Mock data kullanılır, gerçek API bağlantısı olmaz</div>
            </div>
            <button onClick={() => setDemoMode(p => !p)}
              className={cn('w-10 h-5 rounded-full transition-all relative', demoMode ? 'bg-orange-500' : 'bg-white/[0.1]')}>
              <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', demoMode ? 'left-5.5 translate-x-0.5' : 'left-0.5')} />
            </button>
          </div>
          {!demoMode && (
            <div className="mt-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/[0.06] text-xs text-yellow-300">
              ⚠️ Gerçek mod için Supabase ve API bağlantıları gereklidir. .env.local dosyasını yapılandırın.
            </div>
          )}
        </div>

        {/* Restoran listesi */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-white/40" />
            <div className="text-sm font-semibold text-white">Aktif Restoranlar</div>
            <span className="ml-auto text-xs text-white/30">{RESTAURANTS.length} restoran</span>
          </div>
          <div className="space-y-2">
            {RESTAURANTS.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="text-sm text-white/70">{r.name}</span>
                  <span className="text-xs text-white/30 ml-2">{r.district}</span>
                </div>
                <span className="text-xs text-white/20">{r.brand}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <button onClick={save}
          className={cn('flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all',
            saved ? 'bg-emerald-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white')}>
          <Save className="w-4 h-4" />
          {saved ? '✓ Kaydedildi' : 'Ayarları Kaydet'}
        </button>
      </div>
    </div>
  )
}
