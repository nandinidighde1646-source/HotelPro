// Mirrors server/src/utils/{pricing,rules}.js for display and demo mode only.
// The Express server is the source of truth for prices and cancellation rules.
export const TAX_RATE = 0.12;
export const FREE_CANCEL_HOURS = 48;
const DAY = 86400000;
const utc = (s: string) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);

export const nightsBetween = (ci: string, co: string) => Math.round((utc(co) - utc(ci)) / DAY);
export function quote(pricePerNight: number, nights: number) {
  const subtotal = Math.round(pricePerNight * nights * 100) / 100;
  const taxes = Math.round(subtotal * TAX_RATE * 100) / 100;
  return { nightlyRate: pricePerNight, nights, subtotal, taxes, total: Math.round((subtotal + taxes) * 100) / 100 };
}
type B = { status: string; checkIn: string; paymentStatus: string };
export function canCancel(b: B, now = Date.now()) {
  if (!["pending", "confirmed"].includes(b.status)) return { ok: false, reason: "Only pending or confirmed bookings can be cancelled" };
  if (utc(b.checkIn) <= now) return { ok: false, reason: "Check-in date has passed" };
  return { ok: true as const };
}
export function paymentStatusAfterCancel(b: B, now = Date.now()) {
  if (b.paymentStatus !== "paid") return b.paymentStatus as "unpaid";
  return (utc(b.checkIn) - now) / 3600000 >= FREE_CANCEL_HOURS ? "refunded" : "paid";
}
