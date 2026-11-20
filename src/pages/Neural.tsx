import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Cpu, Lock, ShieldCheck, Smartphone } from 'lucide-react'
import { alpha, Badge, Bar, C, Card, Legend, PageHeader, spring, StatusDot } from '../components/ui'
import { LineChart, Sparkline, useSize } from '../components/charts'
import { gaussian, mulberry32 } from '../lib/math'

const COLS = [
  { t: 'Sources', items: ['Smart ring', 'Watch', 'Glucose sensor', 'Health records', 'Phone', 'Home sensors'], c: C.label2 },
  { t: 'Ingest', items: ['Stream router', 'Quality checks', 'Gap filling'], c: C.mind },
  { t: 'Features', items: ['412 features', 'Time windows'], c: C.sleep },
  { t: 'Models', items: ['Sleep LSTM', 'Stress GBM', 'Metabolic XGB', 'Cardio TCN', 'Anomaly forest', 'Coach bandit'], c: C.accent },
  { t: 'Twin', items: ['Bayesian fusion'], c: C.nutrition },
  { t: 'Experience', items: ['Summary', 'Ask Soma', 'Alerts'], c: C.activity },
]

const MODELS = [
  { n: 'Sleep LSTM', v: '2.7', task: 'Sleep stages and forecast', arch: 'Bi-LSTM · 3 × 128', m: 'κ 0.81', st: 'Serving', d: 0.4 },
  { n: 'Stress GBM', v: '3.2', task: 'Burnout risk', arch: 'LightGBM · 600 trees', m: 'AUROC 0.91', st: 'Serving', d: 0.9 },
  { n: 'Metabolic XGB', v: '1.9', task: 'Metabolic drift', arch: 'XGBoost · depth 6', m: 'AUROC 0.87', st: 'Serving', d: 1.4 },
  { n: 'Cardio TCN', v: '1.4', task: 'Heart strain', arch: 'Temporal ConvNet', m: 'MAE 1.8 BPM', st: 'Retraining', d: 3.1 },
  { n: 'Anomaly forest', v: '1.1', task: 'Unusual-day detection', arch: 'Isolation Forest', m: 'F1 0.79', st: 'Serving', d: 0.2 },
  { n: 'Coach bandit', v: '0.9', task: 'Recommendations', arch: 'Contextual bandit', m: 'Uplift +11%', st: 'Shadow', d: 0.7 },
]

const LOGS = [
  () => ['infer', `stress-gbm  p=${(0.52 + Math.random() * 0.08).toFixed(3)}  ${(2 + Math.random() * 2).toFixed(1)}ms`],
  () => ['ingest', `watch.ecg  ${Math.floor(240 + Math.random() * 20)} samples  ok`],
  () => ['infer', `anomaly    score=${(-0.1 - Math.random() * 0.2).toFixed(3)}  normal`],
  () => ['fuse', `twin.state  gain=${(0.2 + Math.random() * 0.1).toFixed(3)}`],
  () => ['infer', `sleep-lstm  tonight=${(64 + Math.random() * 6).toFixed(1)}`],
  () => ['ingest', `cgm  ${Math.floor(98 + Math.random() * 20)} mg/dL`],
  () => ['policy', 'coach  action=breathing_break  ε=0.05'],
  () => ['drift', `cardio-tcn  PSI=${(0.08 + Math.random() * 0.06).toFixed(3)} < 0.20`],
]

