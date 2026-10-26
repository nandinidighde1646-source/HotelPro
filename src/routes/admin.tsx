import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, errMsg, type Role, type Room } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Loading, RequireRole, State, StatusBadge, money } from "@/components/hotel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reservations } from "./staff";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin — HotelPro" }, { name: "description", content: "Metrics, rooms, pricing, reservations, users and audit activity." },
    { property: "og:title", content: "Admin — HotelPro" }, { property: "og:description", content: "Metrics, rooms, pricing, reservations, users and audit activity." },
  ] }),
  component: () => <RequireRole roles={["admin"]}><Admin /></RequireRole>,
});

function Admin() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <p className="eyebrow">Administration</p><h1 className="mt-1 text-5xl">Dashboard</h1>
      <Overview />
      <Tabs defaultValue="rooms" className="mt-10">
        <TabsList className="flex-wrap"><TabsTrigger value="rooms">Rooms & pricing</TabsTrigger><TabsTrigger value="res">Reservations</TabsTrigger><TabsTrigger value="users">Users & roles</TabsTrigger><TabsTrigger value="audit">Audit log</TabsTrigger></TabsList>
        <TabsContent value="rooms"><RoomsAdmin /></TabsContent>
        <TabsContent value="res"><Reservations admin /></TabsContent>
        <TabsContent value="users"><Users /></TabsContent>
        <TabsContent value="audit"><Audit /></TabsContent>
      </Tabs>
    </div>
  );
}

function Overview() {
  const q = useQuery({ queryKey: ["summary"], queryFn: api.summary });
  if (q.isLoading) return <Loading />;
  if (q.isError) return <State icon="error" title="Couldn't load reports" />;
  const s = q.data!;
  const max = Math.max(1, ...s.monthly.map((m) => m.revenue));
  const total = s.byStatus.reduce((a, b) => a + b.count, 0);
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-4">
      {[["Revenue (paid)", money(s.revenue)], ["Rooms", String(s.rooms)], ["Occupied now", String(s.occupied)], ["Occupancy", `${Math.round(s.occupancyRate * 100)}%`]].map(([k, v]) => (
        <div key={k} className="rounded-xl border bg-card p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p><p className="mt-1 font-display text-4xl text-primary">{v}</p></div>
      ))}
      <div className="rounded-xl border bg-card p-5 lg:col-span-3">
        <p className="text-sm font-semibold">Revenue by month</p>
        {s.monthly.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No paid bookings yet.</p> : (
          <div className="mt-4 flex h-40 items-end gap-3">{s.monthly.map((m) => (
            <div key={m._id} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-chart-1" style={{ height: `${(m.revenue / max) * 100}%` }} title={money(m.revenue)} /><span className="text-xs text-muted-foreground">{m._id}</span></div>
          ))}</div>
        )}
      </div>
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-semibold">Bookings by status</p>
        <ul className="mt-4 space-y-2">{s.byStatus.length === 0 ? <li className="text-sm text-muted-foreground">None yet</li> : s.byStatus.map((b) => (
          <li key={b._id}><div className="flex justify-between text-xs"><span className="capitalize">{b._id.replace("_", " ")}</span><span>{b.count}</span></div><div className="mt-1 h-1.5 rounded bg-muted"><div className="h-full rounded bg-brass" style={{ width: `${(b.count / total) * 100}%` }} /></div></li>
        ))}</ul>
      </div>
    </div>
  );
}

const empty = { number: "", name: "", type: "standard" as Room["type"], pricePerNight: 150, capacity: 2, amenities: "wifi,ac,tv", description: "" };
function RoomsAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["rooms", "all"], queryFn: () => api.rooms({}) });
  const [f, setF] = useState(empty);
  const create = useMutation({
    mutationFn: () => api.createRoom({ ...f, amenities: f.amenities.split(",").map((a) => a.trim()).filter(Boolean), images: [] }),
    onSuccess: () => { toast.success("Room added"); setF(empty); qc.invalidateQueries({ queryKey: ["rooms"] }); }, onError: (e) => toast.error(errMsg(e)),
  });
  const price = useMutation({ mutationFn: ({ id, p }: { id: string; p: number }) => api.updateRoom(id, { pricePerNight: p }), onSuccess: () => { toast.success("Price updated"); qc.invalidateQueries({ queryKey: ["rooms"] }); } });
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="overflow-x-auto rounded-xl border bg-card">
        {q.isLoading ? <Loading /> : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">#</th><th>Name</th><th>Type</th><th>Cap.</th><th>Status</th><th>Price / night</th></tr></thead>
            <tbody>{q.data?.map((r) => (
              <tr key={r._id} className="border-t"><td className="p-3">{r.number}</td><td>{r.name}</td><td className="capitalize">{r.type}</td><td>{r.capacity}</td><td><StatusBadge s={r.status} /></td>
                <td className="p-2"><input type="number" min={0} defaultValue={r.pricePerNight} className="field w-28" onBlur={(e) => Number(e.target.value) !== r.pricePerNight && price.mutate({ id: r._id, p: Number(e.target.value) })} /></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <form className="space-y-3 rounded-xl border bg-card p-5" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <p className="font-semibold">Add room</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" placeholder="Number" required value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} />
          <select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Room["type"] })}>{["standard", "deluxe", "suite", "family"].map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <input className="field" placeholder="Name" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">Price<input type="number" min={0} className="field mt-1" value={f.pricePerNight} onChange={(e) => setF({ ...f, pricePerNight: Number(e.target.value) })} /></label>
          <label className="text-xs">Capacity<input type="number" min={1} max={10} className="field mt-1" value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} /></label>
        </div>
        <input className="field" placeholder="Amenities, comma separated" value={f.amenities} onChange={(e) => setF({ ...f, amenities: e.target.value })} />
        <textarea className="field" rows={3} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Button className="w-full" disabled={create.isPending}>Add room</Button>
      </form>
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["users"], queryFn: api.users });
  const m = useMutation({ mutationFn: ({ id, r }: { id: string; r: Role }) => api.setRole(id, r), onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["users"] }); }, onError: (e) => toast.error(errMsg(e)) });
  if (q.isLoading) return <Loading />;
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm">
      <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Name</th><th>Email</th><th>Role</th></tr></thead>
      <tbody>{q.data?.map((u) => (
        <tr key={u._id} className="border-t"><td className="p-3">{u.name}</td><td>{u.email}</td>
          <td className="p-2"><select className="field w-32" value={u.role} disabled={u._id === user?._id} onChange={(e) => m.mutate({ id: u._id, r: e.target.value as Role })}>{["guest", "staff", "admin"].map((r) => <option key={r}>{r}</option>)}</select></td></tr>
      ))}</tbody>
    </table></div>
  );
}

function Audit() {
  const q = useQuery({ queryKey: ["audit"], queryFn: api.audit });
  if (q.isLoading) return <Loading />;
  if (!q.data?.length) return <State icon="empty" title="No activity yet" />;
  return <ul className="mt-4 divide-y rounded-xl border bg-card">{q.data.map((l) => (
    <li key={l._id} className="flex justify-between p-3 text-sm"><span><span className="font-mono">{l.action}</span> · {l.actor?.name ?? "system"}</span><span className="text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span></li>
  ))}</ul>;
}
