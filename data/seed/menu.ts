export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: 'burger' | 'chicken' | 'sides' | 'drinks' | 'dessert'
  prepTime: number // dakika
  station: 'grill' | 'fryer' | 'packing'
  emoji: string
  popular?: boolean
}

export const MENU: MenuItem[] = [
  // Burgers
  { id: 'm1', name: 'Whopper', description: 'Izgara köfte, domates, marul, soğan, turşu, ketçap, mayonez', price: 189, category: 'burger', prepTime: 4, station: 'grill', emoji: '🍔', popular: true },
  { id: 'm2', name: 'Whopper Cheese', description: 'Whopper + cheddar peyniri', price: 209, category: 'burger', prepTime: 4, station: 'grill', emoji: '🍔' },
  { id: 'm3', name: 'Double Whopper', description: 'Çift köfte, tam malzeme', price: 249, category: 'burger', prepTime: 5, station: 'grill', emoji: '🍔', popular: true },
  { id: 'm4', name: 'Steakhouse', description: 'Izgara köfte, karamelize soğan, BBQ sos, cheddar', price: 229, category: 'burger', prepTime: 5, station: 'grill', emoji: '🍔' },
  { id: 'm5', name: 'Crispy Chicken', description: 'Çıtır tavuk, coleslaw, özel sos', price: 179, category: 'chicken', prepTime: 3, station: 'fryer', emoji: '🍗', popular: true },
  { id: 'm6', name: 'Long Chicken', description: 'Uzun çıtır tavuk fileto, marul, mayonez', price: 169, category: 'chicken', prepTime: 3, station: 'fryer', emoji: '🍗' },
  { id: 'm7', name: 'Chicken Royale', description: 'Büyük çıtır tavuk burger', price: 199, category: 'chicken', prepTime: 3, station: 'fryer', emoji: '🍗' },
  // Sides
  { id: 'm8', name: 'Büyük Patates', description: 'Çıtır çıtır patates kızartması', price: 79, category: 'sides', prepTime: 2, station: 'fryer', emoji: '🍟', popular: true },
  { id: 'm9', name: 'Orta Patates', description: 'Orta boy patates kızartması', price: 59, category: 'sides', prepTime: 2, station: 'fryer', emoji: '🍟' },
  { id: 'm10', name: 'Soğan Halkası', description: '8 adet çıtır soğan halkası', price: 89, category: 'sides', prepTime: 3, station: 'fryer', emoji: '🧅' },
  { id: 'm11', name: 'Mozzarella Sticks', description: '6 adet mozarella çubuk', price: 99, category: 'sides', prepTime: 3, station: 'fryer', emoji: '🧀' },
  // Drinks
  { id: 'm12', name: 'Coca-Cola Büyük', description: '500ml Coca-Cola', price: 59, category: 'drinks', prepTime: 1, station: 'packing', emoji: '🥤' },
  { id: 'm13', name: 'Coca-Cola Orta', description: '330ml Coca-Cola', price: 45, category: 'drinks', prepTime: 1, station: 'packing', emoji: '🥤' },
  { id: 'm14', name: 'Ayran', description: '300ml soğuk ayran', price: 35, category: 'drinks', prepTime: 1, station: 'packing', emoji: '🥛' },
  { id: 'm15', name: 'Su', description: '500ml doğal kaynak suyu', price: 20, category: 'drinks', prepTime: 1, station: 'packing', emoji: '💧' },
  // Dessert
  { id: 'm16', name: 'Sundae Çikolata', description: 'Vanilyalı dondurma, çikolata sos', price: 49, category: 'dessert', prepTime: 2, station: 'packing', emoji: '🍦' },
  { id: 'm17', name: 'Elmalı Turta', description: 'Sıcak elmalı turta', price: 45, category: 'dessert', prepTime: 2, station: 'fryer', emoji: '🥧' },
]

export const CATEGORIES = [
  { id: 'burger', label: 'Burgerlar', emoji: '🍔' },
  { id: 'chicken', label: 'Tavuk', emoji: '🍗' },
  { id: 'sides', label: 'Yanlar', emoji: '🍟' },
  { id: 'drinks', label: 'İçecekler', emoji: '🥤' },
  { id: 'dessert', label: 'Tatlılar', emoji: '🍦' },
]
