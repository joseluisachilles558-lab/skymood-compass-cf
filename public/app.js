(async () => {
  const $ = (id) => document.getElementById(id);
  const out = $("out"), sky = $("sky"), wx = $("wx"), rec = $("rec");
  const btn = $("run");

  async function call(path, body) {
    const resp = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`${path} ${resp.status}: ${await resp.text()}`);
    return resp.json();
  }

  function fmt(obj) { return JSON.stringify(obj, null, 2); }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    out.hidden = false;
    sky.textContent = wx.textContent = rec.textContent = "Loading…";
    try {
      const birthReq = {
        birth_date: $("birth_date").value,
        birth_time: $("birth_time").value,
        latitude: Number($("birth_lat").value),
        longitude: Number($("birth_lon").value),
        timezone: Number($("birth_tz").value),
      };
      const weatherReq = {
        latitude: Number($("cur_lat").value),
        longitude: Number($("cur_lon").value),
        timezone: $("cur_tz").value,
      };
      const moodRaw = $("mood").value;
      const compassReq = {
        ...birthReq,
        current_latitude: weatherReq.latitude,
        current_longitude: weatherReq.longitude,
        current_timezone: weatherReq.timezone,
        mood_score: moodRaw === "" ? undefined : Number(moodRaw),
      };

      const [s, w, r] = await Promise.all([
        call("/api/sky", birthReq),
        call("/api/weather", weatherReq),
        call("/api/compass", compassReq),
      ]);

      sky.innerHTML = `<h3>Western sky profile</h3>
        <p>Sun in ${s.sunSign}, Moon in ${s.moonSign}, Ascendant in ${s.ascendantSign}.</p>
        <p>Moon phase: ${s.moonPhase} (${s.moonPhaseAngle.toFixed(1)}°).</p>
        ${s.retrogrades.length ? `<p>Retrograde: ${s.retrogrades.join(", ")}.</p>` : ""}`;
      wx.innerHTML = `<h3>Current weather</h3>
        <p>${w.temperatureC.toFixed(1)}°C, ${w.weatherDescriptor}${w.isDay ? "" : " (night)"}.</p>
        <p>Sunrise ${w.sunrise}, sunset ${w.sunset}.</p>`;
      rec.innerHTML = `<h3>Compass recommendation</h3>
        <p><b>Ritual:</b> ${r.ritual}</p>
        <p><b>Action:</b> ${r.action}</p>
        <p><b>Affirmation:</b> ${r.affirmation}</p>
        <p><b>Mood echo:</b> ${r.moodEcho}</p>`;
    } catch (err) {
      sky.textContent = `Error: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  });
})();
