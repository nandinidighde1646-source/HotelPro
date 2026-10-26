const { app, start, stop, reset, makeUser, makeRoom, day, request } = require("./setup");
const Booking = require("../src/models/Booking");
beforeAll(start); afterAll(stop); afterEach(reset);
const book = (t, body) => request(app).post("/api/bookings").set("Authorization", `Bearer ${t}`).send(body);

test("server calculates price and ignores client totals", async () => {
  const t = await makeUser("guest"); const room = await makeRoom({ pricePerNight: 100 });
  const r = await book(t, { roomId: room.id, checkIn: day(5), checkOut: day(7), guests: 2, paymentMethod: "pay_at_hotel", total: 1 });
  expect(r.status).toBe(201);
  expect(r.body.booking.subtotal).toBe(200);
  expect(r.body.booking.total).toBe(224);
  expect(r.body.booking.reference).toMatch(/^HP-[0-9A-F]{10}$/);
});
test("rejects over-capacity and invalid dates", async () => {
  const t = await makeUser("guest"); const room = await makeRoom({ capacity: 2 });
  expect((await book(t, { roomId: room.id, checkIn: day(5), checkOut: day(6), guests: 3, paymentMethod: "pay_at_hotel" })).status).toBe(400);
  expect((await book(t, { roomId: room.id, checkIn: day(6), checkOut: day(5), guests: 1, paymentMethod: "pay_at_hotel" })).status).toBe(400);
  expect((await book(t, { roomId: room.id, checkIn: day(-2), checkOut: day(1), guests: 1, paymentMethod: "pay_at_hotel" })).status).toBe(400);
});
test("overlapping bookings are rejected, including concurrent ones", async () => {
  const a = await makeUser("guest"), b = await makeUser("guest"); const room = await makeRoom();
  const [r1, r2] = await Promise.all([
    book(a, { roomId: room.id, checkIn: day(10), checkOut: day(13), guests: 1, paymentMethod: "pay_at_hotel" }),
    book(b, { roomId: room.id, checkIn: day(12), checkOut: day(14), guests: 1, paymentMethod: "pay_at_hotel" }),
  ]);
  expect([r1.status, r2.status].sort()).toEqual([201, 409]);
  expect(await Booking.countDocuments()).toBe(1);
});
test("back-to-back bookings are allowed", async () => {
  const t = await makeUser("guest"); const room = await makeRoom();
  expect((await book(t, { roomId: room.id, checkIn: day(10), checkOut: day(12), guests: 1, paymentMethod: "pay_at_hotel" })).status).toBe(201);
  expect((await book(t, { roomId: room.id, checkIn: day(12), checkOut: day(14), guests: 1, paymentMethod: "pay_at_hotel" })).status).toBe(201);
});
test("demo card payment marks booking paid; declined card creates nothing", async () => {
  const t = await makeUser("guest"); const room = await makeRoom();
  const ok = await book(t, { roomId: room.id, checkIn: day(3), checkOut: day(4), guests: 1, paymentMethod: "demo_card", demoCardLast4: "4242" });
  expect(ok.body.booking.paymentStatus).toBe("paid");
  const bad = await book(t, { roomId: room.id, checkIn: day(8), checkOut: day(9), guests: 1, paymentMethod: "demo_card", demoCardLast4: "0002" });
  expect(bad.status).toBe(402);
  expect(await Booking.countDocuments()).toBe(1);
});
test("cancellation >=48h before check-in refunds paid booking and frees dates", async () => {
  const t = await makeUser("guest"); const room = await makeRoom();
  const r = await book(t, { roomId: room.id, checkIn: day(10), checkOut: day(11), guests: 1, paymentMethod: "demo_card", demoCardLast4: "4242" });
  const c = await request(app).post(`/api/bookings/${r.body.booking.reference}/cancel`).set("Authorization", `Bearer ${t}`);
  expect(c.body.booking.status).toBe("cancelled");
  expect(c.body.booking.paymentStatus).toBe("refunded");
  expect((await book(t, { roomId: room.id, checkIn: day(10), checkOut: day(11), guests: 1, paymentMethod: "pay_at_hotel" })).status).toBe(201);
});
test("late cancellation of paid booking is non-refundable", async () => {
  const t = await makeUser("guest"); const room = await makeRoom();
  const r = await book(t, { roomId: room.id, checkIn: day(1), checkOut: day(2), guests: 1, paymentMethod: "demo_card", demoCardLast4: "4242" });
  const c = await request(app).post(`/api/bookings/${r.body.booking.reference}/cancel`).set("Authorization", `Bearer ${t}`);
  expect(c.body.booking.paymentStatus).toBe("paid");
});
test("guest cannot view or cancel another guest's booking", async () => {
  const a = await makeUser("guest"), b = await makeUser("guest"); const room = await makeRoom();
  const r = await book(a, { roomId: room.id, checkIn: day(10), checkOut: day(11), guests: 1, paymentMethod: "pay_at_hotel" });
  const ref = r.body.booking.reference;
  expect((await request(app).get(`/api/bookings/${ref}`).set("Authorization", `Bearer ${b}`)).status).toBe(404);
  expect((await request(app).post(`/api/bookings/${ref}/cancel`).set("Authorization", `Bearer ${b}`)).status).toBe(404);
});
test("pay-at-hotel check-out requires payment collection", async () => {
  const g = await makeUser("guest"), s = await makeUser("staff"); const room = await makeRoom();
  const ref = (await book(g, { roomId: room.id, checkIn: day(0), checkOut: day(1), guests: 1, paymentMethod: "pay_at_hotel" })).body.booking.reference;
  expect((await request(app).post(`/api/bookings/${ref}/check-in`).set("Authorization", `Bearer ${s}`)).status).toBe(200);
  expect((await request(app).post(`/api/bookings/${ref}/check-out`).set("Authorization", `Bearer ${s}`).send({})).status).toBe(400);
  const out = await request(app).post(`/api/bookings/${ref}/check-out`).set("Authorization", `Bearer ${s}`).send({ collected: true });
  expect(out.body.booking.paymentStatus).toBe("paid");
  expect(out.body.booking.status).toBe("checked_out");
});
