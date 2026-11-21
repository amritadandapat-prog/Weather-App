// Short, plain-language explanations for the detail cards.

export function aqiBand(aqi: number): { category: string; note: string } {
  if (aqi <= 50) return { category: "Good", note: "Air quality is good." };
  if (aqi <= 100) return { category: "Moderate", note: "Acceptable. Very sensitive people may notice effects." };
  if (aqi <= 150) return { category: "Unhealthy for sensitive groups", note: "Sensitive groups should limit long outdoor effort." };
  if (aqi <= 200) return { category: "Unhealthy", note: "Everyone should reduce long outdoor effort." };
  if (aqi <= 300) return { category: "Very unhealthy", note: "Avoid outdoor exertion." };
  return { category: "Hazardous", note: "Stay indoors if you can." };
}

export function uvBand(uv: number): { label: string; note: string } {
  if (uv < 3) return { label: "Low", note: "No protection needed." };
  if (uv < 6) return { label: "Moderate", note: "Wear sunscreen if outside for long." };
  if (uv < 8) return { label: "High", note: "Use sun protection." };
  if (uv < 11) return { label: "Very high", note: "Cover up and seek shade at midday." };
  return { label: "Extreme", note: "Avoid midday sun." };
}

export function visibilityNote(km: number): string {
  if (km >= 10) return "Clear view.";
  if (km >= 5) return "Light haze.";
  if (km >= 1) return "Reduced visibility.";
  return "Very poor visibility.";
}

export function humidityNote(rh: number, dewC: number | null): string {
  const dew = dewC == null ? "" : ` Dew point ${Math.round(dewC)}°.`;
  if (rh >= 80) return `Very humid.${dew}`;
  if (rh >= 60) return `Humid.${dew}`;
  if (rh >= 30) return `Comfortable.${dew}`;
  return `Dry air.${dew}`;
}

export function feelsNote(tempC: number, feelsC: number): string {
  const d = feelsC - tempC;
  if (d >= 2) return "Humidity makes it feel warmer.";
  if (d <= -2) return "Wind makes it feel cooler.";
  return "Close to the actual temperature.";
}
