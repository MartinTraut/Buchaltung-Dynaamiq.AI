"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dialog as DialogPrimitive } from "radix-ui"
import { AnimatePresence, motion } from "motion/react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_MORE } from "./nav"

/**
 * Bottom-Sheet für die restlichen Module auf dem Phone.
 * Radix Dialog (Fokus-Trap, ESC, a11y) + motion/react (Spring, Drag-to-dismiss).
 */
export function MoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content
                asChild
                forceMount
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 420, damping: 40 }}
                  drag="y"
                  dragConstraints={{ top: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 96 || info.velocity.y > 600) onOpenChange(false)
                  }}
                  className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-[#111114] pb-[max(1rem,env(safe-area-inset-bottom))] outline-none"
                >
                  {/* Grabber */}
                  <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20" />
                  <DialogPrimitive.Title className="sr-only">
                    Weitere Module
                  </DialogPrimitive.Title>

                  {/* Suche → Command-Palette */}
                  <div className="px-4 pt-4">
                    <button
                      onClick={() => {
                        onOpenChange(false)
                        window.dispatchEvent(new Event("open-command"))
                      }}
                      className="flex h-12 w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-muted-foreground transition-colors active:bg-white/[0.06]"
                    >
                      <Search className="size-[18px] shrink-0" />
                      <span className="text-base">Suchen oder springen…</span>
                    </button>
                  </div>

                  {/* Restmodule als 3-Spalten-Grid */}
                  <div className="grid grid-cols-3 gap-2 p-4">
                    {NAV_MORE.map(({ href, label, icon: Icon }) => {
                      const active = pathname.startsWith(href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => onOpenChange(false)}
                          className={cn(
                            "flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-95",
                            active
                              ? "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan"
                              : "border-white/[0.06] bg-white/[0.03] text-foreground/80 active:bg-white/[0.06]",
                          )}
                        >
                          <Icon className="size-5" />
                          <span className="text-[12px] font-medium">{label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
