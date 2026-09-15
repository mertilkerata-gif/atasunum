'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAuditLogs } from '@/lib/supabase-client'
import { RefreshCw, ScrollText } from 'lucide-react'

const ACTION_BADGE: Record<string,string> = {
  LOGIN:'badge-ac', VIEW:'badge-muted', ACKNOWLEDGE:'badge-amber',
  APPLY_RECOMMENDATION:'badge-green', UPDATE_STOCK:'badge-blue',
  EXPORT:'badge-muted', RESOLVE_COMPLAINT:'badge-green',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await fetchAuditLogs(100)
    setLogs(data as any[]); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="dm">
      <Topbar title="Audit Log" subtitle="Tüm kullanıcı aksiyonları · Supabase"
        action={<button onClick={load} className="btn-ghost" style={{padding:'5px 10px',fontSize:12}}><RefreshCw size={12}/> Yenile</button>}
      />
      <div className="scroll" style={{padding:'clamp(14px,3vw,24px) clamp(14px,3vw,24px)',display:'flex',flexDirection:'column',gap:16}}>
        <div className="card" style={{ overflowX: "auto" }}>
          <div className="card-h">
            <span className="card-title">Aksiyon Geçmişi</span>
            <span className="card-meta">{logs.length} kayıt</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'160px 140px 140px 1fr',gap:0,padding:'8px 20px',borderBottom:'1px solid var(--bdr)', overflowX: "auto"}}>
            {['Zaman','Kullanıcı','Aksiyon','Detay'].map(h=>(
              <span key={h} style={{fontSize:10.5,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.06em'}}>{h}</span>
            ))}
          </div>
          {loading ? <p style={{padding:24,textAlign:'center',color:'var(--tx3)'}}>Yükleniyor…</p> :
            logs.map(log=>(
              <div key={log.id} className="row" style={{display:'grid',gridTemplateColumns:'160px 140px 140px 1fr',gap:0, overflowX: "auto"}}>
                <span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:'var(--tx3)'}}>{new Date(log.created_at).toLocaleString('tr-TR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</span>
                <span style={{fontSize:12.5,color:'var(--tx2)'}}>{log.user_role||'—'}</span>
                <span className={`badge ${ACTION_BADGE[log.action]||'badge-muted'}`} style={{width:'fit-content'}}>{log.action}</span>
                <span style={{fontSize:12,color:'var(--tx3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.resource} {log.details&&Object.keys(log.details).length?'· '+JSON.stringify(log.details).slice(0,60):''}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
