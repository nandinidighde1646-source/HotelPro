const router = require("express").Router();
const { z } = require("zod");
const ServiceRequest = require("../models/ServiceRequest");
const Booking = require("../models/Booking");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.post("/", requireAuth, requireRole("guest"), validate(z.object({ bookingRef: z.string(), type: z.enum(["housekeeping", "maintenance", "room_service", "other"]), details: z.string().max(1000).optional() })), async (req, res) => {
  const b = await Booking.findOne({ reference: req.body.bookingRef, guest: req.user._id, status: "checked_in" });
  if (!b) return res.status(400).json({ message: "You must be checked in to request service" });
  const sr = await ServiceRequest.create({ booking: b._id, guest: req.user._id, room: b.room, type: req.body.type, details: req.body.details });
  res.status(201).json({ request: sr });
});
router.get("/", requireAuth, async (req, res) => {
  const q = req.user.role === "guest" ? { guest: req.user._id } : {};
  res.json({ requests: await ServiceRequest.find(q).populate("room", "number name").sort({ createdAt: -1 }) });
});
router.patch("/:id", requireAuth, requireRole("staff", "admin"), validate(z.object({ status: z.enum(["open", "in_progress", "done"]) })), async (req, res) => {
  const sr = await ServiceRequest.findByIdAndUpdate(req.params.id, { status: req.body.status, assignedTo: req.user._id }, { new: true });
  if (!sr) return res.status(404).json({ message: "Not found" });
  res.json({ request: sr });
});
module.exports = router;
