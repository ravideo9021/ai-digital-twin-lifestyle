import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useCallback, useEffect, useRef, type ComponentType } from 'react'
import { useStore, type PageId } from './store/store'
import { Recalibrate } from './components/Effects'
import { CommandPalette, Island, Launch, QuickLog, Sidebar, TabBar, Toolbar } from './components/Shell'
import { applyTheme } from './lib/theme'
import { ErrorBoundary } from './components/ErrorBoundary'

// Route-level code splitting: three.js and heavy screens load on demand.
const Core = lazy(() => import('./pages/Core'))
const Sleep = lazy(() => import('./pages/Sleep'))
const Nutrition = lazy(() => import('./pages/Nutrition'))
const ActivityPage = lazy(() => import('./pages/Activity'))
const Mind = lazy(() => import('./pages/Mind'))
const Predict = lazy(() => import('./pages/Predict'))
const Simulate = lazy(() => import('./pages/Simulate'))
const Insights = lazy(() => import('./pages/Insights'))
const Neural = lazy(() => import('./pages/Neural'))
const Assistant = lazy(() => import('./pages/Assistant'))

function PageSkeleton() {
  return (
    <div aria-busy className="pt-2">
      <div className="shimmer h-4 w-40 rounded-md" />
      <div className="shimmer h-9 w-80 rounded-lg mt-3" />
      <div className="grid grid-cols-12 gap-5 mt-8">
        <div className="shimmer col-span-12 xl:col-span-7 h-[420px] rounded-[20px]" />
        <div className="shimmer col-span-12 xl:col-span-5 h-[420px] rounded-[20px]" />
      </div>
    </div>
  )
}

const PAGES: Record<PageId, ComponentType> = {
  core: Core,
  sleep: Sleep,
  nutrition: Nutrition,
  activity: ActivityPage,
  mind: Mind,
  predict: Predict,
  simulate: Simulate,
  insights: Insights,
  neural: Neural,
  assistant: Assistant,
}

const EVENTS = [
  { tone: 'warn' as const, title: 'Burnout risk is rising', body: 'Stress has stayed high for 5 days. See what’s driving it.' },
  { tone: 'info' as const, title: 'New pattern found', body: 'Your focus peaks about 90 min after a 15-minute walk.' },
  { tone: 'warn' as const, title: 'Glucose spike likely at 4:40 PM', body: 'Swapping the afternoon snack could flatten it.' },
  { tone: 'ok' as const, title: 'Hydration goal met', body: 'That’s 4 days in a row.' },
  { tone: 'info' as const, title: 'Wind down in 30 minutes', body: 'Dimming screens now protects tonight’s REM sleep.' },
]

export default function App() {
  const booted = useStore((s) => s.booted)
  const page = useStore((s) => s.page)
  const theme = useStore((s) => s.theme)
  const tick = useStore((s) => s.tick)
  const mainRef = useRef<HTMLElement>(null)
  const Page = PAGES[page] ?? Core
  const finishLaunch = useCallback(() => useStore.getState().setBooted(true), [])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => applyTheme('system')
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [theme])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [page])

  useEffect(() => {
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tick])

  useEffect(() => {
    if (!booted) return
    let i = 1
    const first = setTimeout(() => useStore.getState().pushToast(EVENTS[0]), 3500)
    const id = setInterval(() => useStore.getState().pushToast(EVENTS[i++ % EVENTS.length]), 40000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [booted])

  useEffect(() => {
    const h = () => {
      const p = location.hash.replace('#', '') as PageId
      if (PAGES[p]) useStore.setState({ page: p })
    }
    addEventListener('hashchange', h)
    return () => removeEventListener('hashchange', h)
  }, [])

  return (
    <>
      <AnimatePresence>{!booted && <Launch key="launch" onDone={finishLaunch} />}</AnimatePresence>
      {booted && (
        <motion.div className="relative h-full flex" initial={{ opacity: 0, scale: 0.975, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <Toolbar scrollRef={mainRef} />
            <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mt-[60px] pt-[60px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
                  transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                  className="px-4 md:px-8 pt-2 pb-16 max-w-[1440px] mx-auto"
                >
                  <ErrorBoundary resetKey={page}>
                    <Suspense fallback={<PageSkeleton />}>
                      <Page />
                    </Suspense>
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </main>
            <TabBar />
          </div>
        </motion.div>
      )}
      <Island />
      <QuickLog />
      <CommandPalette />
      <Recalibrate />
    </>
  )
}
