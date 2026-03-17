import { sendMessage } from "../lib/telegram.js";
import { getLastHealth, getWeekWorkouts, ping } from "../lib/supabase.js";
import { getWeather, getAirQuality } from "../lib/weather.js";
import { getTodayExpenses } from "../lib/finance.js";

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const chatId = process.env.TELEGRAM_CHAT_ID;

  try {
    await ping();

    const lines = ["☀️ *Доброго ранку, Макар!*", ""];

    // Погода
    const weather = await getWeather();
    lines.push(weather, "");

    // Якість повітря
    const air = await getAirQuality();
    lines.push(air, "");

    // Здоров'я
    const health = await getLastHealth();
    if (health) {
      lines.push("🏥 *Здоров'я:*");
      if (health.resting_hr) lines.push(`  ❤️ Пульс: ${health.resting_hr} уд/хв`);
      if (health.hrv) lines.push(`  📊 HRV: ${health.hrv} мс`);
      if (health.sleep_hours) lines.push(`  😴 Сон: ${health.sleep_hours} год`);
      if (health.recovery_pct) {
        lines.push(`  🔋 Відновлення: ${health.recovery_pct}%`);
        lines.push("");
        if (health.recovery_pct >= 70) lines.push("💪 Можна тренуватися інтенсивно!");
        else if (health.recovery_pct >= 40) lines.push("⚡ Легке тренування.");
        else lines.push("🛌 Краще відпочити.");
      }
    }

    lines.push("");

    // Тренування
    const workouts = await getWeekWorkouts();
    if (workouts.length > 0) {
      const km = workouts.reduce((s, w) => s + (Number(w.distance_km) || 0), 0);
      lines.push(`🏃 *Тиждень:* ${workouts.length} тренувань, ${km.toFixed(1)} км`);
    }

    lines.push("");
    lines.push("📸 _Надішли скріншот COROS для оновлення_");

    await sendMessage(chatId, lines.join("\n"));
  } catch (err) {
    console.error("Cron error:", err);
  }

  return res.status(200).json({ ok: true });
}
