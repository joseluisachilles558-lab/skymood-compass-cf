# SkyMood Compass - Agents Guide

## What this is
A western birth sky profile + current weather + optional mood score = daily astro-weather compass.

Framing: reflective practice, not prediction. Not medical, financial, legal, or realtime advice.

## Transport
- MCP via Cloudflare "agents" library (McpAgent + ServeSSE).
- Streamable HTTP-style dispatch over SSE transport.
- Convenience HTTP routes for non-MCP clients:
  - POST /api/sky
  - POST /api/weather
  - POST /api/compass
  - GET /api/health
- Static frontend served from /public via Workers Assets.

## Initialize
POST /mcp with JSON-RPC 2.0 body:

{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"tester","version":"0.1"}}}

Server responds with capabilities and serverInfo {"name":"SkyMood Compass","version":"0.4.0"}.

## List tools
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}

Returns 3 tools.

## Tool calls
Sample 1 - get_western_sky_profile:
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_western_sky_profile","arguments":{"birth_date":"1995-07-25","birth_time":"12:00:00","latitude":10.8231,"longitude":106.6297,"timezone":7}}}

Sample 2 - get_current_weather:
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_current_weather","arguments":{"latitude":37.7749,"longitude":-122.4194,"timezone":"America/Los_Angeles"}}}

Sample 3 - get_compass_recommendation:
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_compass_recommendation","arguments":{"birth_date":"1995-07-25","birth_time":"12:00:00","latitude":10.8231,"longitude":106.6297,"timezone":7,"current_latitude":37.7749,"current_longitude":-122.4194,"current_timezone":"America/Los_Angeles","mood_score":7}}}

## Secrets
- FREE_ASTROLOGY_API_KEY read from env, NEVER hardcoded, NEVER returned to clients.
- Open-Meteo is keyless.

## Limitations
- Western sky profile is birth-chart static - combined with weather + mood for daily variance.
- Moon phase derived from Sun-Moon angular distance.
- No realtime price data, no medical/financial/legal advice, no prediction claims.
- 60 req / 60 s per-IP rate limit; returns 429 when exceeded.

## Live test recipe (human)
1. Open workers.dev URL in browser.
2. Default form values pre-fill HCM birth + SF current location.
3. Click "Get my compass" -> 3 sections render in <2 s.
4. Inspect Network tab -> no x-goog-api-key or x-api-key response header.
5. Refresh page -> state resets (no localStorage).

## Live test recipe (other AI Mind)
1. POST /mcp initialize.
2. POST /mcp tools/list -> expect 3 tools.
3. POST /mcp tools/call get_western_sky_profile with above sample -> expect Sun/Moon/Ascendant populated, no API key in any field.
4. POST /mcp tools/call get_compass_recommendation -> expect ritual/action/affirmation non-empty, disclaimer present.
