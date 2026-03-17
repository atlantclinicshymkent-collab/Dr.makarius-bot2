import Anthropic from "@anthropic-ai/sdk";
import { sendMessage, getFileUrl } from "./telegram.js";
import { saveHealthMetrics, saveWorkout, saveScreenshot } from "./supabase.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Ти аналізуєш скріншоти додатку COROS (годинник для спорту).
Витягни ВСІ числові показники зі скріншоту.
Відповідай ТІЛЬКИ валідним JSON (без markdown, без коментарів):
{
  "type": "health" | "workout" | "sleep",
  "data": {
    "resting_hr": число | null,
    "hrv": число | null,
    "sleep_hours": число | null,
    "sleep_score": число | null,
    "deep_sleep_min": число | null,
    "rem_sleep_min": число | null,
    "recovery_pct": число | null,
    "training_load": число | null,
    "workout_type": "біг" | "вело" | "зал" | "плавання" | null,
    "distance_km": число | null,
    "duration_min": число | null,
    "avg_hr": число | null,
    "max_hr": число | null,
    "calories": число | null,
    "avg_pace": "хх:хх" | null,
    "training_effect": число | null
  },
  "confidence": 0.0-1.0,
  "summary_ua": "Короткий опис українською"
}`;

export async function handlePhoto(message, chatId) {
  try {
    await sendMessage(chatId, "🔍 Аналізую скріншот...");

    const photo = message.photo[message.photo.length - 1];
    const fileUrl = await getFileUrl(photo.file_id);

    const imgResp = await fetch(fileUrl);
    const buffer = await imgResp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64 },
          },
          { type: "text", text: "Розпізнай дані з цього скріншоту COROS." },
        ],
      }],
    });

    const text = response.content[0].text;
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    await saveScreenshot(photo.file_id, parsed.type, parsed.data, parsed.confidence);

    if (parsed.type === "health" || parsed.type === "sleep") {
      await saveHealthMetrics(parsed.data);
    } else if (parsed.type === "workout") {
      await saveWorkout(parsed.data);
    }

    await sendMessage(chatId, formatReply(parsed));
  } catch (err) {
    console.error("Vision error:", err);
    await sendMessage(chatId, "⚠️ Не вдалося розпізнати. Спробуй чіткіше фото.");
  }
}

function formatReply(parsed) {
  if (parsed.type === "unknown") return "🤷 Це не скріншот COROS.";

  const d = parsed.data;
  const conf = Math.round((parsed.confidence || 0) * 100);
  let lines = [`✅ *Розпізнано* (${conf}%)`, `📝 ${parsed.summary_ua || ""}`, ""];

  if (d.resting_hr) lines.push(`❤️ Пульс спокою: *${d.resting_hr}* уд/хв`);
  if (d.hrv) lines.push(`📊 HRV: *${d.hrv}* мс`);
  if (d.sleep_hours) lines.push(`😴 Сон: *${d.sleep_hours}* год`);
  if (d.sleep_score) lines.push(`⭐ Якість сну: *${d.sleep_score}*`);
  if (d.deep_sleep_min) lines.push(`🌊 Глибокий сон: *${d.deep_sleep_min}* хв`);
  if (d.rem_sleep_min) lines.push(`💭 REM: *${d.rem_sleep_min}* хв`);
  if (d.recovery_pct) lines.push(`🔋 Відновлення: *${d.recovery_pct}%*`);
  if (d.training_load) lines.push(`🏋️ Навантаження: *${d.training_load}*`);
  if (d.workout_type) lines.push(`🏃 Тип: *${d.workout_type}*`);
  if (d.distance_km) lines.push(`📏 Дистанція: *${d.distance_km}* км`);
  if (d.duration_min) lines.push(`⏱️ Час: *${d.duration_min}* хв`);
  if (d.avg_pace) lines.push(`⚡ Темп: *${d.avg_pace}* /км`);
  if (d.avg_hr) lines.push(`❤️ Сер. пульс: *${d.avg_hr}*`);
  if (d.max_hr) lines.push(`🔴 Макс пульс: *${d.max_hr}*`);
  if (d.calories) lines.push(`🔥 Калорії: *${d.calories}* ккал`);

  lines.push("", "💾 _Збережено в базу_");
  return lines.join("\n");
}
