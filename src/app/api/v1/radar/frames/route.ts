import { NextResponse } from "next/server";
import { fetchRadarFrames } from "@/lib/openmeteo";

export async function GET() {
  try {
    const data = await fetchRadarFrames();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unavailable", retryable: true },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
