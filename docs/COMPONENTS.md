# AlumniLink: Frontend Structure

**Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7

```
client/src/
├── main.tsx                 # Providers: Router → Store → Toast
├── App.tsx                  # Routes (signed-in pages are lazy-loaded)
├── index.css                # Tailwind theme tokens, high-contrast & reduced-motion modes
├── types.ts                 # Domain types = API contract
├── data/seed.ts             # Demo data (fictional people), programmes, industries
├── lib/
│   ├── store.tsx            # Mock API + app state (localStorage), selectors
│   ├── ai.ts                # Mentor matching, profile tips, message coach, recommendations
│   └── format.ts            # Dates, initials, helpers
├── components/
│   ├── ui/                  # Button, Field (TextField/TextAreaField/SelectField), Badge, Avatar,
│   │                        # Card, Dialog, ConfirmDialog, ReportDialog, Switch, Tabs, Toast,
│   │                        # EmptyState, PageHeader, Icon, VoiceInputButton
│   ├── layout/              # PublicLayout, Navbar, Footer, AppShell (sidebar + mobile bottom nav),
│   │                        # RequireAuth, SkipLink, ScrollToTop, AccessibilitySettingsApplier
│   ├── landing/             # Hero, Features, DirectoryPreview, HowItWorks, Opportunities,
│   │                        # TrustedAI, Accessibility, JoinCTA sections
│   ├── auth/                # AuthCard, RoleSelector
│   ├── ai/                  # AIBadge, AIFeedback, MentorSuggestionCard, ProfileTipsCard, MessageCoach
│   ├── directory/           # PersonCard, MentoringStatus
│   ├── profile/             # ProfileView
│   ├── network/             # ConnectActions, MentorshipRequestDialog, RequestList
│   ├── messages/            # ConversationList, ChatThread
│   └── opportunities/       # OpportunityCard, PostOpportunityDialog, typeMeta
└── pages/                   # One file per route (see docs/PRD.md §3)
```

## Conventions
- **Light theme only.** `dark:` utilities only apply with an explicit `.dark` class.
- **Brand tokens:** `brand-*` (blue) and `accent-*` (amber), defined in `index.css` `@theme`.
- **Touch targets:** at least 44px (`min-h-11`). Primary actions use `size="lg"` (48px). Destructive actions use `size="sm"` with `ConfirmDialog`.
- **Forms:** always use `TextField` / `SelectField` / `TextAreaField`. They wire up the label, hint, error and `aria-describedby`.
- **AI output:** always render `AIBadge`, give a reason, and offer `AIFeedback`.
- **Colour + text:** status badges always include text (and usually an icon).

## Demo accounts
On `/login`: Student (Akosua), Alumnus (Dr. Mensah), Admin (Alumni Relations Office). Settings → "Reset demo data" restores the seed.
