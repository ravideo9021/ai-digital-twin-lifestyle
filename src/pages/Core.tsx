import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Activity, BedDouble, BrainCircuit, Check, Database, Footprints, Heart, HeartPulse, Radio, Salad, ShieldAlert, Smartphone, Sparkles, Watch, Waves, Wifi, Wind } from 'lucide-react'
import { alpha, Badge, Bar, C, Card, Counter, Delta, Duration, Legend, Metric, PageHeader, Ring, riskColor, riskWord, scoreColor, Segmented, spring, StatusDot, type IconType } from '../components/ui'
import { LineChart, Sparkline } from '../components/charts'
import { Hologram, type Callout } from '../components/Hologram'
import { ECG } from '../components/Effects'
import { useStore, useTwin, type PageId, type Region } from '../store/store'
import { scoreWindow } from '../engine/twin'
import { holtForecast, hhmm } from '../lib/math'
import { MEALS, SUBJECT } from '../data/synthetic'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Core() {
  const { risks } = useTwin()
  const attention = risks.filter((r) => r.probability >= 0.35).length
  const words = ['No things', 'One thing', 'Two things', 'Three things', 'Four things']
  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        title={`${greeting()}, ${SUBJECT.name.split(' ')[0]}`}
        subtitle={attention ? `Your twin is in sync. ${words[attention]} ${attention === 1 ? 'needs' : 'need'} your attention today.` : 'Your twin is in sync and everything looks steady.'}
      />
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <TwinStage />
        <div className="col-span-12 xl:col-span-5 grid md:grid-cols-2 xl:grid-cols-1 gap-4 md:gap-5 content-start">
          <LifeIndex />
          <Attention />
        </div>
        <Highlights />
        <Trend />
        <Recommendations />
        <Rhythm />
        <Sources />
      </div>
    </>
  )
}

// ── Twin stage ────────────────────────────────────────────────────────
const SYSTEMS: { r: Region; label: string; icon: IconType; color: string }[] = [
  { r: 'brain', label: 'Mind', icon: BrainCircuit, color: '#64d2ff' },
  { r: 'heart', label: 'Heart', icon: Heart, color: '#ff375f' },
  { r: 'lungs', label: 'Lungs', icon: Wind, color: '#9ec5ff' },
  { r: 'gut', label: 'Metabolism', icon: Salad, color: '#30d158' },
  { r: 'legs', label: 'Movement', icon: Footprints, color: '#ff9f0a' },
]

