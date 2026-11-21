import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fetchAirQuality, fetchForecast } from "@/lib/openmeteo";
import { normalize } from "@/lib/normalize";

const params = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

// Round to ~1 km so nearby requests share one cache entry (and one upstream call).
const round2 = (n: number) => Math.round(n * 100) / 100;

const CACHE = "public, max-age=60, s-maxage=600, stale-while-revalidate=3600";

export async function GET(req: NextRequest) {
  const parsed = params.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const lat = round2(parsed.data.lat);
  const lon = round2(parsed.data.lon);

  const [forecast, air] = await Promise.allSettled([fetchForecast(lat, lon), fetchAirQuality(lat, lon)]);
  if (forecast.status === "rejected") {
    return NextResponse.json(
      { error: "upstream_unavailable", retryable: true },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
  // Air quality is optional: the forecast still renders if it fails.
  const body = normalize(forecast.value, air.status === "fulfilled" ? air.value : null);
  return NextResponse.json(body, { headers: { "Cache-Control": CACHE } });
}
