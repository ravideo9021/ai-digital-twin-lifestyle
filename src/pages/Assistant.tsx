import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Mic } from 'lucide-react'
import { C, Card, PageHeader, spring } from '../components/ui'
import { Bars, LineChart, Sparkline } from '../components/charts'
import { Logo } from '../components/Shell'
import { useStore, useTwin, type ChatMsg } from '../store/store'
import { forecast } from '../engine/twin'
import { SUBJECT } from '../data/synthetic'
import { mean } from '../lib/math'

type Twin = ReturnType<typeof useTwin>

const SUGGEST = ['Why is my stress high this week?', 'How did I sleep last night?', 'What should I eat tomorrow?', 'Predict my next 14 days', 'Is coffee hurting my sleep?', 'What is my biological age?']

/** Intent router over real twin computations. Swap for an LLM with tool-calls in production. */
export function respond(q: string, t: Twin): { steps: string[]; text: string; chart?: ChatMsg['chart'] } {
  const s = q.toLowerCase()
  const w = t.days.slice(-7)
  const avg = (k: keyof (typeof w)[0]) => mean(w.map((d) => d[k] as number))
  const burn = t.risks.find((r) => r.id === 'burnout')!
  const ins = t.risks.find((r) => r.id === 'insomnia')!
  const p = (id: string) => t.patterns.find((x) => x.id === id)!
  if (/stress|anxi|burn|overwhelm|tense/.test(s))
    return {
      steps: ['Reading the last 7 days', 'Scoring burnout risk', 'Finding what drives it'],
      chart: 'stress',
      text: `Your stress has averaged **${avg('stress').toFixed(0)} out of 100** this week, ${avg('stress') > 45 ? 'above' : 'close to'} your usual level. Burnout risk is **${(burn.probability * 100).toFixed(0)}%**.\n\nWhat’s pushing it up:\n${burn.drivers
        .filter((d) => d.impact > 0)
        .map((d) => `• ${d.name} (${d.value})`)
        .join('\n')}\n\nThere’s also a knock-on effect: **${p('p4').title.toLowerCase()}**. The quickest fix is a 10-minute breathing break around 3:30 PM. On days you did one, your stress ran ${p('p3').effect.replace('-', '').replace(' stress', '')} lower.`,
    }
  if (/sleep|tired|insomn|rest|bed/.test(s)) {
    const n = t.today
    return {
      steps: ['Reading last night’s sleep stages', 'Forecasting tonight'],
      chart: 'sleep',
      text: `You slept **${Math.floor(n.sleepHours)} hr ${Math.round((n.sleepHours % 1) * 60)} min** last night with a sleep score of **${n.sleepScore.toFixed(0)}**. Deep sleep was ${n.deepPct.toFixed(0)}% and REM ${n.remPct.toFixed(0)}%. You took ${n.latency.toFixed(0)} minutes to fall asleep.\n\nThis week you’re averaging ${avg('sleepHours').toFixed(1)} hours, so you’re about ${Math.max(0, (8 - avg('sleepHours')) * 7).toFixed(1)} hours short. The chance of broken sleep in the next few nights is **${(ins.probability * 100).toFixed(0)}%**.\n\nFor tonight, put screens away by 10:15 and aim to be asleep by **10:50 PM**.`,
    }
  }
  if (/coffee|caffeine/.test(s))
    return {
      steps: [`Checking ${t.days.length} days of caffeine`, 'Comparing nights with and without it'],
      text: `Yes. **${p('p1').title}.** ${p('p1').detail}\n\nYou have about ${avg('caffeine').toFixed(0)} mg a day, ${avg('lateCaffeine').toFixed(0)} mg of it after 4 PM. You don’t need to cut back. Just move your last cup before 2 PM, and your twin expects your Life Index to rise by about 4 points within two weeks.`,
    }
  if (/eat|food|diet|meal|sugar|nutri|protein/.test(s))
    return {
      steps: ['Reading your glucose responses', 'Planning tomorrow’s meals'],
      text: `You’re eating about **${avg('protein').toFixed(0)} g of protein** a day, against a target of about 140 g for your 87 kg. Added sugar averages ${avg('sugar').toFixed(0)} g, and **${p('p6').title.toLowerCase()}**.\n\nFor tomorrow:\n• 7:45 AM: Greek yoghurt, walnuts and kiwi\n• 12:30 PM: Salmon, quinoa and greens\n• 4:00 PM: Hummus with carrots, instead of the cookie\n• 7:30 PM: Paneer stir-fry with pumpkin seeds\n\nThat plan keeps your glucose in range about 96% of the day.`,
    }
  if (/step|walk|exercis|workout|activ|fit|run|gym/.test(s))
    return {
      steps: ['Adding up your movement', 'Checking training load'],
      text: `You average **${(avg('steps') / 1000).toFixed(1)}k steps** and ${avg('activeMin').toFixed(0)} active minutes a day. Your cardio fitness is ${t.today.vo2.toFixed(1)}, above average for your age.\n\nOn 10k-step days your mood runs ${p('p5').effect.split(' ')[0]} higher. Your training load is slightly below your usual, so you have room for two 30-minute easy runs this week.`,
    }
  if (/predict|future|forecast|next|week|days/.test(s)) {
    const f = forecast(t.days, 'stress', 14).points
    const fs = forecast(t.days, 'sleepHours', 14).points
    return {
      steps: ['Projecting the next 14 days', 'Estimating the range'],
      chart: 'forecast',
      text: `If nothing changes, here’s the next two weeks:\n• Stress: about **${f[13].v.toFixed(0)}** (likely ${f[13].lo.toFixed(0)}–${f[13].hi.toFixed(0)})\n• Sleep: about **${fs[13].v.toFixed(1)} hours** a night\n• Burnout risk: ${burn.probability > burn.prevProbability ? 'rising' : 'easing'}, ${(burn.probability * 100).toFixed(0)}% today\n\nOpen the **Simulator** and try “Minimum Viable”. Two small changes bend this curve the most.`,
    }
  }
  if (/age|bio|young|old/.test(s))
    return { steps: ['Estimating biological age'], text: `Your biological age is about **${t.scores.bioAge.toFixed(1)}**, against your actual age of ${SUBJECT.age}. The biggest factors are your Life Index (${t.scores.life.toFixed(0)}), cardio fitness and resting heart rate. A steadier sleep schedule is the fastest way to bring it down.` }
  if (/^(hi|hey|hello|yo|namaste)\b/.test(s)) return { steps: [], text: `Hi ${SUBJECT.name}. I’m your digital twin, a live model of your sleep, food, movement and stress built from ${t.days.length} days of your data. Ask me why you feel the way you do, or what tomorrow could look like.` }
  const top = [...t.risks].sort((a, b) => b.probability - a.probability)[0]
  return {
    steps: ['Reading your twin'],
    text: `Here’s where you stand. Your Life Index is **${t.scores.life.toFixed(0)}** (${t.scores.delta >= 0 ? 'up' : 'down'} ${Math.abs(t.scores.delta).toFixed(1)} on last week). The thing to watch is **${top.name.toLowerCase()}** at ${(top.probability * 100).toFixed(0)}%.\n\nThe one change that would help most: **${t.recs[0].title.toLowerCase()}**. ${t.recs[0].why}`,
  }
}

