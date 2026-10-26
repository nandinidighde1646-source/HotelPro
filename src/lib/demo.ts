// BROWSER-ONLY DEMO MODE. Simulates the Express API in localStorage so the UI can be
// previewed without the server. It is not secure and not a substitute for the backend.
import type { Booking, Quote, Role, Room, RoomFilters, ServiceRequest, User } from "./api";
import { quote as calcQuote, nightsBetween, canCancel, paymentStatusAfterCancel } from "./rules";

const KEY = "hotelpro_demo_db_v1";
type DB = { users: (User & { password: string })[]; rooms: Room[]; bookings: Booking[]; services: ServiceRequest[]; audit: { _id: string; action: string; createdAt: string; actor?: User }[] };

const seedRooms: Room[] = [
  { _id: "r101", number: "101", name: "Garden Standard", type: "standard", pricePerNight: 120, capacity: 2, amenities: ["wifi", "ac", "tv"], images: ["deluxe"], status: "available", description: "A quiet, light-filled room overlooking the inner garden, with oak floors and a writing desk." },
  { _id: "r204", number: "204", name: "Deluxe City View", type: "deluxe", pricePerNight: 190, capacity: 2, amenities: ["wifi", "ac", "tv", "minibar", "city-view"], images: ["deluxe"], status: "available", description: "Floor-to-ceiling windows frame the skyline. Walnut panelling, king bed and a curated minibar." },
  { _id: "r305", number: "305", name: "Family Loft", type: "family", pricePerNight: 240, capacity: 4, amenities: ["wifi", "ac", "tv", "kitchenette"], images: ["suite"], status: "available", description: "Two sleeping areas and a kitchenette — generous space for families on longer stays." },
  { _id: "r501", number: "501", name: "Linen Suite", type: "suite", pricePerNight: 360, capacity: 3, amenities: ["wifi", "ac", "tv", "minibar", "bathtub", "balcony"], images: ["suite"], status: "available", description: "Our signature suite: separate lounge, deep soaking tub and a private balcony above the trees." },
];

function load(): DB {
  const raw = localStorage.getItem(KEY);
  if (raw) return JSON.parse(raw);
  const db: DB = {
    users: [
      { _id: "u-admin", name: "Admin User", email: "admin@hotelpro.test", role: "admin", password: "Admin123!" },
      { _id: "u-staff", name: "Staff User", email: "staff@hotelpro.test", role: "staff", password: "Staff123!" },
      { _id: "u-guest", name: "Guest User", email: "guest@hotelpro.test", role: "guest", password: "Guest123!" },
    ],
    rooms: seedRooms, bookings: [], services: [], audit: [],
  };
  save(db);
  return db;
}
const save = (db: DB) => localStorage.setItem(KEY, JSON.stringify(db));
const id = () => Math.random().toString(16).slice(2, 12).toUpperCase();
const fail = (status: number, message: string) => { throw Object.assign(new Error(message), { status }); };
const strip = ({ password: _p, ...u }: User & { password: string }): User => u;
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 200));

function me(db: DB) {
  const t = localStorage.getItem("hotelpro_token");
  const u = db.users.find((x) => `demo.${x._id}` === t);
  if (!u) fail(401, "Authentication required");
  return u!;
}
const need = (u: User, ...roles: Role[]) => { if (!roles.includes(u.role)) fail(403, "Forbidden"); };
const log = (db: DB, actor: User, action: string) => db.audit.unshift({ _id: id(), action, createdAt: new Date().toISOString(), actor: strip(actor as never) });
const overlaps = (db: DB, roomId: string, ci: string, co: string) =>
  db.bookings.some((b) => b.room === roomId && ["pending", "confirmed", "checked_in"].includes(b.status) && b.checkIn < co && ci < b.checkOut);
const today = () => new Date().toISOString().slice(0, 10);
const populate = (db: DB, b: Booking) => ({ ...b, room: db.rooms.find((r) => r._id === b.room) ?? b.room, guest: strip(db.users.find((u) => u._id === b.guest) as never) ?? b.guest });

