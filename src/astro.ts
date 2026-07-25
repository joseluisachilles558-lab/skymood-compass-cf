// SkyMood Compass - western sky profile client (Free Astrology API)
// Step 4B: corrected request body per live verification in Step 3B.
//   - POST https://json.freeastrologyapi.com/western/planets
//   - Content-Type: application/json
//   - x-api-key: ${FREE_ASTROLOGY_API_KEY}  (read from env, NEVER hardcoded)
//   - config.observation_point singular
//   - ayanamsha tropical
//   - language en
//   - timezone is numeric UTC offset

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

export async function getWesternSkyProfile(apiKey: string, req: WesternSkyRequest): Promise<WesternSkyProfile> {
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
    const errText = await resp.text();
    throw new Error(`Free Astrology API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const raw = (await resp.json()) as any[];
  if (!Array.isArray(raw)) {
    throw new Error("Free Astrology API returned non-array response");
  }

  const bodies: CelestialBody[] = raw.map((b: any) => ({
    name: b?.planet?.en ?? "Unknown",
    fullDegree: Number(b?.fullDegree ?? 0),
    normDegree: Number(b?.normDegree ?? 0),
    isRetro: b?.isRetro === "True" || b?.isRetro === "true",
    zodiacSignNumber: Number(b?.zodiac_sign?.number ?? 0),
    zodiacSignName: String(b?.zodiac_sign?.name?.en ?? "unknown"),
  }));

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
    birthLocation: { latitude: req.latitude, longitude: req.longitude, timezone: req.timezone },
  };
}
