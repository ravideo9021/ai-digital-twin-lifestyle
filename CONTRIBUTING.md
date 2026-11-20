# Contributing

1. `npm install`, then `npm run dev`.
2. Keep health logic in `src/engine/` and keep UI in `src/components` and `src/pages`.
3. Use design tokens (`var(--…)`, `C.*` in `ui.tsx`). Don't hard-code colours in screens.
4. Add or update tests in `*.test.ts` for any engine change.
5. Run `npm run check` before opening a pull request. CI runs the same checks.

Commit style: short imperative subject (`Add sleep debt forecast`), with details in the body.
