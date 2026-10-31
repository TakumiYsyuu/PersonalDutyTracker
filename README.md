# Taláan

Personal duty, salary, and savings tracker. React + Vite + Tailwind + DaisyUI, installable as a PWA. All data lives in the browser's LocalStorage; there is no backend.

## Scripts
- `npm run dev` start the dev server (service worker is off in dev)
- `npm run build` production build into `dist/` (generates the service worker and manifest)
- `npm run preview` serve the production build locally, needed to test install/offline
- `npm test` run the calculation/backup/savings logic tests (no extra dependencies)
- `npm run lint`

## Structure
- `src/Pages/` Dashboard.jsx, Goals.jsx
- `src/components/` shared UI (NavBar, modals, toasts, forms, cards)
- `src/Logic/` pure logic with no React: `salary.js`, `summary.js`, `savings.js`, `storage.js`, `backup.js`, `format.js`, `money.js`
- `src/hooks/` persistence, online status, install prompt
- `Infos.md` design palette (source of truth)

## Rules the salary math follows
- Overtime hours are part of the clocked time: regular = clocked - overtime.
- hourly = regular x rate + OT x OT rate; daily = day rate + OT x OT rate; fixed = fixed amount only.
- A duty counts toward the month and kinsena (1st-15th / 16th-end) of the day it started.
- Incomplete or invalid duties earn ₱0 until fixed.

## Deploying to Vercel
Framework preset: Vite. Build `npm run build`, output `dist`. `vercel.json` sets cache headers so new service workers are picked up. Navigation uses `#/goals` style hashes, so no rewrites are needed.
