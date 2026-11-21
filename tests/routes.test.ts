import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as weatherGET } from "@/app/api/v1/weather/route";
import { GET as geocodeGET } from "@/app/api/v1/geocode/route";
import { GET as radarGET } from "@/app/api/v1/radar/frames/route";
import { makeForecast } from "./fixtures";

const req = (path: string) => new NextRequest(`http://localhost${path}`);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function mockFetch(handler: (url: string) => Response) {
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL) => handler(String(url))));
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/v1/weather", () => {
  it("rejects invalid coordinates", async () => {
    const res = await weatherGET(req("/api/v1/weather?lat=999&lon=1"));
    expect(res.status).toBe(400);
  });

  it("returns a normalized payload with cache headers and rounds coordinates", async () => {
    const seen: string[] = [];
    mockFetch((url) => {
      seen.push(url);
      if (url.includes("air-quality")) return json({ current: { us_aqi: 87, pm2_5: 30, pm10: 55 } });
      return json(makeForecast());
    });
    const res = await weatherGET(req("/api/v1/weather?lat=19.07612&lon=72.87771"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=600");
    const body = await res.json();
    expect(body.airQuality.category).toBe("Moderate");
    expect(body.hourly).toHaveLength(48);
    expect(body.daily).toHaveLength(7);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toContain("latitude=19.08");
    expect(seen[0]).toContain("longitude=72.88");
    expect(seen[0]).toContain("timezone=auto");
  });

  it("still returns the forecast when air quality fails", async () => {
    mockFetch((url) => (url.includes("air-quality") ? json({}, 500) : json(makeForecast())));
    const res = await weatherGET(req("/api/v1/weather?lat=1&lon=1"));
    expect(res.status).toBe(200);
    expect((await res.json()).airQuality).toBeNull();
  });

  it("returns 502 when the forecast fails", async () => {
    mockFetch(() => json({}, 503));
    const res = await weatherGET(req("/api/v1/weather?lat=1&lon=1"));
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect((await res.json()).retryable).toBe(true);
  });

  it("returns 502 when the upstream shape changes", async () => {
    mockFetch(() => json({ unexpected: true }));
    const res = await weatherGET(req("/api/v1/weather?lat=1&lon=1"));
    expect(res.status).toBe(502);
  });
});

describe("GET /api/v1/geocode", () => {
  it("validates the query", async () => {
    expect((await geocodeGET(req("/api/v1/geocode?q=a"))).status).toBe(400);
  });
  it("maps results", async () => {
    mockFetch(() =>
      json({ results: [{ id: 1269515, name: "Jamshedpur", latitude: 22.8, longitude: 86.2, country: "India", admin1: "Jharkhand" }] }),
    );
    const res = await geocodeGET(req("/api/v1/geocode?q=Jamshedpur"));
    expect(await res.json()).toEqual({
      results: [{ id: "1269515", name: "Jamshedpur", region: "Jharkhand", country: "India", lat: 22.8, lon: 86.2 }],
    });
  });
  it("handles no results", async () => {
    mockFetch(() => json({}));
    expect(await (await geocodeGET(req("/api/v1/geocode?q=zzzzzz"))).json()).toEqual({ results: [] });
  });
});

describe("GET /api/v1/radar/frames", () => {
  it("returns past frames", async () => {
    mockFetch(() =>
      json({ version: "2.0", generated: 1, host: "https://tilecache.rainviewer.com", radar: { past: [{ time: 10, path: "/v2/radar/abc" }], nowcast: [] } }),
    );
    const body = await (await radarGET()).json();
    expect(body).toEqual({ host: "https://tilecache.rainviewer.com", generated: 1, frames: [{ time: 10, path: "/v2/radar/abc" }] });
  });
});
