# Pharmacy Finder — PRD & Team Plan

**Team leads:** King-Frederick and Karl · **Stack:** Next.js (latest) + Java Spring Boot · **Version:** 1.0

---

## 1. Overview

**One-liner:** Tell an AI chatbot how you feel, and Pharmacy Finder tells you what to ask for, which nearby pharmacy actually has it in stock, and gets it to you, so you never walk from shop to shop again.

### Problem
Students and residents around campus often feel unwell, walk to one pharmacy, find the drug out of stock, and repeat. They also don't always know what to ask for. This wastes time when people are sick and least able to spare it.

### Solution
A web app that combines:
1. A live map and search of campus-area pharmacies with stock visibility.
2. An AI symptom assistant that suggests over-the-counter options and when to see a doctor.
3. In-app ordering with pickup or delivery from the nearest pharmacy that has the item.

### Target Users
- **Patients:** Students and staff near campus (primary).
- **Pharmacy staff:** Update stock, accept and fulfil orders.
- **Riders (optional, phase 2):** Deliver orders.
- **Admin:** Approve pharmacies, monitor the platform.

---

## 2. Goals
- Go from symptoms to a confirmed order in under 3 minutes.
- Show reliable, recently updated stock for partner pharmacies.
- **Be safe:** The AI never diagnoses, and always escalates serious symptoms.

---

## 3. Features

### Core
1. **Auth and profiles:** Sign up and log in (email and password, Google login), roles (patient, pharmacy, admin), saved delivery address.
2. **Pharmacy directory and map:** List and map of nearby pharmacies, distance, opening hours, rating, open-now badge.
3. **Drug search with live stock:** Search by drug name; see which pharmacies have it, price, and last-updated time.
4. **AI symptom chatbot:** User describes symptoms; the bot asks follow-up questions, suggests OTC medicine names to ask for, gives basic dosage guidance from the label and warning signs, then offers "Find it nearby".
5. **Smart order routing:** From the chatbot's suggestion, find the nearest pharmacy with stock and place the order in one tap.
6. **Cart and checkout:** Pickup or delivery; payment through Paystack (card and mobile money) plus a pay-on-pickup option.
7. **Order tracking:** Statuses: `placed`, `accepted`, `ready`, `out for delivery`, `completed`, `cancelled`. Live updates.
8. **Pharmacy dashboard:** Manage inventory (add, edit, bulk CSV upload), set prices, toggle in/out of stock, accept or reject orders.
9. **Admin panel:** Approve pharmacy registrations, manage drugs catalogue, view orders and reports.
10. **Notifications:** Email and in-app (SMS later) for order updates.

### Safety and Trust (Highest Priority)
- **Red-flag detection:** Chest pain, difficulty breathing, severe bleeding, etc. skip the drug suggestions and show an emergency message and nearby hospitals.
- **Allergy and interaction check:** User lists allergies and current meds; the bot warns on conflicts.
- **Prescription upload:** Photo upload for Rx-only drugs; pharmacist verifies before fulfilment.
- **Verified pharmacy badge:** Pharmacies show their licence number after admin approval.

### Convenience
- **Out-of-stock alerts:** "Notify me when this is back".
- **Generic alternatives:** If the brand is unavailable, suggest an equivalent active ingredient with price comparison.
- **Price comparison:** Cheapest, nearest, or fastest sort.
- **Reorder and refill reminders:** For recurring medicines.
- **Voice input and photo search:** Speak symptoms, or snap a medicine box to identify it.
- **Multi-language chat:** English first, Twi as a stretch goal.
- **Reservations:** Reserve an item for 30 minutes while the user walks over.

### Engagement and Operations
- **Pharmacy ratings and reviews.**
- **Pharmacy analytics:** Most-searched drugs, demand heatmap, low-stock alerts.
- **PWA:** Installable on a phone, works well on weak networks.
- **Dark mode and accessibility:** Readable and usable for everyone.

---

## 4. Tech Stack

**Architecture:** Next.js app → REST API (Spring Boot) → PostgreSQL, with the AI service, payments and notifications as modules inside the backend.

