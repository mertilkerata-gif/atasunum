export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-14 bg-white/[0.04] border border-white/[0.06] rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/[0.04] border border-white/[0.06] rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-white/[0.04] border border-white/[0.06] rounded-xl" />)}
      </div>
    </div>
  )
}
