'use client'
import { useState, useRef, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Bot, Send, User, Sparkles, Key, AlertTriangle } from 'lucide-react'
import { getOpenAIKey, hasRequiredConfig } from '@/lib/config-store'

interface Msg { id:string; role:'user'|'assistant'; content:string; time:Date }

const SUGGESTED = [
  'Hangi restoranlar şu an en riskli?',
  'Yağmurlu günlerde Tıkla Gelsin nasıl değişiyor?',
  'En fazla packing darboğazı yaşayan restoran?',
  'Cuma 18-21 için ne yapmalıyız?',
  'Bu hafta kritik alarm sayısı nedir?',
]

export default function AIAnalystPage() {
  const [messages, setMessages] = useState<Msg[]>([{
    id:'0', role:'assistant', time:new Date(),
    content:'Merhaba! Restoran operasyonlarınız hakkında doğal dilde sorular sorabilirsiniz. Supabase verilerinizi anlık analiz ediyorum.',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [configMissing, setConfigMissing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const { missing } = hasRequiredConfig(); setConfigMissing(missing.length > 0) }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Msg = { id:Date.now().toString(), role:'user', content:text, time:new Date() }
    const next = [...messages, userMsg]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/ai-analyst', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ messages:next.slice(1).map(m=>({role:m.role,content:m.content})), api_key:getOpenAIKey()||undefined }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { id:Date.now().toString(), role:'assistant', content:data.content??data.error??'Yanıt alınamadı.', time:new Date() }])
    } catch {
      setMessages(prev => [...prev, { id:Date.now().toString(), role:'assistant', content:'Bağlantı hatası. Tekrar deneyin.', time:new Date() }])
    } finally { setLoading(false) }
  }

  return (
    <div className="dm">
      <Topbar title="AI Analist" subtitle="Doğal dilde operasyon analizi"/>

      {/* Warning */}
      {configMissing && (
        <div style={{ margin:'12px 24px 0', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--amber2)', border:'1px solid var(--amber-ln)', borderRadius:10 }}>
          <AlertTriangle size={14} style={{ color:'var(--amber)', flexShrink:0 }}/>
          <span style={{ fontSize:12, color:'var(--tx2)' }}>OpenAI API key girilmemiş — mock yanıtlar kullanılıyor.</span>
          <a href="/settings" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--amber)', textDecoration:'none' }}>
            <Key size={11}/> Ayarlar
          </a>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display:'flex', gap:10, flexDirection:msg.role==='user'?'row-reverse':'row', alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              background:msg.role==='user'?'var(--ac)':'var(--s2)',
              border:`1px solid ${msg.role==='user'?'transparent':'var(--bdr)'}` }}>
              {msg.role==='user' ? <User size={14} color="#fff"/> : <Bot size={14} style={{ color:'var(--ac)' }}/>}
            </div>
            <div style={{ maxWidth:'72%', padding:'12px 16px', borderRadius:14, lineHeight:1.65, fontSize:13,
              background:msg.role==='user'?'var(--ac2)':'var(--s1)',
              border:`1px solid ${msg.role==='user'?'rgba(124,106,247,.3)':'var(--bdr)'}`,
              color:'var(--tx)', whiteSpace:'pre-wrap' }}>
              {msg.content}
              <p style={{ fontSize:10, color:'var(--tx3)', marginTop:6 }}>{msg.time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--s2)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Bot size={14} style={{ color:'var(--ac)' }}/>
            </div>
            <div style={{ padding:'12px 16px', borderRadius:14, background:'var(--s1)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', gap:4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--ac)', animation:`bounce .9s ${i*0.15}s ease-in-out infinite` }}/>)}
              </div>
              <span style={{ fontSize:12, color:'var(--tx3)' }}>Analiz ediliyor…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Suggested */}
      <div style={{ padding:'8px 24px 0', display:'flex', gap:6, overflowX:'auto', flexShrink:0 }}>
        {SUGGESTED.map(q => (
          <button key={q} onClick={()=>send(q)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:20, background:'var(--s1)', border:'1px solid var(--bdr)', color:'var(--tx2)', fontSize:11.5, whiteSpace:'nowrap', cursor:'pointer', transition:'border-color .12s', flexShrink:0 }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--bdr2)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--bdr)'}>
            <Sparkles size={10} style={{ color:'var(--ac)', flexShrink:0 }}/>{q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding:'12px 24px 20px', display:'flex', gap:10, flexShrink:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send(input)}
          placeholder="Örn: Hangi restoranlar packing darboğazı yaşıyor?"
          className="inp" style={{ flex:1, padding:'11px 16px', fontSize:13 }}/>
        <button onClick={()=>send(input)} disabled={loading||!input.trim()}
          style={{ width:44, height:44, borderRadius:12, background:'var(--ac)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', opacity:loading||!input.trim()?.4:1, flexShrink:0, boxShadow:'0 4px 14px rgba(124,106,247,.3)' }}>
          <Send size={16} color="#fff"/>
        </button>
      </div>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      `}</style>
    </div>
  )
}
