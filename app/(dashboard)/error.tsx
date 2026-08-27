'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-4" />
        <div className="text-white font-semibold mb-2">Bir hata oluştu</div>
        <div className="text-white/40 text-sm mb-5">{error.message}</div>
        <button onClick={reset} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors mx-auto">
          <RefreshCw className="w-4 h-4" /> Tekrar Dene
        </button>
      </div>
    </div>
  )
}
