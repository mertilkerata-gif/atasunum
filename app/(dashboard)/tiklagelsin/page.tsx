'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { MENU, CATEGORIES, MenuItem } from '@/data/seed/menu'
import { LiveOrder, STATUS_LABELS, STATUS_DESCRIPTIONS, STATUS_FLOW, getStatusStep, getNextStatus, generateOrderId, estimateReady } from '@/data/seed/order-store'
import { getRiskConfig } from '@/lib/utils'
import { Plus, Minus, ArrowLeft, Zap, Store, Truck, CheckCircle, ShoppingCart } from 'lucide-react'
import { getPulseScore } from '@/data/seed/mock-data'
import { OrderEventType } from '@/types'
import { Restaurant } from '@/types'

type View = 'menu' | 'checkout' | 'tracking' | 'kitchen'
interface CartItem { item: MenuItem; qty: number }

const S = {
  card: { background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, overflow:'hidden' as const },
  btn: { display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'var(--ac)', color:'#fff', border:'none', borderRadius:9, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', transition:'opacity .15s', boxShadow:'0 4px 14px rgba(124,106,247,.3)' } as React.CSSProperties,
  ghost: { display:'flex', alignItems:'center', gap:6, background:'transparent', color:'var(--tx2)', border:'1px solid var(--bdr)', borderRadius:9, padding:'7px 14px', fontSize:13, fontWeight:500, cursor:'pointer', transition:'border-color .15s' } as React.CSSProperties,
}

export default function TiklaGelsinPage() {
  const [view, setView] = useState<View>('menu')
  const [restaurantId, setRestaurantId] = useState('r1')
  const [channel, setChannel] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY')
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState('burger')
  const [orders, setOrders] = useState<LiveOrder[]>([])
  const [trackingOrder, setTrackingOrder] = useState<LiveOrder | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')

  const restaurant = RESTAURANTS.find(r => r.id === restaurantId)!
  const pulse = getPulseScore(restaurantId)
  const pulseConfig = getRiskConfig(pulse.risk_level)
  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  const addToCart = (item: MenuItem) =>
    setCart(prev => prev.find(c => c.item.id === item.id)
      ? prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      : [...prev, { item, qty: 1 }])

  const removeFromCart = (id: string) =>
    setCart(prev => {
      const ex = prev.find(c => c.item.id === id)
      if (!ex || ex.qty <= 1) return prev.filter(c => c.item.id !== id)
      return prev.map(c => c.item.id === id ? { ...c, qty: c.qty - 1 } : c)
    })

  const placeOrder = () => {
    const id = generateOrderId(); const now = new Date().toISOString()
    const order: LiveOrder = {
      id, restaurantId, restaurantName: restaurant.name, channel,
      items: cart.map(c => ({ menuItemId: c.item.id, name: c.item.name, qty: c.qty, price: c.item.price })),
      total: cartTotal, customerName: customerName || 'Misafir',
      customerPhone: '0532 XXX XX XX',
      address: channel === 'DELIVERY' ? (address || 'Kadıköy, İstanbul') : undefined,
      status: 'ORDER_CREATED',
      statusHistory: [{ status: 'ORDER_CREATED', timestamp: now }],
      createdAt: now, estimatedReady: estimateReady(cart.map(c => ({ menuItemId: c.item.id })), MENU),
      courierName: channel === 'DELIVERY' ? 'Ahmet Y.' : undefined,
    }
    setOrders(prev => [...prev, order]); setTrackingOrder(order); setCart([]); setView('tracking')
  }

  useEffect(() => {
    if (!trackingOrder || ['COMPLETED','CANCELLED'].includes(trackingOrder.status)) return
    const next = getNextStatus(trackingOrder.status); if (!next) return
    const delays: Partial<Record<OrderEventType, number>> = {
      ORDER_CREATED:2500,KDS_RECEIVED:3500,PREPARATION_STARTED:7000,
      PREPARATION_COMPLETED:3000,PACKING_STARTED:3500,READY:4000,COURIER_ARRIVED:3000,PICKED_UP:2500
    }
    const t = setTimeout(() => {
      const now = new Date().toISOString()
      const updated: LiveOrder = { ...trackingOrder, status: next, statusHistory: [...trackingOrder.statusHistory, { status: next, timestamp: now }] }
      setTrackingOrder(updated); setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    }, delays[trackingOrder.status] ?? 3000)
    return () => clearTimeout(t)
  }, [trackingOrder])

  const advanceOrder = useCallback((orderId: string, newStatus: OrderEventType) => {
    const now = new Date().toISOString()
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const updated: LiveOrder = { ...o, status: newStatus, statusHistory: [...o.statusHistory, { status: newStatus, timestamp: now }] }
      if (trackingOrder?.id === orderId) setTrackingOrder(updated)
      return updated
    }))
  }, [trackingOrder])

  if (view === 'kitchen') return <KitchenView orders={orders} onAdvance={advanceOrder} onBack={() => setView('menu')} restaurantName={restaurant.name} pulse={pulse.score} pulseConfig={pulseConfig} />
  if (view === 'tracking' && trackingOrder) return <TrackingView order={trackingOrder} onNewOrder={() => { setTrackingOrder(null); setView('menu') }} onKitchen={() => setView('kitchen')} />
  if (view === 'checkout') return <CheckoutView cart={cart} total={cartTotal} channel={channel} restaurant={restaurant} customerName={customerName} setCustomerName={setCustomerName} address={address} setAddress={setAddress} onBack={() => setView('menu')} onPlace={placeOrder} setChannel={setChannel} />

  const filtered = MENU.filter(m => m.category === activeCategory)

  return (
    <div className="dm">
      <Topbar title="Tıkla Gelsin Demo" subtitle="Müşteri sipariş akışı + Mutfak paneli" />
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px) clamp(14px,3vw,24px)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap:20, alignItems:'start' }}>

          {/* SOL — Menü */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Restoran seç + Nabız */}
            <div style={S.card}>
              <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, borderBottom:'1px solid var(--bdr)' }}>
                <div>
                  <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.08em' }}>Restoran Seç</p>
                  <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)} className="inp" style={{ width:'auto', padding:'6px 10px', fontSize:13 }}>
                    {RESTAURANTS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background: pulseConfig.bg, border:`1px solid ${pulseConfig.border}` }}>
                  <Zap size={12} style={{ color: pulseConfig.color }} strokeWidth={2}/>
                  <span style={{ fontSize:12, fontWeight:600, color: pulseConfig.color }}>Nabız: {pulse.score} · {pulseConfig.label}</span>
                </div>
              </div>

              {/* Kanal seç */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 , overflowX: "auto"}}>
                {[{ v:'DELIVERY' as const, label:'🛵 Paket Servis' }, { v:'PICKUP' as const, label:'🏪 Gel Al' }].map(({ v, label }) => (
                  <button key={v} onClick={() => setChannel(v)}
                    style={{ padding:'12px', fontSize:13, fontWeight:600, border:'none', borderBottom:'2px solid', cursor:'pointer', transition:'all .15s',
                      borderBottomColor: channel===v ? 'var(--ac)' : 'transparent',
                      background: channel===v ? 'var(--ac2)' : 'transparent',
                      color: channel===v ? 'var(--ac)' : 'var(--tx2)',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kategori tabs */}
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9, border:'none', cursor:'pointer', whiteSpace:'nowrap', transition:'all .12s', flexShrink:0,
                    background: activeCategory===cat.id ? 'var(--ac)' : 'var(--s2)',
                    color: activeCategory===cat.id ? '#fff' : 'var(--tx2)',
                    fontWeight: activeCategory===cat.id ? 600 : 400,
                    fontSize:13,
                  }}>
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>

            {/* Ürün grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,260px),1fr))', gap:12 , overflowX: "auto"}}>
              {filtered.map(item => {
                const inCart = cart.find(c => c.item.id === item.id)
                return (
                  <div key={item.id} style={{ ...S.card, borderColor: inCart ? 'rgba(124,106,247,.3)' : 'var(--bdr)', position:'relative' }}>
                    {item.popular && (
                      <div style={{ position:'absolute', top:10, right:10, fontSize:9.5, fontWeight:700, background:'var(--amber2)', color:'var(--amber)', border:'1px solid rgba(240,168,67,.2)', borderRadius:5, padding:'2px 7px', textTransform:'uppercase' }}>Popüler</div>
                    )}
                    <div style={{ padding:'16px 16px 14px' }}>
                      <div style={{ fontSize:34, marginBottom:10 }}>{item.emoji}</div>
                      <p style={{ fontSize:14, fontWeight:600, color:'var(--tx)', marginBottom:4, letterSpacing:'-.1px' }}>{item.name}</p>
                      <p style={{ fontSize:11.5, color:'var(--tx3)', lineHeight:1.5, marginBottom:12, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.description}</p>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:15, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{item.price} ₺</span>
                        {inCart ? (
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <button onClick={() => removeFromCart(item.id)}
                              style={{ width:26, height:26, borderRadius:'50%', background:'var(--s3)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--tx2)' }}>
                              <Minus size={12}/>
                            </button>
                            <span style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)', minWidth:16, textAlign:'center' }}>{inCart.qty}</span>
                            <button onClick={() => addToCart(item)}
                              style={{ width:26, height:26, borderRadius:'50%', background:'var(--ac)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                              <Plus size={12} color="#fff"/>
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item)}
                            style={{ display:'flex', alignItems:'center', gap:4, background:'var(--ac)', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            <Plus size={12}/> Ekle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SAĞ — Sepet */}
          <div style={{ display:'flex', flexDirection:'column', gap:12, position:'sticky', top:22 }}>

            {/* Mutfak paneli butonu */}
            <button onClick={() => setView('kitchen')}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:12, background:'var(--ac2)', border:'1px solid rgba(124,106,247,.25)', cursor:'pointer', width:'100%' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Store size={15} style={{ color:'var(--ac)' }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ac)' }}>Mutfak Paneli</span>
              </div>
              {orders.filter(o=>!['COMPLETED','CANCELLED'].includes(o.status)).length > 0 && (
                <span style={{ fontSize:11, fontWeight:700, background:'var(--ac)', color:'#fff', borderRadius:20, padding:'2px 8px' }}>
                  {orders.filter(o=>!['COMPLETED','CANCELLED'].includes(o.status)).length}
                </span>
              )}
            </button>

            {/* Sepet */}
            <div style={S.card}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:8 }}>
                <ShoppingCart size={15} style={{ color:'var(--tx3)' }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--tx)' }}>Sepet</span>
                {cartCount > 0 && <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, background:'var(--ac)', color:'#fff', borderRadius:20, padding:'2px 8px' }}>{cartCount}</span>}
              </div>

              {cart.length === 0 ? (
                <div style={{ padding:'28px 18px', textAlign:'center' }}>
                  <ShoppingCart size={28} style={{ color:'var(--tx3)', margin:'0 auto 10px', display:'block', opacity:.4 }}/>
                  <p style={{ fontSize:12.5, color:'var(--tx3)' }}>Sepetiniz boş</p>
                  <p style={{ fontSize:11, color:'var(--tx3)', marginTop:4, opacity:.6 }}>Menüden ürün ekleyin</p>
                </div>
              ) : (
                <div>
                  <div style={{ maxHeight:280, overflowY:'auto' }}>
                    {cart.map(({ item, qty }) => (
                      <div key={item.id} className="row" style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:20, flexShrink:0 }}>{item.emoji}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12.5, fontWeight:500, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</p>
                          <p style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>{item.price * qty} ₺</p>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          <button onClick={() => removeFromCart(item.id)} style={{ width:22, height:22, borderRadius:'50%', background:'var(--s3)', border:'1px solid var(--bdr)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Minus size={10} style={{ color:'var(--tx2)' }}/>
                          </button>
                          <span style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)', minWidth:14, textAlign:'center' }}>{qty}</span>
                          <button onClick={() => addToCart(item)} style={{ width:22, height:22, borderRadius:'50%', background:'var(--ac)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Plus size={10} color="#fff"/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:'12px 18px', borderTop:'1px solid var(--bdr)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <span style={{ fontSize:13, color:'var(--tx2)' }}>Toplam</span>
                      <span style={{ fontSize:18, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{cartTotal} ₺</span>
                    </div>
                    <button onClick={() => setView('checkout')} style={{ ...S.btn, width:'100%' }}>
                      Siparişi Onayla →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Son siparişler */}
            {orders.length > 0 && (
              <div style={S.card}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--bdr)' }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--tx2)' }}>Son Siparişler</span>
                </div>
                <div style={{ maxHeight:180, overflowY:'auto' }}>
                  {[...orders].reverse().slice(0,5).map(o => (
                    <div key={o.id} className="row" style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:11.5, fontWeight:500, color:'var(--tx)', fontFamily:'JetBrains Mono,monospace' }}>{o.id}</p>
                        <p style={{ fontSize:10.5, color:'var(--tx3)', marginTop:1 }}>{STATUS_LABELS[o.status]}</p>
                      </div>
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx2)', flexShrink:0 }}>{o.total} ₺</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Checkout ─────────────────────────────────────────────────
function CheckoutView({ cart, total, channel, customerName, setCustomerName, address, setAddress, onBack, onPlace, setChannel }: {
  cart: CartItem[]; total: number; channel: 'DELIVERY'|'PICKUP'; restaurant: Restaurant
  customerName: string; setCustomerName: (v:string)=>void; address: string; setAddress: (v:string)=>void
  onBack: ()=>void; onPlace: ()=>void; setChannel: (v:'DELIVERY'|'PICKUP')=>void
}) {
  return (
    <div className="dm">
      <Topbar title="Sipariş Özeti" subtitle="Siparişinizi onaylayın"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px) clamp(14px,3vw,24px)' }}>
        <div style={{ maxWidth:520, display:'flex', flexDirection:'column', gap:14 }}>
          <button onClick={onBack} style={{ ...S.ghost, width:'fit-content' }}>
            <ArrowLeft size={14}/> Menüye Dön
          </button>

          {/* Kanal */}
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--bdr)' }}>
              <p style={{ fontSize:10.5, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em' }}>Teslimat Yöntemi</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,260px),1fr))', gap:12, padding:'14px 18px' , overflowX: "auto"}}>
              {[{ v:'DELIVERY' as const, label:'🛵 Paket Servis', desc:'Adresinize teslim' }, { v:'PICKUP' as const, label:'🏪 Gel Al', desc:'Restorandan teslim' }].map(({ v, label, desc }) => (
                <button key={v} onClick={() => setChannel(v)}
                  style={{ padding:'12px', borderRadius:10, border:`1px solid ${channel===v?'rgba(124,106,247,.35)':'var(--bdr)'}`, background: channel===v?'var(--ac2)':'var(--s2)', cursor:'pointer', textAlign:'left' as const, transition:'all .12s' }}>
                  <p style={{ fontSize:13, fontWeight:600, color: channel===v?'var(--ac)':'var(--tx2)', marginBottom:3 }}>{label}</p>
                  <p style={{ fontSize:11, color:'var(--tx3)' }}>{desc}</p>
                </button>
              ))}
            </div>
            <div style={{ padding:'0 18px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              <input className="inp" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ad Soyad *"/>
              {channel === 'DELIVERY' && <input className="inp" value={address} onChange={e => setAddress(e.target.value)} placeholder="Teslimat Adresi *"/>}
            </div>
          </div>

          {/* Özet */}
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--bdr)' }}>
              <p style={{ fontSize:10.5, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em' }}>Sipariş İçeriği</p>
            </div>
            <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
              {cart.map(({ item, qty }) => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{item.emoji}</span>
                  <span style={{ flex:1, fontSize:13, color:'var(--tx2)' }}>{qty}x {item.name}</span>
                  <span style={{ fontSize:13, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{item.price * qty} ₺</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:10, borderTop:'1px solid var(--bdr)', marginTop:4 }}>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--tx)' }}>Toplam</span>
                <span style={{ fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--ac)' }}>{total} ₺</span>
              </div>
            </div>
            <div style={{ padding:'0 18px 16px' }}>
              <button onClick={onPlace} style={{ ...S.btn, width:'100%' }}>✓ Siparişi Onayla</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tracking ─────────────────────────────────────────────────
function TrackingView({ order, onNewOrder, onKitchen }: { order: LiveOrder; onNewOrder: ()=>void; onKitchen: ()=>void }) {
  const isComplete = order.status === 'COMPLETED'
  const currentStep = getStatusStep(order.status)
  const steps = order.channel === 'DELIVERY' ? STATUS_FLOW.slice(0,9) : STATUS_FLOW.filter(s => !['COURIER_ARRIVED','PICKED_UP'].includes(s))

  return (
    <div className="dm">
      <Topbar title="Sipariş Takip" subtitle={order.id}/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px) clamp(14px,3vw,24px)' }}>
        <div style={{ maxWidth:520, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Durum kartı */}
          <div style={{ background: isComplete?'var(--green2)':'var(--amber2)', border:`1px solid ${isComplete?'var(--green-ln)':'var(--amber-ln)'}`, borderRadius:14, padding:'24px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>{isComplete ? '🎉' : '⏱️'}</div>
            <p style={{ fontSize:18, fontWeight:700, color: isComplete?'var(--green)':'var(--amber)', marginBottom:6 }}>{STATUS_LABELS[order.status]}</p>
            <p style={{ fontSize:13, color:'var(--tx2)', marginBottom:8 }}>{STATUS_DESCRIPTIONS[order.status]}</p>
            <p style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>#{order.id}</p>
          </div>

          {/* Adımlar */}
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12 }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--bdr)' }}>
              <p style={{ fontSize:10.5, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em' }}>Sipariş Durumu</p>
            </div>
            <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
              {steps.map(step => {
                const idx = STATUS_FLOW.indexOf(step)
                const done = idx <= currentStep; const active = idx === currentStep
                const ts = order.statusHistory.find(h => h.status === step)
                return (
                  <div key={step} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:`2px solid ${done?'var(--green)':active?'var(--amber)':'var(--s4)'}`, background: done?'var(--green2)':active?'var(--amber2)':'transparent', transition:'all .3s' }}>
                      {done ? <CheckCircle size={13} style={{ color:'var(--green)' }}/> : active ? <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--amber)', animation:'pulse 1.5s ease-in-out infinite' }}/> : null}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, color: done||active?'var(--tx)':'var(--tx3)', fontWeight: active?600:400 }}>{STATUS_LABELS[step]}</p>
                      {ts && <p style={{ fontSize:10.5, color:'var(--tx3)', marginTop:1, fontFamily:'JetBrains Mono,monospace' }}>{new Date(ts.timestamp).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</p>}
                    </div>
                    {active && <span style={{ fontSize:11, color:'var(--amber)', animation:'pulse 2s ease-in-out infinite' }}>İşleniyor…</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sipariş detay */}
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 18px' }}>
            {order.items.map(item => (
              <div key={item.menuItemId} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--tx2)', marginBottom:6 }}>
                <span>{item.qty}x {item.name}</span>
                <span style={{ fontFamily:'JetBrains Mono,monospace' }}>{item.price * item.qty} ₺</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:10, borderTop:'1px solid var(--bdr)', fontWeight:700 }}>
              <span style={{ color:'var(--tx)' }}>Toplam</span>
              <span style={{ fontFamily:'JetBrains Mono,monospace', color:'var(--ac)' }}>{order.total} ₺</span>
            </div>
            {order.channel === 'DELIVERY' && order.courierName && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--tx3)' }}>
                <Truck size={12}/> Kuryeniz: <strong style={{ color:'var(--tx2)' }}>{order.courierName}</strong>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 , overflowX: "auto"}}>
            <button onClick={onKitchen} style={{ ...S.ghost, justifyContent:'center' }}><Store size={14}/> Mutfak</button>
            <button onClick={onNewOrder} style={{ ...S.btn }}>+ Yeni Sipariş</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Kitchen ──────────────────────────────────────────────────
function KitchenView({ orders, onAdvance, onBack, restaurantName, pulse, pulseConfig }: {
  orders: LiveOrder[]; onAdvance: (id:string,s:OrderEventType)=>void; onBack: ()=>void
  restaurantName: string; pulse: number; pulseConfig: ReturnType<typeof getRiskConfig>
}) {
  const active = orders.filter(o => !['COMPLETED','CANCELLED'].includes(o.status))
  const completed = orders.filter(o => o.status === 'COMPLETED')
  const cols = [
    { title:'📥 Yeni Siparişler', statuses:['ORDER_CREATED','KDS_RECEIVED'] as OrderEventType[] },
    { title:'👨‍🍳 Hazırlanıyor', statuses:['PREPARATION_STARTED','PREPARATION_COMPLETED','PACKING_STARTED'] as OrderEventType[] },
    { title:'✅ Hazır / Teslim', statuses:['READY','COURIER_ARRIVED','PICKED_UP'] as OrderEventType[] },
  ]

  return (
    <div className="dm">
      <Topbar title="Mutfak Paneli" subtitle={restaurantName}/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px) clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={onBack} style={{ ...S.ghost }}><ArrowLeft size={14}/> Sipariş Ekranı</button>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, background:pulseConfig.bg, border:`1px solid ${pulseConfig.border}` }}>
            <Zap size={13} style={{ color:pulseConfig.color }}/> <span style={{ fontSize:12.5, fontWeight:600, color:pulseConfig.color }}>Nabız: {pulse} · {pulseConfig.label}</span>
          </div>
        </div>

        {active.length === 0 ? (
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, padding:'60px 24px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <p style={{ fontSize:14, color:'var(--tx2)' }}>Aktif sipariş yok</p>
            <p style={{ fontSize:12, color:'var(--tx3)', marginTop:6 }}>Müşteri sipariş verdiğinde burada görünür</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
            {cols.map(col => (
              <div key={col.title}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>{col.title}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {active.filter(o => col.statuses.includes(o.status)).map(order => {
                    const next = getNextStatus(order.status)
                    const elapsed = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                    const urgentColor = elapsed > 10 ? 'var(--red)' : elapsed > 6 ? 'var(--amber)' : 'var(--green)'
                    return (
                      <div key={order.id} style={{ background:'var(--s1)', border:`1px solid ${elapsed>10?'rgba(242,87,87,.25)':elapsed>6?'rgba(240,168,67,.25)':'var(--bdr)'}`, borderRadius:12, padding:'14px 16px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:11.5, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>#{order.id}</span>
                          <span style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:urgentColor }}>{elapsed}dk</span>
                        </div>
                        <p style={{ fontSize:11, color:'var(--tx3)', marginBottom:6 }}>{order.channel==='DELIVERY'?'🛵 Paket':'🏪 Gel Al'} · {order.customerName}</p>
                        <div style={{ marginBottom:10 }}>
                          {order.items.map(item => <p key={item.menuItemId} style={{ fontSize:11.5, color:'var(--tx2)', marginBottom:2 }}>{item.qty}x {item.name}</p>)}
                        </div>
                        <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:8 }}>{STATUS_LABELS[order.status]}</p>
                        {next && (
                          <button onClick={() => onAdvance(order.id, next)}
                            style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:8, padding:'7px', fontSize:11.5, fontWeight:600, color:'var(--tx2)', cursor:'pointer', transition:'all .12s' }}>
                            → {STATUS_LABELS[next]}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 18px' }}>
            <p style={{ fontSize:10.5, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Tamamlananlar ({completed.length})</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {completed.map(o => (
                <span key={o.id} style={{ fontSize:11.5, background:'var(--green2)', border:'1px solid var(--green-ln)', color:'var(--green)', borderRadius:20, padding:'4px 12px', fontFamily:'JetBrains Mono,monospace' }}>
                  #{o.id} · {o.total}₺
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
