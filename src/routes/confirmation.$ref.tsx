import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { api, type Room } from "@/lib/api";
import { Loading, RequireRole, State, StatusBadge, fmtDate, money } from "@/components/hotel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/confirmation/$ref")({
  head: () => ({ meta: [
    { title: "Booking confirmed — HotelPro" }, { name: "description", content: "Your HotelPro booking confirmation." },
    { property: "og:title", content: "Booking confirmed — HotelPro" }, { property: "og:description", content: "Your HotelPro booking confirmation." },
  ] }),
  component: () => <RequireRole roles={["guest", "staff", "admin"]}><Confirmation /></RequireRole>,
});

function Confirmation() {
  const { ref } = Route.useParams();
  const q = useQuery({ queryKey: ["booking", ref], queryFn: () => api.booking(ref) });
  if (q.isLoading) return <Loading />;
  if (q.isError) return <State icon="error" title="Booking not found" />;
  const b = q.data!;
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
      <h1 className="mt-4 text-5xl">You're booked.</h1>
      <p className="mt-2 text-muted-foreground">Reference <span className="font-mono font-semibold text-foreground">{b.reference}</span></p>
      <div className="mt-8 rounded-xl border bg-card p-6 text-left text-sm">
        <p className="font-display text-2xl">{(b.room as Room).name}</p>
        <p className="mt-1 text-muted-foreground">{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)} · {b.nights} nights · {b.guests} guests</p>
        <div className="mt-4 flex flex-wrap gap-2"><StatusBadge s={b.status} /><StatusBadge s={b.paymentStatus} /></div>
        <p className="mt-4">Total <span className="font-semibold">{money(b.total)}</span> · {b.paymentMethod === "demo_card" ? "Demo card (simulated)" : "Pay at hotel"}</p>
      </div>
      <Button asChild className="mt-8"><Link to="/bookings">View my bookings</Link></Button>
    </div>
  );
}
