import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { alpha, ease } from '../ui'

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

function smooth(pts: [number, number][]) {
  if (!pts.length) return ''
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join('')
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const t = 0.16
    d += `C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

const AXIS = 'var(--label-3)'
const GRID = 'var(--sep)'

// ── Sparkline ─────────────────────────────────────────────────────────
export function Sparkline({ data, color, height = 36, fill = true }: { data: number[]; color: string; height?: number; fill?: boolean }) {
  const [ref, { w }] = useSize<HTMLDivElement>()
  const id = useId().replace(/:/g, '')
  const min = Math.min(...data)
  const max = Math.max(...data)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, 3 + (1 - (v - min) / (max - min || 1)) * (height - 6)] as [number, number])
  const d = smooth(pts)
  const last = pts[pts.length - 1]
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} className="overflow-visible">
          <defs>
            <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {fill && <path d={`${d}L${w},${height}L0,${height}Z`} fill={`url(#s${id})`} />}
          <path d={d} fill="none" strokeWidth={1.75} strokeLinecap="round" style={{ stroke: color }} />
          {last && <circle cx={last[0]} cy={last[1]} r={3} strokeWidth={2} style={{ fill: color, stroke: 'var(--surface)' }} />}
        </svg>
      )}
    </div>
  )
}

// ── Line chart ────────────────────────────────────────────────────────
export interface Series {
  name: string
  data: number[]
  color: string
  dashed?: boolean
  area?: boolean
  band?: { lo: number; hi: number }[]
  bandOffset?: number
  offset?: number
  faint?: boolean
}
export function LineChart({
  series,
  height = 220,
  yMin,
  yMax,
  xLabels,
  splitAt,
  unit = '',
  decimals = 0,
  ticks = 4,
  markers,
  splitLabel = 'Forecast',
}: {
  series: Series[]
  height?: number
  yMin?: number
  yMax?: number
  xLabels?: string[]
  splitAt?: number
  unit?: string
  decimals?: number
  ticks?: number
  markers?: { x: number; label: string; color?: string }[]
  splitLabel?: string
}) {
  const [ref, { w }] = useSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const uid = useId().replace(/:/g, '')
  const pad = { l: 8, r: 40, t: 12, b: xLabels ? 24 : 8 }
  const n = Math.max(...series.map((s) => (s.offset || 0) + s.data.length))
  const all = series.flatMap((s) => [...s.data, ...(s.band?.flatMap((b) => [b.lo, b.hi]) ?? [])])
  const span = Math.max(...all) - Math.min(...all) || 1
  const lo = yMin ?? Math.min(...all) - span * 0.08
  const hi = yMax ?? Math.max(...all) + span * 0.08
  const X = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r)
  const Y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (height - pad.t - pad.b)
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks)
  const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })

  return (
    <div
      ref={ref}
      className="relative w-full select-none"
      style={{ height }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const i = Math.round(((e.clientX - r.left - pad.l) / (w - pad.l - pad.r)) * (n - 1))
        setHover(Math.max(0, Math.min(n - 1, i)))
      }}
      onPointerLeave={() => setHover(null)}
    >
      {w > 0 && (
        <svg width={w} height={height} className="overflow-visible">
          <defs>
            {series.map((s, k) => (
              <linearGradient key={k} id={`g${uid}${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.2 }} />
                <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0 }} />
              </linearGradient>
            ))}
          </defs>
          {tickVals.map((v, i) => (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} strokeDasharray={i === 0 ? undefined : '2 3'} style={{ stroke: GRID }} />
              <text x={w - pad.r + 8} y={Y(v) + 4} fontSize={11} className="tnum" style={{ fill: AXIS }}>
                {fmt(v)}
              </text>
            </g>
          ))}
          {splitAt !== undefined && (
            <g>
              <rect x={X(splitAt)} y={pad.t} width={w - pad.r - X(splitAt)} height={height - pad.t - pad.b} style={{ fill: 'var(--fill-2)' }} rx={6} />
              <text x={X(splitAt) + 8} y={pad.t + 15} fontSize={11} fontWeight={600} style={{ fill: 'var(--label-2)' }}>
                {splitLabel}
              </text>
            </g>
          )}
          {markers?.map((m, i) => (
            <circle key={i} cx={X(m.x)} cy={height - pad.b - 4} r={3} style={{ fill: m.color || 'var(--bad)' }} />
          ))}
          {series.map((s, k) => {
            const off = s.offset || 0
            const pts = s.data.map((v, i) => [X(i + off), Y(v)] as [number, number])
            const d = smooth(pts)
            const bo = s.bandOffset ?? off
            return (
              <g key={k} opacity={s.faint ? 0.55 : 1}>
                {s.band && (
                  <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    d={`${smooth(s.band.map((b, i) => [X(i + bo), Y(b.hi)]))}L${s.band
                      .map((b, i) => [X(i + bo), Y(b.lo)] as [number, number])
                      .reverse()
                      .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
                      .join('L')}Z`}
                    style={{ fill: alpha(s.color, 14) }}
                  />
                )}
                {s.area && pts.length > 1 && <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} d={`${d}L${pts[pts.length - 1][0]},${height - pad.b}L${pts[0][0]},${height - pad.b}Z`} fill={`url(#g${uid}${k})`} />}
                <motion.path
                  d={d}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '4 5' : undefined}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease, delay: k * 0.08 }}
                  style={{ stroke: s.color }}
                />
              </g>
            )
          })}
          {xLabels?.map((l, i) =>
            l ? (
              <text key={i} x={X(i)} y={height - 6} fontSize={11} textAnchor="middle" className="tnum" style={{ fill: AXIS }}>
                {l}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <g>
              <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={height - pad.b} strokeWidth={1} style={{ stroke: 'var(--sep-strong)' }} />
              {series.map((s, k) => {
                const i = hover - (s.offset || 0)
                if (i < 0 || i >= s.data.length) return null
                return <circle key={k} cx={X(hover)} cy={Y(s.data[i])} r={4.5} strokeWidth={2.5} style={{ fill: s.color, stroke: 'var(--surface)' }} />
              })}
            </g>
          )}
        </svg>
      )}
      <AnimatePresence>
        {hover !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1, x: Math.min(Math.max(X(hover) - 80, 0), w - 170) }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="absolute -top-2 left-0 z-10 pointer-events-none min-w-[150px] rounded-xl px-3 py-2 bg-surface shadow-[var(--shadow-lg)] outline outline-1 outline-[var(--card-border)]"
          >
            {xLabels?.[hover] !== undefined && <div className="t-footnote text-label-2 mb-0.5">{xLabels[hover] || `Point ${hover + 1}`}</div>}
            {series
              .filter((s) => !s.faint || series.length < 3)
              .map((s, k) => {
                const i = hover - (s.offset || 0)
                if (i < 0 || i >= s.data.length) return null
                return (
                  <div key={k} className="flex items-center gap-2 t-subhead">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-label-2">{s.name}</span>
                    <span className="ml-auto font-semibold tnum">
                      {fmt(s.data[i])}
                      {unit}
                    </span>
                  </div>
                )
              })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Bars ──────────────────────────────────────────────────────────────
export function Bars({
  data,
  height = 140,
  color,
  colorFn,
  labels,
  target,
  max,
  format = (v: number) => v.toFixed(v < 20 ? 1 : 0),
  tipLabels,
}: {
  data: number[]
  height?: number
  color: string
  colorFn?: (v: number, i: number) => string
  labels?: string[]
  target?: number
  max?: number
  format?: (v: number) => string
  tipLabels?: string[]
}) {
  const [ref, { w }] = useSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const m = max ?? Math.max(...data, target ?? 0) * 1.1
  const bw = w / data.length
  const lb = labels ? 20 : 0
  const H = height - lb
  const barW = Math.max(2, Math.min(bw * 0.62, 28))
  return (
    <div ref={ref} className="w-full relative" style={{ height }} onPointerLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height}>
          <line x1={0} x2={w} y1={H} y2={H} style={{ stroke: GRID }} />
          {target !== undefined && <line x1={0} x2={w} y1={H - (target / m) * H} y2={H - (target / m) * H} strokeDasharray="3 4" strokeWidth={1.25} style={{ stroke: 'var(--label-3)' }} />}
          {data.map((v, i) => {
            const h = Math.max(2, (v / m) * H)
            const c = colorFn ? colorFn(v, i) : color
            return (
              <g key={i} onPointerEnter={() => setHover(i)}>
                <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
                <motion.rect
                  x={i * bw + (bw - barW) / 2}
                  width={barW}
                  rx={Math.min(4, barW / 2)}
                  initial={{ height: 0, y: H }}
                  animate={{ height: h, y: H - h }}
                  transition={{ type: 'spring', stiffness: 180, damping: 22, delay: i * 0.012 }}
                  style={{ fill: c, opacity: hover === null || hover === i ? 1 : 0.35, transition: 'opacity .2s' }}
                />
                {labels?.[i] && (
                  <text x={i * bw + bw / 2} y={height - 4} fontSize={11} textAnchor="middle" className="tnum" style={{ fill: AXIS }}>
                    {labels[i]}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      <AnimatePresence>
        {hover !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, x: Math.min(Math.max(hover * bw + bw / 2 - 40, 0), w - 80) }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="absolute -top-7 left-0 w-20 text-center pointer-events-none"
          >
            <span className="inline-block px-2 py-0.5 rounded-md bg-surface shadow-[var(--shadow-lg)] t-footnote font-semibold tnum">
              {format(data[hover])}
              {tipLabels?.[hover] && <span className="text-label-2 font-normal"> · {tipLabels[hover]}</span>}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Radar ─────────────────────────────────────────────────────────────
export function Radar({ axes, size = 240, color, compare, compareColor = 'var(--label-3)' }: { axes: { label: string; value: number }[]; size?: number; color: string; compare?: number[]; compareColor?: string }) {
  const c = size / 2
  const r = size / 2 - 34
  const pt = (i: number, v: number) => {
    const a = (i / axes.length) * Math.PI * 2 - Math.PI / 2
    return [c + Math.cos(a) * r * (v / 100), c + Math.sin(a) * r * (v / 100)] as [number, number]
  }
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, Math.max(2, v)).join(',')).join(' ')
  return (
    <svg width={size} height={size} className="overflow-visible max-w-full">
      {[33, 66, 100].map((g) => (
        <polygon key={g} points={poly(axes.map(() => g))} fill="none" style={{ stroke: GRID }} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 100)
        const [lx, ly] = pt(i, 120)
        return (
          <g key={i}>
            <line x1={c} y1={c} x2={x} y2={y} style={{ stroke: GRID }} />
            <text x={lx} y={ly + 4} fontSize={11} fontWeight={500} textAnchor="middle" style={{ fill: 'var(--label-2)' }}>
              {a.label}
            </text>
          </g>
        )
      })}
      {compare && <polygon points={poly(compare)} strokeDasharray="3 3" strokeWidth={1.5} style={{ fill: 'transparent', stroke: compareColor }} />}
      <motion.polygon
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        style={{ transformOrigin: `${c}px ${c}px`, fill: alpha(color, 18), stroke: color }}
        points={poly(axes.map((a) => a.value))}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {axes.map((a, i) => {
        const [x, y] = pt(i, Math.max(2, a.value))
        return <circle key={i} cx={x} cy={y} r={3.5} strokeWidth={2} style={{ fill: color, stroke: 'var(--surface)' }} />
      })}
    </svg>
  )
}

// ── Donut ─────────────────────────────────────────────────────────────
export function Donut({ segments, size = 160, thickness = 16, children }: { segments: { value: number; color: string }[]; size?: number; thickness?: number; children?: ReactNode }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const r = (size - thickness) / 2
  const C = 2 * Math.PI * r
  const gap = 4
  let acc = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((s, i) => {
          const len = (s.value / total) * C
          const el = (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={thickness}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: -acc }}
              animate={{ strokeDasharray: `${Math.max(0.1, len - gap - thickness * 0.6)} ${C}`, strokeDashoffset: -acc - thickness * 0.3 }}
              transition={{ duration: 1, delay: 0.1 + i * 0.12, ease }}
              style={{ stroke: s.color }}
            />
          )
          acc += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

// ── Correlation matrix ────────────────────────────────────────────────
export function Heatmap({ matrix, labels, size = 380 }: { matrix: number[][]; labels: string[]; size?: number }) {
  const [hover, setHover] = useState<[number, number] | null>(null)
  const n = labels.length
  const pad = 46
  const cell = (size - pad) / n
  const col = (r: number) => (r >= 0 ? alpha('var(--accent)', Math.round(Math.abs(r) * 90 + 4)) : alpha('var(--activity)', Math.round(Math.abs(r) * 90 + 4)))
  return (
    <div className="relative max-w-full overflow-x-auto" style={{ width: size }}>
      <svg width={size} height={size}>
        {labels.map((l, i) => (
          <g key={i}>
            <text x={pad - 8} y={pad + i * cell + cell / 2 + 4} fontSize={10.5} fontWeight={hover?.[0] === i ? 600 : 400} textAnchor="end" style={{ fill: hover?.[0] === i ? 'var(--label)' : 'var(--label-2)' }}>
              {l}
            </text>
            <text x={pad + i * cell + cell / 2} y={pad - 8} fontSize={10.5} fontWeight={hover?.[1] === i ? 600 : 400} textAnchor="start" transform={`rotate(-50 ${pad + i * cell + cell / 2} ${pad - 8})`} style={{ fill: hover?.[1] === i ? 'var(--label)' : 'var(--label-2)' }}>
              {l}
            </text>
          </g>
        ))}
        {matrix.map((row, i) =>
          row.map((r, j) => (
            <motion.rect
              key={`${i}-${j}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (i + j) * 0.018, type: 'spring', stiffness: 300, damping: 24 }}
              x={pad + j * cell + 1.5}
              y={pad + i * cell + 1.5}
              width={cell - 3}
              height={cell - 3}
              rx={4}
              style={{ fill: i === j ? 'var(--fill-2)' : col(r), stroke: hover && hover[0] === i && hover[1] === j ? 'var(--label)' : 'none', strokeWidth: 1.5, transformOrigin: `${pad + j * cell + cell / 2}px ${pad + i * cell + cell / 2}px` }}
              onPointerEnter={() => setHover([i, j])}
              onPointerLeave={() => setHover(null)}
            />
          )),
        )}
      </svg>
      <AnimatePresence>
        {hover && hover[0] !== hover[1] && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-0 right-0 rounded-xl px-3 py-2 bg-surface shadow-[var(--shadow-lg)] pointer-events-none">
            <div className="t-footnote text-label-2">
              {labels[hover[0]]} × {labels[hover[1]]}
            </div>
            <div className="num text-[20px] font-semibold">r = {matrix[hover[0]][hover[1]].toFixed(2)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Calendar heat ─────────────────────────────────────────────────────
export function CalendarHeat({ values, color, max }: { values: number[]; color: string; max?: number }) {
  const m = max ?? Math.max(...values)
  const mn = Math.min(...values)
  const weeks = Math.ceil(values.length / 7)
  return (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, 14px)', gridAutoFlow: 'column' }}>
      {values.map((v, i) => {
        const t = (v - mn) / (m - mn || 1)
        return (
          <motion.div
            key={i}
            title={`${Math.round(v).toLocaleString()} steps`}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.floor(i / 7) * 0.025 + (i % 7) * 0.008, type: 'spring', stiffness: 400, damping: 22 }}
            className="rounded-[3px]"
            style={{ background: alpha(color, Math.round(10 + t * 90)) }}
          />
        )
      })}
    </div>
  )
}