function TwinStage() {
  const v = useStore((s) => s.vitals)
  const go = useStore((s) => s.go)
  const focus = useStore((s) => s.focus)
  const setFocus = useStore((s) => s.setFocus)
  const callouts: Callout[] = [
    { region: 'brain', anchor: [0, 1.76, 0], side: 'l', title: 'Stress', value: v.stress.toFixed(0), unit: '/ 100', color: '#64d2ff', onClick: () => go('mind') },
    { region: 'lungs', anchor: [-0.09, 1.4, 0.02], side: 'l', title: 'Blood oxygen', value: v.spo2.toFixed(0), unit: '%', color: '#9ec5ff', onClick: () => go('activity') },
    { region: 'gut', anchor: [0, 1.06, 0.06], side: 'l', title: 'Glucose', value: v.glucose.toFixed(0), unit: 'mg/dL', color: '#30d158', onClick: () => go('nutrition') },
    { region: 'heart', anchor: [0.05, 1.36, 0.05], side: 'r', title: 'Heart rate', value: v.hr.toFixed(0), unit: 'BPM', color: '#ff375f', onClick: () => go('mind') },
    { region: 'legs', anchor: [0.11, 0.45, 0.02], side: 'r', title: 'Steps', value: v.steps.toLocaleString(), color: '#ff9f0a', onClick: () => go('activity') },
  ]
  return (
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 28 }}
      className="col-span-12 xl:col-span-7 relative h-[560px] md:h-[640px] rounded-[24px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(0,0,0,0.06),0_30px_60px_-24px_rgba(0,0,0,0.5)]"
      style={{ background: 'radial-gradient(120% 80% at 50% 30%, #1b2338 0%, #0b0e17 55%, #050608 100%)' }}
    >
      <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none" style={{ background: 'radial-gradient(60% 40% at 50% 100%, rgba(10,132,255,0.10), transparent 70%)' }} />
      <Hologram callouts={callouts} hr={v.hr} resp={v.resp} />
      <div className="absolute top-5 left-6 pointer-events-none">
        <div className="text-white t-title3">Digital twin</div>
        <div className="flex items-center gap-1.5 mt-1 t-footnote text-white/55">
          <StatusDot color="#30d158" pulse /> Live · mirrored from 6 sources
        </div>
      </div>
      <div className="absolute top-5 right-6 text-right pointer-events-none hidden sm:block">
        <div className="t-footnote text-white/45">Model fidelity</div>
        <div className="num text-white text-[17px] font-semibold">96.4%</div>
      </div>
      <div className="absolute bottom-0 inset-x-0 p-4 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-1 p-1 rounded-full bg-white/[0.07] backdrop-blur-xl ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {SYSTEMS.map((s) => {
              const on = focus === s.r
              const I = s.icon
              return (
                <button key={s.r} onPointerEnter={() => setFocus(s.r)} onPointerLeave={() => setFocus(null)} onClick={() => setFocus(on ? null : s.r)} className="relative h-8 px-3 rounded-full flex items-center gap-1.5 text-[12.5px] font-medium text-white/75 hover:text-white">
                  {on && <motion.span layoutId="sys-pill" transition={spring} className="absolute inset-0 rounded-full bg-white/15" />}
                  <I size={13} className="relative" style={{ color: s.color }} />
                  <span className="relative hidden sm:inline">{s.label}</span>
                </button>
              )
            })}
          </div>
          <div className="w-[220px] hidden 2xl:block">
            <div className="flex justify-between t-footnote text-white/50 mb-1">
              <span>Heart rhythm</span>
              <span className="text-white/70">Regular</span>
            </div>
            <ECG height={40} />
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// ── Life index ────────────────────────────────────────────────────────
function LifeIndex() {
  const { scores } = useTwin()
  const go = useStore((s) => s.go)
  const rows: { k: string; v: number; page: PageId; icon: IconType; c: string }[] = [
    { k: 'Sleep', v: scores.sleep, page: 'sleep', icon: BedDouble, c: C.sleep },
    { k: 'Nutrition', v: scores.nutrition, page: 'nutrition', icon: Salad, c: C.nutrition },
    { k: 'Activity', v: scores.activity, page: 'activity', icon: Activity, c: C.activity },
    { k: 'Mind', v: scores.mind, page: 'mind', icon: BrainCircuit, c: C.mind },
    { k: 'Recovery', v: scores.recovery, page: 'mind', icon: HeartPulse, c: C.heart },
  ]
  const younger = SUBJECT.age - scores.bioAge
  return (
    <Card title="Life Index" meta="7-day composite" delay={0.05}>
      <div className="flex items-center gap-6">
        <Ring value={scores.life} size={132} stroke={13} color={scoreColor(scores.life)} delay={0.2}>
          <Counter value={scores.life} className="num text-[38px] font-semibold leading-none" />
          <Delta value={scores.delta} className="mt-1" suffix=" this wk" />
        </Ring>
        <div className="flex-1 min-w-0 space-y-2.5">
          {rows.map((r, i) => {
            const I = r.icon
            return (
              <button key={r.k} onClick={() => go(r.page)} className="w-full text-left group">
                <div className="flex items-center gap-2 mb-1">
                  <I size={13} style={{ color: r.c }} strokeWidth={2.4} />
                  <span className="t-subhead font-medium group-hover:text-accent transition-colors">{r.k}</span>
                  <span className="ml-auto t-subhead font-semibold tnum">{r.v.toFixed(0)}</span>
                </div>
                <Bar value={r.v} color={r.c} height={5} delay={0.25 + i * 0.06} />
              </button>
            )
          })}
        </div>
      </div>
      <div className="hairline my-4" />
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="t-footnote font-medium text-label-2">Biological age</div>
          <Metric value={<Counter value={scores.bioAge} decimals={1} />} unit="yrs" size="md" />
        </div>
        <Badge color={younger >= 0 ? C.good : C.warn}>
          {Math.abs(younger).toFixed(1)} yrs {younger >= 0 ? 'younger' : 'older'} than your age
        </Badge>
      </div>
    </Card>
  )
}

