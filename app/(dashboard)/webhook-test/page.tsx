'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchWebhookEvents, insertWebhookEvent } from '@/lib/supabase-client'
import { Send, Terminal, CheckCircle2, XCircle, Clock } from 'lucide-react'

const SAMPLES = {
  order_created: { event: 'order.created', restaurant_id: 'r1', order_id: 'ORD-001', total: 285, channel: 'DELIVERY' },
  pulse_alert: { event: 'pulse.alert', restaurant_id: 'r6', score: 91, risk_level: 'KRITIK', top_signal: 'Tüm istasyonlar kritik' },
  anomaly: { event: 'anomaly.detected', restaurant_id: 'r9', type: 'POS_CRASH', severity: 'CRITICAL', deviation: '-%100' },
}

export default function WebhookTestPage() {
  const [payload, setPayload] = useState(JSON.stringify(SAMPLES.order_created, null, 2))
  const [url, setUrl] = useState('https://hook.eu2.make.com/example')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; status: number; body: string } | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [eventsLoaded, setEventsLoaded] = useState(false)

  const send = async () => {
    setLoading(true); setResult(null)
    let parsed: any
    try { parsed = JSON.parse(payload) } catch { setResult({ ok: false, status: 0, body: 'Geçersiz JSON' }); setLoading(false); return }
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) })
      const body = await res.text().catch(() => '')
      setResult({ ok: res.ok, status: res.status, body: body.slice(0, 500) })
      await insertWebhookEvent({ event_type: parsed.event ?? 'test', payload: parsed, status: res.ok ? 'SUCCESS' : 'ERROR' })
    } catch (e: any) {
      setResult({ ok: false, status: 0, body: e.message })
      await insertWebhookEvent({ event_type: parsed?.event ?? 'test', payload: parsed, status: 'ERROR' })
    } finally { setLoading(false) }
  }

  const loadEvents = async () => {
    const data = await fetchWebhookEvents(20)
    setEvents(data); setEventsLoaded(true)
  }

  return (
    <div className="dm">
      <Topbar title="Webhook Test Konsolu" subtitle="Canlı API endpoint testi"/>
      <div className="scroll" style={{ padding: 'clamp(14px,3vw,24px) clamp(14px,3vw,24px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Örnekler */}
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--tx3)', alignSelf: 'center' }}>Örnek:</span>
          {Object.entries(SAMPLES).map(([key, val]) => (
            <button key={key} onClick={() => setPayload(JSON.stringify(val, null, 2))} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>
              {key.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 , overflowX: "auto"}}>
          {/* Sol — editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card">
              <div className="card-h"><span className="card-title">Endpoint URL</span></div>
              <div style={{ padding: '14px 18px' }}>
                <input className="inp" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hook.eu2.make.com/..."/>
              </div>
            </div>

            <div className="card" style={{ flex: 1 }}>
              <div className="card-h">
                <span className="card-title">JSON Payload</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Terminal size={13} style={{ color: 'var(--tx3)' }}/>
                  <span className="card-meta">{payload.split('\n').length} satır</span>
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <textarea
                  value={payload}
                  onChange={e => setPayload(e.target.value)}
                  rows={14}
                  className="inp"
                  style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, lineHeight: 1.6, resize: 'vertical' }}
                />
              </div>
            </div>

            <button onClick={send} disabled={loading} className="btn" style={{ justifyContent: 'center' }}>
              {loading ? '…Gönderiliyor' : <><Send size={14}/> Webhook Gönder</>}
            </button>
          </div>

          {/* Sağ — sonuç */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result && (
              <div className="card" style={{ borderLeft: `3px solid ${result.ok ? 'var(--green)' : 'var(--red)'}` }}>
                <div className="card-h">
                  {result.ok
                    ? <><CheckCircle2 size={14} style={{ color: 'var(--green)' }}/><span className="card-title" style={{ color: 'var(--green)' }}>Başarılı</span></>
                    : <><XCircle size={14} style={{ color: 'var(--red)' }}/><span className="card-title" style={{ color: 'var(--red)' }}>Hata</span></>
                  }
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: result.ok ? 'var(--green)' : 'var(--red)' }}>HTTP {result.status}</span>
                </div>
                {result.body && (
                  <div style={{ padding: '12px 18px' }}>
                    <pre style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx2)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{result.body}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="card">
              <div className="card-h">
                <span className="card-title">Geçmiş</span>
                {!eventsLoaded && <button onClick={loadEvents} className="btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }}>Yükle</button>}
              </div>
              {eventsLoaded ? (
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {events.map(ev => (
                    <div key={ev.id} className="row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.event_type}</p>
                        <p style={{ fontSize: 10.5, color: 'var(--tx3)', marginTop: 1 }}>{new Date(ev.created_at).toLocaleString('tr-TR')}</p>
                      </div>
                      <span className={`badge badge-${ev.status === 'SUCCESS' ? 'green' : 'red'}`} style={{ fontSize: 10, flexShrink: 0 }}>{ev.status}</span>
                    </div>
                  ))}
                  {events.length === 0 && <p style={{ padding: 20, textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>Henüz kayıt yok</p>}
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <Clock size={24} style={{ color: 'var(--tx3)', margin: '0 auto 8px', display: 'block', opacity: .4 }}/>
                  <p style={{ fontSize: 12, color: 'var(--tx3)' }}>Geçmiş olayları yükle</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
