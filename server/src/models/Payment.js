const { Schema, model } = require("mongoose");
// Never stores card numbers or CVV. Demo payments are simulated.
const s = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["demo_card", "pay_at_hotel"], required: true },
    status: { type: String, enum: ["pending", "succeeded", "failed", "refunded"], required: true },
    transactionRef: { type: String, required: true, unique: true },
    simulated: { type: Boolean, default: true },
    cardLast4: { type: String, match: /^\d{4}$/ },
  },
  { timestamps: true }
);
module.exports = model("Payment", s);
