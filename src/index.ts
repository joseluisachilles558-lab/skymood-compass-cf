// SkyMood Compass - AstroMesh Event #6
// Cloudflare Worker entry: MCP server (agents/McpAgent + Streamable HTTP via Workers adapter)
// + static assets + convenience HTTP routes
//
// Step 4B notes:
//   - Official @modelcontextprotocol/sdk StreamableHTTPServerTransport is BLOCKED in Workers
//     because it depends on node:http, node:stream/web, node:crypto (Node-only).
//   - Cloudflare "agents" library (McpAgent) implements the MCP protocol using Workers' Web
//     Streams + Durable Objects. This is the closest compliant alternative.
//   - McpAgent internally imports McpServer from @modelcontextprotocol/sdk, so the official
//     SDK IS still in the dependency tree for protocol logic; only the transport is swapped.

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWesternSkyProfile } from "./astro";
import { getCurrentWeather } from "./weather";
import { getCompassRecommendation } from "./compass";

export interface Env {
  FREE_ASTROLOGY_API_KEY: string;
  ASSETS: Fetcher;
}

// ---- CORS allowlist (set to deploy URL post-4C; permissive in dev) ----
const ALLOWED_ORIGINS: string[] = [
  "http://localhost:8787",
  "http://127.0.0.1:8787",
  // After 4C deploy, add the workers.dev origin here.
];

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function withCors(request: Request, response: Response): Response {
  const origin = request.headers.get("Origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    const headers = new Headers(response.headers);
    const cors = corsHeaders(origin);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v as string);
    return new Response(response.body, { status: response.status, headers });
  }
  return response;
}

// ---- In-memory per-IP rate limit (60 req / 60 s) ----
interface RateLimitEntry { count: number; resetAt: number; }
const rateLimits = new Map<string, RateLimitEntry>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

// ---- MCP agent ----
export class SkyMoodMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "SkyMood Compass",
    version: "0.4.0",
  });

  async init() {
    this.server.tool(
      "get_western_sky_profile",
      "Returns the user's western birth sky profile (Sun, Moon, Ascendant, retrogrades, derived moon phase) from Free Astrology API.",
      {
        birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD").describe("Birth date in YYYY-MM-DD"),
        birth_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Expected HH:MM or HH:MM:SS").describe("Birth time in HH:MM or HH:MM:SS"),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        timezone: z.number().min(-12).max(14).describe("UTC offset as number, e.g. 7 for ICT"),
      },
      async ({ birth_date, birth_time, latitude, longitude, timezone }) => {
        const [year, month, date] = birth_date.split("-").map(Number);
        const parts = birth_time.split(":");
        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);
        const seconds = parts[2] ? Number(parts[2]) : 0;
        const profile = await getWesternSkyProfile(this.env.FREE_ASTROLOGY_API_KEY, {
          year, month, date, hours, minutes, seconds, latitude, longitude, timezone,
        });
        return { content: [{ type: "text", text: JSON.stringify(profile, null, 2) }] };
      }
    );

    this.server.tool(
      "get_current_weather",
      "Returns current weather from Open-Meteo for a given location.",
      {
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        timezone: z.string().describe("IANA timezone name, e.g. Asia/Ho_Chi_Minh"),
      },
      async ({ latitude, longitude, timezone }) => {
        const result = await getCurrentWeather(latitude, longitude, timezone);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "get_compass_recommendation",
      "Returns a deterministic astro-weather compass recommendation from birth sky profile + current weather + optional mood score.",
      {
        birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        birth_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        timezone: z.number().min(-12).max(14),
        current_latitude: z.number().min(-90).max(90),
        current_longitude: z.number().min(-180).max(180),
        current_timezone: z.string(),
        mood_score: z.number().min(0).max(10).optional().describe("Optional user-reported mood 0-10"),
      },
      async (params) => {
        const result = await getCompassRecommendation(this.env.FREE_ASTROLOGY_API_KEY, params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }
}

// ---- Convenience HTTP routes (non-MCP clients) ----
async function handleSkyTool(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const [year, month, date] = String(body.birth_date).split("-").map(Number);
  const parts = String(body.birth_time).split(":");
  const result = await getWesternSkyProfile(env.FREE_ASTROLOGY_API_KEY, {
    year, month, date,
    hours: Number(parts[0]), minutes: Number(parts[1]), seconds: parts[2] ? Number(parts[2]) : 0,
    latitude: Number(body.latitude), longitude: Number(body.longitude), timezone: Number(body.timezone),
  });
  return new Response(JSON.stringify(result, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleWeatherTool(request: Request): Promise<Response> {
  const body = await request.json() as any;
  const result = await getCurrentWeather(Number(body.latitude), Number(body.longitude), String(body.timezone));
  return new Response(JSON.stringify(result, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleCompassTool(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const result = await getCompassRecommendation(env.FREE_ASTROLOGY_API_KEY, body);
  return new Response(JSON.stringify(result, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

function healthResponse(): Response {
  return new Response(JSON.stringify({
    status: "ok",
    service: "SkyMood Compass",
    version: "0.4.0",
    mcp_transport: "agents/McpAgent (Streamable HTTP via Workers adapter)",
    mcp_endpoint: "/mcp or /sse",
    tools: ["get_western_sky_profile", "get_current_weather", "get_compass_recommendation"],
    timestamp: new Date().toISOString(),
  }, null, 2), { headers: { "Content-Type": "application/json" } });
}

// ---- Worker fetch entry ----
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin") || "";
      if (ALLOWED_ORIGINS.includes(origin)) {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      return new Response("Forbidden", { status: 403 });
    }

    if (!checkRateLimit(clientIp)) {
      return new Response(JSON.stringify({ error: "rate_limit", message: "Too many requests" }), {
        status: 429, headers: { "Content-Type": "application/json" },
      });
    }

    let response: Response;
    try {
      switch (url.pathname) {
        case "/":
        case "/index.html":
          response = await env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
          break;
        case "/mcp":
        case "/sse":
          response = await SkyMoodMCP.serveSSE("/sse").fetch(request, env, ctx);
          break;
        case "/api/sky":
          response = request.method === "POST"
            ? await handleSkyTool(request, env)
            : new Response("Method not allowed", { status: 405 });
          break;
        case "/api/weather":
          response = request.method === "POST"
            ? await handleWeatherTool(request)
            : new Response("Method not allowed", { status: 405 });
          break;
        case "/api/compass":
          response = request.method === "POST"
            ? await handleCompassTool(request, env)
            : new Response("Method not allowed", { status: 405 });
          break;
        case "/api/health":
          response = healthResponse();
          break;
        default:
          response = await env.ASSETS.fetch(request);
          if (response.status === 404) response = new Response("Not found", { status: 404 });
      }
    } catch (err: any) {
      response = new Response(JSON.stringify({ error: "internal", message: String(err?.message || err) }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    return withCors(request, response);
  },
};
