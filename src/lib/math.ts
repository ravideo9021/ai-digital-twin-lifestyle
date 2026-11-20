// ─── Deterministic math & statistics toolkit used by the twin engine ───

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gaussian(rand: () => number) {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

export function std(xs: number[]) {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

export function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length)
  if (n < 3) return 0
  const ma = mean(a.slice(0, n))
  const mb = mean(b.slice(0, n))
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma
    const y = b[i] - mb
    num += x * y
    da += x * x
    db += y * y
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

/** Ordinary least squares y = a + b·x */
export function linreg(ys: number[]) {
  const n = ys.length
  const xs = ys.map((_, i) => i)
  const mx = mean(xs)
  const my = mean(ys)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  const slope = den ? num / den : 0
  return { slope, intercept: my - slope * mx }
}

/** Holt's linear exponential smoothing with residual-based confidence band */
export function holtForecast(series: number[], horizon: number, alpha = 0.45, beta = 0.12) {
  let level = series[0]
  let trend = series[1] - series[0]
  const residuals: number[] = []
  for (let i = 1; i < series.length; i++) {
    const pred = level + trend
    residuals.push(series[i] - pred)
    const prevLevel = level
    level = alpha * series[i] + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
  }
  const sigma = std(residuals)
  const out: { v: number; lo: number; hi: number }[] = []
  for (let h = 1; h <= horizon; h++) {
    const v = level + h * trend * 0.6 // damped trend
    const spread = 1.28 * sigma * Math.sqrt(1 + h * 0.18)
    out.push({ v, lo: v - spread, hi: v + spread })
  }
  return { points: out, sigma }
}

export function rolling(xs: number[], w: number) {
  return xs.map((_, i) => mean(xs.slice(Math.max(0, i - w + 1), i + 1)))
}

export function zscores(xs: number[], w = 14) {
  return xs.map((x, i) => {
    const win = xs.slice(Math.max(0, i - w), i)
    if (win.length < 5) return 0
    const s = std(win) || 1
    return (x - mean(win)) / s
  })
}

export const fmt = (v: number, d = 0) =>
  v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

export function hhmm(hours: number) {
  const h = ((Math.floor(hours) % 24) + 24) % 24
  const m = Math.round((hours - Math.floor(hours)) * 60)
  return `${String(h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`
}
