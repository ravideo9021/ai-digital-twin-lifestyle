# Design system

Soma should feel calm, trustworthy and physical. It is a health product, so clarity comes before spectacle.

## Principles

- **Deference.** Content leads. Chrome is quiet: translucent sidebar, hairline separators, no decorative borders.
- **Depth.** Cards are real objects. They have layered shadows (contact, ambient and key light) in light mode, and inner top highlights with deep drop shadows in dark mode. The 3D twin and the breathing session are "stages" with their own lighting.
- **One colour per meaning.** Each health domain has a single hue, used for icons, charts and rings. Neutral greys carry everything else.
- **Motion with mass.** Interactions use springs, never linear tweens. Things enter from where they come from and leave quickly.

## Typography

Soma uses the system typeface (SF Pro on Apple platforms, with Inter as the fallback elsewhere). Metric values use the rounded variant with tabular figures.

| Token | Size / weight | Use |
| --- | --- | --- |
| `t-large` | 34 / 700 | Screen titles |
| `t-title2` | 22 / 600 | Section titles, sheets |
| `t-title3` | 19 / 600 | Stage titles |
| `t-headline` | 15 / 600 | Card titles |
| `t-body` | 15 / 400 | Prose |
| `t-callout` | 14 / 400 | List rows |
| `t-subhead` | 13 / 400 | Secondary rows |
| `t-footnote` | 12 / 400 | Captions, axes |

## Colour

| Token | Light | Dark | Meaning |
| --- | --- | --- | --- |
| `--accent` | #0071E3 | #0A84FF | Interactive, Life Index |
| `--sleep` | #5E5CE6 | #7D7AFF | Sleep |
| `--activity` | #F56300 | #FF9F0A | Movement |
| `--nutrition` | #28A745 | #30D158 | Food, metabolism |
| `--mind` | #0A9FBF | #64D2FF | Stress, mindfulness |
| `--heart` | #FF2D55 | #FF375F | Heart, recovery |
| `--good` / `--warn` / `--bad` | green / orange / red | brighter variants | Status only |

Surfaces: `--bg` (canvas with a soft top light), `--surface` (cards), `--fill` / `--fill-2` (controls, insets), `--sep` (hairlines).

## Components

`Card`, `PageHeader`, `Metric`, `Duration`, `Ring`, `Bar`, `Delta`, `Badge`, `StatusDot`, `Segmented`, `Row`, `Legend`, `Stat` are in `src/components/ui.tsx`. The chart library (`LineChart`, `Bars`, `Sparkline`, `Radar`, `Donut`, `Heatmap`, `CalendarHeat`) is in `src/components/charts`.

## Motion

| Pattern | Implementation |
| --- | --- |
| Card reveal | Spring from `y: 24, scale: .985` when the card scrolls into view |
| Selection | Shared `layoutId` pills (navigation, segmented controls, palette, simulator metrics) |
| Large title | Collapses into the toolbar after 64 px of scroll |
| Alerts | A black capsule springs open from 126 px to a full card and collapses when dismissed |
| Theme | Circular reveal from the pointer (View Transitions API) |
| Data | Lines draw in, bars and rings grow on springs, numbers count up |
| Launch | Two discs, you and your twin, separate, then the wordmark resolves from blur |

All motion respects `prefers-reduced-motion`.
