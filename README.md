# Mutfak Nabzı

**TAB Gıda Restoran Operasyonları için Yapay Zekâ Destekli Erken Uyarı ve Karar Destek Sistemi**

---

## Proje Amacı

Restoranda sorun oluştuktan sonra raporlamak yerine, operasyonel yoğunluk, gecikme ve kapasite risklerini önceden tahmin etmek; yöneticilere uygulanabilir aksiyon önerileri sunmak.

**7 temel soru:**
1. Şu anda ne oluyor?
2. Birazdan ne olacak?
3. Neden olacak?
4. Şimdi ne yapmalıyız?
5. Öneri uygulandı mı?
6. Sonuç ne oldu?
7. Sistem bundan ne öğrendi?

---

## Teknoloji Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, Recharts
- **Backend/DB:** Supabase (PostgreSQL + Realtime)
- **Deployment:** Vercel
- **Automation:** n8n
- **AI:** Anthropic Claude / OpenAI (soyut servis katmanı)

---

## Sipariş Kanalları

| Kaynak | Tür |
|--------|-----|
| Tıkla Gelsin | Paket Servis (DELIVERY) |
| Tıkla Gelsin | Gel Al (PICKUP) |
| Normal Restoran | DINE_IN / TAKEAWAY |

---

## Local Development

```bash
git clone https://github.com/YOUR_USERNAME/mutfak-nabzi
cd mutfak-nabzi
npm install
cp .env.example .env.local
# .env.local dosyasını düzenle
npm run dev
```

---

## Environment Variables

`.env.example` dosyasını kopyalayıp `.env.local` olarak kaydet, değerleri doldur.

---

## Vercel Deploy

```bash
vercel deploy
```

Environment variable'ları Vercel dashboard'dan ekle.

---

## Mimari

```
[Mock Data / Gerçek POS]
        ↓
      n8n
        ↓
    Supabase
        ↓
  Claude / OpenAI API
        ↓
  Next.js Dashboard
```

---

## Özellikler (v1 Demo)

- ✅ 10 restoran mock data
- ✅ Operasyon Nabız Skoru (0-100)
- ✅ İstasyon bazlı yük gösterimi (Grill, Fryer, Packing, Kurye)
- ✅ Saatlik tahmin grafiği
- ✅ +15/30/60 dk ileriye dönük tahmin
- ✅ AI Operasyon Reçetesi (tıklanabilir aksiyon listesi)
- ✅ What-If Simülatör
- ✅ Canlı operasyonlar tablosu
- ✅ HQ genel bakış ekranı

## Yol Haritası

- [ ] Supabase gerçek şema + RLS
- [ ] n8n snapshot workflow
- [ ] Claude API entegrasyonu (gerçek reçete üretimi)
- [ ] Raporlar modülü
- [ ] Tahmin doğruluğu ekranı
- [ ] AI Analist (doğal dil sorgulama)
- [ ] Tıkla Gelsin API entegrasyonu
