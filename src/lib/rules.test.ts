import { describe, expect, it } from "vitest";
import { canCancel, nightsBetween, paymentStatusAfterCancel, quote } from "./rules";

const NOW = Date.parse("2026-10-19T09:00:00Z");
describe("booking rules", () => {
  it("adds 12% tax", () => expect(quote(100, 2)).toMatchObject({ subtotal: 200, taxes: 24, total: 224 }));
  it("counts nights", () => expect(nightsBetween("2026-10-20", "2026-10-23")).toBe(3));
  it("refunds paid booking cancelled 48h+ before check-in", () =>
    expect(paymentStatusAfterCancel({ status: "confirmed", checkIn: "2026-10-25", paymentStatus: "paid" }, NOW)).toBe("refunded"));
  it("keeps late cancellations non-refundable", () =>
    expect(paymentStatusAfterCancel({ status: "confirmed", checkIn: "2026-10-20", paymentStatus: "paid" }, NOW)).toBe("paid"));
  it("cannot cancel a checked-in booking", () =>
    expect(canCancel({ status: "checked_in", checkIn: "2026-10-25", paymentStatus: "paid" }, NOW).ok).toBe(false));
});
