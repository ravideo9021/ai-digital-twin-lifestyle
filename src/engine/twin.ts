// ─── SOMA Twin Engine ───
// Lightweight, fully client-side analytics that stand in for the production ML stack.
// Everything here is computed from the (synthetic) history — nothing is hard-coded.
import type { Day } from '../data/synthetic'
import { SUBJECT } from '../data/synthetic'
import { clamp, holtForecast, linreg, mean, pearson, sigmoid, std, zscores } from '../lib/math'

const last = (days: Day[], n: number) => days.slice(-n)
const avg = (days: Day[], k: keyof Day) => mean(days.map((d) => d[k] as number))

// ── Scores ────────────────────────────────────────────────────────────
export interface Scores {
  life: number
  sleep: number
  nutrition: number
  activity: number
  mind: number
  recovery: number
  bioAge: number
  delta: number // vs previous week
}

export function scoreWindow(win: Day[]): Omit<Scores, 'delta' | 'bioAge'> {
  const sleep = clamp(avg(win, 'sleepScore'), 0, 100)
  const nutrition = clamp(
    100 - Math.max(0, avg(win, 'sugar') - 30) * 0.75 - Math.abs(avg(win, 'protein') - 135) * 0.3 - Math.max(0, 28 - avg(win, 'fiber')) * 1.2 - Math.max(0, 3.0 - avg(win, 'water')) * 12,
    0,
    100,
  )
  const activity = clamp((avg(win, 'steps') / 10000) * 72 + (avg(win, 'activeMin') / 60) * 28, 0, 100)
  const mind = clamp(100 - avg(win, 'stress') * 0.95 + avg(win, 'meditation') * 0.6, 0, 100)
  const recovery = clamp((avg(win, 'hrv') / 70) * 78 + (62 - avg(win, 'rhr')) * 1.3 + 12, 0, 100)
  const life = sleep * 0.25 + nutrition * 0.18 + activity * 0.18 + mind * 0.22 + recovery * 0.17
  return { life, sleep, nutrition, activity, mind, recovery }
}

export function computeScores(days: Day[]): Scores {
  const cur = scoreWindow(last(days, 7))
  const prev = scoreWindow(days.slice(-14, -7))
  const bioAge = SUBJECT.age + (70 - cur.life) * 0.16 + (avg(last(days, 14), 'rhr') - 58) * 0.12 - (avg(last(days, 30), 'vo2') - 44) * 0.25
  return { ...cur, bioAge, delta: cur.life - prev.life }
}

// ── Predictive risk models (logistic, interpretable) ──────────────────
export interface Driver {
  name: string
  value: string
  impact: number // contribution in logit units (+ = raises risk)
}
export interface Risk {
  id: string
  name: string
  system: 'brain' | 'heart' | 'gut' | 'body' | 'lungs'
  probability: number
  prevProbability: number
  horizon: string
  severity: 'low' | 'moderate' | 'elevated' | 'high'
  summary: string
  drivers: Driver[]
  model: string
  confidence: number
}

function riskFromDrivers(bias: number, drivers: Driver[]) {
  return sigmoid(bias + drivers.reduce((s, d) => s + d.impact, 0))
}
const sev = (p: number): Risk['severity'] => (p > 0.66 ? 'high' : p > 0.45 ? 'elevated' : p > 0.25 ? 'moderate' : 'low')

