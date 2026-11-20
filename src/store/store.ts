import { create } from 'zustand'
import { useMemo } from 'react'
import { generateHistory, type Day } from '../data/synthetic'
import {
  baselineParams,
  computeRisks,
  computeScores,
  correlationMatrix,
  detectAnomalies,
  discoverPatterns,
  recommendations,
  type SimParams,
} from '../engine/twin'
import { clamp, gaussian, mulberry32 } from '../lib/math'

export type PageId =
  | 'core'
  | 'sleep'
  | 'nutrition'
  | 'activity'
  | 'mind'
  | 'predict'
  | 'simulate'
  | 'insights'
  | 'neural'
  | 'assistant'

export type Theme = 'system' | 'light' | 'dark'

export type Region = 'brain' | 'heart' | 'lungs' | 'gut' | 'body' | 'legs'

export interface Toast {
  id: number
  tone: 'info' | 'warn' | 'crit' | 'ok'
  title: string
  body: string
}

export interface Vitals {
  hr: number
  hrv: number
  spo2: number
  temp: number
  resp: number
  stress: number
  glucose: number
  steps: number
  kcal: number
  hist: { hr: number[]; hrv: number[]; spo2: number[]; temp: number[]; resp: number[]; stress: number[]; glucose: number[] }
}

export interface ChatMsg {
  id: number
  role: 'user' | 'twin'
  text: string
  steps?: string[]
  done?: boolean
  chart?: 'sleep' | 'stress' | 'forecast'
}

const rand = mulberry32(77)
const H = 48
const seedHist = (base: number, amp: number) => Array.from({ length: H }, (_, i) => base + Math.sin(i / 4) * amp * 0.5 + gaussian(rand) * amp * 0.3)

interface State {
  booted: boolean
  setBooted: (v: boolean) => void
  page: PageId
  go: (p: PageId) => void
  focus: Region | null
  setFocus: (r: Region | null) => void
  theme: Theme
  setTheme: (t: Theme) => void
  days: Day[]
  logEntry: (kind: 'water' | 'meal' | 'mood' | 'meditate' | 'coffee' | 'walk', value?: number) => void
  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  vitals: Vitals
  tick: () => void
  palette: boolean
  setPalette: (v: boolean) => void
  logOpen: boolean
  setLogOpen: (v: boolean) => void
  sim: SimParams
  setSim: (p: Partial<SimParams>) => void
  resetSim: () => void
  chat: ChatMsg[]
  pushChat: (m: Omit<ChatMsg, 'id'>) => number
  patchChat: (id: number, m: Partial<ChatMsg>) => void
  recalibrating: number
}

const history = generateHistory()
let toastId = 1
let chatId = 1

