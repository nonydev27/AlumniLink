# AlumniLink: Client

React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 7.

```bash
npm install
npm run dev        # http://localhost:5173 (proxies /api to http://localhost:4000)
npm run typecheck  # tsc
npm run lint       # eslint
npm run build      # typecheck + production build
```

## API handover

Authentication is live against the v2 API through `src/lib/api.ts`:

- `POST /api/v2/auth/register|login|refresh|logout|verify-email|resend-verification|forgot-password|reset-password`
- access/refresh tokens are stored in `localStorage`, refreshed on a 401, and sent as `Bearer` tokens
- server DTOs are adapted to the view model in `toClientUser()`
- `/verify-email`, `/forgot-password`, `/reset-password` and `/accept-terms` handle the links the worker emails
- there are no demo logins; seed accounts remain sample directory data only

The local store (`src/lib/store.tsx`) still supplies seeded directory, messaging,
opportunity and batch content so the UI can be reviewed. It no longer creates
sessions or accepts credentials. Each remaining action maps 1:1 to a REST
endpoint; replace it with an `apiRequest()` call using the same DTO adapter
before production use.

Copy `.env.example` to `.env` when the API is not on the default origin. See
`../docs/PRD.md` for requirements and `../docs/COMPONENTS.md` for structure.
