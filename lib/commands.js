import { sendMessage } from "./telegram.js";
import {
  getLastHealth, getHealthRange, getWeekWorkouts,
  saveNutrition, getTodayCalories, saveWorkout,
} from "./supabase.js";

export async function handleCommand(text, chatId) {
  const cmd = text.split(" ")[0].toLowerCase();
  const args = text.slice(cmd.length).trim();

  switch (cmd) {
    case "/start": return sendMessage(chatId, WELCOME);
    case "/help": return sendMessage(chatId, HELP);
    case "/health": return cmdHealth(chatId);
    case "/sleep": return cmdSleep(chatId);
    case "/heart": return cmdHeart(chatId);
    case "/week": return cmdWeek(chatId);
    case "/eat": return cmdEat(chatId, args);
    case "/calories": return cmdCalories(chatId);
    case "/train": return cmdTrain(chatId, args);
    case "/trends": return cmdTrends(chatId, args);
    default: return sendMessage(chatId, "🤔 Невідома команда. /help для списку.");
  }
}

async function cmdHealth(chatId) {
  const h = await getLastHealth();
  if (!h) return sendMessage(chatId, "📭 Немає даних. Надішли скріншот COROS!");
  const lines = [`🏥 *Здоров'я* (${h.date})`, ""];
  if (h.resting_hr) lines.push(`❤️ Пульс: *${h.resting_hr}* уд/хв`);
  if (h.hrv) lines.push(`📊 HRV: *${h.hrv}* мс`);
  if (h.sleep_hours) lines.push(`😴 Сон: *${h.sleep_hours}* год`);
  if (h.sleep_score) lines.push(`⭐ Якість сну: *${h.sleep_score}*`);
  if (h.recovery_pct) lines.push(`🔋 Відновлення: *${h.recovery_pct}%*`);
  if (h.training_load) lines.push(`🏋️ Навантаження: *${h.training_load}*`);
  const week = await getHealthRange(7);
  if (week.length >= 2) {
    lines.push("", "*Тренд за тиждень:*");
    const a = avg(week, "hrv"); if (a) lines.push(`  HRV: ${a.toFixed(1)} мс`);
    const b = avg(week, "resting_hr"); if (b) lines.push(`  Пульс: ${b.toFixed(0)} уд/хв`);
    const c = avg(week, "sleep_hours"); if (c) lines.push(`  Сон: ${c.toFixed(1)} год`);
  }
  return sendMessage(chatId, lines.join("\n"));
}

async function cmdSleep(chatId) {
  const h = await getLastHealth();
  if (!h) return sendMessage(chatId, "📭 Немає даних про сон.");
  const lines = [`😴 *Сон* (${h.date})`, ""];
  if (h.sleep_hours) lines.push(`⏱️ Тривалість: *${h.sleep_hours}* год`);
  if (h.sleep_score) lines.push(`⭐ Якість: *${h.sleep_score}*`);
  if (h.deep_sleep_min) lines.push(`🌊 Глибокий: *${h.deep_sleep_min}* хв`);
  if (h.rem_sleep_min) lines.push(`💭 REM: *${h.rem_sleep_min}* хв`);
  return sendMessage(chatId, lines.join("\n"));
}

async function cmdHeart(chatId) {
  const h = await getLastHealth();
  if (!h) return sendMessage(chatId, "📭 Немає кардіо-даних.");
  const lines = [`❤️ *Кардіо* (${h.date})`, ""];
  if (h.resting_hr) lines.push(`💓 Пульс спокою: *${h.resting_hr}* уд/хв`);
  if (h.hrv) lines.push(`📊 HRV: *${h.hrv}* мс`);
  if (h.hrv) {
    if (h.hrv >= 60) lines.push("  🟢 Відмінно");
    else if (h.hrv >= 40) lines.push("  🟡 Норма");
    else lines.push("  🔴 Низький — потрібен відпочинок");
  }
  return sendMessage(chatId, lines.join("\n"));
}

async function cmdWeek(chatId) {
  const health = await getHealthRange(7);
  const workouts = await getWeekWorkouts();
  const lines = ["📊 *Тижневий звіт*", ""];
  if (workouts.length > 0) {
    lines.push(`🏃 Тренувань: *${workouts.length}*`);
    const km = workouts.reduce((s, w) => s + (Number(w.distance_km) || 0), 0);
    const cal = workouts.reduce((s, w) => s + (w.calories || 0), 0);
    if (km > 0) lines.push(`📏 Дистанція: *${km.toFixed(1)}* км`);
    if (cal > 0) lines.push(`🔥 Калорії: *${cal}* ккал`);
  } else {
    lines.push("🏃 Тренувань: немає");
  }
  if (health.length > 0) {
    lines.push("", "*Середні:*");
    const a = avg(health, "hrv"); if (a) lines.push(`  📊 HRV: ${a.toFixed(1)} мс`);
    const b = avg(health, "resting_hr"); if (b) lines.push(`  ❤️ Пульс: ${b.toFixed(0)}`);
    const c = avg(health, "sleep_hours"); if (c) lines.push(`  😴 Сон: ${c.toFixed(1)} год`);
  }
  return sendMessage(chatId, lines.join("\n"));
}

