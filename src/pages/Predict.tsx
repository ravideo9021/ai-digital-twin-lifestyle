import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { BrainCircuit, HeartPulse, Moon, Salad } from 'lucide-react'
import { alpha, Badge, C, Card, Delta, Legend, PageHeader, Ring, riskColor, riskWord, spring, type IconType } from '../components/ui'
import { LineChart } from '../components/charts'
import { useTwin } from '../store/store'
import { computeRisks, forecast } from '../engine/twin'
import type { Day } from '../data/synthetic'

const ICON: Record<string, IconType> = { burnout: BrainCircuit, insomnia: Moon, metabolic: Salad, cardio: HeartPulse }

export default function Predict() {
  const { risks, days, recs } = useTwin()
  const [sel, setSel] = useState(risks[0].id)
  const risk = risks.find((r) => r.id === sel)!
  const timeline = useMemo(() => {
    const out: number[] = []
    for (let i = days.length - 30; i <= days.length; i++) out.push(computeRisks(days.slice(0, i)).find((x) => x.id === sel)!.probability * 100)
    return out
  }, [days, sel])
  const color = riskColor(risk.probability)

  return (
    <>
      <PageHeader title="Forecasts" subtitle="Your twin scores where your habits are heading and flags problems days or weeks before you would notice them. Every forecast shows what is driving it." actions={<Badge color={C.good}>Calibrated · Brier 0.081</Badge>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        {risks.map((r, i) => {
          const I = ICON[r.id]
          const c = riskColor(r.probability)
          const on = r.id === sel
          return (
            <motion.button
              key={r.id}
              onClick={() => setSel(r.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="card relative text-left p-5 overflow-hidden"
              style={{ boxShadow: on ? `var(--card-highlight), 0 0 0 2px var(--accent), var(--shadow)` : undefined }}
            >
              <div className="flex items-start justify-between">
                <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: alpha(c, 14), color: c }}>
                  <I size={17} strokeWidth={2.2} />
                </span>
                <Ring value={r.probability * 100} size={44} stroke={5} color={c} delay={0.1 + i * 0.05} />
              </div>
              <div className="t-headline mt-4">{r.name}</div>
              <div className="t-footnote text-label-2">Within {r.horizon}</div>
              <div className="flex items-end justify-between mt-3">
                <div className="num text-[34px] font-semibold leading-none" style={{ color: c }}>
                  {(r.probability * 100).toFixed(0)}
                  <span className="text-[17px] text-label-2">%</span>
                </div>
                <div className="text-right">
                  <div className="t-footnote font-semibold" style={{ color: c }}>
                    {riskWord(r.probability)}
                  </div>
                  <Delta value={(r.probability - r.prevProbability) * 100} invert decimals={0} suffix=" pts" />
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={sel} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }} transition={spring} className="grid grid-cols-12 gap-4 md:gap-5 mt-5">
          <Card title="What’s driving this" meta={`${risk.model} · ${(risk.confidence * 100).toFixed(0)}% confidence`} className="col-span-12 xl:col-span-7">
            <p className="t-body text-label-2 mb-5">{risk.summary}</p>
            <div className="space-y-4">
              {risk.drivers.map((d, i) => {
                const max = Math.max(...risk.drivers.map((x) => Math.abs(x.impact)), 0.4)
                const up = d.impact > 0
                const w = (Math.abs(d.impact) / max) * 50
                return (
                  <div key={d.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_52px] items-center gap-4">
                    <div className="min-w-0">
                      <div className="t-callout font-medium truncate">{d.name}</div>
                      <div className="t-footnote text-label-2 tnum">{d.value}</div>
                    </div>
                    <div className="relative h-7 rounded-lg bg-fill-2">
                      <div className="absolute left-1/2 top-1 bottom-1 w-px bg-[var(--sep-strong)]" />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${w}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 + i * 0.07 }}
                        className="absolute top-1.5 bottom-1.5 rounded-md"
                        style={{ [up ? 'left' : 'right']: '50%', background: up ? 'var(--bad)' : 'var(--good)' }}
                      />
                    </div>
                    <div className="t-subhead font-semibold tnum text-right" style={{ color: up ? 'var(--bad)' : 'var(--good)' }}>
                      {up ? '+' : '−'}
                      {Math.abs(d.impact).toFixed(2)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="hairline my-5" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Legend
                items={[
                  { label: 'Raises risk', color: C.bad, dot: true },
                  { label: 'Protects you', color: C.good, dot: true },
                ]}
              />
              <span className="t-footnote text-label-2">Contributions on the log-odds scale, summed into the probability.</span>
            </div>
          </Card>
          <div className="col-span-12 xl:col-span-5 flex flex-col gap-4 md:gap-5">
            <Card title="Last 30 days" meta="Re-scored daily">
              <LineChart height={170} yMin={0} yMax={100} unit="%" series={[{ name: risk.name, data: timeline, color, area: true }]} />
            </Card>
            <Card title="How to lower it">
              <div className="-my-1">
                {recs.slice(0, 3).map((r, i) => (
                  <div key={r.id} className={`flex items-center gap-3 py-2.5 ${i < 2 ? 'border-b border-sep' : ''}`}>
                    <span className="t-subhead font-semibold text-good tnum w-12 shrink-0">−{(r.impact * 2.1).toFixed(0)}%</span>
                    <span className="t-callout truncate">{r.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>
      </AnimatePresence>

      <h2 className="t-title2 mt-10 mb-4">14-day outlook</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <Outlook days={days} k="stress" title="Stress" color={C.mind} />
        <Outlook days={days} k="sleepHours" title="Sleep" color={C.sleep} decimals={1} unit=" hr" />
        <Outlook days={days} k="hrv" title="Heart rate variability" color={C.heart} unit=" ms" />
      </div>
    </>
  )
}

function Outlook({ days, k, title, color, decimals = 0, unit = '' }: { days: Day[]; k: keyof Day; title: string; color: string; decimals?: number; unit?: string }) {
  const hist = days.slice(-30).map((d) => d[k] as number)
  const f = forecast(days, k, 14)
  const last = hist[hist.length - 1]
  const end = f.points[f.points.length - 1]
  return (
    <Card title={title}>
      <div className="flex items-baseline flex-wrap gap-x-2 mb-3">
        <span className="num text-[28px] font-semibold leading-none">
          {end.v.toFixed(decimals)}
          <span className="text-[15px] text-label-2">{unit}</span>
        </span>
        <span className="t-footnote text-label-2">
          in 14 days · range {end.lo.toFixed(decimals)}–{end.hi.toFixed(decimals)}
        </span>
      </div>
      <LineChart
        height={160}
        splitAt={29}
        decimals={decimals}
        unit={unit}
        series={[
          { name: 'Measured', data: hist, color, area: true },
          { name: 'Forecast', data: [last, ...f.points.map((p) => p.v)], color, dashed: true, offset: 29, band: f.points.map((p) => ({ lo: p.lo, hi: p.hi })), bandOffset: 30 },
        ]}
      />
    </Card>
  )
}