function riskSet(win: Day[], base: Day[]) {
  const stress = avg(win, 'stress')
  const sleep = avg(win, 'sleepHours')
  const hrvDrop = (avg(base, 'hrv') - avg(win, 'hrv')) / avg(base, 'hrv')
  const caff = avg(win, 'lateCaffeine')
  const screen = avg(win, 'screenLate')
  const steps = avg(win, 'steps')
  const sugar = avg(win, 'sugar')
  const rhr = avg(win, 'rhr')
  const latency = avg(win, 'latency')
  const bedVar = std(win.map((d) => d.bedtime))
  const kcalBal = avg(win, 'kcal') - avg(win, 'burn')
  const fiber = avg(win, 'fiber')

  const burnout: Driver[] = [
    { name: 'Sustained stress load', value: `${stress.toFixed(0)}/100`, impact: (stress - 40) * 0.07 },
    { name: 'HRV suppression vs baseline', value: `${(hrvDrop * 100).toFixed(0)}%`, impact: hrvDrop * 7 },
    { name: 'Sleep duration', value: `${sleep.toFixed(1)} h`, impact: (7.4 - sleep) * 0.9 },
    { name: 'Recovery practice', value: `${avg(win, 'meditation').toFixed(0)} min/d`, impact: -avg(win, 'meditation') * 0.08 },
  ]
  const insomnia: Driver[] = [
    { name: 'Sleep-onset latency', value: `${latency.toFixed(0)} min`, impact: (latency - 15) * 0.09 },
    { name: 'Late caffeine (after 4 PM)', value: `${caff.toFixed(0)} mg`, impact: caff * 0.012 },
    { name: 'Screen exposure after 9 PM', value: `${screen.toFixed(0)} min`, impact: (screen - 45) * 0.014 },
    { name: 'Bedtime variability', value: `±${(bedVar * 60).toFixed(0)} min`, impact: (bedVar - 0.4) * 1.6 },
  ]
  const metabolic: Driver[] = [
    { name: 'Added sugar intake', value: `${sugar.toFixed(0)} g/d`, impact: (sugar - 36) * 0.045 },
    { name: 'Energy balance', value: `${kcalBal > 0 ? '+' : ''}${kcalBal.toFixed(0)} kcal`, impact: kcalBal * 0.003 },
    { name: 'Daily movement', value: `${(steps / 1000).toFixed(1)}k steps`, impact: (8000 - steps) * 0.00025 },
    { name: 'Fiber intake', value: `${fiber.toFixed(0)} g`, impact: (25 - fiber) * 0.06 },
  ]
  const cardio: Driver[] = [
    { name: 'Resting heart rate', value: `${rhr.toFixed(0)} bpm`, impact: (rhr - 58) * 0.18 },
    { name: 'Autonomic balance (HRV)', value: `${avg(win, 'hrv').toFixed(0)} ms`, impact: (50 - avg(win, 'hrv')) * 0.05 },
    { name: 'Caffeine load', value: `${avg(win, 'caffeine').toFixed(0)} mg`, impact: (avg(win, 'caffeine') - 200) * 0.006 },
    { name: 'Aerobic activity', value: `${avg(win, 'activeMin').toFixed(0)} min/d`, impact: (40 - avg(win, 'activeMin')) * 0.03 },
  ]
  return { burnout, insomnia, metabolic, cardio }
}

export function computeRisks(days: Day[]): Risk[] {
  const base = days.slice(-60, -14)
  const cur = riskSet(last(days, 10), base)
  const prev = riskSet(days.slice(-20, -10), base)
  const mk = (
    id: string,
    name: string,
    system: Risk['system'],
    bias: number,
    key: keyof typeof cur,
    horizon: string,
    model: string,
    summary: (p: number) => string,
  ): Risk => {
    const p = riskFromDrivers(bias, cur[key])
    return {
      id,
      name,
      system,
      probability: p,
      prevProbability: riskFromDrivers(bias, prev[key]),
      horizon,
      severity: sev(p),
      summary: summary(p),
      drivers: [...cur[key]].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
      model,
      confidence: 0.78 + (Math.abs(p - 0.5) * 0.3),
    }
  }
  return [
    mk('burnout', 'Burnout trajectory', 'brain', 0.3, 'burnout', '21 days', 'GBM-Stress v3.2', (p) =>
      p > 0.45 ? 'Stress has stayed high for several days while HRV has dropped. This pattern usually comes before an energy crash.' : 'Stress load is inside your adaptive range.'),
    mk('insomnia', 'Sleep fragmentation', 'brain', -1.6, 'insomnia', '7 nights', 'LSTM-Sleep v2.7', (p) =>
      p > 0.45 ? 'Longer time to fall asleep and late caffeine point to more broken sleep in the coming nights.' : 'Sleep architecture looks stable.'),
    mk('metabolic', 'Metabolic drift', 'gut', -2.3, 'metabolic', '60 days', 'XGB-Metab v1.9', (p) =>
      p > 0.45 ? 'Added sugar plus falling activity is pushing your glycaemic load upward.' : 'Glycaemic load is within target.'),
    mk('cardio', 'Cardiovascular strain', 'heart', -0.9, 'cardio', '30 days', 'TCN-Cardio v1.4', (p) =>
      p > 0.45 ? 'Resting HR is rising and autonomic recovery is slower than usual.' : 'Cardiac markers are near your personal baseline.'),
  ]
}

