'use client'
import { useState, useRef, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { cn } from '@/lib/utils'
import { Bot, Send, User, Loader2, Sparkles, Key, AlertTriangle } from 'lucide-react'
import { getOpenAIKey, hasRequiredConfig } from '@/lib/config-store'

interface Message { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }

const SUGGESTED = [
  'Hangi restoranlar şu an en riskli?',
  'Yağmurlu günlerde Tıkla Gelsin nasıl değişiyor?',
  'En fazla packing darboğazı yaşayan restoran?',
  'Cuma 18:00–21:00 için ne yapmalıyız?',
  'AI önerileri hazırlama süresini düşürüyor mu?',
  'Bu hafta kritik alarm sayısı nedir?',
]

export default function AIAnalystPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant', timestamp: new Date(),
    content: 'Merhaba! Restoran operasyonlarınız hakkında doğal dilde sorular sorabilirsiniz.',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [configMissing, setConfigMissing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const { missing } = hasRequiredConfig()
    setConfigMissing(missing.length > 0)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const apiKey = getOpenAIKey()
      const res = await fetch('/api/ai-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.slice(1).map(m => ({ role: m.role, content: m.content })),
          api_key: apiKey || undefined,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content ?? data.error ?? 'Yanıt alınamadı.', timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Bağlantı hatası. Lütfen tekrar deneyin.', timestamp: new Date() }])
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <Topbar title="AI Analist" subtitle="Doğal dilde operasyon analizi — GPT-4o" />

      {configMissing && (
        <div className="mx-6 mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/[0.06] p-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-300">OpenAI API key girilmemiş — mock yanıtlar kullanılıyor.</span>
          <a href="/settings" className="ml-auto flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 underline">
            <Key className="w-3 h-3" /> Ayarlar
          </a>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
              msg.role === 'user' ? 'bg-orange-500' : 'bg-indigo-500/30 border border-indigo-500/40')}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
            </div>
            <div className={cn('max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
              msg.role === 'user' ? 'bg-orange-500/15 border border-orange-500/20 text-white' : 'bg-white/[0.05] border border-white/[0.08] text-white/80')}>
              {msg.content}
              <div className="text-[10px] text-white/25 mt-2">{msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-500/40 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span className="text-xs text-white/40">Analiz ediliyor...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTED.map(q => (
            <button key={q} onClick={() => send(q)}
              className="shrink-0 flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] rounded-full px-3 py-1.5 text-xs text-white/50 hover:text-white/70 transition-all">
              <Sparkles className="w-3 h-3 text-indigo-400" />{q}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <div className="flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Örn: Hangi restoranlarda packing darboğazı var?"
            className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-indigo-500/50 transition-colors" />
          <button onClick={() => send(input)} disabled={loading || !input.trim()}
            className="px-4 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white rounded-xl transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
