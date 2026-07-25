// SkyMood Compass - western sky profile client (Free Astrology API)
// POST https://json.freeastrologyapi.com/western/planets
// x-api-key is read from env as FREE_ASTROLOGY_API_KEY, never hardcoded.

export interface WesternSkyRequest {
  year: number;
  month: number;
  date: number;
  hours: number;
  minutes: number;
  seconds: number;
  latitude: number;
  longitude: number;
  timezone: number;
}

export interface CelestialBody {
  name: string;
  fullDegree: number;
  normDegree: number;
  isRetro: boolean;
  zodiacSignNumber: number;
  zodiacSignName: string;
}

export interface WesternSkyProfile {
  bodies: CelestialBody[];
  sunSign: string;
  moonSign: string;
  ascendantSign: string;
  moonPhase: string;
  moonPhaseAngle: number;
  retrogrades: string[];
  birthLocation: { latitude: number; longitude: number; timezone: number };
}

function deriveMoonPhase(sunDegree: number, moonDegree: number): { angle: number; phase: string } {
  const angle = (moonDegree - sunDegree + 360) % 360;
  let phase: string;

  if (angle < 22.5 || angle >= 337.5) phase = "new";
  else if (angle < 67.5) phase = "waxing crescent";
  else if (angle < 112.5) phase = "first quarter";
  else if (angle < 157.5) phase = "waxing gibbous";
  else if (angle < 202.5) phase = "full";
  else if (angle < 247.5) phase = "waning gibbous";
  else if (angle < 292.5) phase = "last quarter";
  else phase = "waning crescent";

  return { angle, phase };
}

function getTopLevelKeys(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return Object.keys(value as Record<string, unknown>).join(", ");
}

function findPlanetArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  for (const key of ["output", "data", "result", "planets"]) {
    const candidate = obj[key];
    if (Array.isArray(candidate)) return candidate;

    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      for (const nestedKey of ["output", "data", "result", "planets"]) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
      }
    }
  }

  return null;
}

export async function getWesternSkyProfile(
  apiKey: string,
  req: WesternSkyRequest
): Promise<WesternSkyProfile> {
  if (!apiKey || apiKey.length < 16) {
    throw new Error("FREE_ASTROLOGY_API_KEY missing or too short");
  }

  const url = "https://json.freeastrologyapi.com/western/planets";
  const body = {
    year: req.year,
    month: req.month,
    date: req.date,
    hours: req.hours,
    minutes: req.minutes,
    seconds: req.seconds,
    latitude: req.latitude,
    longitude: req.longitude,
    timezone: req.timezone,
    config: {
      observation_point: "geocentric",
      ayanamsha: "tropical",
      language: "en",
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Free Astrology API returned HTTP ${resp.status}`);
  }

  const parsed = await resp.json();
  const raw = findPlanetArray(parsed);

  if (!raw) {
    const topLevelKeys = getTopLevelKeys(parsed);
    throw new Error(
      `Free Astrology API returned non-array response (status ${resp.status}, top-level keys: ${topLevelKeys})`
    );
  }

  const bodies: CelestialBody[] = raw.map((item: unknown) => {
    const b = (item || {}) as Record<string, any>;

    return {
      name: String(b?.planet?.en ?? b?.name ?? b?.planet ?? "Unknown"),
      fullDegree: Number(b?.fullDegree ?? 0),
      normDegree: Number(b?.normDegree ?? 0),
      isRetro: b?.isRetro === true || b?.isRetro === "True" || b?.isRetro === "true",
      zodiacSignNumber: Number(b?.zodiac_sign?.number ?? 0),
      zodiacSignName: String(b?.zodiac_sign?.name?.en ?? b?.zodiacSignName ?? b?.sign ?? "unknown"),
    };
  });

  const sun = bodies.find((x) => x.name === "Sun");
  const moon = bodies.find((x) => x.name === "Moon");
  const asc = bodies.find((x) => x.name === "Ascendant");
  const retrogrades = bodies.filter((x) => x.isRetro).map((x) => x.name);
  const moonPhaseInfo =
    sun && moon ? deriveMoonPhase(sun.fullDegree, moon.fullDegree) : { angle: 0, phase: "unknown" };

  return {
    bodies,
    sunSign: sun?.zodiacSignName ?? "unknown",
    moonSign: moon?.zodiacSignName ?? "unknown",
    ascendantSign: asc?.zodiacSignName ?? "unknown",
    moonPhase: moonPhaseInfo.phase,
    moonPhaseAngle: moonPhaseInfo.angle,
    retrogrades,
    birthLocation: {
      latitude: req.latitude,
      longitude: req.longitude,
      timezone: req.timezone,
    },
  };
}
