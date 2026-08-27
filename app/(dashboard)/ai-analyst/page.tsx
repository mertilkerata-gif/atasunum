'use client'
import { useState, useRef, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { cn } from '@/lib/utils'
import { Bot, Send, User, Loader2, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  'Hangi restoranlar şu an en riskli durumda?',
  'Yağmurlu günlerde Tıkla Gelsin siparişleri nasıl değişiyor?',
  'En fazla packing darboğazı yaşayan restoran hangisi?',
  'Cuma 18:00–21:00 arasında ne gibi önlemler almalıyız?',
  'AI önerileri hazırlama süresini gerçekten düşürüyor mu?',
  'Bu hafta hangi gün en fazla kritik alarm üretildi?',
]

const MOCK_CONTEXT = `
Sen Mutfak Nabzı sisteminin AI analistisin. TAB Gıda (Burger King ve Popeyes) restoran operasyonlarını analiz ediyorsun.

Mevcut anlık durum:
- 10 restoran aktif
- 2 restoran KRİTİK (BK Kadıköy: 84, Popeyes Taksim: 91)
- 2 restoran RİSKLİ (BK Beşiktaş: 67, BK Maltepe: 71)
- 3 restoran YOĞUN (BK Ümraniye: 45, Popeyes Bağcılar: 55, BK Pendik: 62)
- 3 restoran NORMAL
- Hava: Yağmurlu (İstanbul geneli)
- En yoğun saat: 18:00–20:00
- Toplam açık sipariş: ~200
- En kritik darboğaz: Packing istasyonu

Veri: Son 30 günde yağmurlu günlerde TG Paket Servis %31 artar, normal restoran %22 düşer.
AI önerileri uygulandığında ortalama hazırlama süresi %33 düşüyor.
Cuma–Cumartesi en yoğun günler.

Türkçe, kısa ve net cevaplar ver. Operasyon odaklı, somut rakamlar kullan. Emoji kullanabilirsin.
`

export default function AIAnalystPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Merhaba! Ben Mutfak Nabzı AI Analistiyim. Restoran operasyonlarınız hakkında doğal dilde sorular sorabilirsiniz. Mevcut veriler, tahminler, trend analizleri ve operasyonel öneriler konusunda yardımcı olabilirim.',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: MOCK_CONTEXT,
          messages: history,
        }),
      })
      const data = await res.json()
      const content = data.content?.[0]?.text ?? 'Yanıt alınamadı.'
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content, timestamp: new Date() }])
    } catch {
      // Fallback mock responses
      const fallbacks: Record<string, string> = {
        'riskli': '🔴 Şu an en riskli restoranlar:\n\n1. **Popeyes Taksim** — Nabız: 91 (KRİTİK). Tüm istasyonlar %88+ yükle çalışıyor.\n2. **BK Kadıköy** — Nabız: 84 (KRİTİK). Packing %94, kurye bekleme 8.1 dk.\n3. **BK Maltepe** — Nabız: 71 (RİSKLİ). Yağmurlu hava paket siparişlerini artırıyor.\n\nAcil aksiyon: Her iki kritik restorana +1 packing personeli.',
        'yağmur': '🌧️ Yağmurlu günlerde verilerimize göre:\n\n• TG Paket Servis: **+%31** artış\n• Normal Restoran: **-%22** düşüş\n• TG Gel Al: **-%11** düşüş\n\nBugün İstanbul geneli yağmurlu. Bu nedenle mevcut 10 restoranın 5\'i yüksek nabız skorunda. Packing kapasitesi kritik.',
        'packing': '📦 Packing darboğazı en fazla şu restoranlarda:\n\n1. Popeyes Taksim: **%97** (kritik)\n2. BK Kadıköy: **%94** (kritik)\n3. BK Maltepe: **%82** (riskli)\n\nSon 30 günde toplam 5.8 saat/gün packing darboğazı yaşandı. +1 packing personeli eklendiğinde ortalama hazırlama süresi 12.4dk → 7.8dk\'ya düşüyor.',
        'cuma': '📅 Cuma 18:00–21:00 öneri planı:\n\n• **17:30** — Tüm packing alanlarına +1 destek\n• **17:45** — Yoğun ürünlerde (Whopper, Crispy) ön hazırlık artır\n• **18:00** — Kurye koordinasyonunu aktive et\n• **18:30** — Yedek personeli göreve al\n\nGeçen Cuma bu saatte ağ geneli ort. nabız 79 idi. Erken önlemle 62\'ye indirildi.',
        'öneri': '✅ AI önerilerinin etki analizi (son 30 gün):\n\n| Aksiyon | Uygulama | İyileşme |\n|---|---|---|\n| Packing +1 | 23 kez | -%37 |\n| Ön hazırlık | 18 kez | -%29 |\n| Kurye önceliklendirme | 31 kez | -%39 |\n\nGenel: Öneriler uygulandığında hazırlama süresi ortalama **%33** düşüyor. Uygulama oranı: %73.',
        'default': '📊 Belirttiğiniz konuyu analiz ediyorum. Mevcut verilere göre en kritik nokta packing kapasitesi ve yağmurlu hava koşulları. Daha spesifik bir soru için lütfen restoran adı veya zaman aralığı belirtin.',
      }
      const key = Object.keys(fallbacks).find(k => text.toLowerCase().includes(k)) ?? 'default'
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: fallbacks[key], timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <Topbar title="AI Analist" subtitle="Doğal dilde operasyon analizi" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
              msg.role === 'user' ? 'bg-orange-500' : 'bg-indigo-500/30 border border-indigo-500/40')}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
            </div>
            <div className={cn('max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-orange-500/15 border border-orange-500/20 text-white'
                : 'bg-white/[0.05] border border-white/[0.08] text-white/80')}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-[10px] text-white/25 mt-2">
                {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
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

      {/* Suggested questions */}
      <div className="px-6 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTED_QUESTIONS.map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              className="shrink-0 flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] rounded-full px-3 py-1.5 text-xs text-white/50 hover:text-white/70 transition-all">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Örn: Hangi restoranlarda packing darboğazı var?"
            className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-indigo-500/50 transition-colors"
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="px-4 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
