import 'server-only';

/**
 * Open-Meteo clients (free, no API key). Two endpoints:
 *  - forecast (up to ~16 days) for the 1/3/7/14-day tabs
 *  - archive (historical) averaged over recent years for the 30-day "climate" tab, which is
 *    clearly labeled as typical conditions, NOT a forecast (PRD §5.6).
 *
 * Responses are cached with Next's fetch revalidation rather than a DB cache.
 */

export interface ForecastHour {
  time: string; // ISO local time
  temp: number;
  precipProb: number | null;
  precipMm: number;
  code: number;
  wind: number;
}

export interface ForecastDay {
  date: string; // YYYY-MM-DD
  tMax: number;
  tMin: number;
  precipSum: number;
  precipProbMax: number | null;
  code: number;
  // Richer fields (populated by getTripForecast):
  windMax?: number;
  precipHours?: number;
  sunrise?: string;
  sunset?: string;
  uvMax?: number;
  hours?: ForecastHour[];
}

/** The grid point Open-Meteo actually resolved the request to (its nearest model cell). */
export interface ForecastSource {
  lat: number;
  lng: number;
  elevation?: number;
  timezone?: string;
}

export interface ClimateSummary {
  avgTMax: number;
  avgTMin: number;
  avgPrecip: number; // mm/day
  rainyDayPct: number; // % of days with >1mm
  yearsUsed: number[];
  sampleDays: number;
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

interface DailyBlock {
  time: string[];
  weather_code?: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
  precipitation_hours?: (number | null)[];
  sunrise?: string[];
  sunset?: string[];
  uv_index_max?: (number | null)[];
}

/** Up to 16-day daily forecast for a coordinate. */
export async function getForecast(lat: number, lng: number): Promise<ForecastDay[]> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
    forecast_days: '16',
    timezone: 'auto',
  });

  const res = await fetch(`${FORECAST_URL}?${params}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status}`);
  const json = (await res.json()) as { daily: DailyBlock };
  const d = json.daily;

  return d.time.map((date, i) => ({
    date,
    tMax: Math.round(d.temperature_2m_max[i]),
    tMin: Math.round(d.temperature_2m_min[i]),
    precipSum: d.precipitation_sum[i] ?? 0,
    precipProbMax: d.precipitation_probability_max?.[i] ?? null,
    code: d.weather_code?.[i] ?? 0,
  }));
}

