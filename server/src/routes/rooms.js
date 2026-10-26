const router = require("express").Router();
const { z } = require("zod");
const Room = require("../models/Room");
const RoomNight = require("../models/RoomNight");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { toUTCDate } = require("../utils/pricing");
const audit = require("../utils/audit");

router.get("/", async (req, res) => {
  const { type, minPrice, maxPrice, guests, amenities, checkIn, checkOut } = req.query;
  const q = { active: true };
  if (type) q.type = type;
  if (guests) q.capacity = { $gte: Number(guests) };
  if (minPrice || maxPrice) q.pricePerNight = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
  if (amenities) q.amenities = { $all: String(amenities).split(",") };
  let rooms = await Room.find(q).sort({ pricePerNight: 1 });
  const ci = checkIn && toUTCDate(checkIn), co = checkOut && toUTCDate(checkOut);
  if (ci && co && co > ci) {
    const busy = await RoomNight.distinct("room", { date: { $gte: ci, $lt: co } });
    const set = new Set(busy.map(String));
    rooms = rooms.filter((r) => !set.has(String(r._id)));
  }
  res.json({ rooms });
});

router.get("/:id", async (req, res) => {
  const room = await Room.findById(req.params.id).catch(() => null);
  if (!room || !room.active) return res.status(404).json({ message: "Room not found" });
  res.json({ room });
});

router.get("/:id/availability", async (req, res) => {
  const ci = toUTCDate(req.query.checkIn), co = toUTCDate(req.query.checkOut);
  if (!ci || !co || co <= ci) return res.status(400).json({ message: "Invalid dates" });
  const clash = await RoomNight.exists({ room: req.params.id, date: { $gte: ci, $lt: co } });
  res.json({ available: !clash });
});

const roomSchema = z.object({
  number: z.string().min(1), name: z.string().min(2), type: z.enum(["standard", "deluxe", "suite", "family"]),
  description: z.string().max(2000).optional(), pricePerNight: z.number().nonnegative(), capacity: z.number().int().min(1).max(10),
  amenities: z.array(z.string()).default([]), images: z.array(z.string().url()).default([]),
});
router.post("/", requireAuth, requireRole("admin"), validate(roomSchema), async (req, res) => {
  const room = await Room.create(req.body);
  audit(req.user._id, "room.create", "Room", room._id);
  res.status(201).json({ room });
});
router.patch("/:id", requireAuth, requireRole("admin"), validate(roomSchema.partial().extend({ active: z.boolean().optional() })), async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!room) return res.status(404).json({ message: "Room not found" });
  audit(req.user._id, "room.update", "Room", room._id, req.body);
  res.json({ room });
});
router.patch("/:id/status", requireAuth, requireRole("staff", "admin"), validate(z.object({ status: z.enum(["available", "occupied", "cleaning", "maintenance"]) })), async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!room) return res.status(404).json({ message: "Room not found" });
  audit(req.user._id, "room.status", "Room", room._id, req.body);
  res.json({ room });
});
module.exports = router;
