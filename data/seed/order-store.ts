// In-memory order store — shared between customer and kitchen views via URL params
// In production this would be Supabase Realtime

import { OrderEventType } from '@/types'

export interface LiveOrder {
  id: string
  restaurantId: string
  restaurantName: string
  channel: 'DELIVERY' | 'PICKUP'
  items: { menuItemId: string; name: string; qty: number; price: number }[]
  total: number
  customerName: string
  customerPhone: string
  address?: string
  status: OrderEventType
  statusHistory: { status: OrderEventType; timestamp: string }[]
  createdAt: string
  estimatedReady: string // ISO
  courierName?: string
  courierPhone?: string
}

// Status flow
export const STATUS_FLOW: OrderEventType[] = [
  'ORDER_CREATED',
  'KDS_RECEIVED',
  'PREPARATION_STARTED',
  'PREPARATION_COMPLETED',
  'PACKING_STARTED',
  'READY',
  'COURIER_ARRIVED',
  'PICKED_UP',
  'COMPLETED',
]

export const STATUS_LABELS: Record<OrderEventType, string> = {
  ORDER_CREATED: 'Sipariş Alındı',
  KDS_RECEIVED: 'Mutfağa İletildi',
  PREPARATION_STARTED: 'Hazırlanıyor',
  PREPARATION_COMPLETED: 'Hazırlandı',
  PACKING_STARTED: 'Paketleniyor',
  READY: 'Hazır',
  COURIER_ARRIVED: 'Kurye Geldi',
  PICKED_UP: 'Kurye Teslim Aldı',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
}

export const STATUS_DESCRIPTIONS: Record<OrderEventType, string> = {
  ORDER_CREATED: 'Siparişiniz başarıyla alındı',
  KDS_RECEIVED: 'Mutfak ekibimiz bilgilendirildi',
  PREPARATION_STARTED: 'Ekibimiz siparişinizi hazırlıyor',
  PREPARATION_COMPLETED: 'Ürünleriniz hazırlandı',
  PACKING_STARTED: 'Siparişiniz paketleniyor',
  READY: 'Siparişiniz teslime hazır',
  COURIER_ARRIVED: 'Kurye restoranımızda',
  PICKED_UP: 'Kurye siparişinizi teslim aldı',
  COMPLETED: 'Afiyet olsun! 🎉',
  CANCELLED: 'Sipariş iptal edildi',
}

export function getStatusStep(status: OrderEventType): number {
  const idx = STATUS_FLOW.indexOf(status)
  return idx === -1 ? 0 : idx
}

export function getNextStatus(current: OrderEventType): OrderEventType | null {
  const idx = STATUS_FLOW.indexOf(current)
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

export function generateOrderId(): string {
  return 'TG-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function estimateReady(items: { menuItemId: string }[], menuItems: { id: string; prepTime: number }[]): string {
  const maxPrep = Math.max(...items.map(i => {
    const m = menuItems.find(m => m.id === i.menuItemId)
    return m ? m.prepTime : 5
  }))
  const totalMinutes = maxPrep + 3 // +3 packing
  const ready = new Date(Date.now() + totalMinutes * 60 * 1000)
  return ready.toISOString()
}
