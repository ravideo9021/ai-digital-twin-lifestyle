import { describe, expect, it } from 'vitest'
import { clamp, holtForecast, linreg, mean, mulberry32, pearson, std, zscores } from './math'

describe('math', () => {
  it('mulberry32 is deterministic for a seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('mean / std / clamp', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(std([2, 2, 2])).toBe(0)
    expect(clamp(12, 0, 10)).toBe(10)
    expect(clamp(-1, 0, 10)).toBe(0)
  })

  it('pearson detects perfect positive and negative correlation', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1)
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1)
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0)
  })

  it('linreg recovers slope and intercept', () => {
    const { slope, intercept } = linreg([3, 5, 7, 9])
    expect(slope).toBeCloseTo(2)
    expect(intercept).toBeCloseTo(3)
  })

  it('holtForecast extends a trend and widens its interval over time', () => {
    const series = Array.from({ length: 30 }, (_, i) => 50 + i * 0.5)
    const { points } = holtForecast(series, 7)
    expect(points).toHaveLength(7)
    expect(points[6].v).toBeGreaterThan(series[series.length - 1])
    expect(points[6].hi - points[6].lo).toBeGreaterThanOrEqual(points[0].hi - points[0].lo)
  })

  it('zscores flag an outlier', () => {
    const xs = [...Array.from({ length: 20 }, (_, i) => 10 + (i % 2) * 0.5), 30]
    expect(Math.abs(zscores(xs).at(-1)!)).toBeGreaterThan(3)
  })
})
