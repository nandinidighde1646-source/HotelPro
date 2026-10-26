import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wifi, Coffee, Waves, Dumbbell, Car, ConciergeBell } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { api } from "@/lib/api";
import { RoomCard, SearchBar, Loading } from "@/components/hotel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HotelPro — Book a calm, beautiful stay" },
      { name: "description", content: "Search dates, browse rooms and suites, and book your stay at HotelPro." },
      { property: "og:title", content: "HotelPro — Book a calm, beautiful stay" },
      { property: "og:description", content: "Search dates, browse rooms and suites, and book your stay at HotelPro." },
    ],
  }),
  component: Index,
});

const amenities = [
  { i: Wifi, t: "Fast Wi-Fi" }, { i: Coffee, t: "Breakfast" }, { i: Waves, t: "Rooftop pool" },
  { i: Dumbbell, t: "Fitness studio" }, { i: Car, t: "Valet parking" }, { i: ConciergeBell, t: "24h concierge" },
];

function Index() {
  const rooms = useQuery({ queryKey: ["rooms", "featured"], queryFn: () => api.rooms({}) });
  return (
    <>
      <section className="relative">
        <img src={hero} alt="HotelPro lobby at golden hour" width={1600} height={912} className="h-[78vh] min-h-[520px] w-full object-cover" />
        <div className="bg-hero-overlay absolute inset-0" />
        <div className="absolute inset-0 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-10">
          <p className="eyebrow">Est. 1928 · City centre</p>
          <h1 className="mt-3 max-w-3xl text-5xl leading-[1.05] text-primary-foreground md:text-7xl">A quieter way to stay in the city.</h1>
          <div className="mt-8 max-w-4xl"><SearchBar /></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="flex items-end justify-between">
          <div><p className="eyebrow">Rooms & suites</p><h2 className="mt-2 text-4xl md:text-5xl">Featured rooms</h2></div>
          <Button asChild variant="link"><Link to="/rooms">View all rooms →</Link></Button>
        </div>
        {rooms.isLoading ? <Loading /> : rooms.isError ? <p className="mt-8 text-destructive">Couldn't load rooms.</p> : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rooms.data!.slice(0, 3).map((r) => <RoomCard key={r._id} room={r} />)}</div>
        )}
      </section>

      <section className="bg-secondary">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2">
          <div><p className="eyebrow">Amenities</p><h2 className="mt-2 text-4xl md:text-5xl">Everything considered, nothing excessive.</h2></div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {amenities.map(({ i: I, t }) => (<div key={t}><I className="h-6 w-6 text-brass" /><p className="mt-2 text-sm">{t}</p></div>))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 text-center">
        <h2 className="text-4xl">Ready when you are.</h2>
        <p className="mt-2 text-muted-foreground">Free cancellation up to 48 hours before check-in.</p>
        <div className="mt-6 flex justify-center gap-3"><Button asChild size="lg"><Link to="/rooms">Browse rooms</Link></Button><Button asChild size="lg" variant="outline"><Link to="/register">Create account</Link></Button></div>
      </section>
    </>
  );
}
