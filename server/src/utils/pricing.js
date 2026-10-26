const TAX_RATE = 0.12;
const DAY = 86400000;
function toUTCDate(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function nightsBetween(checkIn, checkOut) { return Math.round((checkOut - checkIn) / DAY); }
function eachNight(checkIn, nights) { return Array.from({ length: nights }, (_, i) => new Date(checkIn.getTime() + i * DAY)); }
function quote(pricePerNight, nights) {
  const subtotal = Math.round(pricePerNight * nights * 100) / 100;
  const taxes = Math.round(subtotal * TAX_RATE * 100) / 100;
  return { nightlyRate: pricePerNight, nights, subtotal, taxes, total: Math.round((subtotal + taxes) * 100) / 100 };
}
module.exports = { TAX_RATE, DAY, toUTCDate, nightsBetween, eachNight, quote };
