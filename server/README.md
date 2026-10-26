# HotelPro API (Express + MongoDB)

## Setup
1. Node 20+, MongoDB 6+ **running as a replica set** (needed for transactions):
   `mongod --replSet rs0` then once in mongosh: `rs.initiate()`
2. `cp .env.example .env` and set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGINS`.
3. `npm install`
4. `npm run seed` — creates rooms and demo users:
   admin@hotelpro.test / Admin123!, staff@hotelpro.test / Staff123!, guest@hotelpro.test / Guest123!
5. `npm run dev` → http://localhost:5000/api/health
6. In the client set `VITE_API_URL=http://localhost:5000`.

## Tests
`npm test` (Jest + Supertest + mongodb-memory-server replica set). Covers auth, role authorization,
server-side pricing, capacity/date validation, concurrent overlapping bookings, cancellations/refunds and payment states.

## Key design
- Passwords: bcrypt (cost 12). JWT in `Authorization: Bearer`. Public registration always creates `guest`.
- Double-booking prevention: each booked night is a `RoomNight` doc with a unique `(room, date)` index, written in the same
  transaction as the booking — concurrent overlapping inserts fail with 409.
- Prices: computed from `Room.pricePerNight` on the server (12% tax). Client totals are ignored.
- Payments: `demo_card` is SIMULATED (last4 `0002` = decline). Only last 4 digits stored. `pay_at_hotel` stays pending until collected at check-out.
- Cancellation: allowed for pending/confirmed before check-in. Paid + ≥48h before check-in → refunded; later → non-refundable.

See `API.md` for endpoints. Import into Postman by hand from that list.
