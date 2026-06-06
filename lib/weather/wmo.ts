import type { LucideIcon } from 'lucide-react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from 'lucide-react';

/** WMO weather interpretation codes → label + icon (Open-Meteo `weather_code`). */
export interface WmoInfo {
  label: string;
  icon: LucideIcon;
}

const table: Record<number, WmoInfo> = {
  0: { label: 'Clear', icon: Sun },
  1: { label: 'Mainly clear', icon: CloudSun },
  2: { label: 'Partly cloudy', icon: CloudSun },
  3: { label: 'Overcast', icon: Cloud },
  45: { label: 'Fog', icon: CloudFog },
  48: { label: 'Rime fog', icon: CloudFog },
  51: { label: 'Light drizzle', icon: CloudDrizzle },
  53: { label: 'Drizzle', icon: CloudDrizzle },
  55: { label: 'Heavy drizzle', icon: CloudDrizzle },
  56: { label: 'Freezing drizzle', icon: CloudDrizzle },
  57: { label: 'Freezing drizzle', icon: CloudDrizzle },
  61: { label: 'Light rain', icon: CloudRain },
  63: { label: 'Rain', icon: CloudRain },
  65: { label: 'Heavy rain', icon: CloudRain },
  66: { label: 'Freezing rain', icon: CloudRain },
  67: { label: 'Freezing rain', icon: CloudRain },
  71: { label: 'Light snow', icon: CloudSnow },
  73: { label: 'Snow', icon: CloudSnow },
  75: { label: 'Heavy snow', icon: CloudSnow },
  77: { label: 'Snow grains', icon: CloudSnow },
  80: { label: 'Rain showers', icon: CloudRain },
  81: { label: 'Rain showers', icon: CloudRain },
  82: { label: 'Heavy showers', icon: CloudRain },
  85: { label: 'Snow showers', icon: CloudSnow },
  86: { label: 'Snow showers', icon: CloudSnow },
  95: { label: 'Thunderstorm', icon: CloudLightning },
  96: { label: 'Thunderstorm', icon: CloudLightning },
  99: { label: 'Thunderstorm', icon: CloudLightning },
};

export function wmoInfo(code: number): WmoInfo {
  return table[code] ?? { label: 'Unknown', icon: Cloud };
}

/** Precipitation-bearing codes (drizzle and worse). Used for wet/fine signals. */
export function isWetCode(code: number): boolean {
  return code >= 51;
}