// ── Forecast summary ──────────────────────────────────────────────────
function Attention() {
  const { risks } = useTwin()
  const go = useStore((s) => s.go)
  const list = [...risks].sort((a, b) => b.probability - a.probability)
  return (
    <Card title="Forecast" meta="Next 7–60 days" action="All" onAction={() => go('predict')} delay={0.1}>
      <div className="-my-1">
        {list.map((r, i) => (
          <button key={r.id} onClick={() => go('predict')} className={`w-full flex items-center gap-3 py-3 text-left group ${i < list.length - 1 ? 'border-b border-sep' : ''}`}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: alpha(riskColor(r.probability), 14), color: riskColor(r.probability) }}>
              <ShieldAlert size={15} strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="t-callout font-medium truncate group-hover:text-accent transition-colors">{r.name}</div>
              <div className="t-footnote text-label-2">Within {r.horizon}</div>
            </div>
            <div className="text-right">
              <div className="num text-[17px] font-semibold" style={{ color: riskColor(r.probability) }}>
                {(r.probability * 100).toFixed(0)}%
              </div>
              <div className="t-footnote text-label-2">{riskWord(r.probability)}</div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}

// ── Highlights ────────────────────────────────────────────────────────
function Highlights() {
  const v = useStore((s) => s.vitals)
  const go = useStore((s) => s.go)
  const { today, days } = useTwin()
  const tiles = [
    { t: 'Heart Rate', icon: Heart, c: C.heart, page: 'mind' as PageId, body: <Metric value={v.hr.toFixed(0)} unit="BPM" />, sub: 'Live', chart: <Sparkline data={v.hist.hr} color={C.heart} height={40} /> },
    { t: 'HRV', icon: Waves, c: C.heart, page: 'mind' as PageId, body: <Metric value={v.hrv.toFixed(0)} unit="ms" />, sub: 'Live', chart: <Sparkline data={v.hist.hrv} color={C.heart} height={40} /> },
    { t: 'Sleep', icon: BedDouble, c: C.sleep, page: 'sleep' as PageId, body: <Duration hours={today.sleepHours} />, sub: 'Last night', chart: <Sparkline data={days.slice(-14).map((d) => d.sleepHours)} color={C.sleep} height={40} /> },
    { t: 'Steps', icon: Footprints, c: C.activity, page: 'activity' as PageId, body: <Metric value={v.steps.toLocaleString()} unit="steps" />, sub: 'Today', chart: <Sparkline data={days.slice(-14).map((d) => d.steps)} color={C.activity} height={40} /> },
  ]
  return (
    <>
      {tiles.map((t, i) => {
        const I = t.icon
        return (
          <Card key={t.t} className="col-span-12 sm:col-span-6 xl:col-span-3" interactive onClick={() => go(t.page)} delay={0.04 * i}>
            <div className="flex items-center gap-1.5" style={{ color: t.c }}>
              <I size={14} strokeWidth={2.4} />
              <span className="t-subhead font-semibold">{t.t}</span>
              <span className="ml-auto t-footnote text-label-3 font-normal">{t.sub}</span>
            </div>
            <div className="mt-3">{t.body}</div>
            <div className="mt-3">{t.chart}</div>
          </Card>
        )
      })}
    </>
  )
}

// ── Trend ─────────────────────────────────────────────────────────────
function Trend() {
  const { days } = useTwin()
  const [range, setRange] = useState<'30' | '90'>('30')
  const data = useMemo(() => {
    const N = +range
    const life: number[] = []
    const sleep: number[] = []
    const mind: number[] = []
    for (let i = days.length - N; i < days.length; i++) {
      const s = scoreWindow(days.slice(Math.max(0, i - 6), i + 1))
      life.push(s.life)
      sleep.push(s.sleep)
      mind.push(s.mind)
    }
    const f = holtForecast(life.slice(-30), 14)
    const step = N === 30 ? 7 : 21
    const labels = [...Array(N + 14)].map((_, i) => {
      const d = new Date(days[days.length - 1].date)
      d.setDate(d.getDate() + i - N + 1)
      return i % step === 0 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    })
    return { life, sleep, mind, f, labels, N }
  }, [days, range])
  return (
    <Card title="Trends" className="col-span-12 xl:col-span-8" delay={0.05}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Legend
          items={[
            { label: 'Life Index', color: C.accent },
            { label: 'Sleep', color: C.sleep },
            { label: 'Mind', color: C.mind },
            { label: 'Forecast', color: C.accent, dashed: true },
          ]}
        />
        <Segmented
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: '30', label: '30 D' },
            { value: '90', label: '90 D' },
          ]}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={range} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <LineChart
            height={260}
            xLabels={data.labels}
            splitAt={data.N - 1}
            series={[
              { name: 'Sleep', data: data.sleep, color: C.sleep, faint: true },
              { name: 'Mind', data: data.mind, color: C.mind, faint: true },
              { name: 'Life Index', data: data.life, color: C.accent, area: true },
              { name: 'Forecast', data: [data.life[data.life.length - 1], ...data.f.points.map((p) => p.v)], color: C.accent, dashed: true, offset: data.N - 1, band: data.f.points.map((p) => ({ lo: p.lo, hi: p.hi })), bandOffset: data.N },
            ]}
          />
        </motion.div>
      </AnimatePresence>
    </Card>
  )
}

