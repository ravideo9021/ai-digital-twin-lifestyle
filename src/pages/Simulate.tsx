import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Candy, Coffee, Droplet, Footprints, Moon, RotateCcw, Smartphone, Sparkles, Wind } from 'lucide-react'
import { alpha, C, Card, Counter, Legend, PageHeader, spring, type IconType } from '../components/ui'
import { LineChart, Radar } from '../components/charts'
import { useStore, useTwin } from '../store/store'
import { SUBJECT } from '../data/synthetic'
import { baselineParams, PRESETS, simulate, type SimParams, type SimPoint } from '../engine/twin'

const LEVERS: { k: keyof SimParams; label: string; min: number; max: number; step: number; unit: string; icon: IconType; good: 'up' | 'down'; c: string }[] = [
  { k: 'sleep', label: 'Sleep', min: 4.5, max: 9.5, step: 0.1, unit: 'hr', icon: Moon, good: 'up', c: C.sleep },
  { k: 'steps', label: 'Daily steps', min: 2000, max: 20000, step: 500, unit: '', icon: Footprints, good: 'up', c: C.activity },
  { k: 'caffeine', label: 'Caffeine', min: 0, max: 500, step: 10, unit: 'mg', icon: Coffee, good: 'down', c: C.activity },
  { k: 'screen', label: 'Screens after 9 PM', min: 0, max: 200, step: 5, unit: 'min', icon: Smartphone, good: 'down', c: C.sleep },
  { k: 'meditation', label: 'Mindful minutes', min: 0, max: 40, step: 1, unit: 'min', icon: Wind, good: 'up', c: C.mind },
  { k: 'sugar', label: 'Added sugar', min: 0, max: 120, step: 1, unit: 'g', icon: Candy, good: 'down', c: C.nutrition },
  { k: 'water', label: 'Water', min: 0.8, max: 4.5, step: 0.1, unit: 'L', icon: Droplet, good: 'up', c: C.mind },
]

const METRICS: { k: keyof SimPoint; label: string; color: string; unit: string; d: number; better: 'up' | 'down' }[] = [
  { k: 'life', label: 'Life Index', color: C.accent, unit: '', d: 0, better: 'up' },
  { k: 'bioAge', label: 'Biological age', color: C.heart, unit: ' yrs', d: 1, better: 'down' },
  { k: 'stress', label: 'Stress', color: C.mind, unit: '', d: 0, better: 'down' },
  { k: 'hrv', label: 'HRV', color: C.heart, unit: ' ms', d: 0, better: 'up' },
  { k: 'sleepScore', label: 'Sleep score', color: C.sleep, unit: '', d: 0, better: 'up' },
  { k: 'weight', label: 'Weight', color: C.nutrition, unit: ' kg', d: 1, better: 'down' },
]

