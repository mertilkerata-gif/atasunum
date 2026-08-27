# n8n Entegrasyon Kılavuzu — Mutfak Nabzı

## API Endpoint Referansı

| Method | Endpoint | Açıklama | Auth Header |
|---|---|---|---|
| POST | `/api/webhook/snapshot` | 5dk POS snapshot → nabız hesapla | `x-webhook-secret` |
| GET | `/api/webhook/snapshot` | Endpoint sağlık kontrolü | — |
| POST | `/api/webhook/order-event` | KDS/POS sipariş event | `x-webhook-secret` |
| GET | `/api/pulse/all` | Tüm restoranlar nabız | `x-api-key` |
| GET | `/api/pulse/[id]` | Tek restoran nabız | `x-api-key` |
| POST | `/api/recommendations/generate` | OpenAI reçete üret | `x-webhook-secret` |
| POST | `/api/recommendations/[id]/action` | Aksiyon uygulandı/uygulanmadı | `x-api-key` |
| GET | `/api/reports/daily` | Günlük rapor (AI özet dahil) | `x-api-key` |
| POST | `/api/simulate` | What-If server-side hesapla | `x-api-key` |

## Workflow 1 — 5 Dakikalık Snapshot (n8n)

```
Schedule (*/5 dakika)
  → HTTP GET POS API (her restoran)
  → Function: POS formatını Mutfak Nabzı formatına dönüştür
  → HTTP POST /api/webhook/snapshot  [x-webhook-secret header]
  → IF response.data.pulse_score >= 60
      → HTTP POST /api/recommendations/generate
      → IF pulse_score >= 80
          → WhatsApp / Slack Alert
```

### n8n HTTP Node — Snapshot Payload Örneği
```json
{
  "restaurant_id": "r1",
  "open_orders": 28,
  "orders_last_5m": 8,
  "orders_last_15m": 22,
  "avg_preparation_time": 11.2,
  "avg_packing_time": 4.8,
  "avg_courier_wait": 8.1,
  "grill_load": 88,
  "fryer_load": 72,
  "packing_load": 94,
  "courier_load": 81,
  "active_staff": 6,
  "delay_rate": 0.18,
  "cancellation_rate": 0.07,
  "rain_intensity": 7,
  "campaign_active": true
}
```

### Dönüş (başarılı):
```json
{
  "success": true,
  "data": {
    "pulse_score": 84,
    "risk_level": "KRITIK",
    "alert_triggered": true,
    "alerts": [{ "type": "KRITIK_PULSE", "score": 84 }],
    "station_scores": { "grill": 88, "fryer": 72, "packing": 94, "courier": 81 },
    "top_signals": ["Packing %94 yükle çalışıyor", "Kurye bekleme 8.1 dk"]
  }
}
```

## Workflow 2 — Sipariş Event (KDS → n8n → Mutfak Nabzı)

```
KDS Webhook → n8n
  → Function: KDS event formatını dönüştür
  → HTTP POST /api/webhook/order-event  [x-webhook-secret]
```

### Order Event Payload:
```json
{
  "order_id": "TG-A1B2C3",
  "restaurant_id": "r1",
  "event_type": "PREPARATION_STARTED",
  "timestamp": "2026-08-27T18:32:00.000Z",
  "metadata": {
    "channel": "TIKLAGELSIN_DELIVERY",
    "staff_id": "staff_042"
  }
}
```

## Workflow 3 — Sabah Rapor Maili

```
Schedule (08:00)
  → HTTP GET /api/reports/daily?ai=true  [x-api-key]
  → Function: HTML mail oluştur
  → Send Email
```

## Ortam Değişkenleri

| n8n Değişkeni | Açıklama |
|---|---|
| `MUTFAK_NABZI_URL` | `https://yourapp.vercel.app` |
| `N8N_WEBHOOK_SECRET` | .env.local ile aynı değer |
| `MUTFAK_NABZI_API_KEY` | .env.local ile aynı değer |
