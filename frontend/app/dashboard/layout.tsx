import type { ReactNode } from "react"
import { DashboardNav } from "@/components/dashboard-nav"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav />
      <div className="container mx-auto flex-1 p-4 md:p-6">{children}</div>
    </div>
  )
}
