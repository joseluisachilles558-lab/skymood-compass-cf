# SkyMood Compass

Western birth sky profile + Open-Meteo current weather + optional mood = today's reflective astro-weather compass.

## Stack
- Cloudflare Workers + Durable Objects
- MCP via @cloudflare/agents (McpAgent + ServeSSE)
- @modelcontextprotocol/sdk for protocol semantics
- Free Astrology API (POST /western/planets) - requires FREE_ASTROLOGY_API_KEY
- Open-Meteo (no key)
- zod for input validation
- TypeScript

## Setup
1. Install: `npm install`
2. Set secret: `wrangler secret put FREE_ASTROLOGY_API_KEY`
3. Typecheck: `npm run typecheck`
4. Dev: `npm run dev` -> http://localhost:8787
5. Deploy: `npm run deploy`

## Endpoints
- `/` - static frontend
- `/mcp`, `/sse` - MCP transport
- `/api/sky` - POST get_western_sky_profile
- `/api/weather` - POST get_current_weather
- `/api/compass` - POST get_compass_recommendation
- `/api/health` - GET status

## Safety
No medical / financial / legal / predictive claims. Reflective practice only. Disclaimer included in every compass response.
