import { ImageResponse } from "next/og"
import { readFileSync } from "fs"
import { join } from "path"

// Smoothes Browser-Tab-Icon: tiefes Schwarz + dezenter Cyan-Glow,
// das DYNAAMIQ-Symbol zentriert, weich abgerundet.
export const runtime = "nodejs"
export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  const logo = readFileSync(join(process.cwd(), "public/logo-mark.svg"))
  const src = `data:image/svg+xml;base64,${logo.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          background:
            "radial-gradient(70% 60% at 50% 38%, #06222a 0%, #070a12 55%, #050506 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* weicher Glow hinter dem Symbol */}
        <div
          style={{
            position: "absolute",
            width: 46,
            height: 46,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(0,255,230,0.4), rgba(0,255,230,0) 70%)",
          }}
        />
        <img
          src={src}
          alt=""
          width={42}
          height={42}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size },
  )
}
