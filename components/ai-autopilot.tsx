'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Mic, MicOff, Pause, Play, Volume2, VolumeX, AlertCircle, CheckCircle2, X, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { getOpenAIKey } from '@/lib/config-store'

interface Decision {
  restaurant_id: string
  trigger: string
  action: string
  severity: string
  voice_message: string
  auto_applied: boolean
  expected_impact: string
  saved?: boolean
}

interface WatchResult {
  status: string
  violations: number
  decisions: Decision[]
  summary?: string
  timestamp: string
}

interface Props {
  interval?: number // saniye, default 30
}

export function AIAutopilot({ interval = 30 }: Props) {
  const [running, setRunning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [listening, setListening] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [lastResult, setLastResult] = useState<WatchResult | null>(null)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [status, setStatus] = useState<'idle' | 'scanning' | 'deciding' | 'speaking' | 'listening' | 'error'>('idle')
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null)
  const [countdown, setCountdown] = useState(interval)
  const [logs, setLogs] = useState<string[]>([])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const recognRef = useRef<any>(null)

  const addLog = (msg: string) => setLogs(prev => [`${new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} ${msg}`, ...prev.slice(0, 29)])

  // Text-to-speech
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (muted || typeof window === 'undefined' || !window.speechSynthesis) { onEnd?.(); return }
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'tr-TR'
    utt.rate = 1.1
    utt.pitch = 1
    // Türkçe ses tercih et
    const voices = window.speechSynthesis.getVoices()
    const trVoice = voices.find(v => v.lang.startsWith('tr')) ?? voices[0]
    if (trVoice) utt.voice = trVoice
    utt.onend = () => onEnd?.()
    synthRef.current = utt
    setStatus('speaking')
    window.speechSynthesis.speak(utt)
  }, [muted])

  // Speech recognition
  const startListening = useCallback((onResult: (text: string) => void, timeout = 5000) => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { onResult('evet'); return } // Tarayıcı desteklemiyorsa otomatik onayla

    const recog = new SR()
    recog.lang = 'tr-TR'
    recog.continuous = false
    recog.interimResults = false
    recognRef.current = recog
    setListening(true)
    setStatus('listening')

    const t = setTimeout(() => { recog.stop(); onResult('evet') }, timeout) // 5sn sonra otomatik onayla

    recog.onresult = (e: any) => {
      clearTimeout(t)
      const transcript = e.results[0][0].transcript.toLowerCase()
      onResult(transcript)
    }
    recog.onerror = () => { clearTimeout(t); onResult('evet') }
    recog.onend = () => setListening(false)
    recog.start()
  }, [])

  // Ana tarama fonksiyonu
  const scan = useCallback(async () => {
    if (status === 'speaking' || status === 'listening') return
    const apiKey = getOpenAIKey()
    if (!apiKey) { addLog('❌ OpenAI key yok — Ayarlar > API Anahtarları'); return }

    setStatus('scanning')
    addLog('🔍 Supabase taranıyor…')

    try {
      const res = await fetch('/api/ai-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, auto_apply: false }), // önce sor
      })
      const data: WatchResult = await res.json()
      setLastResult(data)

      if (data.status === 'OK' || !data.decisions?.length) {
        addLog('✅ Tüm sistemler normal')
        setStatus('idle')
        return
      }

      setStatus('deciding')
      addLog(`⚡ ${data.violations} ihlal — ${data.decisions.length} karar alındı`)

      // Kararları sırayla sesli sor
      const processList = [...data.decisions]

      const processNext = () => {
        if (!processList.length) {
          setStatus('idle')
          setPendingDecision(null)
          setDecisions(prev => [...data.decisions, ...prev].slice(0, 50))
          speak(`Özet: ${data.summary ?? 'Analiz tamamlandı.'}`)
          return
        }

        const decision = processList.shift()!
        setPendingDecision(decision)

        speak(decision.voice_message, () => {
          // Sesli onay bekle
          startListening((answer) => {
            const approved = answer.includes('evet') || answer.includes('tamam') || answer.includes('onayla') || answer.includes('yap')
            const rejected = answer.includes('hayır') || answer.includes('iptal') || answer.includes('dur') || answer.includes('bekle')

            if (approved || (!rejected)) {
              // Onayla — uygula
              fetch('/api/ai-watch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: apiKey, auto_apply: true }),
              }).catch(() => {})
              addLog(`✅ ONAYLANDI: ${decision.restaurant_id} — ${decision.action}`)
              speak(`Tamam. ${decision.action}. Uygulandı.`, processNext)
            } else {
              addLog(`🚫 REDDEDİLDİ: ${decision.restaurant_id} — ${decision.action}`)
              speak('Anlaşıldı, iptal edildi.', processNext)
            }
          }, 5000)
        })
      }

      processNext()
    } catch (e) {
      addLog(`❌ Hata: ${String(e).slice(0, 80)}`)
      setStatus('error')
    }
  }, [status, speak, startListening])

  // Otomatik döngü
  useEffect(() => {
    if (!running) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
      setCountdown(interval)
      return
    }

    scan() // İlk hemen çalıştır
    timerRef.current = setInterval(scan, interval * 1000)

    setCountdown(interval)
    countRef.current = setInterval(() => {
      setCountdown(p => p <= 1 ? interval : p - 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [running, interval])

  const toggle = () => {
    if (running) {
      setRunning(false)
      window.speechSynthesis?.cancel()
      recognRef.current?.stop()
      setStatus('idle')
      setPendingDecision(null)
      addLog('⏹ Otopilot durduruldu')
    } else {
      setRunning(true)
      addLog('🚀 Otopilot başlatıldı')
    }
  }

  const statusColor = { idle:'var(--tx3)', scanning:'var(--ac)', deciding:'var(--amber)', speaking:'var(--green)', listening:'var(--green)', error:'var(--red)' }[status]
  const statusLabel = { idle:'Bekliyor', scanning:'Taranıyor…', deciding:'Karar veriliyor…', speaking:'Konuşuyor', listening:'Dinliyor', error:'Hata' }[status]

  return (
    <div style={{ background:'var(--s1)', border:`1px solid ${running?'rgba(124,106,247,.3)':'var(--bdr)'}`, borderRadius:14,
      boxShadow:running?'0 0 24px rgba(124,106,247,.1)':'none', overflow:'hidden', transition:'box-shadow .3s' }}>

      {/* Header */}
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12,
        background:running?'linear-gradient(135deg,rgba(124,106,247,.06),transparent)':'transparent',
        borderBottom: expanded ? '1px solid var(--bdr)' : 'none' }}>

        {/* Icon */}
        <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
          background:running?'linear-gradient(135deg,var(--ac),#5b4de0)':'var(--s2)',
          border:`1px solid ${running?'transparent':'var(--bdr)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:running?'0 0 16px rgba(124,106,247,.5)':'none' }}>
          <Brain size={15} color={running?'#fff':undefined} style={{ color:running?undefined:'var(--tx3)' }}/>
        </div>

        <div style={{ flex:1 }}>
          <p style={{ fontSize:13.5, fontWeight:700, color:'var(--tx)', letterSpacing:'-.2px' }}>AI Otopilot</p>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:statusColor,
              boxShadow:running?`0 0 6px ${statusColor}`:'none',
              animation:status==='scanning'||status==='deciding'?'pulse 1.2s ease-in-out infinite':'none' }}/>
            <span style={{ fontSize:11, color:statusColor }}>{statusLabel}</span>
            {running && status==='idle' && (
              <span style={{ fontSize:10, color:'var(--tx3)', fontFamily:'JetBrains Mono,monospace' }}>→ {countdown}sn</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={() => setMuted(m=>!m)} title={muted?'Sesi aç':'Sessiz'}
            style={{ width:28, height:28, borderRadius:7, background:'var(--s2)', border:'1px solid var(--bdr)',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--tx3)' }}>
            {muted ? <VolumeX size={12}/> : <Volume2 size={12}/>}
          </button>
          <button onClick={toggle}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:9,
              background:running?'var(--red2)':'var(--ac)',
              border:`1px solid ${running?'var(--red-ln)':'transparent'}`,
              color:running?'var(--red)':'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
              boxShadow:running?'none':'0 4px 14px rgba(124,106,247,.35)' }}>
            {running ? <><Pause size={11}/> Durdur</> : <><Play size={11}/> Başlat</>}
          </button>
          <button onClick={()=>setExpanded(p=>!p)}
            style={{ width:28, height:28, borderRadius:7, background:'var(--s2)', border:'1px solid var(--bdr)',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--tx3)' }}>
            {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Pending decision — sesli onay */}
          {pendingDecision && (
            <div style={{ padding:'14px 18px', background:'rgba(247,144,9,.06)', borderBottom:'1px solid rgba(247,144,9,.2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--amber)', animation:'pulse 1s ease-in-out infinite' }}/>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--amber)' }}>Onay Bekleniyor</span>
                <span style={{ fontSize:11, color:'var(--tx3)' }}>— Söyleyin: "Evet" veya "Hayır" (5sn)</span>
                {listening && <Mic size={12} style={{ color:'var(--green)', animation:'pulse 1s ease-in-out infinite' }}/>}
              </div>
              <p style={{ fontSize:13, color:'var(--tx)', lineHeight:1.5, marginBottom:10 }}>{pendingDecision.voice_message}</p>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{ recognRef.current?.stop(); addLog(`✅ Manuel: ONAYLANDI — ${pendingDecision.action}`) }}
                  className="btn" style={{ padding:'6px 14px', fontSize:12, boxShadow:'none' }}>
                  <CheckCircle2 size={11}/> Onayla
                </button>
                <button onClick={()=>{ recognRef.current?.stop(); setPendingDecision(null); addLog(`🚫 Manuel: REDDEDİLDİ`) }}
                  className="btn-ghost" style={{ padding:'6px 14px', fontSize:12, color:'var(--red)' }}>
                  <X size={11}/> Reddet
                </button>
              </div>
            </div>
          )}

          {/* İstatistikler */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, borderBottom:'1px solid var(--bdr)' }}>
            {[
              { label:'Tarama aralığı', value:`${interval}sn` },
              { label:'Alınan karar', value:String(decisions.length) },
              { label:'Son tarama', value:lastResult ? new Date(lastResult.timestamp).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}) : '—' },
            ].map(({ label, value }, i) => (
              <div key={label} style={{ padding:'10px 18px', borderRight:i<2?'1px solid var(--bdr)':'none', textAlign:'center' }}>
                <p style={{ fontSize:15, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{value}</p>
                <p style={{ fontSize:10, color:'var(--tx3)', marginTop:2 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Son kararlar */}
          {decisions.length > 0 && (
            <div style={{ borderBottom:'1px solid var(--bdr)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', padding:'10px 18px 6px' }}>Son Kararlar</p>
              <div style={{ maxHeight:160, overflowY:'auto' }}>
                {decisions.slice(0,5).map((d,i) => (
                  <div key={i} className="row" style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                      background:d.severity==='CRITICAL'||d.severity==='HIGH'?'var(--red)':d.severity==='MEDIUM'?'var(--amber)':'var(--green)' }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.action}</p>
                      <p style={{ fontSize:10.5, color:'var(--tx3)', marginTop:1 }}>{d.restaurant_id} · {d.trigger}</p>
                    </div>
                    <span className={`badge badge-${d.auto_applied?'green':'muted'}`} style={{ fontSize:9, flexShrink:0 }}>
                      {d.auto_applied?'Uygulandı':'Bekleniyor'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log */}
          <div style={{ padding:'10px 18px' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>Sistem Logu</p>
            <div style={{ maxHeight:120, overflowY:'auto', fontFamily:'JetBrains Mono,monospace' }}>
              {logs.length === 0
                ? <p style={{ fontSize:11, color:'var(--tx3)' }}>Henüz log yok. Otopilotu başlat.</p>
                : logs.map((l,i) => (
                  <p key={i} style={{ fontSize:11, color: l.includes('❌')?'var(--red)':l.includes('✅')?'var(--green)':l.includes('⚡')?'var(--amber)':'var(--tx3)', marginBottom:2, lineHeight:1.4 }}>{l}</p>
                ))
              }
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
