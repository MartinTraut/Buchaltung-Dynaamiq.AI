import type { Metadata, Viewport } from "next"
import { Sora, Manrope, JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"

const fontDisplay = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
})

const fontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
})

// viewport-fit=cover → env(safe-area-inset-*) liefert echte Werte (iPhone-Notch/Home-Bar)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08080a",
}

export const metadata: Metadata = {
  title: "DYNAAMIQ AI — Business Cockpit",
  description:
    "All-in-One Buchhaltung, CRM, Pipeline & KI-gestützte Angebote für DYNAAMIQ AI — Webdesign & KI-Automatisierung.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={cn(
        "dark antialiased",
        fontDisplay.variable,
        fontSans.variable,
        fontMono.variable,
      )}
    >
      <body className="font-sans">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "border border-white/10 bg-[#16161a] text-foreground shadow-2xl backdrop-blur-xl",
            },
          }}
        />
      </body>
    </html>
  )
}
