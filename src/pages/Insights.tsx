import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Activity, BedDouble, BrainCircuit, Salad } from 'lucide-react'
import { alpha, Bar, C, Card, Legend, PageHeader, spring, type IconType } from '../components/ui'
import { Bars, Heatmap, useSize } from '../components/charts'
import { useTwin } from '../store/store'
import { CORR_VARS } from '../engine/twin'
import type { Day } from '../data/synthetic'
import { mean, pearson } from '../lib/math'

const CAT: Record<string, { c: string; i: IconType; l: string }> = {
  sleep: { c: C.sleep, i: BedDouble, l: 'Sleep' },
  mind: { c: C.mind, i: BrainCircuit, l: 'Mind' },
  nutrition: { c: C.nutrition, i: Salad, l: 'Nutrition' },
  activity: { c: C.activity, i: Activity, l: 'Activity' },
}
const PAIRS: Record<string, [keyof Day, keyof Day, string, string]> = {
  p1: ['lateCaffeine', 'deepPct', 'Caffeine after 4 PM (mg)', 'Deep sleep (%)'],
  p4: ['sleepHours', 'stress', 'Sleep the night before (hr)', 'Stress'],
  p3: ['meditation', 'stress', 'Mindful minutes', 'Stress'],
  p6: ['stress', 'sugar', 'Stress', 'Added sugar (g)'],
  p2: ['screenLate', 'remPct', 'Screens after 9 PM (min)', 'REM sleep (%)'],
  p5: ['steps', 'mood', 'Steps', 'Mood'],
}

export default function Insights() {
  const { patterns, corr, days, anomalies } = useTwin()
  const [sel, setSel] = useState(patterns[0].id)
  const p = patterns.find((x) => x.id === sel)!
  const weekly = useMemo(() => {
    const by = (k: keyof Day) => [1, 2, 3, 4, 5, 6, 0].map((dw) => mean(days.filter((d) => d.date.getDay() === dw).map((d) => d[k] as number)))
    return { stress: by('stress'), sleep: by('sleepHours') }
  }, [days])

  return (
    <>
      <PageHeader title="Insights" subtitle={`Patterns your twin found by looking across ${days.length} days of your sleep, food, movement and stress. Every insight comes from your own data.`} />
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <div className="col-span-12 xl:col-span-7 grid sm:grid-cols-2 gap-4 md:gap-5 content-start">
          {patterns.map((x, i) => {
            const cat = CAT[x.category]
            const I = cat.i
            const on = x.id === sel
            return (
              <motion.button
                key={x.id}
                onClick={() => setSel(x.id)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                className="card text-left p-5 flex flex-col"
                style={{ boxShadow: on ? `var(--card-highlight), 0 0 0 2px var(--accent), var(--shadow)` : undefined }}
              >
                <div className="flex items-center gap-1.5 t-subhead font-semibold" style={{ color: cat.c }}>
                  <I size={14} strokeWidth={2.4} /> {cat.l}
                </div>
                <div className="t-headline mt-2 leading-snug">{x.title}</div>
                <div className="t-subhead text-label-2 mt-1.5 flex-1">{x.detail}</div>
                <div className="flex items-center gap-3 mt-4">
                  <span className="num text-[20px] font-semibold" style={{ color: cat.c }}>
                    {x.effect.split(' ')[0]}
                  </span>
                  <span className="t-footnote text-label-2 truncate">{x.effect.split(' ').slice(1).join(' ')}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1">
                    <Bar value={x.confidence * 100} color={cat.c} height={4} delay={0.2 + i * 0.05} />
                  </div>
                  <span className="t-footnote text-label-2 tnum">{(x.confidence * 100).toFixed(0)}% confident</span>
                </div>
              </motion.button>
            )
          })}
        </div>
        <div className="col-span-12 xl:col-span-5 flex flex-col gap-4 md:gap-5">
          <Card title="The evidence" meta={`r = ${p.r.toFixed(2)} · ${days.length} days`}>
            <AnimatePresence mode="wait">
              <motion.div key={sel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <Scatter days={days} pair={PAIRS[sel]} color={CAT[p.category].c} />
              </motion.div>
            </AnimatePresence>
          </Card>
          <Card title="How everything connects" meta="Correlation">
            <div className="flex justify-center">
              <Heatmap matrix={corr} labels={CORR_VARS.map((v) => v.short)} size={360} />
            </div>
            <div className="flex justify-center mt-3">
              <Legend
                items={[
                  { label: 'Rise together', color: C.accent, dot: true },
                  { label: 'Move opposite', color: C.activity, dot: true },
                ]}
              />
            </div>
          </Card>
        </div>
        <Card title="Unusual days" meta={`${anomalies.length} found`} className="col-span-12 xl:col-span-7">
          <Anomalies days={days} anomalies={anomalies} />
        </Card>
        <Card title="Your week" meta="Average by weekday" className="col-span-12 xl:col-span-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="t-footnote font-medium text-label-2 mb-8">Stress</div>
              <Bars data={weekly.stress} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} height={130} color={C.mind} colorFn={(v) => (v > 50 ? 'var(--mind)' : alpha('var(--mind)', 45))} format={(v) => v.toFixed(0)} />
            </div>
            <div>
              <div className="t-footnote font-medium text-label-2 mb-8">Sleep</div>
              <Bars data={weekly.sleep} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} height={130} color={C.sleep} max={9.5} format={(v) => `${v.toFixed(1)} hr`} />
            </div>
          </div>
          <p className="t-subhead text-label-2 mt-4">
            Stress peaks midweek and you catch up on sleep at weekends, about {(mean(weekly.sleep.slice(5)) - mean(weekly.sleep.slice(0, 5))).toFixed(1)} hr more. That gap is often called social jet lag.
          </p>
        </Card>
      </div>
    </>
  )
}

