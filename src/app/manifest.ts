import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weather",
    short_name: "Weather",
    description: "Glanceable weather with hourly and 7-day forecasts, air quality and radar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2b705",
    theme_color: "#f2b705",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
