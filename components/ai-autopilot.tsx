'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Pause, Play, Volume2, VolumeX, CheckCircle2, X, ChevronDown, ChevronUp, Mic } from 'lucide-react'
import { getOpenAIKey } from '@/lib/config-store'
import Link from 'next/link'

interface Decision {
  restaurant_id: string
  action_type: string
  action: string
  severity: string
  voice_message: string
  expected_impact: string
}

interface Log { time: string; msg: string; type: 'info'|'ok'|'warn'|'err'|'ai' }

export function AIAutopilot({ interval = 30, onRefresh }: { interval?: number; onRefresh?: () => void }) {
  const [running, setRunning]     = useState(false)
  const [autoMode, setAutoMode]   = useState(true)   // true = tam otomatik
  const [muted, setMuted]         = useState(false)
  const [expanded, setExpanded]   = useState(true)
  const [status, setStatus]       = useState<'idle'|'scanning'|'applying'|'speaking'|'listening'|'error'>('idle')
  const [countdown, setCountdown] = useState(interval)
  const [logs, setLogs]           = useState<Log[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [pendingDecision, setPendingDecision] = useState<Decision|null>(null)
  const [stats, setStats]         = useState({ scans:0, applied:0, violations:0 })
  const [hasKey, setHasKey]       = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  const timerRef    = useRef<ReturnType<typeof setInterval>|null>(null)
  const countRef    = useRef<ReturnType<typeof setInterval>|null>(null)
  const speakQ      = useRef<{text:string; onEnd?:()=>void}[]>([])
  const isSpeaking  = useRef(false)
  const recognRef   = useRef<any>(null)
  const pendingQ    = useRef<Decision[]>([])
  const apiKeyRef   = useRef('')

  const log = useCallback((msg: string, type: Log['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setLogs(prev => [{ time, msg, type }, ...prev.slice(0,49)])
  }, [])

  // ── TTS ──────────────────────────────────────────────────────────
  const doSpeak = useCallback(() => {
    if (isSpeaking.current || speakQ.current.length === 0) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const { text, onEnd } = speakQ.current.shift()!
    isSpeaking.current = true
    setStatus('speaking')
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'tr-TR'; utt.rate = 1.05; utt.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const v = voices.find(v=>v.lang==='tr-TR')
      ?? voices.find(v=>v.lang.startsWith('tr'))
      ?? voices.find(v=>v.lang.startsWith('en'))
      ?? voices[0]
    if (v) utt.voice = v
    utt.onend  = () => { isSpeaking.current = false; onEnd?.(); doSpeak() }
    utt.onerror = () => { isSpeaking.current = false; onEnd?.(); doSpeak() }
    window.speechSynthesis.speak(utt)
  }, [])

  const speak = useCallback((text: string, onEnd?: ()=>void) => {
    if (muted) { onEnd?.(); return }
    speakQ.current.push({ text, onEnd })
    if (!isSpeaking.current) {
      // Voices yüklü değilse bekle
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak() }
      } else { doSpeak() }
    }
  }, [muted, doSpeak])

  // ── STT (Speech Recognition) ─────────────────────────────────────
  const listen = useCallback((onResult: (text:string)=>void, timeoutMs=6000) => {
    setStatus('listening')
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setTimeout(()=>onResult('evet'), 500); return }
    const r = new SR()
    r.lang = 'tr-TR'; r.continuous = false; r.interimResults = false
    recognRef.current = r
    const t = setTimeout(() => { r.stop(); onResult('evet') }, timeoutMs)
    r.onresult = (e:any) => { clearTimeout(t); onResult(e.results[0][0].transcript.toLowerCase().trim()) }
    r.onerror  = () => { clearTimeout(t); onResult('evet') }
    r.onend    = () => { setStatus('idle') }
    r.start()
  }, [])

  // ── Audio unlock (ilk etkileşimde) ──────────────────────────────
  const unlockAudio = useCallback(() => {
    if (audioUnlocked || typeof window === 'undefined') return
    const utt = new SpeechSynthesisUtterance(' ')
    utt.volume = 0
    window.speechSynthesis.speak(utt)
    // Sesleri önceden yükle
    window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => {}
    setAudioUnlocked(true)
  }, [audioUnlocked])

  // ── Yarı otomatik — sesli onay akışı ────────────────────────────
  const processApprovalQueue = useCallback(() => {
    if (pendingQ.current.length === 0) {
      setPendingDecision(null); setStatus('idle'); onRefresh?.(); return
    }
    const decision = pendingQ.current.shift()!
    setPendingDecision(decision)

    speak(decision.voice_message, () => {
      listen((answer) => {
        const approved = /evet|tamam|onayla|yap|uygu/.test(answer)
        const rejected = /hayır|iptal|dur|bekle|reddet/.test(answer)

        if (approved || (!rejected)) {
          // Uygula
          fetch('/api/ai-watch', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ api_key: apiKeyRef.current, auto_apply: true }),
          }).then(r=>r.json()).then(d=>{
            if (d.pulse_updates?.length) {
              d.pulse_updates.forEach((u:any)=>log(`📉 ${u.restaurant_id}: ${u.old_score}→${u.new_score} (${u.new_risk})`, 'ok'))
            }
          }).catch(()=>{})
          log(`✅ ONAYLANDI: ${decision.restaurant_id} — ${decision.action}`, 'ok')
          speak(`Tamam. ${decision.action}. Uygulandı.`, processApprovalQueue)
        } else {
          log(`🚫 REDDEDİLDİ: ${decision.restaurant_id} — ${decision.action}`, 'warn')
          speak('Anlaşıldı, iptal edildi.', processApprovalQueue)
        }
      }, 6000)
    })
  }, [speak, listen, log, onRefresh])

  // ── Ana tarama ──────────────────────────────────────────────────
  const scan = useCallback(async () => {
    if (isSpeaking.current || status === 'listening') return
    const apiKey = getOpenAIKey()
    if (!apiKey) { log('❌ OpenAI key yok — Ayarlar sayfasından girin', 'err'); setRunning(false); return }
    apiKeyRef.current = apiKey

    setStatus('scanning')
    log('🔍 Supabase taranıyor…', 'info')
    setStats(s=>({...s, scans:s.scans+1}))

    try {
      const isAuto = autoMode  // closure'dan oku
      // Yarı otomatikte ilk taramada uygulama -- sadece karar al
      const res = await fetch('/api/ai-watch', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ api_key: apiKey, auto_apply: false }),
      })
      const data = await res.json()

      if (data.status === 'OK' || !data.decisions?.length) {
        log('✅ Tüm sistemler normal', 'ok')
        setStatus('idle'); return
      }

      const applied: Decision[] = data.decisions || []
      log(`⚡ ${data.violations} ihlal — ${applied.length} karar`, 'warn')
      setStats(s=>({...s, violations:s.violations+data.violations, applied:s.applied+applied.length}))

      if (isAuto) {
        // TAM OTOMATİK — uygula + sesli bildir
        setStatus('applying')
        // Tam otomatikte gerçekten uygula
        const applyRes = await fetch('/api/ai-watch', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ api_key: apiKey, auto_apply: true }),
        })
        const applyData = await applyRes.json()
        setDecisions(prev=>[...(applyData.decisions||applied), ...prev].slice(0,30))
        for (const d of (applyData.decisions||applied)) {
          log(`🤖 ${d.restaurant_id}: ${d.action}`, 'ai')
        }
        if (applyData.pulse_updates?.length) {
          applyData.pulse_updates.forEach((u:any)=>log(`📉 ${u.restaurant_id}: ${u.old_score}→${u.new_score} (${u.new_risk})`, 'ok'))
        }
        const msgs = (applyData.decisions||applied).map((d:any)=>d.voice_message).join(' Ayrıca, ')
        speak(msgs + ' Kararlar uygulandı.')
        onRefresh?.()
        setStatus('idle')
      } else {
        // YARI OTOMATİK — sesli onay iste
        setDecisions(prev=>[...applied, ...prev].slice(0,30))
        pendingQ.current = [...applied]
        processApprovalQueue()
      }
    } catch (e:any) {
      log(`❌ ${e.message}`, 'err'); setStatus('error')
    }
  }, [autoMode, speak, log, onRefresh, processApprovalQueue, status])

  // ── Döngü ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      if (timerRef.current)  clearInterval(timerRef.current)
      if (countRef.current)  clearInterval(countRef.current)
      return
    }
    const go = () => scan()
    go()
    timerRef.current = setInterval(go, interval*1000)
    setCountdown(interval)
    countRef.current = setInterval(()=>setCountdown(p=>p<=1?interval:p-1), 1000)
    return ()=>{
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [running, interval])

  // ── İlk yükleme ─────────────────────────────────────────────────
  useEffect(()=>{
    const key = getOpenAIKey()
    setHasKey(!!key)
    if (key) {
      // Ses unlock için kullanıcı etkileşimi bekliyoruz — başlat ama konuşma
      setRunning(true)
      log('🚀 AI Otopilot başlatıldı — ilk tarama 30sn içinde', 'ok')
    } else {
      log('⚠️ OpenAI key bulunamadı. Ayarlar > API Anahtarları', 'warn')
    }
  }, [])

  const toggle = () => {
    if (running) {
      setRunning(false)
      window.speechSynthesis?.cancel()
      recognRef.current?.stop()
      speakQ.current = []; pendingQ.current = []
      isSpeaking.current = false
      setStatus('idle'); setPendingDecision(null)
      log('⏹ Otopilot durduruldu', 'warn')
    } else {
      const key = getOpenAIKey()
      if (!key) { log('❌ OpenAI key yok', 'err'); return }
      unlockAudio()
      setRunning(true)
      log(`▶️ Otopilot başlatıldı — ${autoMode?'Tam Otomatik':'Yarı Otomatik'} mod`, 'ok')
      speak(`Mutfak Nabzı ${autoMode?'Tam Otomatik':'Yarı Otomatik'} modda devrede.`)
    }
  }

  const switchMode = () => {
    const next = !autoMode
    setAutoMode(next)
    log(`🔄 Mod değişti: ${next?'TAM OTOMATİK':'YARI OTOMATİK'}`, 'info')
    if (running) speak(next?'Tam otomatik moda geçildi. Onay gerekmeyecek.' : 'Yarı otomatik moda geçildi. Kararlar için onayınızı isteyeceğim.')
  }

  const approveManual  = () => { recognRef.current?.stop(); log('✅ Manuel onay', 'ok') }
  const rejectManual   = () => { recognRef.current?.stop(); pendingQ.current=[]; setPendingDecision(null); log('🚫 Manuel ret', 'warn') }

  const statusColor = { idle:'var(--tx3)', scanning:'var(--ac)', applying:'var(--amber)', speaking:'var(--green)', listening:'var(--green)', error:'var(--red)' }[status]
  const statusLabel = { idle:'Bekliyor', scanning:'Taranıyor…', applying:'Uygulanıyor…', speaking:'Konuşuyor', listening:'Dinliyor…', error:'Hata' }[status]
  const logColor    = { info:'var(--tx3)', ok:'var(--green)', warn:'var(--amber)', err:'var(--red)', ai:'var(--ac)' }

  return (
    <div style={{ background:'var(--s1)', border:`1px solid ${running?'rgba(124,106,247,.3)':'var(--bdr)'}`,
      borderRadius:14, overflow:'hidden', boxShadow:running?'0 0 24px rgba(124,106,247,.08)':'none', transition:'box-shadow .3s' }}>

      {/* ── Header ── */}
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12,
        background:running?'linear-gradient(135deg,rgba(124,106,247,.06),transparent)':'transparent',
        borderBottom:expanded?'1px solid var(--bdr)':'none' }}>

        <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
          background:running?'linear-gradient(135deg,var(--ac),#5b4de0)':'var(--s2)',
          border:`1px solid ${running?'transparent':'var(--bdr)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:running?'0 0 16px rgba(124,106,247,.5)':'none' }}>
          <Brain size={15} color={running?'#fff':undefined} style={{ color:running?undefined:'var(--tx3)' }}/>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <p style={{ fontSize:13.5, fontWeight:700, color:'var(--tx)', letterSpacing:'-.2px' }}>AI Otopilot</p>
            {/* Mod toggle */}
            <button onClick={switchMode}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, cursor:'pointer', border:'none',
                background: autoMode?'var(--green2)':'var(--amber2)',
                outline:`1px solid ${autoMode?'var(--green-ln)':'var(--amber-ln)'}` }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:autoMode?'var(--green)':'var(--amber)', animation:'pulse 1.5s ease-in-out infinite' }}/>
              <span style={{ fontSize:10, fontWeight:700, color:autoMode?'var(--green)':'var(--amber)' }}>
                {autoMode?'TAM OTOMATİK':'YARI OTOMATİK'}
              </span>
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:statusColor,
              animation:running&&status!=='idle'?'pulse 1.2s ease-in-out infinite':'none' }}/>
            <span style={{ fontSize:11, color:statusColor }}>{statusLabel}</span>
            {running && status==='idle' && <span style={{ fontSize:10, color:'var(--tx3)', fontFamily:'JetBrains Mono,monospace' }}>→ {countdown}sn</span>}
            {status==='listening' && <Mic size={11} style={{ color:'var(--green)', animation:'pulse 1s ease-in-out infinite' }}/>}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* Ses test */}
          <button onClick={()=>{ unlockAudio(); speak('Sistem aktif. Test başarılı.') }}
            title="Sesi test et (önce buna tıkla)"
            style={{ width:28, height:28, borderRadius:7, background:'var(--s2)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Volume2 size={12} style={{ color:'var(--tx3)' }}/>
          </button>
          {/* Sessiz */}
          <button onClick={()=>setMuted(m=>!m)}
            style={{ width:28, height:28, borderRadius:7, background:muted?'var(--red2)':'var(--s2)', border:`1px solid ${muted?'var(--red-ln)':'var(--bdr)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {muted?<VolumeX size={12} style={{ color:'var(--red)' }}/>:<Volume2 size={12} style={{ color:'var(--tx3)' }}/>}
          </button>
          {/* Başlat/Durdur */}
          <button onClick={toggle}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:9,
              background:running?'var(--red2)':'var(--ac)',
              border:`1px solid ${running?'var(--red-ln)':'transparent'}`,
              color:running?'var(--red)':'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
              boxShadow:running?'none':'0 4px 14px rgba(124,106,247,.35)' }}>
            {running?<><Pause size={11}/> Durdur</>:<><Play size={11}/> Başlat</>}
          </button>
          <button onClick={()=>setExpanded(p=>!p)}
            style={{ width:28, height:28, borderRadius:7, background:'var(--s2)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {expanded?<ChevronUp size={12} style={{ color:'var(--tx3)' }}/>:<ChevronDown size={12} style={{ color:'var(--tx3)' }}/>}
          </button>
        </div>
      </div>

      {expanded && <>

        {/* ── Key uyarısı ── */}
        {!hasKey && (
          <div style={{ padding:'10px 18px', background:'var(--amber2)', borderBottom:'1px solid var(--amber-ln)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:12, color:'var(--amber)' }}>⚠️ OpenAI API Key girilmemiş</p>
            <Link href="/settings" style={{ fontSize:11, color:'var(--amber)', textDecoration:'none', fontWeight:600, padding:'3px 10px', borderRadius:7, background:'rgba(240,168,67,.15)', border:'1px solid var(--amber-ln)' }}>Ayarlar →</Link>
          </div>
        )}

        {/* ── Ses unlock notu ── */}
        {!audioUnlocked && hasKey && (
          <div style={{ padding:'10px 18px', background:'var(--blue2)', borderBottom:'1px solid var(--blue-ln)', display:'flex', alignItems:'center', gap:10 }}>
            <Volume2 size={13} style={{ color:'var(--blue)', flexShrink:0 }}/>
            <p style={{ fontSize:12, color:'var(--tx2)' }}>Sesi aktif etmek için 🔊 butonuna bir kez tıkla</p>
            <button onClick={()=>{ unlockAudio(); speak('Ses aktif.') }}
              style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:7, background:'var(--blue)', border:'none', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
              🔊 Sesi Aç
            </button>
          </div>
        )}

        {/* ── Yarı otomatik — onay bekleniyor ── */}
        {!autoMode && pendingDecision && (
          <div style={{ padding:'14px 18px', background:'rgba(247,144,9,.06)', borderBottom:'1px solid rgba(247,144,9,.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--amber)', animation:'pulse 1s ease-in-out infinite' }}/>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--amber)' }}>
                {status==='listening'?'🎤 Dinleniyor — "Evet" veya "Hayır" deyin':'Onay Bekleniyor'}
              </span>
              {status==='listening' && <span style={{ fontSize:11, color:'var(--tx3)' }}>(6sn içinde yanıt gelmezse otomatik onaylanır)</span>}
            </div>
            <p style={{ fontSize:13, color:'var(--tx)', lineHeight:1.5, marginBottom:10 }}>{pendingDecision.voice_message}</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={approveManual} className="btn" style={{ padding:'6px 16px', fontSize:12, boxShadow:'none' }}>
                <CheckCircle2 size={12}/> Onayla
              </button>
              <button onClick={rejectManual} className="btn-ghost" style={{ padding:'6px 14px', fontSize:12, color:'var(--red)' }}>
                <X size={12}/> Reddet
              </button>
            </div>
          </div>
        )}

        {/* ── İstatistikler ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid var(--bdr)' }}>
          {[
            { label:'Tarama',  value:stats.scans },
            { label:'Aksiyon', value:stats.applied },
            { label:'İhlal',   value:stats.violations },
            { label:'Aralık',  value:`${interval}sn` },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ padding:'10px 0', borderRight:i<3?'1px solid var(--bdr)':'none', textAlign:'center' }}>
              <p style={{ fontSize:16, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{value}</p>
              <p style={{ fontSize:9, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Son kararlar ── */}
        {decisions.length > 0 && (
          <div style={{ borderBottom:'1px solid var(--bdr)' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', padding:'8px 18px 4px' }}>Son Kararlar</p>
            <div style={{ maxHeight:130, overflowY:'auto' }}>
              {decisions.slice(0,5).map((d,i) => (
                <div key={i} className="row" style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                    background:d.severity==='CRITICAL'||d.severity==='HIGH'?'var(--red)':d.severity==='MEDIUM'?'var(--amber)':'var(--green)' }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.action}</p>
                    <p style={{ fontSize:10, color:'var(--tx3)', marginTop:1 }}>{d.restaurant_id} · {d.action_type}</p>
                  </div>
                  <span className="badge badge-green" style={{ fontSize:9, flexShrink:0 }}>
                    {autoMode?'Uygulandı':'Onaylandı'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Log ── */}
        <div style={{ padding:'10px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Sistem Logu</p>
            <button onClick={()=>setLogs([])} style={{ fontSize:9, color:'var(--tx3)', background:'none', border:'none', cursor:'pointer' }}>Temizle</button>
          </div>
          <div style={{ maxHeight:130, overflowY:'auto' }}>
            {logs.length===0
              ? <p style={{ fontSize:11, color:'var(--tx3)', fontFamily:'JetBrains Mono,monospace' }}>Loglar burada görünür…</p>
              : logs.map((l,i) => (
                <p key={i} style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:logColor[l.type], marginBottom:2, lineHeight:1.4 }}>
                  <span style={{ color:'rgba(255,255,255,.2)', fontSize:10 }}>{l.time} </span>{l.msg}
                </p>
              ))
            }
          </div>
        </div>
      </>}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  )
}
