// Explicit cancellation and payment-status rules.
const { DAY } = require("./pricing");
const FREE_CANCEL_HOURS = 48;
function canCancel(booking, now = new Date()) {
  if (!["pending", "confirmed"].includes(booking.status)) return { ok: false, reason: "Only pending or confirmed bookings can be cancelled" };
  if (booking.checkIn.getTime() <= now.getTime()) return { ok: false, reason: "Check-in date has passed" };
  return { ok: true };
}
function paymentStatusAfterCancel(booking, now = new Date()) {
  if (booking.paymentStatus !== "paid") return booking.paymentStatus === "unpaid" ? "unpaid" : booking.paymentStatus;
  const hoursBefore = (booking.checkIn.getTime() - now.getTime()) / (DAY / 24);
  return hoursBefore >= FREE_CANCEL_HOURS ? "refunded" : "paid"; // late cancel: non-refundable
}
module.exports = { FREE_CANCEL_HOURS, canCancel, paymentStatusAfterCancel };
