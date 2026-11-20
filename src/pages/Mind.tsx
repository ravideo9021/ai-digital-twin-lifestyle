import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { C, Card, Legend, PageHeader, spring } from '../components/ui'
import { LineChart } from '../components/charts'
import { useStore, useTwin } from '../store/store'
import { intradayStress } from '../data/synthetic'
import { hhmm, pearson } from '../lib/math'

export default function Mind() {
  const { days } = useTwin()
  const stressNow = useStore((s) => s.vitals.stress)
  const intra = useMemo(() => intradayStress(), [])
  const last30 = days.slice(-30)
  const triggers = useMemo(() => {
    const col = (k: keyof (typeof days)[0]) => days.map((d) => d[k] as number)
    return [
      { k: 'Workload and deadlines', r: pearson(col('workload'), col('stress')) },
      { k: 'Short sleep the night before', r: -pearson(days.slice(0, -1).map((d) => d.sleepHours), days.slice(1).map((d) => d.stress)) },
      { k: 'Caffeine', r: pearson(col('caffeine'), col('stress')) },
      { k: 'Late screen time', r: pearson(col('screenLate'), col('stress')) },
      { k: 'Moving less', r: -pearson(col('steps'), col('stress')) },
      { k: 'Mindful minutes', r: pearson(col('meditation'), col('stress')) },
    ].sort((a, b) => b.r - a.r)
  }, [days])
  const word = stressNow > 65 ? 'High' : stressNow > 45 ? 'Elevated' : 'Calm'
  const wc = stressNow > 65 ? 'var(--bad)' : stressNow > 45 ? 'var(--warn)' : 'var(--good)'

  return (
    <>
      <PageHeader title="Mind" subtitle="Stress is estimated from heart rate variability and your daily patterns. Your twin traces each spike back to its causes and can walk you through a reset." />
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <Breathe />
        <div className="col-span-12 xl:col-span-7 flex flex-col gap-4 md:gap-5">
          <Card title="Stress today" meta="Updated every second">
            <div className="flex flex-wrap items-baseline gap-3 mb-4">
              <span className="num text-[44px] font-semibold leading-none">{stressNow.toFixed(0)}</span>
              <span className="t-headline" style={{ color: wc }}>
                {word}
              </span>
              <span className="ml-auto">
                <Legend
                  items={[
                    { label: 'Stress', color: C.mind },
                    { label: 'Meeting', color: C.warn, dot: true },
                  ]}
                />
              </span>
            </div>
            <LineChart
              height={170}
              yMin={0}
              yMax={100}
              markers={[
                { x: (10 - 6) / 0.25, label: 'Standup', color: 'var(--warn)' },
                { x: (14.5 - 6) / 0.25, label: 'Review', color: 'var(--warn)' },
              ]}
              xLabels={intra.map((p, i) => (i % 12 === 0 ? hhmm(p.t) : ''))}
              series={[{ name: 'Stress', data: intra.map((p) => p.v), color: C.mind, area: true }]}
            />
          </Card>
          <Card title="What drives your stress" meta={`From ${days.length} days`}>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3.5">
              {triggers.map((t, i) => {
                const up = t.r > 0
                return (
                  <div key={t.k}>
                    <div className="flex justify-between t-subhead">
                      <span>{t.k}</span>
                      <span className="font-semibold" style={{ color: up ? 'var(--bad)' : 'var(--good)' }}>
                        {up ? 'Raises' : 'Lowers'}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full mt-1.5" style={{ background: 'var(--fill-2)' }}>
                      <div className="absolute left-1/2 -top-0.5 -bottom-0.5 w-px bg-[var(--sep-strong)]" />
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${Math.abs(t.r) * 50}%` }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.05 }} className="absolute top-0 bottom-0 rounded-full" style={{ [up ? 'left' : 'right']: '50%', background: up ? 'var(--bad)' : 'var(--good)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
        <Card title="Recovery" meta="HRV and resting heart rate · 30 days" className="col-span-12 xl:col-span-7">
          <div className="mb-3">
            <Legend
              items={[
                { label: 'HRV (ms)', color: C.nutrition },
                { label: 'Resting HR (BPM)', color: C.heart },
              ]}
            />
          </div>
          <LineChart
            height={210}
            xLabels={last30.map((d, i) => (i % 7 === 0 ? d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''))}
            series={[
              { name: 'HRV', data: last30.map((d) => d.hrv), color: C.nutrition, area: true },
              { name: 'Resting HR', data: last30.map((d) => d.rhr), color: C.heart },
            ]}
          />
        </Card>
        <Card title="Mood" meta="Last 5 weeks" className="col-span-12 xl:col-span-5">
          <div className="grid grid-cols-7 gap-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center t-footnote font-semibold text-label-3 pb-1">
                {d}
              </div>
            ))}
            {days.slice(-35).map((d, i) => {
              const m = d.mood
              const c = m > 4 ? '#ffcc00' : m > 3.4 ? '#7ed957' : m > 2.7 ? '#5ac8c8' : m > 2 ? '#64a8ff' : '#8e8ef0'
              return (
                <motion.div key={i} initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.01 }} title={`${d.date.toDateString()} · ${m.toFixed(1)} / 5`} className="h-10 rounded-[10px] flex items-center justify-center t-footnote font-semibold tnum" style={{ background: `color-mix(in srgb, ${c} ${30 + m * 12}%, transparent)` }}>
                  {d.date.getDate()}
                </motion.div>
              )
            })}
          </div>
          <div className="mt-4">
            <Legend
              items={[
                { label: 'Low', color: '#8e8ef0', dot: true },
                { label: 'Okay', color: '#5ac8c8', dot: true },
                { label: 'Good', color: '#7ed957', dot: true },
                { label: 'Great', color: '#ffcc00', dot: true },
              ]}
            />
          </div>
        </Card>
      </div>
    </>
  )
}

function Breathe() {
  const [on, setOn] = useState(false)
  const [t, setT] = useState(0)
  const log = useStore((s) => s.logEntry)
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => setT((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [on])
  const CYC = 10
  const cycles = Math.floor(t / CYC)
  const tc = t % CYC
  const inhale = tc < 4
  const phase = !on ? 'Ready when you are' : inhale ? 'Breathe in' : 'Breathe out'
  const left = inhale ? 4 - tc : 10 - tc
  const done = useRef(false)
  useEffect(() => {
    if (t >= CYC * 6 && !done.current) {
      done.current = true
      setOn(false)
      setT(0)
      log('meditate')
      setTimeout(() => (done.current = false), 500)
    }
  }, [t, log])
  const petals = 6
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      className="col-span-12 xl:col-span-5 relative rounded-[24px] overflow-hidden min-h-[520px] flex flex-col items-center justify-between p-7 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_30px_60px_-24px_rgba(0,0,0,0.5)]"
      style={{ background: 'radial-gradient(100% 80% at 50% 40%, #0f4f5c 0%, #072a33 50%, #03141a 100%)' }}
    >
      <div className="self-stretch flex justify-between">
        <div>
          <div className="t-title3">Breathe</div>
          <div className="t-footnote text-white/55 mt-0.5">One minute · 6 breaths</div>
        </div>
        <div className="text-right">
          <div className="t-footnote text-white/55">Breaths</div>
          <div className="num text-[20px] font-semibold">{cycles} / 6</div>
        </div>
      </div>
      <div className="relative w-[240px] h-[240px] flex items-center justify-center">
        {Array.from({ length: petals }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[120px] h-[120px] rounded-full mix-blend-screen"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(100,230,220,0.55), rgba(40,170,200,0.25) 60%, transparent 72%)' }}
            animate={on ? { x: Math.cos((i / petals) * Math.PI * 2) * (inhale ? 52 : 10), y: Math.sin((i / petals) * Math.PI * 2) * (inhale ? 52 : 10), scale: inhale ? 1 : 0.55, rotate: inhale ? 60 : 0 } : { x: Math.cos((i / petals) * Math.PI * 2) * 26, y: Math.sin((i / petals) * Math.PI * 2) * 26, scale: 0.75, rotate: 0 }}
            transition={{ duration: on ? (inhale ? 4 : 6) : 1.4, ease: [0.45, 0, 0.55, 1] }}
          />
        ))}
      </div>
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div key={phase} initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.45 }} className="t-title2">
            {phase}
          </motion.div>
        </AnimatePresence>
        <div className="t-subhead text-white/55 mt-1 h-5 tnum">{on ? `${left}` : 'Lowers stress about 6 points for you'}</div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setOn(!on)} className="mt-5 h-11 px-6 rounded-full bg-white text-[#06323b] text-[15px] font-semibold inline-flex items-center gap-2 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
          {on ? <Pause size={16} /> : <Play size={16} />}
          {on ? 'Pause' : 'Start'}
        </motion.button>
      </div>
    </motion.section>
  )
}
