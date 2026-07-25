# Test Plan - SkyMood Compass

## 1. Static checks (no runtime)
- Bracket/paren/colon balance in all .ts files: PASS (manual)
- JSON parse on package.json and wrangler.jsonc: PASS (manual)
- Secret grep - no literal API keys: PASS (manual)
- Endpoint string scan - only 2 verified endpoints: PASS
- Tool count - exactly 3: PASS
- CORS preflight + headers: PASS (review)
- Rate limit 60/60s with 429: PASS (review)
- zod input validation: PASS (review)
- Determinism - no Math.random or Date.now in selection: PASS (review)
- Safety wording - no medical/financial/legal/predictive claims: PASS (review)

## 2. Runtime checks (require deploy, NOT done this cycle)

### Human browser test (Track B)
- [ ] Open workers.dev URL -> page loads
- [ ] Default form values work without manual entry
- [ ] Click "Get my compass" -> 3 sections render in < 2 s
- [ ] Inspect Network -> no x-goog-api-key or x-api-key header in any response
- [ ] Verify sky profile: Sun/Moon/Ascendant correct for HCM 1995-07-25 12:00 UTC+7
- [ ] Verify weather: temperatureC matches Open-Meteo direct call
- [ ] Verify compass: ritual/action/affirmation non-empty, disclaimer visible

### Other AI Mind test (Track A)
- [ ] POST /mcp initialize -> 200 with serverInfo
- [ ] POST /mcp tools/list -> 3 tools enumerated
- [ ] POST /mcp tools/call get_western_sky_profile -> Sun/Moon/Ascendant populated
- [ ] POST /mcp tools/call get_current_weather -> weather fields non-empty
- [ ] POST /mcp tools/call get_compass_recommendation -> ritual/action/affirmation non-empty
- [ ] No literal API key in any response body or header

### Adversarial input tests
- [ ] Missing birth_date -> 400 with zod error message
- [ ] Out-of-range latitude (200) -> 400
- [ ] Bad date format ("not-a-date") -> 400
- [ ] 61 rapid POSTs -> 61st returns 429
- [ ] OPTIONS from non-allowlisted origin -> 403

### Determinism check
- [ ] Same birth + same current + same mood -> same ritual/action/affirmation across 10 calls
- [ ] Different mood_score -> different variant (with high probability)

## 3. Production checklist
- [ ] FREE_ASTROLOGY_API_KEY set via wrangler secret
- [ ] CORS allowlist updated with workers.dev origin
- [ ] Durable Object migration v1 applied
- [ ] Rate limit tuned if needed based on real traffic
- [ ] Submission draft prepared per Event #6 rubric
- [ ] Steward dual-test approval recorded

## 4. Out-of-scope (Event #6 explicit non-goals)
- No prediction language
- No realtime price data
- No medical/financial/legal advice
- No realtime trading signals
- No user accounts / auth (MCP is public read-only)
