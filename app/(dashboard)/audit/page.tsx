'use client'
import { Topbar } from '@/components/layout/topbar'
import { MEMORY_ENTRIES } from '@/data/seed/memory'
import { cn } from '@/lib/utils'

const AUDIT_LOG = [
  ...MEMORY_ENTRIES.map((m, i) => ({ id: `audit-${i}`, user: m.appliedBy, action: `Aksiyon Uygulandı: ${m.action}`, resource: m.restaurantName, timestamp: `${m.date} ${m.time}`, type: 'ACTION' as const, result: 'success' as const })),
  { id: 'audit-r1', user: 'Sistem AI', action: 'Nabız Skoru Hesaplandı', resource: 'Tüm Restoranlar', timestamp: '2026-08-27 18:30:00', type: 'SYSTEM' as const, result: 'success' as const },
  { id: 'audit-r2', user: 'Ahmet Yılmaz', action: 'Oturum Açıldı', resource: 'Panel', timestamp: '2026-08-27 08:01:14', type: 'AUTH' as const, result: 'success' as const },
  { id: 'audit-r3', user: 'n8n Workflow', action: 'Snapshot Webhook Tetiklendi', resource: '/api/webhook/snapshot', timestamp: '2026-08-27 18:25:00', type: 'WEBHOOK' as const, result: 'success' as const },
  { id: 'audit-r4', user: 'n8n Workflow', action: 'WhatsApp Alert Gönderildi', resource: 'BK Kadıköy Müdürü', timestamp: '2026-08-27 18:34:22', type: 'WEBHOOK' as const, result: 'success' as const },
].sort(() => Math.random() - 0.5)

const TYPE_COLORS = { ACTION: '#f97316', SYSTEM: '#818cf8', AUTH: '#22c55e', WEBHOOK: '#eab308' }
const RESULT_CONFIG = { success: { color: 'text-emerald-400', label: '✓' }, error: { color: 'text-red-400', label: '✗' } }

export default function AuditPage() {
  return (
    <div>
      <Topbar title="Audit Log" subtitle="Kim · Ne zaman · Ne yaptı" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <span>{AUDIT_LOG.length} kayıt</span>
          <span>·</span>
          <span>Son 7 gün</span>
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {['Zaman', 'Kullanıcı', 'Aksiyon', 'Kaynak', 'Tür', 'Sonuç'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-white/25 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOG.slice(0, 20).map(entry => {
                const typeColor = TYPE_COLORS[entry.type] ?? '#fff'
                const rc = RESULT_CONFIG[entry.result]
                return (
                  <tr key={entry.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="px-5 py-3 text-xs font-mono text-white/30">{entry.timestamp.split(' ')[1]}<div className="text-[9px] text-white/15">{entry.timestamp.split(' ')[0]}</div></td>
                    <td className="px-5 py-3 text-xs text-white/60">{entry.user}</td>
                    <td className="px-5 py-3 text-xs text-white/70 max-w-xs truncate">{entry.action}</td>
                    <td className="px-5 py-3 text-xs text-white/40">{entry.resource}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: typeColor + '15', color: typeColor, border: `1px solid ${typeColor}25` }}>{entry.type}</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold"><span className={rc.color}>{rc.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
