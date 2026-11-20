import { motion } from 'motion/react'
import { useMemo } from 'react'
import { alpha, C, Card, Counter, Legend, Metric, PageHeader, Ring, spring, Stat } from '../components/ui'
import { Bars, CalendarHeat, LineChart } from '../components/charts'
import { useStore, useTwin } from '../store/store'
import { mean, mulberry32 } from '../lib/math'

export default function ActivityPage() {
  const { days } = useTwin()
  const steps = useStore((s) => s.vitals.steps)
  const kcal = useStore((s) => s.vitals.kcal)
  const last = days[days.length - 1]
  const moveKcal = Math.round(kcal * 0.4)
  const hourly = useMemo(() => {
    const r = mulberry32(12)
    const h = new Date().getHours()
    return Array.from({ length: 24 }, (_, i) => (i > h || i < 7 ? 0 : Math.round((i === 8 || i === 13 ? 900 : i === 18 ? 1500 : 260) + r() * 360)))
  }, [])
  const acwr = useMemo(() => {
    const out: number[] = []
    for (let i = days.length - 45; i < days.length; i++) out.push(mean(days.slice(i - 6, i + 1).map((d) => d.activeMin)) / mean(days.slice(i - 27, i + 1).map((d) => d.activeMin)))
    return out
  }, [days])
  const load = acwr[acwr.length - 1]
  const zones = [
    { z: 'Zone 1 · Easy', m: 142 },
    { z: 'Zone 2 · Endurance', m: 38 },
    { z: 'Zone 3 · Tempo', m: 14 },
    { z: 'Zone 4 · Threshold', m: 6 },
    { z: 'Zone 5 · Max', m: 2 },
  ]
  const rings = [
    { l: 'Move', v: (moveKcal / 650) * 100, c: C.heart, val: `${moveKcal} / 650`, u: 'kcal' },
    { l: 'Exercise', v: (last.activeMin / 45) * 100, c: C.nutrition, val: `${last.activeMin} / 45`, u: 'min' },
    { l: 'Steps', v: (steps / 10000) * 100, c: C.activity, val: `${steps.toLocaleString()}`, u: 'of 10k' },
  ]

  return (
    <>
      <PageHeader title="Activity" subtitle="Movement, fitness and training load, so your twin can keep you between too little and too much." />
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <Card title="Today" className="col-span-12 xl:col-span-5">
          <div className="flex items-center gap-7">
            <div className="relative w-[168px] h-[168px] shrink-0">
              {rings.map((r, i) => (
                <div key={r.l} className="absolute" style={{ inset: i * 22 }}>
                  <Ring value={Math.min(100, r.v)} size={168 - i * 44} stroke={18} color={r.c} delay={0.1 + i * 0.12} />
                </div>
              ))}
            </div>
            <div className="space-y-4 min-w-0">
              {rings.map((r) => (
                <div key={r.l}>
                  <div className="t-subhead font-semibold" style={{ color: r.c }}>
                    {r.l}
                  </div>
                  <div className="num text-[20px] font-semibold leading-tight">
                    {r.val} <span className="text-[13px] text-label-2">{r.u}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="col-span-12 xl:col-span-7 grid grid-cols-2 gap-4 md:gap-5">
          <Card>
            <Stat label="Cardio fitness (VO₂ max)" sub="Above average for men 20–29">
              <Metric value={<Counter value={last.vo2} decimals={1} />} unit="ml/kg/min" color="var(--good)" />
            </Stat>
          </Card>
          <Card>
            <Stat label="Training load" sub={load < 0.8 ? 'Below your usual. Room to build.' : load > 1.3 ? 'Spiking. Injury risk is up.' : 'In the sweet spot'}>
              <Metric value={<Counter value={load} decimals={2} />} color={load < 0.8 ? 'var(--warn)' : 'var(--good)'} />
            </Stat>
          </Card>
          <Card>
            <Stat label="Active energy" sub="Includes your resting burn">
              <Metric value={last.burn.toLocaleString()} unit="kcal" />
            </Stat>
          </Card>
          <Card>
            <Stat label="Exercise this week" sub="WHO goal: 150 min">
              <Metric value={days.slice(-7).reduce((s, d) => s + d.activeMin, 0)} unit="min" />
            </Stat>
          </Card>
        </div>

        <Card title="Daily steps" meta={`${Math.ceil(days.length / 7)} weeks`} className="col-span-12 xl:col-span-8">
          <CalendarHeat values={days.map((d) => d.steps)} color={C.activity} />
          <div className="flex justify-between items-center mt-3 t-footnote text-label-2">
            <span>{days[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="flex items-center gap-1">
              Fewer
              {[15, 35, 60, 80, 100].map((o) => (
                <span key={o} className="w-3 h-3 rounded-[3px]" style={{ background: alpha('var(--activity)', o) }} />
              ))}
              More
            </span>
            <span>Today</span>
          </div>
        </Card>
        <Card title="Heart rate zones" meta="Today" className="col-span-12 md:col-span-6 xl:col-span-4">
          <div className="space-y-3.5">
            {zones.map((z, i) => (
              <div key={z.z}>
                <div className="flex justify-between t-subhead">
                  <span>{z.z}</span>
                  <span className="font-semibold tnum">{z.m} min</span>
                </div>
                <div className="h-2 rounded-full mt-1.5 overflow-hidden" style={{ background: 'var(--fill-2)' }}>
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${(z.m / 142) * 100}%` }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.06 }} className="h-full rounded-full" style={{ background: `color-mix(in srgb, var(--heart) ${40 + i * 15}%, var(--activity))` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Steps by hour" meta="Today" className="col-span-12 md:col-span-6 xl:col-span-5">
          <Bars data={hourly} height={180} color={C.activity} labels={hourly.map((_, i) => (i % 6 === 0 ? `${i % 12 || 12}${i < 12 ? 'a' : 'p'}` : ''))} format={(v) => `${v.toLocaleString()} steps`} />
          <p className="t-subhead text-label-2 mt-3">You sat for more than 90 minutes twice today. A short walk every hour helps both focus and glucose.</p>
        </Card>
        <Card title="Training load" meta="Acute vs. chronic · 45 days" className="col-span-12 xl:col-span-7">
          <div className="mb-3">
            <Legend
              items={[
                { label: 'Load ratio', color: C.activity },
                { label: 'Sweet spot 0.8–1.3', color: 'var(--label-3)', dashed: true },
              ]}
            />
          </div>
          <LineChart
            height={190}
            decimals={2}
            yMin={0.5}
            yMax={1.6}
            series={[
              { name: 'Upper', data: acwr.map(() => 1.3), color: 'var(--label-3)', dashed: true },
              { name: 'Lower', data: acwr.map(() => 0.8), color: 'var(--label-3)', dashed: true },
              { name: 'Load ratio', data: acwr, color: C.activity, area: true },
            ]}
          />
        </Card>
        <Card title="Cardio fitness" meta={`${days.length} days`} className="col-span-12">
          <LineChart height={170} decimals={1} xLabels={days.map((d, i) => (i % 14 === 0 ? d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''))} series={[{ name: 'VO₂ max', data: days.map((d) => d.vo2), color: C.good, area: true }]} />
        </Card>
      </div>
    </>
  )
}
