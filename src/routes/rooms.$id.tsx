import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Loading, State, isoDay, money, roomImage } from "@/components/hotel";
import { Button } from "@/components/ui/button";

type S = { checkIn?: string | undefined; checkOut?: string | undefined; guests?: number | undefined };
export const Route = createFileRoute("/rooms/$id")({
  validateSearch: (s: { [K in keyof S]?: unknown }): S => ({ checkIn: s.checkIn ? String(s.checkIn) : undefined, checkOut: s.checkOut ? String(s.checkOut) : undefined, guests: s.guests ? Number(s.guests) : undefined }),
  head: () => ({ meta: [
    { title: "Room details — HotelPro" }, { name: "description", content: "Room photos, amenities, pricing and live availability." },
    { property: "og:title", content: "Room details — HotelPro" }, { property: "og:description", content: "Room photos, amenities, pricing and live availability." },
  ] }),
  component: RoomDetail,
});

function RoomDetail() {
  const { id } = Route.useParams();
  const s = Route.useSearch();
  const { user } = useAuth();
  const nav = useNavigate();
  const [checkIn, setCI] = useState(s.checkIn ?? isoDay(7));
  const [checkOut, setCO] = useState(s.checkOut ?? isoDay(9));
  const [guests, setG] = useState(s.guests ?? 1);
  const room = useQuery({ queryKey: ["room", id], queryFn: () => api.room(id) });
  const valid = checkOut > checkIn && checkIn >= isoDay();
  const quote = useQuery({ queryKey: ["quote", id, checkIn, checkOut, guests], queryFn: () => api.quote({ roomId: id, checkIn, checkOut, guests }), enabled: valid && !!room.data, retry: false });
  const avail = useQuery({ queryKey: ["avail", id, checkIn, checkOut], queryFn: () => api.availability(id, checkIn, checkOut), enabled: valid });

  if (room.isLoading) return <Loading />;
  if (room.isError) return <State icon="error" title="Room not found" action={<Button asChild><Link to="/rooms">Back to rooms</Link></Button>} />;
  const r = room.data!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Link to="/rooms" className="text-sm text-muted-foreground">← All rooms</Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <img src={roomImage(r)} alt={r.name} width={1200} height={800} className="aspect-[3/2] w-full rounded-xl object-cover" />
          <p className="eyebrow mt-8">{r.type} · room {r.number} · up to {r.capacity} guests</p>
          <h1 className="mt-2 text-5xl">{r.name}</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{r.description}</p>
          <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">{r.amenities.map((a) => <li key={a} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-brass" />{a}</li>)}</ul>
        </div>
        <aside className="h-fit space-y-4 rounded-xl border bg-card p-6 shadow-soft lg:sticky lg:top-24">
          <p><span className="font-display text-4xl text-primary">{money(r.pricePerNight)}</span> <span className="text-sm text-muted-foreground">/ night</span></p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">Check-in<input type="date" className="field mt-1" min={isoDay()} value={checkIn} onChange={(e) => setCI(e.target.value)} /></label>
            <label className="text-xs">Check-out<input type="date" className="field mt-1" min={checkIn} value={checkOut} onChange={(e) => setCO(e.target.value)} /></label>
          </div>
          <label className="block text-xs">Guests<input type="number" min={1} max={r.capacity} className="field mt-1" value={guests} onChange={(e) => setG(Number(e.target.value))} /></label>
          {!valid ? <p className="text-sm text-destructive">Choose a future check-in and a later check-out.</p> :
            avail.data === false ? <p className="text-sm text-destructive">Not available for these dates.</p> :
            quote.isError ? <p className="text-sm text-destructive">{errMsg(quote.error)}</p> :
            quote.data ? (
              <dl className="space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between"><dt>{money(quote.data.nightlyRate)} × {quote.data.nights} nights</dt><dd>{money(quote.data.subtotal)}</dd></div>
                <div className="flex justify-between text-muted-foreground"><dt>Taxes (12%)</dt><dd>{money(quote.data.taxes)}</dd></div>
                <div className="flex justify-between border-t pt-2 font-semibold"><dt>Total</dt><dd>{money(quote.data.total)}</dd></div>
              </dl>
            ) : <Loading label="Calculating…" />}
          <Button variant="brass" className="w-full" disabled={!valid || !quote.data || avail.data === false || (user != null && user.role !== "guest")}
            onClick={() => user ? nav({ to: "/checkout/$id", params: { id }, search: { checkIn, checkOut, guests } }) : nav({ to: "/login" })}>
            {user ? (user.role === "guest" ? "Reserve" : "Guest accounts only") : "Sign in to reserve"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Free cancellation up to 48h before check-in.</p>
        </aside>
      </div>
    </div>
  );
}
