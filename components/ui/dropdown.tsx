"use client"

import * as React from "react"
import { DropdownMenu as DM } from "radix-ui"
import { cn } from "@/lib/utils"

const Dropdown = DM.Root
const DropdownTrigger = DM.Trigger

function DropdownContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-xl border border-white/10 bg-[#141418] p-1.5 shadow-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </DM.Portal>
  )
}

function DropdownItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DM.Item> & { inset?: boolean }) {
  return (
    <DM.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/90 outline-none transition-colors select-none data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground",
        // Gesperrte Einträge müssen als gesperrt zu erkennen sein — sonst wirkt
        // ein wirkungsloser Klick wie ein Fehler der App.
        "data-[disabled]:cursor-not-allowed data-[disabled]:text-muted-foreground/60 data-[disabled]:[&_svg]:text-muted-foreground/50",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  )
}

function DropdownLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return (
    <DM.Label
      className={cn(
        "px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase",
        className,
      )}
      {...props}
    />
  )
}

function DropdownSeparator(props: React.ComponentProps<typeof DM.Separator>) {
  return <DM.Separator className="my-1 h-px bg-white/8" {...props} />
}

export {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
}
