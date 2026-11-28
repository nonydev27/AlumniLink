# AlumniLink: Product Requirements

**Team:** Group 30 · **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 7 · **Backend:** to be decided

---

## 1. Overview

**One-liner:** A verified student and alumni network that connects current students with graduates for mentorship, networking and career opportunities.

### Problem
Students graduate without ever speaking to someone already working in their field, and miss internships and guidance. Alumni want to give back but have no simple, structured way to do it. Contact details are scattered across social media groups, and relationships fade after graduation. Existing platforms are crowded, impersonal and not designed around student-to-alumni mentorship.

### Objectives
- Connect students to relevant alumni quickly and simply.
- Use AI to guide users in a way that is clear, honest and trustworthy.
- Ensure every student, including those with disabilities, can use the system.
- Design pages whose controls are fast, easy to reach and hard to use by mistake (Fitts' Law).
- Build a responsive website that works on any device and on slow connections.

### Target users
| User group | Main needs |
| :--- | :--- |
| Current students | Find mentors, career guidance, internships and events. |
| Alumni | Share experience, offer opportunities, manage how and when they are contacted. |
| Administrators / departments | Verify alumni, moderate content, manage alumni relations. |
| Users with special needs | Equal access through assistive technology and inclusive design. |

---

## 2. Core features

1. **Verified accounts:** sign up with graduation year and programme. Students confirm a verified institutional email address against the admin-reviewed domain catalog; alumni are reviewed by the Alumni Relations Office. No student index or reference number is collected.
2. **Smart directory:** browse and search by batch and programme.
3. **Rich profiles:** current work, skills, interests, career goals, willingness to mentor.
4. **Advanced search:** filter by industry, company, programme, batch, location and "open to mentoring".
5. **Networking:** connection and mentorship requests, direct messages, batch group pages.
6. **Opportunity board:** jobs, internships, webinars, events and reunions posted by alumni and the university.
7. **Admin panel:** verification queue, reports and moderation, platform statistics.
8. **Accessible UI:** simple, text-light, high-contrast interface.

## 3. Main pages

| Route | Page |
| :--- | :--- |
| `/` | Landing page |
| `/login`, `/register` | Sign in / sign up as student or alumnus |
| `/dashboard` | AI-suggested mentors, recommended opportunities, requests, profile strength |
| `/directory` | Search and filter alumni and students |
| `/people/:id`, `/profile`, `/profile/edit` | View and edit profiles |
| `/network` | Connections, received and sent requests |
| `/messages/:id?` | Chat with AI message coaching and follow-up ideas |
| `/opportunities` | Jobs, internships and events; post, save and report |
| `/batches`, `/batches/:year` | Batch group pages with posts and members |
| `/settings` | Accessibility, AI and privacy settings; account |
| `/admin` | Verification queue and reports (admin only) |

---

## 4. AI-driven feedback

AI supports users and never replaces their judgement.

| Feature | What the AI does |
| :--- | :--- |
| Alumni matching | Suggests mentors from course, interests, skills and career goals. |
| Profile feedback | Tips such as "Add your skills to get better mentor matches." |
| Message coaching | Helps a student write a clear, polite first message (on request only). |
| Opportunity alerts | Recommends internships, events and jobs, with a reason. |
| Conversation support | Suggests follow-up questions after a mentoring chat. |

**Principles (all implemented):**
- Explain why ("Why this match?").
- Label every output "AI suggestion".
- Show uncertainty ("may be a good fit").
- Keep the user in control: accept, dismiss, report, or turn AI off, with short or detailed explanations.
- No false promises or fake urgency.
- Simple language.
- Honest failure ("We need more details to suggest mentors").
- Privacy: only profile fields are used, and contact details are never shared without consent.
- A "Was this helpful?" feedback loop.
- Fairness: matching never uses gender, background or ranking.
- A human fallback: contact an administrator.

## 5. Accessibility (WCAG 2.2 AA)

- Semantic HTML, landmarks, labelled form fields, a skip link, and visible focus styles.
- Text contrast of at least 4.5:1. Status is never shown by colour alone (icon + text).
- Full keyboard access. Native `<dialog>` modals with focus trapping.
- User settings: text size (100 / 112.5 / 125%), high-contrast mode and reduced motion.
- Voice input for search and messages (Web Speech API, where supported).
- Messages never disappear on their own, and there are no time limits in chat or forms.
- Text-first, code-split pages for low bandwidth and older devices.

## 6. Fitts' Law

| Element | Application |
| :--- | :--- |
| Connect / Request mentorship | Large (48px), full-width, primary-coloured buttons. |
| Mobile navigation | Bottom bar: Home, Alumni, Jobs, Messages, Profile. |
| Search bar | Wide and at the top of the directory. |
| Accept / Dismiss | Side by side, equal size, spaced apart. |
| Delete account, Block, Delete post | Small, placed away from primary actions, always confirmed. |
| Desktop navigation | Sidebar on the screen edge. |
| Related actions | Grouped (e.g. Message next to View profile). |

All interactive targets are at least 44×44px.

---

## 7. Backend handover

The frontend currently uses a mock data layer (`client/src/lib/store.tsx`) persisted to `localStorage`, seeded from `client/src/data/seed.ts`. Each store action maps 1:1 to a REST endpoint. The domain types in `client/src/types.ts` are the API contract. The rule-based AI in `client/src/lib/ai.ts` can move server-side, but must keep the same contract: reasons, uncertain wording and honest failure.

Required backend concerns: HTTPS, authentication with verified roles, institutional email verification plus admin review, consent-based privacy enforcement, moderation, and rate limiting.

## 8. References
- W3C (2023). Web Content Accessibility Guidelines (WCAG) 2.2.
- Fitts, P. M. (1954). The information capacity of the human motor system in controlling the amplitude of movement.
- Nielsen, J. (1994). 10 Usability Heuristics for User Interface Design.
- Amershi, S. et al. (2019). Guidelines for Human-AI Interaction. CHI 2019.
