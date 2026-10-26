import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loading, RoomCard, State, isoDay } from "@/components/hotel";
import { Button } from "@/components/ui/button";

type S = { checkIn?: string | undefined; checkOut?: string | undefined; guests?: number | undefined; type?: string | undefined; maxPrice?: number | undefined; amenities?: string | undefined };
export const Route = createFileRoute("/rooms/")({
  validateSearch: (s: { [K in keyof S]?: unknown }): S => ({
    checkIn: s.checkIn ? String(s.checkIn) : undefined, checkOut: s.checkOut ? String(s.checkOut) : undefined,
    guests: s.guests ? Number(s.guests) : undefined, type: s.type ? String(s.type) : undefined,
    maxPrice: s.maxPrice ? Number(s.maxPrice) : undefined, amenities: s.amenities ? String(s.amenities) : undefined,
  }),
  head: () => ({ meta: [
    { title: "Rooms & Suites — HotelPro" }, { name: "description", content: "Filter rooms by dates, price, type, capacity and amenities." },
    { property: "og:title", content: "Rooms & Suites — HotelPro" }, { property: "og:description", content: "Filter rooms by dates, price, type, capacity and amenities." },
  ] }),
  component: Rooms,
});

const AMENITIES = ["wifi", "minibar", "bathtub", "balcony", "city-view", "kitchenette"];

function Rooms() {
  const s = Route.useSearch();
  const nav = useNavigate({ from: "/rooms/" });
  const set = (p: Partial<S>) => nav({ search: (o) => ({ ...o, ...p }) });
  const datesValid = !s.checkIn || !s.checkOut || s.checkOut > s.checkIn;
  const q = useQuery({ queryKey: ["rooms", s], queryFn: () => api.rooms(s), enabled: datesValid });
  const am = s.amenities?.split(",").filter(Boolean) ?? [];

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-5">
        <h1 className="text-4xl">Rooms</h1>
        <label className="block text-sm">Check-in<input type="date" className="field mt-1" min={isoDay()} value={s.checkIn ?? ""} onChange={(e) => set({ checkIn: e.target.value || undefined })} /></label>
        <label className="block text-sm">Check-out<input type="date" className="field mt-1" min={s.checkIn ?? isoDay()} value={s.checkOut ?? ""} onChange={(e) => set({ checkOut: e.target.value || undefined })} /></label>
        <label className="block text-sm">Guests<input type="number" min={1} max={10} className="field mt-1" value={s.guests ?? ""} onChange={(e) => set({ guests: e.target.value ? Number(e.target.value) : undefined })} /></label>
        <label className="block text-sm">Room type
          <select className="field mt-1" value={s.type ?? ""} onChange={(e) => set({ type: e.target.value || undefined })}>
            <option value="">Any</option><option value="standard">Standard</option><option value="deluxe">Deluxe</option><option value="suite">Suite</option><option value="family">Family</option>
          </select>
        </label>
        <label className="block text-sm">Max price / night: {s.maxPrice ? `$${s.maxPrice}` : "any"}
          <input type="range" min={100} max={400} step={10} className="mt-2 w-full accent-[var(--brass)]" value={s.maxPrice ?? 400} onChange={(e) => set({ maxPrice: Number(e.target.value) >= 400 ? undefined : Number(e.target.value) })} />
        </label>
        <fieldset><legend className="text-sm">Amenities</legend>
          <div className="mt-2 flex flex-wrap gap-2">{AMENITIES.map((a) => {
            const on = am.includes(a);
            return <button key={a} type="button" onClick={() => set({ amenities: (on ? am.filter((x) => x !== a) : [...am, a]).join(",") || undefined })}
              className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{a}</button>;
          })}</div>
        </fieldset>
        <Button variant="outline" className="w-full" onClick={() => nav({ search: {} })}>Clear filters</Button>
      </aside>
      <section>
        {!datesValid ? <State icon="error" title="Check-out must be after check-in" /> :
          q.isLoading ? <Loading /> : q.isError ? <State icon="error" title="Couldn't load rooms" body="Is the API server running?" /> :
          q.data!.length === 0 ? <State icon="empty" title="No rooms match" body="Try different dates or fewer filters." /> : (
            <>
              <p className="text-sm text-muted-foreground">{q.data!.length} room{q.data!.length > 1 ? "s" : ""} {s.checkIn && s.checkOut ? "available for your dates" : ""}</p>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">{q.data!.map((r) => <RoomCard key={r._id} room={r} search={{ checkIn: s.checkIn, checkOut: s.checkOut, guests: s.guests }} />)}</div>
            </>
          )}
      </section>
    </div>
  );
}
