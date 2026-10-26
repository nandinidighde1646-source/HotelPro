import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { Loading, RequireRole, State, fmtDate, money } from "@/components/hotel";
import { Button } from "@/components/ui/button";

type S = { checkIn: string; checkOut: string; guests: number };
export const Route = createFileRoute("/checkout/$id")({
  validateSearch: (s: { [K in keyof S]?: unknown }): S => ({ checkIn: String(s.checkIn ?? ""), checkOut: String(s.checkOut ?? ""), guests: Number(s.guests ?? 1) }),
  head: () => ({ meta: [
    { title: "Checkout — HotelPro" }, { name: "description", content: "Review your stay and choose how to pay." },
    { property: "og:title", content: "Checkout — HotelPro" }, { property: "og:description", content: "Review your stay and choose how to pay." },
  ] }),
  component: () => <RequireRole roles={["guest"]}><Checkout /></RequireRole>,
});

function Checkout() {
  const { id } = Route.useParams();
  const s = Route.useSearch();
  const nav = useNavigate();
  const [method, setMethod] = useState<"demo_card" | "pay_at_hotel">("demo_card");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [requests, setReq] = useState("");
  const room = useQuery({ queryKey: ["room", id], queryFn: () => api.room(id) });
  const quote = useQuery({ queryKey: ["quote", id, s], queryFn: () => api.quote({ roomId: id, ...s }), retry: false });
  const book = useMutation({
    mutationFn: () => {
      const digits = card.replace(/\D/g, "");
      if (method === "demo_card" && digits.length < 12) throw new Error("Enter a demo card number");
      // Only the last 4 digits ever leave the browser. No real charge is made.
      return api.createBooking({ roomId: id, ...s, paymentMethod: method, demoCardLast4: method === "demo_card" ? digits.slice(-4) : undefined, specialRequests: requests || undefined });
    },
    onSuccess: (b) => nav({ to: "/confirmation/$ref", params: { ref: b.reference } }),
    onError: (e) => toast.error(errMsg(e)),
  });

  if (room.isLoading || quote.isLoading) return <Loading />;
  if (room.isError || quote.isError) return <State icon="error" title="This stay can't be booked" body={errMsg(quote.error ?? room.error)} />;
  const q = quote.data!;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_340px]">
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); book.mutate(); }}>
        <h1 className="text-5xl">Checkout</h1>
        <fieldset className="space-y-3"><legend className="eyebrow mb-2">Payment</legend>
          {([["demo_card", "Demo card payment", "Simulated — no real charge. Use a card ending 0002 to simulate a decline."], ["pay_at_hotel", "Pay at hotel", "Pay at the front desk on arrival or departure."]] as const).map(([v, t, d]) => (
            <label key={v} className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${method === v ? "border-primary bg-card" : ""}`}>
              <input type="radio" name="m" checked={method === v} onChange={() => setMethod(v)} className="mt-1 accent-[var(--primary)]" />
              <span><span className="font-semibold">{t}</span><span className="block text-sm text-muted-foreground">{d}</span></span>
            </label>
          ))}
        </fieldset>
        {method === "demo_card" && (
          <div className="rounded-lg border border-dashed border-brass bg-accent/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">Simulated payment · do not enter a real card</p>
            <input className="field mt-3" inputMode="numeric" autoComplete="off" value={card} onChange={(e) => setCard(e.target.value)} aria-label="Demo card number" />
          </div>
        )}
        <label className="block text-sm">Special requests (optional)<textarea className="field mt-1" rows={3} maxLength={1000} value={requests} onChange={(e) => setReq(e.target.value)} /></label>
        <Button type="submit" variant="brass" size="lg" className="w-full" disabled={book.isPending}>{book.isPending ? "Confirming…" : `Confirm booking · ${money(q.total)}`}</Button>
      </form>
      <aside className="h-fit rounded-xl border bg-card p-6">
        <p className="eyebrow">Your stay</p>
        <h2 className="mt-1 text-2xl">{room.data!.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{fmtDate(s.checkIn)} → {fmtDate(s.checkOut)} · {s.guests} guest{s.guests > 1 ? "s" : ""}</p>
        <dl className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between"><dt>{q.nights} nights</dt><dd>{money(q.subtotal)}</dd></div>
          <div className="flex justify-between text-muted-foreground"><dt>Taxes</dt><dd>{money(q.taxes)}</dd></div>
          <div className="flex justify-between border-t pt-2 font-semibold"><dt>Total</dt><dd>{money(q.total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Final price is calculated by the server.</p>
      </aside>
    </div>
  );
}
