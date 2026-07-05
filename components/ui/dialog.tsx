"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: "sm" | "md" | "lg" | "xl"
}) {
  // Max-Breiten erst ab sm — auf dem Phone füllt das Sheet die volle Breite
  const widths = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
  }
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content
        className={cn(
          // Phone: Bottom-Sheet — volle Breite, von unten einfahrend, Safe-Area unten
          "fixed inset-x-0 bottom-0 z-50 grid w-full gap-4 rounded-t-2xl border border-white/10 bg-[#111114] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
          "max-h-[92dvh] overflow-y-auto",
          // ab sm: zentriertes Dialog-Fenster (unveränderter Ist-Zustand)
          "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100vw-2rem)] sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          // Phone slidet, Desktop zoomt — sonst zoomt das Sheet statt zu sliden
          "data-[state=open]:slide-in-from-bottom-1/2 data-[state=closed]:slide-out-to-bottom-1/2 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:zoom-in-95",
          widths[size],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground opacity-70 transition hover:bg-white/5 hover:opacity-100">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 pr-6", className)} {...props} />
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-display text-lg font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        // Phone: sticky am Sheet-Boden (lange Formulare), ab sm normaler Footer
        "sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t border-white/10 bg-[#111114] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        "sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2",
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}
