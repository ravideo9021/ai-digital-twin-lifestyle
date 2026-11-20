// ─── Synthetic subject generator ───
// A causal, seeded generative model of one person's lifestyle. Variables are linked
// (workload → caffeine → deep sleep → stress → HRV …) so the pattern-discovery
// engine finds *real* correlations in this artificial data.
import { clamp, gaussian, mulberry32 } from '../lib/math'

export interface Day {
  idx: number
  date: Date
  weekend: boolean
  workload: number
  // sleep
  sleepHours: number
  sleepScore: number
  deepPct: number
  remPct: number
  lightPct: number
  awakePct: number
  bedtime: number // hours on 24h clock (may exceed 24)
  latency: number
  efficiency: number
  // activity
  steps: number
  activeMin: number
  burn: number
  vo2: number
  // nutrition
  kcal: number
  protein: number
  carbs: number
  fat: number
  sugar: number
  fiber: number
  water: number
  caffeine: number
  lateCaffeine: number
  // mind
  screenLate: number
  meditation: number
  stress: number
  hrv: number
  rhr: number
  mood: number
  focus: number
  energy: number
  weight: number
}

export const SUBJECT = {
  id: 'HDT-0427',
  name: 'Ayush',
  age: 23,
  sex: 'Male',
  blood: 'B+',
  heightCm: 185,
  chronotype: 'Intermediate · slight evening',
  baselineWeight: 87,
  goal: 'Reduce stress load · improve deep sleep',
}

export const DAYS = 120

export function generateHistory(seed = 427): Day[] {
  const rand = mulberry32(seed)
  const g = () => gaussian(rand)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: Day[] = []
  let w = 0.35
  let weight = SUBJECT.baselineWeight
  let vo2 = 45.5

  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - (DAYS - 1 - i))
    const dow = date.getDay()
    const weekend = dow === 0 || dow === 6

    // workload latent: AR(1) + a crunch period + elevated recent stretch
    const crunch = i > 62 && i < 80 ? 0.32 : 0
    const recent = i > DAYS - 12 ? 0.22 : 0
    w = clamp(0.82 * w + 0.18 * (0.35 + crunch + recent) + g() * 0.07 - (weekend ? 0.12 : 0), 0, 1)

    const caffeine = clamp(110 + 130 * w + g() * 35 - (weekend ? 30 : 0), 0, 520)
    const lateCaffeine = rand() < 0.15 + w * 0.6 ? clamp(40 + 90 * w + g() * 25, 0, 220) : 0
    const screenLate = clamp(35 + 75 * w + g() * 18 + (weekend ? 25 : 0), 0, 210)
    const meditation = rand() < 0.55 - 0.4 * w ? Math.round(clamp(10 + g() * 4, 4, 25)) : 0
    const bedtime = 23.1 + 0.8 * w + 0.006 * screenLate + (weekend ? 0.7 : 0) + g() * 0.3

    let sleepHours =
      7.75 - 0.9 * w - 0.004 * screenLate - 0.0035 * lateCaffeine + (weekend ? 0.75 : 0) + 0.004 * meditation * 10 + g() * 0.35
    sleepHours = clamp(sleepHours, 4.4, 9.6)

    const deepPct = clamp(20 - 0.045 * lateCaffeine - 3.5 * w + 0.12 * meditation + g() * 1.6, 7, 26)
    const remPct = clamp(23 - 0.022 * screenLate - 1.2 * w + g() * 1.5, 12, 28)
    const awakePct = clamp(4.5 + 4 * w + 0.02 * lateCaffeine + g() * 1, 1.5, 15)
    const lightPct = 100 - deepPct - remPct - awakePct
    const latency = clamp(9 + 18 * w + 0.06 * lateCaffeine + 0.04 * screenLate + g() * 3, 3, 60)
    const efficiency = clamp(95 - awakePct * 0.9 - latency * 0.08, 70, 98)

    const steps = Math.round(clamp(9300 - 3400 * w + (weekend ? 1800 : 0) + g() * 1500, 1800, 21000))
    const activeMin = Math.round(clamp(steps / 160 + g() * 6, 5, 140))
    vo2 = clamp(vo2 + (activeMin - 45) * 0.0012 + g() * 0.04, 38, 56)

    const stress = clamp(
      22 + 52 * w + 6.5 * (7.5 - sleepHours) - 0.55 * meditation - 0.0007 * (steps - 8000) + 0.025 * (caffeine - 150) + g() * 5,
      4,
      98,
    )
    const hrv = clamp(70 - 0.42 * stress + 2.4 * (sleepHours - 7) + 0.12 * deepPct + g() * 3.2, 18, 110)
    const rhr = clamp(55 + 0.13 * stress - 0.00035 * (steps - 8000) + g() * 1.4, 44, 90)

    const sugar = clamp(22 + 22 * w + (weekend ? 16 : 0) + 0.38 * stress + g() * 8, 8, 140)
    const kcal = Math.round(clamp(2380 + 260 * w + (weekend ? 260 : 0) + 2.2 * sugar + g() * 140, 1300, 3400))
    const protein = clamp(132 - 22 * w + g() * 12, 60, 200)
    const fat = clamp(68 + 12 * w + g() * 8, 35, 130)
    const carbs = clamp((kcal - protein * 4 - fat * 9) / 4, 120, 420)
    const fiber = clamp(27 - 9 * w + g() * 3.5, 8, 45)
    const water = clamp(3.0 - 0.8 * w + g() * 0.3, 1.2, 4.8)

    const burn = Math.round(1890 + steps * 0.05 + activeMin * 5)
    weight = weight + (kcal - burn) / 7700 + g() * 0.06

    const mood = clamp(4.3 - 0.028 * (stress - 35) + 0.22 * (sleepHours - 7) + g() * 0.25, 1, 5)
    const focus = clamp(82 - 0.45 * stress + 4 * (sleepHours - 7) - 0.04 * screenLate + g() * 4, 10, 99)
    const energy = clamp(75 + 5 * (sleepHours - 7) - 0.35 * stress + 0.0012 * (steps - 8000) + g() * 4, 10, 99)

    const sleepScore = clamp(
      100 - Math.abs(8 - sleepHours) * 11 - (20 - deepPct) * 1.4 - (23 - remPct) * 0.8 - awakePct * 1.2 - latency * 0.25 + 6,
      25,
      99,
    )

    days.push({
      idx: i,
      date,
      weekend,
      workload: w,
      sleepHours,
      sleepScore,
      deepPct,
      remPct,
      lightPct,
      awakePct,
      bedtime,
      latency,
      efficiency,
      steps,
      activeMin,
      burn,
      vo2,
      kcal,
      protein,
      carbs,
      fat,
      sugar,
      fiber,
      water,
      caffeine,
      lateCaffeine,
      screenLate,
      meditation,
      stress,
      hrv,
      rhr,
      mood,
      focus,
      energy,
      weight,
    })
  }
  return days
}