export default function Assistant() {
  const twin = useTwin()
  const chat = useStore((s) => s.chat)
  const push = useStore((s) => s.pushChat)
  const patch = useStore((s) => s.patchChat)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const twinRef = useRef(twin)
  twinRef.current = twin

  const ask = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return
      setBusy(true)
      setQ('')
      push({ role: 'user', text })
      const r = respond(text, twinRef.current)
      const id = push({ role: 'twin', text: '', steps: [], chart: r.chart })
      for (const st of r.steps) {
        await new Promise((res) => setTimeout(res, 420))
        const cur = useStore.getState().chat.find((c) => c.id === id)!
        patch(id, { steps: [...(cur.steps || []), st] })
      }
      await new Promise((res) => setTimeout(res, 350))
      const words = r.text.split(/(\s+)/)
      for (let i = 0; i <= words.length; i += 2) {
        patch(id, { text: words.slice(0, i).join('') })
        await new Promise((res) => setTimeout(res, 18))
      }
      patch(id, { text: r.text, done: true })
      setBusy(false)
    },
    [busy, push, patch],
  )

  useEffect(() => {
    const h = (e: Event) => ask((e as CustomEvent).detail)
    window.addEventListener('soma-ask', h)
    return () => window.removeEventListener('soma-ask', h)
  }, [ask])
  useEffect(() => {
    if (useStore.getState().chat.length === 0) push({ role: 'twin', done: true, text: `Hi ${SUBJECT.name}. I’m your digital twin, built from ${twin.days.length} days of your sleep, food, movement and stress. What would you like to understand?` })
  }, [])
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' })
  }, [chat])

  return (
    <>
      <PageHeader title="Ask Soma" subtitle="Ask your twin anything. Every answer is worked out from your own data, not generic advice." />
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <Card className="col-span-12 xl:col-span-8" pad="p-0">
          <div className="flex flex-col h-[calc(100vh-260px)] min-h-[520px]">
            <div ref={box} className="flex-1 overflow-y-auto px-5 md:px-8 py-6 space-y-6">
              {chat.map((m) => (
                <Message key={m.id} m={m} twin={twin} />
              ))}
            </div>
            <div className="px-4 md:px-6 pt-3 pb-5">
              <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
                {SUGGEST.map((s, i) => (
                  <motion.button key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.03 }} whileTap={{ scale: 0.96 }} disabled={busy} onClick={() => ask(s)} className="btn btn-secondary shrink-0 !h-8 !text-[13px]">
                    {s}
                  </motion.button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  ask(q)
                }}
                className="flex items-center gap-2 h-12 pl-5 pr-1.5 rounded-full bg-fill-2 focus-within:bg-surface focus-within:shadow-[0_0_0_2px_var(--accent)] transition-all"
              >
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask about your sleep, stress, food…'} className="flex-1 bg-transparent outline-none t-body placeholder:text-label-3" aria-label="Message" />
                <button
                  type="button"
                  aria-label="Dictate"
                  onClick={() => {
                    setListening(true)
                    setTimeout(() => {
                      setListening(false)
                      ask('Predict my next 14 days')
                    }, 1800)
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${listening ? 'text-bad' : 'text-label-2 hover:text-label'}`}
                >
                  <Mic size={18} />
                </button>
                <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={busy || !q.trim()} aria-label="Send" className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30 transition-opacity">
                  <ArrowUp size={18} strokeWidth={2.6} />
                </motion.button>
              </form>
            </div>
          </div>
        </Card>
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 md:gap-5">
          <Card>
            <div className="flex flex-col items-center text-center py-4">
              <motion.div animate={{ scale: busy || listening ? [1, 1.08, 1] : 1 }} transition={{ duration: 1.2, repeat: busy || listening ? Infinity : 0 }}>
                <Logo size={64} />
              </motion.div>
              <div className="t-title3 mt-4">Soma</div>
              <div className="t-subhead text-label-2 mt-1">{listening ? 'Listening…' : busy ? 'Thinking…' : 'Ready'}</div>
            </div>
          </Card>
          <Card title="What Soma knows">
            <div className="-my-1">
              {[
                ['Life Index', twin.scores.life.toFixed(0)],
                ['Biological age', `${twin.scores.bioAge.toFixed(1)} yrs`],
                ['Biggest risk', [...twin.risks].sort((a, b) => b.probability - a.probability)[0].name],
                ['Patterns found', `${twin.patterns.length}`],
                ['History', `${twin.days.length} days`],
              ].map(([k, v], i, arr) => (
                <div key={k} className={`flex justify-between gap-4 py-2.5 t-subhead ${i < arr.length - 1 ? 'border-b border-sep' : ''}`}>
                  <span className="text-label-2">{k}</span>
                  <span className="font-semibold tnum text-right truncate">{v}</span>
                </div>
              ))}
            </div>
            <p className="t-footnote text-label-2 mt-3">Answers are computed on your device. Nothing is sent anywhere.</p>
          </Card>
        </div>
      </div>
    </>
  )
}

function Message({ m, twin }: { m: ChatMsg; twin: Twin }) {
  if (m.role === 'user')
    return (
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className="flex justify-end">
        <div className="max-w-[78%] px-4 py-2.5 rounded-[20px] rounded-br-[6px] bg-accent text-white t-body">{m.text}</div>
      </motion.div>
    )
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex gap-3">
      <div className="shrink-0 mt-0.5">
        <Logo size={28} />
      </div>
      <div className="flex-1 min-w-0 max-w-[88%]">
        {m.steps && m.steps.length > 0 && (
          <div className="mb-2 space-y-1">
            <AnimatePresence>
              {m.steps.map((s, i) => (
                <motion.div key={s} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 t-footnote text-label-2">
                  {m.text || i < m.steps!.length - 1 ? <Check size={12} className="text-good" strokeWidth={3} /> : <span className="w-3 h-3 rounded-full border-[1.5px] border-accent border-t-transparent animate-spin" />}
                  {s}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {m.text && (
          <div className="t-body leading-relaxed whitespace-pre-wrap">
            {m.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={i} className="font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          </div>
        )}
        {m.done && m.chart && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mt-3 p-4 inset">
            {m.chart === 'stress' && (
              <>
                <div className="t-footnote font-semibold text-label-2 mb-2">Stress · last 14 days</div>
                <Sparkline data={twin.days.slice(-14).map((d) => d.stress)} color={C.mind} height={64} />
              </>
            )}
            {m.chart === 'sleep' && (
              <>
                <div className="t-footnote font-semibold text-label-2 mb-8">Sleep · last 14 nights</div>
                <Bars data={twin.days.slice(-14).map((d) => d.sleepHours)} target={8} height={90} max={10} color={C.sleep} format={(v) => `${v.toFixed(1)} hr`} />
              </>
            )}
            {m.chart === 'forecast' && (
              <>
                <div className="t-footnote font-semibold text-label-2 mb-2">Stress · next 14 days</div>
                <LineChart
                  height={150}
                  splitAt={13}
                  series={[
                    { name: 'Measured', data: twin.days.slice(-14).map((d) => d.stress), color: C.mind },
                    (() => {
                      const f = forecast(twin.days, 'stress', 14).points
                      return { name: 'Forecast', data: [twin.days[twin.days.length - 1].stress, ...f.map((p) => p.v)], color: C.mind, dashed: true, offset: 13, band: f.map((p) => ({ lo: p.lo, hi: p.hi })), bandOffset: 14 }
                    })(),
                  ]}
                />
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