interface HourlyBlock {
  time: string[];
  temperature_2m: number[];
  precipitation_probability?: (number | null)[];
  precipitation: number[];
  weather_code: number[];
  wind_speed_10m: number[];
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Rich daily forecast for the part of the trip window that falls within Open-Meteo's forecast
 * horizon (today … +15 days). Includes extra daily stats and hourly data for day-detail views.
 * Days outside the horizon aren't returned (the caller shows seasonal averages instead).
 */
export async function getTripForecast(
  lat: number,
  lng: number,
  startISO: string,
  endISO: string,
): Promise<{ days: ForecastDay[]; source: ForecastSource | null }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 15);

  const start = new Date(`${startISO.slice(0, 10)}T00:00:00`);
  const end = new Date(`${endISO.slice(0, 10)}T00:00:00`);
  const reqStart = start > today ? start : today;
  const reqEnd = end < horizon ? end : horizon;
  // trip is fully in the past or beyond the forecast horizon
  if (reqStart > reqEnd) return { days: [], source: null };

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,precipitation_hours,sunrise,sunset,uv_index_max',
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',
    start_date: ymd(reqStart),
    end_date: ymd(reqEnd),
    timezone: 'auto',
  });

  const res = await fetch(`${FORECAST_URL}?${params}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status}`);
  const json = (await res.json()) as {
    daily: DailyBlock;
    hourly: HourlyBlock;
    latitude?: number;
    longitude?: number;
    elevation?: number;
    timezone?: string;
  };
  const d = json.daily;
  const h = json.hourly;

  const source: ForecastSource | null =
    json.latitude != null && json.longitude != null
      ? {
          lat: json.latitude,
          lng: json.longitude,
          elevation: json.elevation,
          timezone: json.timezone,
        }
      : null;

  // Group hourly entries by calendar day.
  const hoursByDate = new Map<string, ForecastHour[]>();
  for (let i = 0; i < h.time.length; i++) {
    const date = h.time[i].slice(0, 10);
    const list = hoursByDate.get(date) ?? [];
    list.push({
      time: h.time[i],
      temp: Math.round(h.temperature_2m[i]),
      precipProb: h.precipitation_probability?.[i] ?? null,
      precipMm: h.precipitation[i] ?? 0,
      code: h.weather_code[i] ?? 0,
      wind: Math.round(h.wind_speed_10m[i]),
    });
    hoursByDate.set(date, list);
  }

  const days = d.time.map((date, i) => ({
    date,
    tMax: Math.round(d.temperature_2m_max[i]),
    tMin: Math.round(d.temperature_2m_min[i]),
    precipSum: d.precipitation_sum[i] ?? 0,
    precipProbMax: d.precipitation_probability_max?.[i] ?? null,
    code: d.weather_code?.[i] ?? 0,
    windMax: d.wind_speed_10m_max?.[i] != null ? Math.round(d.wind_speed_10m_max[i]!) : undefined,
    precipHours: d.precipitation_hours?.[i] ?? undefined,
    sunrise: d.sunrise?.[i],
    sunset: d.sunset?.[i],
    uvMax: d.uv_index_max?.[i] != null ? Math.round(d.uv_index_max[i]! * 10) / 10 : undefined,
    hours: hoursByDate.get(date),
  }));

  return { days, source };
}

function withYear(iso: string, year: number): string {
  return `${year}${iso.slice(4)}`;
}

/**
 * Typical conditions for the trip's date window, averaged over the previous few years from the
 * historical archive. Not a forecast — used for the 30-day "seasonal averages" tab.
 */
export async function getClimateForWindow(
  lat: number,
  lng: number,
  startISO: string,
  endISO: string,
): Promise<ClimateSummary> {
  const baseYear = new Date(startISO).getFullYear();
  const years = [baseYear - 1, baseYear - 2, baseYear - 3];

  const blocks = await Promise.all(
    years.map(async (year) => {
      const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lng.toFixed(4),
        start_date: withYear(startISO.slice(0, 10), year),
        end_date: withYear(endISO.slice(0, 10), year),
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
        timezone: 'auto',
      });
      const res = await fetch(`${ARCHIVE_URL}?${params}`, { next: { revalidate: 86400 } });
      if (!res.ok) return null;
      return (await res.json()) as { daily: DailyBlock };
    }),
  );

  let tMaxSum = 0;
  let tMinSum = 0;
  let precipSum = 0;
  let rainyDays = 0;
  let days = 0;
  const yearsUsed: number[] = [];

  blocks.forEach((block, idx) => {
    if (!block?.daily) return;
    yearsUsed.push(years[idx]);
    const d = block.daily;
    for (let i = 0; i < d.time.length; i++) {
      const max = d.temperature_2m_max[i];
      const min = d.temperature_2m_min[i];
      const precip = d.precipitation_sum[i] ?? 0;
      if (max == null || min == null) continue;
      tMaxSum += max;
      tMinSum += min;
      precipSum += precip;
      if (precip > 1) rainyDays += 1;
      days += 1;
    }
  });

  if (days === 0) throw new Error('No archive data available for this window');

  return {
    avgTMax: Math.round(tMaxSum / days),
    avgTMin: Math.round(tMinSum / days),
    avgPrecip: Math.round((precipSum / days) * 10) / 10,
    rainyDayPct: Math.round((rainyDays / days) * 100),
    yearsUsed,
    sampleDays: days,
  };
}
