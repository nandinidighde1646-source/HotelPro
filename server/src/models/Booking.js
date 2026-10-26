const { Schema, model } = require("mongoose");
const bookingSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    guest: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1 },
    nights: { type: Number, required: true, min: 1 },
    nightlyRate: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    taxes: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["demo_card", "pay_at_hotel"], required: true },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded", "refund_pending", "failed"], default: "unpaid" },
    status: { type: String, enum: ["pending", "confirmed", "checked_in", "checked_out", "cancelled"], default: "pending", index: true },
    cancelledAt: Date,
    specialRequests: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
module.exports = model("Booking", bookingSchema);
