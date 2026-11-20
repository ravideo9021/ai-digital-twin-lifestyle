import { animate, motion } from 'motion/react'
import { useEffect, useId, useRef, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export type IconType = ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: CSSProperties }>

/** Semantic domain colours (CSS variables, theme-aware). */
export const C = {
  accent: 'var(--accent)',
  sleep: 'var(--sleep)',
  activity: 'var(--activity)',
  nutrition: 'var(--nutrition)',
  mind: 'var(--mind)',
  heart: 'var(--heart)',
  good: 'var(--good)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
  label2: 'var(--label-2)',
  label3: 'var(--label-3)',
} as const

export const alpha = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`

export const ease = [0.22, 1, 0.36, 1] as const
export const spring = { type: 'spring', stiffness: 420, damping: 36 } as const

/** Quality of a 0–100 score → semantic colour */
export const scoreColor = (v: number) => (v >= 75 ? C.good : v >= 55 ? C.accent : v >= 40 ? C.warn : C.bad)
export const riskColor = (p: number) => (p >= 0.55 ? C.bad : p >= 0.35 ? C.warn : C.good)
export const riskWord = (p: number) => (p >= 0.55 ? 'High' : p >= 0.35 ? 'Moderate' : 'Low')

export function fmtDuration(hours: number) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return { h, m: m === 60 ? 0 : m }
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({
  title,
  icon: Icon,
  tint = C.accent,
  meta,
  action,
  onAction,
  children,
  className = '',
  pad,
  delay = 0,
  style,
  interactive,
  onClick,
}: {
  title?: ReactNode
  icon?: IconType
  tint?: string
  meta?: ReactNode
  action?: string
  onAction?: () => void
  children?: ReactNode
  className?: string
  pad?: string
  delay?: number
  style?: CSSProperties
  interactive?: boolean
  onClick?: () => void
}) {
  const hasHeader = Boolean(title || meta || action)
  const bodyPad = pad ?? (hasHeader ? 'px-5 pb-5 pt-2' : 'p-5')
  return (
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.9, delay }}
      whileHover={interactive ? { y: -3, transition: spring } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      onClick={onClick}
      className={`card flex flex-col min-w-0 ${interactive ? 'cursor-pointer hover:shadow-[var(--shadow-lg)] transition-shadow duration-300' : ''} ${className}`}
      style={style}
    >
      {hasHeader && (
        <header className="flex items-center gap-2.5 px-5 pt-4 pb-1 min-h-[44px]">
          {Icon && (
            <span className="w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0" style={{ background: alpha(tint, 14), color: tint }}>
              <Icon size={14} strokeWidth={2.2} />
            </span>
          )}
          {title && <h3 className="t-headline truncate" style={{ color: Icon ? tint : undefined }}>{title}</h3>}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {meta && <span className="t-footnote text-label-2">{meta}</span>}
            {action && (
              <button onClick={(e) => { e.stopPropagation(); onAction?.() }} className="flex items-center gap-0.5 t-subhead text-label-2 hover:text-label transition-colors">
                {action}
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </header>
      )}
      <div className={`flex-1 min-h-0 ${bodyPad}`}>{children}</div>
    </motion.section>
  )
}

// ── Page header ───────────────────────────────────────────────────────
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.header initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 mb-6">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <div className="t-subhead font-semibold text-label-2 mb-1">{eyebrow}</div>}
        <h1 className="t-large">{title}</h1>
        {subtitle && <p className="t-body text-label-2 mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  )
}

// ── Animated number ───────────────────────────────────────────────────
export function Counter({ value, decimals = 0, className = '' }: { value: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef<number | null>(null)
  useEffect(() => {
    const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    if (prev.current === null) {
      prev.current = value
      if (ref.current) ref.current.textContent = fmt(value)
      return
    }
    const c = animate(prev.current, value, { duration: 0.8, ease, onUpdate: (v) => ref.current && (ref.current.textContent = fmt(v)) })
    prev.current = value
    return () => c.stop()
  }, [value, decimals])
  return <span ref={ref} className={`tnum ${className}`} />
}

// ── Metric value with unit ────────────────────────────────────────────
export function Metric({ value, unit, size = 'md', color, className = '' }: { value: ReactNode; unit?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; color?: string; className?: string }) {
  const vs = { sm: 'text-[20px]', md: 'text-[28px]', lg: 'text-[36px]', xl: 'text-[52px]' }[size]
  const us = { sm: 'text-[13px]', md: 'text-[15px]', lg: 'text-[17px]', xl: 'text-[20px]' }[size]
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <span className={`num font-semibold leading-none ${vs}`} style={{ color }}>
        {value}
      </span>
      {unit && <span className={`font-semibold text-label-2 ${us}`}>{unit}</span>}
    </span>
  )
}

export function Duration({ hours, size = 'md' }: { hours: number; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const { h, m } = fmtDuration(hours)
  return (
    <span className="inline-flex items-baseline gap-1">
      <Metric value={h} unit="hr" size={size} />
      <Metric value={m} unit="min" size={size} />
    </span>
  )
}

// ── Ring ──────────────────────────────────────────────────────────────
export function Ring({ value, size = 120, stroke = 12, color = C.accent, children, delay = 0 }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; delay?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: alpha(color, 16) }} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v / 100) }}
          transition={{ duration: 1.2, delay, ease }}
          style={{ stroke: color }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────
export function Bar({ value, color = C.accent, height = 6, delay = 0 }: { value: number; color?: string; height?: number; delay?: number }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: alpha(color, 14) }}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: 0.9, delay, ease }} />
    </div>
  )
}

// ── Delta (trend) ─────────────────────────────────────────────────────
export function Delta({ value, invert = false, suffix = '', decimals = 1, className = '' }: { value: number; invert?: boolean; suffix?: string; decimals?: number; className?: string }) {
  const good = invert ? value < 0 : value > 0
  const flat = Math.abs(value) < Math.pow(10, -decimals) / 2
  const color = flat ? C.label2 : good ? C.good : C.bad
  return (
    <span className={`inline-flex items-center gap-0.5 t-footnote font-semibold tnum ${className}`} style={{ color }}>
      {!flat && (
        <svg width="8" height="8" viewBox="0 0 8 8" style={{ transform: value < 0 ? 'rotate(180deg)' : undefined }}>
          <path d="M4 1 L7.5 6.5 L0.5 6.5 Z" fill="currentColor" />
        </svg>
      )}
      {Math.abs(value).toFixed(decimals)}
      {suffix}
    </span>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────
export function Badge({ children, color = C.label2, solid }: { children: ReactNode; color?: string; solid?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full t-footnote font-semibold whitespace-nowrap" style={{ background: solid ? color : alpha(color, 13), color: solid ? '#fff' : color }}>
      {children}
    </span>
  )
}

export function StatusDot({ color = C.good, pulse }: { color?: string; pulse?: boolean }) {
  return <span className={`inline-block w-[7px] h-[7px] rounded-full ${pulse ? 'pulse-dot' : ''}`} style={{ background: color }} />
}

// ── Segmented control ─────────────────────────────────────────────────
export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  const id = useId()
  return (
    <div className={`inline-flex p-[2px] rounded-[9px] bg-fill ${size === 'sm' ? 'h-7' : 'h-8'}`} role="tablist">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} role="tab" aria-selected={on} onClick={() => onChange(o.value)} className={`relative px-3 rounded-[7px] t-subhead font-medium whitespace-nowrap transition-colors ${on ? 'text-label' : 'text-label-2 hover:text-label'}`}>
            {on && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-[7px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)] dark:bg-[#636366]" />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Labelled row inside lists ─────────────────────────────────────────
export function Row({ label, value, sub, icon: Icon, tint, onClick, last }: { label: ReactNode; value?: ReactNode; sub?: ReactNode; icon?: IconType; tint?: string; onClick?: () => void; last?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`w-full flex items-center gap-3 py-2.5 text-left ${last ? '' : 'border-b border-sep'} ${onClick ? 'group' : ''}`}>
      {Icon && (
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: alpha(tint || C.accent, 14), color: tint || C.accent }}>
          <Icon size={15} strokeWidth={2} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="t-callout truncate">{label}</div>
        {sub && <div className="t-footnote text-label-2 truncate">{sub}</div>}
      </div>
      {value !== undefined && <div className="t-callout text-label-2 tnum shrink-0">{value}</div>}
      {onClick && <ChevronRight size={15} className="text-label-3 group-hover:text-label-2 shrink-0" />}
    </Tag>
  )
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean; dot?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 t-footnote text-label-2">
          {it.dot ? (
            <span className="w-2 h-2 rounded-full" style={{ background: it.color }} />
          ) : (
            <span className="w-3.5 h-[2.5px] rounded-full" style={{ background: it.dashed ? `repeating-linear-gradient(90deg, ${it.color} 0 3px, transparent 3px 5px)` : it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  )
}

export function Stat({ label, children, sub }: { label: ReactNode; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="t-footnote font-medium text-label-2 truncate">{label}</div>
      <div className="mt-1">{children}</div>
      {sub && <div className="t-footnote text-label-2 mt-1">{sub}</div>}
    </div>
  )
}