export type Stage = 'Awake' | 'REM' | 'Light' | 'Deep'

/** Generates a plausible hypnogram (5-min epochs) for a night: ~90-min cycles,
 *  deep sleep front-loaded, REM back-loaded, brief awakenings. */
export function generateHypnogram(day: Day, seed = 9): { t: number; stage: Stage }[] {
  const rand = mulberry32(seed + day.idx)
  const epochs = Math.round((day.sleepHours * 60) / 5)
  const out: { t: number; stage: Stage }[] = []
  const cycleLen = 18
  let prev: Stage = 'Awake'
  for (let e = 0; e < epochs; e++) {
    const cyc = Math.floor(e / cycleLen)
    const p = (e % cycleLen) / cycleLen
    const deepLen = Math.max(0, 0.42 - cyc * 0.1) * (day.deepPct / 18)
    const remLen = Math.min(0.45, 0.12 + cyc * 0.08) * (day.remPct / 22)
    let target: Stage = 'Light'
    if (p > 0.2 && p < 0.2 + deepLen) target = 'Deep'
    else if (p > 1 - remLen) target = 'REM'
    if (e < 2) target = 'Awake'
    if (rand() < (day.awakePct / 100) * 0.28 && e > 3) target = 'Awake'
    const stage: Stage = target === 'Awake' || rand() < 0.75 ? target : prev
    out.push({ t: e * 5, stage })
    prev = stage
  }
  if (out.length) out[out.length - 1].stage = 'Awake'
  return out
}

/** Synthetic intraday glucose curve (CGM-style) driven by today's meals */
export const MEALS = [
  { time: 8.25, name: 'Overnight oats · berries · chia', kcal: 420, carbs: 58, protein: 18, fat: 12, gi: 0.55, tag: 'Breakfast' },
  { time: 11.0, name: 'Flat white (double)', kcal: 130, carbs: 10, protein: 7, fat: 6, gi: 0.2, tag: 'Caffeine' },
  { time: 13.4, name: 'Paneer tikka bowl · brown rice', kcal: 640, carbs: 72, protein: 34, fat: 22, gi: 0.5, tag: 'Lunch' },
  { time: 16.6, name: 'Chocolate cookie + cold brew', kcal: 310, carbs: 42, protein: 4, fat: 14, gi: 0.9, tag: 'Snack' },
  { time: 20.3, name: 'Dal · quinoa · sautéed greens', kcal: 560, carbs: 64, protein: 28, fat: 16, gi: 0.45, tag: 'Dinner' },
]

export function glucoseCurve() {
  const pts: { t: number; v: number }[] = []
  for (let t = 6; t <= 23.5; t += 0.1) {
    let v = 88 + Math.sin(t * 0.9) * 2
    for (const m of MEALS) {
      const dt = t - m.time
      if (dt > 0) {
        const amp = m.carbs * m.gi * 1.45
        v += amp * (dt / 0.75) * Math.exp(1 - dt / 0.75) * (dt < 3.5 ? 1 : 0.6)
      }
    }
    pts.push({ t, v })
  }
  return pts
}

/** Intraday stress (0-100) for today, 15-min resolution */
export function intradayStress(seed = 3) {
  const rand = mulberry32(seed)
  const out: { t: number; v: number }[] = []
  let v = 22
  for (let t = 6; t <= 23; t += 0.25) {
    const meeting = (t > 10 && t < 11.5) || (t > 14.5 && t < 16.5) ? 28 : 0
    const target = 25 + meeting + (t > 18 && t < 19 ? -12 : 0) + Math.sin(t / 2) * 6
    v = clamp(v + (target - v) * 0.25 + gaussian(rand) * 4, 3, 98)
    out.push({ t, v })
  }
  return out
}
