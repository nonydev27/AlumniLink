# AlumniLink: Client

React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 7.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc
npm run lint       # eslint
npm run build      # typecheck + production build
```

There is no backend yet. Data comes from a mock store persisted in `localStorage` (`src/lib/store.tsx`). Use the demo accounts on the login page.

See `../docs/PRD.md` for requirements and `../docs/COMPONENTS.md` for the code structure.
