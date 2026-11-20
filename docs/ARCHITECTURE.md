# Architecture

## Principles

1. **One seam for intelligence.** Every number on screen comes from `src/engine/twin.ts`. UI components never compute health logic. To use real models, swap this module's implementations (or turn them into API calls) without touching the UI.
2. **Deterministic by default.** The synthetic subject is seeded (`mulberry32`), so the same inputs always give the same twin. That makes the tests and demos repeatable.
3. **On-device first.** All analytics run in the browser. No health data leaves the device in the current build.
4. **Explainable outputs.** Each risk exposes its additive drivers in logit space, and each insight exposes its correlation, effect size and sample size.

## Data model

`Day` (see `src/data/synthetic.ts`) holds one day of the subject's life, with 35 fields:

| Domain | Fields |
| --- | --- |
| Sleep | duration, stages, latency, efficiency, bedtime |
| Activity | steps, active minutes, VO₂ max, energy burned |
| Nutrition | kcal, macros, sugar, fiber, water, caffeine |
| Mind | stress, HRV, resting HR, mood, focus, energy |
| Context | workload, late screen time, meditation |

The generator is a **structural causal model**. A latent workload variable drives caffeine and screen time. Those drive sleep architecture, which drives stress and HRV. This gives the pattern-discovery layer real structure to find.

## Engine

| Function | Method | Output |
| --- | --- | --- |
| `computeScores` | Weighted domain sub-scores over a 7-day window; biological-age heuristic from Life Index, RHR and VO₂ max | Life Index, 5 domain scores, bio age, week-on-week delta |
| `computeRisks` | Logistic models, `σ(bias + Σ driverᵢ)`, with interpretable drivers; compared against the previous 10-day window | Probability, severity, sorted drivers, trend |
| `forecast` | Holt linear exponential smoothing with damped trend; 80% interval from residual σ, widening with horizon | 14-day point forecast and band |
| `discoverPatterns` | Pearson r, split-sample effect sizes, lag-1 effects | Ranked natural-language insights |
| `detectAnomalies` | Rolling 14-day z-score, \|z\| > 2.1 | Flagged days per metric |
| `recommendations` | Rule layer over risk drivers, ranked by projected impact | Actionable directives |
| `simulate` | Coupled first-order system (stress, HRV, sleep, energy, VO₂, weight), expressed as deltas from a calibrated baseline so the current path starts at today's state | 91-day trajectories |

## Front end

- **React 19 + TypeScript.** One lazily loaded module per route (`React.lazy`), each wrapped in an `ErrorBoundary`.
- **State: Zustand.** Holds the history, live vitals (1 Hz tick), quick-log mutations, simulator parameters, chat and theme. `useTwin()` memoises every derived engine result per history version.
- **Rendering.**
  - Charts are custom SVG components with spring motion.
  - The twin is three.js with a custom point-cloud shader. Heartbeat and breathing are driven by live HR and respiration. Labels are projected from 3D anchors every frame.
- **Motion: Motion (Framer Motion).** Springs throughout, shared-layout transitions (navigation pill, segmented controls, command palette selection), scroll-revealed cards, and the View Transitions API for the theme switch.
- **Styling: Tailwind CSS v4.** Uses CSS-variable design tokens with separate light and dark sets (see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)).

## Quality

- `npm run check` runs type-check, ESLint, Vitest and the production build. GitHub Actions runs the same on every push and pull request.
- The engine tests cover:
  - determinism and physiological bounds
  - probability calibration bounds and driver ordering
  - recovery of the generator's causal links
  - the simulator's calibration, ordering and preset behaviour