function validate(db: DB, b: { roomId: string; checkIn: string; checkOut: string; guests: number }) {
  if (b.checkIn < today()) fail(400, "Check-in cannot be in the past");
  const nights = nightsBetween(b.checkIn, b.checkOut);
  if (nights < 1) fail(400, "Check-out must be after check-in");
  if (nights > 30) fail(400, "Maximum stay is 30 nights");
  const room = db.rooms.find((r) => r._id === b.roomId);
  if (!room) fail(404, "Room not found");
  if (b.guests > room!.capacity) fail(400, `Room capacity is ${room!.capacity}`);
  return { room: room!, q: calcQuote(room!.pricePerNight, nights) };
}

export const api = {
  async register(b: { name: string; email: string; password: string; phone?: string | undefined }) {
    const db = load();
    if (b.password.length < 8) fail(400, "Password must be at least 8 characters");
    if (db.users.some((u) => u.email === b.email.toLowerCase())) fail(409, "Email already registered");
    const u = { _id: `u-${id()}`, name: b.name, email: b.email.toLowerCase(), phone: b.phone, role: "guest" as Role, password: b.password };
    db.users.push(u); save(db);
    return delay({ token: `demo.${u._id}`, user: strip(u) });
  },
  async login(b: { email: string; password: string }) {
    const u = load().users.find((x) => x.email === b.email.toLowerCase() && x.password === b.password);
    if (!u) fail(401, "Invalid email or password");
    return delay({ token: `demo.${u!._id}`, user: strip(u!) });
  },
  async me() { return strip(me(load())); },
  async updateMe(b: { name?: string | undefined; phone?: string | undefined }) { const db = load(); const u = me(db); Object.assign(u, b); save(db); return strip(u); },
  async rooms(f: RoomFilters) {
    const db = load();
    return delay(db.rooms.filter((r) =>
      (!f.type || r.type === f.type) && (!f.guests || r.capacity >= f.guests) &&
      (!f.minPrice || r.pricePerNight >= f.minPrice) && (!f.maxPrice || r.pricePerNight <= f.maxPrice) &&
      (!f.amenities || f.amenities.split(",").every((a) => r.amenities.includes(a))) &&
      (!(f.checkIn && f.checkOut && f.checkOut > f.checkIn) || !overlaps(db, r._id, f.checkIn, f.checkOut))));
  },
  async room(rid: string) { const r = load().rooms.find((x) => x._id === rid); if (!r) fail(404, "Room not found"); return delay(r!); },
  async availability(rid: string, ci: string, co: string) { return delay(!overlaps(load(), rid, ci, co)); },
  async quote(b: { roomId: string; checkIn: string; checkOut: string; guests: number }): Promise<Quote> { return delay(validate(load(), b).q); },
  async createBooking(b: { roomId: string; checkIn: string; checkOut: string; guests: number; paymentMethod: "demo_card" | "pay_at_hotel"; demoCardLast4?: string | undefined }) {
    const db = load(); const u = me(db); need(u, "guest");
    const { room, q } = validate(db, b);
    if (overlaps(db, room._id, b.checkIn, b.checkOut)) fail(409, "Room is no longer available for these dates");
    if (b.paymentMethod === "demo_card" && b.demoCardLast4 === "0002") fail(402, "Demo payment declined");
    const bk: Booking = { _id: id(), reference: `HP-${id()}`, guest: u._id, room: room._id, checkIn: b.checkIn, checkOut: b.checkOut, guests: b.guests, ...q,
      paymentMethod: b.paymentMethod, paymentStatus: b.paymentMethod === "demo_card" ? "paid" : "unpaid", status: "confirmed", createdAt: new Date().toISOString() };
    db.bookings.unshift(bk); log(db, u, "booking.create"); save(db);
    return delay(bk);
  },
  async myBookings() { const db = load(); const u = me(db); return delay(db.bookings.filter((b) => b.guest === u._id).map((b) => populate(db, b))); },
  async booking(ref: string) {
    const db = load(); const u = me(db); const b = db.bookings.find((x) => x.reference === ref);
    if (!b || (u.role === "guest" && b.guest !== u._id)) fail(404, "Booking not found");
    return delay(populate(db, b!));
  },
  async cancel(ref: string) {
    const db = load(); const u = me(db); const b = db.bookings.find((x) => x.reference === ref);
    if (!b || (u.role === "guest" && b.guest !== u._id)) fail(404, "Booking not found");
    const c = canCancel(b!); if (!c.ok) fail(400, c.reason!);
    b!.paymentStatus = paymentStatusAfterCancel(b!); b!.status = "cancelled";
    log(db, u, "booking.cancel"); save(db); return delay(populate(db, b!));
  },
  async allBookings(status?: string) { const db = load(); need(me(db), "staff", "admin"); return delay(db.bookings.filter((b) => !status || b.status === status).map((b) => populate(db, b))); },
  async checkIn(ref: string) {
    const db = load(); const u = me(db); need(u, "staff", "admin"); const b = db.bookings.find((x) => x.reference === ref)!;
    if (b.status !== "confirmed") fail(400, "Booking must be confirmed");
    b.status = "checked_in"; db.rooms.find((r) => r._id === b.room)!.status = "occupied"; log(db, u, "booking.check-in"); save(db); return populate(db, b);
  },
  async checkOut(ref: string, collected?: boolean) {
    const db = load(); const u = me(db); need(u, "staff", "admin"); const b = db.bookings.find((x) => x.reference === ref)!;
    if (b.status !== "checked_in") fail(400, "Booking must be checked in");
    if (b.paymentStatus !== "paid") { if (!collected) fail(400, "Payment must be collected before check-out"); b.paymentStatus = "paid"; }
    b.status = "checked_out"; db.rooms.find((r) => r._id === b.room)!.status = "cleaning"; log(db, u, "booking.check-out"); save(db); return populate(db, b);
  },
  async setRoomStatus(rid: string, status: Room["status"]) { const db = load(); const u = me(db); need(u, "staff", "admin"); const r = db.rooms.find((x) => x._id === rid)!; r.status = status; log(db, u, "room.status"); save(db); return r; },
  async createRoom(b: Omit<Room, "_id" | "status">) { const db = load(); const u = me(db); need(u, "admin"); const r: Room = { ...b, _id: `r-${id()}`, status: "available" }; db.rooms.push(r); log(db, u, "room.create"); save(db); return r; },
  async updateRoom(rid: string, b: Partial<Room>) { const db = load(); const u = me(db); need(u, "admin"); const r = db.rooms.find((x) => x._id === rid)!; Object.assign(r, b); log(db, u, "room.update"); save(db); return r; },
  async services() { const db = load(); me(db); return delay(db.services); },
  async setServiceStatus(sid: string, status: ServiceRequest["status"]) { const db = load(); need(me(db), "staff", "admin"); const s = db.services.find((x) => x._id === sid)!; s.status = status; save(db); return s; },
  async users() { const db = load(); need(me(db), "admin"); return delay(db.users.map(strip)); },
  async setRole(uid: string, role: Role) {
    const db = load(); const u = me(db); need(u, "admin"); if (uid === u._id) fail(400, "You cannot change your own role");
    const t = db.users.find((x) => x._id === uid)!; t.role = role; log(db, u, "user.role"); save(db); return strip(t);
  },
  async summary() {
    const db = load(); need(me(db), "admin");
    const paid = db.bookings.filter((b) => b.paymentStatus === "paid");
    const occupied = db.rooms.filter((r) => r.status === "occupied").length;
    const byStatus = Object.entries(db.bookings.reduce<Record<string, number>>((a, b) => ((a[b.status] = (a[b.status] ?? 0) + 1), a), {})).map(([_id, count]) => ({ _id, count }));
    const monthly = Object.entries(paid.reduce<Record<string, number>>((a, b) => ((a[b.checkIn.slice(0, 7)] = (a[b.checkIn.slice(0, 7)] ?? 0) + b.total), a), {})).sort().map(([_id, revenue]) => ({ _id, revenue }));
    return delay({ rooms: db.rooms.length, occupied, occupancyRate: db.rooms.length ? occupied / db.rooms.length : 0, revenue: paid.reduce((s, b) => s + b.total, 0), byStatus, monthly });
  },
  async audit() { const db = load(); need(me(db), "admin"); return delay(db.audit.slice(0, 200)); },
};
