import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  Activity,
  Apple,
  BedDouble,
  Bell,
  BrainCircuit,
  Check,
  Coffee,
  CornerDownLeft,
  Cpu,
  Droplet,
  FlaskConical,
  Footprints,
  LayoutGrid,
  Lightbulb,
  MessageCircle,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
  TrendingUp,
  Utensils,
  Wind,
  X,
} from 'lucide-react'
import { useStore, useTwin, type PageId, type Theme } from '../store/store'
import { SUBJECT } from '../data/synthetic'
import { PRESETS } from '../engine/twin'
import { switchTheme } from '../lib/theme'
import { alpha, C, ease, spring, type IconType } from './ui'

export const NAV: { id: PageId; label: string; icon: IconType; group: string; tint: string }[] = [
  { id: 'core', label: 'Summary', icon: LayoutGrid, group: 'Twin', tint: C.accent },
  { id: 'predict', label: 'Forecasts', icon: TrendingUp, group: 'Twin', tint: C.accent },
  { id: 'simulate', label: 'Simulator', icon: FlaskConical, group: 'Twin', tint: C.accent },
  { id: 'insights', label: 'Insights', icon: Lightbulb, group: 'Twin', tint: C.accent },
  { id: 'sleep', label: 'Sleep', icon: BedDouble, group: 'Health', tint: C.sleep },
  { id: 'nutrition', label: 'Nutrition', icon: Apple, group: 'Health', tint: C.nutrition },
  { id: 'activity', label: 'Activity', icon: Activity, group: 'Health', tint: C.activity },
  { id: 'mind', label: 'Mind', icon: BrainCircuit, group: 'Health', tint: C.mind },
  { id: 'assistant', label: 'Ask Soma', icon: MessageCircle, group: 'Intelligence', tint: C.accent },
  { id: 'neural', label: 'Models & Data', icon: Cpu, group: 'Intelligence', tint: C.accent },
]

