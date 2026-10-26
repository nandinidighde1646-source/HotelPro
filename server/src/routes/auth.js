const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");

const sign = (u) => jwt.sign({ sub: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });

// Public registration ALWAYS creates a guest; any "role" in the body is stripped by the schema.
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8).max(128),
});
router.post("/register", validate(registerSchema), async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (await User.exists({ email })) return res.status(409).json({ message: "Email already registered" });
  const user = await User.create({ name, email, phone, role: "guest", passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: sign(user), user });
});

router.post("/login", validate(z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) })), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+passwordHash");
  if (!user || !user.active || !(await bcrypt.compare(req.body.password, user.passwordHash)))
    return res.status(401).json({ message: "Invalid email or password" });
  res.json({ token: sign(user), user });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
router.patch("/me", requireAuth, validate(z.object({ name: z.string().trim().min(2).max(100).optional(), phone: z.string().trim().max(30).optional() })), async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ user: req.user });
});
module.exports = router;