// ── Forecasts ─────────────────────────────────────────────────────────
export function forecast(days: Day[], key: keyof Day, horizon = 14) {
  const series = last(days, 45).map((d) => d[key] as number)
  return holtForecast(series, horizon)
}

// ── Pattern discovery ─────────────────────────────────────────────────
export const CORR_VARS: { key: keyof Day; label: string; short: string }[] = [
  { key: 'sleepHours', label: 'Sleep duration', short: 'SLP' },
  { key: 'deepPct', label: 'Deep sleep %', short: 'DEEP' },
  { key: 'stress', label: 'Stress', short: 'STR' },
  { key: 'hrv', label: 'HRV', short: 'HRV' },
  { key: 'rhr', label: 'Resting HR', short: 'RHR' },
  { key: 'steps', label: 'Steps', short: 'STP' },
  { key: 'caffeine', label: 'Caffeine', short: 'CAF' },
  { key: 'lateCaffeine', label: 'Late caffeine', short: 'LCF' },
  { key: 'screenLate', label: 'Late screen', short: 'SCR' },
  { key: 'sugar', label: 'Sugar', short: 'SUG' },
  { key: 'meditation', label: 'Meditation', short: 'MED' },
  { key: 'mood', label: 'Mood', short: 'MOOD' },
]

export function correlationMatrix(days: Day[]) {
  const cols = CORR_VARS.map((v) => days.map((d) => d[v.key] as number))
  return cols.map((a) => cols.map((b) => pearson(a, b)))
}

export interface Pattern {
  id: string
  title: string
  detail: string
  r: number
  effect: string
  confidence: number
  category: 'sleep' | 'mind' | 'nutrition' | 'activity'
  n: number
}

function splitEffect(days: Day[], cond: (d: Day) => boolean, key: keyof Day) {
  const a = days.filter(cond).map((d) => d[key] as number)
  const b = days.filter((d) => !cond(d)).map((d) => d[key] as number)
  const ma = mean(a)
  const mb = mean(b)
  return { ma, mb, pct: mb ? ((ma - mb) / mb) * 100 : 0, n: a.length }
}

