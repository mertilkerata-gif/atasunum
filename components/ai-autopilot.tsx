'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Pause, Play, Volume2, VolumeX, CheckCircle2, ChevronDown, ChevronUp, Zap, Settings } from 'lucide-react'
import { getOpenAIKey } from '@/lib/config-store'
import Link from 'next/link'

interface Decision {
  restaurant_id: string
  action_type: string
  action: string
  severity: string
  voice_message: string
  expected_impact: string
  pulse_updated?: boolean
}

interface Log {
  time: string
  msg: string
  type: 'info'|'ok'|'warn'|'err'|'ai'
}

export function AIAutopilot({ interval = 30, onRefresh }: { interval?: number; onRefresh?: () => void }) {
  const [running, setRunning]     = useState(false)
  const [autoMode, setAutoMode]   = useState(true)   // true = tamamen otomatik, false = sesli onay iste
  const [muted, setMuted]         = useState(false)
  const [expanded, setExpanded]   = useState(true)
  const [status, setStatus]       = useState<'idle'|'scanning'|'applying'|'speaking'|'error'>('idle')
  const [countdown, setCountdown] = useState(interval)
  const [logs, setLogs]           = useState<Log[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [stats, setStats]         = useState({ scans:0, applied:0, violations:0 })
  const [hasKey, setHasKey]       = useState(false)

  const timerRef  = useRef<ReturnType<typeof setInterval>|null>(null)
  const countRef  = useRef<ReturnType<typeof setInterval>|null>(null)
  const speakQ    = useRef<string[]>([])
  const speaking  = useRef(false)

  const log = useCallback((msg: string, type: Log['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setLogs(prev => [{ time, msg, type }, ...prev.slice(0,49)])
  }, [])

  // TTS — kuyruk sistemi
  const speakNext = useCallback(() => {
    if (muted || speaking.current || speakQ.current.length === 0) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const text = speakQ.current.shift()!
    speaking.current = true
    setStatus('speaking')
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'tr-TR'; utt.rate = 1.05; utt.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const v = voices.find(v=>v.lang==='tr-TR') ?? voices.find(v=>v.lang.startsWith('tr')) ?? voices.find(v=>v.lang.startsWith('en')) ?? voices[0]
    if (v) utt.voice = v
    utt.onend = () => { speaking.current = false; setStatus(running?'idle':'idle'); speakNext() }
    utt.onerror = () => { speaking.current = false; speakNext() }
    window.speechSynthesis.speak(utt)
  }, [muted, running])

  const speak = useCallback((text: string) => {
    if (muted) return
    speakQ.current.push(text)
    if (!speaking.current) speakNext()
  }, [muted, speakNext])

  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const utt = new SpeechSynthesisUtterance(' ')
    utt.volume = 0
    window.speechSynthesis.speak(utt)
    // Sesler yüklü değilse yükle
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {}
    }
  }, [])

  // Ana tarama + otomatik uygulama
  const scan = useCallback(async () => {
    if (status === 'speaking' || status === 'applying') return
    const apiKey = getOpenAIKey()
    if (!apiKey) {
      log('❌ OpenAI key yok — Ayarlar > API Anahtarları', 'err')
      setRunning(false); return
    }

    setStatus('scanning')
    log('🔍 Supabase taranıyor…', 'info')
    setStats(s => ({ ...s, scans: s.scans+1 }))

    try {
      const res = await fetch('/api/ai-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, auto_apply: true }), // her zaman uygula
      })
      const data = await res.json()

      if (data.status === 'OK' || !data.decisions?.length) {
        log('✅ Tüm sistemler normal', 'ok')
        setStatus('idle')
        if (data.violations === 0 && stats.scans % 5 === 0) {
          speak('Tüm restoranlar normal. Sistem izleniyor.')
        }
        return
      }

      setStatus('applying')
      const applied: Decision[] = data.decisions || []

      log(`⚡ ${data.violations} ihlal — ${applied.length} aksiyon uygulandı`, 'warn')
      setStats(s => ({ ...s, violations: s.violations+data.violations, applied: s.applied+applied.length }))
      setDecisions(prev => [...applied, ...prev].slice(0,30))

      // Her karar için sesli bildirim + log
      for (const d of applied) {
        const rName = d.restaurant_id.toUpperCase()
        const typeLabel: Record<string,string> = {
          PACKING_OVERLOAD: 'paketleme krizidir',
          PREP_SLOW: 'hazırlama yavaşlamasıdır',
          COURIER_WAIT: 'kurye bekleme sorunudur',
          ORDER_SURGE: 'sipariş dalgasıdır',
          PULSE_CRITICAL: 'genel kritik durumdur',
        }
        log(`🤖 ${d.restaurant_id}: ${d.action}`, 'ai')
        if (d.pulse_updated) log(`📊 Nabız güncellendi — ${d.expected_impact}`, 'ok')
        speak(d.voice_message)
      }

      // Özet bildirim
      if (applied.length > 0) {
        const critCount = applied.filter(d=>d.severity==='CRITICAL'||d.severity==='HIGH').length
        speak(`Toplam ${applied.length} aksiyon uygulandı. ${critCount > 0 ? `${critCount} kritik müdahale yapıldı.` : 'Sistem iyileştiriliyor.'} Nabız skorları güncellendi.`)
      }

      // Pulse güncellemelerini logla
      if (data.pulse_updates?.length) {
        for (const u of data.pulse_updates) {
          log(`📉 ${u.restaurant_id}: Nabız ${u.old_score}→${u.new_score} (${u.new_risk})`, 'ok')
        }
      }

      // Dashboard'ı yenile
      onRefresh?.()
      setStatus('idle')

    } catch (e: any) {
      log(`❌ ${e.message}`, 'err')
      setStatus('error')
    }
  }, [status, speak, log, onRefresh, stats.scans])

  // Döngü
  useEffect(() => {
    if (!running) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
      return
    }
    scan()
    timerRef.current = setInterval(scan, interval * 1000)
    setCountdown(interval)
    countRef.current = setInterval(() => setCountdown(p => p <= 1 ? interval : p-1), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [running, interval])

  // Sayfa açılınca key kontrol + başlat
  useEffect(() => {
    const key = getOpenAIKey()
    setHasKey(!!key)
    if (key) {
      unlockAudio()
      setTimeout(() => {
        setRunning(true)
        log('🚀 AI Otopilot başlatıldı — Tam Otomatik Mod', 'ok')
        speak('Mutfak Nabzı AI Otopilot devrede. Sistem izleniyor.')
      }, 1500)
    } else {
      log('⚠️ OpenAI key bulunamadı. Ayarlar sayfasından girin.', 'warn')
    }
  }, [])

  const toggle = () => {
    if (running) {
      setRunning(false)
      window.speechSynthesis?.cancel()
      setStatus('idle')
      log('⏹ Otopilot durduruldu', 'warn')
    } else {
      const key = getOpenAIKey()
      if (!key) { log('❌ OpenAI key yok', 'err'); return }
      unlockAudio()
      setRunning(true)
      log('▶️ Otopilot başlatıldı', 'ok')
      speak('Mutfak Nabzı AI Otopilot devrede.')
    }
  }

  const statusColor = { idle:'var(--tx3)', scanning:'var(--ac)', applying:'var(--amber)', speaking:'var(--green)', error:'var(--red)' }[status]
  const statusLabel = { idle:'Bekliyor', scanning:'Taranıyor…', applying:'Uygulanıyor…', speaking:'Konuşuyor', error:'Hata' }[status]
  const logColor = { info:'var(--tx3)', ok:'var(--green)', warn:'var(--amber)', err:'var(--red)', ai:'var(--ac)' }

  return (
    <div style={{ background:'var(--s1)', border:`1px solid ${running?'rgba(124,106,247,.3)':'var(--bdr)'}`,
      borderRadius:14, overflow:'hidden', boxShadow:running?'0 0 24px rgba(124,106,247,.08)':'none', transition:'box-shadow .3s' }}>

      {/* Header */}
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

        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <p style={{ fontSize:13.5, fontWeight:700, color:'var(--tx)', letterSpacing:'-.2px' }}>AI Otopilot</p>
            {/* Otomatik toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20,
              background: autoMode?'var(--green2)':'var(--s2)',
              border:`1px solid ${autoMode?'var(--green-ln)':'var(--bdr)'}`,
              cursor:'pointer' }} onClick={()=>setAutoMode(p=>!p)}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:autoMode?'var(--green)':'var(--tx3)' }}/>
              <span style={{ fontSize:10, fontWeight:600, color:autoMode?'var(--green)':'var(--tx3)' }}>
                {autoMode?'TAM OTOMATİK':'YARIM'}
              </span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:statusColor,
              animation:running&&status!=='idle'?'pulse 1.2s ease-in-out infinite':'none' }}/>
            <span style={{ fontSize:11, color:statusColor }}>{statusLabel}</span>
            {running && status==='idle' && (
              <span style={{ fontSize:10, color:'var(--tx3)', fontFamily:'JetBrains Mono,monospace' }}>→ {countdown}sn</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* Ses test */}
          <button onClick={()=>{ unlockAudio(); speak('Sistem aktif. Test başarılı.') }} title="Sesi test et"
            style={{ width:28, height:28, borderRadius:7, background:'var(--s2)', border:'1px solid var(--bdr)',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Volume2 size={12} style={{ color:'var(--tx3)' }}/>
          </button>
          {/* Sessiz */}
          <button onClick={()=>setMuted(p=>!p)} title={muted?'Sesi aç':'Sessize al'}
            style={{ width:28, height:28, borderRadius:7,
              background:muted?'var(--red2)':'var(--s2)',
              border:`1px solid ${muted?'var(--red-ln)':'var(--bdr)'}`,
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {muted ? <VolumeX size={12} style={{ color:'var(--red)' }}/> : <Volume2 size={12} style={{ color:'var(--tx3)' }}/>}
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
            style={{ width:28, height:28, borderRadius:7, background:'var(--s2)', border:'1px solid var(--bdr)',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {expanded?<ChevronUp size={12} style={{ color:'var(--tx3)' }}/>:<ChevronDown size={12} style={{ color:'var(--tx3)' }}/>}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Key yoksa uyarı */}
          {!hasKey && (
            <div style={{ padding:'12px 18px', background:'var(--amber2)', borderBottom:'1px solid var(--amber-ln)',
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:12, color:'var(--amber)' }}>⚠️ OpenAI API Key girilmemiş — AI Otopilot çalışmıyor</p>
              <Link href="/settings" style={{ fontSize:11, color:'var(--amber)', textDecoration:'none', fontWeight:600,
                padding:'4px 10px', borderRadius:7, background:'rgba(240,168,67,.15)', border:'1px solid var(--amber-ln)' }}>
                Ayarlar →
              </Link>
            </div>
          )}

          {/* İstatistikler */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid var(--bdr)' }}>
            {[
              { label:'Tarama', value:stats.scans },
              { label:'Aksiyon', value:stats.applied },
              { label:'İhlal', value:stats.violations },
              { label:'Aralık', value:`${interval}sn` },
            ].map(({ label, value }, i) => (
              <div key={label} style={{ padding:'10px 14px', borderRight:i<3?'1px solid var(--bdr)':'none', textAlign:'center' }}>
                <p style={{ fontSize:16, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{value}</p>
                <p style={{ fontSize:9.5, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Son kararlar */}
          {decisions.length > 0 && (
            <div style={{ borderBottom:'1px solid var(--bdr)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', padding:'10px 18px 6px' }}>
                Son Kararlar
              </p>
              <div style={{ maxHeight:140, overflowY:'auto' }}>
                {decisions.slice(0,5).map((d,i) => (
                  <div key={i} className="row" style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                      background:d.severity==='CRITICAL'||d.severity==='HIGH'?'var(--red)':d.severity==='MEDIUM'?'var(--amber)':'var(--green)' }}/>
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
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Sistem Logu</p>
              <button onClick={()=>setLogs([])} style={{ fontSize:9, color:'var(--tx3)', background:'none', border:'none', cursor:'pointer' }}>Temizle</button>
            </div>
            <div style={{ maxHeight:140, overflowY:'auto' }}>
              {logs.length===0
                ? <p style={{ fontSize:11, color:'var(--tx3)', fontFamily:'JetBrains Mono,monospace' }}>Otopilot başlatılınca loglar burada görünür…</p>
                : logs.map((l,i) => (
                  <p key={i} style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:logColor[l.type], marginBottom:2, lineHeight:1.4 }}>
                    <span style={{ color:'var(--tx3)', fontSize:10 }}>{l.time} </span>{l.msg}
                  </p>
                ))
              }
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  )
}
