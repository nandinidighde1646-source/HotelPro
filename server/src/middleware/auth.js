const jwt = require("jsonwebtoken");
const User = require("../models/User");
async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ message: "Invalid session" });
    req.user = user;
    next();
  } catch { return res.status(401).json({ message: "Invalid or expired token" }); }
}
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ message: "Forbidden" });
module.exports = { requireAuth, requireRole };
