<div align="center">

<img src="public/favicon.svg" width="72" alt="Soma logo" />

# Soma

**An AI-driven, software-based digital twin for predictive lifestyle management.**

Soma builds a living model of one person from their sleep, nutrition, activity and stress data. It finds patterns in that data, predicts lifestyle problems before they show up, and turns both into clear, personal recommendations.

[![CI](https://github.com/ravideo9021/ai-digital-twin-lifestyle/actions/workflows/ci.yml/badge.svg)](https://github.com/ravideo9021/ai-digital-twin-lifestyle/actions/workflows/ci.yml)
![React 19](https://img.shields.io/badge/React-19-0a84ff) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-0a84ff) ![License: MIT](https://img.shields.io/badge/License-MIT-30d158)

</div>

---

## Why a digital twin?

The digital twin idea started in aerospace and industrial manufacturing, where a software copy of a complex system lowers the risk of unwanted behaviour. A **Human Digital Twin** applies the same idea to a person. It keeps learning from wearables, electronic health records and home sensors, so it can model how that person's health is changing over time and *simulate* what would happen if they changed their habits.

Soma covers the four core twin capabilities described in the literature: **modelling, monitoring, prediction and anomaly detection.** It adds explainability and a counterfactual simulator on top.

## Features

| Area | What it does |
| --- | --- |
| **Summary** | Interactive 3D twin (≈ 27k-point WebGL body with heartbeat and breathing), Life Index, biological age, live vitals, forecast summary, daily plan, 24-hour rhythm clock |
| **Forecasts** | Four interpretable risk models (burnout, sleep fragmentation, metabolic drift, cardiovascular strain), per-feature driver attribution, rolling 30-day re-scoring, 14-day forecasts with uncertainty bands |
| **Simulator** | Seven lifestyle levers project the next 90 days against the current path, with presets, a phenotype radar and a plain-language summary |
| **Insights** | Correlations, lagged effects and effect sizes found in the user's own data, with scatter evidence, a correlation matrix, unusual-day detection and weekday rhythm |
| **Sleep · Nutrition · Activity · Mind** | Sleep-stage chart, glucose curve with meals, activity rings and training load, a guided breathing session that logs back to the twin |
| **Ask Soma** | Conversational interface that answers from twin computations, with reasoning steps and inline charts |
| **Models & Data** | Live pipeline diagram, model registry with drift, inference log, training curves, feature importance, privacy model |

Across the app:
- Light and dark appearance, with a circular-reveal theme switch
- ⌘K command palette
- Quick-log sheet that recalculates the twin on each entry
- Dynamic-Island-style alerts
- Large titles that collapse into the toolbar on scroll
- Code-split routes and per-screen error boundaries
- Respects reduced-motion settings
- Responsive down to phone width, with a tab bar on mobile

## Quick start

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:5199
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm test` | Run the engine unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run check` | Everything CI runs |

URL flags for demos: `?skipboot` skips the launch animation; `?instant` turns off motion.

## How it works

```
Wearables · CGM · EHR (FHIR) · Phone · Home sensors
          │
          ▼
   Ingestion & quality checks ──► Feature store (rolling windows)
                                        │
             ┌──────────────┬───────────┼────────────┬──────────────┐
             ▼              ▼           ▼            ▼              ▼
        Risk models    Forecasting   Pattern     Anomaly       Simulator
        (logistic,     (Holt damped  discovery   detection     (coupled
        explainable)   trend + CI)   (Pearson,   (rolling z)   ODE model)
                                     lagged)
             └──────────────┴───────────┼────────────┴──────────────┘
                                        ▼
                              Twin state (React + Zustand)
                                        ▼
                     Summary · Forecasts · Simulator · Ask Soma
```

The whole analytics engine lives in [`src/engine/twin.ts`](src/engine/twin.ts) and runs on the user's device. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### What is real and what is simulated

Soma ships with a **synthetic subject** so it can run without any hardware or accounts.

- **Real computation:**
  - A seeded, *causal* generator produces 120 days of linked data (late caffeine → less deep sleep → higher stress → lower HRV …).
  - The engine computes scores, logistic risk models, Holt forecasts, correlations, effect sizes, z-score anomalies and the 90-day simulator from that data. Unit tests check that it recovers the causal links built into the generator.
- **Simulated for the demo:**
  - Live sensor streams
  - Model-registry metrics and the inference log
  - The assistant: an intent router over real twin computations, not an LLM

Moving to real users is planned in [docs/ROADMAP.md](docs/ROADMAP.md).

## Project structure

```
src/
├── data/synthetic.ts       seeded causal subject generator
├── engine/twin.ts          scores · risks · forecasts · patterns · anomalies · simulator
├── engine/twin.test.ts     engine tests
├── lib/                    math & statistics, theme switching
├── store/store.ts          app state, live vitals, logging, derived twin
├── components/
│   ├── ui.tsx              design-system primitives (Card, Ring, Metric, Segmented…)
│   ├── charts/             SVG chart library (line + bands, bars, radar, donut, heatmap)
│   ├── Hologram.tsx        three.js twin with custom GLSL
│   ├── Shell.tsx           sidebar, toolbar, tab bar, palette, sheets, alerts, launch
│   └── ErrorBoundary.tsx
└── pages/                  one file per screen, lazy-loaded
```

## Design

The design is restrained and informational. It uses the system typeface, a neutral canvas with real elevation, one hue per health domain, and motion driven by springs. Details are in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

## Research basis

- Human Digital Twin: Data, Models, Applications, and Challenges, [arXiv 2508.13138](https://arxiv.org/html/2508.13138v1)
- Developing lifestyle-focused digital twin archetypes in heart care, [SHTI 2025](https://journals.sagepub.com/doi/10.3233/SHTI250092)
- AI-powered digital twins in healthcare, [Journal of Big Data 2025](https://link.springer.com/article/10.1186/s40537-025-01280-w)
- Digital twins in healthcare (review), [Frontiers in Digital Health 2025](https://public-pages-files-2025.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1633539/pdf)

## Disclaimer

Soma is a wellness and research project. It is **not a medical device** and does not diagnose, treat or prevent disease. The bundled data is synthetic.

## License

[MIT](LICENSE)
