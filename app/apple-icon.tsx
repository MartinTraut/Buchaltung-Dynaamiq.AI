import { ImageResponse } from "next/og"
import { readFileSync } from "fs"
import { join } from "path"

// Apple-Touch-Icon (Homescreen): gleiches smoothes Schwarz-Cyan-Motiv, größer.
export const runtime = "nodejs"
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
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
          borderRadius: 40,
          background:
            "radial-gradient(70% 60% at 50% 38%, #07252e 0%, #070a12 55%, #050506 100%)",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 132,
            height: 132,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(0,255,230,0.38), rgba(0,255,230,0) 70%)",
          }}
        />
        <img src={src} alt="" width={118} height={118} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size },
  )
}
