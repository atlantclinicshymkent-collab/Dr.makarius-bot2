import { sendMessage } from "../lib/telegram.js";
import { getLastHealth, getWeekWorkouts, ping } from "../lib/supabase.js";

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const chatId = process.env.TELEGRAM_CHAT_ID;

  try {
    await ping();
    const health = await getLastHealth();
    const workouts = await getWeekWorkouts();

    const lines = ["☀️ *Доброго ранку, Макар!*", ""];

    if (health) {
      lines.push("🏥 *Здоров'я:*");
      if (health.resting_hr) lines.push(`  ❤️ Пульс: ${health.resting_hr} уд/хв`);
      if (health.hrv) lines.push(`  📊 HRV: ${health.hrv} мс`);
      if (health.sleep_hours) lines.push(`  😴 Сон: ${health.sleep_hours} год`);
      if (health.recovery_pct) lines.push(`  🔋 Відновлення: ${health.recovery_pct}%`);
      lines.push("");
      if (health.recovery_pct >= 70) {
        lines.push("💪 Організм відновився — можна тренуватися!");
      } else if (health.recovery_pct >= 40) {
        lines.push("⚡ Помірне відновлення — легке тренування.");
      } else if (health.recovery_pct) {
        lines.push("🛌 Відновлення низьке — краще відпочити.");
      }
    } else {
      lines.push("📭 Немає даних. Надішли скріншот COROS!");
    }

    lines.push("");
    if (workouts.length > 0) {
      const totalKm = workouts.reduce((s, w) => s + (Number(w.distance_km) || 0), 0);
      lines.push(`🏃 *Тиждень:* ${workouts.length} тренувань, ${totalKm.toFixed(1)} км`);
    }

    lines.push("");
    lines.push("📸 _Надішли скріншот COROS для оновлення даних_");

    await sendMessage(chatId, lines.join("\n"));
  } catch (err) {
    console.error("Cron error:", err);
  }

  return res.status(200).json({ ok: true });
}
