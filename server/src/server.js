require("dotenv").config();
const { createApp } = require("./app");
const { connectDB } = require("./config/db");
for (const k of ["MONGODB_URI", "JWT_SECRET"]) if (!process.env[k]) { console.error(`Missing env ${k}`); process.exit(1); }
connectDB(process.env.MONGODB_URI).then(() => {
  const port = process.env.PORT || 5000;
  createApp().listen(port, () => console.log(`HotelPro API on :${port}`));
});