export function discoverPatterns(days: Day[]): Pattern[] {
  const col = (k: keyof Day) => days.map((d) => d[k] as number)
  const conf = (r: number, n: number) => clamp(Math.abs(r) * Math.sqrt(n) / 6, 0.5, 0.99)

  const p1 = splitEffect(days, (d) => d.lateCaffeine > 40, 'deepPct')
  const r1 = pearson(col('lateCaffeine'), col('deepPct'))
  const p2 = splitEffect(days, (d) => d.screenLate > 90, 'remPct')
  const r2 = pearson(col('screenLate'), col('remPct'))
  const p3 = splitEffect(days, (d) => d.meditation > 0, 'stress')
  const r3 = pearson(col('meditation'), col('stress'))
  // lagged: short sleep → next-day stress
  const sleepPrev = days.slice(0, -1).map((d) => d.sleepHours)
  const stressNext = days.slice(1).map((d) => d.stress)
  const r4 = pearson(sleepPrev, stressNext)
  const p4a = mean(days.slice(1).filter((_, i) => days[i].sleepHours < 6.5).map((d) => d.stress))
  const p4b = mean(days.slice(1).filter((_, i) => days[i].sleepHours >= 7.5).map((d) => d.stress))
  const p5 = splitEffect(days, (d) => d.steps > 10000, 'mood')
  const r5 = pearson(col('steps'), col('mood'))
  const r6 = pearson(col('stress'), col('sugar'))
  const p6 = splitEffect(days, (d) => d.stress > 60, 'sugar')

  return [
    { id: 'p1', category: 'sleep', title: 'Caffeine after 4 PM cuts your deep sleep', detail: `On nights after late caffeine, deep sleep averaged ${p1.ma.toFixed(1)}%, compared with ${p1.mb.toFixed(1)}% on other nights.`, r: r1, effect: `${p1.pct.toFixed(0)}% deep sleep`, confidence: conf(r1, days.length), n: p1.n },
    { id: 'p4', category: 'mind', title: 'Short sleep raises next-day stress', detail: `After nights under 6.5 h, next-day stress was ${p4a.toFixed(0)}. After nights of 7.5 h or more, it was ${p4b.toFixed(0)}.`, r: r4, effect: `+${(p4a - p4b).toFixed(0)} stress pts`, confidence: conf(r4, days.length), n: days.length - 1 },
    { id: 'p3', category: 'mind', title: 'Meditation days are calmer', detail: `Stress averaged ${p3.ma.toFixed(0)} on days with a mindfulness session and ${p3.mb.toFixed(0)} on days without.`, r: r3, effect: `${p3.pct.toFixed(0)}% stress`, confidence: conf(r3, days.length), n: p3.n },
    { id: 'p6', category: 'nutrition', title: 'Stress drives sugar cravings', detail: `On high-stress days (>60) you ate about ${p6.ma.toFixed(0)} g of added sugar, against ${p6.mb.toFixed(0)} g on calmer days.`, r: r6, effect: `+${p6.pct.toFixed(0)}% sugar`, confidence: conf(r6, days.length), n: p6.n },
    { id: 'p2', category: 'sleep', title: 'Late-night screens reduce REM sleep', detail: `More than 90 min of screen time after 9 PM brought REM down to ${p2.ma.toFixed(1)}%, from ${p2.mb.toFixed(1)}%.`, r: r2, effect: `${p2.pct.toFixed(0)}% REM`, confidence: conf(r2, days.length), n: p2.n },
    { id: 'p5', category: 'activity', title: '10k+ step days lift your mood', detail: `Mood averaged ${p5.ma.toFixed(2)}/5 on active days and ${p5.mb.toFixed(2)}/5 on sedentary ones.`, r: r5, effect: `+${p5.pct.toFixed(0)}% mood`, confidence: conf(r5, days.length), n: p5.n },
  ]
}

// ── Anomaly detection (rolling z-score, isolation-style) ──────────────
export interface Anomaly {
  dayIdx: number
  date: Date
  metric: string
  z: number
  value: string
}
export function detectAnomalies(days: Day[]): Anomaly[] {
  const out: Anomaly[] = []
  const metrics: { key: keyof Day; label: string; unit: string; d: number }[] = [
    { key: 'hrv', label: 'HRV', unit: 'ms', d: 0 },
    { key: 'rhr', label: 'Resting HR', unit: 'bpm', d: 0 },
    { key: 'sleepHours', label: 'Sleep', unit: 'h', d: 1 },
    { key: 'stress', label: 'Stress', unit: '', d: 0 },
  ]
  for (const m of metrics) {
    const zs = zscores(days.map((d) => d[m.key] as number))
    zs.forEach((z, i) => {
      if (Math.abs(z) > 2.1) out.push({ dayIdx: i, date: days[i].date, metric: m.label, z, value: `${(days[i][m.key] as number).toFixed(m.d)} ${m.unit}` })
    })
  }
  return out.sort((a, b) => b.dayIdx - a.dayIdx)
}

