import { describe, expect, it } from 'vitest'
import { DAYS, generateHistory, SUBJECT } from '../data/synthetic'
import { baselineParams, computeRisks, computeScores, detectAnomalies, discoverPatterns, PRESETS, recommendations, simulate } from './twin'

const days = generateHistory()

describe('synthetic history', () => {
  it('is deterministic and complete', () => {
    expect(days).toHaveLength(DAYS)
    expect(generateHistory()[50].stress).toBe(days[50].stress)
  })
  it('stays within physiological bounds', () => {
    for (const d of days) {
      expect(d.sleepHours).toBeGreaterThanOrEqual(4.4)
      expect(d.sleepHours).toBeLessThanOrEqual(9.6)
      expect(d.hrv).toBeGreaterThan(0)
      expect(d.deepPct + d.remPct + d.lightPct + d.awakePct).toBeCloseTo(100)
    }
  })
  it('keeps body weight near the subject baseline', () => {
    expect(Math.abs(days.at(-1)!.weight - SUBJECT.baselineWeight)).toBeLessThan(6)
  })
})

describe('scores', () => {
  const s = computeScores(days)
  it('are bounded 0–100', () => {
    for (const v of [s.life, s.sleep, s.nutrition, s.activity, s.mind, s.recovery]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })
  it('estimate a plausible biological age', () => {
    expect(Math.abs(s.bioAge - SUBJECT.age)).toBeLessThan(10)
  })
})

describe('risks', () => {
  const risks = computeRisks(days)
  it('returns four calibrated probabilities with drivers sorted by impact', () => {
    expect(risks).toHaveLength(4)
    for (const r of risks) {
      expect(r.probability).toBeGreaterThan(0)
      expect(r.probability).toBeLessThan(1)
      const mags = r.drivers.map((d) => Math.abs(d.impact))
      expect(mags).toEqual([...mags].sort((a, b) => b - a))
    }
  })
})

describe('pattern discovery', () => {
  const patterns = discoverPatterns(days)
  it('recovers the causal links built into the generator', () => {
    const byId = Object.fromEntries(patterns.map((p) => [p.id, p]))
    expect(byId.p1.r).toBeLessThan(-0.3) // late caffeine ↓ deep sleep
    expect(byId.p3.r).toBeLessThan(0) // meditation ↓ stress
    expect(byId.p6.r).toBeGreaterThan(0) // stress ↑ sugar
  })
})

describe('anomalies and recommendations', () => {
  it('flags only strong deviations', () => {
    for (const a of detectAnomalies(days)) expect(Math.abs(a.z)).toBeGreaterThan(2.1)
  })
  it('ranks recommendations by projected impact', () => {
    const recs = recommendations(days)
    expect(recs.length).toBeGreaterThan(2)
    expect(recs.map((r) => r.impact)).toEqual([...recs.map((r) => r.impact)].sort((a, b) => b - a))
  })
})

describe('simulator', () => {
  const base = baselineParams(days)
  const current = simulate(days, base)
  it('starts the current path at today’s measured state', () => {
    expect(current[0].life).toBeCloseTo(computeScores(days).life, 5)
    expect(current).toHaveLength(91)
  })
  it('projects the optimised preset above the crunch preset', () => {
    const opt = simulate(days, { ...base, ...PRESETS.find((p) => p.id === 'optimal')!.params })
    const crunch = simulate(days, { ...base, ...PRESETS.find((p) => p.id === 'burnout')!.params })
    expect(opt.at(-1)!.life).toBeGreaterThan(current.at(-1)!.life)
    expect(crunch.at(-1)!.life).toBeLessThan(current.at(-1)!.life)
    expect(crunch.at(-1)!.stress).toBeGreaterThan(opt.at(-1)!.stress)
  })
})