async function cmdEat(chatId, args) {
  if (!args) return sendMessage(chatId, "🍽️ Формат: /eat 350 обід курка рис");
  const match = args.match(/^(\d+)\s*(.*)?$/);
  if (!match) return sendMessage(chatId, "⚠️ Формат: /eat 350 обід курка");
  const cal = parseInt(match[1], 10);
  const desc = match[2] || "";
  let meal = null;
  const l = desc.toLowerCase();
  if (l.includes("сніданок") || l.includes("ранок")) meal = "сніданок";
  else if (l.includes("обід")) meal = "обід";
  else if (l.includes("вечер")) meal = "вечеря";
  else if (l.includes("перекус")) meal = "перекус";
  await saveNutrition(cal, desc, meal);
  const today = await getTodayCalories();
  const total = today.reduce((s, n) => s + n.calories, 0);
  return sendMessage(chatId, `✅ *${cal}* ккал${desc ? ` (${desc})` : ""}\n📊 Всього: *${total}* ккал`);
}

async function cmdCalories(chatId) {
  const today = await getTodayCalories();
  if (!today.length) return sendMessage(chatId, "📭 Немає записів. /eat 350 опис");
  const total = today.reduce((s, n) => s + n.calories, 0);
  const lines = ["🍽️ *Калорії сьогодні*", ""];
  today.forEach((n, i) => {
    lines.push(`${i + 1}. *${n.calories}* ккал${n.description ? ` (${n.description})` : ""}`);
  });
  lines.push("", `📊 *Всього: ${total} ккал*`);
  return sendMessage(chatId, lines.join("\n"));
}

async function cmdTrain(chatId, args) {
  if (!args) return sendMessage(chatId, "🏃 Формат: /train біг 5км 28хв");
  const parts = args.toLowerCase().split(/\s+/);
  const data = { workout_type: parts[0] };
  for (const p of parts) {
    const km = p.match(/^([\d.]+)км$/);
    const min = p.match(/^(\d+)хв$/);
    if (km) data.distance_km = parseFloat(km[1]);
    if (min) data.duration_min = parseInt(min[1], 10);
  }
  if (!data.calories && data.distance_km && data.workout_type === "біг") {
    data.calories = Math.round(data.distance_km * 70);
  }
  await saveWorkout(data);
  let r = `✅ *${data.workout_type}*`;
  if (data.distance_km) r += ` ${data.distance_km} км`;
  if (data.duration_min) r += ` ${data.duration_min} хв`;
  if (data.calories) r += ` 🔥 ${data.calories} ккал`;
  return sendMessage(chatId, r);
}

async function cmdTrends(chatId, args) {
  const days = parseInt(args, 10) || 7;
  const health = await getHealthRange(days);
  if (health.length < 2) return sendMessage(chatId, `📭 Мало даних за ${days} днів.`);
  const lines = [`📈 *Тренди за ${days} днів*`, ""];
  const hrvs = health.filter(h => h.hrv).map(h => Number(h.hrv));
  if (hrvs.length >= 2) {
    lines.push(`📊 HRV: ${Math.min(...hrvs)}–${Math.max(...hrvs)} мс`);
    const trend = hrvs[hrvs.length - 1] - hrvs[0];
    lines.push(`  ${trend > 0 ? "📈 +" : "📉 "}${trend.toFixed(1)} мс`);
  }
  const rhrs = health.filter(h => h.resting_hr).map(h => h.resting_hr);
  if (rhrs.length >= 2) {
    lines.push(`❤️ Пульс: ${Math.min(...rhrs)}–${Math.max(...rhrs)} уд/хв`);
  }
  return sendMessage(chatId, lines.join("\n"));
}

function avg(arr, field) {
  const v = arr.filter(d => d[field] != null).map(d => Number(d[field]));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

const WELCOME = `👋 *Привіт, Макар!*

📸 Надішли скріншот COROS — я розпізнаю дані
/health — показники здоров'я
/sleep — деталі сну
/heart — кардіо
/week — тижневий звіт
/eat 350 обід — калорії
/calories — баланс
/train біг 5км 28хв — тренування
/trends 30 — тренди`;

const HELP = `📋 *Команди:*

📸 Фото — скріншот COROS
/health — HRV, пульс, сон
/sleep — деталі сну
/heart — кардіо + тренд
/week — тижневий звіт
/eat 350 обід — калорії
/calories — баланс
/train біг 5км — тренування
/trends 30 — тренди`;