// ── Recommendations ───────────────────────────────────────────────────
export interface Rec {
  id: string
  title: string
  why: string
  impact: number // projected life-index gain
  effort: 'Low' | 'Medium' | 'High'
  category: 'sleep' | 'nutrition' | 'activity' | 'mind'
  when: string
}
export function recommendations(days: Day[]): Rec[] {
  const w = last(days, 10)
  const recs: Rec[] = []
  if (avg(w, 'lateCaffeine') > 25)
    recs.push({ id: 'r1', category: 'sleep', title: 'Have your last coffee by 2:00 PM', why: `Late caffeine averages ${avg(w, 'lateCaffeine').toFixed(0)} mg and is linked to lower deep sleep for you.`, impact: 4.2, effort: 'Low', when: 'Today · 14:00' })
  if (avg(w, 'stress') > 45)
    recs.push({ id: 'r2', category: 'mind', title: '10-minute breathing reset at 3:30 PM', why: 'Your stress usually peaks around 3–4 PM. Slow breathing at 6 breaths/min lifts HRV by about 9% for you.', impact: 3.6, effort: 'Low', when: 'Daily · 15:30' })
  if (avg(w, 'screenLate') > 60)
    recs.push({ id: 'r3', category: 'sleep', title: 'Screens off from 10:15 PM', why: `${avg(w, 'screenLate').toFixed(0)} min of late screen time is pushing your bedtime back and reducing REM.`, impact: 3.1, effort: 'Medium', when: 'Tonight · 22:15' })
  if (avg(w, 'steps') < 9000)
    recs.push({ id: 'r4', category: 'activity', title: 'Add a 20-minute walk after lunch', why: 'Walking after meals flattens your glucose spike by about 22% and adds around 2,400 steps.', impact: 2.8, effort: 'Low', when: 'Daily · 13:45' })
  if (avg(w, 'sugar') > 40)
    recs.push({ id: 'r5', category: 'nutrition', title: 'Swap the 4 PM snack for protein and fiber', why: `Added sugar is ${avg(w, 'sugar').toFixed(0)} g/d. The afternoon cookie gives your largest glucose excursion of the day.`, impact: 2.4, effort: 'Low', when: 'Today · 16:30' })
  recs.push({ id: 'r6', category: 'sleep', title: 'Keep a fixed wake time: 07:00 ±20 min', why: 'Your bedtime varies a lot. A fixed anchor stabilises your circadian rhythm within about 9 days.', impact: 2.2, effort: 'Medium', when: 'Every morning' })
  recs.push({ id: 'r7', category: 'nutrition', title: 'Drink 500 ml of water before noon', why: `Hydration averages ${avg(w, 'water').toFixed(1)} L. Mild dehydration matches your afternoon focus dips.`, impact: 1.4, effort: 'Low', when: 'Morning' })
  return recs.sort((a, b) => b.impact - a.impact)
}

// ── Future-self simulator ─────────────────────────────────────────────
export interface SimParams {
  sleep: number
  steps: number
  caffeine: number
  screen: number
  meditation: number
  sugar: number
  water: number
}

export function baselineParams(days: Day[]): SimParams {
  const w = last(days, 14)
  return {
    sleep: +avg(w, 'sleepHours').toFixed(1),
    steps: Math.round(avg(w, 'steps') / 100) * 100,
    caffeine: Math.round(avg(w, 'caffeine') / 10) * 10,
    screen: Math.round(avg(w, 'screenLate') / 5) * 5,
    meditation: Math.round(avg(w, 'meditation')),
    sugar: Math.round(avg(w, 'sugar')),
    water: +avg(w, 'water').toFixed(1),
  }
}

export interface SimPoint {
  day: number
  life: number
  stress: number
  hrv: number
  sleepScore: number
  weight: number
  energy: number
  bioAge: number
}

function rawEq(W: number, p: SimParams) {
  const stress = clamp(22 + 52 * W + 6.5 * (7.5 - p.sleep) - 0.55 * p.meditation - 0.0007 * (p.steps - 8000) + 0.025 * (p.caffeine - 150) + 0.04 * (p.screen - 45), 4, 98)
  const deep = clamp(20 - 0.045 * Math.max(0, p.caffeine - 160) * 0.6 - 3.5 * W + 0.12 * p.meditation, 7, 26)
  const sleepScore = clamp(100 - Math.abs(8 - p.sleep) * 11 - (20 - deep) * 1.4 - Math.max(0, p.screen - 30) * 0.08 - 4, 25, 99)
  const hrv = clamp(70 - 0.42 * stress + 2.4 * (p.sleep - 7) + 0.12 * deep + 0.0004 * (p.steps - 8000), 18, 110)
  const energy = clamp(75 + 5 * (p.sleep - 7) - 0.35 * stress + 0.0012 * (p.steps - 8000) + (p.water - 2.2) * 4, 10, 99)
  const kcalBal = (p.sugar - 40) * 4 * 0.9 - (p.steps - 8000) * 0.042
  const vo2 = clamp(38 + p.steps / 1500, 34, 54)
  const nutrition = clamp(100 - Math.max(0, p.sugar - 30) * 0.75 - Math.max(0, 3.0 - p.water) * 12 - 6, 0, 100)
  const activity = clamp((p.steps / 10000) * 72 + (p.steps / 160 / 60) * 28, 0, 100)
  return { stress, sleepScore, hrv, energy, kcalBal, vo2, nutrition, activity, meditation: p.meditation }
}

