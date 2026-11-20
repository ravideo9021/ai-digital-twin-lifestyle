import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../store/store'

function ecgWave(f: number) {
  const g = (mu: number, s: number, a: number) => a * Math.exp(-((f - mu) ** 2) / (2 * s * s))
  return g(0.12, 0.025, 0.1) + g(0.235, 0.008, -0.1) + g(0.25, 0.01, 1) + g(0.268, 0.009, -0.25) + g(0.45, 0.045, 0.2)
}

/** Sweep-style heart rhythm trace. Reads its colour from a CSS variable so it follows the theme. */
export function ECG({ height = 56, cssVar = '--heart' }: { height?: number; cssVar?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const hr = useStore((s) => s.vitals.hr)
  const hrRef = useRef(hr)
  hrRef.current = hr
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const dpr = Math.min(2, devicePixelRatio)
    let w = 0
    const resize = () => {
      w = c.clientWidth
      c.width = w * dpr
      c.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(c)
    let x = 0
    let phase = 0
    let lastY = height * 0.62
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const color = getComputedStyle(c).getPropertyValue(cssVar).trim() || '#ff2d55'
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const steps = Math.max(1, Math.round(90 * dt))
      ctx.lineCap = 'round'
      for (let s = 0; s < steps; s++) {
        phase += hrRef.current / 60 / 90
        if (phase > 1) phase -= 1
        const y = height * 0.66 - ecgWave(phase) * height * 0.56
        ctx.clearRect(x + 1, 0, 22, height)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.75
        ctx.beginPath()
        ctx.moveTo(x, lastY)
        ctx.lineTo(x + 1, y)
        ctx.stroke()
        lastY = y
        x = x + 1 > w ? 0 : x + 1
      }
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, lastY, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [height, cssVar])
  return <canvas ref={ref} className="w-full block" style={{ height }} />
}

/** Thin progress line + status capsule shown when the twin re-computes after new data. */
export function Recalibrate() {
  const ts = useStore((s) => s.recalibrating)
  useEffect(() => {
    if (!ts) return
    const id = setTimeout(() => useStore.setState({ recalibrating: 0 }), 1500)
    return () => clearTimeout(id)
  }, [ts])
  return (
    <AnimatePresence>
      {ts !== 0 && (
        <motion.div key={ts} className="fixed inset-x-0 top-0 z-[98] pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
          <motion.div className="h-[2px] origin-left" style={{ background: 'var(--accent)' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