export default function Simulate() {
  const { days } = useTwin()
  const sim = useStore((s) => s.sim)
  const setSim = useStore((s) => s.setSim)
  const resetSim = useStore((s) => s.resetSim)
  const [metric, setMetric] = useState<keyof SimPoint>('life')
  const [preset, setPreset] = useState<string | null>(null)
  const base = useMemo(() => baselineParams(days), [days])
  const baseRun = useMemo(() => simulate(days, base), [days, base])
  const run = useMemo(() => simulate(days, sim), [days, sim])
  const end = run[run.length - 1]
  const bEnd = baseRun[baseRun.length - 1]
  const M = METRICS.find((m) => m.k === metric)!

  const radar = (p: SimPoint) => [
    { label: 'Life', value: p.life },
    { label: 'Calm', value: 100 - p.stress },
    { label: 'HRV', value: Math.min(100, (p.hrv / 80) * 100) },
    { label: 'Sleep', value: p.sleepScore },
    { label: 'Energy', value: p.energy },
    { label: 'Youth', value: Math.max(0, Math.min(100, 50 + (SUBJECT.age - p.bioAge) * 8)) },
  ]
  const dl = end.life - bEnd.life
  const narrative =
    Math.abs(dl) < 0.6
      ? 'This plan stays close to the path you are on. Move a slider further to see where the two futures split.'
      : dl > 0
        ? `Keep this up for 90 days and your Life Index settles near ${end.life.toFixed(0)}, ${dl.toFixed(1)} points above your current path. Stress eases to about ${end.stress.toFixed(0)} and your biological age moves by ${(end.bioAge - bEnd.bioAge).toFixed(1)} years. Most of the change arrives in the first three to four weeks, as HRV recovers.`
        : `This plan wears you down. After 90 days your Life Index falls to ${end.life.toFixed(0)}, ${Math.abs(dl).toFixed(1)} points below your current path, while stress climbs to ${end.stress.toFixed(0)}. Your twin expects burnout risk to become high within about ${Math.max(9, Math.round(30 + dl * 1.2))} days.`

  return (
    <>
      <PageHeader
        title="Simulator"
        subtitle="Try a different routine and watch your twin live it out over the next 90 days, next to the path you are on today."
        actions={
          <>
            {PRESETS.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetSim()
                  setSim(p.params)
                  setPreset(p.id)
                }}
                className={`btn ${preset === p.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {p.name}
              </motion.button>
            ))}
            <button
              className="btn btn-plain"
              onClick={() => {
                resetSim()
                setPreset(null)
              }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </>
        }
      />
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <Card title="Your habits" meta="Daily average" className="col-span-12 lg:col-span-5 xl:col-span-4">
          <div className="space-y-5 pt-1">
            {LEVERS.map((l) => {
              const v = sim[l.k]
              const b = base[l.k]
              const pct = ((v - l.min) / (l.max - l.min)) * 100
              const bp = ((b - l.min) / (l.max - l.min)) * 100
              const changed = Math.abs(v - b) > l.step / 2
              const better = l.good === 'up' ? v > b : v < b
              const I = l.icon
              const fmt = (x: number) => (l.k === 'steps' ? x.toLocaleString() : x.toFixed(l.step < 1 ? 1 : 0))
              return (
                <div key={l.k}>
                  <div className="flex items-center gap-2">
                    <I size={15} strokeWidth={2.2} style={{ color: l.c }} />
                    <span className="t-callout font-medium">{l.label}</span>
                    <span className="ml-auto t-callout font-semibold tnum">
                      {fmt(v)}
                      {l.unit && <span className="text-label-2 font-normal"> {l.unit}</span>}
                    </span>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="range"
                      className="slider"
                      min={l.min}
                      max={l.max}
                      step={l.step}
                      value={v}
                      aria-label={l.label}
                      style={{ ['--pct' as string]: `${pct}%`, ['--track-c' as string]: l.c }}
                      onChange={(e) => {
                        setSim({ [l.k]: +e.target.value })
                        setPreset(null)
                      }}
                    />
                    <span className="absolute top-[9px] w-[2px] h-[10px] rounded-full bg-label/40 pointer-events-none -translate-x-1/2" style={{ left: `calc(11px + (100% - 22px) * ${bp / 100})` }} />
                  </div>
                  <div className="flex justify-between t-footnote text-label-2 -mt-0.5">
                    <span>Now {fmt(b)}</span>
                    {changed && (
                      <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="font-semibold" style={{ color: better ? 'var(--good)' : 'var(--bad)' }}>
                        {better ? 'Better' : 'Worse'}
                      </motion.span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-4 md:gap-5">
          <Card title="In 90 days" meta="Compared with your current path" pad="px-2 pb-2 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3">
              {METRICS.map((m) => {
                const a = end[m.k] as number
                const b = bEnd[m.k] as number
                const d = a - b
                const good = m.better === 'up' ? d > 0 : d < 0
                const flat = Math.abs(d) < (m.d ? 0.05 : 0.5)
                const on = metric === m.k
                return (
                  <button key={m.k} onClick={() => setMetric(m.k)} className="relative text-left p-4 rounded-[14px]">
                    {on && <motion.span layoutId="sim-metric" transition={spring} className="absolute inset-0 rounded-[14px] bg-fill-2" />}
                    <div className="relative">
                      <div className="t-footnote font-medium text-label-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                        {m.label}
                      </div>
                      <div className="num text-[28px] font-semibold leading-tight mt-1">
                        <Counter value={a} decimals={m.d} />
                        <span className="text-[15px] text-label-2">{m.unit}</span>
                      </div>
                      <div className="t-footnote font-semibold tnum" style={{ color: flat ? 'var(--label-2)' : good ? 'var(--good)' : 'var(--bad)' }}>
                        {flat ? 'No change' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(m.d)}${m.unit}`}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title={M.label} meta="Next 90 days">
            <div className="mb-3">
              <Legend
                items={[
                  { label: 'With these habits', color: M.color },
                  { label: 'Current path', color: 'var(--label-3)', dashed: true },
                ]}
              />
            </div>
            <LineChart
              height={260}
              decimals={M.d}
              unit={M.unit}
              xLabels={run.map((p) => (p.day % 15 === 0 ? (p.day === 0 ? 'Today' : `Day ${p.day}`) : ''))}
              series={[
                { name: 'Current path', data: baseRun.map((p) => p[metric] as number), color: 'var(--label-3)', dashed: true },
                {
                  name: 'New habits',
                  data: run.map((p) => p[metric] as number),
                  color: M.color,
                  area: true,
                  band: run.map((p, i) => {
                    const s = (M.k === 'weight' ? 0.02 : 0.22) * Math.sqrt(i)
                    return { lo: (p[metric] as number) - s, hi: (p[metric] as number) + s }
                  }),
                },
              ]}
            />
          </Card>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            <Card title="You in 90 days">
              <div className="flex justify-center">
                <Radar size={240} color={C.accent} axes={radar(end)} compare={radar(bEnd).map((a) => a.value)} />
              </div>
              <div className="flex justify-center mt-1">
                <Legend
                  items={[
                    { label: 'New habits', color: C.accent },
                    { label: 'Current path', color: 'var(--label-3)', dashed: true },
                  ]}
                />
              </div>
            </Card>
            <Card title="What your twin sees" icon={Sparkles} tint={C.accent}>
              <motion.p key={narrative} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="t-body leading-relaxed">
                {narrative}
              </motion.p>
              <div className="grid grid-cols-3 gap-2.5 mt-5">
                {[7, 30, 90].map((d) => {
                  const diff = run[d].life - baseRun[d].life
                  return (
                    <div key={d} className="inset p-3" style={{ background: Math.abs(diff) > 0.5 ? alpha(diff > 0 ? 'var(--good)' : 'var(--bad)', 8) : undefined }}>
                      <div className="t-footnote text-label-2">Day {d}</div>
                      <div className="num text-[22px] font-semibold">{run[d].life.toFixed(0)}</div>
                      <div className="t-footnote font-semibold tnum" style={{ color: Math.abs(diff) < 0.5 ? 'var(--label-2)' : diff > 0 ? 'var(--good)' : 'var(--bad)' }}>
                        {diff >= 0 ? '+' : '−'}
                        {Math.abs(diff).toFixed(1)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