export const useStore = create<State>((set, get) => ({
  booted: new URLSearchParams(location.search).has('skipboot'),
  setBooted: (booted) => set({ booted }),
  page: (location.hash.replace('#', '') as PageId) || 'core',
  go: (page) => {
    if (get().page === page) return
    location.hash = page
    document.querySelector('main')?.scrollTo({ top: 0 })
    set({ page, focus: null })
  },
  focus: null,
  setFocus: (focus) => set({ focus }),
  theme: (localStorage.getItem('soma-theme') as Theme) || 'system',
  setTheme: (theme) => {
    try {
      localStorage.setItem('soma-theme', theme)
    } catch {
      /* storage unavailable */
    }
    set({ theme })
  },
  days: history,
  logEntry: (kind, value = 0) => {
    const days = get().days.slice()
    const t = { ...days[days.length - 1] }
    let title = ''
    let body = ''
    switch (kind) {
      case 'water':
        t.water += 0.25
        title = 'Water logged'
        body = `+250 ml · ${t.water.toFixed(2)} L today`
        break
      case 'meal':
        t.kcal += value || 450
        t.protein += 28
        t.sugar += 6
        title = 'Meal logged'
        body = `${value || 450} kcal · macros updated`
        break
      case 'coffee':
        t.caffeine += 95
        t.lateCaffeine += new Date().getHours() >= 16 ? 95 : 0
        title = 'Caffeine logged'
        body = 'Tonight’s sleep forecast has been updated'
        break
      case 'mood':
        t.mood = value || 4
        t.stress = clamp(t.stress - (value - 3) * 4, 4, 98)
        title = 'Mood logged'
        body = `Feeling ${['awful', 'low', 'okay', 'good', 'great'][(value || 4) - 1]} · stress estimate updated`
        break
      case 'meditate':
        t.meditation += 10
        t.stress = clamp(t.stress - 6, 4, 98)
        t.hrv += 2.5
        title = 'Mindful minutes logged'
        body = '10 min · stress −6, HRV +2.5 ms'
        break
      case 'walk':
        t.steps += 2400
        t.activeMin += 20
        title = 'Walk logged'
        body = '20 min · +2,400 steps'
        break
    }
    days[days.length - 1] = t
    set({ days, recalibrating: Date.now() })
    get().pushToast({ tone: 'ok', title, body })
  },
  toasts: [],
  pushToast: (t) => {
    const id = toastId++
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] })
    setTimeout(() => get().dismissToast(id), 5000)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  vitals: {
    hr: 71,
    hrv: 44,
    spo2: 97.8,
    temp: 36.6,
    resp: 14.2,
    stress: 46,
    glucose: 104,
    steps: 6420,
    kcal: 1280,
    hist: {
      hr: seedHist(71, 6),
      hrv: seedHist(44, 8),
      spo2: seedHist(97.8, 0.8),
      temp: seedHist(36.6, 0.15),
      resp: seedHist(14.2, 1.2),
      stress: seedHist(46, 12),
      glucose: seedHist(104, 10),
    },
  },
  tick: () => {
    const v = get().vitals
    const g = () => gaussian(rand)
    const hr = clamp(v.hr + (71 - v.hr) * 0.08 + g() * 1.6, 55, 120)
    const stress = clamp(v.stress + (46 - v.stress) * 0.05 + g() * 2.2 + (hr - 71) * 0.15, 5, 98)
    const n = {
      hr,
      hrv: clamp(v.hrv + (44 - v.hrv) * 0.08 - (stress - 46) * 0.05 + g() * 1.4, 18, 100),
      spo2: clamp(v.spo2 + (97.8 - v.spo2) * 0.2 + g() * 0.15, 94, 100),
      temp: clamp(v.temp + (36.6 - v.temp) * 0.1 + g() * 0.02, 35.8, 37.6),
      resp: clamp(v.resp + (14.2 - v.resp) * 0.1 + g() * 0.3, 9, 24),
      stress,
      glucose: clamp(v.glucose + (104 - v.glucose) * 0.06 + g() * 1.4, 70, 180),
    }
    const push = (a: number[], x: number) => [...a.slice(1), x]
    set({
      vitals: {
        ...n,
        steps: v.steps + (rand() < 0.4 ? Math.round(rand() * 22) : 0),
        kcal: v.kcal + rand() * 1.3,
        hist: {
          hr: push(v.hist.hr, n.hr),
          hrv: push(v.hist.hrv, n.hrv),
          spo2: push(v.hist.spo2, n.spo2),
          temp: push(v.hist.temp, n.temp),
          resp: push(v.hist.resp, n.resp),
          stress: push(v.hist.stress, n.stress),
          glucose: push(v.hist.glucose, n.glucose),
        },
      },
    })
  },
  palette: false,
  setPalette: (palette) => set({ palette }),
  logOpen: false,
  setLogOpen: (logOpen) => set({ logOpen }),
  sim: baselineParams(history),
  setSim: (p) => set({ sim: { ...get().sim, ...p } }),
  resetSim: () => set({ sim: baselineParams(get().days) }),
  chat: [],
  pushChat: (m) => {
    const id = chatId++
    set({ chat: [...get().chat, { ...m, id }] })
    return id
  },
  patchChat: (id, m) => set({ chat: get().chat.map((c) => (c.id === id ? { ...c, ...m } : c)) }),
  recalibrating: 0,
}))

/** Memoised derived twin state — recomputed whenever the history changes */
export function useTwin() {
  const days = useStore((s) => s.days)
  return useMemo(() => {
    return {
      days,
      today: days[days.length - 1],
      scores: computeScores(days),
      risks: computeRisks(days),
      recs: recommendations(days),
      patterns: discoverPatterns(days),
      anomalies: detectAnomalies(days),
      corr: correlationMatrix(days),
    }
  }, [days])
}
