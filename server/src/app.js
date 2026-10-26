// Express 5 forwards rejected async handlers to the error middleware automatically.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

function createApp() {
  const app = express();
  const origins = (process.env.CLIENT_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  app.use(helmet());
  app.use(cors({ origin: (o, cb) => cb(null, !o || origins.includes(o)), credentials: false }));
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/rooms", require("./routes/rooms"));
  app.use("/api/bookings", require("./routes/bookings"));
  app.use("/api/services", require("./routes/services"));
  app.use("/api/admin", require("./routes/admin"));
  app.use((_req, res) => res.status(404).json({ message: "Not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    if (err.code === 11000) return res.status(409).json({ message: "Duplicate value" });
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });
  return app;
}
module.exports = { createApp };
