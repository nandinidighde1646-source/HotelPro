# HotelPro REST API  (base `/api`, JSON, auth = `Authorization: Bearer <jwt>`)

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | /auth/register | public | {name,email,password,phone?} → guest only |
| POST | /auth/login | public | {email,password} → {token,user} |
| GET/PATCH | /auth/me | any | profile (name, phone) |
| GET | /rooms | public | ?type&minPrice&maxPrice&guests&amenities=a,b&checkIn&checkOut |
| GET | /rooms/:id | public | |
| GET | /rooms/:id/availability | public | ?checkIn&checkOut |
| POST | /rooms | admin | create room |
| PATCH | /rooms/:id | admin | edit / pricing / deactivate |
| PATCH | /rooms/:id/status | staff, admin | available/occupied/cleaning/maintenance |
| POST | /bookings/quote | public | {roomId,checkIn,checkOut,guests} |
| POST | /bookings | guest | + {paymentMethod: demo_card\|pay_at_hotel, demoCardLast4?} → 201 / 400 / 402 / 409 |
| GET | /bookings/mine | guest | own bookings |
| GET | /bookings | staff, admin | ?status&date |
| GET | /bookings/:ref | owner, staff, admin | others' bookings return 404 |
| POST | /bookings/:ref/cancel | owner, admin, staff | rules in README |
| POST | /bookings/:ref/check-in | staff, admin | confirmed → checked_in |
| POST | /bookings/:ref/check-out | staff, admin | {collected:true} required if unpaid |
| POST/GET | /services | guest (create, must be checked in) / all (list, guests see own) | |
| PATCH | /services/:id | staff, admin | status |
| GET | /admin/users, PATCH /admin/users/:id/role | admin | cannot change own role |
| GET | /admin/reports/summary | admin | revenue, occupancy, by status, monthly |
| GET | /admin/audit | admin | last 200 actions |
