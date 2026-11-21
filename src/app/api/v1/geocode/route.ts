import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { geocode } from "@/lib/openmeteo";

const params = z.object({ q: z.string().trim().min(2).max(80) });

export async function GET(req: NextRequest) {
  const parsed = params.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const results = await geocode(parsed.data.q);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return NextResponse.json(
      { error: "upstream_unavailable", retryable: true },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
