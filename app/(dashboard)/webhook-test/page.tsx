'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { cn } from '@/lib/utils'
import { Send, CheckCircle, XCircle, Loader2, Copy } from 'lucide-react'

const EXAMPLE_PAYLOADS: Record<string, object> = {
  snapshot: { restaurant_id: 'r1', open_orders: 28, orders_last_5m: 9, orders_last_15m: 22, avg_preparation_time: 11.2, avg_packing_time: 4.8, avg_courier_wait: 8.1, grill_load: 88, fryer_load: 72, packing_load: 94, courier_load: 81, active_staff: 6, delay_rate: 0.18, cancellation_rate: 0.07, rain_intensity: 7, campaign_active: true },
  order_event: { order_id: 'TG-A1B2C3', restaurant_id: 'r1', event_type: 'PREPARATION_STARTED', timestamp: new Date().toISOString() },
  whatsapp: { restaurant_name: 'BK Kadıköy', restaurant_id: 'r1', pulse_score: 84, risk_level: 'KRITIK', top_signal: 'Packing istasyonu %94 yükle çalışıyor' },
  simulate: { current: { restaurant_id: 'r1', open_orders: 28, orders_last_5m: 9, orders_last_15m: 22, avg_preparation_time: 11.2, avg_packing_time: 4.8, avg_courier_wait: 8.1, grill_load: 88, fryer_load: 72, packing_load: 94, courier_load: 81, active_staff: 6, restaurant_capacity: 80, rain_intensity: 7, campaign_active: true, special_event: false, delay_rate: 0.18, cancellation_rate: 0.07 }, changes: { extra_packing_staff: 1 } },
  generate: { restaurant_id: 'r1', open_orders: 28, orders_last_5m: 9, orders_last_15m: 22, avg_preparation_time: 11.2, avg_packing_time: 4.8, avg_courier_wait: 8.1, grill_load: 88, fryer_load: 72, packing_load: 94, courier_load: 81, active_staff: 6 },
}

const ENDPOINTS = [
  { id: 'snapshot',    method: 'POST', path: '/api/webhook/snapshot',        label: 'Snapshot Webhook'    },
  { id: 'order_event', method: 'POST', path: '/api/webhook/order-event',      label: 'Order Event'         },
  { id: 'whatsapp',    method: 'POST', path: '/api/webhook/whatsapp-alert',   label: 'WhatsApp Alert'      },
  { id: 'simulate',    method: 'POST', path: '/api/simulate',                 label: 'What-If Simülatör'  },
  { id: 'generate',    method: 'POST', path: '/api/recommendations/generate', label: 'AI Reçete Üret'     },
  { id: 'pulse_all',   method: 'GET',  path: '/api/pulse/all',                label: 'Tüm Nabız Skorları' },
]

export default function WebhookTestPage() {
  const [sel, setSel] = useState(ENDPOINTS[0])
  const [payload, setPayload] = useState(JSON.stringify(EXAMPLE_PAYLOADS.snapshot, null, 2))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; status: number; data: unknown; ms: number } | null>(null)

  const select = (ep: typeof ENDPOINTS[0]) => {
    setSel(ep); setResult(null)
    if (ep.method === 'POST' && EXAMPLE_PAYLOADS[ep.id]) setPayload(JSON.stringify(EXAMPLE_PAYLOADS[ep.id], null, 2))
  }

  const send = async () => {
    setLoading(true); setResult(null)
    const t0 = Date.now()
    try {
      const opts: RequestInit = { method: sel.method, headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'demo', 'x-api-key': 'demo' } }
      if (sel.method === 'POST') opts.body = payload
      const res = await fetch(sel.path, opts)
      const data = await res.json()
      setResult({ ok: res.ok, status: res.status, data, ms: Date.now() - t0 })
    } catch (e) { setResult({ ok: false, status: 0, data: { error: String(e) }, ms: Date.now() - t0 })
    } finally { setLoading(false) }
  }

  return (
    <div>
      <Topbar title="Webhook Test Konsolu" subtitle="API endpoint'lerini canlı test et" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-4 space-y-2">
            <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 mb-3">Endpoint Seç</div>
            {ENDPOINTS.map(ep => (
              <button key={ep.id} onClick={() => select(ep)}
                className={cn('w-full text-left rounded-xl border px-4 py-3 transition-all', sel.id === ep.id ? 'border-orange-500/30 bg-orange-500/[0.08]' : 'border-white/[0.07] hover:border-white/[0.12]')}
                style={{ background: sel.id === ep.id ? undefined : 'var(--bg-surface)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', ep.method === 'POST' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300')}>{ep.method}</span>
                  <span className={cn('text-xs font-medium', sel.id === ep.id ? 'text-orange-300' : 'text-white/60')}>{ep.label}</span>
                </div>
                <code className="text-[10px] text-white/25">{ep.path}</code>
              </button>
            ))}
          </div>
          <div className="col-span-8 space-y-4">
            {sel.method === 'POST' && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span className="text-xs text-white/40 uppercase tracking-widest">Request Body (JSON)</span>
                </div>
                <textarea value={payload} onChange={e => setPayload(e.target.value)} rows={12}
                  className="w-full px-5 py-4 text-xs font-mono text-white/70 outline-none resize-none"
                  style={{ background: 'transparent', lineHeight: '1.6' }} />
              </div>
            )}
            <button onClick={send} disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 16px rgba(249,115,22,0.2)', opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Gönderiliyor...' : `${sel.method} ${sel.path}`}
            </button>
            {result && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    {result.ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className={cn('text-sm font-bold', result.ok ? 'text-emerald-400' : 'text-red-400')}>HTTP {result.status}</span>
                    <span className="text-xs text-white/30">{result.ms}ms</span>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify(result.data, null, 2))}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Kopyala
                  </button>
                </div>
                <pre className="px-5 py-4 text-xs font-mono text-white/60 overflow-auto max-h-80 leading-relaxed">{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
