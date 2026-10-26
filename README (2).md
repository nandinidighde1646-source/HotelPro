# HotelPro — Hotel Booking & Management System

HotelPro is a full-stack hotel management system built as an academic project. It has two parts:

| Part | Tech | Location | What it does |
|---|---|---|---|
| **Website** | TanStack Start (React 19 + TypeScript + Tailwind CSS v4) | `src/` | Public room browsing and booking, guest booking history, staff front-desk tools, admin dashboard |
| **API server** | Express 5 + MongoDB (Mongoose) + JWT | `server/` | Authentication, room inventory, bookings with double-booking prevention, simulated payments, admin reports and audit log |

The two halves talk over a REST API (`Authorization: Bearer <jwt>`). When the API server is not connected, the website falls back to a clearly-labelled **demo mode** that keeps data in the browser only — useful for previewing the UI, not a real backend.

---

## Features

### Guests
- Browse and search rooms by type, price, capacity and amenities; check real availability for chosen dates
- Book a room with a price **quote computed on the server** (client-sent prices are ignored)
- Two payment options: simulated demo card, or pay at the hotel on check-out
- View own bookings by reference; cancel per the cancellation policy (refund shown automatically)
- Requests for housekeeping / room service while checked in

### Staff (front desk)
- Today's arrivals board; check-in and check-out with payment collection
- Change room housekeeping status (available / occupied / cleaning / maintenance)
- View all bookings and handle guest service requests

### Admin
- Create, edit, price and deactivate rooms
- Manage user accounts and change roles (guest / staff / admin — cannot change own role)
- Reports: revenue, occupancy, bookings by status, monthly revenue
- Audit log of the last 200 sensitive actions

### Booking & pricing rules (enforced server-side)
- 12% tax on the nightly subtotal
- Free cancellation up to **48 hours before check-in** (paid bookings are refunded; later cancellations are non-refundable)
- Maximum stay of **30 nights**; check-in cannot be in the past; guests cannot exceed room capacity
- Only pending/confirmed bookings can be cancelled, and only before check-in

---

## Project structure

```
├── src/                  # Website (TanStack Start)
│   ├── routes/           # File-based routes (home, rooms, checkout, confirmation,
│   │                     #   bookings, staff, admin, login, register, profile)
│   ├── components/       # UI components (shadcn/ui + custom hotel components)
│   ├── lib/api.ts        # REST client (Axios) — switches to demo mode without VITE_API_URL
│   ├── lib/demo.ts       # Browser-only demo backend (labelled, not secure)
│   ├── lib/rules.ts      # Shared client-side mirrors of booking rules (+ tests)
│   └── styles.css        # Tailwind v4 theme tokens
└── server/               # API server (Express + MongoDB)
    ├── src/models/       # User, Room, RoomCategory, Booking, RoomNight, Payment,
    │                     #   ServiceRequest, Review, AuditLog
    ├── src/routes/       # auth, rooms, bookings, services, admin
    ├── src/middleware/   # JWT auth + role guards, zod validation
    ├── src/utils/        # pricing (12% tax), cancellation rules, audit, references
    ├── src/seed.js       # Demo users + 4 rooms
    ├── tests/            # Jest + Supertest suite (in-memory replica set)
    └── API.md            # Full endpoint reference
```

### How double bookings are prevented
Every booked night is stored as a `RoomNight` document with a **unique `(room, date)` index**, written in the *same MongoDB transaction* as the booking. If two people book the same night concurrently, the second insert fails atomically and the API returns `409`.

### How payments work
Payments are **simulated and clearly labelled** — no real money moves, and no card numbers or CVV are ever stored (only the last 4 digits). A demo card ending in `0002` simulates a decline (`402`). `pay_at_hotel` bookings stay pending until staff collect payment at check-out.

---

## Getting started

### Prerequisites
- Node.js 20+
- MongoDB 6+ **running as a replica set** (required for booking transactions):
  ```sh
  mongod --replSet rs0
  # then once, in mongosh: rs.initiate()
  ```

### 1. Start the API server
```sh
cd server
cp .env.example .env        # set MONGODB_URI, JWT_SECRET, CLIENT_ORIGINS
npm install
npm run seed                # creates rooms and demo users
npm run dev                 # http://localhost:5000/api/health
```

### 2. Start the website
```sh
cd ..
npm install
echo "VITE_API_URL=http://localhost:5000" > .env
npm run dev                 # http://localhost:8080
```

Without `VITE_API_URL` the site still runs in **demo mode** (browser-only data, banner shown at the top).

### Demo accounts (created by `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@hotelpro.test` | `Admin123!` |
| Staff | `staff@hotelpro.test` | `Staff123!` |
| Guest | `guest@hotelpro.test` | `Guest123!` |

Public registration always creates a `guest` account — roles can only be granted by an admin in the dashboard.

### Seeded rooms
| Room | Type | Price/night | Capacity |
|---|---|---|---|
| Garden Standard (101) | standard | 120 | 2 |
| Deluxe City View (204) | deluxe | 190 | 2 |
| Family Loft (305) | family | 240 | 4 |
| Linen Suite (501) | suite | 360 | 3 |

---

## API overview

Full reference: [`server/API.md`](server/API.md). Base URL `/api`, JSON, JWT in the `Authorization: Bearer` header.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (guest only), `POST /auth/login`, `GET/PATCH /auth/me` |
| Rooms | `GET /rooms` (filters incl. dates), `GET /rooms/:id`, `GET /rooms/:id/availability`, admin: `POST /rooms`, `PATCH /rooms/:id`; staff: `PATCH /rooms/:id/status` |
| Bookings | `POST /bookings/quote`, `POST /bookings` (guest), `GET /bookings/mine`, `GET /bookings` (staff), `GET /bookings/:ref`, `POST /bookings/:ref/cancel`, `/check-in`, `/check-out` |
| Services | `POST/GET /services`, `PATCH /services/:id` |
| Admin | `GET /admin/users`, `PATCH /admin/users/:id/role`, `GET /admin/reports/summary`, `GET /admin/audit` |

---

## Tests

```sh
cd server
npm test        # Jest + Supertest against a temporary in-memory MongoDB replica set
```

14 tests cover authentication, role authorization, server-side pricing, capacity and date validation, concurrent overlapping bookings (409), cancellation/refund rules and payment states. The website also has Vitest tests for the shared booking rules (`npm test` at the root).

---

## Security notes
- Passwords hashed with bcrypt (cost 12); JWTs expire after 1 day
- Role-based authorization middleware on every protected endpoint
- Zod request validation; input size limited to 100 KB
- Helmet security headers; CORS restricted to configured origins
- Rate limiting on authentication endpoints (100 requests / 15 min)
- Simulated payments only — never store card numbers or CVV

- ## Links
Demo video - https://youtu.be/6Vy-kVg4SHA
