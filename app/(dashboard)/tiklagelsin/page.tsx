'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { MENU, CATEGORIES, MenuItem } from '@/data/seed/menu'
import { LiveOrder, STATUS_LABELS, STATUS_DESCRIPTIONS, STATUS_FLOW, getStatusStep, getNextStatus, generateOrderId, estimateReady } from '@/data/seed/order-store'
import { cn, getRiskConfig } from '@/lib/utils'
import { ShoppingCart, Plus, Minus, X, ChevronRight, Clock, Package, CheckCircle, Truck, Store, ArrowLeft, Zap } from 'lucide-react'
import { getPulseScore } from '@/data/seed/mock-data'
import { OrderEventType } from '@/types'

type View = 'menu' | 'checkout' | 'tracking' | 'kitchen'

export default function TiklaGelsinPage() {
  const [view, setView] = useState<View>('menu')
  const [restaurantId, setRestaurantId] = useState('r1')
  const [channel, setChannel] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY')
  const [cart, setCart] = useState<{ item: MenuItem; qty: number }[]>([])
  const [activeCategory, setActiveCategory] = useState('burger')
  const [orders, setOrders] = useState<LiveOrder[]>([])
  const [trackingOrder, setTrackingOrder] = useState<LiveOrder | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')

  const restaurant = RESTAURANTS.find(r => r.id === restaurantId)!
  const pulse = getPulseScore(restaurantId)
  const pulseConfig = getRiskConfig(pulse.risk_level)

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item, qty: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === itemId)
      if (!existing || existing.qty <= 1) return prev.filter(c => c.item.id !== itemId)
      return prev.map(c => c.item.id === itemId ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const placeOrder = () => {
    const id = generateOrderId()
    const now = new Date().toISOString()
    const order: LiveOrder = {
      id,
      restaurantId,
      restaurantName: restaurant.name,
      channel,
      items: cart.map(c => ({ menuItemId: c.item.id, name: c.item.name, qty: c.qty, price: c.item.price })),
      total: cartTotal,
      customerName: customerName || 'Misafir',
      customerPhone: '0532 XXX XX XX',
      address: channel === 'DELIVERY' ? (address || 'Kadıköy, İstanbul') : undefined,
      status: 'ORDER_CREATED',
      statusHistory: [{ status: 'ORDER_CREATED', timestamp: now }],
      createdAt: now,
      estimatedReady: estimateReady(cart.map(c => ({ menuItemId: c.item.id })), MENU),
      courierName: channel === 'DELIVERY' ? 'Ahmet Y.' : undefined,
    }
    setOrders(prev => [...prev, order])
    setTrackingOrder(order)
    setCart([])
    setView('tracking')
  }

  // Auto-advance order status for demo
  useEffect(() => {
    if (!trackingOrder || trackingOrder.status === 'COMPLETED' || trackingOrder.status === 'CANCELLED') return
    const next = getNextStatus(trackingOrder.status)
    if (!next) return
    const delay = trackingOrder.status === 'ORDER_CREATED' ? 3000
      : trackingOrder.status === 'KDS_RECEIVED' ? 4000
      : trackingOrder.status === 'PREPARATION_STARTED' ? 8000
      : trackingOrder.status === 'PREPARATION_COMPLETED' ? 3000
      : trackingOrder.status === 'PACKING_STARTED' ? 4000
      : trackingOrder.status === 'READY' ? (trackingOrder.channel === 'DELIVERY' ? 5000 : 3000)
      : trackingOrder.status === 'COURIER_ARRIVED' ? 3000
      : 3000
    const t = setTimeout(() => {
      const now = new Date().toISOString()
      const updated = {
        ...trackingOrder,
        status: next,
        statusHistory: [...trackingOrder.statusHistory, { status: next, timestamp: now }]
      }
      setTrackingOrder(updated)
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    }, delay)
    return () => clearTimeout(t)
  }, [trackingOrder])

  // Sync orders to kitchen
  const syncOrderToKitchen = (orderId: string, newStatus: OrderEventType) => {
    const now = new Date().toISOString()
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const updated = { ...o, status: newStatus, statusHistory: [...o.statusHistory, { status: newStatus, timestamp: now }] }
      if (trackingOrder?.id === orderId) setTrackingOrder(updated)
      return updated
    }))
  }

  if (view === 'kitchen') return <KitchenView orders={orders} onAdvance={syncOrderToKitchen} onBack={() => setView('menu')} restaurantName={restaurant.name} pulse={pulse.score} pulseConfig={pulseConfig} />
  if (view === 'tracking' && trackingOrder) return <TrackingView order={trackingOrder} onNewOrder={() => { setTrackingOrder(null); setView('menu') }} onKitchen={() => setView('kitchen')} />
  if (view === 'checkout') return (
    <CheckoutView
      cart={cart} total={cartTotal} channel={channel} restaurant={restaurant}
      customerName={customerName} setCustomerName={setCustomerName}
      address={address} setAddress={setAddress}
      onBack={() => setView('menu')} onPlace={placeOrder}
      setChannel={setChannel}
    />
  )

  const filtered = MENU.filter(m => m.category === activeCategory)

  return (
    <div>
      <Topbar title="Tıkla Gelsin Demo" subtitle="Müşteri sipariş akışı + Mutfak paneli" />
      <div className="p-6 grid grid-cols-12 gap-6">

        {/* Left: Menu */}
        <div className="col-span-8 space-y-4">

          {/* Restaurant + channel selector */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-white/40 mb-0.5">Restoran Seç</div>
                <select
                  value={restaurantId}
                  onChange={e => setRestaurantId(e.target.value)}
                  className="bg-white/[0.06] border border-white/[0.1] text-white text-sm rounded-lg px-3 py-1.5 outline-none"
                >
                  {RESTAURANTS.map(r => <option key={r.id} value={r.id} className="bg-[#1a1a2e]">{r.name}</option>)}
                </select>
              </div>
              <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium', pulseConfig.bg, pulseConfig.border, pulseConfig.color)}>
                <div className={cn('w-1.5 h-1.5 rounded-full', pulseConfig.dot)} />
                Nabız: {pulse.score} · {pulseConfig.label}
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { v: 'DELIVERY', label: '🛵 Paket Servis' },
                { v: 'PICKUP', label: '🏪 Gel Al' },
              ].map(({ v, label }) => (
                <button key={v} onClick={() => setChannel(v as any)}
                  className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-all', channel === v ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-all', activeCategory === cat.id ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                <span>{cat.emoji}</span> {cat.label}
              </button>
            ))}
          </div>

          {/* Menu items */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(item => {
              const inCart = cart.find(c => c.item.id === item.id)
              return (
                <div key={item.id} className={cn('rounded-xl border p-4 transition-all', inCart ? 'border-orange-500/30 bg-orange-500/[0.05]' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]')}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-3xl">{item.emoji}</div>
                    {item.popular && <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-medium">Popüler</span>}
                  </div>
                  <div className="text-sm font-semibold text-white mb-0.5">{item.name}</div>
                  <div className="text-xs text-white/40 mb-3 line-clamp-2">{item.description}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-white">{item.price} ₺</div>
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center text-white/60 hover:bg-white/[0.15]">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold text-orange-400 w-4 text-center">{inCart.qty}</span>
                        <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white hover:bg-orange-400">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} className="flex items-center gap-1 bg-orange-500 hover:bg-orange-400 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors">
                        <Plus className="w-3 h-3" /> Ekle
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Cart + Kitchen button */}
        <div className="col-span-4 space-y-4">
          {/* Kitchen Panel CTA */}
          <button onClick={() => setView('kitchen')} className="w-full flex items-center justify-between bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 hover:bg-indigo-500/15 transition-colors">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-indigo-300">Mutfak Paneli</span>
            </div>
            <div className="flex items-center gap-1.5">
              {orders.length > 0 && <span className="text-xs bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">{orders.length}</span>}
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </div>
          </button>

          {/* Cart */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <ShoppingCart className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">Sepet</span>
              {cartCount > 0 && <span className="ml-auto text-xs bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">{cartCount}</span>}
            </div>

            {cart.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/30 text-sm">Sepetiniz boş</div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.map(({ item, qty }) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-lg">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{item.name}</div>
                      <div className="text-xs text-white/40">{item.price} ₺</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => removeFromCart(item.id)} className="w-5 h-5 rounded bg-white/[0.06] flex items-center justify-center text-white/50">
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-bold text-white w-4 text-center">{qty}</span>
                      <button onClick={() => addToCart(item)} className="w-5 h-5 rounded bg-orange-500/80 flex items-center justify-center text-white">
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="border-t border-white/[0.06] pt-2 mt-2">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-white/50">Toplam</span>
                    <span className="font-bold text-white">{cartTotal} ₺</span>
                  </div>
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Adınız (opsiyonel)"
                    className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 outline-none mb-2"
                  />
                  <button onClick={() => setView('checkout')}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    Siparişi Ver <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent orders */}
          {orders.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Son Siparişler</div>
              <div className="space-y-2">
                {orders.slice(-3).reverse().map(o => (
                  <button key={o.id} onClick={() => { setTrackingOrder(o); setView('tracking') }}
                    className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-3 py-2 transition-colors">
                    <div>
                      <div className="text-xs font-bold text-orange-400">{o.id}</div>
                      <div className="text-xs text-white/40">{STATUS_LABELS[o.status]}</div>
                    </div>
                    <div className="text-xs text-white/50">{o.total} ₺</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckoutView({ cart, total, channel, restaurant, customerName, setCustomerName, address, setAddress, onBack, onPlace, setChannel }: any) {
  return (
    <div>
      <Topbar title="Sipariş Özeti" subtitle="Siparişinizi onaylayın" />
      <div className="p-6 max-w-2xl space-y-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Menüye Dön
        </button>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Teslimat Yöntemi</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[{ v: 'DELIVERY', label: '🛵 Paket Servis', desc: 'Adresinize teslim' }, { v: 'PICKUP', label: '🏪 Gel Al', desc: 'Restorantan teslim' }].map(({ v, label, desc }) => (
              <button key={v} onClick={() => setChannel(v)}
                className={cn('rounded-lg border p-3 text-left transition-all', channel === v ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/[0.08]')}>
                <div className={cn('text-sm font-medium mb-0.5', channel === v ? 'text-orange-300' : 'text-white/70')}>{label}</div>
                <div className="text-xs text-white/30">{desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ad Soyad *"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none" />
            {channel === 'DELIVERY' && (
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Teslimat Adresi *"
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none" />
            )}
          </div>

          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-2">Sipariş İçeriği</div>
          <div className="space-y-1.5 mb-4">
            {cart.map(({ item, qty }: any) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm text-white/70">{item.emoji} {qty}x {item.name}</span>
                <span className="text-sm text-white/50">{item.price * qty} ₺</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-white/[0.06] pt-3 mb-4">
            <span className="font-semibold text-white">Toplam</span>
            <span className="font-bold text-xl text-orange-400">{total} ₺</span>
          </div>
          <button onClick={onPlace} className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-lg py-3 font-semibold text-sm transition-colors">
            ✓ Siparişi Onayla
          </button>
        </div>
      </div>
    </div>
  )
}

function TrackingView({ order, onNewOrder, onKitchen }: { order: LiveOrder; onNewOrder: () => void; onKitchen: () => void }) {
  const currentStep = getStatusStep(order.status)
  const isDelivery = order.channel === 'DELIVERY'
  const steps = isDelivery
    ? STATUS_FLOW.slice(0, 9)
    : STATUS_FLOW.filter(s => !['COURIER_ARRIVED', 'PICKED_UP'].includes(s))

  const isComplete = order.status === 'COMPLETED'

  return (
    <div>
      <Topbar title="Sipariş Takip" subtitle={order.id} />
      <div className="p-6 max-w-2xl space-y-4">

        {/* Order ID + status */}
        <div className={cn('rounded-xl border p-5 text-center', isComplete ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-orange-500/30 bg-orange-500/[0.05]')}>
          <div className="text-3xl mb-2">{isComplete ? '🎉' : '⏱️'}</div>
          <div className={cn('text-xl font-bold mb-1', isComplete ? 'text-emerald-400' : 'text-orange-400')}>{STATUS_LABELS[order.status]}</div>
          <div className="text-sm text-white/50">{STATUS_DESCRIPTIONS[order.status]}</div>
          <div className="text-xs text-white/30 mt-2">Sipariş No: <span className="font-bold text-white/50">{order.id}</span></div>
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Sipariş Durumu</div>
          <div className="space-y-3">
            {steps.map((step, i) => {
              const stepIdx = STATUS_FLOW.indexOf(step)
              const done = stepIdx <= currentStep
              const active = stepIdx === currentStep
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                    done ? 'border-emerald-500 bg-emerald-500' : active ? 'border-orange-500 bg-orange-500/20' : 'border-white/10 bg-transparent')}>
                    {done && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    {active && !done && <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                  </div>
                  <div className="flex-1">
                    <div className={cn('text-sm', done || active ? 'text-white' : 'text-white/25')}>{STATUS_LABELS[step]}</div>
                    {done && order.statusHistory.find(h => h.status === step) && (
                      <div className="text-xs text-white/30">
                        {new Date(order.statusHistory.find(h => h.status === step)!.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  {active && !done && <div className="text-xs text-orange-400 animate-pulse">İşleniyor...</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Order summary */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-2">Sipariş Detayı</div>
          <div className="space-y-1">
            {order.items.map(item => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <span className="text-white/60">{item.qty}x {item.name}</span>
                <span className="text-white/50">{item.price * item.qty} ₺</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-sm pt-2 border-t border-white/[0.06] mt-2">
              <span className="text-white">Toplam</span>
              <span className="text-orange-400">{order.total} ₺</span>
            </div>
          </div>
          {isDelivery && order.courierName && order.status !== 'ORDER_CREATED' && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs text-white/40">
              <Truck className="w-3.5 h-3.5" /> Kuryeniz: <span className="text-white/60 font-medium">{order.courierName}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onKitchen} className="flex items-center justify-center gap-2 border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-500/15 transition-colors">
            <Store className="w-4 h-4" /> Mutfak Paneli
          </button>
          <button onClick={onNewOrder} className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
            + Yeni Sipariş
          </button>
        </div>
      </div>
    </div>
  )
}

function KitchenView({ orders, onAdvance, onBack, restaurantName, pulse, pulseConfig }: any) {
  const active = orders.filter((o: LiveOrder) => !['COMPLETED', 'CANCELLED'].includes(o.status))
  const completed = orders.filter((o: LiveOrder) => o.status === 'COMPLETED')

  return (
    <div>
      <Topbar title="Mutfak Paneli" subtitle={restaurantName} />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Sipariş Ekranına Dön
          </button>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium', pulseConfig.bg, pulseConfig.border, pulseConfig.color)}>
            <Zap className="w-3 h-3" /> Nabız: {pulse} · {pulseConfig.label}
          </div>
        </div>

        {active.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-white/40 text-sm">Aktif sipariş yok</div>
            <div className="text-white/20 text-xs mt-1">Müşteri tarafından sipariş verildiğinde burada görünür</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* Columns */}
            {[
              { title: '📥 Yeni Siparişler', statuses: ['ORDER_CREATED', 'KDS_RECEIVED'] },
              { title: '👨‍🍳 Hazırlanıyor', statuses: ['PREPARATION_STARTED', 'PREPARATION_COMPLETED', 'PACKING_STARTED'] },
              { title: '✅ Hazır', statuses: ['READY', 'COURIER_ARRIVED', 'PICKED_UP'] },
            ].map(col => (
              <div key={col.title}>
                <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">{col.title}</div>
                <div className="space-y-3">
                  {active.filter((o: LiveOrder) => col.statuses.includes(o.status)).map((order: LiveOrder) => {
                    const next = getNextStatus(order.status)
                    const elapsed = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                    return (
                      <div key={order.id} className={cn('rounded-xl border p-4', elapsed > 10 ? 'border-red-500/30 bg-red-500/[0.05]' : elapsed > 6 ? 'border-orange-500/30 bg-orange-500/[0.05]' : 'border-white/[0.08] bg-white/[0.04]')}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-orange-400">{order.id}</span>
                          <span className={cn('text-xs font-bold tabular-nums', elapsed > 10 ? 'text-red-400' : elapsed > 6 ? 'text-orange-400' : 'text-white/40')}>
                            {elapsed}dk
                          </span>
                        </div>
                        <div className="text-xs text-white/30 mb-1">{order.channel === 'DELIVERY' ? '🛵 Paket' : '🏪 Gel Al'} · {order.customerName}</div>
                        <div className="space-y-0.5 mb-3">
                          {order.items.map(item => (
                            <div key={item.menuItemId} className="text-xs text-white/60">{item.qty}x {item.name}</div>
                          ))}
                        </div>
                        <div className="text-[10px] text-white/30 mb-2">{STATUS_LABELS[order.status]}</div>
                        {next && (
                          <button onClick={() => onAdvance(order.id, next)}
                            className="w-full bg-white/[0.08] hover:bg-white/[0.15] text-white/80 rounded-lg py-1.5 text-xs font-medium transition-colors">
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
          <div className="rounded-xl border border-white/[0.06] p-4">
            <div className="text-xs text-white/30 uppercase tracking-wide mb-2">Tamamlananlar ({completed.length})</div>
            <div className="flex flex-wrap gap-2">
              {completed.map((o: LiveOrder) => (
                <span key={o.id} className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full">{o.id} · {o.total}₺</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