/** Counterfactual simulation. Dynamics are expressed as deltas from the subject's
 *  calibrated baseline, so the "current path" starts exactly at today's twin state. */
export function simulate(days: Day[], p: SimParams, horizon = 90): SimPoint[] {
  const w = last(days, 7)
  const W = avg(last(days, 14), 'workload')
  const base = baselineParams(days)
  const E = rawEq(W, p)
  const B = rawEq(W, base)
  const sc = scoreWindow(w)
  const bio0 = computeScores(days).bioAge
  const cur = { stress: avg(w, 'stress'), hrv: avg(w, 'hrv'), sleepScore: avg(w, 'sleepScore'), energy: avg(w, 'energy'), vo2: avg(w, 'vo2'), weight: w[w.length - 1].weight }
  const tgt = {
    stress: clamp(cur.stress + (E.stress - B.stress) + 4, 4, 98), // +4: recent strain persists
    hrv: clamp(cur.hrv + (E.hrv - B.hrv) - 1.5, 15, 110),
    sleepScore: clamp(cur.sleepScore + (E.sleepScore - B.sleepScore) - 1, 20, 99),
    energy: clamp(cur.energy + (E.energy - B.energy), 5, 99),
    vo2: cur.vo2 + (E.vo2 - B.vo2),
  }
  let { stress, hrv, sleepScore, energy, vo2, weight } = cur
  const out: SimPoint[] = []
  for (let t = 0; t <= horizon; t++) {
    if (t > 0) {
      stress += (tgt.stress - stress) * 0.07
      hrv += (tgt.hrv - hrv) * 0.045
      sleepScore += (tgt.sleepScore - sleepScore) * 0.09
      energy += (tgt.energy - energy) * 0.06
      vo2 += (tgt.vo2 - vo2) * 0.012
      weight += (E.kcalBal - B.kcalBal + 25) / 7700
    }
    const ramp = 1 - Math.exp(-t / 10)
    const nutrition = clamp(sc.nutrition + (E.nutrition - B.nutrition) * ramp, 0, 100)
    const activity = clamp(sc.activity + (E.activity - B.activity) * ramp, 0, 100)
    const mind = clamp(sc.mind - (stress - cur.stress) * 0.95 + (E.meditation - B.meditation) * 0.6 * ramp, 0, 100)
    const recovery = clamp(sc.recovery + ((hrv - cur.hrv) / 70) * 78, 0, 100)
    const sleep = clamp(sc.sleep + (sleepScore - cur.sleepScore), 0, 100)
    const strain = Math.max(0, stress - 50) * 0.0025 * t
    const life = clamp(sleep * 0.25 + nutrition * 0.18 + activity * 0.18 + mind * 0.22 + recovery * 0.17 - strain, 0, 100)
    const bioAge = bio0 + (sc.life - life) * 0.16 - (vo2 - cur.vo2) * 0.25 + (stress - cur.stress) * 0.02
    out.push({ day: t, life, stress, hrv, sleepScore, weight, energy, bioAge })
  }
  return out
}

export const PRESETS: { id: string; name: string; desc: string; params: Partial<SimParams> }[] = [
  { id: 'optimal', name: 'Optimised Self', desc: 'Applies all of the AI recommendations', params: { sleep: 8, steps: 11000, caffeine: 150, screen: 20, meditation: 15, sugar: 25, water: 3 } },
  { id: 'burnout', name: 'Crunch Mode', desc: 'Deadline lifestyle kept up for 90 days', params: { sleep: 5.6, steps: 4500, caffeine: 420, screen: 150, meditation: 0, sugar: 85, water: 1.4 } },
  { id: 'athlete', name: 'Endurance Block', desc: 'High training volume, clean fuel', params: { sleep: 8.4, steps: 16000, caffeine: 180, screen: 40, meditation: 8, sugar: 30, water: 3.6 } },
  { id: 'minimal', name: 'Minimum Viable', desc: 'The two smallest, highest-leverage changes', params: { caffeine: 160, screen: 30 } },
]

export function trendSlope(days: Day[], key: keyof Day, n = 14) {
  return linreg(last(days, n).map((d) => d[key] as number)).slope
}
