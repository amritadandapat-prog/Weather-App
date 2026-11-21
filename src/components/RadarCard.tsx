"use client";
import dynamic from "next/dynamic";

const RadarMap = dynamic(() => import("./RadarMap"), {
  ssr: false,
  loading: () => <div className="sk" style={{ height: 320 }} aria-hidden />,
});

export function RadarCard({ lat, lon, dark }: { lat: number; lon: number; dark: boolean }) {
  return (
    <section className="card map-c" aria-label="Radar map">
      <h2 className="card-title">Radar</h2>
      <RadarMap lat={lat} lon={lon} dark={dark} />
      <p className="n">Past two hours, 10-minute steps. Coverage varies by region.</p>
    </section>
  );
}