function Scatter({ days, pair, color }: { days: Day[]; pair: [keyof Day, keyof Day, string, string]; color: string }) {
  const [ref, { w }] = useSize<HTMLDivElement>()
  const H = 230
  const pad = { l: 8, r: 8, t: 8, b: 24 }
  const xs = days.map((d) => d[pair[0]] as number)
  const ys = days.map((d) => d[pair[1]] as number)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const X = (v: number) => pad.l + ((v - x0) / (x1 - x0 || 1)) * (w - pad.l - pad.r)
  const Y = (v: number) => pad.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - pad.t - pad.b)
  const mx = mean(xs)
  const my = mean(ys)
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1)
  const r = pearson(xs, ys)
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={H}>
          {[0, 0.5, 1].map((t) => (
            <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + t * (H - pad.t - pad.b)} y2={pad.t + t * (H - pad.t - pad.b)} strokeDasharray={t === 1 ? undefined : '2 3'} style={{ stroke: 'var(--sep)' }} />
          ))}
          {xs.map((x, i) => (
            <motion.circle key={i} initial={{ r: 0 }} animate={{ r: i >= days.length - 7 ? 4.5 : 3.2 }} transition={{ delay: i * 0.003, ...spring }} cx={X(x)} cy={Y(ys[i])} style={{ fill: i >= days.length - 7 ? color : alpha(color, 35) }} />
          ))}
          <motion.line initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.3 }} x1={X(x0)} y1={Y(my + slope * (x0 - mx))} x2={X(x1)} y2={Y(my + slope * (x1 - mx))} strokeWidth={2} strokeLinecap="round" style={{ stroke: 'var(--label)' }} />
          <text x={w - pad.r} y={H - 6} textAnchor="end" fontSize={11} style={{ fill: 'var(--label-3)' }}>
            {pair[2]} →
          </text>
          <text x={pad.l + 2} y={pad.t + 12} fontSize={11} style={{ fill: 'var(--label-3)' }}>
            ↑ {pair[3]}
          </text>
        </svg>
      )}
      <div className="flex justify-between t-footnote text-label-2 mt-1">
        <span className="tnum">Explains {(r * r * 100).toFixed(0)}% of the variation</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} /> Last 7 days
        </span>
      </div>
    </div>
  )
}

function Anomalies({ days, anomalies }: { days: Day[]; anomalies: { dayIdx: number; metric: string; z: number; value: string; date: Date }[] }) {
  const metrics = [
    { k: 'HRV', c: C.heart },
    { k: 'Resting HR', c: C.heart },
    { k: 'Sleep', c: C.sleep },
    { k: 'Stress', c: C.mind },
  ]
  return (
    <div>
      <div className="space-y-2">
        {metrics.map((m) => (
          <div key={m.k} className="grid grid-cols-[88px_1fr] items-center gap-3">
            <span className="t-footnote font-medium text-label-2">{m.k}</span>
            <div className="relative h-7 rounded-lg bg-fill-2">
              {anomalies
                .filter((a) => a.metric === m.k)
                .map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ ...spring, delay: 0.1 + i * 0.04 }}
                    title={`${a.date.toDateString()} · ${a.value}`}
                    className="absolute top-1/2 -mt-[5px] w-[10px] h-[10px] rounded-full -ml-[5px] ring-2 ring-[var(--surface)]"
                    style={{ left: `${(a.dayIdx / (days.length - 1)) * 100}%`, background: m.c }}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[88px_1fr] gap-3 mt-1.5">
        <span />
        <div className="flex justify-between t-footnote text-label-3">
          <span>{days[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <span>Today</span>
        </div>
      </div>
      <div className="hairline my-4" />
      <div className="grid sm:grid-cols-2 gap-x-8">
        {anomalies.slice(0, 6).map((a, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-sep t-subhead">
            <span className="text-label-2 w-14 tnum">{a.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="font-medium">{a.metric}</span>
            <span className="ml-auto tnum text-label-2">{a.value}</span>
            <span className="t-footnote font-semibold" style={{ color: a.z > 0 ? 'var(--warn)' : 'var(--accent)' }}>
              {a.z > 0 ? 'High' : 'Low'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
