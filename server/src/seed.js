require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("./models/User");
const Room = require("./models/Room");
const RoomCategory = require("./models/RoomCategory");

const rooms = [
  { number: "101", name: "Garden Standard", type: "standard", pricePerNight: 120, capacity: 2, amenities: ["wifi", "ac", "tv"], description: "Quiet room overlooking the garden." },
  { number: "204", name: "Deluxe City View", type: "deluxe", pricePerNight: 190, capacity: 2, amenities: ["wifi", "ac", "tv", "minibar", "city-view"], description: "Floor-to-ceiling windows over the skyline." },
  { number: "305", name: "Family Loft", type: "family", pricePerNight: 240, capacity: 4, amenities: ["wifi", "ac", "tv", "kitchenette"], description: "Two sleeping areas and a kitchenette." },
  { number: "501", name: "Linen Suite", type: "suite", pricePerNight: 360, capacity: 3, amenities: ["wifi", "ac", "tv", "minibar", "bathtub", "balcony"], description: "Separate lounge, deep tub and private balcony." },
];
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.deleteMany({}), Room.deleteMany({}), RoomCategory.deleteMany({})]);
  const hash = (p) => bcrypt.hash(p, 12);
  await User.create([
    { name: "Admin User", email: "admin@hotelpro.test", role: "admin", passwordHash: await hash("Admin123!") },
    { name: "Staff User", email: "staff@hotelpro.test", role: "staff", passwordHash: await hash("Staff123!") },
    { name: "Guest User", email: "guest@hotelpro.test", role: "guest", passwordHash: await hash("Guest123!") },
  ]);
  await RoomCategory.create([{ name: "Standard" }, { name: "Deluxe" }, { name: "Suite" }, { name: "Family" }]);
  await Room.create(rooms);
  console.log("Seeded users and rooms");
  await mongoose.disconnect();
})();
