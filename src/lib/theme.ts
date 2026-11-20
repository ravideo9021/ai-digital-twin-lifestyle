import { flushSync } from 'react-dom'
import type { Theme } from '../store/store'

export function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t !== 'system') return t
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(t: Theme) {
  const r = resolveTheme(t)
  document.documentElement.dataset.theme = r
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', r === 'dark' ? '#050506' : '#f2f2f5')
}

/** Theme switch with a circular reveal from the pointer (View Transitions API). */
export function switchTheme(next: Theme, set: (t: Theme) => void, origin?: { x: number; y: number }) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const run = () => {
    flushSync(() => set(next))
    applyTheme(next)
  }
  if (!doc.startViewTransition || reduce || resolveTheme(next) === document.documentElement.dataset.theme) return run()
  const x = origin?.x ?? window.innerWidth - 40
  const y = origin?.y ?? 30
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const vt = doc.startViewTransition(run)
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
    )
  })
}
