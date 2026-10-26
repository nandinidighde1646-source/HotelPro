import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, errMsg, type Booking, type Room, type User } from "@/lib/api";
import { Loading, RequireRole, State, StatusBadge, fmtDate, money } from "@/components/hotel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [
    { title: "Front desk — HotelPro" }, { name: "description", content: "Check guests in and out, update room status and handle service requests." },
    { property: "og:title", content: "Front desk — HotelPro" }, { property: "og:description", content: "Check guests in and out, update room status and handle service requests." },
  ] }),
  component: () => <RequireRole roles={["staff", "admin"]}><Staff /></RequireRole>,
});

function Staff() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <p className="eyebrow">Staff</p><h1 className="mt-1 text-5xl">Front desk</h1>
      <Tabs defaultValue="arrivals" className="mt-8">
        <TabsList><TabsTrigger value="arrivals">Reservations</TabsTrigger><TabsTrigger value="rooms">Room status</TabsTrigger><TabsTrigger value="services">Service requests</TabsTrigger></TabsList>
        <TabsContent value="arrivals"><Reservations /></TabsContent>
        <TabsContent value="rooms"><RoomStatus /></TabsContent>
        <TabsContent value="services"><Services /></TabsContent>
      </Tabs>
    </div>
  );
}

export function Reservations({ admin }: { admin?: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const q = useQuery({ queryKey: ["allBookings", status], queryFn: () => api.allBookings(status || undefined) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["allBookings"] }); qc.invalidateQueries({ queryKey: ["rooms"] }); };
  const act = useMutation({
    mutationFn: async ({ b, a }: { b: Booking; a: "in" | "out" | "cancel" }) => {
      if (a === "in") return api.checkIn(b.reference);
      if (a === "cancel") return api.cancel(b.reference);
      const needs = b.paymentStatus !== "paid";
      if (needs && !confirm(`Collect ${money(b.total)} at the desk before check-out?`)) throw new Error("Payment not collected");
      return api.checkOut(b.reference, needs);
    },
    onSuccess: (b) => { toast.success(`${b.reference}: ${b.status.replace("_", " ")}`); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <div className="mt-4">
      <select className="field max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>{["confirmed", "checked_in", "checked_out", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
      </select>
      {q.isLoading ? <Loading /> : q.isError ? <State icon="error" title="Couldn't load reservations" /> : q.data!.length === 0 ? <State icon="empty" title="No reservations" /> : (
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Ref</th><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th /></tr></thead>
            <tbody>{q.data!.map((b) => (
              <tr key={b._id} className="border-t">
                <td className="p-3 font-mono text-xs">{b.reference}</td>
                <td>{(b.guest as User)?.name}</td><td>{(b.room as Room)?.number}</td>
                <td>{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</td><td>{money(b.total)}</td>
                <td className="space-x-1"><StatusBadge s={b.status} /><StatusBadge s={b.paymentStatus} /></td>
                <td className="space-x-2 p-3 text-right whitespace-nowrap">
                  {b.status === "confirmed" && <Button size="sm" onClick={() => act.mutate({ b, a: "in" })}>Check in</Button>}
                  {b.status === "checked_in" && <Button size="sm" variant="secondary" onClick={() => act.mutate({ b, a: "out" })}>Check out</Button>}
                  {admin && b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => confirm("Cancel this reservation?") && act.mutate({ b, a: "cancel" })}>Cancel</Button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoomStatus() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["rooms", "all"], queryFn: () => api.rooms({}) });
  const m = useMutation({ mutationFn: ({ id, s }: { id: string; s: Room["status"] }) => api.setRoomStatus(id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }), onError: (e) => toast.error(errMsg(e)) });
  if (q.isLoading) return <Loading />;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{q.data?.map((r) => (
      <div key={r._id} className="rounded-xl border bg-card p-4">
        <div className="flex justify-between"><p className="font-display text-2xl">#{r.number}</p><StatusBadge s={r.status} /></div>
        <p className="text-sm text-muted-foreground">{r.name}</p>
        <select className="field mt-3" value={r.status} onChange={(e) => m.mutate({ id: r._id, s: e.target.value as Room["status"] })}>
          {["available", "occupied", "cleaning", "maintenance"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
    ))}</div>
  );
}

function Services() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["services"], queryFn: api.services });
  const m = useMutation({ mutationFn: ({ id, s }: { id: string; s: "open" | "in_progress" | "done" }) => api.setServiceStatus(id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }) });
  if (q.isLoading) return <Loading />;
  if (!q.data?.length) return <State icon="empty" title="No service requests" body="Checked-in guests' requests appear here (guest request form is server-ready; UI pending)." />;
  return <ul className="mt-4 space-y-3">{q.data.map((s) => (
    <li key={s._id} className="flex items-center justify-between rounded-xl border bg-card p-4">
      <div><p className="font-semibold capitalize">{s.type.replace("_", " ")}</p><p className="text-sm text-muted-foreground">{s.details}</p></div>
      <select className="field w-40" value={s.status} onChange={(e) => m.mutate({ id: s._id, s: e.target.value as "open" })}><option value="open">open</option><option value="in_progress">in progress</option><option value="done">done</option></select>
    </li>
  ))}</ul>;
}
