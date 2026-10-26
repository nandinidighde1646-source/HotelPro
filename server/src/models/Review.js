const { Schema, model } = require("mongoose");
const s = new Schema(
  {
    guest: { type: Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);
module.exports = model("Review", s);
