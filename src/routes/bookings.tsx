import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errMsg, type Room } from "@/lib/api";
import { canCancel, paymentStatusAfterCancel } from "@/lib/rules";
import { Loading, RequireRole, State, StatusBadge, fmtDate, money } from "@/components/hotel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [
    { title: "My bookings — HotelPro" }, { name: "description", content: "View, track payment status and cancel your HotelPro reservations." },
    { property: "og:title", content: "My bookings — HotelPro" }, { property: "og:description", content: "View, track payment status and cancel your HotelPro reservations." },
  ] }),
  component: () => <RequireRole roles={["guest"]}><Bookings /></RequireRole>,
});

function Bookings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["myBookings"], queryFn: api.myBookings });
  const cancel = useMutation({
    mutationFn: api.cancel,
    onSuccess: (b) => { toast.success(`Cancelled · payment ${b.paymentStatus}`); qc.invalidateQueries({ queryKey: ["myBookings"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-5xl">My bookings</h1>
      {q.isLoading ? <Loading /> : q.isError ? <State icon="error" title="Couldn't load bookings" /> : q.data!.length === 0 ?
        <State icon="empty" title="No bookings yet" action={<Button asChild><Link to="/rooms">Find a room</Link></Button>} /> : (
        <ul className="mt-8 space-y-4">{q.data!.map((b) => {
          const c = canCancel(b);
          const refund = paymentStatusAfterCancel(b) === "refunded";
          return (
            <li key={b._id} className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{b.reference}</p>
                <p className="font-display text-2xl">{(b.room as Room).name ?? "Room"}</p>
                <p className="text-sm text-muted-foreground">{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)} · {money(b.total)}</p>
                <div className="mt-2 flex gap-2"><StatusBadge s={b.status} /><StatusBadge s={b.paymentStatus} /></div>
              </div>
              {c.ok && (
                <div className="text-right">
                  <Button variant="outline" disabled={cancel.isPending} onClick={() => { if (confirm(refund || b.paymentStatus !== "paid" ? "Cancel this booking?" : "Less than 48h before check-in: this payment is non-refundable. Cancel anyway?")) cancel.mutate(b.reference); }}>Cancel</Button>
                  <p className="mt-1 text-xs text-muted-foreground">{b.paymentStatus === "paid" ? (refund ? "Full refund" : "Non-refundable now") : "No charge"}</p>
                </div>
              )}
            </li>
          );
        })}</ul>
      )}
    </div>
  );
}
