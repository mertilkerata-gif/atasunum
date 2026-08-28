export interface ProductDemand {
  id: string
  name: string
  category: 'burger' | 'chicken' | 'sides' | 'drinks'
  station: 'grill' | 'fryer' | 'packing'
  avgPrepTime: number // dakika
  currentDemand: number // son 30 dk sipariş adedi
  baselineDemand: number // normal dönem baseline
  demandIndex: number // 100 = normal, 150 = %50 fazla
  stockRisk: 'ok' | 'low' | 'critical'
  stockUnits: number
}

export interface ProductSnapshot {
  restaurantId: string
  timestamp: string
  products: ProductDemand[]
  topDemandProduct: string
  bottleneckProduct: string
  inventoryRiskScore: number // 0-100
}

// Ürün bazlı mock data - restoran profiliyle eşleşiyor
const BASE_PRODUCTS: Omit<ProductDemand, 'currentDemand' | 'demandIndex' | 'stockRisk' | 'stockUnits'>[] = [
  { id: 'p1', name: 'Whopper',         category: 'burger',  station: 'grill',   avgPrepTime: 4,   baselineDemand: 12 },
  { id: 'p2', name: 'Double Whopper',  category: 'burger',  station: 'grill',   avgPrepTime: 5,   baselineDemand: 7  },
  { id: 'p3', name: 'Steakhouse',      category: 'burger',  station: 'grill',   avgPrepTime: 5,   baselineDemand: 6  },
  { id: 'p4', name: 'Crispy Chicken',  category: 'chicken', station: 'fryer',   avgPrepTime: 3,   baselineDemand: 10 },
  { id: 'p5', name: 'Long Chicken',    category: 'chicken', station: 'fryer',   avgPrepTime: 3,   baselineDemand: 8  },
  { id: 'p6', name: 'Büyük Patates',   category: 'sides',   station: 'fryer',   avgPrepTime: 2,   baselineDemand: 18 },
  { id: 'p7', name: 'Soğan Halkası',   category: 'sides',   station: 'fryer',   avgPrepTime: 3,   baselineDemand: 5  },
  { id: 'p8', name: 'Elmalı Turta',    category: 'sides',   station: 'fryer',   avgPrepTime: 2,   baselineDemand: 4  },
]

export function getProductSnapshot(restaurantId: string): ProductSnapshot {
  // Restoran skoruna göre talep baskısı
  const pressureMap: Record<string, number> = {
    r1: 1.45, r2: 1.22, r3: 1.08, r4: 0.85, r5: 1.28,
    r6: 1.62, r7: 0.90, r8: 1.15, r9: 1.18, r10: 0.75,
  }
  const pressure = pressureMap[restaurantId] ?? 1.0

  const products: ProductDemand[] = BASE_PRODUCTS.map(p => {
    // Ürün bazlı rastgele varyasyon (deterministik)
    const seed = restaurantId.charCodeAt(1) + p.id.charCodeAt(1)
    const variance = 0.8 + (Math.sin(seed) * 0.5 + 0.5) * 0.6
    const currentDemand = Math.round(p.baselineDemand * pressure * variance)
    const demandIndex = Math.round((currentDemand / p.baselineDemand) * 100)

    // Stok durumu
    const stockUnits = Math.round(40 - (pressure * 15) + Math.sin(seed * 1.3) * 8)
    const stockRisk: ProductDemand['stockRisk'] = stockUnits < 8 ? 'critical' : stockUnits < 18 ? 'low' : 'ok'

    return { ...p, currentDemand, demandIndex, stockRisk, stockUnits: Math.max(0, stockUnits) }
  })

  const sorted = [...products].sort((a, b) => b.demandIndex - a.demandIndex)
  const topDemand = sorted[0]
  const bottleneck = [...products].filter(p => p.station === 'fryer' || p.station === 'grill')
    .sort((a, b) => b.demandIndex - a.demandIndex)[0]

  const inventoryRiskScore = Math.round(
    products.filter(p => p.stockRisk === 'critical').length * 35 +
    products.filter(p => p.stockRisk === 'low').length * 15
  )

  return {
    restaurantId,
    timestamp: new Date().toISOString(),
    products,
    topDemandProduct: topDemand?.name ?? 'Whopper',
    bottleneckProduct: bottleneck?.name ?? 'Büyük Patates',
    inventoryRiskScore: Math.min(100, inventoryRiskScore),
  }
}

export function getAllProductSnapshots() {
  return ['r1','r2','r3','r4','r5','r6','r7','r8','r9','r10'].map(id => getProductSnapshot(id))
}