// ── Recommendations ───────────────────────────────────────────────────
function Recommendations() {
  const { recs } = useTwin()
  const [done, setDone] = useState<string[]>([])
  const push = useStore((s) => s.pushToast)
  const cat = { sleep: C.sleep, nutrition: C.nutrition, activity: C.activity, mind: C.mind }
  return (
    <Card title="For you today" icon={Sparkles} tint={C.accent} className="col-span-12 xl:col-span-4" delay={0.1}>
      <div className="-my-1">
        {recs.slice(0, 5).map((r, i) => {
          const d = done.includes(r.id)
          return (
            <div key={r.id} className={`flex items-start gap-3 py-3 ${i < 4 ? 'border-b border-sep' : ''}`}>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => {
                  if (d) return setDone(done.filter((x) => x !== r.id))
                  setDone([...done, r.id])
                  push({ tone: 'ok', title: 'Added to your plan', body: `Projected +${r.impact.toFixed(1)} Life Index in 14 days` })
                }}
                className="mt-0.5 w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center transition-colors"
                style={{ background: d ? 'var(--good)' : 'transparent', boxShadow: d ? 'none' : 'inset 0 0 0 1.5px var(--label-3)' }}
                aria-label="Mark done"
              >
                <AnimatePresence>
                  {d && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}>
                      <Check size={13} strokeWidth={3.2} className="text-white" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <div className="min-w-0 flex-1">
                <div className={`t-callout leading-snug transition-colors ${d ? 'text-label-3 line-through' : ''}`}>{r.title}</div>
                <div className="flex items-center gap-2 mt-1 t-footnote text-label-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat[r.category] }} />
                  {r.when}
                  <span className="text-good font-semibold tnum">+{r.impact.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Daily rhythm ──────────────────────────────────────────────────────
function Rhythm() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  const { today } = useTwin()
  const h = now.getHours() + now.getMinutes() / 60
  const S = 220
  const c = S / 2
  const ang = (t: number) => (t / 24) * Math.PI * 2 - Math.PI / 2
  const P = (t: number, r: number) => [c + Math.cos(ang(t)) * r, c + Math.sin(ang(t)) * r]
  const arc = (a: number, b: number, r: number) => {
    const span = (b - a + 24) % 24
    const [x1, y1] = P(a, r)
    const [x2, y2] = P(b, r)
    return `M${x1},${y1} A${r},${r} 0 ${span > 12 ? 1 : 0} 1 ${x2},${y2}`
  }
  const wake = (today.bedtime + today.sleepHours) % 24
  const phase = h < 6 ? 'Deep night' : h < 10 ? 'Waking up' : h < 13 ? 'Peak alertness' : h < 16 ? 'Afternoon dip' : h < 19 ? 'Peak strength' : h < 22 ? 'Winding down' : 'Bedtime'
  const [hx, hy] = P(h, 84)
  return (
    <Card title="Today’s rhythm" meta="24-hour clock" className="col-span-12 md:col-span-6 xl:col-span-5" delay={0.05}>
      <div className="flex items-center gap-6">
        <svg viewBox={`0 0 ${S} ${S}`} className="shrink-0 w-[48%] max-w-[220px] h-auto">
          <circle cx={c} cy={c} r={84} fill="none" strokeWidth={16} style={{ stroke: 'var(--fill-2)' }} />
          {Array.from({ length: 24 }).map((_, i) => {
            const [x1, y1] = P(i, 104)
            const [x2, y2] = P(i, i % 6 ? 101 : 98)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.25} style={{ stroke: 'var(--label-3)' }} />
          })}
          {[0, 6, 12, 18].map((t) => {
            const [x, y] = P(t, 62)
            return (
              <text key={t} x={x} y={y + 4} fontSize={11} fontWeight={500} textAnchor="middle" style={{ fill: 'var(--label-3)' }}>
                {['12 AM', '6 AM', '12 PM', '6 PM'][t / 6]}
              </text>
            )
          })}
          <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} d={arc(today.bedtime % 24, wake, 84)} fill="none" strokeWidth={16} strokeLinecap="round" style={{ stroke: 'var(--sleep)' }} />
          <path d={arc(18, 19, 84)} fill="none" strokeWidth={16} strokeLinecap="round" style={{ stroke: 'var(--activity)' }} />
          {MEALS.map((m) => {
            const [x, y] = P(m.time, 84)
            return <circle key={m.time} cx={x} cy={y} r={4.5} strokeWidth={2} style={{ fill: 'var(--nutrition)', stroke: 'var(--surface)' }} />
          })}
          <circle cx={hx} cy={hy} r={7} strokeWidth={3} style={{ fill: 'var(--label)', stroke: 'var(--surface)' }} />
          <text x={c} y={c + 4} textAnchor="middle" className="num" fontSize={26} fontWeight={600} style={{ fill: 'var(--label)' }}>
            {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?(AM|PM)/, '')}
          </text>
          <text x={c} y={c + 22} textAnchor="middle" fontSize={11} fontWeight={500} style={{ fill: 'var(--label-2)' }}>
            {phase}
          </text>
        </svg>
        <div className="flex-1 min-w-0 space-y-3">
          {[
            { c: C.sleep, t: 'Sleep', v: `${hhmm(today.bedtime)} – ${hhmm(wake)}` },
            { c: C.activity, t: 'Workout', v: '18:00 – 19:00' },
            { c: C.nutrition, t: 'Meals', v: `${MEALS.length} logged` },
          ].map((k) => (
            <div key={k.t}>
              <div className="flex items-center gap-1.5 t-footnote text-label-2">
                <span className="w-2 h-2 rounded-full" style={{ background: k.c }} />
                {k.t}
              </div>
              <div className="t-callout font-semibold tnum pl-3.5">{k.v}</div>
            </div>
          ))}
          <div className="inset px-3 py-2.5">
            <div className="t-footnote text-label-2">Ideal bedtime tonight</div>
            <div className="num text-[22px] font-semibold text-sleep">10:50 PM</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Sources ───────────────────────────────────────────────────────────
function Sources() {
  const src = [
    { n: 'Smart Ring', d: 'Sleep · HRV · temperature', s: 'Live', i: Radio },
    { n: 'Watch', d: 'Heart rate · SpO₂ · ECG', s: 'Live', i: Watch },
    { n: 'Glucose sensor', d: 'Continuous glucose', s: 'Live', i: Wifi },
    { n: 'Health records', d: 'Labs · prescriptions', s: '2 days ago', i: Database },
    { n: 'Phone', d: 'Screen time · motion', s: '4 min ago', i: Smartphone },
    { n: 'Home sensors', d: 'Air · light · noise', s: 'Live', i: Activity },
  ]
  return (
    <Card title="Connected sources" meta="6 of 6 healthy" className="col-span-12 md:col-span-6 xl:col-span-7" delay={0.1}>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {src.map((s, i) => {
          const I = s.i
          return (
            <motion.div key={s.n} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.04 }} className="inset flex items-center gap-3 px-3 py-3">
              <span className="w-9 h-9 rounded-[10px] bg-surface shadow-[var(--shadow-sm)] flex items-center justify-center text-label-2">
                <I size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="t-callout font-medium truncate">{s.n}</div>
                <div className="t-footnote text-label-2 truncate">{s.d}</div>
              </div>
              <span className={`flex items-center gap-1.5 t-footnote whitespace-nowrap ${s.s === 'Live' ? 'text-good font-semibold' : 'text-label-2'}`}>
                {s.s === 'Live' && <StatusDot pulse />}
                {s.s}
              </span>
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}
