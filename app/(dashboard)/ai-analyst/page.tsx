import { Topbar } from '@/components/layout/topbar'
export default function Page() {
  const titles: Record<string, [string, string]> = {
    forecast: ['Tahmin', 'İleriye dönük operasyon tahmini'],
    reports: ['Raporlar', 'Operasyon ve performans raporları'],
    'forecast-accuracy': ['Tahmin Doğruluğu', 'MAE · MAPE · Gerçekleşen vs tahmin'],
    'ai-analyst': ['AI Analist', 'Doğal dilde operasyon analizi'],
    settings: ['Ayarlar', 'Sistem konfigürasyonu'],
  }
  const [title, subtitle] = titles['ai-analyst'] || ['ai-analyst', '']
  return (
    <div>
      <Topbar title={title} subtitle={subtitle} />
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">🚧</div>
          <div className="text-white/40 text-sm">Bu modül yakında eklenecek</div>
          <div className="text-white/20 text-xs mt-1">Phase 2+</div>
        </div>
      </div>
    </div>
  )
}
