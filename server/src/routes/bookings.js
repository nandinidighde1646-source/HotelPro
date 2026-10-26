const router = require("express").Router();
const mongoose = require("mongoose");
const { z } = require("zod");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const RoomNight = require("../models/RoomNight");
const Payment = require("../models/Payment");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { toUTCDate, nightsBetween, eachNight, quote } = require("../utils/pricing");
const { canCancel, paymentStatusAfterCancel } = require("../utils/rules");
const { makeRef } = require("../utils/reference");
const audit = require("../utils/audit");

const MAX_NIGHTS = 30;

async function buildQuote({ roomId, checkIn, checkOut, guests }) {
  const ci = toUTCDate(checkIn), co = toUTCDate(checkOut);
  const today = toUTCDate(new Date());
  if (!ci || !co) return { error: [400, "Invalid dates"] };
  if (ci < today) return { error: [400, "Check-in cannot be in the past"] };
  const nights = nightsBetween(ci, co);
  if (nights < 1) return { error: [400, "Check-out must be after check-in"] };
  if (nights > MAX_NIGHTS) return { error: [400, `Maximum stay is ${MAX_NIGHTS} nights`] };
  const room = await Room.findById(roomId).catch(() => null);
  if (!room || !room.active) return { error: [404, "Room not found"] };
  if (guests > room.capacity) return { error: [400, `Room capacity is ${room.capacity}`] };
  return { room, ci, co, nights, price: quote(room.pricePerNight, nights) };
}

const quoteSchema = z.object({ roomId: z.string(), checkIn: z.string(), checkOut: z.string(), guests: z.number().int().min(1).max(10) });
router.post("/quote", validate(quoteSchema), async (req, res) => {
  const q = await buildQuote(req.body);
  if (q.error) return res.status(q.error[0]).json({ message: q.error[1] });
  res.json({ quote: q.price });
});

// Note: client-sent prices are ignored entirely; schema does not accept them.
const createSchema = quoteSchema.extend({
  paymentMethod: z.enum(["demo_card", "pay_at_hotel"]),
  demoCardLast4: z.string().regex(/^\d{4}$/).optional(),
  specialRequests: z.string().max(1000).optional(),
});
router.post("/", requireAuth, requireRole("guest"), validate(createSchema), async (req, res) => {
  const q = await buildQuote(req.body);
  if (q.error) return res.status(q.error[0]).json({ message: q.error[1] });
  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      [booking] = await Booking.create([{
        reference: makeRef("HP"), guest: req.user._id, room: q.room._id, checkIn: q.ci, checkOut: q.co,
        guests: req.body.guests, ...q.price, paymentMethod: req.body.paymentMethod,
        status: "pending", paymentStatus: "unpaid", specialRequests: req.body.specialRequests,
      }], { session });
      // Unique (room,date) index makes overlapping inserts fail atomically.
      await RoomNight.insertMany(eachNight(q.ci, q.nights).map((date) => ({ room: q.room._id, date, booking: booking._id })), { session });
      if (req.body.paymentMethod === "demo_card") {
        // SIMULATED payment: last4 "0002" simulates a decline.
        const failed = req.body.demoCardLast4 === "0002";
        await Payment.create([{ booking: booking._id, amount: booking.total, method: "demo_card", status: failed ? "failed" : "succeeded", transactionRef: makeRef("TXN"), cardLast4: req.body.demoCardLast4 }], { session });
        if (failed) throw Object.assign(new Error("Demo payment declined"), { status: 402 });
        booking.paymentStatus = "paid"; booking.status = "confirmed";
      } else {
        await Payment.create([{ booking: booking._id, amount: booking.total, method: "pay_at_hotel", status: "pending", transactionRef: makeRef("TXN") }], { session });
        booking.status = "confirmed";
      }
      await booking.save({ session });
    });
    audit(req.user._id, "booking.create", "Booking", booking._id);
    res.status(201).json({ booking });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Room is no longer available for these dates" });
    if (e.status) return res.status(e.status).json({ message: e.message });
    throw e;
  } finally { session.endSession(); }
});

router.get("/mine", requireAuth, async (req, res) => {
  const bookings = await Booking.find({ guest: req.user._id }).populate("room", "name number type images").sort({ createdAt: -1 });
  res.json({ bookings });
});

router.get("/", requireAuth, requireRole("staff", "admin"), async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  if (req.query.date) { const d = toUTCDate(req.query.date); if (d) { q.checkIn = { $lte: d }; q.checkOut = { $gte: d }; } }
  const bookings = await Booking.find(q).populate("room", "name number").populate("guest", "name email phone").sort({ checkIn: 1 }).limit(500);
  res.json({ bookings });
});

router.get("/:ref", requireAuth, async (req, res) => {
  const b = await Booking.findOne({ reference: req.params.ref }).populate("room");
  if (!b) return res.status(404).json({ message: "Booking not found" });
  if (req.user.role === "guest" && String(b.guest) !== String(req.user._id)) return res.status(404).json({ message: "Booking not found" });
  const payments = await Payment.find({ booking: b._id }).select("-__v");
  res.json({ booking: b, payments });
});

router.post("/:ref/cancel", requireAuth, async (req, res) => {
  const b = await Booking.findOne({ reference: req.params.ref });
  if (!b || (req.user.role === "guest" && String(b.guest) !== String(req.user._id))) return res.status(404).json({ message: "Booking not found" });
  const check = canCancel(b);
  if (!check.ok) return res.status(400).json({ message: check.reason });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const newPay = paymentStatusAfterCancel(b);
      if (newPay === "refunded") await Payment.updateMany({ booking: b._id, status: "succeeded" }, { status: "refunded" }, { session });
      b.status = "cancelled"; b.cancelledAt = new Date(); b.paymentStatus = newPay;
      await b.save({ session });
      await RoomNight.deleteMany({ booking: b._id }, { session });
    });
  } finally { session.endSession(); }
  audit(req.user._id, "booking.cancel", "Booking", b._id);
  res.json({ booking: b });
});

const transitions = { "check-in": ["confirmed", "checked_in", "occupied"], "check-out": ["checked_in", "checked_out", "cleaning"] };
for (const [action, [from, to, roomStatus]] of Object.entries(transitions)) {
  router.post(`/:ref/${action}`, requireAuth, requireRole("staff", "admin"), async (req, res) => {
    const b = await Booking.findOne({ reference: req.params.ref });
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (b.status !== from) return res.status(400).json({ message: `Booking must be ${from}` });
    if (action === "check-out" && b.paymentStatus !== "paid") {
      if (b.paymentMethod !== "pay_at_hotel" || !req.body?.collected) return res.status(400).json({ message: "Payment must be collected before check-out" });
      await Payment.updateMany({ booking: b._id, status: "pending" }, { status: "succeeded" });
      b.paymentStatus = "paid";
    }
    b.status = to; await b.save();
    await Room.findByIdAndUpdate(b.room, { status: roomStatus });
    if (action === "check-out") await RoomNight.deleteMany({ booking: b._id, date: { $gte: new Date() } });
    audit(req.user._id, `booking.${action}`, "Booking", b._id);
    res.json({ booking: b });
  });
}
module.exports = router;
