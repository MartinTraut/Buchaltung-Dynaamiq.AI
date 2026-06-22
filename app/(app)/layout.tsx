import { StoreProvider } from "@/lib/store"
import { ConfirmProvider } from "@/lib/confirm"
import { Sidebar } from "@/components/app-shell/sidebar"
import { Topbar } from "@/components/app-shell/topbar"
import { MobileNav } from "@/components/app-shell/mobile-nav"
import { CommandPalette } from "@/components/command-palette"
import { AuroraBackground } from "@/components/app-shell/aurora-bg"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StoreProvider>
      <ConfirmProvider>
        <AuroraBackground />
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 px-4 pb-24 pt-7 sm:px-5 lg:px-8 lg:pb-12">
              {children}
            </main>
            <MobileNav />
          </div>
        </div>
        <CommandPalette />
      </ConfirmProvider>
    </StoreProvider>
  )
}
