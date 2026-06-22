"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
  { key: "revenue", label: "Umsatz", color: "#ff2d7e", grad: "rev" },
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

      <ResponsiveContainer width="100%" height={248}>
        <AreaChart data={chartData} margin={{ top: 8, right: 6, bottom: 0, left: -16 }}>
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
          <YAxis {...axis} tickFormatter={(v) => eur(Number(v), { compact: true })} width={56} />
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
  )
}

export function MiniSpark({
  data,
  color = "#ff6a00",
}: {
  data: number[]
  color?: string
}) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PipelineBars({
  data,
}: {
  data: { label: string; value: number; fill: string }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -16 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />
        <XAxis dataKey="label" {...axis} />
        <YAxis
          {...axis}
          tickFormatter={(v) => eur(Number(v), { compact: true })}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipBox
                label={String(label)}
                rows={[
                  { name: "Volumen", value: eur(Number(payload[0]?.value)) },
                ]}
              />
            ) : null
          }
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
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