export default function Neural() {
  const loss = useMemo(() => {
    const r = mulberry32(8)
    const tr: number[] = []
    const va: number[] = []
    for (let e = 0; e < 60; e++) {
      tr.push(0.9 * Math.exp(-e / 11) + 0.035 + gaussian(r) * 0.006)
      va.push(0.9 * Math.exp(-e / 12) + 0.045 + gaussian(r) * 0.01 + (e > 45 ? (e - 45) * 0.0008 : 0))
    }
    return { tr, va }
  }, [])
  const fi = [
    ['HRV trend (7 days)', 0.21],
    ['Sleep debt', 0.17],
    ['Late caffeine', 0.12],
    ['Recent stress', 0.11],
    ['Bedtime variability', 0.09],
    ['Steps (14 days)', 0.08],
    ['Late screen time', 0.07],
    ['Resting HR change', 0.06],
  ] as const

  return (
    <>
      <PageHeader
        title="Models & Data"
        subtitle="How your twin works: data from your devices becomes features, a set of specialised models reads them, and Bayesian fusion combines their outputs into a single picture of you."
        actions={
          <>
            <Badge color={C.good}>
              <StatusDot pulse /> 6 of 6 healthy
            </Badge>
            <Badge color={C.accent}>
              <Lock size={11} /> On-device
            </Badge>
          </>
        }
      />
      <Card title="Pipeline" meta="Live" pad="px-2 pb-4 pt-0">
        <Pipeline />
      </Card>
      <div className="grid grid-cols-12 gap-4 md:gap-5 mt-4 md:mt-5">
        <Card title="Models" className="col-span-12 xl:col-span-8" pad="px-2 pb-3 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] t-subhead">
              <thead>
                <tr className="text-left text-label-2">
                  {['Model', 'Purpose', 'Architecture', 'Quality', 'Drift', 'Status'].map((h) => (
                    <th key={h} className="font-medium px-3 py-2.5 border-b border-sep">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m, i) => (
                  <motion.tr key={m.n} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="hover:bg-fill-2 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-semibold">{m.n}</span> <span className="text-label-3">v{m.v}</span>
                    </td>
                    <td className="px-3 text-label-2">{m.task}</td>
                    <td className="px-3 text-label-2 whitespace-nowrap">{m.arch}</td>
                    <td className="px-3 font-medium tnum whitespace-nowrap">{m.m}</td>
                    <td className="px-3 w-[96px]">
                      <Sparkline data={Array.from({ length: 20 }, (_, k) => m.d + Math.sin(k / 2 + i) * 0.3 + k * 0.02 * m.d)} color={m.d > 2 ? C.warn : C.good} height={22} fill={false} />
                    </td>
                    <td className="px-3">
                      <Badge color={m.st === 'Serving' ? C.good : m.st === 'Retraining' ? C.warn : C.sleep}>{m.st}</Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Console />
        <Card title="Training" meta="Sleep LSTM · 60 epochs" className="col-span-12 xl:col-span-6">
          <div className="mb-3">
            <Legend
              items={[
                { label: 'Training loss', color: C.accent },
                { label: 'Validation loss', color: C.activity },
              ]}
            />
          </div>
          <LineChart height={200} decimals={2} markers={[{ x: 46, label: 'Early stop', color: 'var(--good)' }]} series={[{ name: 'Training', data: loss.tr, color: C.accent, area: true }, { name: 'Validation', data: loss.va, color: C.activity }]} />
          <p className="t-footnote text-label-2 mt-2">Training stopped early at epoch 46, when validation loss stopped improving.</p>
        </Card>
        <Card title="What the models pay attention to" meta="Mean |SHAP|" className="col-span-12 xl:col-span-6">
          <div className="space-y-3">
            {fi.map(([k, v], i) => (
              <div key={k} className="grid grid-cols-[160px_1fr_40px] items-center gap-3 t-subhead">
                <span className="truncate">{k}</span>
                <Bar value={(v / 0.21) * 100} color={C.accent} height={8} delay={i * 0.05} />
                <span className="font-semibold tnum text-right">{v.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
        {[
          { i: Smartphone, t: 'Private by design', b: 'Models train on your device each night. Raw health data never leaves it.' },
          { i: ShieldCheck, t: 'Federated learning', b: 'Only encrypted, differentially private updates are shared to improve the models.' },
          { i: Cpu, t: 'Explainable', b: 'Every prediction comes with the factors behind it. No black boxes.' },
        ].map((x, i) => {
          const I = x.i
          return (
            <Card key={x.t} className="col-span-12 md:col-span-4" delay={i * 0.05}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: alpha('var(--accent)', 12), color: 'var(--accent)' }}>
                <I size={19} />
              </span>
              <div className="t-headline mt-3">{x.t}</div>
              <p className="t-subhead text-label-2 mt-1">{x.b}</p>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function Pipeline() {
  const [ref, { w }] = useSize<HTMLDivElement>()
  const W = Math.max(w, 920)
  const H = 340
  const nodeW = 128
  const colX = (i: number) => nodeW / 2 + 16 + (i / (COLS.length - 1)) * (W - nodeW - 32)
  const nodeY = (ci: number, ni: number) => 40 + (H - 40) / 2 + (ni - (COLS[ci].items.length - 1) / 2) * 46
  const edges: { d: string; c: string; k: string }[] = []
  for (let ci = 0; ci < COLS.length - 1; ci++)
    COLS[ci].items.forEach((_, a) =>
      COLS[ci + 1].items.forEach((__, b) => {
        if (COLS[ci].items.length * COLS[ci + 1].items.length > 12 && (a + b) % 2) return
        const x1 = colX(ci) + nodeW / 2
        const x2 = colX(ci + 1) - nodeW / 2
        const y1 = nodeY(ci, a)
        const y2 = nodeY(ci + 1, b)
        const mx = (x1 + x2) / 2
        edges.push({ d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, c: COLS[ci + 1].c, k: `${ci}-${a}-${b}` })
      }),
    )
  return (
    <div ref={ref} className="w-full overflow-x-auto">
      {w > 0 && (
        <svg width={W} height={H}>
          {edges.map((e, i) => (
            <g key={e.k}>
              <path id={`e${i}`} d={e.d} fill="none" strokeWidth={1.25} style={{ stroke: 'var(--sep-strong)' }} />
              <circle r={3} style={{ fill: e.c }}>
                <animateMotion dur={`${2.2 + (i % 5) * 0.5}s`} repeatCount="indefinite" begin={`${(i % 7) * 0.35}s`}>
                  <mpath href={`#e${i}`} />
                </animateMotion>
              </circle>
            </g>
          ))}
          {COLS.map((col, ci) => (
            <g key={col.t}>
              <text x={colX(ci)} y={20} textAnchor="middle" fontSize={12} fontWeight={600} style={{ fill: 'var(--label-2)' }}>
                {col.t}
              </text>
              {col.items.map((it, ni) => (
                <motion.g key={it} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: ci * 0.08 + ni * 0.03 }}>
                  <rect x={colX(ci) - nodeW / 2} y={nodeY(ci, ni) - 16} width={nodeW} height={32} rx={10} style={{ fill: 'var(--surface)', stroke: 'var(--sep-strong)' }} />
                  <circle cx={colX(ci) - nodeW / 2 + 14} cy={nodeY(ci, ni)} r={4} style={{ fill: col.c }} />
                  <text x={colX(ci) - nodeW / 2 + 26} y={nodeY(ci, ni) + 4.5} fontSize={12} fontWeight={500} style={{ fill: 'var(--label)' }}>
                    {it}
                  </text>
                </motion.g>
              ))}
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}

function Console() {
  const [lines, setLines] = useState<{ id: number; t: string; k: string; s: string }[]>([])
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let id = 0
    const add = () => {
      const [k, s] = LOGS[Math.floor(Math.random() * LOGS.length)]()
      setLines((l) => [...l.slice(-50), { id: id++, t: new Date().toLocaleTimeString('en-GB'), k, s }])
    }
    for (let i = 0; i < 10; i++) add()
    const iv = setInterval(add, 900)
    return () => clearInterval(iv)
  }, [])
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' })
  }, [lines])
  const col: Record<string, string> = { infer: '#64d2ff', ingest: '#30d158', fuse: '#bf5af2', policy: '#ff9f0a', drift: '#ffd60a' }
  return (
    <section className="col-span-12 xl:col-span-4 rounded-[20px] bg-[#0c0c0e] text-white overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08),0_20px_40px_-20px_rgba(0,0,0,0.6)] flex flex-col">
      <div className="flex items-center gap-2 px-4 h-11 border-b border-white/[0.08]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[12px] text-white/50 font-medium">Live inference</span>
      </div>
      <div ref={box} className="flex-1 h-[320px] overflow-y-auto px-4 py-3 font-mono text-[11.5px] leading-[1.8]">
        {lines.map((l) => (
          <motion.div key={l.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="whitespace-nowrap">
            <span className="text-white/30">{l.t}</span> <span style={{ color: col[l.k] }}>{l.k.padEnd(6)}</span> <span className="text-white/75">{l.s}</span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
