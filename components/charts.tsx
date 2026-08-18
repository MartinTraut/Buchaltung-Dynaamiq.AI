"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { eur } from "@/lib/format"

const axis = {
  stroke: "rgba(255,255,255,0.32)",
  fontSize: 11.5,
  tickLine: false,
  axisLine: false,
  tick: { fill: "rgba(255,255,255,0.42)" },
}

/** Achsenbeträge: ganze Euro mit Tausenderpunkt („8.000 €"), nie „8000 €"
 *  oder Cent-Stellen — die kompakte Intl-Notation lässt unter 10.000 die
 *  Gruppierung weg und mischt dadurch zwei Formate auf einer Achse. Das
 *  geschützte Leerzeichen verhindert, dass SVG-Labels vor dem € umbrechen. */
const fmtAxis = (v: number) => `${Math.round(v).toLocaleString("de-DE")} €`

function TipBox({
  label,
  rows,
}: {
  label?: string
  rows: { name: string; value: string; color?: string }[]
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#161619]/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
      {label && (
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">
          {label}
        </p>
      )}
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 text-xs">
          {r.color && (
            <span
              className="size-2 rounded-full"
              style={{ background: r.color }}
            />
          )}
          <span className="text-muted-foreground">{r.name}</span>
          <span className="ml-auto font-semibold tnum text-foreground">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const REV_SERIES = [
  { key: "revenue", label: "Umsatz", color: "#00ffe6", grad: "rev" },
  { key: "expenses", label: "Ausgaben", color: "#6c7693", grad: "exp" },
  { key: "profit", label: "Gewinn", color: "#2fd3a5", grad: "prf" },
] as const

export const REV_SERIES_META = REV_SERIES

/**
 * Konfigurierbares Umsatz/Ausgaben/Gewinn-Chart. Jede Serie lässt sich über
 * die klickbare Legende ein-/ausblenden; die Auswahl wird persistiert.
 */
export function RevenueArea({
  data,
  visible: visibleProp,
  onToggle: onToggleProp,
}: {
  data: { label: string; revenue: number; expenses: number }[]
  visible?: Record<string, boolean>
  onToggle?: (key: string) => void
}) {
  // Unkontrollierter Fallback (z. B. Buchhaltung), kontrolliert vom Dashboard
  const [internal, setInternal] = React.useState<Record<string, boolean>>({
    revenue: true,
    expenses: true,
    profit: false,
  })
  const visible = visibleProp ?? internal
  const onToggle =
    onToggleProp ?? ((key: string) => setInternal((p) => ({ ...p, [key]: !p[key] })))
  const chartData = data.map((d) => ({ ...d, profit: d.revenue - d.expenses }))
  const shown = REV_SERIES.filter((s) => visible[s.key])
  // Ohne Buchungen skaliert die Achse sonst auf 0–4 € und wirkt kaputt —
  // stattdessen feste, glaubwürdige Skala und eine klare Leermeldung.
  const empty = data.every((d) => d.revenue === 0 && d.expenses === 0)

  return (
    <div>
      {/* Klickbare Legende = Filter */}
      <div className="mb-1 flex flex-wrap items-center gap-2 px-2">
        {REV_SERIES.map((s) => {
          const on = visible[s.key]
          return (
            <button
              key={s.key}
              onClick={() => onToggle(s.key)}
              className={
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all " +
                (on
                  ? "border-white/12 bg-white/[0.06] text-foreground"
                  : "border-white/8 text-muted-foreground/50 hover:text-muted-foreground")
              }
            >
              <span
                className="size-2 rounded-full transition-opacity"
                style={{ background: s.color, opacity: on ? 1 : 0.35 }}
              />
              {s.label}
            </button>
          )
        })}
      </div>

      <div className="relative">
      {empty && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="rounded-xl border border-white/10 bg-[#101014]/85 px-4 py-2.5 text-center backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground/85">Noch keine Buchungen im Zeitraum</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Umsätze erscheinen mit der ersten bezahlten Rechnung
            </p>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={248} className={empty ? "opacity-45" : undefined}>
        <AreaChart data={chartData} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
          <defs>
            {REV_SERIES.map((s) => (
              <linearGradient key={s.grad} id={s.grad} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.42} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis
            {...axis}
            tickFormatter={fmtAxis}
            width={70}
            domain={empty ? [0, 12000] : undefined}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.15)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipBox
                  label={String(label)}
                  rows={shown.map((s) => ({
                    name: s.label,
                    value: eur(Number(payload.find((p) => p.dataKey === s.key)?.value ?? 0)),
                    color: s.color,
                  }))}
                />
              ) : null
            }
          />
          {shown.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={s.key === "revenue" ? 2.5 : 2}
              fill={`url(#${s.grad})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}

export function MiniSpark({
  data,
  color = "#1f7bf2",
}: {
  data: number[]
  color?: string
}) {
  const chartData = data.map((v, i) => ({ i, v }))
  // Eigene Gradient-ID je Farbe — sonst teilen sich mehrere Sparks eine Füllung.
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, "")}`
  return (
    <ResponsiveContainer width="100%" height={46}>
      <AreaChart data={chartData} margin={{ top: 6, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${gid})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function PipelineBars({
  data,
}: {
  data: { label: string; value: number; count?: number; fill: string }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 22, right: 6, bottom: 0, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} tickFormatter={fmtAxis} width={70} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipBox
                label={String(label)}
                rows={[
                  { name: "Volumen", value: eur(Number(payload[0]?.value)) },
                  ...(typeof payload[0]?.payload?.count === "number"
                    ? [
                        {
                          name: "Deals",
                          value: String(payload[0].payload.count),
                        },
                      ]
                    : []),
                ]}
              />
            ) : null
          }
        />
        {/* Die Spur zeigt leere Phasen als bewusste Fläche — eine einzelne
            Säule steht sonst verloren im Nichts. Wertelabel direkt am Balken,
            damit die Zahl nicht erst an der Achse abgelesen werden muss. */}
        <Bar
          dataKey="value"
          radius={[7, 7, 2, 2]}
          maxBarSize={52}
          background={{ fill: "rgba(255,255,255,0.035)", radius: 7 }}
        >
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => (Number(v) > 0 ? fmtAxis(Number(v)) : "")}
            style={{ fill: "rgba(255,255,255,0.78)", fontSize: 11.5, fontWeight: 600 }}
          />
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DonutChart({
  data,
}: {
  data: { name: string; value: number; fill: string }[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)

  // Ohne Buchungen zeichnet Recharts gar nichts und hinterlässt 200 px Loch.
  // Stattdessen der Ring als ruhige Andeutung dessen, was hier entsteht.
  if (total <= 0) {
    return (
      <div className="grid h-[200px] place-items-center">
        <div className="relative grid size-[168px] place-items-center">
          <div className="absolute inset-0 rounded-full border-[26px] border-white/[0.045]" />
          <p className="relative max-w-[13ch] text-center text-xs leading-relaxed text-muted-foreground/70">
            Noch keine Ausgaben erfasst
          </p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={84}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox
                rows={[
                  {
                    name: String(payload[0]?.name),
                    value: `${eur(Number(payload[0]?.value))} · ${Math.round(
                      (Number(payload[0]?.value) / total) * 100,
                    )}%`,
                    color: payload[0]?.payload?.fill,
                  },
                ]}
              />
            ) : null
          }
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
