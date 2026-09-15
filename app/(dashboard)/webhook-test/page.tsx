'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchWebhookEvents, insertWebhookEvent } from '@/lib/supabase-client'
import { Send, Terminal, CheckCircle2, XCircle, Clock, RefreshCw, Copy, ChevronDown } from 'lucide-react'

const SAMPLES: Record<string, object> = {
  'Sipariş Oluştu': {
    event: 'order.created',
    timestamp: new Date().toISOString(),
    restaurant_id: 'r1',
    order_id: 'ORD-' + Math.random().toString(36).slice(2,7).toUpperCase(),
    total: 285,
    channel: 'DELIVERY',
    items: [{ name: 'Whopper', qty: 2, price: 189 }],
  },
  'Kritik Nabız': {
    event: 'pulse.alert',
    timestamp: new Date().toISOString(),
    restaurant_id: 'r6',
    restaurant_name: 'Popeyes Taksim',
    score: 91,
    risk_level: 'KRITIK',
    top_signal: 'Tüm istasyonlar kritik',
    open_orders: 38,
  },
  'Anomali Tespit': {
    event: 'anomaly.detected',
    timestamp: new Date().toISOString(),
    restaurant_id: 'r9',
    type: 'POS_CRASH',
    severity: 'CRITICAL',
    description: 'Sipariş akışı durdu',
    deviation: '-%100',
  },
  'Şikayet': {
    event: 'complaint.received',
    timestamp: new Date().toISOString(),
    restaurant_id: 'r2',
    reason: 'LATE_DELIVERY',
    lost_revenue: 185,
  },
}

