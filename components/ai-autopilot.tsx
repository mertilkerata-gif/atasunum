'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Pause, Play, Volume2, VolumeX, CheckCircle2, X, ChevronDown, ChevronUp, Mic } from 'lucide-react'
import { getOpenAIKey } from '@/lib/config-store'
import Link from 'next/link'

interface Decision {
  restaurant_id: string; action_type: string; action: string
  severity: string; voice_message: string; expected_impact: string
}
interface Log { time: string; msg: string; type: 'info'|'ok'|'warn'|'err'|'ai' }

export function AIAutopilot({ interval = 30, onRefresh }: { interval?: number; onRefresh?: () => void }) {
  const [running, setRunning]   = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [muted, setMuted]       = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [status, setStatus]     = useState<'idle'|'scanning'|'applying'|'speaking'|'listening'|'error'>('idle')
  const [countdown, setCd]      = useState(interval)
  const [logs, setLogs]         = useState<Log[]>([])
  const [recentDec, setRecentDec] = useState<Decision[]>([])
  const [pending, setPending]   = useState<Decision|null>(null)
  const [stats, setStats]       = useState({ scans:0, applied:0, violations:0 })
  const [hasKey, setHasKey]     = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null)
  const countRef   = useRef<ReturnType<typeof setInterval>|null>(null)
  const isSpeaking = useRef(false)
  const speakQ     = useRef<{text:string;onEnd?:()=>void}[]>([])
  const recognRef  = useRef<any>(null)
  const pendingQ   = useRef<Decision[]>([])
  const apiKeyRef  = useRef('')
  const autoRef    = useRef(true) // autoMode'un güncel değeri

  useEffect(() => { autoRef.current = autoMode }, [autoMode])

  const addLog = useCallback((msg: string, type: Log['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setLogs(p => [{ time, msg, type }, ...p.slice(0,49)])
  }, [])

  // ── TTS ────────────────────────────────────────────────────────
  const runSpeak = useCallback(() => {
    if (isSpeaking.current || !speakQ.current.length || typeof window==='undefined') return
    const { text, onEnd } = speakQ.current.shift()!
    isSpeaking.current = true; setStatus('speaking')
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang='tr-TR'; utt.rate=1.05; utt.volume=1
    const voices = window.speechSynthesis.getVoices()
    const v = voices.find(v=>v.lang==='tr-TR') ?? voices.find(v=>v.lang.startsWith('tr')) ?? voices.find(v=>v.lang.startsWith('en')) ?? voices[0]
    if (v) utt.voice = v
    utt.onend  = () => { isSpeaking.current=false; setStatus('idle'); onEnd?.(); runSpeak() }
    utt.onerror = () => { isSpeaking.current=false; setStatus('idle'); onEnd?.(); runSpeak() }
    window.speechSynthesis.speak(utt)
  }, [])

  const speak = useCallback((text: string, onEnd?: ()=>void) => {
    if (muted) { onEnd?.(); return }
    speakQ.current.push({ text, onEnd })
    if (!isSpeaking.current) {
      if (!window.speechSynthesis.getVoices().length) {
        window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged=null; runSpeak() }
      } else runSpeak()
    }
  }, [muted, runSpeak])

  // ── STT ────────────────────────────────────────────────────────
  const listen = useCallback((onResult:(t:string)=>void, ms=8000) => {
    setStatus('listening')
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { addLog('⚠️ Tarayıcı mikrofonu desteklemiyor', 'warn'); onResult('bekliyor'); return }
    const r = new SR(); r.lang='tr-TR'; r.continuous=false; r.interimResults=false
    recognRef.current = r
    const t = setTimeout(() => { r.stop(); onResult('zaman_asimi') }, ms)
    r.onresult = (e:any) => { clearTimeout(t); onResult(e.results[0][0].transcript.toLowerCase().trim()) }
    r.onerror  = () => { clearTimeout(t); onResult('hata') }
    r.onend    = () => setStatus('idle')
    r.start()
  }, [addLog])

  const unlockAudio = useCallback(() => {
    if (unlocked || typeof window==='undefined') return
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0; window.speechSynthesis.speak(u)
    window.speechSynthesis.getVoices()
    setUnlocked(true)
  }, [unlocked])

  // ── YARI OTOMATİK: sıradaki kararı sesli sor ──────────────────
  const askNext = useCallback(() => {
    if (!pendingQ.current.length) {
      setPending(null); setStatus('idle'); onRefresh?.()
      addLog('📋 Tüm kararlar tamamlandı', 'ok')
      return
    }
    const dec = pendingQ.current.shift()!
    setPending(dec)
    addLog(`❓ Onay bekleniyor: ${dec.restaurant_id} — ${dec.action}`, 'warn')

    speak(dec.voice_message, () => {
      listen((answer) => {
        const yes = /evet|tamam|onayla|yap|uygu|olur|tamamdır/.test(answer)
        const no  = /hayır|iptal|dur|bekle|reddet|olmaz|gerek/.test(answer)

        if (yes || (!no && answer !== 'hata' && answer !== 'bekliyor')) {
          // ONAYLA — sadece bu kararı uygula
          addLog(`✅ ONAYLANDI: ${dec.restaurant_id} — ${dec.action}`, 'ok')
          fetch('/api/ai-apply', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ decision: dec }),
          }).then(r=>r.json()).then(d=>{
            if (d.pulse_update) {
              addLog(`📉 ${dec.restaurant_id}: ${d.pulse_update.old_score}→${d.pulse_update.new_score} (${d.pulse_update.new_risk})`, 'ok')
            }
            setRecentDec(p=>[dec,...p].slice(0,30))
            setStats(s=>({...s, applied:s.applied+1}))
            onRefresh?.()
          }).catch(()=>{ addLog('❌ Uygulama hatası', 'err') })
          speak(`Tamam. ${dec.action}. Uygulandı.`, askNext)
        } else if (no) {
          addLog(`🚫 REDDEDİLDİ: ${dec.restaurant_id}`, 'warn')
          speak('Anlaşıldı, bu karar iptal edildi.', askNext)
        } else {
          // Zaman aşımı veya anlaşılamadı — tekrar sor
          addLog(`⏱ Yanıt anlaşılamadı, atlıyorum: ${dec.restaurant_id}`, 'warn')
          speak('Yanıt anlaşılamadı, bu kararı atlıyorum.', askNext)
        }
      }, 8000)
    })
  }, [speak, listen, addLog, onRefresh])

  // ── Ana tarama ────────────────────────────────────────────────
  const scan = useCallback(async () => {
    if (isSpeaking.current || status==='listening' || status==='applying') return
    const apiKey = getOpenAIKey()
    if (!apiKey) { addLog('❌ OpenAI key yok', 'err'); setRunning(false); return }
    apiKeyRef.current = apiKey

    setStatus('scanning')
    addLog('🔍 Supabase taranıyor…', 'info')
    setStats(s=>({...s,scans:s.scans+1}))

    try {
      // Her iki modda da önce karar al (auto_apply:false)
      const res = await fetch('/api/ai-watch', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ api_key: apiKey, auto_apply: false }),
      })
      const data = await res.json()

      if (data.status==='OK' || !data.decisions?.length) {
        addLog('✅ Tüm sistemler normal', 'ok'); setStatus('idle'); return
      }

      const decisions: Decision[] = data.decisions || []
      setStats(s=>({...s, violations:s.violations+data.violations}))
      addLog(`⚡ ${data.violations} ihlal — ${decisions.length} karar`, 'warn')

      if (autoRef.current) {
        // TAM OTOMATİK: hepsini direkt uygula
        setStatus('applying')
        for (const dec of decisions) {
          const r = await fetch('/api/ai-apply', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ decision: dec }),
          })
          const d = await r.json()
          addLog(`🤖 ${dec.restaurant_id}: ${dec.action}`, 'ai')
          if (d.pulse_update) addLog(`📉 ${dec.restaurant_id}: ${d.pulse_update.old_score}→${d.pulse_update.new_score} (${d.pulse_update.new_risk})`, 'ok')
        }
        setRecentDec(p=>[...decisions,...p].slice(0,30))
        setStats(s=>({...s,applied:s.applied+decisions.length}))
        const voiceMsg = decisions.map(d=>d.voice_message).join(' Ayrıca, ')
        speak(voiceMsg + ' Tüm kararlar uygulandı.')
        onRefresh?.()
        setStatus('idle')
      } else {
        // YARI OTOMATİK: kuyruğa ekle ve sesli sor
        pendingQ.current = [...decisions]
        askNext()
      }
    } catch (e:any) {
      addLog(`❌ ${e.message}`, 'err'); setStatus('error')
    }
  }, [status, speak, addLog, askNext, onRefresh])

  // ── Timer döngüsü ─────────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
      return
    }
    scan()
    timerRef.current = setInterval(scan, interval*1000)
    setCd(interval)
    countRef.current = setInterval(()=>setCd(p=>p<=1?interval:p-1), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [running, interval])

  // ── İlk yükleme ───────────────────────────────────────────────
  useEffect(() => {
    const key = getOpenAIKey()
    setHasKey(!!key)
    if (key) {
      setRunning(true)
      addLog('🚀 AI Otopilot başlatıldı', 'ok')
    } else {
      addLog('⚠️ OpenAI key yok — Ayarlar > API Anahtarları', 'warn')
    }
  }, [])

  const toggle = () => {
    if (running) {
      setRunning(false)
      window.speechSynthesis?.cancel()
      recognRef.current?.stop()
      speakQ.current=[]; pendingQ.current=[]; isSpeaking.current=false
      setStatus('idle'); setPending(null)
      addLog('⏹ Durduruldu', 'warn')
    } else {
      if (!getOpenAIKey()) { addLog('❌ OpenAI key yok', 'err'); return }
      unlockAudio(); setRunning(true)
      addLog(`▶️ Başlatıldı — ${autoRef.current?'TAM OTOMATİK':'YARI OTOMATİK'}`, 'ok')
      speak(autoRef.current?'Tam otomatik mod devrede.':'Yarı otomatik mod devrede. Kararları size soracağım.')
    }
  }

  const switchMode = () => {
    const next = !autoMode
    setAutoMode(next); autoRef.current = next
    addLog(`🔄 Mod: ${next?'TAM OTOMATİK':'YARI OTOMATİK'}`, 'info')
    if (running) speak(next?'Tam otomatik moda geçildi.':'Yarı otomatik moda geçildi. Bundan sonra onayınızı isteyeceğim.')
  }

  // Manuel butonlar (yarı otomatik)
  const manualApprove = useCallback(() => {
    recognRef.current?.stop()
    if (!pending) return
    addLog(`✅ Manuel ONAY: ${pending.restaurant_id}`, 'ok')
    fetch('/api/ai-apply', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ decision: pending }),
    }).then(r=>r.json()).then(d=>{
      if (d.pulse_update) addLog(`📉 ${pending.restaurant_id}: ${d.pulse_update.old_score}→${d.pulse_update.new_score} (${d.pulse_update.new_risk})`, 'ok')
      setRecentDec(p=>[pending,...p].slice(0,30))
      setStats(s=>({...s,applied:s.applied+1}))
      onRefresh?.()
    })
    speak(`Tamam. ${pending.action}. Uygulandı.`, askNext)
  }, [pending, speak, askNext, addLog, onRefresh])

  const manualReject = useCallback(() => {
    recognRef.current?.stop()
    if (!pending) return
    addLog(`🚫 Manuel RET: ${pending.restaurant_id}`, 'warn')
    speak('Anlaşıldı, iptal edildi.', askNext)
  }, [pending, speak, askNext, addLog])

  const sc = { idle:'var(--tx3)', scanning:'var(--ac)', applying:'var(--amber)', speaking:'var(--green)', listening:'var(--green)', error:'var(--red)' }[status]
  const sl = { idle:'Bekliyor', scanning:'Taranıyor…', applying:'Uygulanıyor…', speaking:'Konuşuyor', listening:'Dinliyor…', error:'Hata' }[status]
  const lc: Record<string,string> = { info:'var(--tx3)', ok:'var(--green)', warn:'var(--amber)', err:'var(--red)', ai:'var(--ac)' }

  return (
    <div style={{ background:'var(--s1)', border:`1px solid ${running?'rgba(124,106,247,.3)':'var(--bdr)'}`, borderRadius:14, overflow:'hidden', boxShadow:running?'0 0 24px rgba(124,106,247,.08)':'none', transition:'box-shadow .3s' }}>

      {/* Header */}
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12, background:running?'linear-gradient(135deg,rgba(124,106,247,.06),transparent)':'transparent', borderBottom:expanded?'1px solid var(--bdr)':'none' }}>
        <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:running?'linear-gradient(135deg,var(--ac),#5b4de0)':'var(--s2)', border:`1px solid ${running?'transparent':'var(--bdr)'}`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:running?'0 0 16px rgba(124,106,247,.5)':'none' }}>
          <Brain size={15} color={running?'#fff':undefined} style={{ color:running?undefined:'var(--tx3)' }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <p style={{ fontSize:13.5, fontWeight:700, color:'var(--tx)', letterSpacing:'-.2px' }}>AI Otopilot</p>
            <button onClick={switchMode} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, cursor:'pointer', border:'none', background:autoMode?'var(--green2)':'var(--amber2)', outline:`1px solid ${autoMode?'var(--green-ln)':'var(--amber-ln)'}` }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:autoMode?'var(--green)':'var(--amber)', animation:'pulse 1.5s ease-in-out infinite' }}/>
              <span style={{ fontSize:10, fontWeight:700, color:autoMode?'var(--green)':'var(--amber)' }}>{autoMode?'TAM OTOMATİK':'YARI OTOMATİK'}</span>
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:sc, animation:running&&status!=='idle'?'pulse 1.2s ease-in-out infinite':'none' }}/>
            <span style={{ fontSize:11, color:sc }}>{sl}</span>
            {running && status==='idle' && <span style={{ fontSize:10, color:'var(--tx3)', fontFamily:'JetBrains Mono,monospace' }}>→ {countdown}sn</span>}
            {status==='listening' && <Mic size={11} style={{ color:'var(--green)', animation:'pulse 1s ease-in-out infinite' }}/>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={()=>{ unlockAudio(); speak('Ses testi. Sistem hazır.') }} title="Sesi aç/test et" style={{ width:28, height:28, borderRadius:7, background:unlocked?'var(--green2)':'var(--s2)', border:`1px solid ${unlocked?'var(--green-ln)':'var(--bdr)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Volume2 size={12} style={{ color:unlocked?'var(--green)':'var(--tx3)' }}/>
          </button>
          <button onClick={()=>setMuted(m=>!m)} style={{ width:28, height:28, borderRadius:7, background:muted?'var(--red2)':'var(--s2)', border:`1px solid ${muted?'var(--red-ln)':'var(--bdr)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {muted?<VolumeX size={12} style={{ color:'var(--red)' }}/>:<Volume2 size={12} style={{ color:'var(--tx3)' }}/>}
          </button>
          <button onClick={toggle} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:9, background:running?'var(--red2)':'var(--ac)', border:`1px solid ${running?'var(--red-ln)':'transparent'}`, color:running?'var(--red)':'#fff', fontSize:12, fontWeight:600, cursor:'pointer', boxShadow:running?'none':'0 4px 14px rgba(124,106,247,.35)' }}>
            {running?<><Pause size={11}/> Durdur</>:<><Play size={11}/> Başlat</>}
          </button>
          <button onClick={()=>setExpanded(p=>!p)} style={{ width:28, height:28, borderRadius:7, background:'var(--s2)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {expanded?<ChevronUp size={12} style={{ color:'var(--tx3)' }}/>:<ChevronDown size={12} style={{ color:'var(--tx3)' }}/>}
          </button>
        </div>
      </div>

      {expanded && <>
        {!hasKey && (
          <div style={{ padding:'10px 18px', background:'var(--amber2)', borderBottom:'1px solid var(--amber-ln)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:12, color:'var(--amber)' }}>⚠️ OpenAI API Key girilmemiş</p>
            <Link href="/settings" style={{ fontSize:11, color:'var(--amber)', textDecoration:'none', fontWeight:600, padding:'3px 10px', borderRadius:7, background:'rgba(240,168,67,.15)', border:'1px solid var(--amber-ln)' }}>Ayarlar →</Link>
          </div>
        )}

        {!unlocked && hasKey && (
          <div style={{ padding:'10px 18px', background:'var(--blue2)', borderBottom:'1px solid var(--blue-ln)', display:'flex', alignItems:'center', gap:10 }}>
            <Volume2 size={13} style={{ color:'var(--blue)', flexShrink:0 }}/>
            <p style={{ fontSize:12, color:'var(--tx2)' }}>Ses için önce 🔊 butonuna tıkla</p>
            <button onClick={()=>{ unlockAudio(); speak('Ses aktif.') }} style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:7, background:'var(--blue)', border:'none', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>🔊 Sesi Aç</button>
          </div>
        )}

        {/* YARI OTOMATİK — onay paneli */}
        {!autoMode && pending && (
          <div style={{ padding:'14px 18px', background:'rgba(247,144,9,.06)', borderBottom:'1px solid rgba(247,144,9,.25)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--amber)', animation:'pulse 1s ease-in-out infinite' }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--amber)' }}>
                {status==='listening'?'🎤 Dinleniyor… "Evet" veya "Hayır" söyleyin':'⏳ Onay Bekleniyor'}
              </span>
            </div>
            <p style={{ fontSize:13, color:'var(--tx)', lineHeight:1.6, marginBottom:10 }}>{pending.voice_message}</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={manualApprove} className="btn" style={{ padding:'7px 18px', fontSize:12, boxShadow:'none' }}>
                <CheckCircle2 size={12}/> Onayla
              </button>
              <button onClick={manualReject} className="btn-ghost" style={{ padding:'7px 14px', fontSize:12, color:'var(--red)' }}>
                <X size={12}/> Reddet
              </button>
            </div>
          </div>
        )}

        {/* İstatistikler */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid var(--bdr)' }}>
          {[{ l:'Tarama',v:stats.scans },{ l:'Aksiyon',v:stats.applied },{ l:'İhlal',v:stats.violations },{ l:'Aralık',v:`${interval}sn` }].map(({ l, v }, i) => (
            <div key={l} style={{ padding:'10px 0', borderRight:i<3?'1px solid var(--bdr)':'none', textAlign:'center' }}>
              <p style={{ fontSize:16, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{v}</p>
              <p style={{ fontSize:9, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{l}</p>
            </div>
          ))}
        </div>

        {/* Son kararlar */}
        {recentDec.length > 0 && (
          <div style={{ borderBottom:'1px solid var(--bdr)' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', padding:'8px 18px 4px' }}>Son Kararlar</p>
            <div style={{ maxHeight:120, overflowY:'auto' }}>
              {recentDec.slice(0,5).map((d,i) => (
                <div key={i} className="row" style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:d.severity==='CRITICAL'||d.severity==='HIGH'?'var(--red)':d.severity==='MEDIUM'?'var(--amber)':'var(--green)' }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.action}</p>
                    <p style={{ fontSize:10, color:'var(--tx3)', marginTop:1 }}>{d.restaurant_id} · {d.action_type}</p>
                  </div>
                  <span className="badge badge-green" style={{ fontSize:9, flexShrink:0 }}>Uygulandı</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log */}
        <div style={{ padding:'10px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Sistem Logu</p>
            <button onClick={()=>setLogs([])} style={{ fontSize:9, color:'var(--tx3)', background:'none', border:'none', cursor:'pointer' }}>Temizle</button>
          </div>
          <div style={{ maxHeight:130, overflowY:'auto' }}>
            {logs.length===0
              ? <p style={{ fontSize:11, color:'var(--tx3)', fontFamily:'JetBrains Mono,monospace' }}>Loglar burada görünür…</p>
              : logs.map((l,i)=>(
                <p key={i} style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:lc[l.type], marginBottom:2, lineHeight:1.4 }}>
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
