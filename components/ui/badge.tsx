import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white/5 text-foreground border border-white/10",
        muted: "bg-white/5 text-muted-foreground border border-white/8",
        success:
          "bg-[#2fd3a5]/12 text-[#3ee3b5] border border-[#2fd3a5]/25",
        warning: "bg-[#ffb02e]/12 text-[#ffc35c] border border-[#ffb02e]/25",
        danger: "bg-[#ff4d4d]/12 text-[#ff7a7a] border border-[#ff4d4d]/25",
        brand:
          "bg-brand-blue/12 text-brand-blue border border-brand-blue/25",
        pink: "bg-brand-cyan/12 text-brand-cyan border border-brand-cyan/25",
        violet: "bg-[#8b5cf6]/12 text-[#a78bfa] border border-[#8b5cf6]/25",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