export default function WebhookTestPage() {
  const [url, setUrl] = useState('https://hook.eu2.make.com/your-hook-id')
  const [payload, setPayload] = useState(JSON.stringify(Object.values(SAMPLES)[0], null, 2))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok:boolean; status:number; statusText:string; latency:number; body:string } | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [copied, setCopied] = useState(false)
  const [jsonError, setJsonError] = useState('')

  const validateJson = (s: string) => {
    try { JSON.parse(s); setJsonError(''); return true }
    catch (e: any) { setJsonError(e.message); return false }
  }

  const send = async () => {
    if (!validateJson(payload)) return
    if (!url.trim()) { setResult({ ok:false, status:0, statusText:'URL boş bırakılamaz', latency:0, body:'' }); return }
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, payload: JSON.parse(payload) }),
      })
      const data = await res.json()
      setResult(data)
      // Supabase'e kaydet
      await insertWebhookEvent({
        event_type: JSON.parse(payload)?.event ?? 'test',
        payload: JSON.parse(payload),
        status: data.ok ? 'SUCCESS' : 'ERROR',
      })
    } catch (e: any) {
      setResult({ ok:false, status:0, statusText:e.message, latency:0, body:e.message })
    } finally { setLoading(false) }
  }

  const loadEvents = async () => {
    setLoadingEvents(true)
    const data = await fetchWebhookEvents(25)
    setEvents(data); setEventsLoaded(true); setLoadingEvents(false)
  }

  const copyPayload = () => {
    navigator.clipboard.writeText(payload)
    setCopied(true); setTimeout(()=>setCopied(false), 1500)
  }

  return (
    <div className="dm">
      <Topbar title="Webhook Test Konsolu" subtitle="Canlı endpoint testi · Sunucu üzerinden proxy"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Örnek seçici */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:'var(--tx3)', flexShrink:0 }}>Örnek yükle:</span>
          {Object.keys(SAMPLES).map(key => (
            <button key={key} onClick={()=>{ setPayload(JSON.stringify(SAMPLES[key],null,2)); setJsonError(''); setResult(null) }}
              className="btn-ghost" style={{ padding:'5px 12px', fontSize:11.5 }}>
              {key}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap:14 }}>

          {/* Sol — form */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* URL */}
            <div className="card">
              <div className="card-h"><span className="card-title">Hedef URL</span></div>
              <div style={{ padding:'14px 18px' }}>
                <input className="inp" value={url} onChange={e=>setUrl(e.target.value)}
                  placeholder="https://hook.eu2.make.com/..." style={{ fontSize:13 }}/>
                <p style={{ fontSize:11, color:'var(--tx3)', marginTop:6 }}>
                  Make, Zapier, n8n veya özel endpoint — tüm POST destekleyen URL'ler çalışır
                </p>
              </div>
            </div>

            {/* Payload */}
            <div className="card" style={{ flex:1 }}>
              <div className="card-h">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Terminal size={13} style={{ color:'var(--tx3)' }}/>
                  <span className="card-title">JSON Payload</span>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <span style={{ fontSize:11, color:jsonError?'var(--red)':'var(--green)' }}>
                    {jsonError ? '✗ Geçersiz JSON' : '✓ Geçerli'}
                  </span>
                  <button onClick={copyPayload} className="btn-ghost" style={{ padding:'3px 8px', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                    <Copy size={10}/> {copied?'Kopyalandı!':'Kopyala'}
                  </button>
                </div>
              </div>
              <div style={{ padding:'12px 18px' }}>
                <textarea value={payload}
                  onChange={e=>{ setPayload(e.target.value); validateJson(e.target.value) }}
                  rows={14}
                  className="inp"
                  style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, lineHeight:1.6, resize:'vertical', minHeight:280, borderColor:jsonError?'rgba(242,87,87,.4)':undefined }}/>
                {jsonError && <p style={{ fontSize:11, color:'var(--red)', marginTop:5 }}>{jsonError}</p>}
              </div>
            </div>

            {/* Gönder */}
            <button onClick={send} disabled={loading || !!jsonError}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:12, background:'var(--ac)', color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor:loading||!!jsonError?'not-allowed':'pointer', opacity:loading||!!jsonError?.6:1, boxShadow:'0 4px 14px rgba(124,106,247,.3)', transition:'opacity .15s' }}>
              {loading
                ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Gönderiliyor…</>
                : <><Send size={14}/> Webhook Gönder</>
              }
            </button>
          </div>

          {/* Sağ — sonuç + geçmiş */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Sonuç */}
            {result ? (
              <div className="card" style={{ borderLeft:`3px solid ${result.ok?'var(--green)':'var(--red)'}` }}>
                <div className="card-h">
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {result.ok
                      ? <CheckCircle2 size={15} style={{ color:'var(--green)' }}/>
                      : <XCircle size={15} style={{ color:'var(--red)' }}/>
                    }
                    <span className="card-title" style={{ color:result.ok?'var(--green)':'var(--red)' }}>
                      {result.ok ? 'Başarılı' : 'Hata'}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', fontWeight:700, color:result.ok?'var(--green)':'var(--red)', background:result.ok?'var(--green2)':'var(--red2)', border:`1px solid ${result.ok?'var(--green-ln)':'var(--red-ln)'}`, padding:'2px 9px', borderRadius:6 }}>
                      HTTP {result.status || '—'}
                    </span>
                    {result.latency > 0 && (
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>
                        {result.latency}ms
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ padding:'14px 18px' }}>
                  <p style={{ fontSize:10, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Yanıt</p>
                  <pre style={{ fontSize:11.5, fontFamily:'JetBrains Mono,monospace', color:'var(--tx2)', whiteSpace:'pre-wrap', wordBreak:'break-all', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:8, padding:'12px', maxHeight:180, overflowY:'auto' }}>
                    {result.body || result.statusText || '(boş yanıt)'}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:180, background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14, gap:10 }}>
                <Send size={28} style={{ color:'var(--tx3)', opacity:.3 }}/>
                <p style={{ fontSize:13, color:'var(--tx3)' }}>Webhook göndermek için butona bas</p>
              </div>
            )}

            {/* Geçmiş */}
            <div className="card">
              <div className="card-h">
                <span className="card-title">Gönderim Geçmişi</span>
                <button onClick={loadEvents} disabled={loadingEvents} className="btn-ghost" style={{ padding:'4px 10px', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                  <RefreshCw size={10} style={{ animation:loadingEvents?'spin .7s linear infinite':undefined }}/> {eventsLoaded?'Yenile':'Yükle'}
                </button>
              </div>
              {eventsLoaded ? (
                <div style={{ maxHeight:320, overflowY:'auto' }}>
                  {events.length === 0 ? (
                    <p style={{ padding:'24px', textAlign:'center', color:'var(--tx3)', fontSize:12 }}>Henüz kayıt yok</p>
                  ) : events.map(ev => (
                    <div key={ev.id} className="row" style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:ev.status==='SUCCESS'?'var(--green)':'var(--red)', flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12.5, fontWeight:500, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {ev.event_type}
                        </p>
                        <p style={{ fontSize:10, color:'var(--tx3)', marginTop:1 }}>
                          {new Date(ev.created_at).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        </p>
                      </div>
                      <span className={`badge badge-${ev.status==='SUCCESS'?'green':'red'}`} style={{ fontSize:10, flexShrink:0 }}>
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding:'28px', textAlign:'center' }}>
                  <Clock size={22} style={{ color:'var(--tx3)', margin:'0 auto 8px', display:'block', opacity:.4 }}/>
                  <p style={{ fontSize:12, color:'var(--tx3)' }}>Supabase geçmişini görüntüle</p>
                </div>
              )}
            </div>

            {/* Kullanım kılavuzu */}
            <div className="card">
              <div className="card-h"><span className="card-title">Nasıl Kullanılır?</span></div>
              <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { step:'1', text:'Hedef URL\'yi girin (Make, Zapier, n8n vb.)' },
                  { step:'2', text:'Örnek bir payload seçin veya kendi JSON\'unuzu yazın' },
                  { step:'3', text:'"Webhook Gönder" butonuna basın — sunucu üzerinden iletilir' },
                  { step:'4', text:'HTTP durum kodu ve yanıt burada görüntülenir' },
                ].map(({ step, text }) => (
                  <div key={step} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--ac2)', border:'1px solid rgba(124,106,247,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--ac)', flexShrink:0 }}>{step}</div>
                    <p style={{ fontSize:12, color:'var(--tx2)', lineHeight:1.5 }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
