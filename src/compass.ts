// Deterministic rule-based compass recommendation.
// No Math.random, no Date.now in selection. Stable across same (sky, weather, mood) tuple.
import { getWesternSkyProfile } from "./astro";
import { getCurrentWeather } from "./weather";

export interface CompassInput {
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
  timezone: number;
  current_latitude: number;
  current_longitude: number;
  current_timezone: string;
  mood_score?: number;
}

export interface CompassResult {
  ritual: string;
  action: string;
  affirmation: string;
  moodEcho: string;
  skySnapshot: { sun: string; moon: string; ascendant: string; moonPhase: string; retrogrades: string[] };
  weatherSnapshot: { temperatureC: number; descriptor: string; isDay: boolean };
  moodScore?: number;
  disclaimer: string;
}

const SUN_THEMES: Record<string, string> = {
  aries: "act with courage",
  taurus: "ground your senses",
  gemini: "curate the curious",
  cancer: "tend what matters",
  leo: "lead with warmth",
  virgo: "refine the routine",
  libra: "balance the scales",
  scorpio: "deepen the inquiry",
  sagittarius: "explore the horizon",
  capricorn: "structure the climb",
  aquarius: "invent the system",
  pisces: "feel the flow",
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const RITUALS = [
  "Three slow breaths. Notice what softens.",
  "Pour water mindfully; let its temperature match the room, not the calendar.",
  "Stand near a window for two minutes and name three things that are still here.",
];

const ACTIONS = [
  "Send one message of thanks before noon.",
  "Move your body for ten minutes - slow counts.",
  "Close two open loops: reply or archive.",
];

const AFFIRMATIONS = [
  "I can be both steady and changing today.",
  "Small actions compound; I am patient with the seed.",
  "My attention is a gift; I give it on purpose.",
];

export async function getCompassRecommendation(apiKey: string, input: CompassInput): Promise<CompassResult> {
  const [year, month, date] = input.birth_date.split("-").map(Number);
  const parts = input.birth_time.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = parts[2] ? Number(parts[2]) : 0;

  const [sky, weather] = await Promise.all([
    getWesternSkyProfile(apiKey, {
      year, month, date, hours, minutes, seconds,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
    }),
    getCurrentWeather(input.current_latitude, input.current_longitude, input.current_timezone),
  ]);

  const sunTheme = SUN_THEMES[sky.sunSign] ?? "follow the light";
  const seed = `${sky.sunSign}-${sky.moonPhase}-${weather.weatherDescriptor}-${input.mood_score ?? "none"}`;
  const variant = hashString(seed) % 3;

  let moodEcho = "Unset";
  if (input.mood_score !== undefined) {
    if (input.mood_score <= 3) moodEcho = "Heavy: be gentle with expectations.";
    else if (input.mood_score <= 6) moodEcho = "Steady: the day matches your rhythm.";
    else moodEcho = "Bright: channel the energy outward.";
  }

  return {
    ritual: RITUALS[variant]
      .replace("{sunTheme}", sunTheme)
      .replace("{sunTheme}", sunTheme)
      .replace("{sunTheme}", sunTheme)
      .replace("Three slow breaths.", `Three slow breaths in ${sunTheme}.`),
    action: ACTIONS[variant],
    affirmation: AFFIRMATIONS[variant],
    moodEcho,
    skySnapshot: {
      sun: sky.sunSign,
      moon: sky.moonSign,
      ascendant: sky.ascendantSign,
      moonPhase: sky.moonPhase,
      retrogrades: sky.retrogrades,
    },
    weatherSnapshot: {
      temperatureC: weather.temperatureC,
      descriptor: weather.weatherDescriptor,
      isDay: weather.isDay,
    },
    moodScore: input.mood_score,
    disclaimer: "This is a reflective-practice tool, not medical, financial, legal, or predictive advice.",
  };
}
