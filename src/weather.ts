// Open-Meteo client (keyless, verified live in Step 2).
const WEATHER_DESCRIPTORS: Record<number, string> = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "depositing rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  71: "slight snow",
  73: "moderate snow",
  75: "heavy snow",
  80: "slight rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  95: "thunderstorm",
  96: "thunderstorm with slight hail",
  99: "thunderstorm with heavy hail",
};

export interface WeatherResult {
  temperatureC: number;
  weatherCode: number;
  weatherDescriptor: string;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  timezone: string;
}

export async function getCurrentWeather(latitude: number, longitude: number, timezone: string): Promise<WeatherResult> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=${encodeURIComponent(timezone)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo ${resp.status}`);
  const data = await resp.json() as any;
  const code = Number(data.current.weather_code);
  return {
    temperatureC: Number(data.current.temperature_2m),
    weatherCode: code,
    weatherDescriptor: WEATHER_DESCRIPTORS[code] ?? `code ${code}`,
    isDay: data.current.is_day === 1,
    sunrise: String(data.daily.sunrise[0]),
    sunset: String(data.daily.sunset[0]),
    timezone,
  };
}
