const { Schema, model } = require("mongoose");
const s = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    guest: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    type: { type: String, enum: ["housekeeping", "maintenance", "room_service", "other"], required: true },
    details: { type: String, maxlength: 1000 },
    status: { type: String, enum: ["open", "in_progress", "done"], default: "open", index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
module.exports = model("ServiceRequest", s);
