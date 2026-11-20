import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Camera, Sparkles } from 'lucide-react'
import { alpha, C, Card, Legend, PageHeader, Ring, spring } from '../components/ui'
import { LineChart, Radar } from '../components/charts'
import { useStore, useTwin } from '../store/store'
import { glucoseCurve, MEALS } from '../data/synthetic'
import { hhmm } from '../lib/math'

export default function Nutrition() {
  const { today, days } = useTwin()
  const setLog = useStore((s) => s.setLogOpen)
  const glu = useMemo(() => glucoseCurve(), [])
  const last30 = days.slice(-30)
  const macros = [
    { k: 'Energy', v: today.kcal, t: 2700, u: 'kcal', c: C.nutrition },
    { k: 'Protein', v: today.protein, t: 140, u: 'g', c: C.heart },
    { k: 'Carbs', v: today.carbs, t: 320, u: 'g', c: C.activity },
    { k: 'Fat', v: today.fat, t: 85, u: 'g', c: C.warn },
    { k: 'Fiber', v: today.fiber, t: 38, u: 'g', c: C.nutrition },
    { k: 'Water', v: today.water, t: 3.2, u: 'L', c: C.mind },
  ]
  const peak = Math.max(...glu.map((g) => g.v))
  const tir = (glu.filter((g) => g.v >= 70 && g.v <= 140).length / glu.length) * 100

  return (
    <>
      <PageHeader
        title="Nutrition"
        subtitle="Meals are matched against your continuous glucose readings, so your twin learns how your body responds to each food."
        actions={
          <button className="btn btn-secondary" onClick={() => setLog(true)}>
            <Camera size={14} /> Log a meal
          </button>
        }
      />
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <Card className="col-span-12" pad="p-5">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-y-6">
            {macros.map((m, i) => (
              <div key={m.k} className="flex flex-col items-center">
                <Ring value={(m.v / m.t) * 100} size={92} stroke={9} color={m.c} delay={0.05 * i}>
                  <span className="num text-[18px] font-semibold leading-none">{m.v < 10 ? m.v.toFixed(1) : Math.round(m.v).toLocaleString()}</span>
                  <span className="t-footnote text-label-2">{m.u}</span>
                </Ring>
                <div className="t-subhead font-semibold mt-2">{m.k}</div>
                <div className="t-footnote text-label-2 tnum">
                  of {m.t.toLocaleString()} {m.u}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Blood glucose" meta={`${tir.toFixed(0)}% in range · peak ${peak.toFixed(0)} mg/dL`} className="col-span-12 xl:col-span-8">
          <div className="mb-3">
            <Legend
              items={[
                { label: 'Glucose', color: C.nutrition },
                { label: 'Meal', color: C.activity, dot: true },
                { label: '140 mg/dL', color: 'var(--label-3)', dashed: true },
              ]}
            />
          </div>
          <LineChart
            height={250}
            yMin={60}
            yMax={180}
            unit=" mg/dL"
            markers={MEALS.map((m) => ({ x: Math.round((m.time - 6) / 0.1), label: m.name, color: 'var(--activity)' }))}
            xLabels={glu.map((g, i) => (i % 30 === 0 ? hhmm(g.t) : ''))}
            series={[
              { name: 'Target', data: glu.map(() => 140), color: 'var(--label-3)', dashed: true },
              { name: 'Glucose', data: glu.map((g) => g.v), color: C.nutrition, area: true },
            ]}
          />
        </Card>
        <Card title="Micronutrients" meta="7-day estimate" className="col-span-12 md:col-span-6 xl:col-span-4">
          <div className="flex justify-center">
            <Radar
              size={250}
              color={C.nutrition}
              axes={[
                { label: 'Vit D', value: 42 },
                { label: 'B12', value: 88 },
                { label: 'Iron', value: 71 },
                { label: 'Magnesium', value: 58 },
                { label: 'Omega-3', value: 35 },
                { label: 'Vit C', value: 96 },
                { label: 'Potassium', value: 64 },
                { label: 'Calcium', value: 80 },
              ]}
            />
          </div>
          <p className="t-subhead text-label-2 mt-2">
            Low on <span className="text-label font-medium">vitamin D</span> and <span className="text-label font-medium">omega-3</span>. Low magnesium may be slowing how quickly you fall asleep.
          </p>
        </Card>

        <Card title="Today" meta={`${MEALS.length} entries`} className="col-span-12 md:col-span-6 xl:col-span-5">
          <div className="relative">
            {MEALS.map((m, i) => (
              <motion.div key={m.name} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.05 }} className={`flex gap-4 py-3 ${i < MEALS.length - 1 ? 'border-b border-sep' : ''}`}>
                <div className="w-12 shrink-0 t-subhead text-label-2 tnum pt-0.5">{hhmm(m.time)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="t-callout font-medium truncate">{m.name}</span>
                    <span className="ml-auto t-subhead tnum text-label-2 shrink-0">{m.kcal} kcal</span>
                  </div>
                  <div className="flex gap-3 mt-0.5 t-footnote text-label-2 tnum">
                    <span>P {m.protein} g</span>
                    <span>C {m.carbs} g</span>
                    <span>F {m.fat} g</span>
                    {m.gi > 0.7 && <span className="text-warn font-semibold">Spikes glucose</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
        <Card title="Energy balance" meta="Last 30 days" className="col-span-12 xl:col-span-7">
          <div className="mb-3">
            <Legend
              items={[
                { label: 'Eaten', color: C.nutrition },
                { label: 'Burned', color: C.activity },
              ]}
            />
          </div>
          <LineChart
            height={220}
            unit=" kcal"
            xLabels={last30.map((d, i) => (i % 7 === 0 ? d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''))}
            series={[
              { name: 'Eaten', data: last30.map((d) => d.kcal), color: C.nutrition, area: true },
              { name: 'Burned', data: last30.map((d) => d.burn), color: C.activity },
            ]}
          />
        </Card>

        <Card title="Suggested for tomorrow" icon={Sparkles} tint={C.nutrition} className="col-span-12">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { t: '7:45 AM', n: 'Greek yoghurt, walnuts and kiwi', why: 'A protein-first breakfast avoids your mid-morning dip.', k: 520, g: '+18' },
              { t: '12:30 PM', n: 'Grilled salmon, quinoa and greens', why: 'Closes your omega-3 and vitamin D gaps.', k: 780, g: '+26' },
              { t: '4:00 PM', n: 'Hummus, carrots and dark chocolate', why: 'Replaces the cookie that causes your biggest spike.', k: 300, g: '+9' },
              { t: '7:30 PM', n: 'Paneer stir-fry, brown rice, pumpkin seeds', why: 'Magnesium and tryptophan to help you fall asleep.', k: 720, g: '+22' },
            ].map((m, i) => (
              <motion.div key={m.t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.05 }} className="inset p-4" style={{ background: alpha('var(--nutrition)', 7) }}>
                <div className="flex justify-between t-footnote">
                  <span className="font-semibold text-nutrition">{m.t}</span>
                  <span className="text-label-2 tnum">{m.k} kcal</span>
                </div>
                <div className="t-callout font-semibold mt-1.5 leading-snug">{m.n}</div>
                <div className="t-subhead text-label-2 mt-1">{m.why}</div>
                <div className="t-footnote text-label-2 mt-2 tnum">Glucose {m.g} mg/dL</div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
