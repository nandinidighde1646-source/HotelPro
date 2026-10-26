// One document per (room, night) held by a pending/confirmed booking.
// The unique index is the concurrency control that prevents double bookings.
const { Schema, model } = require("mongoose");
const s = new Schema({
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
  date: { type: Date, required: true },
  booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
});
s.index({ room: 1, date: 1 }, { unique: true });
module.exports = model("RoomNight", s);
