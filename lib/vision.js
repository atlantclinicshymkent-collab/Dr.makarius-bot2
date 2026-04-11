import Anthropic from "@anthropic-ai/sdk";
import { sendMessage, getFileUrl } from "./telegram.js";
import { saveHealthMetrics, saveWorkout, saveScreenshot } from "./supabase.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const COROS_PROMPT = `Ти аналізуєш скріншоти додатку COROS (годинник для спорту).
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

const LAB_PROMPT = `Ти — досвідчений лікар-діагност Dr.Makarius з 20+ роками досвіду.
Ти аналізуєш клінічні аналізи (лабораторні дослідження).

Відповідай тією мовою, якою написані аналізи. Якщо неможливо визначити — українською.

ЗАВДАННЯ:
1. Розпізнай ВСІ показники (назва, значення, одиниці, референтні межі)
2. Дай розширену клінічну інтерпретацію

ФОРМАТ ВІДПОВІДІ:

📋 *Тип аналізу:* (загальний аналіз крові / біохімія / гормони / тощо)

📊 *Розпізнані показники:*
Для кожного показника:
- Назва (латинню)
- Значення → норма/підвищено/знижено
- Референтні межі

🔍 *Клінічна інтерпретація:*
- Що означають відхилення
- Можливі причини (диференціальна діагностика)
- Зв'язок між показниками (патерни)
- Посилання на міжнародні протоколи (WHO, NICE, AHA, KDIGO, ADA, EASL та інші)

⚠️ *Red flags:*
- Критичні відхилення що потребують термінової уваги
- Коли терміново до лікаря

💊 *Рекомендації:*
- Додаткові обстеження які варто провести
- Можливі напрямки лікування (за протоколами)
- Зміни способу життя
- Контроль через який час

📚 *Протоколи та джерела:*
- Назви конкретних гайдлайнів та клінічних рекомендацій
- Рівень доказовості (A/B/C)

📝 *Клінічні випадки:*
- Типовий клінічний сценарій що відповідає даним результатам
- Алгоритм дій лікаря за протоколом

⚕️ _Це інформаційна інтерпретація на основі міжнародних протоколів. Не замінює консультацію лікаря._`;

const DETECT_PROMPT = `Подивись на це зображення і визнач що це:
1. Скріншот додатку COROS (спортивний годинник)
2. Клінічний аналіз (лабораторне дослідження)
3. Інше медичне зображення (рентген, МРТ, УЗД)
4. Невідоме зображення

Відповідай ТІЛЬКИ одним словом: COROS, LAB, MEDICAL або UNKNOWN`;

// ── Фото ──
export async function handlePhoto(message, chatId) {
  try {
    await sendMessage(chatId, "🔍 Аналізую зображення...");

    const photo = message.photo[message.photo.length - 1];
    const fileUrl = await getFileUrl(photo.file_id);

    const imgResp = await fetch(fileUrl);
    const buffer = await imgResp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const typeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 50,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
          { type: "text", text: DETECT_PROMPT },
        ],
      }],
    });

    const imageType = typeResponse.content[0].text.trim().toUpperCase();

    if (imageType.includes("COROS")) {
      await handleCoros(base64, photo.file_id, chatId);
    } else if (imageType.includes("LAB") || imageType.includes("MEDICAL")) {
      await handleLabImage(base64, photo.file_id, chatId);
    } else {
      await sendMessage(chatId, "🤷 Не розпізнав тип зображення.\n\nНадішли:\n📸 Скріншот COROS\n🧪 Фото аналізів\n📄 PDF аналізів");
    }
  } catch (err) {
    console.error("Vision error:", err);
    if (err.message?.includes("credit balance")) {
      await sendMessage(chatId, "⚠️ Недостатньо кредитів Claude API.");
    } else {
      await sendMessage(chatId, "⚠️ Не вдалося розпізнати. Спробуй чіткіше фото.");
    }
  }
}

// ── Документ (PDF) ──
export async function handleDocument(message, chatId) {
  try {
    const doc = message.document;
    const fileName = doc.file_name || "";
    const mimeType = doc.mime_type || "";

    // Перевірка що це PDF або зображення
    const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    const isImage = mimeType.startsWith("image/");

    if (!isPdf && !isImage) {
      return sendMessage(chatId, "📎 Підтримую тільки PDF та зображення.\nНадішли PDF або фото аналізів.");
    }

    await sendMessage(chatId, "📄 Завантажую та аналізую документ...");

    const fileUrl = await getFileUrl(doc.file_id);
    const fileResp = await fetch(fileUrl);
    const buffer = await fileResp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    if (isPdf) {
      await handleLabPdf(base64, doc.file_id, chatId);
    } else {
      await handleLabImage(base64, doc.file_id, chatId);
    }
  } catch (err) {
    console.error("Document error:", err);
    if (err.message?.includes("credit balance")) {
      await sendMessage(chatId, "⚠️ Недостатньо кредитів Claude API.");
    } else {
      await sendMessage(chatId, "⚠️ Не вдалося обробити документ. Спробуй ще раз.");
    }
  }
}

// ── COROS скріншот ──
async function handleCoros(base64, fileId, chatId) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: COROS_PROMPT,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
        { type: "text", text: "Розпізнай дані з цього скріншоту COROS." },
      ],
    }],
  });

  const text = response.content[0].text;
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

  await saveScreenshot(fileId, parsed.type, parsed.data, parsed.confidence);

  if (parsed.type === "health" || parsed.type === "sleep") {
    await saveHealthMetrics(parsed.data);
  } else if (parsed.type === "workout") {
    await saveWorkout(parsed.data);
  }

  await sendMessage(chatId, formatCorosReply(parsed));
}

// ── Аналізи (зображення) ──
async function handleLabImage(base64, fileId, chatId) {
  await sendMessage(chatId, "🧪 Розпізнаю аналізи та готую інтерпретацію...");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: LAB_PROMPT,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
        { type: "text", text: "Розпізнай показники та дай повну клінічну інтерпретацію цих аналізів." },
      ],
    }],
  });

  const answer = response.content[0].text;
  await saveScreenshot(fileId, "lab_result", { interpretation: answer.substring(0, 500) }, 0.9);
  await sendLongMessage(chatId, answer);
}

// ── Аналізи (PDF) ──
async function handleLabPdf(base64, fileId, chatId) {
  await sendMessage(chatId, "🧪 Аналізую PDF з результатами досліджень...");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: LAB_PROMPT,
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        },
        { type: "text", text: "Це PDF з результатами клінічних аналізів. Розпізнай всі показники та дай повну клінічну інтерпретацію." },
      ],
    }],
  });

  const answer = response.content[0].text;
  await saveScreenshot(fileId, "lab_pdf", { interpretation: answer.substring(0, 500) }, 0.9);
  await sendLongMessage(chatId, answer);
}

// ── Довгі повідомлення ──
async function sendLongMessage(chatId, text) {
  if (text.length > 4000) {
    const parts = splitMessage(text, 4000);
    for (const part of parts) {
      await sendMessage(chatId, part);
    }
  } else {
    await sendMessage(chatId, text);
  }
}

function splitMessage(text, maxLength) {
  const parts = [];
  let current = "";
  const lines = text.split("\n");

  for (const line of lines) {
    if ((current + "\n" + line).length > maxLength) {
      if (current) parts.push(current.trim());
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) parts.push(current.trim());
  return parts;
}

function formatCorosReply(parsed) {
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
