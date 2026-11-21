import { Droplets, Eye, Gauge, Sunrise, Sunset, Thermometer, Wind, Sun, Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { compass, dayLabel, formatTemp, hourLabel, timeLabel } from "@/lib/format";
import { feelsNote, humidityNote, uvBand, visibilityNote } from "@/lib/insights";
import type { Unit, WeatherResponse } from "@/lib/types";
import { ConditionIcon } from "./ConditionIcon";

export function Hero({ name, data, unit }: { name: string; data: WeatherResponse; unit: Unit }) {
  const { current, daily, summary } = data;
  const today = daily[0];
  return (
    <section className="card hero" aria-label="Current conditions">
      <h1 className="city">{name}</h1>
      <div className="temp" aria-label={`${formatTemp(current.tempC, unit)} ${unit === "C" ? "Celsius" : "Fahrenheit"}`}>
        {formatTemp(current.tempC, unit)}
      </div>
      <div className="cond">
        <ConditionIcon condition={current.condition} size={22} /> {current.condition.label}
      </div>
      <div className="sub">
        {today ? `H:${formatTemp(today.maxC, unit)} L:${formatTemp(today.minC, unit)} · ` : ""}
        {summary.headline}
      </div>
    </section>
  );
}

export function Hourly({ data, unit }: { data: WeatherResponse; unit: Unit }) {
  const items = data.hourly.slice(0, 24);
  return (
    <section className="card hourly-c" aria-label="Hourly forecast">
      <h2 className="card-title">Hourly</h2>
      <ol className="hourly">
        {items.map((h, i) => (
          <li className="h" key={h.time}>
            <small>{i === 0 ? "Now" : hourLabel(h.time)}</small>
            <span className="p">{h.precipProb >= 10 ? `${h.precipProb}%` : ""}</span>
            <ConditionIcon condition={h.condition} size={24} />
            <span className="ht">{formatTemp(h.tempC, unit)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Daily({ data, unit }: { data: WeatherResponse; unit: Unit }) {
  const lo = Math.min(...data.daily.map((d) => d.minC));
  const hi = Math.max(...data.daily.map((d) => d.maxC));
  const span = Math.max(1, hi - lo);
  return (
    <section className="card daily-c" aria-label="7-day forecast">
      <h2 className="card-title">7-day</h2>
      <ul className="daily">
        {data.daily.map((d) => (
          <li className="day" key={d.date}>
            <span className="dn">{dayLabel(d.date, data.current.time)}</span>
            <span className="di">
              <ConditionIcon condition={d.condition} size={22} />
              <span className="dp">{d.precipProbMax >= 30 ? `${d.precipProbMax}%` : ""}</span>
            </span>
            <span className="bar">
              <span>{formatTemp(d.minC, unit)}</span>
              <span className="track" aria-hidden>
                <i style={{ left: `${((d.minC - lo) / span) * 100}%`, right: `${100 - ((d.maxC - lo) / span) * 100}%` }} />
              </span>
              <span>{formatTemp(d.maxC, unit)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Detail({ icon, label, value, note }: { icon: ReactNode; label: string; value: ReactNode; note: string }) {
  return (
    <div className="card detail">
      <h3 className="card-title">
        {icon} {label}
      </h3>
      <div className="v">{value}</div>
      <div className="n">{note}</div>
    </div>
  );
}

export function Details({ data, unit }: { data: WeatherResponse; unit: Unit }) {
  const c = data.current;
  const aq = data.airQuality;
  const uv = c.uv == null ? null : uvBand(c.uv);
  const ic = { size: 14, "aria-hidden": true } as const;
  return (
    <section className="grid details-c" aria-label="Details">
      <Detail icon={<Thermometer {...ic} />} label="Feels like" value={formatTemp(c.feelsLikeC, unit)} note={feelsNote(c.tempC, c.feelsLikeC)} />
      <Detail icon={<Wind {...ic} />} label="Wind" value={`${c.windKmh} km/h`} note={`From the ${compass(c.windDirDeg)}.`} />
      <Detail icon={<Sun {...ic} />} label="UV index" value={c.uv == null ? "n/a" : Math.round(c.uv)} note={uv ? `${uv.label}. ${uv.note}` : "Not available."} />
      <Detail icon={<Droplets {...ic} />} label="Humidity" value={`${c.humidity}%`} note={humidityNote(c.humidity, c.dewPointC)} />
      <Detail
        icon={<Leaf {...ic} />}
        label="Air quality"
        value={aq ? aq.usAqi : "n/a"}
        note={aq ? `${aq.category}. ${aq.note}` : "Not available for this location."}
      />
      <Detail icon={<Gauge {...ic} />} label="Pressure" value={`${c.pressureHpa} hPa`} note="Sea-level pressure." />
      <Detail icon={<Eye {...ic} />} label="Visibility" value={c.visibilityKm == null ? "n/a" : `${c.visibilityKm} km`} note={c.visibilityKm == null ? "Not available." : visibilityNote(c.visibilityKm)} />
      <Detail
        icon={c.isDay ? <Sunset {...ic} /> : <Sunrise {...ic} />}
        label={c.isDay ? "Sunset" : "Sunrise"}
        value={timeLabel(c.isDay ? c.sunset : c.sunrise)}
        note={c.isDay ? `Sunrise ${timeLabel(c.sunrise)}.` : `Sunset ${timeLabel(c.sunset)}.`}
      />
    </section>
  );
}

export function Skeleton() {
  return (
    <>
      <section className="card hero" aria-hidden>
        <div className="sk" style={{ width: 160, height: 28, margin: "0 auto" }} />
        <div className="sk" style={{ width: 200, height: 96, margin: "12px auto" }} />
        <div className="sk" style={{ width: 240, height: 20, margin: "0 auto" }} />
      </section>
      <section className="card hourly-c" aria-hidden>
        <div className="sk" style={{ height: 96 }} />
      </section>
      <section className="card daily-c" aria-hidden>
        <div className="sk" style={{ height: 280 }} />
      </section>
      <div className="grid details-c" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <div className="card" key={i}>
            <div className="sk" style={{ height: 76 }} />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">Loading weather</p>
    </>
  );
}