export function Logo({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5ac8fa" />
          <stop offset="100%" stopColor="#0a63e0" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9d9bff" />
          <stop offset="100%" stopColor="#5e5ce6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#0b0d12" />
      <circle cx="13" cy="16" r="7" fill={`url(#${id}a)`} />
      <circle cx="19" cy="16" r="7" fill={`url(#${id}b)`} opacity="0.85" style={{ mixBlendMode: 'screen' }} />
    </svg>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────
export function Sidebar() {
  const page = useStore((s) => s.page)
  const go = useStore((s) => s.go)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const { risks } = useTwin()
  const alerts = risks.filter((r) => r.probability >= 0.45).length
  return (
    <aside className="hidden lg:flex flex-col w-[248px] shrink-0 glass border-r border-sep relative z-20">
      <div className="h-[60px] px-5 flex items-center gap-2.5">
        <Logo />
        <div className="leading-tight">
          <div className="t-headline">Soma</div>
          <div className="t-footnote text-label-2">Digital Twin</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        {['Twin', 'Health', 'Intelligence'].map((g) => (
          <div key={g} className="mb-4">
            <div className="px-3 pb-1 t-footnote font-semibold text-label-3">{g}</div>
            {NAV.filter((n) => n.group === g).map((n) => {
              const on = page === n.id
              const I = n.icon
              return (
                <button key={n.id} onClick={() => go(n.id)} className="relative w-full h-9 flex items-center gap-2.5 px-3 rounded-[9px] text-left group">
                  {on && <motion.span layoutId="nav-pill" transition={spring} className="absolute inset-0 rounded-[9px] bg-fill" />}
                  <span className="relative w-[22px] h-[22px] rounded-[6px] flex items-center justify-center transition-transform group-active:scale-90 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" style={{ background: n.tint, color: '#fff' }}>
                    <I size={13} strokeWidth={2.4} />
                  </span>
                  <span className={`relative t-callout ${on ? 'font-semibold' : ''}`}>{n.label}</span>
                  {n.id === 'predict' && alerts > 0 && <span className="relative ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-bad text-white t-footnote font-semibold flex items-center justify-center tnum">{alerts}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-sep">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" style={{ background: 'linear-gradient(135deg,#0a84ff,#5e5ce6)' }}>
            AY
          </div>
          <div className="min-w-0 leading-tight">
            <div className="t-subhead font-semibold truncate">{SUBJECT.name}</div>
            <div className="t-footnote text-label-2 truncate">
              {SUBJECT.age} · {SUBJECT.sex} · {SUBJECT.blood} · {SUBJECT.heightCm} cm
            </div>
          </div>
        </div>
        <div className="mt-1 grid grid-cols-3 p-[2px] rounded-[9px] bg-fill h-8">
          {(
            [
              ['system', Monitor, 'Automatic'],
              ['light', Sun, 'Light'],
              ['dark', Moon, 'Dark'],
            ] as [Theme, IconType, string][]
          ).map(([t, I, label]) => (
            <button key={t} title={label} aria-label={label} onClick={(e) => switchTheme(t, setTheme, { x: e.clientX, y: e.clientY })} className="relative flex items-center justify-center rounded-[7px]">
              {theme === t && <motion.span layoutId="theme-pill" transition={spring} className="absolute inset-0 rounded-[7px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.16)]" />}
              <I size={14} className={`relative ${theme === t ? 'text-label' : 'text-label-2'}`} />
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

// ── Toolbar with collapsing large title ───────────────────────────────
export function Toolbar({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) {
  const page = useStore((s) => s.page)
  const setPalette = useStore((s) => s.setPalette)
  const setLogOpen = useStore((s) => s.setLogOpen)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const go = useStore((s) => s.go)
  const { risks } = useTwin()
  const alerts = risks.filter((r) => r.probability >= 0.45).length
  const [collapsed, setCollapsed] = useState(false)
  const { scrollY } = useScroll({ container: scrollRef })
  useMotionValueEvent(scrollY, 'change', (v) => setCollapsed(v > 64))
  useEffect(() => setCollapsed(false), [page])
  const nav = NAV.find((n) => n.id === page)!
  const dark = theme === 'dark' || (theme === 'system' && document.documentElement.dataset.theme === 'dark')
  return (
    <header className={`h-[60px] shrink-0 flex items-center gap-2 sm:gap-3 px-4 md:px-8 relative z-20 transition-[background-color,box-shadow] duration-300 ${collapsed ? 'glass shadow-[0_1px_0_var(--sep)]' : ''}`}>
      <div className="lg:hidden">
        <Logo size={26} />
      </div>
      <div className="relative h-6 overflow-hidden flex-1 min-w-0">
        <AnimatePresence>
          {collapsed && (
            <motion.div key={page} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.32, ease }} className="absolute inset-0 t-headline truncate">
              {nav.label}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <button onClick={() => setPalette(true)} className="h-8 flex items-center gap-2 px-2.5 md:pl-3 md:pr-1.5 rounded-[9px] bg-fill-2 hover:bg-fill text-label-2 transition-colors md:w-[240px]" aria-label="Search">
        <Search size={15} />
        <span className="hidden md:inline t-subhead">Search</span>
        <kbd className="hidden md:inline ml-auto t-footnote font-medium px-1.5 py-px rounded-[5px] bg-surface shadow-[var(--shadow-sm)] text-label-2">⌘K</kbd>
      </button>
      <button onClick={() => go('predict')} className="relative w-8 h-8 rounded-full flex items-center justify-center text-label-2 hover:bg-fill-2 hover:text-label transition-colors" aria-label="Alerts">
        <Bell size={17} />
        {alerts > 0 && <span className="absolute top-[5px] right-[6px] w-2 h-2 rounded-full bg-bad ring-2 ring-[var(--bg)]" />}
      </button>
      <button onClick={(e) => switchTheme(dark ? 'light' : 'dark', setTheme, { x: e.clientX, y: e.clientY })} className="w-8 h-8 rounded-full flex items-center justify-center text-label-2 hover:bg-fill-2 hover:text-label transition-colors" aria-label="Toggle appearance">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={dark ? 'sun' : 'moon'} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.5, opacity: 0 }} transition={spring}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </motion.span>
        </AnimatePresence>
      </button>
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setLogOpen(true)} className="btn btn-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_-2px_color-mix(in_srgb,var(--accent)_60%,transparent)]">
        <Plus size={15} strokeWidth={2.6} />
        <span className="hidden sm:inline">Log</span>
      </motion.button>
    </header>
  )
}

// ── Mobile tab bar ────────────────────────────────────────────────────
export function TabBar() {
  const page = useStore((s) => s.page)
  const go = useStore((s) => s.go)
  const setPalette = useStore((s) => s.setPalette)
  const tabs = NAV.filter((n) => ['core', 'predict', 'simulate', 'assistant'].includes(n.id))
  return (
    <nav className="lg:hidden glass border-t border-sep flex justify-around px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] relative z-20">
      {tabs.map((t) => {
        const I = t.icon
        const on = page === t.id
        return (
          <button key={t.id} onClick={() => go(t.id)} className={`flex flex-col items-center gap-0.5 w-16 py-1 transition-colors ${on ? 'text-accent' : 'text-label-3'}`}>
            <motion.span animate={{ scale: on ? 1.1 : 1, y: on ? -1 : 0 }} transition={spring}>
              <I size={21} strokeWidth={on ? 2.3 : 1.9} />
            </motion.span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        )
      })}
      <button onClick={() => setPalette(true)} className="flex flex-col items-center gap-0.5 w-16 py-1 text-label-3">
        <MoreHorizontal size={21} />
        <span className="text-[10px] font-medium">More</span>
      </button>
    </nav>
  )
}

// ── Island notifications ──────────────────────────────────────────────
const TONE_ICON = { info: Sparkles, warn: ShieldAlert, crit: ShieldAlert, ok: Check }
const TONE_COL = { info: '#0a84ff', warn: '#ff9f0a', crit: '#ff453a', ok: '#30d158' }
export function Island() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  const t = toasts[toasts.length - 1]
  return (
    <div className="fixed top-3 inset-x-0 z-[97] flex justify-center pointer-events-none px-3">
      <AnimatePresence>
        {t && (
          <motion.div
            key="island"
            initial={{ width: 126, height: 37, opacity: 0, y: -24 }}
            animate={{ width: 380, height: 66, opacity: 1, y: 0 }}
            exit={{ width: 126, height: 37, opacity: 0, y: -16, transition: { duration: 0.4, ease } }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ borderRadius: 33, maxWidth: '100%' }}
            className="pointer-events-auto bg-black text-white overflow-hidden shadow-[0_18px_50px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.button
                key={t.id}
                onClick={() => dismiss(t.id)}
                initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.94 }}
                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.94 }}
                transition={{ duration: 0.4, delay: 0.12, ease }}
                className="w-[380px] max-w-full h-[66px] flex items-center gap-3 pl-3.5 pr-5 text-left"
              >
                {(() => {
                  const I = TONE_ICON[t.tone]
                  return (
                    <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: alpha(TONE_COL[t.tone], 24), color: TONE_COL[t.tone] }}>
                      <I size={18} strokeWidth={2.3} />
                    </span>
                  )
                })()}
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold leading-tight truncate">{t.title}</div>
                  <div className="text-[12.5px] text-white/60 leading-snug truncate">{t.body}</div>
                </div>
              </motion.button>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sheet scaffold ────────────────────────────────────────────────────
function Sheet({ open, onClose, children, top = false, width = 540 }: { open: boolean; onClose: () => void; children: ReactNode; top?: boolean; width?: number }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`fixed inset-0 z-[90] flex justify-center p-3 sm:p-6 ${top ? 'items-start pt-[12vh]' : 'items-end sm:items-center'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.22 } }}>
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[8px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, y: top ? -14 : 48, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: top ? -8 : 28, scale: 0.97, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative w-full bg-surface rounded-[24px] shadow-[var(--card-highlight),var(--shadow-lg)] overflow-hidden"
            style={{ maxWidth: width }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Quick log ─────────────────────────────────────────────────────────
export function QuickLog() {
  const open = useStore((s) => s.logOpen)
  const setOpen = useStore((s) => s.setLogOpen)
  const log = useStore((s) => s.logEntry)
  const [mood, setMood] = useState<number | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const items: { k: Parameters<typeof log>[0]; icon: IconType; label: string; sub: string; color: string; v?: number }[] = [
    { k: 'water', icon: Droplet, label: 'Water', sub: '250 ml', color: C.mind },
    { k: 'coffee', icon: Coffee, label: 'Coffee', sub: '95 mg', color: C.activity },
    { k: 'meal', icon: Utensils, label: 'Meal', sub: '≈ 450 kcal', color: C.nutrition, v: 450 },
    { k: 'walk', icon: Footprints, label: 'Walk', sub: '20 min', color: C.activity },
    { k: 'meditate', icon: Wind, label: 'Mindful', sub: '10 min', color: C.mind },
  ]
  const moods = [
    { v: 1, l: 'Awful', c: '#8e8ef0' },
    { v: 2, l: 'Low', c: '#64a8ff' },
    { v: 3, l: 'Okay', c: '#5ac8c8' },
    { v: 4, l: 'Good', c: '#7ed957' },
    { v: 5, l: 'Great', c: '#ffcc00' },
  ]
  const close = () => setOpen(false)
  const tap = (k: Parameters<typeof log>[0], v?: number) => {
    log(k, v)
    setDone(k)
    setTimeout(() => setDone(null), 1000)
  }
  return (
    <Sheet open={open} onClose={close}>
      <div className="px-6 pt-6 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="t-title2">Log to your twin</h2>
            <p className="t-subhead text-label-2 mt-1">Scores, risks and forecasts update the moment you add an entry.</p>
          </div>
          <button onClick={close} className="w-7 h-7 shrink-0 rounded-full bg-fill flex items-center justify-center text-label-2 hover:text-label" aria-label="Close">
            <X size={14} strokeWidth={2.6} />
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-6">
          {items.map((it, i) => {
            const I = it.icon
            const ok = done === it.k
            return (
              <motion.button
                key={it.k}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.06 + i * 0.04 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => tap(it.k, it.v)}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-fill-2 hover:bg-fill transition-colors"
              >
                <motion.span animate={{ backgroundColor: ok ? 'var(--good)' : alpha(it.color, 16) }} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ color: ok ? '#fff' : it.color }}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={ok ? 'ok' : 'i'} initial={{ scale: 0.3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.3, opacity: 0 }} transition={spring}>
                      {ok ? <Check size={20} strokeWidth={3} /> : <I size={19} strokeWidth={2.2} />}
                    </motion.span>
                  </AnimatePresence>
                </motion.span>
                <div className="text-center leading-tight">
                  <div className="t-subhead font-semibold">{it.label}</div>
                  <div className="t-footnote text-label-2">{it.sub}</div>
                </div>
              </motion.button>
            )
          })}
        </div>
        <div className="hairline my-6" />
        <div className="t-headline">How are you feeling right now?</div>
        <div className="flex gap-1.5 mt-3">
          {moods.map((m) => (
            <motion.button key={m.v} whileTap={{ scale: 0.9 }} onClick={() => setMood(m.v)} className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${mood === m.v ? 'bg-fill' : 'hover:bg-fill-2'}`}>
              <motion.span animate={{ scale: mood === m.v ? 1.18 : 1 }} transition={spring} className="w-8 h-8 rounded-full" style={{ background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.55), transparent 55%), ${m.c}`, boxShadow: mood === m.v ? `0 0 0 3px ${alpha(m.c, 30)}, 0 6px 14px -4px ${alpha(m.c, 70)}` : `0 2px 6px -2px ${alpha(m.c, 60)}` }} />
              <span className={`t-footnote ${mood === m.v ? 'font-semibold' : 'text-label-2'}`}>{m.l}</span>
            </motion.button>
          ))}
        </div>
        <button
          disabled={mood === null}
          onClick={() => {
            if (mood) tap('mood', mood)
            setMood(null)
          }}
          className="btn btn-primary w-full h-11 mt-4 text-[15px] rounded-xl"
        >
          Save mood
        </button>
      </div>
    </Sheet>
  )
}

// ── Command palette (Spotlight-style) ─────────────────────────────────
export function CommandPalette() {
  const open = useStore((s) => s.palette)
  const setOpen = useStore((s) => s.setPalette)
  const go = useStore((s) => s.go)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const cmds = useMemo(() => {
    const s = () => useStore.getState()
    return [
      ...NAV.map((n) => ({ id: n.id, group: 'Go to', label: n.label, icon: n.icon, tint: n.tint, run: () => go(n.id) })),
      { id: 'log', group: 'Actions', label: 'Log water, food or mood', icon: Plus, tint: C.accent, run: () => s().setLogOpen(true) },
      {
        id: 'ask',
        group: 'Actions',
        label: 'Ask Soma why stress is high',
        icon: MessageCircle,
        tint: C.accent,
        run: () => {
          go('assistant')
          setTimeout(() => window.dispatchEvent(new CustomEvent('soma-ask', { detail: 'Why is my stress high this week?' })), 450)
        },
      },
      ...PRESETS.map((p) => ({
        id: p.id,
        group: 'Simulate a lifestyle',
        label: p.name,
        icon: FlaskConical,
        tint: C.sleep,
        run: () => {
          s().resetSim()
          s().setSim(p.params)
          go('simulate')
        },
      })),
    ]
  }, [go])
  const list = cmds.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!useStore.getState().palette)
      }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [setOpen])
  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => input.current?.focus(), 40)
    }
  }, [open])
  let lastGroup = ''
  return (
    <Sheet open={open} onClose={() => setOpen(false)} top width={620}>
      <div className="flex items-center gap-3 px-5 h-[60px] border-b border-sep">
        <Search size={20} className="text-label-2" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((x) => Math.min(list.length - 1, x + 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((x) => Math.max(0, x - 1))
            }
            if (e.key === 'Enter' && list[sel]) {
              list[sel].run()
              setOpen(false)
            }
          }}
          placeholder="Search Soma"
          className="flex-1 bg-transparent outline-none text-[19px] tracking-[-0.01em] placeholder:text-label-3"
        />
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {list.map((c, i) => {
          const I = c.icon
          const header = c.group !== lastGroup
          lastGroup = c.group
          const on = sel === i
          return (
            <div key={c.id}>
              {header && <div className="px-3 pt-3 pb-1 t-footnote font-semibold text-label-3">{c.group}</div>}
              <button
                onMouseMove={() => setSel(i)}
                onClick={() => {
                  c.run()
                  setOpen(false)
                }}
                className="relative w-full flex items-center gap-3 px-3 h-10 rounded-[10px] text-left"
              >
                {on && <motion.span layoutId="cmd-sel" transition={{ type: 'spring', stiffness: 700, damping: 50 }} className="absolute inset-0 rounded-[10px] bg-accent" />}
                <span className="relative w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: on ? 'rgba(255,255,255,0.22)' : c.tint, color: '#fff' }}>
                  <I size={13} strokeWidth={2.4} />
                </span>
                <span className={`relative t-callout ${on ? 'text-white font-medium' : ''}`}>{c.label}</span>
                {on && <CornerDownLeft size={14} className="relative ml-auto text-white/80" />}
              </button>
            </div>
          )
        })}
        {!list.length && <div className="py-10 text-center t-callout text-label-2">No results for “{q}”</div>}
      </div>
    </Sheet>
  )
}

// ── Launch ────────────────────────────────────────────────────────────
export function Launch({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2400)
    return () => clearTimeout(id)
  }, [onDone])
  return (
    <motion.div onClick={onDone} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050506] text-white cursor-default" exit={{ opacity: 0, transition: { duration: 0.8, ease } }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(640px 420px at 50% 44%, rgba(10,132,255,0.18), transparent 70%)' }} />
      <motion.div exit={{ scale: 1.6, opacity: 0, filter: 'blur(12px)', transition: { duration: 0.8, ease } }} className="relative flex flex-col items-center">
        <div className="relative w-[112px] h-[72px]">
          <motion.div
            className="absolute rounded-full shadow-[inset_0_2px_0_rgba(255,255,255,0.3)]"
            style={{ width: 64, height: 64, top: 4, left: 24, background: 'linear-gradient(135deg,#5ac8fa,#0a63e0)' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: -12 }}
            transition={{ scale: { type: 'spring', stiffness: 220, damping: 15 }, opacity: { duration: 0.3 }, x: { delay: 0.6, type: 'spring', stiffness: 140, damping: 16 } }}
          />
          <motion.div
            className="absolute rounded-full mix-blend-screen"
            style={{ width: 64, height: 64, top: 4, left: 24, background: 'linear-gradient(135deg,#9d9bff,#5e5ce6)' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.9, x: 12 }}
            transition={{ scale: { delay: 0.2, type: 'spring', stiffness: 220, damping: 15 }, opacity: { delay: 0.2, duration: 0.3 }, x: { delay: 0.6, type: 'spring', stiffness: 140, damping: 16 } }}
          />
        </div>
        <motion.div initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.85, duration: 0.8, ease }} className="mt-7 text-center">
          <div className="text-[34px] font-semibold tracking-[-0.035em]" style={{ fontFamily: 'var(--font-display)' }}>
            Soma
          </div>
          <div className="text-[15px] text-white/55 mt-1">Building your digital twin</div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} className="mt-9 w-44 h-[3px] rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full bg-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ delay: 1.05, duration: 1.2, ease: [0.65, 0, 0.35, 1] }} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
