# Weather App: UI Design (Step 2)

## Assumptions
- Personal/portfolio scope (Open-Meteo free tier OK).
- v1: current conditions, hourly (24h), 7-day, detail cards (wind, UV, humidity, feels-like, pressure, visibility, sunrise/sunset, AQI), location search + saved locations, °C/°F toggle, light/dark/auto theme.
- v1.1: radar map (Windy-style), alerts, minute-by-minute rain summary.

## Principles
1. Glanceable first: one hero answer ("18°, Partly cloudy, rain in 12 min") before any detail.
2. Conditions-driven theming: background gradient follows weather code + day/night.
3. Mobile-first, enhanced for desktop. Same components, different layout.
4. Calm motion: subtle, respects `prefers-reduced-motion`.
5. Accessible: WCAG AA contrast on glass cards, keyboard navigable, semantic landmarks, no info by colour alone.

## Layout
**Mobile (<768px):** single column. Sticky compact header on scroll (city + temp). Order: Hero → Hourly strip (horizontal scroll) → 7-day list → Detail card grid (2 cols) → Map.

**Desktop (>=1024px):** left rail with saved locations; main area is a 12-col grid: Hero (span 12), Hourly (span 12), 7-day (span 5) + Map (span 7), Detail cards (4 across).

## Components
Search bar with autocomplete · Hero · Hourly strip with precip % · Daily row with temp-range bar · Detail card (icon, value, one-line explanation) · Location chips · Unit/theme toggle · Skeleton loaders · Offline/error banner.

## Visual system
- Type: Inter (variable). Hero temp 96px/thin weight; body 16px.
- Cards: translucent glass (backdrop blur 20px, 1px inner border, 16-20px radius).
- Spacing: 4px scale. Breakpoints: 480 / 768 / 1024 / 1440.
- Gradients: clear-day, clear-night, cloudy, rain, storm, snow, fog.
- Icons: line icons, single stroke weight (e.g. Lucide).

## States
Loading (skeletons) · Empty (no saved locations, prompt for geolocation) · Permission denied (manual search) · API error (retry, show cached data with timestamp) · Offline (PWA cache).

Prototype: `prototype/index.html` (static data, open in a browser).
