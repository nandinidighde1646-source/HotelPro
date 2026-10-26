const { Schema, model } = require("mongoose");
const roomSchema = new Schema(
  {
    number: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["standard", "deluxe", "suite", "family"], required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: "RoomCategory" },
    description: { type: String, maxlength: 2000 },
    pricePerNight: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1, max: 10 },
    amenities: [{ type: String, trim: true }],
    images: [String],
    status: { type: String, enum: ["available", "occupied", "cleaning", "maintenance"], default: "available" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
roomSchema.index({ pricePerNight: 1, capacity: 1 });
module.exports = model("Room", roomSchema);
