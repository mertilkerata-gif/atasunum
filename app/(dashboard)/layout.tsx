import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dw">
      <Sidebar />
      <div className="dm">
        {children}
      </div>
    </div>
  )
}