| Layer | Choice |
| :--- | :--- |
| **Frontend** | Next.js (latest, App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **State and data fetching** | TanStack Query, Zod for validation |
| **Backend** | Java 21, Spring Boot 3.x (Web, Security, Data JPA, Validation) |
| **Auth** | JWT (access and refresh tokens) with Spring Security |
| **Database** | PostgreSQL (with PostGIS or Haversine queries for distance) |
| **Realtime** | WebSockets (STOMP) or Server-Sent Events for order status |
| **AI** | Groq API (fast LLM inference), called only from the backend (never from the browser), with a strict safety system prompt |
| **Maps** | Leaflet with OpenStreetMap (free), or Google Maps |
| **Payments** | Paystack (test mode for development) |
| **API docs** | Springdoc OpenAPI (Swagger UI) |
| **DevOps** | GitHub, GitHub Actions CI, Docker, deploy on Vercel (frontend) and Render or Railway (backend + DB) |

---

## 5. Main Data Model

- **User:** `(id, name, email, role, phone, password hash)`
- **Pharmacy:** `(id, owner → User, name, licence no., address, lat, lng, hours, verified)`
- **Drug:** `(id, name, generic name, category, requires_prescription)`
- **Inventory:** `(pharmacy → Pharmacy, drug → Drug, price, quantity, updated_at)`
- **Order:** `(id, patient → User, pharmacy → Pharmacy, status, type [pickup/delivery], total, address)`
- **OrderItem:** `(order, drug, qty, price)`
- **ChatSession / ChatMessage:** `(user, messages, suggested drugs)`
- **Additional Models:** `Review`, `Notification`, `StockAlert`, `Prescription`

---

## 6. API Outline (REST, `/api/v1`)

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- `GET /pharmacies?lat=&lng=&radius=`, `GET /pharmacies/{id}`
- `GET /drugs?query=`, `GET /drugs/{id}/availability?lat=&lng=`
- `POST /chat/message` (symptom assistant)
- `POST /orders`, `GET /orders/{id}`, `PATCH /orders/{id}/status`
- `GET /pharmacy/inventory`, `PUT /pharmacy/inventory` (pharmacy role), `POST /pharmacy/inventory/import`
- `POST /alerts` (stock alert), `POST /reviews`
- **Admin:** `PATCH /admin/pharmacies/{id}/verify`

---

## 7. Team Split

Work is split by area so people don't block each other. Each member owns their area; Karl reviews frontend pull requests and King-Frederick reviews backend ones.

| Member | Role | Responsibilities |
| :--- | :--- | :--- |
| **King-Frederick** | Team lead, architecture and integration | Repo, branch rules and CI; Spring Boot skeleton, auth and security; code reviews; integration and deployment |
| **Karl** | Co-team lead, frontend lead and design | Design system, wireframes and UI/UX; Next.js setup and layout; auth pages, map and search pages, chatbot UI, ordering flow; guides Duke on frontend tasks |
| **Michael** | Backend: AI and chatbot | Groq integration, chat endpoint, safety system prompt, red-flag logic, allergy and interaction checks, symptom-to-drug mapping |
| **Prince** | Backend: core domain | Pharmacy, drug and inventory APIs; nearest-pharmacy-with-stock query; order flow and statuses; Paystack payments integration; mentors Kevin |
| **Duke** | Frontend | Landing and about pages, pharmacy and drug cards, reviews UI, dark mode, navigation and footer; then pharmacy dashboard UI and order tracking page |
| **Kevin** | Backend: engagement features and data | Builds real Spring Boot features under Prince's guidance: reviews and ratings, notifications, out-of-stock alerts, CSV inventory import and seed data; writes unit and API tests and docs for his own endpoints |

---

## 8. Non-functional Requirements

- **Security:** Hashed passwords (BCrypt), JWT, role-based access, input validation, rate limiting on the chat endpoint, HTTPS in production.
- **Privacy:** Health-related chats are sensitive. Collect the minimum data, don't log full chat content in plain logs, and let users delete their history.
- **Performance:** Search results in under 1 second; pages load fast on mobile data.
- **Reliability:** Show "last updated" on stock; mark stock older than a set period as unverified.
- **Usability:** Mobile-first, simple language, accessible colours and font sizes.

---

## 9. Success Metrics

- Time from first message to order placed: under 3 minutes.
- At least 5 partner pharmacies with live stock at demo.
- Order success rate and stock accuracy (sampled checks).
- Zero unsafe responses on the red-flag test set.

---

> [!IMPORTANT]
> **Medical Disclaimer:** The AI assistant provides general information only and is not a substitute for a doctor or pharmacist. This should be stated clearly in the product.
