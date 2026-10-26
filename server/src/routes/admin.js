const router = require("express").Router();
const { z } = require("zod");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const AuditLog = require("../models/AuditLog");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const audit = require("../utils/audit");

router.use(requireAuth, requireRole("admin"));
router.get("/users", async (req, res) => res.json({ users: await User.find(req.query.role ? { role: req.query.role } : {}).sort({ createdAt: -1 }) }));
router.patch("/users/:id/role", validate(z.object({ role: z.enum(["guest", "staff", "admin"]) })), async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: "You cannot change your own role" });
  const u = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!u) return res.status(404).json({ message: "User not found" });
  audit(req.user._id, "user.role", "User", u._id, req.body);
  res.json({ user: u });
});
router.get("/reports/summary", async (_req, res) => {
  const [rooms, occupied, byStatus, revenue, monthly] = await Promise.all([
    Room.countDocuments({ active: true }),
    Room.countDocuments({ status: "occupied" }),
    Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Booking.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$checkIn" } }, revenue: { $sum: "$total" } } }, { $sort: { _id: 1 } }]),
  ]);
  res.json({ rooms, occupied, occupancyRate: rooms ? occupied / rooms : 0, byStatus, revenue: revenue[0]?.total || 0, monthly });
});
router.get("/audit", async (_req, res) => res.json({ logs: await AuditLog.find().populate("actor", "name email role").sort({ createdAt: -1 }).limit(200) }));
module.exports = router;
