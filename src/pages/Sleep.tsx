import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Coffee, Footprints, Smartphone, BrainCircuit } from 'lucide-react'
import { alpha, C, Card, Counter, Duration, fmtDuration, Legend, Metric, PageHeader, Ring, scoreColor, Stat, type IconType } from '../components/ui'
import { Bars, Donut, LineChart, useSize } from '../components/charts'
import { useTwin } from '../store/store'
import { generateHypnogram, type Stage } from '../data/synthetic'
import { clamp, hhmm, mean, std, sum } from '../lib/math'

const STAGES: { s: Stage; label: string; c: string }[] = [
  { s: 'Awake', label: 'Awake', c: C.warn },
  { s: 'REM', label: 'REM', c: C.mind },
  { s: 'Light', label: 'Core', c: C.accent },
  { s: 'Deep', label: 'Deep', c: C.sleep },
]
const ROW: Record<Stage, number> = { Awake: 0, REM: 1, Light: 2, Deep: 3 }
const COL: Record<Stage, string> = { Awake: C.warn, REM: C.mind, Light: C.accent, Deep: C.sleep }

export default function Sleep() {
  const { days, today } = useTwin()
  const night = days[days.length - 1]
  const hyp = useMemo(() => generateHypnogram(night), [night])
  const last30 = days.slice(-30)
  const debt = sum(days.slice(-7).map((d) => Math.max(0, 8 - d.sleepHours)))
  const tonight = clamp(night.sleepScore + (today.lateCaffeine > 0 ? -6 : 3) - (today.stress - 45) * 0.2 - (today.screenLate - 60) * 0.05, 30, 98)
  const stageMin = (s: Stage) => hyp.filter((h) => h.stage === s).length * 5
  const wake = (night.bedtime + night.sleepHours) % 24

  return (
    <>
      <PageHeader title="Sleep" subtitle="Sleep stages from your ring and watch, checked against your body clock, with a forecast for tonight based on how today went." />
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <Card title="Last night" meta={`${hhmm(night.bedtime)} – ${hhmm(wake)}`} className="col-span-12 xl:col-span-8">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mb-5">
            <div>
              <div className="t-footnote font-medium text-label-2">Time asleep</div>
              <Duration hours={night.sleepHours} size="lg" />
            </div>
            <div>
              <div className="t-footnote font-medium text-label-2">Sleep score</div>
              <Metric value={<Counter value={night.sleepScore} />} size="lg" color={scoreColor(night.sleepScore)} />
            </div>
            <div className="ml-auto">
              <Legend items={STAGES.map((s) => ({ label: s.label, color: s.c, dot: true }))} />
            </div>
          </div>
          <Hypnogram data={hyp} bedtime={night.bedtime} />
        </Card>
        <Card title="Stages" className="col-span-12 xl:col-span-4">
          <div className="flex items-center gap-6">
            <Donut size={150} thickness={16} segments={STAGES.map((s) => ({ value: stageMin(s.s), color: s.c }))}>
              <span className="num text-[24px] font-semibold leading-none">{night.efficiency.toFixed(0)}%</span>
              <span className="t-footnote text-label-2 mt-1">efficient</span>
            </Donut>
            <div className="flex-1 space-y-3">
              {STAGES.map((s) => {
                const { h, m } = fmtDuration(stageMin(s.s) / 60)
                return (
                  <div key={s.s}>
                    <div className="flex items-center gap-1.5 t-footnote text-label-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.c }} />
                      {s.label}
                    </div>
                    <div className="t-callout font-semibold tnum pl-3.5">
                      {h > 0 && `${h} hr `}
                      {m} min
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {[
          { l: 'Time to fall asleep', v: <Metric value={night.latency.toFixed(0)} unit="min" />, s: 'Ideal: 10–20 min', c: night.latency > 20 ? C.warn : undefined },
          { l: 'Sleep debt this week', v: <Metric value={debt.toFixed(1)} unit="hr" color={debt > 5 ? 'var(--bad)' : undefined} />, s: 'Against an 8-hour need' },
          { l: 'Deep sleep', v: <Metric value={night.deepPct.toFixed(0)} unit="%" />, s: `${((night.deepPct / 100) * night.sleepHours * 60).toFixed(0)} min of restoration` },
          { l: 'REM sleep', v: <Metric value={night.remPct.toFixed(0)} unit="%" />, s: 'Memory and mood' },
        ].map((t, i) => (
          <Card key={t.l} className="col-span-6 md:col-span-3" delay={i * 0.04}>
            <Stat label={t.l} sub={t.s}>
              {t.v}
            </Stat>
          </Card>
        ))}

        <Card title="Last 30 nights" meta={`Average ${fmtDuration(mean(last30.map((d) => d.sleepHours))).h} hr ${fmtDuration(mean(last30.map((d) => d.sleepHours))).m} min`} className="col-span-12 xl:col-span-7">
          <Bars
            data={last30.map((d) => d.sleepHours)}
            target={8}
            height={200}
            max={10}
            color={C.sleep}
            colorFn={(v) => (v >= 7 ? 'var(--sleep)' : alpha('var(--sleep)', 45))}
            labels={last30.map((d, i) => (i % 5 === 0 ? `${d.date.getDate()}` : ''))}
            format={(v) => `${fmtDuration(v).h}h ${fmtDuration(v).m}m`}
          />
          <div className="mt-3">
            <Legend
              items={[
                { label: '7 hr or more', color: C.sleep, dot: true },
                { label: 'Short night', color: alpha('var(--sleep)', 45), dot: true },
                { label: '8 hr goal', color: 'var(--label-3)', dashed: true },
              ]}
            />
          </div>
        </Card>

        <Card title="Tonight" meta="Forecast" className="col-span-12 xl:col-span-5">
          <div className="flex items-center gap-6">
            <Ring value={tonight} size={112} stroke={11} color={scoreColor(tonight)}>
              <Counter value={tonight} className="num text-[30px] font-semibold leading-none" />
              <span className="t-footnote text-label-2">expected</span>
            </Ring>
            <div className="flex-1 min-w-0 space-y-2.5">
              <Factor icon={Coffee} k="Caffeine after 4 PM" v={today.lateCaffeine > 0 ? `${today.lateCaffeine.toFixed(0)} mg` : 'None'} bad={today.lateCaffeine > 0} />
              <Factor icon={BrainCircuit} k="Stress today" v={`${today.stress.toFixed(0)} / 100`} bad={today.stress > 50} />
              <Factor icon={Smartphone} k="Screens after 9 PM" v={`${today.screenLate.toFixed(0)} min`} bad={today.screenLate > 60} />
              <Factor icon={Footprints} k="Movement" v={`${(today.steps / 1000).toFixed(1)}k steps`} bad={today.steps < 7000} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            {[
              ['Bedtime', '10:50 PM'],
              ['Wake up', '6:55 AM'],
              ['Cycles', '5 × 90 min'],
            ].map(([k, v]) => (
              <div key={k} className="inset px-3 py-2.5">
                <div className="t-footnote text-label-2">{k}</div>
                <div className="t-callout font-semibold tnum">{v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Bedtime consistency" meta={`Varies by ±${(std(last30.map((d) => d.bedtime)) * 60).toFixed(0)} min · goal ±20 min`} className="col-span-12">
          <LineChart
            height={170}
            decimals={1}
            xLabels={last30.map((d, i) => (i % 5 === 0 ? d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''))}
            series={[
              { name: 'Bedtime (hour)', data: last30.map((d) => d.bedtime), color: C.sleep, area: true },
              { name: '7-day average', data: last30.map((_, i) => mean(last30.slice(Math.max(0, i - 6), i + 1).map((d) => d.bedtime))), color: 'var(--label-3)', dashed: true },
            ]}
          />
        </Card>
      </div>
    </>
  )
}

function Factor({ icon: I, k, v, bad }: { icon: IconType; k: string; v: string; bad: boolean }) {
  return (
    <div className="flex items-center gap-2.5 t-subhead">
      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: alpha(bad ? 'var(--warn)' : 'var(--good)', 14), color: bad ? 'var(--warn)' : 'var(--good)' }}>
        <I size={12} strokeWidth={2.4} />
      </span>
      <span className="text-label-2 truncate">{k}</span>
      <span className="ml-auto font-semibold tnum">{v}</span>
    </div>
  )
}

function Hypnogram({ data, bedtime }: { data: { t: number; stage: Stage }[]; bedtime: number }) {
  const [ref, { w }] = useSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = 200
  const rowH = (H - 26) / 4
  const ew = w / data.length
  const runs: { start: number; end: number; stage: Stage }[] = []
  data.forEach((e, i) => {
    const last = runs[runs.length - 1]
    if (last && last.stage === e.stage) last.end = i + 1
    else runs.push({ start: i, end: i + 1, stage: e.stage })
  })
  const y = (s: Stage) => ROW[s] * rowH + rowH / 2
  const hourMarks = data.map((e, i) => ({ i, t: bedtime + e.t / 60 })).filter((x, i) => i > 0 && Math.floor(x.t) !== Math.floor(bedtime + data[i - 1].t / 60))
  return (
    <div ref={ref} className="relative w-full select-none" onPointerLeave={() => setHover(null)} onPointerMove={(e) => {
      const r = e.currentTarget.getBoundingClientRect()
      setHover(Math.max(0, Math.min(data.length - 1, Math.floor(((e.clientX - r.left) / r.width) * data.length))))
    }}>
      {w > 0 && (
        <motion.svg width={w} height={H} initial={{ clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
          {STAGES.map((s) => (
            <line key={s.s} x1={0} x2={w} y1={y(s.s)} y2={y(s.s)} strokeDasharray="2 4" style={{ stroke: 'var(--sep)' }} />
          ))}
          {runs.map((r, i) => {
            const next = runs[i + 1]
            return (
              <g key={i}>
                {next && <line x1={r.end * ew} x2={r.end * ew} y1={y(r.stage)} y2={y(next.stage)} strokeWidth={1.5} style={{ stroke: 'var(--sep-strong)' }} />}
                <rect x={r.start * ew + 0.5} y={y(r.stage) - 8} width={Math.max(3, (r.end - r.start) * ew - 1)} height={16} rx={5} style={{ fill: COL[r.stage] }} />
              </g>
            )
          })}
          {hourMarks.map((m) => (
            <text key={m.i} x={m.i * ew} y={H - 4} fontSize={11} textAnchor="middle" className="tnum" style={{ fill: 'var(--label-3)' }}>
              {(() => {
                const hr = Math.floor(m.t) % 24
                return `${hr % 12 || 12} ${hr < 12 ? 'AM' : 'PM'}`
              })()}
            </text>
          ))}
          {hover !== null && <line x1={hover * ew + ew / 2} x2={hover * ew + ew / 2} y1={0} y2={H - 22} style={{ stroke: 'var(--label-3)' }} />}
        </motion.svg>
      )}
      {hover !== null && (
        <div className="absolute -top-9 pointer-events-none px-2.5 py-1 rounded-lg bg-surface shadow-[var(--shadow-lg)] t-footnote font-semibold whitespace-nowrap" style={{ left: Math.min(Math.max(hover * ew - 50, 0), w - 120) }}>
          <span style={{ color: COL[data[hover].stage] }}>{STAGES.find((s) => s.s === data[hover].stage)!.label}</span>
          <span className="text-label-2 font-normal tnum"> · {hhmm(bedtime + data[hover].t / 60)}</span>
        </div>
      )}
    </div>
  )
}
